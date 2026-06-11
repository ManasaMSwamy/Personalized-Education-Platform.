import Groq from 'groq-sdk';
import {
  DashboardData, AdaptiveState, DifficultyLevel,
  LearningPattern, TopicRecommendation,
} from '../types/dashboard';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export function createAdaptiveState(): AdaptiveState {
  return {
    currentDifficulty: 'beginner',
    pattern: {
      avgResponseTime: 0,
      consistencyScore: 0,
      improvementRate: 0,
      preferredTopics: [],
      strugglingTopics: [],
      quizAccuracyTrend: [],
    },
    recommendations: [],
    aiInsights: [],
    lastAnalyzed: 0,
  };
}

// ── Difficulty engine ─────────────────────────────────────────────
export function computeDifficulty(data: DashboardData): DifficultyLevel {
  const { quizResults } = data;
  if (quizResults.length < 2) return 'beginner';
  const avg = quizResults.reduce((s, q) => s + q.score, 0) / quizResults.length;
  const last3 = quizResults.slice(-3).reduce((s, q) => s + q.score, 0) / Math.min(3, quizResults.length);
  // Promote if recent avg is high, demote if low
  if (last3 >= 80 && avg >= 70) return 'advanced';
  if (last3 >= 60 || avg >= 55) return 'intermediate';
  return 'beginner';
}

// ── Pattern analysis ──────────────────────────────────────────────
export function analyzePatterns(data: DashboardData): LearningPattern {
  const { quizResults, topicStats, studyStreak } = data;

  const trend = quizResults.slice(-10).map(q => q.score);
  const improvementRate = trend.length >= 2
    ? trend[trend.length - 1] - trend[0]
    : 0;

  const consistencyScore = Math.min(100, studyStreak * 14 + (data.totalMessages > 0 ? 20 : 0));

  const preferredTopics = topicStats
    .filter(t => t.avgScore >= 70)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3)
    .map(t => t.topic);

  const strugglingTopics = topicStats
    .filter(t => t.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3)
    .map(t => t.topic);

  return {
    avgResponseTime: 0,
    consistencyScore,
    improvementRate,
    preferredTopics,
    strugglingTopics,
    quizAccuracyTrend: trend,
  };
}

// ── Topic recommendations ─────────────────────────────────────────
export function buildRecommendations(data: DashboardData): TopicRecommendation[] {
  const recs: TopicRecommendation[] = [];
  const { topicStats, quizResults } = data;

  // Revise weak topics first
  topicStats
    .filter(t => t.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 2)
    .forEach(t => recs.push({
      topic: t.topic,
      reason: `Score is ${t.avgScore}% — needs revision`,
      priority: 'high',
      estimatedTime: '30 min',
      type: 'revise',
    }));

  // Practice medium topics
  topicStats
    .filter(t => t.avgScore >= 60 && t.avgScore < 75)
    .slice(0, 2)
    .forEach(t => recs.push({
      topic: t.topic,
      reason: `Score is ${t.avgScore}% — practice to solidify`,
      priority: 'medium',
      estimatedTime: '20 min',
      type: 'practice',
    }));

  // Master strong topics
  topicStats
    .filter(t => t.avgScore >= 75)
    .slice(0, 1)
    .forEach(t => recs.push({
      topic: t.topic,
      reason: `Score is ${t.avgScore}% — push to mastery`,
      priority: 'low',
      estimatedTime: '15 min',
      type: 'master',
    }));

  // Suggest exploring new topics if few studied
  if (topicStats.length < 3) {
    recs.push({
      topic: 'New Topic',
      reason: 'Broaden your knowledge base',
      priority: 'low',
      estimatedTime: '25 min',
      type: 'explore',
    });
  }

  return recs;
}

// ── AI insights via Groq ──────────────────────────────────────────
export async function generateAIInsights(data: DashboardData): Promise<string[]> {
  const avg = data.quizResults.length
    ? Math.round(data.quizResults.reduce((s, q) => s + q.score, 0) / data.quizResults.length)
    : 0;
  const weak = data.topicStats.filter(t => t.avgScore < 60).map(t => `${t.topic}(${t.avgScore}%)`).join(', ');
  const strong = data.topicStats.filter(t => t.avgScore >= 75).map(t => `${t.topic}(${t.avgScore}%)`).join(', ');
  const trend = data.quizResults.slice(-5).map(q => q.score).join(', ');
  const difficulty = computeDifficulty(data);

  const prompt = `You are an expert adaptive learning AI. Analyze this student's performance and give 4 short, specific, actionable insights.

Student data:
- Overall avg score: ${avg}%
- Current difficulty level: ${difficulty}
- Study streak: ${data.studyStreak} days
- Total quizzes: ${data.quizResults.length}
- Weak topics: ${weak || 'none yet'}
- Strong topics: ${strong || 'none yet'}
- Recent score trend (last 5): ${trend || 'no data'}

Return ONLY a JSON array of 4 strings. Each string is one insight (max 15 words). No markdown.
Example: ["Focus on weak topics daily for 20 minutes.", "Your consistency is improving — keep the streak!"]`;

  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 300,
  });

  const text = res.choices[0]?.message?.content ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  try {
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return text.split('\n').filter(l => l.trim().length > 5).slice(0, 4);
  }
}

// ── Full adaptive refresh ─────────────────────────────────────────
export async function refreshAdaptive(data: DashboardData): Promise<AdaptiveState> {
  const pattern = analyzePatterns(data);
  const currentDifficulty = computeDifficulty(data);
  const recommendations = buildRecommendations(data);
  const aiInsights = await generateAIInsights(data);
  return { pattern, currentDifficulty, recommendations, aiInsights, lastAnalyzed: Date.now() };
}

// ── Quiz prompt builder (used by Chatbot) ─────────────────────────
export function buildAdaptiveQuizPrompt(topic: string, difficulty: DifficultyLevel): string {
  const config = {
    beginner:     { count: 3, style: 'simple, factual, multiple-choice with obvious wrong answers' },
    intermediate: { count: 4, style: 'conceptual, application-based, plausible distractors' },
    advanced:     { count: 5, style: 'analytical, multi-step reasoning, tricky edge cases' },
  }[difficulty];

  return `Generate a ${difficulty.toUpperCase()} level quiz on "${topic}".
${config.count} questions, style: ${config.style}.
Format each question clearly numbered. After all questions, show answers labeled "Answers:".
End with "Score: X out of ${config.count}" after the student answers.`;
}
