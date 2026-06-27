import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type Pack, readDoc, renderIndex, renderPrompt } from "./pack.js";

export function topicKeys(pack: Pack): [string, ...string[]] {
  const keys = pack.topics.map((t) => t.key);
  return keys as [string, ...string[]];
}

export function handleIndex(pack: Pack): string {
  return renderIndex(pack);
}

export function handleGuide(pack: Pack, topic: string): string {
  return readDoc(pack, topic);
}

function indexDescription(pack: Pack): string {
  return [
    `Lista a tabela "quando consultar o quê" do pack "${pack.name}" (${pack.title}).`,
    `Chame primeiro para se orientar; depois use ${pack.name}_guide com o tópico certo.`,
  ].join(" ");
}

function guideDescription(pack: Pack): string {
  const table = pack.topics.map((t) => `- ${t.key}: ${t.whenToUse}`).join("\n");
  return [
    `Retorna o guia completo de um tópico do pack "${pack.name}" (${pack.title}).`,
    `Consulte ANTES de decisões de engenharia. Escolha o tópico:`,
    table,
  ].join("\n");
}

export function buildServer(pack: Pack): McpServer {
  const server = new McpServer(
    { name: `mcp-conhecimento-${pack.name}`, version: "0.1.0" },
    pack.instructions ? { instructions: pack.instructions } : undefined,
  );

  server.registerTool(
    `${pack.name}_index`,
    {
      title: `Índice ${pack.title}`,
      description: indexDescription(pack),
    },
    async () => ({ content: [{ type: "text", text: handleIndex(pack) }] }),
  );

  server.registerTool(
    `${pack.name}_guide`,
    {
      title: `Guia ${pack.title}`,
      description: guideDescription(pack),
      inputSchema: { topic: z.enum(topicKeys(pack)) },
    },
    async ({ topic }) => ({ content: [{ type: "text", text: handleGuide(pack, topic) }] }),
  );

  for (const p of pack.prompts) {
    const argsSchema = Object.fromEntries(
      p.arguments.map((a) => [a.name, a.required ? z.string() : z.string().optional()]),
    );
    server.registerPrompt(
      p.name,
      { title: p.title, description: p.description, argsSchema },
      async (args: Record<string, string | undefined> = {}) => {
        const filled = Object.fromEntries(
          p.arguments.map((a) => [a.name, args[a.name] ?? ""]),
        );
        return {
          messages: [
            {
              role: "user",
              content: { type: "text", text: renderPrompt(readFileSync(p.path, "utf8"), filled) },
            },
          ],
        };
      },
    );
  }

  return server;
}
