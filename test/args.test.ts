import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePackName } from "../src/index.ts";

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
