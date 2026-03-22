# instagram-sdr

**Transforme o DM do Instagram em uma máquina de qualificação de leads — sem atendente humano para cada mensagem.**

Você investe em tráfego pago ou produz conteúdo orgânico. As pessoas chegam no seu perfil, mandam DM, perguntam preço — e a maioria some antes de você responder. Este projeto resolve isso: um SDR (vendedor de qualificação) rodando no Instagram, 24h, que conversa, filtra quem tem intenção real de compra e encaminha para o seu WhatsApp só os leads quentes.

---

## O problema que isso resolve

| Situação comum | Com este projeto |
|---|---|
| Lead manda DM às 23h, você responde de manhã — ele já esfriou | Resposta imediata, qualquer horário |
| Atendente gasta tempo com curiosos sem intenção de compra | Só chega no WhatsApp quem já está qualificado |
| Cada nicho e campanha tem um script diferente na cabeça da equipe | Prompt validado e versionado, comportamento consistente |
| Não sabe quantos leads chegaram, quantos qualificaram | Registro automático com histórico completo |

---

## Como funciona na prática

```
Alguém comenta no post ou manda DM
        ↓
ManyChat inicia a conversa automaticamente
        ↓
IA (Claude) qualifica: entende o interesse, janela de decisão e região
        ↓
Lead qualificado → recebe CTA para o WhatsApp da clínica/empresa
Lead frio → conversa encerrada sem custo humano
        ↓
Dados salvos automaticamente (histórico, métricas, status)
```

---

## Para quem é este projeto

- **Gestor de tráfego** que roda campanhas para clientes e quer entregar mais do que clique — quer entregar lead qualificado.
- **Produtor de conteúdo / negócio com orgânico forte** que recebe volume de DM mas não tem equipe para atender tudo.
- **Dono de negócio de serviço** (clínica, escola, consultório, salão, academia) que quer automatizar a primeira triagem sem perder o tom humano.
- **Dev ou agência** que quer montar essa solução para clientes.

---

## Exemplos de aplicação

| Segmento | O que a IA qualifica |
|---|---|
| Clínica estética / odonto | Procedimento de interesse, prazo, região |
| Escola / curso | Área de interesse, período disponível, modalidade |
| Imobiliária | Tipo de imóvel, faixa de valor, prazo de decisão |
| Academia / personal | Objetivo, disponibilidade, bairro |
| Qualquer serviço local | Adapte o prompt ao seu nicho em minutos |

---

## O que está neste repositório

Este repo é a **camada de qualificação** — os prompts, a lógica de triagem e o envio do lead qualificado para o backend.

> O backend de entrega (persistência, retry, n8n) é o projeto separado [testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi).

### Estrutura de arquivos

```
prompt-tester/
  prompts/          → scripts de conversa por nicho (adicione o seu)
  cases/            → casos de teste por nicho
  src/tester.ts     → CLI para simular conversas e validar prompts
  src/webhook/
    leadSender.ts   → envia lead qualificado para o backend

skills/
  instagram-sdr-tone-ptbr/  → guia de tom de voz em PT-BR

docs/
  architecture.md   → contrato técnico da integração
  mvp-estetica-e2e.md → exemplo de plano MVP em 10 dias
```

---

## Pipeline completo (visão técnica)

```
Instagram DM
    ↓
ManyChat Pro (fluxo + prompt Claude)
    ↓
leadSender.ts  →  POST /webhooks/v1/leads
    ↓
testn8nmetaapi
  - valida, deduplica, persiste no PostgreSQL
  - retry automático se n8n cair
    ↓
n8n → notifica WhatsApp, CRM, planilha, etc.
```

Documentação do contrato de integração: [`docs/architecture.md`](docs/architecture.md)

---

## Testando um prompt antes de publicar

```bash
cd prompt-tester
npm install

# modo simulado (sem API key)
npm run run -- --prompt prompts/estetica-v1.md --cases cases/estetica.json --mock

# modo real (usa Claude API)
ANTHROPIC_API_KEY=sua-chave npm run run -- --prompt prompts/estetica-v1.md --cases cases/estetica.json
```

O resultado sai em `prompt-tester/results/` com pass/fail por caso de teste.

---

## Variáveis de ambiente

```env
ANTHROPIC_API_KEY=   # API da Anthropic (para rodar prompt-tester sem --mock)
BACKEND_URL=         # URL do testn8nmetaapi
BACKEND_API_KEY=     # chave compartilhada com o testn8nmetaapi
```

---

## Criando um prompt para o seu nicho

Crie um arquivo em `prompt-tester/prompts/seu-nicho.md` seguindo o padrão:

```
Você é SDR de [tipo de negócio] no Brasil.
Fale em português brasileiro, com tom [consultivo/acolhedor/direto].

Regras:
- Faça 1 pergunta por vez.
- Não prometa resultados garantidos.
- Qualifique por [critério 1], [critério 2] e [critério 3].
- Se houver intenção real, convide para WhatsApp para avançar.
```

Crie os casos de teste em `prompt-tester/cases/seu-nicho.json` e rode com `--mock` para validar antes de publicar.

---

## Projetos relacionados

- [testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi) — backend de entrega: recebe leads, deduplica, persiste e entrega ao n8n com retry automático.
