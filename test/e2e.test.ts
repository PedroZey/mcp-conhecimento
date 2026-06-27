import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(ROOT, "dist", "index.js");

async function connect() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [ENTRY, "--pack=akita"],
  });
  const client = new Client({ name: "e2e", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

test("e2e: lista akita_index e akita_guide", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["akita_guide", "akita_index"]);
  await client.close();
});

test("e2e: akita_guide(testes) retorna conteúdo", async () => {
  const client = await connect();
  const res = await client.callTool({ name: "akita_guide", arguments: { topic: "testes" } });
  const text = (res.content as Array<{ type: string; text: string }>)[0].text;
  assert.match(text, /PR sem teste/i);
  await client.close();
});

test("e2e: akita_index retorna a tabela", async () => {
  const client = await connect();
  const res = await client.callTool({ name: "akita_index", arguments: {} });
  const text = (res.content as Array<{ type: string; text: string }>)[0].text;
  assert.match(text, /Quando consultar/);
  await client.close();
});

test("e2e: akita expõe instructions", async () => {
  const client = await connect();
  assert.match(client.getInstructions() ?? "", /akita_index/);
  await client.close();
});

test("e2e: akita lista os 4 prompts", async () => {
  const client = await connect();
  const { prompts } = await client.listPrompts();
  assert.deepEqual(
    prompts.map((p) => p.name).sort(),
    ["audit", "decidir", "review-diff", "setup-claude-md"],
  );
  await client.close();
});

test("e2e: akita getPrompt(decidir) injeta o dilema no template", async () => {
  const client = await connect();
  const res = await client.getPrompt({ name: "decidir", arguments: { dilema: "NoSQL ou Postgres?" } });
  const text = (res.messages[0].content as { type: string; text: string }).text;
  assert.match(text, /NoSQL ou Postgres\?/);
  await client.close();
});
