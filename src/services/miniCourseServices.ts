import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface CourseQuiz {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  quiz: CourseQuiz;
}

export interface MiniCourse {
  id: string;
  topic: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  lessons: Lesson[];
  createdAt: number;
}

export interface CourseProgress {
  courseId: string;
  completedLessons: string[];   // lesson ids
  quizScores: Record<string, number>; // lessonId -> score (0 or 100)
  startedAt: number;
  completedAt?: number;
}

export async function generateMiniCourse(topic: string, level: MiniCourse['level'] = 'Beginner'): Promise<MiniCourse> {
  const prompt = `You are an expert academic course designer. Create a structured mini course.
Topic: "${topic}"
Level: ${level}

Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "Full course title",
  "description": "2-sentence course description",
  "estimatedTime": "e.g. 45 minutes",
  "lessons": [
    {
      "title": "Lesson title",
      "content": "3-4 paragraph detailed lesson content explaining the concept clearly",
      "keyPoints": ["key point 1", "key point 2", "key point 3"],
      "quiz": {
        "question": "Quiz question testing this lesson",
        "options": ["A) option", "B) option", "C) option", "D) option"],
        "answer": "A) option",
        "explanation": "Why this answer is correct"
      }
    }
  ]
}

Generate exactly 4 lessons. Make content educational, clear, and academically appropriate for ${level} level.`;

  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 3000,
  });

  const raw = res.choices[0]?.message?.content ?? '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse course');

  const parsed = JSON.parse(match[0]);
  const id = `course_${Date.now()}`;

  return {
    id,
    topic,
    title: parsed.title,
    description: parsed.description,
    level,
    estimatedTime: parsed.estimatedTime,
    lessons: (parsed.lessons as any[]).map((l, i) => ({
      id: `${id}_lesson_${i}`,
      title: l.title,
      content: l.content,
      keyPoints: l.keyPoints ?? [],
      quiz: l.quiz,
    })),
    createdAt: Date.now(),
  };
}

export function calcCourseScore(course: MiniCourse, progress: CourseProgress): number {
  if (!course.lessons.length) return 0;
  const scores = course.lessons.map(l => progress.quizScores[l.id] ?? 0);
  return Math.round(scores.reduce((a, b) => a + b, 0) / course.lessons.length);
}

export function isCourseComplete(course: MiniCourse, progress: CourseProgress): boolean {
  return course.lessons.every(l => progress.completedLessons.includes(l.id));
}
