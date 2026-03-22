# CLAUDE.md — instagram-sdr

Instruções para agentes IA que trabalham neste repositório.

## O que é este projeto

Camada de **qualificação de leads** via Instagram DM. Valida prompts, simula conversas e envia leads qualificados para o backend.

Este projeto **não é um sistema completo sozinho**. Ele é o front-end de qualificação de um pipeline maior:

```
instagram-sdr  →  POST /webhooks/v1/leads  →  testn8nmetaapi  →  n8n
```

O backend (`testn8nmetaapi`) é um repositório separado: https://github.com/amaralthedoug/testn8nmetaapi

## Contrato de integração — NÃO ALTERE SEM INTENÇÃO EXPLÍCITA

O arquivo `prompt-tester/src/webhook/leadSender.ts` implementa o contrato entre este projeto e o testn8nmetaapi. Qualquer mudança nele pode quebrar a integração.

### O que está fixado no contrato

**Endpoint:**
```
POST {BACKEND_URL}/webhooks/v1/leads
```

**Headers obrigatórios:**
```
Content-Type: application/json
X-Api-Key: {BACKEND_API_KEY}
X-Correlation-Id: {uuid v4 gerado por chamada}
```

**Shape do payload:**
```json
{
  "source": "instagram",
  "contractVersion": "1.0",
  "raw": {
    "handle": "string",
    "instaId": "string | undefined",
    "firstMessage": "string",
    "timestamp": "ISO 8601"
  },
  "qualified": {
    "procedimento_interesse": "string",
    "janela_decisao": "string",
    "regiao": "string",
    "contato_whatsapp": "string | undefined",
    "resumo": "string"
  },
  "processedAt": "ISO 8601"
}
```

**Resposta esperada:** HTTP 200 ou 202. Qualquer outro status é erro.

### Regras para agentes

- Não mude os nomes dos campos do payload (`procedimento_interesse`, `janela_decisao`, `regiao`, `contato_whatsapp`, `resumo`, `source`, `contractVersion`).
- Não mude o nome do header `X-Api-Key` nem `X-Correlation-Id`.
- Não mude o caminho `/webhooks/v1/leads`.
- Não troque `contractVersion` sem atualizar o testn8nmetaapi junto.
- Se precisar adicionar campos, adicione dentro de `qualified` ou `raw` — nunca remova existentes.

## O que pode mudar livremente

- Prompts em `prompt-tester/prompts/`
- Casos de teste em `prompt-tester/cases/`
- Lógica de avaliação de casos em `tester.ts` (sem alterar a integração com leadSender)
- Skills em `skills/`
- Documentação em `docs/`

## Variáveis de ambiente

| Variável | Onde é usada | Obrigatória para |
|---|---|---|
| `ANTHROPIC_API_KEY` | `tester.ts` | rodar sem `--mock` |
| `BACKEND_URL` | `leadSender.ts` | enviar leads ao backend |
| `BACKEND_API_KEY` | `leadSender.ts` | autenticar no testn8nmetaapi |

## Referências

- Contrato técnico completo: `docs/architecture.md`
- Detalhes do backend: https://github.com/amaralthedoug/testn8nmetaapi
