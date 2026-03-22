# Arquitetura da integração — instagram-sdr + testn8nmetaapi

## Visão geral

O pipeline é composto por dois repositórios com responsabilidades distintas:

| Repositório | Responsabilidade |
|---|---|
| **instagram-sdr** (este) | Qualificação de leads: validar prompts, simular conversas, decidir se lead é qualificado e disparar envio |
| **[testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi)** | Infraestrutura de entrega: receber, deduplicar, persistir no PostgreSQL, entregar ao n8n com retry |

## Fluxo completo

```
Instagram DM
    ↓
ManyChat Pro
  - fluxo de conversa configurado
  - prompt Claude injetado via integração nativa
    ↓
Lead qualificado identificado
    ↓
leadSender.ts (instagram-sdr)
  - monta payload no formato do contrato
  - gera X-Correlation-Id único por chamada
  - POST /webhooks/v1/leads com X-Api-Key
    ↓
testn8nmetaapi
  - valida X-Api-Key
  - valida schema do payload (Zod)
  - deduplica (SHA-256 hash)
  - persiste em PostgreSQL (tabela leads)
  - entrega ao n8n de forma assíncrona
  - retry automático com exponential backoff (até 5 tentativas)
    ↓
n8n
  - dispara automações: notifica WhatsApp, atualiza CRM, planilha, etc.
```

## Contrato da API

### Endpoint

```
POST {BACKEND_URL}/webhooks/v1/leads
```

### Headers

```
Content-Type: application/json
X-Api-Key: {BACKEND_API_KEY}
X-Correlation-Id: {uuid v4}
```

### Payload

```json
{
  "source": "instagram",
  "contractVersion": "1.0",
  "raw": {
    "handle": "@usuario_instagram",
    "instaId": "123456789",
    "firstMessage": "Texto da primeira mensagem do lead",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "qualified": {
    "procedimento_interesse": "limpeza de pele",
    "janela_decisao": "este mês",
    "regiao": "Vila Madalena, SP",
    "contato_whatsapp": "11999999999",
    "resumo": "Lead interessada em limpeza de pele, quer começar em janeiro, mora perto da clínica."
  },
  "processedAt": "2024-01-15T10:31:00.000Z"
}
```

### Resposta esperada

| Status | Significado |
|---|---|
| `200` ou `202` | Lead aceito com sucesso |
| `409` | Lead duplicado (já processado) |
| `401` | X-Api-Key inválida |
| `400` | Payload inválido |
| `5xx` | Erro no backend — leadSender lança exceção |

## O que o testn8nmetaapi entrega de graça

Ao usar o testn8nmetaapi como backend, o instagram-sdr herda automaticamente:

- **Deduplicação** — o mesmo lead não entra duas vezes
- **Persistência** — todos os leads ficam no PostgreSQL com histórico
- **Retry automático** — se o n8n estiver fora, o backend tenta de novo com backoff
- **Replay manual** — admin pode reenviar lead que falhou via `POST /admin/leads/:id/replay`
- **Rastreabilidade** — cada lead tem `correlationId` para debugging
- **Métricas** — Prometheus em `/metrics`

## Variáveis de ambiente

### instagram-sdr

```env
ANTHROPIC_API_KEY=sk-ant-...        # API da Anthropic para o prompt-tester
BACKEND_URL=https://api.dominio.com  # URL base do testn8nmetaapi
BACKEND_API_KEY=segredo-compartilhado
```

### testn8nmetaapi (referência)

```env
BACKEND_API_KEY=segredo-compartilhado  # deve ser igual ao do instagram-sdr
DATABASE_URL=postgresql://...
N8N_WEBHOOK_URL=https://n8n.dominio.com/webhook/...
N8N_INTERNAL_AUTH_TOKEN=...
ADMIN_API_KEY=...
```

## Regras de versionamento do contrato

- `contractVersion: "1.0"` é o contrato atual.
- Para mudar o shape do payload, criar uma nova versão (`"1.1"` ou `"2.0"`) e atualizar o mapper correspondente no testn8nmetaapi (`src/integrations/instagram/mappers/`).
- Nunca remover campos de versões existentes — apenas adicionar em versões novas.
- Sempre atualizar os dois repositórios juntos ao mudar o contrato.
