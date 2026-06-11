import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type QuestionType = 'mcq' | 'truefalse' | 'scenario';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface KPQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  topic: string;
  points: number;
}

export interface KPQuizConfig {
  topic: string;
  difficulty: Difficulty;
  count: number;
}

export async function generateKPQuiz(config: KPQuizConfig): Promise<KPQuestion[]> {
  const mcqCount = Math.ceil(config.count * 0.5);
  const tfCount = Math.floor(config.count * 0.25);
  const scenarioCount = config.count - mcqCount - tfCount;

  const pointsMap: Record<Difficulty, { mcq: number; truefalse: number; scenario: number }> = {
    Beginner:     { mcq: 10, truefalse: 5,  scenario: 15 },
    Intermediate: { mcq: 20, truefalse: 10, scenario: 30 },
    Advanced:     { mcq: 30, truefalse: 15, scenario: 50 },
  };
  const pts = pointsMap[config.difficulty];

  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Generate a quiz on "${config.topic}" at ${config.difficulty} level.
Return ONLY valid JSON array with exactly ${config.count} questions:
- ${mcqCount} MCQ questions (type: "mcq", 4 options)
- ${tfCount} True/False questions (type: "truefalse", options: ["True","False"])
- ${scenarioCount} Scenario-based questions (type: "scenario", 4 options, real-world situation)

Each question object:
{
  "id": "q1",
  "type": "mcq"|"truefalse"|"scenario",
  "question": "question text",
  "options": ["option0","option1","option2","option3"],
  "answer": 0,
  "explanation": "why this answer is correct (2-3 sentences)",
  "topic": "${config.topic}",
  "points": ${pts.mcq}
}

Points: mcq=${pts.mcq}, truefalse=${pts.truefalse}, scenario=${pts.scenario}
answer is the 0-based index of the correct option.
Make questions genuinely challenging for ${config.difficulty} level. Return ONLY the JSON array.`,
    }],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const raw = res.choices[0]?.message?.content ?? '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Failed to generate quiz. Please try again.');
  const questions: KPQuestion[] = JSON.parse(match[0]);
  return questions.map((q, i) => ({ ...q, id: `q${i + 1}` }));
}

export async function getWeakAreaRecommendations(
  wrongTopics: string[],
  mainTopic: string
): Promise<string[]> {
  if (wrongTopics.length === 0) return [];
  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `A student struggled with these sub-topics in "${mainTopic}": ${wrongTopics.join(', ')}.
Give 4 short, actionable improvement tips (1 sentence each).
Return ONLY a JSON array of 4 strings.`,
    }],
    temperature: 0.5,
    max_tokens: 400,
  });
  const raw = res.choices[0]?.message?.content ?? '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/);
  if (!match) return ['Review core concepts', 'Practice with examples', 'Watch tutorial videos', 'Take notes while studying'];
  try { return JSON.parse(match[0]); } catch { return ['Review core concepts', 'Practice with examples', 'Watch tutorial videos', 'Take notes while studying']; }
}
