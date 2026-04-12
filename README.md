# instagram-sdr

> ⚠️ **Este repositório foi arquivado.** Toda a funcionalidade foi incorporada ao [testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi). Use aquele repositório para desenvolvimento.

---

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

## Como funciona — do DM ao lead qualificado

```
Alguém comenta no post ou manda DM
            ↓
    ManyChat inicia a conversa
            ↓
    IA (Claude) conduz a qualificação:
      → Qual é o interesse?
      → Qual é o prazo de decisão?
      → Qual é a região?
            ↓
    ┌─────────────────────┬──────────────────────┐
    │   Lead qualificado  │     Lead frio        │
    │  Recebe CTA para    │  Conversa encerrada  │
    │  o WhatsApp         │  sem custo humano    │
    └─────────────────────┴──────────────────────┘
            ↓
    Lead e histórico salvos automaticamente
```

---

## Dois projetos, um pipeline completo

Este repositório cuida da **qualificação**: os prompts, a lógica de triagem e o envio do lead para o backend.

O armazenamento, deduplicação e entrega para automações ficam no projeto irmão **[testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi)**.

| | instagram-sdr (este repo) | [testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi) |
|---|---|---|
| **O que faz** | Qualifica o lead no DM e decide se ele é quente | Recebe o lead, armazena, e entrega para suas automações |
| **Onde roda** | Integrado ao ManyChat via prompt | Servidor próprio com banco de dados |
| **O que entrega** | Lead triado com interesse, prazo e região | Lead no n8n, planilha, CRM ou WhatsApp — sem perda, com retry |

Para usar os dois juntos, veja a documentação técnica em [`docs/architecture.md`](docs/architecture.md).

---

## O que está neste repositório

```
prompt-tester/
  prompts/              → scripts de conversa por nicho (adicione o seu)
  cases/                → casos de teste por nicho
  src/tester.ts         → CLI para simular conversas e validar prompts
  src/webhook/
    leadSender.ts       → envia o lead qualificado para o testn8nmetaapi

skills/
  instagram-sdr-tone-ptbr/  → guia de tom de voz comercial em PT-BR

docs/
  architecture.md       → contrato técnico da integração entre os dois projetos
  mvp-estetica-e2e.md   → exemplo de plano MVP em 10 dias
```

---

## Testando um prompt antes de publicar

### Interface visual (recomendado)

```bash
cd prompt-tester
npm install
npm run ui
# abre http://localhost:3000
```

A interface tem três abas:

| Aba | O que faz |
|---|---|
| **Testar** | Roda casos em lote, mostra resultado como bolhas de DM, botão exportar PDF |
| **Demo ao vivo** | Você digita como lead e vê o SDR responder em tempo real — ideal para demonstrar para clientes |
| **Histórico** | Lista os últimos 30 testes com score, data e nicho |

### CLI (terminal)

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

## Variáveis de ambiente

```env
ANTHROPIC_API_KEY=   # API da Anthropic (para rodar prompt-tester sem --mock)
BACKEND_URL=         # URL do testn8nmetaapi
BACKEND_API_KEY=     # chave compartilhada com o testn8nmetaapi
```

---

## Projetos relacionados

- **[testn8nmetaapi](https://github.com/amaralthedoug/testn8nmetaapi)** — backend de entrega: recebe leads qualificados, deduplica, persiste no PostgreSQL e entrega ao n8n com retry automático.
