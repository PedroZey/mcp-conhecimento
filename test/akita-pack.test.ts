import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPack, readDoc } from "../src/pack.ts";

test("pack akita carrega com 10 tópicos", () => {
  const pack = loadPack("akita");
  assert.equal(pack.name, "akita");
  assert.equal(pack.topics.length, 10);
});

test("pack akita: todos os docs leem não-vazio", () => {
  const pack = loadPack("akita");
  for (const t of pack.topics) {
    assert.ok(readDoc(pack, t.key).length > 100, `doc ${t.key} muito curto`);
  }
});

test("pack akita: doc de testes contém regra de ouro", () => {
  const pack = loadPack("akita");
  assert.match(readDoc(pack, "testes"), /PR sem teste/i);
});
