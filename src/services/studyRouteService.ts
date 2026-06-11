import Groq from 'groq-sdk';
import { DashboardData } from '../types/dashboard';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type StepStatus = 'locked' | 'active' | 'completed' | 'skipped';
export type StepType = 'learn' | 'practice' | 'revise' | 'challenge' | 'milestone';

export interface RouteStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  topic: string;
  estimatedMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  xpReward: number;
  status: StepStatus;
  tasks: string[];
  resources: string[];
  completedAt?: number;
  score?: number;
}

export interface RouteMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredSteps: number;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface StudyRoute {
  id: string;
  generatedAt: number;
  userName: string;
  overallGoal: string;
  totalXP: number;
  earnedXP: number;
  currentStepIndex: number;
  completionPercent: number;
  steps: RouteStep[];
  milestones: RouteMilestone[];
  weakAreas: string[];
  strongAreas: string[];
  aiSummary: string;
  revisionSchedule: { day: string; topic: string; reason: string }[];
  nextReviewDate: string;
}

export interface RouteGenerationInput {
  userName: string;
  customTopic?: string;
  data: DashboardData;
}

export async function generateStudyRoute(input: RouteGenerationInput): Promise<StudyRoute> {
  const { data, userName, customTopic } = input;

  const weakTopics = data.topicStats.filter(t => t.avgScore < 60).sort((a, b) => a.avgScore - b.avgScore);
  const mediumTopics = data.topicStats.filter(t => t.avgScore >= 60 && t.avgScore < 80);
  const strongTopics = data.topicStats.filter(t => t.avgScore >= 80);
  const avgScore = data.quizResults.length
    ? Math.round(data.quizResults.reduce((s, q) => s + q.score, 0) / data.quizResults.length)
    : 0;
  const recentTopics = data.topicStats.slice(-3).map(t => t.topic);

  const prompt = `You are an expert adaptive learning AI. Generate a personalized Study Route for a student.

Student Profile:
- Name: ${userName}
- Overall avg score: ${avgScore}%
- Study streak: ${data.studyStreak} days
- Total quizzes taken: ${data.quizResults.length}
- Weak topics (score < 60%): ${weakTopics.map(t => `${t.topic}(${t.avgScore}%)`).join(', ') || 'none yet'}
- Medium topics (60-80%): ${mediumTopics.map(t => `${t.topic}(${t.avgScore}%)`).join(', ') || 'none yet'}
- Strong topics (>80%): ${strongTopics.map(t => `${t.topic}(${t.avgScore}%)`).join(', ') || 'none yet'}
- Recently studied: ${recentTopics.join(', ') || 'none yet'}
${customTopic ? `- Requested focus topic: ${customTopic}` : ''}

Generate a Study Route with exactly 8 steps. Steps must follow this priority order:
1. Revise the weakest topics first (type: "revise")
2. Practice medium topics (type: "practice")
3. Learn new related topics (type: "learn")
4. Challenge steps for strong topics (type: "challenge")
5. Include 1-2 milestone steps (type: "milestone") at steps 4 and 8

Return ONLY valid JSON in this exact format:
{
  "overallGoal": "one sentence personalized learning goal for this student",
  "aiSummary": "2-3 sentence analysis of the student's learning pattern and what this route will achieve",
  "weakAreas": ["topic1", "topic2", "topic3"],
  "strongAreas": ["topic1", "topic2"],
  "steps": [
    {
      "id": "s1",
      "type": "revise",
      "title": "Step title (5-7 words)",
      "description": "What the student will do in this step (1-2 sentences)",
      "topic": "specific topic name",
      "estimatedMinutes": 25,
      "difficulty": "Beginner",
      "xpReward": 50,
      "tasks": ["specific task 1", "specific task 2", "specific task 3"],
      "resources": ["resource suggestion 1", "resource suggestion 2"]
    }
  ],
  "milestones": [
    {
      "id": "m1",
      "title": "Milestone title",
      "description": "What this milestone represents",
      "icon": "🏆",
      "requiredSteps": 4,
      "xpReward": 200
    },
    {
      "id": "m2",
      "title": "Route Complete",
      "description": "Completed the full personalized study route",
      "icon": "🎓",
      "requiredSteps": 8,
      "xpReward": 500
    }
  ],
  "revisionSchedule": [
    {"day": "Monday", "topic": "topic name", "reason": "why this day"},
    {"day": "Wednesday", "topic": "topic name", "reason": "why this day"},
    {"day": "Friday", "topic": "topic name", "reason": "why this day"},
    {"day": "Sunday", "topic": "Review all weak areas", "reason": "weekly consolidation"}
  ]
}

Make steps genuinely personalized. If no quiz data exists, create a beginner-friendly route on ${customTopic || 'general computer science and programming fundamentals'}.`;

  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.65,
    max_tokens: 3000,
  });

  const raw = res.choices[0]?.message?.content ?? '';
  const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to generate study route. Please try again.');

  const parsed = JSON.parse(match[0]);

  const totalXP = parsed.steps.reduce((s: number, st: RouteStep) => s + (st.xpReward || 50), 0)
    + parsed.milestones.reduce((s: number, m: RouteMilestone) => s + (m.xpReward || 200), 0);

  const steps: RouteStep[] = parsed.steps.map((s: RouteStep, i: number) => ({
    ...s,
    status: i === 0 ? 'active' : 'locked',
    xpReward: s.xpReward || 50,
    estimatedMinutes: s.estimatedMinutes || 20,
  }));

  const milestones: RouteMilestone[] = parsed.milestones.map((m: RouteMilestone) => ({
    ...m,
    unlocked: false,
    xpReward: m.xpReward || 200,
  }));

  const today = new Date();
  const nextReview = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

  return {
    id: `route_${Date.now()}`,
    generatedAt: Date.now(),
    userName,
    overallGoal: parsed.overallGoal,
    totalXP,
    earnedXP: 0,
    currentStepIndex: 0,
    completionPercent: 0,
    steps,
    milestones,
    weakAreas: parsed.weakAreas || [],
    strongAreas: parsed.strongAreas || [],
    aiSummary: parsed.aiSummary,
    revisionSchedule: parsed.revisionSchedule || [],
    nextReviewDate: nextReview.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
  };
}

