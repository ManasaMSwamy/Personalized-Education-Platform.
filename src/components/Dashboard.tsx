import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, Flame, Target, TrendingUp, TrendingDown, Brain,
  Calendar, Sparkles, CheckCircle2, Lock, BarChart2,
  BookOpen, Zap, RefreshCw, Star, Clock, Award,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardData, QuizResult, EmotionType } from '@/types/dashboard';
import {
  generateStudyPlan, getWeakTopics, getStrongTopics, getOverallAvg,
} from '@/services/dashboardService';
import { EMOTION_META } from '@/services/emotionService';

interface DashboardProps {
  data: DashboardData;
  onUpdate: (data: DashboardData) => void;
  userName: string;
}

// ── Mini bar chart ──────────────────────────────────────────────
function MiniBarChart({ results }: { results: QuizResult[] }) {
  const last8 = results.slice(-8);
  if (!last8.length) return (
    <div className="flex items-center justify-center h-20 text-slate-600 text-xs">No quiz data yet</div>
  );
  const max = 100;
  const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#818cf8'];
  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {last8.map((r, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[8px] text-slate-500">{r.score}%</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(r.score / max) * 56}px` }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
            className="w-full rounded-t-md"
            style={{ backgroundColor: colors[i % colors.length], minHeight: 4 }}
          />
          <span className="text-[7px] text-slate-600 truncate w-full text-center">{r.topic.slice(0, 6)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Radial progress ring ────────────────────────────────────────
function RadialProgress({ value, size = 80, stroke = 7, color = '#6366f1' }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ── Stat card ───────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-5 flex items-center gap-4 border-white/8"
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────
export function Dashboard({ data, onUpdate, userName }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'topics' | 'achievements' | 'plan' | 'emotions'>('overview');
  const [planLoading, setPlanLoading] = useState(false);

  const overallAvg = getOverallAvg(data);
  const weakTopics = getWeakTopics(data);
  const strongTopics = getStrongTopics(data);
  const unlockedCount = data.achievements.filter(a => a.unlockedAt).length;

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    try {
      const plan = await generateStudyPlan(data);
      const updated = { ...data, studyPlan: plan };
      // unlock study_plan achievement
      const achievements = updated.achievements.map(a =>
        a.id === 'study_plan' && !a.unlockedAt ? { ...a, unlockedAt: Date.now() } : a
      );
      onUpdate({ ...updated, achievements });
    } catch {
      // silently fail
    } finally {
      setPlanLoading(false);
    }
  };

  const sections = [
    { key: 'overview',      label: 'Overview',      icon: <BarChart2 size={13} /> },
    { key: 'topics',        label: 'Topics',         icon: <BookOpen size={13} /> },
    { key: 'achievements',  label: 'Achievements',   icon: <Trophy size={13} /> },
    { key: 'plan',          label: 'Study Plan',     icon: <Calendar size={13} /> },
    { key: 'emotions',      label: 'Emotions',       icon: <Sparkles size={13} /> },
  ] as const;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-black text-white tracking-tight"
            >
              Welcome back, <span className="text-gradient">{userName}</span> 👋
            </motion.h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Your personalized learning dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <Flame size={13} className="text-orange-400" />
              <span className="text-[11px] font-black text-orange-400">{data.studyStreak} day streak</span>
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mt-4 bg-white/5 border border-white/8 rounded-2xl p-1 w-fit">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                activeSection === s.key
                  ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {s.icon}{s.label}
            </button>
          ))}
        </div>
      </div>
     
      <ScrollArea className="flex-1">
        <div className="px-6 py-5 space-y-5">
          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ── */}
            {activeSection === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard icon={<Brain size={18} className="text-indigo-300" />}   label="Messages"   value={data.totalMessages}        sub="total interactions"  color="bg-indigo-500/20" />
                  <StatCard icon={<Target size={18} className="text-purple-300" />}  label="Quizzes"    value={data.quizResults.length}   sub="completed"           color="bg-purple-500/20" />
                  <StatCard icon={<Star size={18} className="text-yellow-300" />}    label="Avg Score"  value={`${overallAvg}%`}          sub="across all quizzes"  color="bg-yellow-500/20" />
                  <StatCard icon={<Award size={18} className="text-emerald-300" />}  label="Badges"     value={`${unlockedCount}/${data.achievements.length}`} sub="unlocked" color="bg-emerald-500/20" />
                </div>

                {/* Score ring + bar chart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Overall score ring */}
                  <div className="glass-panel rounded-2xl p-6 border-white/8 flex items-center gap-6">
                    <div className="relative shrink-0">
                      <RadialProgress
                        value={overallAvg}
                        size={100}
                        stroke={8}
                        color={overallAvg >= 75 ? '#10b981' : overallAvg >= 50 ? '#f59e0b' : '#ef4444'}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black text-white">{overallAvg}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-black text-white uppercase tracking-widest">Overall Score</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {overallAvg >= 75 ? '🎉 Excellent performance! Keep it up.' :
                         overallAvg >= 50 ? '📈 Good progress. Focus on weak topics.' :
                         overallAvg > 0   ? '💪 Keep practicing to improve your score.' :
                                            '🚀 Take a quiz to see your score here.'}
                      </p>
                      {data.quizResults.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-bold text-emerald-400">
                            Best: {Math.max(...data.quizResults.map(q => q.score))}%
                          </span>
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] font-bold text-red-400">
                            Lowest: {Math.min(...data.quizResults.map(q => q.score))}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quiz history bar chart */}
                  <div className="glass-panel rounded-2xl p-6 border-white/8">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <BarChart2 size={11} /> Recent Quiz Scores
                    </p>
                    <MiniBarChart results={data.quizResults} />
                  </div>
                </div>

                {/* Streak calendar */}
                <div className="glass-panel rounded-2xl p-6 border-white/8">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Flame size={11} className="text-orange-400" /> Study Streak
                  </p>
                  <div className="flex items-center gap-3">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const active = i < data.studyStreak;
                      return (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.06 }}
                          className={`flex-1 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                            active
                              ? 'bg-orange-500/20 border border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                              : 'bg-white/3 border border-white/8'
                          }`}
                        >
                          {active ? '🔥' : <div className="w-2 h-2 rounded-full bg-white/10" />}
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-3">
                    {data.studyStreak === 0
                      ? 'Start studying today to build your streak!'
                      : `${data.studyStreak} day${data.studyStreak > 1 ? 's' : ''} in a row — ${data.studyStreak >= 7 ? 'incredible!' : data.studyStreak >= 3 ? 'great work!' : 'keep going!'}`}
                  </p>
                </div>

                {/* Quick weak/strong summary */}
                {data.topicStats.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-panel rounded-2xl p-5 border-white/8">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <TrendingDown size={11} /> Needs Attention
                      </p>
                      {weakTopics.length === 0
                        ? <p className="text-xs text-slate-600">No weak topics yet 🎉</p>
                        : weakTopics.slice(0, 3).map((t, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <span className="text-xs text-slate-300 truncate">{t.topic}</span>
                            <span className="text-[10px] font-black text-red-400 ml-2">{t.avgScore}%</span>
                          </div>
                        ))}
                    </div>
                    <div className="glass-panel rounded-2xl p-5 border-white/8">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <TrendingUp size={11} /> Strong Topics
                      </p>
                      {strongTopics.length === 0
                        ? <p className="text-xs text-slate-600">Complete quizzes to see strengths</p>
                        : strongTopics.slice(0, 3).map((t, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <span className="text-xs text-slate-300 truncate">{t.topic}</span>
                            <span className="text-[10px] font-black text-emerald-400 ml-2">{t.avgScore}%</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── TOPICS ── */}
            {activeSection === 'topics' && (
              <motion.div key="topics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {data.topicStats.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 border-white/8 text-center">
                    <BookOpen size={40} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-500">No topics tracked yet</p>
                    <p className="text-xs text-slate-600 mt-1">Ask the AI tutor questions and take quizzes to see topic analytics here.</p>
                  </div>
                ) : (
                  data.topicStats
                    .sort((a, b) => b.lastSeen - a.lastSeen)
                    .map((t, i) => {
                      const isWeak = t.avgScore < 60;
                      const isStrong = t.avgScore >= 75;
                      const barColor = isStrong ? '#10b981' : isWeak ? '#ef4444' : '#f59e0b';
                      return (
                        <motion.div
                          key={t.topic}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="glass-panel rounded-2xl p-5 border-white/8"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{t.topic}</span>
                              {isStrong && <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase">Strong</span>}
                              {isWeak   && <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-[9px] font-black text-red-400 uppercase">Needs Work</span>}
                            </div>
                            <span className="text-lg font-black" style={{ color: barColor }}>{t.avgScore}%</span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${t.avgScore}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: barColor }}
                            />
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-[10px] text-slate-600">{t.sessions} session{t.sessions > 1 ? 's' : ''}</span>
                            <span className="text-[10px] text-slate-600">Last: {new Date(t.lastSeen).toLocaleDateString()}</span>
                          </div>
                        </motion.div>
                      );
                    })
                )}
              </motion.div>
            )}

            {/* ── ACHIEVEMENTS ── */}
            {activeSection === 'achievements' && (
              <motion.div key="achievements" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{unlockedCount} of {data.achievements.length} unlocked</p>
                  <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(unlockedCount / data.achievements.length) * 100}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.achievements.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`glass-panel rounded-2xl p-4 border flex items-center gap-4 transition-all ${
                        a.unlockedAt
                          ? 'border-indigo-500/30 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                          : 'border-white/5 opacity-50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                        a.unlockedAt ? 'bg-indigo-500/20' : 'bg-white/5'
                      }`}>
                        {a.unlockedAt ? a.icon : <Lock size={16} className="text-slate-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-black ${a.unlockedAt ? 'text-white' : 'text-slate-600'}`}>{a.title}</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{a.description}</p>
                        {a.unlockedAt && (
                          <p className="text-[9px] text-indigo-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 size={9} /> {new Date(a.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STUDY PLAN ── */}
            {activeSection === 'plan' && (
              <motion.div key="plan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {!data.studyPlan ? (
                  <div className="glass-panel rounded-2xl p-10 border-white/8 text-center space-y-5">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto"
                    >
                      <Calendar size={28} className="text-indigo-400" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-black text-white">Generate Your Study Plan</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        AI will analyze your quiz history and weak topics to create a personalized 7-day plan.
                      </p>
                    </div>
                    <button
                      onClick={handleGeneratePlan}
                      disabled={planLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-sm font-black text-white uppercase tracking-widest transition-all mx-auto disabled:opacity-60"
                    >
                      {planLoading
                        ? <><RefreshCw size={14} className="animate-spin" /> Generating...</>
                        : <><Sparkles size={14} /> Generate Plan</>}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Goal banner */}
                    <div className="glass-panel rounded-2xl p-5 border-indigo-500/20 bg-indigo-500/5">
                      <div className="flex items-start gap-3">
                        <Zap size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Weekly Goal</p>
                          <p className="text-sm text-white font-medium">{data.studyPlan.weeklyGoal}</p>
                        </div>
                      </div>
                    </div>

                    {/* Day cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.studyPlan.days.map((day, i) => {
                        const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day.day;
                        return (
                          <motion.div
                            key={day.day}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className={`glass-panel rounded-2xl p-4 border transition-all ${
                              isToday ? 'border-indigo-500/40 bg-indigo-500/8 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'border-white/8'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white">{day.day}</span>
                                {isToday && <span className="px-1.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[8px] font-black text-indigo-400 uppercase">Today</span>}
                              </div>
                              <Clock size={11} className="text-slate-600" />
                            </div>
                            <p className="text-[10px] font-bold text-indigo-300 mb-2 truncate">{day.focus}</p>
                            <ul className="space-y-1.5">
                              {day.tasks.map((task, j) => (
                                <li key={j} className="flex items-start gap-2 text-[10px] text-slate-400">
                                  <div className="w-1 h-1 rounded-full bg-indigo-500/60 mt-1.5 shrink-0" />
                                  {task}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Tips */}
                    {data.studyPlan.tips.length > 0 && (
                      <div className="glass-panel rounded-2xl p-5 border-white/8">
                        <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Sparkles size={11} /> AI Tips
                        </p>
                        <ul className="space-y-2">
                          {data.studyPlan.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="text-yellow-400 shrink-0">✦</span> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Regenerate */}
                    <button
                      onClick={handleGeneratePlan}
                      disabled={planLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                    >
                      <RefreshCw size={12} className={planLoading ? 'animate-spin' : ''} />
                      {planLoading ? 'Regenerating...' : 'Regenerate Plan'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── EMOTIONS ── */}
            {activeSection === 'emotions' && (() => {
              const history = data.emotionHistory;
              // Count per emotion
              const counts: Partial<Record<EmotionType, number>> = {};
              history.forEach(e => { counts[e.emotion] = (counts[e.emotion] ?? 0) + 1; });
              const total = history.length || 1;
              const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionType | undefined;
              return (
                <motion.div key="emotions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  {history.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-12 border-white/8 text-center">
                      <span className="text-5xl block mb-4">🧠</span>
                      <p className="text-sm font-bold text-slate-500">No emotion data yet</p>
                      <p className="text-xs text-slate-600 mt-1">Start chatting — the AI detects your emotional state in real time.</p>
                    </div>
                  ) : (
                    <>
                      {/* Dominant mood banner */}
                      {dominant && (
                        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                          className={`glass-panel rounded-2xl p-5 border flex items-center gap-4 ${EMOTION_META[dominant].bgColor} ${EMOTION_META[dominant].borderColor}`}>
                          <span className="text-4xl">{EMOTION_META[dominant].emoji}</span>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Mood</p>
                            <p className={`text-xl font-black ${EMOTION_META[dominant].color}`}>{EMOTION_META[dominant].label}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {dominant === 'confused' && 'You asked a lot of clarifying questions — great learning behavior!'}
                              {dominant === 'frustrated' && "Challenging session — but you kept going. That's resilience!"}
                              {dominant === 'confident' && 'You were in the zone today. Excellent understanding!'}
                              {dominant === 'curious' && 'Highly curious session — you explored deeply!'}
                              {dominant === 'bored' && 'Try harder topics or a quiz to stay engaged.'}
                              {dominant === 'neutral' && 'Steady, focused session.'}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Emotion distribution bars */}
                      <div className="glass-panel rounded-2xl p-6 border-white/8">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Emotion Distribution</p>
                        <div className="space-y-3">
                          {(Object.entries(counts) as [EmotionType, number][]).sort((a, b) => b[1] - a[1]).map(([emotion, count]) => {
                            const m = EMOTION_META[emotion];
                            const pct = Math.round((count / total) * 100);
                            return (
                              <div key={emotion} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold flex items-center gap-1.5 ${m.color}`}>{m.emoji} {m.label}</span>
                                  <span className="text-[10px] text-slate-500">{count} msg{count > 1 ? 's' : ''} · {pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    className={`h-full rounded-full ${m.bgColor.replace('/10', '/60')}`} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recent emotion timeline */}
                      <div className="glass-panel rounded-2xl p-6 border-white/8">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Recent Timeline</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {[...history].reverse().slice(0, 20).map((e, i) => {
                            const m = EMOTION_META[e.emotion];
                            return (
                              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`flex items-start gap-3 p-3 rounded-xl border ${m.bgColor} ${m.borderColor}`}>
                                <span className="text-base shrink-0">{m.emoji}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${m.color}`}>{m.label}</span>
                                    <span className="text-[9px] text-slate-600 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{e.message}</p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })()}

          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
