# instagram-sdr
Camada de qualificação de leads via Instagram DM — usa ManyChat + Claude API para triagem e handoff para WhatsApp. Funciona para qualquer nicho de serviço.

> **Este projeto é o front-end de qualificação. O backend de entrega é o [testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi).**

## Arquitetura geral

```
Instagram DM
    ↓
ManyChat (fluxo + prompt Claude)
    ↓
instagram-sdr  ←  você está aqui
  - testa e valida prompts (prompt-tester CLI)
  - quando lead é qualificado, dispara leadSender.ts
    ↓
POST /webhooks/v1/leads  (X-Api-Key)
    ↓
testn8nmetaapi  ←  backend separado
  - recebe, deduplica, persiste no PostgreSQL
  - entrega para n8n com retry automático
    ↓
n8n (notifica WhatsApp, CRM, planilha...)
```

O contrato de integração entre os dois projetos está documentado em `docs/architecture.md`.

## Estrutura
- `docs/architecture.md`: contrato técnico da integração com testn8nmetaapi.
- `docs/mvp-estetica-e2e.md`: plano MVP de referência (10 dias).
- `skills/instagram-sdr-tone-ptbr/`: skill para padronizar tom comercial em PT-BR.
- `prompt-tester/`: CLI TypeScript para simular conversas e validar prompts antes de publicar no ManyChat.
- `prompt-tester/prompts/`: exemplos de prompt por nicho (estética, odonto — adicione o seu).
- `prompt-tester/cases/`: casos de teste por nicho em JSON.
- `prompt-tester/src/webhook/leadSender.ts`: envia lead qualificado para o testn8nmetaapi.

## Variáveis de ambiente necessárias

```env
ANTHROPIC_API_KEY=        # para rodar prompt-tester sem --mock
BACKEND_URL=              # URL base do testn8nmetaapi (ex: https://api.seudominio.com)
BACKEND_API_KEY=          # mesmo valor de BACKEND_API_KEY do testn8nmetaapi
```

## Prompt Tester
```bash
cd prompt-tester
npm install
npm run run -- --prompt prompts/<seu-nicho>.md --cases cases/<seu-nicho>.json --mock
```

Sem `--mock`, define `ANTHROPIC_API_KEY` para rodar com a API da Anthropic.
