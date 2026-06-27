#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadPack } from "./pack.js";
import { buildServer } from "./server.js";
import { startHttp } from "./http.js";

function getFlag(argv: string[], name: string): string | undefined {
  const eq = `--${name}=`;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith(eq)) return arg.slice(eq.length);
    if (arg === `--${name}` && argv[i + 1]) return argv[i + 1];
  }
  return undefined;
}

export function resolvePackName(argv: string[], env: NodeJS.ProcessEnv): string {
  const v = getFlag(argv, "pack") ?? env.PACK;
  if (v) return v;
  throw new Error(
    "Nenhum pack informado. Use --pack=<nome> (ex: --pack=akita) ou a env PACK.",
  );
}

export function resolveTransport(argv: string[], env: NodeJS.ProcessEnv): "stdio" | "http" {
  const v = (getFlag(argv, "transport") ?? env.TRANSPORT ?? "stdio").toLowerCase();
  if (v !== "stdio" && v !== "http") {
    throw new Error(`Transporte inválido: "${v}". Use stdio ou http.`);
  }
  return v;
}

export function resolvePort(argv: string[], env: NodeJS.ProcessEnv): number {
  const raw = getFlag(argv, "port") ?? env.PORT ?? "3000";
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Porta inválida: "${raw}".`);
  }
  return port;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const env = process.env;
  const pack = loadPack(resolvePackName(argv, env));
  const transport = resolveTransport(argv, env);

  if (transport === "http") {
    const token = env.MCP_TOKEN;
    if (!token) {
      throw new Error(
        "Modo http exige a env MCP_TOKEN (token Bearer). Não vou subir endpoint desprotegido.",
      );
    }
    const port = resolvePort(argv, env);
    await startHttp(pack, { port, token });
    process.stderr.write(
      `mcp-conhecimento: pack "${pack.name}" em http://0.0.0.0:${port}/mcp (${pack.topics.length} tópicos)\n`,
    );
    return;
  }

  const server = buildServer(pack);
  const stdio = new StdioServerTransport();
  await server.connect(stdio);
  // stdio: não escrever em stdout (corrompe o protocolo). Log vai pra stderr.
  process.stderr.write(
    `mcp-conhecimento: pack "${pack.name}" pronto via stdio (${pack.topics.length} tópicos)\n`,
  );
}

// Só roda se for o entrypoint, não quando importado em teste.
// realpathSync resolve o symlink do bin (npx) p/ bater com import.meta.url.
const isMain = process.argv[1]
  ? realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`mcp-conhecimento: erro fatal: ${(err as Error).message}\n`);
    process.exit(1);
  });
}
