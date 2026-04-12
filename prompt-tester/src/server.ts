import express from "express";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCases, runTests, buildMockResponse, askAnthropic } from "./lib/core.js";
import { sendQualifiedLead } from "./webhook/leadSender.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "src", "ui.html"));
});

app.get("/api/prompts", async (_req, res) => {
  try {
    const files = await readdir(path.join(process.cwd(), "prompts"));
    res.json(files.filter((f) => f.endsWith(".md")));
  } catch {
    res.json([]);
  }
});

app.get("/api/cases", async (_req, res) => {
  try {
    const files = await readdir(path.join(process.cwd(), "cases"));
    res.json(files.filter((f) => f.endsWith(".json")));
  } catch {
    res.json([]);
  }
});

app.post("/api/run", async (req, res) => {
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

// Multi-turn chat for demo mode
app.post("/api/chat", async (req, res) => {
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

// List past test runs
app.get("/api/results", async (_req, res) => {
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

// ManyChat webhook — receives qualified lead and forwards to testn8nmetaapi
app.post("/api/webhook/manychat", async (req, res) => {
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

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`\n  ◆ Prompt Tester`);
  console.log(`  → http://localhost:${PORT}\n`);
});
