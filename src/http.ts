import { timingSafeEqual } from "node:crypto";
import type { Server } from "node:http";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { type Pack } from "./pack.js";
import { buildServer } from "./server.js";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function bearerToken(req: Request): string {
  const header = req.headers.authorization ?? "";
  const prefix = "Bearer ";
  return header.startsWith(prefix) ? header.slice(prefix.length) : "";
}

export function createApp(pack: Pack, token: string): Express {
  const app = express();
  app.use(express.json());

  // Health: sem auth (healthcheck do Coolify).
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", pack: pack.name, topics: pack.topics.length });
  });

  // Auth Bearer só no /mcp.
  app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
    if (!safeEqual(bearerToken(req), token)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });

  // Streamable HTTP stateless: novo server+transport por request.
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const server = buildServer(pack);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  });

  // Stateless: GET/DELETE não suportados.
  const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).json({ error: "Method Not Allowed" });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}

export function startHttp(
  pack: Pack,
  opts: { port: number; token: string },
): Promise<Server> {
  const app = createApp(pack, opts.token);
  return new Promise((resolve) => {
    const server = app.listen(opts.port, () => resolve(server));
  });
}