export function completeRouteStep(
  route: StudyRoute,
  stepId: string,
  score: number
): StudyRoute {
  const stepIndex = route.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return route;

  const xpEarned = Math.round(route.steps[stepIndex].xpReward * (score / 100));

  const steps = route.steps.map((s, i) => {
    if (s.id === stepId) return { ...s, status: 'completed' as StepStatus, completedAt: Date.now(), score };
    if (i === stepIndex + 1) return { ...s, status: 'active' as StepStatus };
    return s;
  });

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const completionPercent = Math.round((completedCount / steps.length) * 100);
  const earnedXP = route.earnedXP + xpEarned;
  const currentStepIndex = Math.min(stepIndex + 1, steps.length - 1);

  const milestones = route.milestones.map(m => ({
    ...m,
    unlocked: m.unlocked || completedCount >= m.requiredSteps,
    unlockedAt: !m.unlocked && completedCount >= m.requiredSteps ? Date.now() : m.unlockedAt,
  }));

  return { ...route, steps, milestones, completionPercent, earnedXP, currentStepIndex };
}

export function skipRouteStep(route: StudyRoute, stepId: string): StudyRoute {
  const stepIndex = route.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return route;

  const steps = route.steps.map((s, i) => {
    if (s.id === stepId) return { ...s, status: 'skipped' as StepStatus };
    if (i === stepIndex + 1) return { ...s, status: 'active' as StepStatus };
    return s;
  });

  const completedCount = steps.filter(s => s.status === 'completed').length;
  return { ...route, steps, currentStepIndex: stepIndex + 1, completionPercent: Math.round((completedCount / steps.length) * 100) };
}
