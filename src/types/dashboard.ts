export interface QuizResult {
  topic: string;
  score: number;
  total: number;
  correct: number;
  timestamp: number;
}

export interface TopicStat {
  topic: string;
  sessions: number;
  avgScore: number;
  lastSeen: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
}

export interface StudyPlan {
  generatedAt: number;
  weeklyGoal: string;
  days: { day: string; tasks: string[]; focus: string }[];
  tips: string[];
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearningPattern {
  avgResponseTime: number;
  consistencyScore: number;   // 0-100: how regularly they study
  improvementRate: number;    // positive = improving, negative = declining
  preferredTopics: string[];
  strugglingTopics: string[];
  quizAccuracyTrend: number[]; // last 10 scores
}

export interface TopicRecommendation {
  topic: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  type: 'revise' | 'practice' | 'explore' | 'master';
}

export interface AdaptiveState {
  currentDifficulty: DifficultyLevel;
  pattern: LearningPattern;
  recommendations: TopicRecommendation[];
  aiInsights: string[];
  lastAnalyzed: number;
}

export type EmotionType = 'confident' | 'confused' | 'frustrated' | 'curious' | 'bored' | 'neutral';

export interface EmotionEvent {
  emotion: EmotionType;
  confidence: number;   // 0-1 how sure the detector is
  message: string;      // the user message that triggered it
  timestamp: number;
}

export interface DashboardData {
  quizResults: QuizResult[];
  topicStats: TopicStat[];
  studyStreak: number;
  lastStudyDate: string;
  totalSessions: number;
  totalMessages: number;
  achievements: Achievement[];
  studyPlan: StudyPlan | null;
  adaptive: AdaptiveState;
  emotionHistory: EmotionEvent[];
  emotionAccuracy: number;
  correctEmotionPredictions: number;
  totalEmotionPredictions: number;
  activeModel: string;
}
