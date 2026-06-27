import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

export type Topic = {
  key: string;
  file: string;
  title: string;
  whenToUse: string;
  path: string;
};

export type PromptArg = { name: string; description: string; required: boolean };

export type PromptDef = {
  name: string;
  title: string;
  description: string;
  file: string;
  path: string;
  arguments: PromptArg[];
};

export type Pack = {
  name: string;
  title: string;
  description: string;
  topics: Topic[];
  dir: string;
  instructions?: string;
  prompts: PromptDef[];
};

// packs/ fica ao lado de dist/ (build) ou de src/ (tsx) — ambos resolvem para a raiz do repo.
export const DEFAULT_PACKS_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packs",
);

const ManifestSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  topics: z
    .array(
      z.object({
        key: z.string().min(1),
        file: z.string().min(1),
        title: z.string().min(1),
        whenToUse: z.string().min(1),
      }),
    )
    .min(1),
  instructions: z.string().min(1).optional(),
  prompts: z
    .array(
      z.object({
        name: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        file: z.string().min(1),
        arguments: z
          .array(
            z.object({
              name: z.string().min(1),
              description: z.string().min(1),
              required: z.boolean(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export function loadPack(packName: string, packsRoot: string = DEFAULT_PACKS_ROOT): Pack {
  const dir = join(packsRoot, packName);
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Pack "${packName}" não encontrado: manifest ausente em ${manifestPath}`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new Error(`Manifest inválido em ${manifestPath}: ${(err as Error).message}`);
  }

  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Manifest inválido em ${manifestPath}: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const topics: Topic[] = parsed.data.topics.map((t) => {
    const path = join(dir, t.file);
    if (!existsSync(path)) {
      throw new Error(
        `Pack "${packName}": doc do tópico "${t.key}" ausente (esperado em ${path})`,
      );
    }
    return { ...t, path };
  });

  const prompts: PromptDef[] = (parsed.data.prompts ?? []).map((p) => {
    const path = join(dir, p.file);
    if (!existsSync(path)) {
      throw new Error(
        `Pack "${packName}": template do prompt "${p.name}" ausente (esperado em ${path})`,
      );
    }
    return {
      name: p.name,
      title: p.title,
      description: p.description,
      file: p.file,
      path,
      arguments: p.arguments ?? [],
    };
  });

  return {
    name: parsed.data.name,
    title: parsed.data.title,
    description: parsed.data.description,
    topics,
    dir,
    instructions: parsed.data.instructions,
    prompts,
  };
}

export function readDoc(pack: Pack, topicKey: string): string {
  const topic = pack.topics.find((t) => t.key === topicKey);
  if (!topic) {
    const valid = pack.topics.map((t) => t.key).join(", ");
    throw new Error(`Tópico "${topicKey}" inválido. Válidos: ${valid}`);
  }
  return readFileSync(topic.path, "utf8");
}

export function renderIndex(pack: Pack): string {
  const header = `# ${pack.title}\n\n${pack.description}\n\n## Quando consultar o quê\n\n| Tópico | Título | Quando usar |\n|---|---|---|`;
  const rows = pack.topics
    .map((t) => `| \`${t.key}\` | ${t.title} | ${t.whenToUse} |`)
    .join("\n");
  return `${header}\n${rows}`;
}

export function renderPrompt(template: string, args: Record<string, string>): string {
  return template.replace(/\{\{([\w-]+)\}\}/g, (match, name) =>
    Object.hasOwn(args, name) ? args[name] : match,
  );
}
