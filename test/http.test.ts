import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadPack } from "../src/pack.ts";
import { createApp, startHttp } from "../src/http.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "packs");
const demo = loadPack("demo", FIXTURES);
const TOKEN = "test-token-123";

test("GET /health → 200 sem auth", async () => {
  const app = createApp(demo, TOKEN);
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.pack, "demo");
});

test("POST /mcp sem token → 401", async () => {
  const app = createApp(demo, TOKEN);
  const res = await request(app)
    .post("/mcp")
    .send({ jsonrpc: "2.0", id: 1, method: "ping" });
  assert.equal(res.status, 401);
});

test("POST /mcp com token errado → 401", async () => {
  const app = createApp(demo, TOKEN);
  const res = await request(app)
    .post("/mcp")
    .set("Authorization", "Bearer errado")
    .send({ jsonrpc: "2.0", id: 1, method: "ping" });
  assert.equal(res.status, 401);
});

test("GET /mcp → 405 mesmo com token (stateless só POST)", async () => {
  const app = createApp(demo, TOKEN);
  const res = await request(app).get("/mcp").set("Authorization", `Bearer ${TOKEN}`);
  assert.equal(res.status, 405);
});

test("e2e http: client conecta com token, lista e chama tool", async () => {
  const server = await startHttp(demo, { port: 0, token: TOKEN });
  const port = (server.address() as AddressInfo).port;
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${port}/mcp`),
    { requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } } },
  );
  const client = new Client({ name: "e2e-http", version: "0.0.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["demo_guide", "demo_index"]);

  const res = await client.callTool({ name: "demo_guide", arguments: { topic: "alpha" } });
  const text = (res.content as Array<{ type: string; text: string }>)[0].text;
  assert.match(text, /Conteúdo alpha/);

  await client.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
