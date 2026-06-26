import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadPack } from "../src/pack.ts";
import { handleIndex, handleGuide, topicKeys, buildServer } from "../src/server.ts";

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
