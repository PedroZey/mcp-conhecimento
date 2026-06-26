import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadPack } from "./pack.js";
import { buildServer } from "./server.js";

export function resolvePackName(argv: string[], env: NodeJS.ProcessEnv): string {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--pack=")) return arg.slice("--pack=".length);
    if (arg === "--pack" && argv[i + 1]) return argv[i + 1];
  }
  if (env.PACK) return env.PACK;
  throw new Error(
    "Nenhum pack informado. Use --pack=<nome> (ex: --pack=akita) ou a env PACK.",
  );
}

async function main(): Promise<void> {
  const packName = resolvePackName(process.argv.slice(2), process.env);
  const pack = loadPack(packName);
  const server = buildServer(pack);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio: não escrever em stdout (corrompe o protocolo). Log vai pra stderr.
  process.stderr.write(
    `mcp-conhecimento: pack "${pack.name}" pronto (${pack.topics.length} tópicos)\n`,
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
