# instagram-sdr
Instagram SDR automation — ManyChat + Claude API + Webhook + Dashboard

## Conteúdo adicionado
- `docs/mvp-estetica-e2e.md`: plano MVP ponta a ponta (10 dias) para validação rápida.
- `skills/instagram-sdr-tone-ptbr/`: skill para padronizar tom comercial em PT-BR com foco em estética.
- `prompt-tester/`: CLI TypeScript para simular conversas e validar prompts antes de publicar no ManyChat.

## Prompt Tester (Semana 2)
```bash
cd prompt-tester
npm install
npm run run -- --prompt prompts/estetica-v1.md --cases cases/estetica.json --mock
```

Sem `--mock`, defina `ANTHROPIC_API_KEY` para rodar com a API da Anthropic.
