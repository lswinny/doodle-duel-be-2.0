# Development Setup: FastAPI ML Server + ngrok + Node Backend

This guide explains how to set up and run the ML server, ngrok tunnel, and Node backend together.  
It’s designed for colleagues who fork this project and want a reproducible local environment.

---

## 📦 Prerequisites

- **Python 3.10+** installed
- **Node.js 18+** installed
- **ngrok** installed (sign up at [ngrok.com](https://ngrok.com) and download the CLI)
- A working **virtual environment** (`.venv`) for Python

---

## ⚙️ Installation

1. **Clone your fork**
   ```bash
   git clone <your-fork-url>
   cd new-doodle-duel/Backend

2. **Python Setup**
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
.venv\Scripts\activate      # Windows PowerShell
pip install -r requirements.txt

3. **Node Setup**
npm install

4. **NGrok Setup**
- Sign up to ngrok on website
- Install ngrok CLI
- Authenticate with your account: ngrok config add-authtoken <your-token>


# 🚀 Running Manually (for debugging)
Open three terminals:

1. **FastAPI ML server**
source .venv/bin/activate
uvicorn apps.ml_server.main:app --port 8000 --reload

2. **ngrok tunnel**
ngrok http 8000
Copy the generated URL (e.g. https://abcd1234.ngrok-free.dev).

3. **Node backend**
Update .env with the ngrok URL (e.g. https://abcd1234.ngrok-free.dev): 
AI_SERVER_URL=https://abcd1234.ngrok-free.dev

Then run: node apps/server/server.js

##  🖥️ Running with 'start-dev.sh' (using just one terminal)
Use a helper script that automates all three steps (copy and paste the code at the bottom of this MD file into your own start-dev.sh file, which should belong in the backend repo root).

1. Make it executable

chmod +x start-dev.sh

2. Run it

./start-dev.sh

3. What it does
- Activates the Python venv and starts FastAPI ML server
- Starts ngrok (or reuses an existing tunnel)
- Fetches the ngrok public URL and writes it into .env
- Starts the Node backend

You’ll see logs like:

Uvicorn running on http://127.0.0.1:8000
Updated .env with https://abcd1234.ngrok-free.dev
Server running on http://localhost:3000
Press CTRL+C to stop everything. The script will clean up all processes.

## 🧭 Notes & Best Practices
Do not hardcode ngrok URLs in .env. They change each time unless you have a paid reserved domain. The script updates .env automatically.

Add .env to `.gitignore so each developer can have their own local tunnel.

If you see ERR_NGROK_334 (endpoint already online), it means ngrok was already running. Kill it with the command below and then rerun the script:

pkill -f ngrok

For production, you’ll eventually deploy FastAPI to a real host instead of ngrok.

## ✅ Quick Recap
Manual mode → 3 terminals (uvicorn, ngrok, Node).

Script mode → 1 terminal (./start-dev.sh) does it all.

.env is dynamically updated with the current ngrok URL.



## start-dev.sh (Copy and paste everything below, including the bits in blue, into your own file):

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
