#!/bin/bash

# --- Start FastAPI ML server inside venv ---
source .venv/bin/activate
python -m uvicorn apps.ml_server.main:app --port 8000 --reload &
UVICORN_PID=$!

# --- Start ngrok (reuse if already running) ---
if pgrep -x ngrok > /dev/null; then
  echo "ngrok already running, reusing existing tunnel..."
else
  ngrok http 8000 > /dev/null &
  NGROK_PID=$!
  sleep 2
fi

# --- Fetch ngrok public URL ---
URL=$(curl -s http://127.0.0.1:4040/api/tunnels \
  | grep -o '"public_url":"[^"]*"' \
  | head -n1 \
  | cut -d'"' -f4)

# --- Update .env for Node backend ---
echo "AI_SERVER_URL=$URL" > .env
echo "Updated .env with $URL"

# --- Start Node backend ---
node apps/server/server.js &
NODE_PID=$!

# --- Trap CTRL+C to clean up ---
trap "kill $UVICORN_PID $NGROK_PID $NODE_PID" EXIT

# --- Keep script alive so background processes don’t exit ---
wait
