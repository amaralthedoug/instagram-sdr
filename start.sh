#!/bin/bash
set -e

ENV_FILE="$(dirname "$0")/prompt-tester/.env"
cd "$(dirname "$0")/prompt-tester"

# Validate .env
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "  ✗ Arquivo .env não encontrado."
  echo "  → Copie o exemplo: cp prompt-tester/.env.example prompt-tester/.env"
  echo ""
  exit 1
fi

echo ""
echo "  ◆ instagram-sdr — verificando ambiente..."

missing=0
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  if [ -z "$value" ]; then
    echo "  ✗ $key não está preenchido no .env"
    missing=1
  else
    echo "  ✓ $key"
  fi
done < "$ENV_FILE"

if [ "$missing" -eq 1 ]; then
  echo ""
  echo "  Preencha as variáveis acima no arquivo prompt-tester/.env e rode novamente."
  echo ""
  exit 1
fi

# Kill previous server if running
fuser -k 3000/tcp 2>/dev/null || true

# Start server in background
echo ""
echo "  → Subindo servidor..."
npm run ui &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# Check if ngrok is available
if ! command -v ngrok &>/dev/null; then
  echo ""
  echo "  ✗ ngrok não encontrado. Instale em: https://ngrok.com/download"
  echo "  → Servidor rodando em http://localhost:3000"
  echo ""
  wait $SERVER_PID
  exit 0
fi

# Start ngrok and get public URL
echo "  → Subindo ngrok..."
ngrok http 3000 --log=stdout --log-level=error > /tmp/ngrok-sdr.log 2>&1 &
NGROK_PID=$!

sleep 3

PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ◆ Tudo no ar!"
echo ""
echo "  UI local:   http://localhost:3000"
if [ -n "$PUBLIC_URL" ]; then
  echo "  URL pública: $PUBLIC_URL"
  echo ""
  echo "  Webhook ManyChat:"
  echo "  $PUBLIC_URL/api/webhook/manychat"
fi
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Pressione Ctrl+C para parar tudo."
echo ""

trap "kill $SERVER_PID $NGROK_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $SERVER_PID
