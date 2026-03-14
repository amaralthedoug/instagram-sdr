import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface CaseItem {
  id: string;
  input: string;
  expected?: string;
}

interface CasesFile {
  client: string;
  niche: string;
  cases: CaseItem[];
}

interface CliOptions {
  promptPath: string;
  casesPath: string;
  model: string;
  maxTokens: number;
  temperature: number;
  mock: boolean;
}

interface CaseResult {
  id: string;
  input: string;
  output: string;
  expected?: string;
  pass: boolean;
  notes: string;
}

const STOPWORDS = new Set([
  "a",
  "as",
  "o",
  "os",
  "e",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "uns",
  "umas",
  "para",
  "por",
  "com",
  "sem",
]);

function tokenizeWords(text: string): string[] {
  return (
    text
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
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

async function loadCases(filePath: string): Promise<CasesFile> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as CasesFile;

  if (!parsed.cases || !Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    throw new Error("Arquivo de casos inválido: inclua um array não vazio em 'cases'.");
  }

  return parsed;
}

function buildMockResponse(input: string): string {
  const lowered = input.toLowerCase();
  if (lowered.includes("preço") || lowered.includes("valor")) {
    return "Posso te passar uma faixa inicial, mas antes quero entender seu objetivo para indicar a melhor opção. Você busca começar ainda este mês?";
  }

  if (lowered.includes("dor") || lowered.includes("medo")) {
    return "Super normal ter essa dúvida. A avaliação é justamente para te orientar com segurança no seu caso. Quer que eu te explique como funciona?";
  }

  return "Perfeito! Me conta seu objetivo principal com esse procedimento para eu te orientar da forma mais assertiva.";
}

async function askAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erro Anthropic (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) {
    throw new Error("Resposta da Anthropic sem conteúdo de texto.");
  }

  return text;
}

function evaluateCase(item: CaseItem, output: string): { pass: boolean; notes: string } {
  if (!item.expected) {
    return { pass: true, notes: "Sem critério esperado explícito." };
  }

  const expectedTokens = tokenizeWords(item.expected)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
    .slice(0, 8);

  const outputWords = new Set(tokenizeWords(output));
  const matchedTokens = expectedTokens.filter((token) => outputWords.has(token));

  if (expectedTokens.length === 0) {
    return { pass: true, notes: "Sem tokens relevantes após normalização." };
  }

  const ratio = matchedTokens.length / expectedTokens.length;

  if (ratio >= 0.5) {
    return {
      pass: true,
      notes: `Cobertura de expectativa: ${(ratio * 100).toFixed(0)}% (${matchedTokens.length}/${expectedTokens.length})`,
    };
  }

  return {
    pass: false,
    notes: `Baixa cobertura da expectativa (${(ratio * 100).toFixed(0)}%). Esperado: ${expectedTokens.join(", ")}`,
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

  const results: CaseResult[] = [];

  for (const item of casesFile.cases) {
    const output = options.mock
      ? buildMockResponse(item.input)
      : await askAnthropic(
          apiKey as string,
          options.model,
          prompt,
          item.input,
          options.maxTokens,
          options.temperature,
        );

    const verdict = evaluateCase(item, output);

    results.push({
      id: item.id,
      input: item.input,
      output,
      expected: item.expected,
      pass: verdict.pass,
      notes: verdict.notes,
    });
  }

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
