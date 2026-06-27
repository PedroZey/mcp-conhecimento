import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePackName, resolveTransport, resolvePort } from "../src/index.ts";

test("resolvePackName lê --pack=akita", () => {
  assert.equal(resolvePackName(["--pack=akita"], {}), "akita");
});

test("resolvePackName lê --pack akita (separado)", () => {
  assert.equal(resolvePackName(["--pack", "akita"], {}), "akita");
});

test("resolvePackName cai pra env PACK", () => {
  assert.equal(resolvePackName([], { PACK: "galego" }), "galego");
});

test("resolvePackName sem nada lança erro claro", () => {
  assert.throws(() => resolvePackName([], {}), /--pack/);
});

test("resolveTransport default é stdio", () => {
  assert.equal(resolveTransport([], {}), "stdio");
});

test("resolveTransport lê --transport=http", () => {
  assert.equal(resolveTransport(["--transport=http"], {}), "http");
});

test("resolveTransport cai pra env TRANSPORT", () => {
  assert.equal(resolveTransport([], { TRANSPORT: "http" }), "http");
});

test("resolveTransport inválido lança", () => {
  assert.throws(() => resolveTransport(["--transport=foo"], {}), /inválido/i);
});

test("resolvePort default 3000", () => {
  assert.equal(resolvePort([], {}), 3000);
});

test("resolvePort lê --port=8080", () => {
  assert.equal(resolvePort(["--port=8080"], {}), 8080);
});

test("resolvePort cai pra env PORT", () => {
  assert.equal(resolvePort([], { PORT: "5000" }), 5000);
});

test("resolvePort inválida lança", () => {
  assert.throws(() => resolvePort(["--port=abc"], {}), /inválida/i);
});
