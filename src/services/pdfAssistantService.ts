import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = 'llama-3.3-70b-versatile';

async function ask(prompt: string, maxTokens = 1500): Promise<string> {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: maxTokens,
  });
  const content = res.choices[0]?.message?.content ?? '';
  if (!content.trim()) throw new Error('Empty response from AI model.');
  return content;
}

export async function generateSummary(text: string): Promise<string> {
  const doc = text.slice(0, 8000);
  return ask(
    `Summarize the following document in 3-5 clear paragraphs. Focus on the main topic, key arguments, and conclusions. Write in plain English.\n\nDocument:\n${doc}`,
    800
  );
}

export async function generateHighlights(text: string): Promise<string[]> {
  const doc = text.slice(0, 8000);
  const raw = await ask(
    `Extract the 8 most important key points from this document.\nReturn ONLY a JSON array of strings. No markdown, no explanation, no code block.\nExample output: ["Point one here.", "Point two here."]\n\nDocument:\n${doc}`,
    600
  );
  // Strip any markdown code fences if model adds them
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  // Fallback: split by newlines
  return cleaned
    .split('\n')
    .map(l => l.replace(/^[-*\d.)\s"]+/, '').replace(/[",]+$/, '').trim())
    .filter(l => l.length > 10)
    .slice(0, 8);
}

export interface MCQ {
  question: string;
  options: string[];
  answer: string;
}

export async function generateMCQs(text: string): Promise<MCQ[]> {
  const doc = text.slice(0, 8000);
  const raw = await ask(
    `Generate exactly 5 multiple choice questions from this document.\nReturn ONLY a valid JSON array. No markdown, no explanation.\nFormat: [{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A) ..."}]\n\nDocument:\n${doc}`,
    900
  );
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return [];
}

export interface ShortQuestion {
  question: string;
  answer: string;
}

export async function generateShortQuestions(text: string): Promise<ShortQuestion[]> {
  const doc = text.slice(0, 8000);
  const raw = await ask(
    `Generate exactly 5 short answer questions with concise answers from this document.\nReturn ONLY a valid JSON array. No markdown, no explanation.\nFormat: [{"question":"...","answer":"..."}]\n\nDocument:\n${doc}`,
    700
  );
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return [];
}

export async function answerDoubt(text: string, question: string): Promise<string> {
  const doc = text.slice(0, 8000);
  return ask(
    `You are a helpful academic tutor. Answer the student's question using ONLY the provided document as your source. Be clear, accurate, and educational. If the answer is not in the document, say so explicitly.\n\nDocument:\n${doc}\n\nStudent Question: ${question}`,
    600
  );
}
