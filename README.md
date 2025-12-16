# Doodle Duel Backend

This is the backend for Doodle Duel, a real-time multiplayer drawing game with AI scoring. It consists of two services that run together:

- **Node.js Server** (`apps/server`) — manages players, rooms, and real-time events via Socket.IO.
- **FastAPI ML Server** (`apps/ml_server`) — evaluates submitted doodles using AI and returns scores.
- **ngrok tunnel** — bridges the ML server to the Node backend in local development.

## Fronend repo and screenshots
For screenshots, gameplay flow, and a visual walkthrough, see the frontend repo: 
https://github.com/lswinny/doodle-duel-fe-2.0

## AI Judge (Experimental)

This project includes an AI-based image judge. In practice, the model does not currently produce accurate results, but it was valuable to experiment with integrating AI into the workflow. The feature is kept in the repo to demonstrate exploration of AI-driven scoring and sanitisation.

##  Tech Stack

- Node.js – backend runtime  
- Express – web framework  
- Socket.IO – real‑time events  
- Python – ML service runtime  
- FastAPI – ML server framework  
- ngrok – local tunneling  
- GitHub Actions – CI/CD  
- Bash – helper scripts

## Folder Structure

Backend/ 
├── README.md # General backend overview 
├── README-ML-Server.md # ML server specific notes 
├── apps/ 
│ ├── server/  -   Node.js + Socket.IO backend 
│ │ ├── app.js    -   Express app setup
│ │ ├── server.js    -   Entry point
│ │ ├── controllers/    -   Route handlers 
│ │ ├── middleware/  -   Express middleware 
│ │ ├── socket-handlers.js   -  Socket.IO event logic
│ │ ├── roomManager.js  -  Room state management
│ │ └── utils/    -   Helper functions 
│ ├── ml_server/  -   FastAPI ML server 
│ │ ├── main.py   -  FastAPI app entry point
│ │ └── requirements.txt   -  Python dependencies
│ └── shared/
│ └── prompts.json   -   AI scoring prompts 
├── start-dev.sh  -   Helper script to run ML + ngrok + Node 
├── install-all.cjs  -   Install helper 
├── workflows/ci.yml    -   CI pipeline 
└── package.json  -   Root dependencies

---

# Development Setup: FastAPI ML Server + ngrok + Node Backend

This guide explains how to set up and run the ML server, ngrok tunnel, and Node backend together. It’s designed for those who fork this project and want a reproducible local environment.

## Prerequisites

- **Python 3.10+** installed
- **Node.js 18+** installed
- **ngrok** installed (sign up at [ngrok.com](https://ngrok.com) and download the CLI)
- A working **virtual environment** (`.venv`) for Python, located in apps/ml_server/.venv.
Activate it before running the ML server.

---

## Installation

1. **Clone your fork**

```bash
   git clone <your-fork-url>
   cd new-doodle-duel/Backend
```

2. **Python Setup**

```bash
cd apps/ml_server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. **Node Setup**

```bash
cd apps/server
npm install
```

4. **NGrok Setup**
- Sign up on ngrok.com
- Install ngrok CLI
- Authenticate with your account: 

```bash 
   ngrok config add-authtoken <your-token>
```

# Running Manually (for debugging, see Helper Script section below for quicker method)
Open three terminals:

1. **FastAPI ML server**

``` bash
source apps/ml_server/.venv/bin/activate
uvicorn apps.ml_server.main:app --port 8000 --reload
```

2. **ngrok tunnel**

```bash
ngrok http 8000
```

Copy the generated URL (e.g. https://abcd1234.ngrok-free.dev).

3. **Node backend**
- Update .env with the ngrok URL: 

AI_SERVER_URL=https://abcd1234.ngrok-free.dev

- Then run: 

```bash
node apps/server/server.js
```

##  Helper Script: Running with 'start-dev.sh' (using just one terminal)
Use a helper script that automates all three steps (copy and paste the code at the bottom of this MD file into your own start-dev.sh file, which belongs in the backend repo root).

1. Make it executable

```bash
chmod +x start-dev.sh
```

2. Run it: Two options

```bash
./start-dev.sh
OR
npm run be
```

3. What it does
- Activates the Python venv and starts FastAPI ML server
- Starts ngrok (or reuses an existing tunnel)
- Fetches the ngrok public URL and writes it into .env
- Starts the Node backend
- Cleans up all processes on CTRL+C

You’ll see logs like:

Uvicorn running on http://127.0.0.1:8000
Updated .env with https://abcd1234.ngrok-free.dev
Server running on http://localhost:3000
Press CTRL+C to stop everything. The script will clean up all processes.

## Notes & Best Practices
Do not hardcode ngrok URLs in .env. They change each time unless you have a paid reserved domain. The script updates .env automatically.

Add .env to `.gitignore so each developer can have their own local tunnel.

If you see ERR_NGROK_334 (endpoint already online), it means ngrok was already running. Kill it with the command below and then rerun the script:

```bash
pkill -f ngrok
```

For production, deploy FastAPI to a real host instead of ngrok.

## Quick Recap
Manual mode → 3 terminals (uvicorn, ngrok, Node).

Script mode → 1 terminal (./start-dev.sh) does it all.

.env is dynamically updated with the current ngrok URL.