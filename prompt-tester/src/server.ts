import express from "express";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCases, runTests, buildMockResponse, askAnthropic } from "./lib/core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "ui.html"));
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
    const { prompt: promptFile, cases: casesFile, mock, apiKey, model } = req.body as {
      prompt: string;
      cases: string;
      mock: boolean;
      apiKey?: string;
      model?: string;
    };

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
    const { prompt: promptFile, messages, mock, apiKey, model } = req.body as {
      prompt: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      mock: boolean;
      apiKey?: string;
      model?: string;
    };

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
      model ?? "claude-3-5-haiku-latest",
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

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`\n  ◆ Prompt Tester`);
  console.log(`  → http://localhost:${PORT}\n`);
});
