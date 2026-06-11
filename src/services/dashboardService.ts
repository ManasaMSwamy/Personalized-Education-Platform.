import Groq from 'groq-sdk';
import { DashboardData, QuizResult, TopicStat, Achievement, StudyPlan } from '../types/dashboard';
import { createAdaptiveState } from './adaptiveService';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_message',   title: 'First Step',       description: 'Sent your first message',          icon: '🚀', unlockedAt: null },
  { id: 'ten_messages',    title: 'Curious Mind',      description: 'Sent 10 messages',                 icon: '💬', unlockedAt: null },
  { id: 'first_quiz',      title: 'Quiz Taker',        description: 'Completed your first quiz',        icon: '📝', unlockedAt: null },
  { id: 'perfect_score',   title: 'Perfect Score',     description: 'Scored 100% on a quiz',            icon: '🏆', unlockedAt: null },
  { id: 'streak_3',        title: 'On Fire',           description: '3-day study streak',               icon: '🔥', unlockedAt: null },
  { id: 'streak_7',        title: 'Week Warrior',      description: '7-day study streak',               icon: '⚡', unlockedAt: null },
  { id: 'five_topics',     title: 'Explorer',          description: 'Studied 5 different topics',       icon: '🗺️', unlockedAt: null },
  { id: 'ten_quizzes',     title: 'Quiz Master',       description: 'Completed 10 quizzes',             icon: '🎯', unlockedAt: null },
  { id: 'high_avg',        title: 'Scholar',           description: 'Maintained 80%+ average score',    icon: '🎓', unlockedAt: null },
  { id: 'study_plan',      title: 'Planner',           description: 'Generated your first study plan',  icon: '📅', unlockedAt: null },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function createDashboard(): DashboardData {
  return {
    quizResults: [],
    topicStats: [],
    studyStreak: 0,
    lastStudyDate: '',
    totalSessions: 1,
    totalMessages: 0,
    achievements: ALL_ACHIEVEMENTS.map(a => ({ ...a })),
    studyPlan: null,
    adaptive: createAdaptiveState(),
    emotionHistory: [],
  };
}

export function recordMessage(data: DashboardData): DashboardData {
  const today = todayStr();
  const streak = data.lastStudyDate === today
    ? data.studyStreak
    : data.lastStudyDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
      ? data.studyStreak + 1
      : 1;

  return checkAchievements({
    ...data,
    totalMessages: data.totalMessages + 1,
    studyStreak: streak,
    lastStudyDate: today,
  });
}

export function recordQuiz(data: DashboardData, result: QuizResult): DashboardData {
  const quizResults = [...data.quizResults, result];

  // Update topic stats
  const existing = data.topicStats.find(t => t.topic === result.topic);
  const topicStats: TopicStat[] = existing
    ? data.topicStats.map(t => t.topic === result.topic
        ? { ...t, sessions: t.sessions + 1, avgScore: Math.round((t.avgScore * t.sessions + result.score) / (t.sessions + 1)), lastSeen: result.timestamp }
        : t)
    : [...data.topicStats, { topic: result.topic, sessions: 1, avgScore: result.score, lastSeen: result.timestamp }];

  return checkAchievements({ ...data, quizResults, topicStats });
}

function checkAchievements(data: DashboardData): DashboardData {
  const now = Date.now();
  const achievements = data.achievements.map(a => {
    if (a.unlockedAt) return a;
    let unlock = false;
    switch (a.id) {
      case 'first_message':  unlock = data.totalMessages >= 1; break;
      case 'ten_messages':   unlock = data.totalMessages >= 10; break;
      case 'first_quiz':     unlock = data.quizResults.length >= 1; break;
      case 'perfect_score':  unlock = data.quizResults.some(q => q.score === 100); break;
      case 'streak_3':       unlock = data.studyStreak >= 3; break;
      case 'streak_7':       unlock = data.studyStreak >= 7; break;
      case 'five_topics':    unlock = data.topicStats.length >= 5; break;
      case 'ten_quizzes':    unlock = data.quizResults.length >= 10; break;
      case 'high_avg':       unlock = data.quizResults.length >= 3 &&
                               (data.quizResults.reduce((s, q) => s + q.score, 0) / data.quizResults.length) >= 80; break;
      case 'study_plan':     unlock = data.studyPlan !== null; break;
    }
    return unlock ? { ...a, unlockedAt: now } : a;
  });
  return { ...data, achievements };
}

export async function generateStudyPlan(data: DashboardData): Promise<StudyPlan> {
  const weak = data.topicStats.filter(t => t.avgScore < 60).map(t => t.topic);
  const strong = data.topicStats.filter(t => t.avgScore >= 80).map(t => t.topic);
  const recent = data.topicStats.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 3).map(t => t.topic);

  const prompt = `You are an expert academic study planner. Generate a personalized 7-day study plan.
Student stats:
- Total messages: ${data.totalMessages}
- Quiz results: ${data.quizResults.length} quizzes, avg score: ${data.quizResults.length ? Math.round(data.quizResults.reduce((s, q) => s + q.score, 0) / data.quizResults.length) : 'N/A'}%
- Weak topics (score < 60%): ${weak.join(', ') || 'none yet'}
- Strong topics (score >= 80%): ${strong.join(', ') || 'none yet'}
- Recently studied: ${recent.join(', ') || 'none yet'}
- Study streak: ${data.studyStreak} days

Return ONLY valid JSON in this exact format:
{
  "weeklyGoal": "one sentence goal",
  "days": [
    {"day": "Monday", "focus": "topic name", "tasks": ["task 1", "task 2", "task 3"]},
    {"day": "Tuesday", "focus": "topic name", "tasks": ["task 1", "task 2", "task 3"]},
    {"day": "Wednesday", "focus": "topic name", "tasks": ["task 1", "task 2", "task 3"]},
    {"day": "Thursday", "focus": "topic name", "tasks": ["task 1", "task 2", "task 3"]},
    {"day": "Friday", "focus": "topic name", "tasks": ["task 1", "task 2", "task 3"]},
    {"day": "Saturday", "focus": "topic name", "tasks": ["task 1", "task 2", "task 3"]},
    {"day": "Sunday", "focus": "Review & Rest", "tasks": ["task 1", "task 2"]}
  ],
  "tips": ["tip 1", "tip 2", "tip 3"]
}`;

  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 1200,
  });

  const text = res.choices[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = match ? JSON.parse(match[0]) : { weeklyGoal: 'Study consistently every day.', days: [], tips: [] };
  return { ...parsed, generatedAt: Date.now() };
}

export function getWeakTopics(data: DashboardData) {
  return data.topicStats.filter(t => t.avgScore < 60).sort((a, b) => a.avgScore - b.avgScore);
}

export function getStrongTopics(data: DashboardData) {
  return data.topicStats.filter(t => t.avgScore >= 75).sort((a, b) => b.avgScore - a.avgScore);
}

export function getOverallAvg(data: DashboardData) {
  if (!data.quizResults.length) return 0;
  return Math.round(data.quizResults.reduce((s, q) => s + q.score, 0) / data.quizResults.length);
}
