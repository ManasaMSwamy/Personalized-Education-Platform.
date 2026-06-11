import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Sparkles, RefreshCw, ChevronRight, ChevronLeft,
  CheckCircle2, Circle, Trophy, Clock, BarChart2, Play,
  Lock, Star, Zap, GraduationCap, ListChecks,
} from 'lucide-react';
import {
  MiniCourse, CourseProgress, Lesson,
  generateMiniCourse, calcCourseScore, isCourseComplete,
} from '@/services/miniCourseServices';

interface Props {
  userName: string;
  onCourseComplete: (course: MiniCourse, score: number) => void;
}

const LEVEL_COLOR = {
  Beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Intermediate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Advanced: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const SUGGESTED = [
  'Python Programming', 'Data Structures', 'Machine Learning',
  'Cryptography', 'Web Development', 'Linear Algebra',
  'Operating Systems', 'Computer Networks', 'Database Management',
];

export function MiniCourses({ userName, onCourseComplete }: Props) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<MiniCourse['level']>('Beginner');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [courses, setCourses] = useState<MiniCourse[]>([]);
  const [progresses, setProgresses] = useState<Record<string, CourseProgress>>({});

  // Active course view
  const [activeCourse, setActiveCourse] = useState<MiniCourse | null>(null);
  const [activeLesson, setActiveLesson] = useState(0);
  const [view, setView] = useState<'lesson' | 'quiz'>('lesson');

  // Quiz state
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const course = await generateMiniCourse(topic.trim(), level);
      setCourses(prev => [course, ...prev]);
      setProgresses(prev => ({
        ...prev,
        [course.id]: { courseId: course.id, completedLessons: [], quizScores: {}, startedAt: Date.now() },
      }));
      openCourse(course);
    } catch {
      setError('Failed to generate course. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const openCourse = (course: MiniCourse) => {
    setActiveCourse(course);
    setActiveLesson(0);
    setView('lesson');
    setSelected(null);
    setSubmitted(false);
  };

  const progress = activeCourse ? progresses[activeCourse.id] : null;

  const goToLesson = (idx: number) => {
    setActiveLesson(idx);
    setView('lesson');
    setSelected(null);
    setSubmitted(false);
  };

  const submitQuiz = () => {
    if (!selected || !activeCourse || !progress) return;
    const lesson = activeCourse.lessons[activeLesson];
    const correct = selected === lesson.quiz.answer;
    const score = correct ? 100 : 0;

    const updatedProgress: CourseProgress = {
      ...progress,
      completedLessons: progress.completedLessons.includes(lesson.id)
        ? progress.completedLessons
        : [...progress.completedLessons, lesson.id],
      quizScores: { ...progress.quizScores, [lesson.id]: score },
    };

    // Check if course complete
    const allDone = activeCourse.lessons.every(l =>
      updatedProgress.completedLessons.includes(l.id)
    );
    if (allDone) updatedProgress.completedAt = Date.now();

    setProgresses(prev => ({ ...prev, [activeCourse.id]: updatedProgress }));
    setSubmitted(true);

    if (allDone) {
      const finalScore = calcCourseScore(activeCourse, updatedProgress);
      setTimeout(() => onCourseComplete(activeCourse, finalScore), 1200);
    }
  };

  const nextLesson = () => {
    if (!activeCourse) return;
    if (activeLesson < activeCourse.lessons.length - 1) {
      goToLesson(activeLesson + 1);
    }
  };

  // ── Course list view ──────────────────────────────────────────
  if (!activeCourse) {
    return (
      <div className="space-y-6">
        {/* Generator */}
        <div className="glass-panel rounded-2xl p-6 border-white/8 space-y-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={12} className="text-indigo-400" /> Generate a Mini Course
          </p>
          <div className="flex gap-3">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !generating && topic.trim() && handleGenerate()}
              placeholder="Enter any topic — e.g. Cryptography, Python, Calculus..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <select
              value={level}
              onChange={e => setLevel(e.target.value as MiniCourse['level'])}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-[11px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {generating ? <><RefreshCw size={13} className="animate-spin" /> Generating...</> : <><Sparkles size={13} /> Generate</>}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => setTopic(s)}
                className="px-3 py-1 bg-white/5 border border-white/8 hover:bg-indigo-500/10 hover:border-indigo-500/30 rounded-lg text-[10px] text-slate-400 hover:text-white transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Course cards */}
        {courses.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 border-white/8 text-center">
            <BookOpen size={40} className="text-slate-700 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-500">No courses yet</p>
            <p className="text-xs text-slate-600 mt-1">Generate your first mini course above to start learning.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map(course => {
              const prog = progresses[course.id];
              const done = prog ? isCourseComplete(course, prog) : false;
              const score = prog ? calcCourseScore(course, prog) : 0;
              const pct = prog ? Math.round((prog.completedLessons.length / course.lessons.length) * 100) : 0;
              return (
                <motion.div key={course.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-2xl p-5 border-white/8 space-y-3 cursor-pointer hover:border-indigo-500/30 transition-all"
                  onClick={() => openCourse(course)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-white leading-snug">{course.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{course.description}</p>
                    </div>
                    {done && <Trophy size={18} className="text-yellow-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${LEVEL_COLOR[course.level]}`}>{course.level}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock size={10} />{course.estimatedTime}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500"><ListChecks size={10} />{course.lessons.length} lessons</span>
                    {done && <span className="text-[10px] font-black text-yellow-400">{score}% score</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      className="h-full bg-indigo-500 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">{prog?.completedLessons.length ?? 0}/{course.lessons.length} lessons done</span>
                    <button className="flex items-center gap-1 text-[10px] font-black text-indigo-400 hover:text-indigo-300">
                      {done ? 'Review' : pct > 0 ? 'Continue' : 'Start'} <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Active course view ────────────────────────────────────────
  const lesson: Lesson = activeCourse.lessons[activeLesson];
  const lessonProgress = progress?.completedLessons.includes(lesson.id);
  const lessonScore = progress?.quizScores[lesson.id];

  return (
    <div className="space-y-4">
      {/* Course header */}
      <div className="glass-panel rounded-2xl p-4 border-white/8 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveCourse(null)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <ChevronLeft size={14} className="text-white" />
          </button>
          <div>
            <p className="text-xs font-black text-white">{activeCourse.title}</p>
            <p className="text-[10px] text-slate-500">{activeCourse.lessons.length} lessons · {activeCourse.estimatedTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${LEVEL_COLOR[activeCourse.level]}`}>{activeCourse.level}</span>
          <span className="text-[10px] text-slate-500">
            {progress?.completedLessons.length ?? 0}/{activeCourse.lessons.length} done
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Lesson sidebar */}
        <div className="glass-panel rounded-2xl p-4 border-white/8 space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Lessons</p>
          {activeCourse.lessons.map((l, i) => {
            const done = progress?.completedLessons.includes(l.id);
            const score = progress?.quizScores[l.id];
            const isActive = i === activeLesson;
            return (
              <button key={l.id} onClick={() => goToLesson(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                  isActive ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'
                }`}>
                <div className="shrink-0">
                  {done
                    ? <CheckCircle2 size={14} className={score === 100 ? 'text-emerald-400' : 'text-yellow-400'} />
                    : isActive ? <Play size={14} className="text-indigo-400" />
                    : <Circle size={14} className="text-slate-600" />}
                </div>
                <span className={`text-[11px] font-bold leading-tight ${isActive ? 'text-white' : done ? 'text-slate-400' : 'text-slate-500'}`}>
                  {i + 1}. {l.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Lesson / Quiz toggle */}
          <div className="flex gap-2">
            <button onClick={() => setView('lesson')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                view === 'lesson' ? 'bg-indigo-600 text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
              }`}>
              <BookOpen size={12} /> Lesson
            </button>
            <button onClick={() => { setView('quiz'); setSelected(null); setSubmitted(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                view === 'quiz' ? 'bg-purple-600 text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
              }`}>
              <ListChecks size={12} /> Quiz
              {lessonProgress && <CheckCircle2 size={11} className={lessonScore === 100 ? 'text-emerald-400' : 'text-yellow-400'} />}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {view === 'lesson' ? (
              <motion.div key="lesson" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass-panel rounded-2xl p-6 border-white/8 space-y-5">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Lesson {activeLesson + 1}</p>
                  <h3 className="text-lg font-black text-white mt-1">{lesson.title}</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{lesson.content}</p>
                {lesson.keyPoints.length > 0 && (
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Zap size={10} /> Key Points
                    </p>
                    {lesson.keyPoints.map((kp, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <Star size={10} className="text-indigo-400 mt-0.5 shrink-0" /> {kp}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => activeLesson > 0 && goToLesson(activeLesson - 1)}
                    disabled={activeLesson === 0}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronLeft size={13} /> Previous
                  </button>
                  <button onClick={() => setView('quiz')}
                    className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-[11px] font-black text-white uppercase tracking-widest transition-all">
                    Take Quiz <ChevronRight size={13} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass-panel rounded-2xl p-6 border-white/8 space-y-5">
                <div>
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Quiz — Lesson {activeLesson + 1}</p>
                  <p className="text-base font-black text-white mt-2">{lesson.quiz.question}</p>
                </div>
                <div className="space-y-2">
                  {lesson.quiz.options.map((opt, i) => {
                    const isSelected = selected === opt;
                    const isCorrect = submitted && opt === lesson.quiz.answer;
                    const isWrong = submitted && isSelected && opt !== lesson.quiz.answer;
                    return (
                      <button key={i} onClick={() => !submitted && setSelected(opt)}
                        disabled={submitted}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                          isCorrect ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : isWrong ? 'bg-red-500/20 border-red-500/50 text-red-300'
                          : isSelected ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                        }`}>
                        {isCorrect && <CheckCircle2 size={13} className="inline mr-2 text-emerald-400" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border text-sm ${
                      selected === lesson.quiz.answer
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/20 text-red-300'
                    }`}>
                    <p className="font-black mb-1">{selected === lesson.quiz.answer ? '✅ Correct!' : '❌ Incorrect'}</p>
                    <p className="text-xs opacity-80">{lesson.quiz.explanation}</p>
                  </motion.div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {!submitted ? (
                    <button onClick={submitQuiz} disabled={!selected}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-[11px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-40">
                      <CheckCircle2 size={13} /> Submit Answer
                    </button>
                  ) : (
                    <button onClick={nextLesson}
                      disabled={activeLesson === activeCourse.lessons.length - 1}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[11px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-40">
                      Next Lesson <ChevronRight size={13} />
                    </button>
                  )}
                  {submitted && activeLesson === activeCourse.lessons.length - 1 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <Trophy size={14} className="text-yellow-400" />
                      <span className="text-[11px] font-black text-yellow-400">Course Complete!</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
