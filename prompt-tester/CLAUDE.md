# Prompt Tester CLI

## Objetivo
Validar prompts de qualquer nicho antes de publicar no ManyChat, com simulações em lote e output estruturado para revisão humana.

## Regras
- Linguagem de saída sempre em Português do Brasil.
- Não publicar prompt novo sem rodar pelo menos 10 casos.
- Marcar como aprovado apenas se não houver resposta insegura, vaga ou fora de contexto comercial.

## Como rodar
```bash
npm run run -- --prompt prompts/<nicho>.md --cases cases/<nicho>.json --mock
```

Sem `--mock`, o script usa a API da Anthropic com `ANTHROPIC_API_KEY`.
