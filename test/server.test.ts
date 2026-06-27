import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadPack } from "../src/pack.ts";
import { handleIndex, handleGuide, topicKeys, buildServer } from "../src/server.ts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "packs");
const demo = loadPack("demo", FIXTURES);

test("topicKeys retorna as keys do pack", () => {
  assert.deepEqual(topicKeys(demo), ["alpha", "beta"]);
});

test("handleIndex retorna a tabela", () => {
  assert.match(handleIndex(demo), /alpha/);
  assert.match(handleIndex(demo), /Quando usar/);
});

test("handleGuide retorna o doc do tópico", () => {
  assert.match(handleGuide(demo, "beta"), /Conteúdo beta/);
});

test("handleGuide com tópico inválido lança", () => {
  assert.throws(() => handleGuide(demo, "zzz"), /inválido/i);
});

test("buildServer registra <pack>_index e <pack>_guide", () => {
  const server = buildServer(demo);
  assert.ok(server);
});

const comprompts = loadPack("comprompts", FIXTURES);

test("buildServer com pack que tem prompts não lança", () => {
  assert.ok(buildServer(comprompts));
});

test("buildServer expõe instructions, lista e resolve prompts (in-memory)", async () => {
  const server = buildServer(comprompts);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);

  assert.equal(client.getInstructions(), "Instruções de teste do pack comprompts.");

  const { prompts } = await client.listPrompts();
  assert.deepEqual(prompts.map((p) => p.name).sort(), ["greet", "ping"]);

  const greet = prompts.find((p) => p.name === "greet");
  assert.ok(greet?.arguments?.some((a) => a.name === "nome" && a.required === true));

  const res = await client.getPrompt({ name: "greet", arguments: { nome: "Akita" } });
  const text = (res.messages[0].content as { type: string; text: string }).text;
  assert.match(text, /Olá, Akita!/);

  await client.close();
  await server.close();
});
