#!/bin/bash
curl -s \
  -X POST "https://probation-trident-crusader.ngrok-free.dev/api/webhook/manychat" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: 598ffe89986febc6404e54fa4a79df4565a43feeefa90f57f4017f1242c96a9f" \
  -d '{"handle":"@teste_lead","firstMessage":"Quero fazer limpeza de pele","procedimento":"limpeza de pele","janela":"este mes","regiao":"Vila Madalena SP","whatsapp":"11999999999"}'
echo
