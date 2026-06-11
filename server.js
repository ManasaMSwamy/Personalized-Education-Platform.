// server.js — Local AI backend (Ollama proxy + offline support)
// Run: node server.js   (keep running alongside npm run dev)
import express from 'express';
import { createServer } from 'http';

const app = express();
app.use(express.json({ limit: '2mb' }));

// ── CORS for Vite dev server ──────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

const OLLAMA_BASE = 'http://127.0.0.1:11434';

// ── Check Ollama status ───────────────────────────────────────────
app.get('/api/ollama/status', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!r.ok) { res.json({ running: false, models: [] }); return; }
    const data = await r.json();
    const models = (data.models || []).map((m) => m.name);
    res.json({ running: true, models });
  } catch {
    res.json({ running: false, models: [] });
  }
});

// ── Chat via Ollama ───────────────────────────────────────────────
app.post('/api/ollama/chat', async (req, res) => {
  const { model = 'llama3.2', messages, stream = false } = req.body;
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) {
      const err = await r.text();
      res.status(r.status).json({ error: err });
      return;
    }
    const data = await r.json();
    res.json({ content: data.message?.content || '' });
  } catch (e) {
    res.status(503).json({ error: `Ollama unreachable: ${e.message}` });
  }
});

// ── List available Ollama models ──────────────────────────────────
app.get('/api/ollama/models', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    const data = await r.json();
    res.json({ models: (data.models || []).map((m) => m.name) });
  } catch {
    res.json({ models: [] });
  }
});

const PORT = 3001;
createServer(app).listen(PORT, () => {
  console.log(`\n🤖 Local AI Backend running at http://localhost:${PORT}`);
  console.log(`   Ollama proxy → ${OLLAMA_BASE}`);
  console.log(`   Make sure Ollama is running: ollama serve`);
  console.log(`   Pull a model first: ollama pull llama3.2\n`);
});
