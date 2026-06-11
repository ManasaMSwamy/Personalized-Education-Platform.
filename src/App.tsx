import React, { useState, useCallback } from 'react';
import { AuthPage } from './components/AuthPage';
import { Chatbot } from './components/Chatbot';
import { ImageLearn } from './components/ImageLearn';
import { PDFAssistant } from './components/PDFAssistant';
import { ReportGenerator } from './components/ReportGenerator';
import { PresentationSidebar } from './components/PresentationSidebar';
import { Dashboard } from './components/Dashboard';
import { MiniCourses } from './components/MiniCourses.tsx';
import { AICertificates } from './components/AiCertificates';
import { CertificatePopup,  CertTrigger } from './components/CertificatePopup.tsx';
import { OfflineChatbot } from './components/OfflineChatbot';
import { MiniCourse } from './services/miniCourseServices';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, LogOut, User, FileText, Sparkles, MessageCircle,
  PanelRightOpen, PanelRightClose, LayoutDashboard,
  BookOpen, Award, FileDown, ImageIcon, WifiOff,
} from 'lucide-react';
import { DashboardData, QuizResult, EmotionEvent } from './types/dashboard';
import { createDashboard, recordMessage, recordQuiz } from './services/dashboardService';

interface AuthUser { name: string; email: string; }
type ActiveTab = 'tutor' | 'offline' | 'image' | 'pdf' | 'report' | 'courses' | 'certificates' | 'dashboard';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tutor');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tutorTopic, setTutorTopic] = useState<string | undefined>();
  const [dashboard, setDashboard] = useState<DashboardData>(createDashboard());
  const [completedCourses, setCompletedCourses] = useState<{ course: MiniCourse; score: number }[]>([]);
  const [certTrigger, setCertTrigger] = useState<CertTrigger | null>(null);

  const handleMessage = useCallback(() => {
    setDashboard(prev => recordMessage(prev));
  }, []);

  const handleQuizResult = useCallback((result: QuizResult) => {
    setDashboard(prev => recordQuiz(prev, result));
    setCertTrigger({
      recipientName: user?.name ?? 'Student',
      topic: result.topic,
      score: result.score,
      type: 'quiz',
    });
  }, [user]);

  const handleEmotionDetected = useCallback((event: EmotionEvent) => {
    setDashboard(prev => ({
      ...prev,
      emotionHistory: [...prev.emotionHistory, event].slice(-100),
    }));
  }, []);

  const handleCourseComplete = useCallback((course: MiniCourse, score: number) => {
    setCompletedCourses(prev => [...prev, { course, score }]);
    setDashboard(prev => recordQuiz(prev, {
      topic: course.title,
      score,
      total: course.lessons.length,
      correct: Math.round(course.lessons.length * score / 100),
      timestamp: Date.now(),
    }));
    setCertTrigger({
      recipientName: user?.name ?? 'Student',
      topic: course.title,
      score,
      type: 'course',
    });
  }, [user]);

  if (!user) {
    return (
      <AnimatePresence>
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthPage onLogin={u => { setUser(u); setDashboard(createDashboard()); }} />
        </motion.div>
      </AnimatePresence>
    );
  }

  const tabs = [
    { key: 'tutor',        label: 'AI Tutor',      icon: <MessageCircle size={13} /> },
    { key: 'offline',      label: 'Offline AI',    icon: <WifiOff size={13} /> },
    { key: 'image',        label: 'Image Learn',   icon: <ImageIcon size={13} /> },
    { key: 'courses',      label: 'Mini Courses',   icon: <BookOpen size={13} /> },
    { key: 'certificates', label: 'Certificates',   icon: <Award size={13} /> },
    { key: 'pdf',          label: 'PDF',            icon: <FileText size={13} /> },
    { key: 'report',       label: 'Report',         icon: <FileDown size={13} /> },
    { key: 'dashboard',    label: 'Dashboard',      icon: <LayoutDashboard size={13} /> },
  ] as const;

  return (
    <div className="h-screen flex flex-col font-sans bg-slate-950 selection:bg-indigo-500 selection:text-white overflow-hidden">
      <div className="mesh-bg" />

      {/* ── Header ── */}
      <header className="relative z-50 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: ['0 0 10px rgba(99,102,241,0.3)', '0 0 25px rgba(99,102,241,0.6)', '0 0 10px rgba(99,102,241,0.3)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center"
          >
            <Brain size={18} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-base font-black font-display tracking-tighter text-white leading-none">
              SMART <span className="text-indigo-400">AI TUTOR</span>
            </h1>
            <p className="text-[9px] font-bold text-indigo-300/40 uppercase tracking-[0.3em]">Intelligent Learning Platform</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}{tab.label}
              {tab.key === 'dashboard' && dashboard.quizResults.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[8px] font-black flex items-center justify-center">
                  {dashboard.quizResults.length}
                </span>
              )}
              {tab.key === 'certificates' && completedCourses.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-yellow-500 text-slate-900 text-[8px] font-black flex items-center justify-center">
                  {completedCourses.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {activeTab === 'tutor' && (
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all ${
                sidebarOpen
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              {sidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              <span className="hidden sm:inline">Slides</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
            <div className="leading-none">
              <p className="text-[11px] font-bold text-white">{user.name}</p>
              <p className="text-[9px] text-white/30">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => setUser(null)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all text-[11px] font-bold uppercase tracking-widest"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        <AnimatePresence mode="wait">

          {activeTab === 'tutor' && (
            <motion.div key="tutor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden">
                <AnimatePresence>
                  {tutorTopic && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="px-6 py-2 bg-indigo-500/8 border-b border-indigo-500/15 flex items-center gap-2 shrink-0"
                    >
                      <Sparkles size={11} className="text-indigo-400 shrink-0" />
                      <p className="text-[10px] text-indigo-300/70">
                        Tutor context: <span className="font-bold text-indigo-300">{tutorTopic}</span>
                        <span className="text-indigo-300/40"> — from your slide deck</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Chatbot
onAccuracyUpdate={(isCorrect) => {

  setDashboard((prev: any) => {

    const total = prev.totalEmotionPredictions + 1;

    const correct = isCorrect
      ? prev.correctEmotionPredictions + 1
      : prev.correctEmotionPredictions;

    return {
      ...prev,
      totalEmotionPredictions: total,
      correctEmotionPredictions: correct,
      emotionAccuracy: (correct / total) * 100,
    };
  });
}}
                  topic={tutorTopic}
                  onMessage={handleMessage}
                  onQuizResult={handleQuizResult}
                  onEmotionDetected={handleEmotionDetected}
                />
              </div>
              <AnimatePresence initial={false}>
                {sidebarOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden shrink-0 hidden md:block"
                  >
                    <PresentationSidebar onTopicChange={setTutorTopic} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'offline' && (
            <motion.div key="offline" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="flex-1 flex flex-col overflow-hidden">
              <OfflineChatbot />
            </motion.div>
          )}

          {activeTab === 'image' && (
            <motion.div key="image" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto">
                <ImageLearn />
              </div>
            </motion.div>
          )}

          {activeTab === 'courses' && (
            <motion.div key="courses" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-8">
                <MiniCourses userName={user.name} onCourseComplete={handleCourseComplete} />
              </div>
            </motion.div>
          )}

          {activeTab === 'certificates' && (
            <motion.div key="certificates" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-8">
                <AICertificates
                  userName={user.name}
                  dashboard={dashboard}
                  completedCourses={completedCourses}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'pdf' && (
            <motion.div key="pdf" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-8">
                <PDFAssistant />
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div key="report" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-8">
                <ReportGenerator />
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }} className="flex-1 overflow-hidden">
              <Dashboard
                data={dashboard}
                onUpdate={setDashboard}
                userName={user.name}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Status bar ── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-1.5 border-t border-white/5 bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">System Online</span>
          </div>
          <span className="text-[9px] text-slate-700 hidden sm:block">
            {activeTab === 'offline' ? 'Model: Built-in NLP · No API · 100% Local' : 'Model: llama-3.3-70b-versatile'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-700">
            {dashboard.totalMessages} msgs · {dashboard.quizResults.length} quizzes · {dashboard.studyStreak}🔥
          </span>
          <span className="text-[9px] text-slate-700">© 2026 Smart AI Tutor</span>
        </div>
      </div>

      {/* ── Certificate Popup ── */}
      <CertificatePopup trigger={certTrigger} onClose={() => setCertTrigger(null)} />
    </div>
  );
}
