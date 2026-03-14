# MVP básico viável (Instagram SDR para Estética) — 10 dias

## Decisões fechadas
- Nicho inicial: **estética**.
- Handoff: **número único de WhatsApp**.
- Base de dados inicial: **planilha** (migração para Supabase na fase 2).
- Operação diária: **você + seu irmão**.
- Linguagem: **100% português brasileiro**, tom consultivo-comercial, objetivo e humano.

## Meta “acima da média” para o mercado brasileiro (MVP)
Como o mercado varia por cidade, oferta e ticket, o MVP vai operar com metas práticas de performance que normalmente superam operações improvisadas de DM.

- Taxa de resposta inicial (lead responde após 1ª mensagem): **>= 55%**
- Taxa de qualificação (lead atende critérios): **>= 30%**
- Taxa de handoff para WhatsApp (sobre leads qualificados): **>= 70%**
- Conversão DM -> agendamento (meta inicial): **>= 12%**

> Regra prática: se vocês sustentarem esses números por 2 semanas com volume mínimo de 50 conversas, o MVP está validado comercialmente.

## Critério sugerido de lead qualificado (estética no Brasil)
Marcar `qualified = true` quando houver, no mínimo:

1. **Interesse claro** em procedimento ou objetivo (ex.: limpeza de pele, toxina, preenchimento, protocolo corporal).
2. **Janela de decisão** até 30 dias.
3. **Capacidade de deslocamento** para a clínica (cidade/bairro compatível).
4. **Intenção de orçamento/consulta** (aceita saber valores iniciais, avaliação ou condições).

Campos mínimos na planilha:
- `lead_handle`
- `procedimento_interesse`
- `janela_decisao`
- `regiao`
- `status` (`novo`, `qualificado`, `handoff_whatsapp`, `perdido`)
- `resumo`
- `updated_at`

## Escopo técnico do MVP (E2E)
1. ManyChat Pro conectado ao Instagram da clínica.
2. Fluxo comentário/DM -> perguntas de qualificação -> resposta com tom da marca -> CTA para WhatsApp único.
3. Prompt v1 de estética.
4. Registro em planilha (manual ou via export diário).
5. Rotina diária de revisão (15 min manhã + 15 min fim do dia).

## Cronograma (10 dias)
### Dias 1-2
- Conectar canal no ManyChat
- Publicar fluxo mínimo
- Definir prompt v1

### Dias 3-4
- Rodar 20 simulações de conversa
- Ajustar objeções mais comuns
- Congelar `prompt_version=v1`

### Dias 5-7
- Produção com monitoramento
- Registrar métricas diárias na planilha
- Ajustar CTA de WhatsApp

### Dias 8-10
- Criar Prompt Tester CLI
- Validar versão `v1.1`
- Preparar backlog para webhook próprio

## Definição de pronto (DoD)
- 1 cliente real em produção
- >= 30 conversas reais
- >= 10 leads qualificados
- >= 3 handoffs para WhatsApp
- Playbook de operação diária documentado

## Próxima fase (escala sem retrabalho)
- Substituir integração nativa por webhook próprio (histórico de contexto)
- Migrar planilha para Supabase com IDs estáveis (`client_id`, `lead_handle`, `conversation_id`, `prompt_version`)
- Habilitar relatório semanal automático
