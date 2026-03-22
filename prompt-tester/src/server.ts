import express from "express";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCases, runTests } from "./lib/core.js";

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

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`\n  ◆ Prompt Tester`);
  console.log(`  → http://localhost:${PORT}\n`);
});
