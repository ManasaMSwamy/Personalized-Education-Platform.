// ── Offline NLP Service ─────────────────────────────────────────────────────
// Zero network calls. All processing is local.

export interface OfflineMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  lang?: string;
}

export interface DocChunk {
  text: string;
  score: number;
}

// ── IndexedDB helpers ────────────────────────────────────────────────────────
const DB_NAME = 'offline_chatbot';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('messages'))
        db.createObjectStore('messages', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('documents'))
        db.createObjectStore('documents', { keyPath: 'name' });
      if (!db.objectStoreNames.contains('profile'))
        db.createObjectStore('profile', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMessage(msg: OfflineMessage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    tx.objectStore('messages').put(msg);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadMessages(): Promise<OfflineMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const req = tx.objectStore('messages').getAll();
    req.onsuccess = () => resolve((req.result as OfflineMessage[]).sort((a, b) => a.timestamp - b.timestamp));
    req.onerror = () => reject(req.error);
  });
}

export async function clearMessages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    tx.objectStore('messages').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDocument(name: string, text: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').put({ name, text, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDocuments(): Promise<{ name: string; text: string }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const req = tx.objectStore('documents').getAll();
    req.onsuccess = () => resolve(req.result as { name: string; text: string }[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocument(name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').delete(name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveProfile(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile', 'readwrite');
    tx.objectStore('profile').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadProfile(): Promise<Record<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile', 'readonly');
    const req = tx.objectStore('profile').getAll();
    req.onsuccess = () => {
      const result: Record<string, string> = {};
      (req.result as { key: string; value: string }[]).forEach(r => { result[r.key] = r.value; });
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── TF-IDF document search ───────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function tfidf(query: string, chunks: string[]): DocChunk[] {
  const qTokens = new Set(tokenize(query));
  const df: Record<string, number> = {};
  chunks.forEach(c => {
    new Set(tokenize(c)).forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  const N = chunks.length;
  return chunks.map(text => {
    const tokens = tokenize(text);
    const tf: Record<string, number> = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    let score = 0;
    qTokens.forEach(qt => {
      if (tf[qt]) {
        const idf = Math.log((N + 1) / ((df[qt] || 0) + 1));
        score += (tf[qt] / tokens.length) * idf;
      }
    });
    return { text, score };
  }).sort((a, b) => b.score - a.score);
}

export function searchDocument(query: string, docText: string, topK = 3): string {
  if (!docText.trim()) return '';
  const words = docText.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 250) chunks.push(words.slice(i, i + 300).join(' '));
  const ranked = tfidf(query, chunks).slice(0, topK);
  return ranked.filter(r => r.score > 0).map(r => r.text).join('\n\n');
}

// ── Intent detection ─────────────────────────────────────────────────────────
type Intent =
  | 'greeting' | 'farewell' | 'thanks' | 'help'
  | 'define' | 'explain' | 'summarize' | 'quiz'
  | 'joke' | 'time' | 'date' | 'name' | 'doc_query'
  | 'math' | 'translate' | 'unknown';

const INTENT_PATTERNS: [Intent, RegExp][] = [
  ['greeting',  /^(hi|hello|hey|hola|bonjour|namaste|salut|ciao|hallo|ola|konnichiwa|annyeong)\b/i],
  ['farewell',  /\b(bye|goodbye|see you|adios|au revoir|ciao|tschüss|sayonara)\b/i],
  ['thanks',    /\b(thanks|thank you|merci|gracias|danke|grazie|dhanyavaad|arigato)\b/i],
  ['help',      /\b(help|what can you do|capabilities|features|commands)\b/i],
  ['define',    /\b(define|what is|what are|meaning of|definition)\b/i],
  ['explain',   /\b(explain|how does|how do|describe|tell me about)\b/i],
  ['summarize', /\b(summarize|summary|brief|overview|tldr|tl;dr)\b/i],
  ['quiz',      /\b(quiz|test me|question|ask me)\b/i],
  ['joke',      /\b(joke|funny|laugh|humor|humour)\b/i],
  ['time',      /\b(time|what time)\b/i],
  ['date',      /\b(date|today|what day|what's today)\b/i],
  ['name',      /\b(your name|who are you|what are you|are you ai)\b/i],
  ['math',      /[\d\s]+[\+\-\*\/\^%][\d\s]+|calculate|compute|solve|math/i],
  ['translate', /\b(translate|in (spanish|french|german|hindi|japanese|arabic|chinese|portuguese|italian|korean))\b/i],
];

export function detectIntent(text: string): Intent {
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(text)) return intent;
  }
  return 'unknown';
}

// ── Safe math evaluator ──────────────────────────────────────────────────────
function safeMath(expr: string): string | null {
  try {
    const clean = expr.replace(/[^0-9+\-*/().\s^%]/g, '').replace(/\^/g, '**');
    if (!clean.trim()) return null;
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${clean})`)();
    if (typeof result === 'number' && isFinite(result)) return String(Math.round(result * 1e10) / 1e10);
    return null;
  } catch { return null; }
}

// ── Multilingual responses ───────────────────────────────────────────────────
const LANG_GREETINGS: Record<string, string> = {
  hola: 'es', bonjour: 'fr', salut: 'fr', namaste: 'hi',
  ciao: 'it', hallo: 'de', ola: 'pt', konnichiwa: 'ja',
  annyeong: 'ko',
};

export function detectLang(text: string): string {
  const lower = text.toLowerCase().trim().split(/\s+/)[0];
  return LANG_GREETINGS[lower] || 'en';
}

const GREETINGS_BY_LANG: Record<string, string> = {
  en: "Hello! I'm your offline AI assistant. I work completely without internet. How can I help you?",
  es: "¡Hola! Soy tu asistente de IA sin conexión. ¿En qué puedo ayudarte?",
  fr: "Bonjour! Je suis votre assistant IA hors ligne. Comment puis-je vous aider?",
  hi: "नमस्ते! मैं आपका ऑफलाइन AI सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
  it: "Ciao! Sono il tuo assistente AI offline. Come posso aiutarti?",
  de: "Hallo! Ich bin Ihr Offline-KI-Assistent. Wie kann ich Ihnen helfen?",
  pt: "Olá! Sou seu assistente de IA offline. Como posso ajudá-lo?",
  ja: "こんにちは！私はオフラインAIアシスタントです。どのようにお手伝いできますか？",
  ko: "안녕하세요! 저는 오프라인 AI 어시스턴트입니다. 어떻게 도와드릴까요?",
};

// ── Knowledge base ───────────────────────────────────────────────────────────
const KB: Record<string, string> = {
  photosynthesis: 'Photosynthesis is the process by which green plants use sunlight, water, and CO₂ to produce glucose and oxygen. Formula: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.',
  gravity: "Gravity is a fundamental force that attracts objects with mass toward each other. On Earth, g ≈ 9.8 m/s². Described by Newton's law: F = Gm₁m₂/r².",
  dna: 'DNA (Deoxyribonucleic Acid) is a double-helix molecule that carries genetic information. It consists of four bases: Adenine, Thymine, Guanine, and Cytosine.',
  python: 'Python is a high-level, interpreted programming language known for its simple syntax. It supports OOP, functional, and procedural paradigms.',
  machine_learning: 'Machine Learning is a subset of AI where systems learn from data to improve performance without being explicitly programmed.',
  ai: 'Artificial Intelligence (AI) is the simulation of human intelligence in machines, enabling them to learn, reason, and solve problems.',
  internet: 'The Internet is a global network of interconnected computers that communicate using standardized protocols (TCP/IP).',
  climate_change: 'Climate change refers to long-term shifts in global temperatures and weather patterns, primarily caused by human activities like burning fossil fuels.',
  newton: "Newton's three laws of motion: 1) An object at rest stays at rest unless acted upon. 2) F = ma. 3) Every action has an equal and opposite reaction.",
  cell: 'A cell is the basic structural and functional unit of life. Prokaryotic cells lack a nucleus; eukaryotic cells have a membrane-bound nucleus.',
  osmosis: 'Osmosis is the movement of water molecules through a semipermeable membrane from a region of lower solute concentration to higher solute concentration.',
  evolution: 'Evolution is the change in heritable characteristics of biological populations over successive generations, driven by natural selection, mutation, and genetic drift.',
  relativity: "Einstein's theory of relativity: Special Relativity (1905) states the laws of physics are the same for all non-accelerating observers and the speed of light is constant. General Relativity (1915) describes gravity as the curvature of spacetime.",
  blockchain: 'Blockchain is a distributed ledger technology where data is stored in linked blocks, making it tamper-resistant. Used in cryptocurrencies like Bitcoin.',
  algorithm: 'An algorithm is a step-by-step procedure for solving a problem. Key properties: correctness, efficiency (time/space complexity), and termination.',
  mitosis: 'Mitosis is cell division producing two genetically identical daughter cells. Stages: Prophase, Metaphase, Anaphase, Telophase, Cytokinesis.',
  democracy: 'Democracy is a system of government where citizens exercise power by voting. Types include direct democracy and representative democracy.',
  photon: 'A photon is a quantum of electromagnetic radiation with no mass and no charge. It travels at the speed of light and carries energy E = hf (h = Planck constant, f = frequency).',
};

function searchKB(query: string): string | null {
  const q = query.toLowerCase();
  for (const [key, val] of Object.entries(KB)) {
    if (q.includes(key.replace('_', ' ')) || q.includes(key)) return val;
  }
  return null;
}

// ── Jokes ────────────────────────────────────────────────────────────────────
const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything! 😄",
  "I told my computer I needed a break. Now it won't stop sending me Kit-Kat ads. 🍫",
  "Why did the math book look so sad? Because it had too many problems. 📚",
  "What do you call a fish without eyes? A fsh! 🐟",
  "Why can't you trust an atom? They make up literally everything.",
  "I asked my offline AI a joke. It said: 'I don't need the internet to be funny!' 😂",
];

// ── Quiz generator ───────────────────────────────────────────────────────────
const QUIZZES = [
  { q: 'What is the powerhouse of the cell?', a: 'The mitochondria is the powerhouse of the cell — it produces ATP through cellular respiration.' },
  { q: 'What is the speed of light?', a: 'The speed of light in a vacuum is approximately 299,792,458 m/s (≈ 3 × 10⁸ m/s).' },
  { q: 'What is the chemical formula for water?', a: 'Water is H₂O — two hydrogen atoms bonded to one oxygen atom.' },
  { q: 'Who developed the theory of relativity?', a: 'Albert Einstein developed the theory of relativity (Special in 1905, General in 1915).' },
  { q: 'What is the largest planet in our solar system?', a: 'Jupiter is the largest planet, with a mass more than twice that of all other planets combined.' },
  { q: 'What does CPU stand for?', a: 'CPU stands for Central Processing Unit — the primary component of a computer that executes instructions.' },
  { q: 'What is the boiling point of water at sea level?', a: 'Water boils at 100°C (212°F) at standard atmospheric pressure (1 atm).' },
  { q: 'How many bones are in the adult human body?', a: 'The adult human body has 206 bones.' },
];

// ── Translation stubs ────────────────────────────────────────────────────────
const TRANSLATE_PHRASES: Record<string, Record<string, string>> = {
  hello:   { spanish: 'Hola', french: 'Bonjour', german: 'Hallo', hindi: 'नमस्ते', japanese: 'こんにちは', arabic: 'مرحبا', chinese: '你好', portuguese: 'Olá', italian: 'Ciao', korean: '안녕하세요' },
  thanks:  { spanish: 'Gracias', french: 'Merci', german: 'Danke', hindi: 'धन्यवाद', japanese: 'ありがとう', arabic: 'شكرا', chinese: '谢谢', portuguese: 'Obrigado', italian: 'Grazie', korean: '감사합니다' },
  goodbye: { spanish: 'Adiós', french: 'Au revoir', german: 'Auf Wiedersehen', hindi: 'अलविदा', japanese: 'さようなら', arabic: 'وداعا', chinese: '再见', portuguese: 'Adeus', italian: 'Arrivederci', korean: '안녕히 가세요' },
  yes:     { spanish: 'Sí', french: 'Oui', german: 'Ja', hindi: 'हाँ', japanese: 'はい', arabic: 'نعم', chinese: '是', portuguese: 'Sim', italian: 'Sì', korean: '네' },
  no:      { spanish: 'No', french: 'Non', german: 'Nein', hindi: 'नहीं', japanese: 'いいえ', arabic: 'لا', chinese: '不', portuguese: 'Não', italian: 'No', korean: '아니요' },
  please:  { spanish: 'Por favor', french: 'S\'il vous plaît', german: 'Bitte', hindi: 'कृपया', japanese: 'お願いします', arabic: 'من فضلك', chinese: '请', portuguese: 'Por favor', italian: 'Per favore', korean: '제발' },
  water:   { spanish: 'Agua', french: 'Eau', german: 'Wasser', hindi: 'पानी', japanese: '水', arabic: 'ماء', chinese: '水', portuguese: 'Água', italian: 'Acqua', korean: '물' },
  love:    { spanish: 'Amor', french: 'Amour', german: 'Liebe', hindi: 'प्यार', japanese: '愛', arabic: 'حب', chinese: '爱', portuguese: 'Amor', italian: 'Amore', korean: '사랑' },
};

function handleTranslate(text: string): string {
  const langMatch = text.match(/in (spanish|french|german|hindi|japanese|arabic|chinese|portuguese|italian|korean)/i);
  const lang = langMatch?.[1]?.toLowerCase();
  if (!lang) return "Please specify a language, e.g. 'translate hello in Spanish'.";
  const wordMatch = text.match(/translate\s+(\w+)/i);
  const word = wordMatch?.[1]?.toLowerCase();
  if (word && TRANSLATE_PHRASES[word]?.[lang]) {
    return `"${word}" in ${lang.charAt(0).toUpperCase() + lang.slice(1)} is: **${TRANSLATE_PHRASES[word][lang]}**`;
  }
  const available = Object.keys(TRANSLATE_PHRASES).join(', ');
  return `I can translate these words offline: ${available}.\nTry: "translate hello in Spanish" or "translate water in Japanese".`;
}

// ── Main response generator ──────────────────────────────────────────────────
let quizIndex = 0;

export function generateOfflineResponse(
  userText: string,
  docText: string,
  profile: Record<string, string>,
  history: OfflineMessage[]
): string {
  const intent = detectIntent(userText);
  const lang = detectLang(userText);
  const name = profile['name'] || '';

  // Extract name from intro
  const nameMatch = userText.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+)/i);
  if (nameMatch) {
    return `Nice to meet you, ${nameMatch[1]}! I'll remember your name across sessions. How can I help you today?`;
  }

  switch (intent) {
    case 'greeting':
      return (GREETINGS_BY_LANG[lang] || GREETINGS_BY_LANG['en']) + (name ? ` Welcome back, ${name}!` : '');

    case 'farewell':
      return name ? `Goodbye, ${name}! Come back anytime — I work offline, always here for you. 👋` : 'Goodbye! Come back anytime. 👋';

    case 'thanks':
      return "You're welcome! I'm always here to help — no internet needed. 😊";

    case 'name':
      return "I'm your Offline AI Assistant — a privacy-first chatbot that works completely without internet. I can answer questions, analyze documents, quiz you, translate words, solve math, and more!";

    case 'help':
      return `Here's what I can do offline:\n\n📄 **Document Q&A** — Upload a PDF/TXT and ask questions about it\n🧠 **Knowledge Base** — Science, math, history, tech, biology, physics, CS\n🔢 **Math** — Calculate expressions (e.g. "2 + 2 * 5" or "(100/5)^2")\n🌍 **Translate** — Words in 10 languages (hello, thanks, goodbye, yes, no, please, water, love)\n🎯 **Quiz** — 8 built-in knowledge questions\n😄 **Jokes** — Ask for a joke\n🕐 **Time & Date** — Current time and date\n💬 **Personalized Chat** — I remember your name across sessions\n🔒 **Privacy** — All data stored locally in IndexedDB\n\nAll processing is 100% local. No internet required!`;

    case 'time':
      return `The current time is **${new Date().toLocaleTimeString()}**.`;

    case 'date':
      return `Today is **${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**.`;

    case 'joke':
      return JOKES[Math.floor(Math.random() * JOKES.length)];

    case 'quiz': {
      const q = QUIZZES[quizIndex % QUIZZES.length];
      quizIndex++;
      return `**Quiz Question ${quizIndex}/${QUIZZES.length}:**\n\n${q.q}\n\n*(Think about it, then ask me to reveal the answer!)*\n\n||**Answer:** ${q.a}||`;
    }

    case 'math': {
      const result = safeMath(userText);
      if (result !== null) return `The result is: **${result}**`;
      return "I couldn't parse that math expression. Try something like: '15 * 4 + 7' or '(100 / 5) - 3' or '2^10'.";
    }

    case 'translate':
      return handleTranslate(userText);

    case 'define':
    case 'explain': {
      const kb = searchKB(userText);
      if (kb) return kb;
      if (docText) {
        const ctx = searchDocument(userText, docText);
        if (ctx) return `Based on your uploaded document:\n\n${ctx.slice(0, 600)}${ctx.length > 600 ? '...' : ''}`;
      }
      return `I don't have offline data for that specific topic. Try uploading a PDF or TXT document about it, and I'll answer from its content!`;
    }

    case 'summarize': {
      if (docText) {
        const words = docText.split(/\s+/);
        const preview = words.slice(0, 120).join(' ');
        return `**Document Summary (first ~120 words):**\n\n${preview}${words.length > 120 ? '...' : ''}\n\n*Ask specific questions for detailed answers from the full document.*`;
      }
      return "No document loaded. Upload a PDF or TXT file to get a summary!";
    }

    case 'doc_query':
    default: {
      const kb = searchKB(userText);
      if (kb) return kb;

      if (docText) {
        const ctx = searchDocument(userText, docText);
        if (ctx) return `From your document:\n\n${ctx.slice(0, 700)}${ctx.length > 700 ? '...' : ''}`;
      }

      const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
      if (lastAssistant && userText.split(' ').length <= 4) {
        return `Could you elaborate a bit more? I want to give you the most accurate offline answer. You can also upload a document for me to reference!`;
      }

      return `I'm running fully offline, so my knowledge is limited to built-in topics and uploaded documents.\n\n💡 **Try:**\n- Uploading a PDF/TXT about this topic\n- Asking about: photosynthesis, gravity, DNA, AI, Newton, evolution, relativity, blockchain\n- Typing "help" to see all my capabilities`;
    }
  }
}
