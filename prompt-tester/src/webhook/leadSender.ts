import crypto from 'crypto';

export type QualifiedLead = {
  handle: string; instaId?: string; firstMessage: string;
  procedimento: string; janela: string; regiao: string; whatsapp?: string; resumo: string;
};

export async function sendQualifiedLead(lead: QualifiedLead): Promise<void> {
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) throw new Error('BACKEND_URL and BACKEND_API_KEY must be set');

  const correlationId = crypto.randomUUID();
  const payload = {
    source: 'instagram', contractVersion: '1.0',
    raw: { handle: lead.handle, instaId: lead.instaId, firstMessage: lead.firstMessage, timestamp: new Date().toISOString() },
    qualified: { procedimento_interesse: lead.procedimento, janela_decisao: lead.janela, regiao: lead.regiao, contato_whatsapp: lead.whatsapp, resumo: lead.resumo },
    processedAt: new Date().toISOString()
  };

  const res = await fetch(`${backendUrl}/webhooks/v1/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey, 'X-Correlation-Id': correlationId },
    body: JSON.stringify(payload)
  });

  if (res.status !== 200 && res.status !== 202) {
    const body = await res.text();
    throw new Error(`Backend rejeitou lead [${correlationId}]: ${res.status} ${body}`);
  }
}
