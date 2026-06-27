import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("pack akita: tem instructions não-vazio", () => {
  const pack = loadPack("akita");
  assert.ok(pack.instructions && pack.instructions.length > 20);
  assert.match(pack.instructions!, /akita_index/);
});

test("pack akita: tem os 4 prompts esperados", () => {
  const pack = loadPack("akita");
  assert.deepEqual(
    pack.prompts.map((p) => p.name).sort(),
    ["audit", "decidir", "review-diff", "setup-claude-md"],
  );
});

test("pack akita: todos os templates de prompt leem não-vazio", () => {
  const pack = loadPack("akita");
  for (const p of pack.prompts) {
    assert.ok(readFileSync(p.path, "utf8").trim().length > 20, `template ${p.name} muito curto`);
  }
});

test("pack akita: decidir tem arg obrigatório dilema; audit tem path opcional", () => {
  const pack = loadPack("akita");
  const decidir = pack.prompts.find((p) => p.name === "decidir")!;
  assert.equal(decidir.arguments[0].name, "dilema");
  assert.equal(decidir.arguments[0].required, true);
  const audit = pack.prompts.find((p) => p.name === "audit")!;
  assert.equal(audit.arguments[0].name, "path");
  assert.equal(audit.arguments[0].required, false);
});
