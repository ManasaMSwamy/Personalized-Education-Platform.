import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

export interface ImageAnalysis {
  subject: string;
  subjectEmoji: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  funFact: string;
  explanation: string;
  keyPoints: string[];
  quiz: QuizQuestion[];
}

export async function analyzeUploadedImage(
  base64: string,
  mimeType: string,
  language: string
): Promise<ImageAnalysis> {
  const langNote = language !== 'English' ? `Respond entirely in ${language}.` : '';
  const res = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        {
          type: 'text',
          text: `You are an educational AI. Analyze this image and return ONLY valid JSON. ${langNote}
Detect if it contains: math equations, science diagrams, charts/graphs, handwritten notes, plants/biology, lab equipment, maps, code, circuits, or any educational content.
Return:
{
  "subject": "subject name (e.g. Mathematics, Biology, Physics, Chemistry, Geography, Computer Science, History)",
  "subjectEmoji": "one relevant emoji",
  "difficulty": "Beginner" or "Intermediate" or "Advanced",
  "funFact": "one surprising fun fact about this topic (1-2 sentences)",
  "explanation": "detailed markdown explanation of what is shown (use **bold**, bullet points, headings)",
  "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
  "quiz": [
    {"question": "...", "options": ["A", "B", "C", "D"], "answer": 0},
    {"question": "...", "options": ["A", "B", "C", "D"], "answer": 1},
    {"question": "...", "options": ["A", "B", "C", "D"], "answer": 2},
    {"question": "...", "options": ["A", "B", "C", "D"], "answer": 0},
    {"question": "...", "options": ["A", "B", "C", "D"], "answer": 3}
  ]
}`,
        },
      ],
    }],
    temperature: 0.4,
    max_tokens: 2000,
  } as any);

  const raw = res.choices[0]?.message?.content ?? '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not analyze image. Please try again.');
  return JSON.parse(match[0]) as ImageAnalysis;
}

export interface VisionAnalysis {
  objectDetected: string;
  whatIsIt: string;
  howItWorks: string;
  realWorldApplications: string[];
  interestingFacts: string[];
  suggestedQuestions: string[];
}

export async function analyzeImageWithAI(base64: string, mimeType: string): Promise<VisionAnalysis> {
  const res = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: `Analyze this image as an educational AI tutor. Return ONLY valid JSON:
{
  "objectDetected": "name of main object/concept",
  "whatIsIt": "2-3 sentence explanation of what it is",
  "howItWorks": "step by step explanation, each step on new line",
  "realWorldApplications": ["application 1", "application 2", "application 3"],
  "interestingFacts": ["fact 1", "fact 2", "fact 3"],
  "suggestedQuestions": ["question 1?", "question 2?", "question 3?"]
}`,
          },
        ],
      },
    ],
    temperature: 0.4,
    max_tokens: 1000,
  } as any);

  const raw = res.choices[0]?.message?.content ?? '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not analyze image. Please try again.');
  return JSON.parse(match[0]) as VisionAnalysis;
}

export async function generateLearningPlan(topic: string): Promise<string[]> {
  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Create a 5-step learning plan for a student to learn about "${topic}".
Return ONLY a JSON array of 5 strings, each a clear actionable step.
Example: ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ...", "Step 5: ..."]`,
    }],
    temperature: 0.5,
    max_tokens: 400,
  });

  const raw = res.choices[0]?.message?.content ?? '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/);
  if (!match) return [`Study the basics of ${topic}`, `Practice with examples`, `Apply in real scenarios`, `Test your knowledge`, `Review and revise`];
  try { return JSON.parse(match[0]); } catch { return [`Study the basics of ${topic}`, `Practice with examples`, `Apply in real scenarios`, `Test your knowledge`, `Review and revise`]; }
}
