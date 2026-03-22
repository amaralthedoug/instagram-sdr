import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCases, runTests } from "./lib/core.js";

interface CliOptions {
  promptPath: string;
  casesPath: string;
  model: string;
  maxTokens: number;
  temperature: number;
  mock: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const getValue = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };

  const promptPath = getValue("--prompt");
  const casesPath = getValue("--cases");

  if (!promptPath || !casesPath) {
    throw new Error(
      "Uso: npm run run -- --prompt prompts/estetica-v1.md --cases cases/estetica.json [--mock] [--model ...]",
    );
  }

  return {
    promptPath,
    casesPath,
    model: getValue("--model") ?? "claude-3-5-haiku-latest",
    maxTokens: Number(getValue("--max-tokens") ?? "220"),
    temperature: Number(getValue("--temperature") ?? "0.3"),
    mock: argv.includes("--mock"),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const [prompt, casesFile] = await Promise.all([
    readFile(options.promptPath, "utf8"),
    loadCases(options.casesPath),
  ]);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!options.mock && !apiKey) {
    throw new Error("Defina ANTHROPIC_API_KEY ou rode com --mock.");
  }

  const results = await runTests({
    promptContent: prompt,
    casesFile,
    mock: options.mock,
    apiKey,
    model: options.model,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  });

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const score = ((passed / total) * 100).toFixed(1);

  console.table(
    results.map((r) => ({
      id: r.id,
      pass: r.pass ? "OK" : "FAIL",
      notes: r.notes,
    })),
  );

  console.log(`\nResumo: ${passed}/${total} casos aprovados (${score}%).`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve("results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `run-${timestamp}.json`);

  await writeFile(
    outputPath,
    JSON.stringify(
      {
        metadata: {
          model: options.model,
          mock: options.mock,
          promptPath: options.promptPath,
          casesPath: options.casesPath,
          generatedAt: new Date().toISOString(),
          passed,
          total,
          score: Number(score),
          client: casesFile.client,
          niche: casesFile.niche,
        },
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Resultado salvo em: ${outputPath}`);
}

main().catch((error) => {
  console.error("Erro ao executar prompt tester:", error.message);
  process.exitCode = 1;
});
