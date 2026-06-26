import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadPack, readDoc, renderIndex } from "../src/pack.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "packs");

test("loadPack: pack válido retorna topics", () => {
  const pack = loadPack("demo", FIXTURES);
  assert.equal(pack.name, "demo");
  assert.equal(pack.topics.length, 2);
  assert.deepEqual(pack.topics.map((t) => t.key), ["alpha", "beta"]);
});

test("loadPack: pack inexistente lança erro claro", () => {
  assert.throws(() => loadPack("naoexiste", FIXTURES), /naoexiste/);
});

test("loadPack: topic.file inexistente lança erro no load", () => {
  assert.throws(() => loadPack("quebrado", FIXTURES), /quebrado|ausente|não encontrado/i);
});

test("readDoc: topic válido retorna conteúdo", () => {
  const pack = loadPack("demo", FIXTURES);
  assert.match(readDoc(pack, "alpha"), /Conteúdo alpha/);
});

test("readDoc: topic inválido lança erro listando válidos", () => {
  const pack = loadPack("demo", FIXTURES);
  assert.throws(() => readDoc(pack, "zzz"), /alpha.*beta|beta.*alpha/s);
});

test("renderIndex: contém todos os topics", () => {
  const pack = loadPack("demo", FIXTURES);
  const idx = renderIndex(pack);
  assert.match(idx, /alpha/);
  assert.match(idx, /beta/);
  assert.match(idx, /Quando precisar de alpha/);
});
