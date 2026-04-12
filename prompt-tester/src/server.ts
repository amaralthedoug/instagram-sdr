import express, { Request, Response, NextFunction } from "express";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { loadCases, runTests, buildMockResponse, askAnthropic } from "./lib/core.js";
import { sendQualifiedLead } from "./webhook/leadSender.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// ── Auth middleware ──────────────────────────────────────────────────────────
// Skipped when SUPABASE_JWT_SECRET is not set (local dev without Supabase)
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) { next(); return; }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    jwt.verify(header.slice(7), secret);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "src", "ui.html"));
});

app.get("/api/config", (_req, res) => {
  res.json({
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? null,
  });
});

app.get("/api/prompts", requireAuth, async (_req, res) => {
  try {
    const files = await readdir(path.join(process.cwd(), "prompts"));
    res.json(files.filter((f) => f.endsWith(".md")));
  } catch {
    res.json([]);
  }
});

app.get("/api/cases", requireAuth, async (_req, res) => {
  try {
    const files = await readdir(path.join(process.cwd(), "cases"));
    res.json(files.filter((f) => f.endsWith(".json")));
  } catch {
    res.json([]);
  }
});

app.post("/api/run", requireAuth, async (req, res) => {
  try {
    const { prompt: promptFile, cases: casesFile, mock, apiKey: bodyApiKey, model } = req.body as {
      prompt: string;
      cases: string;
      mock: boolean;
      apiKey?: string;
      model?: string;
    };

    const apiKey = bodyApiKey ?? process.env.ANTHROPIC_API_KEY;

    if (!mock && !apiKey) {
      res.status(400).json({ error: "API Key obrigatória no modo real." });
      return;
    }

    const [promptContent, cases] = await Promise.all([
      readFile(path.join(process.cwd(), "prompts", promptFile), "utf8"),
      loadCases(path.join(process.cwd(), "cases", casesFile)),
    ]);

    const results = await runTests({ promptContent, casesFile: cases, mock, apiKey, model });
    const passed = results.filter((r) => r.pass).length;

    res.json({
      results,
      passed,
      total: results.length,
      score: Number(((passed / results.length) * 100).toFixed(1)),
      client: cases.client,
      niche: cases.niche,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/chat", requireAuth, async (req, res) => {
  try {
    const { prompt: promptFile, messages, mock, apiKey: bodyApiKey, model } = req.body as {
      prompt: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      mock: boolean;
      apiKey?: string;
      model?: string;
    };

    const apiKey = bodyApiKey ?? process.env.ANTHROPIC_API_KEY;

    if (!mock && !apiKey) {
      res.status(400).json({ error: "API Key obrigatória no modo real." });
      return;
    }

    const lastMessage = messages[messages.length - 1].content;

    if (mock) {
      res.json({ output: buildMockResponse(lastMessage) });
      return;
    }

    const promptContent = await readFile(path.join(process.cwd(), "prompts", promptFile), "utf8");
    const output = await askAnthropic(
      apiKey as string,
      model ?? "claude-haiku-4-5-20251001",
      promptContent,
      lastMessage,
      220,
      0.3,
    );

    res.json({ output });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/results", requireAuth, async (_req, res) => {
  try {
    const dir = path.join(process.cwd(), "results");
    const files = await readdir(dir).catch(() => []);
    const items = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse()
        .slice(0, 30)
        .map(async (f) => {
          const raw = await readFile(path.join(dir, f), "utf8");
          const { metadata } = JSON.parse(raw) as { metadata: Record<string, unknown> };
          return { file: f, ...metadata };
        }),
    );
    res.json(items);
  } catch {
    res.json([]);
  }
});

app.post("/api/webhook/manychat", requireAuth, async (req, res) => {
  const secret = req.headers["x-webhook-secret"];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { handle, instaId, firstMessage, procedimento, janela, regiao, whatsapp } = req.body as {
    handle: string;
    instaId?: string;
    firstMessage: string;
    procedimento: string;
    janela: string;
    regiao: string;
    whatsapp?: string;
  };

  if (!handle || !firstMessage || !procedimento || !janela || !regiao) {
    res.status(400).json({ error: "Campos obrigatórios: handle, firstMessage, procedimento, janela, regiao" });
    return;
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let resumo: string;

    if (apiKey) {
      const system = "Você gera resumos concisos de leads qualificados para uma clínica. Responda em português, máximo 2 frases diretas, sem saudação.";
      const user = `Handle: ${handle}. Procedimento: ${procedimento}. Janela de decisão: ${janela}. Região: ${regiao}. WhatsApp: ${whatsapp ?? "não informado"}. Primeira mensagem: "${firstMessage}".`;
      resumo = await askAnthropic(apiKey, "claude-haiku-4-5-20251001", system, user, 150, 0.3);
    } else {
      resumo = `Lead interessado em ${procedimento}, janela de decisão: ${janela}, região: ${regiao}.`;
    }

    await sendQualifiedLead({ handle, instaId, firstMessage, procedimento, janela, regiao, whatsapp, resumo });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/test-connection", requireAuth, async (req, res) => {
  const { provider, apiKey, model } = req.body as {
    provider: string;
    apiKey: string;
    model: string;
  };

  if (!provider || !apiKey || !model) {
    res.status(400).json({ ok: false, error: "provider, apiKey e model são obrigatórios." });
    return;
  }

  try {
    let fetchRes: Awaited<ReturnType<typeof fetch>>;

    if (provider === "anthropic") {
      fetchRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
    } else if (provider === "openai") {
      fetchRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
    } else if (provider === "gemini") {
      fetchRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );
    } else {
      res.json({ ok: false, error: `Provedor desconhecido: ${provider}` });
      return;
    }

    if (!fetchRes.ok) {
      const body = await fetchRes.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
      res.json({ ok: false, error: body.error?.message ?? body.message ?? `HTTP ${fetchRes.status}` });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: (err as Error).message });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`\n  ◆ Prompt Tester`);
  console.log(`  → http://localhost:${PORT}\n`);
});
