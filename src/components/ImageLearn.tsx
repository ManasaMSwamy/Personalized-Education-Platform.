import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, ImageIcon, Volume2, CheckCircle, XCircle, RotateCcw, Zap } from 'lucide-react';
import { analyzeUploadedImage, ImageAnalysis, QuizQuestion } from '@/services/visionService';

const LANGUAGES = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu'];

const DIFFICULTY_COLORS = {
  Beginner: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Advanced: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-white mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-indigo-300 mt-4 mb-2">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300 text-sm">• $1</li>')
    .replace(/\n/g, '<br/>');
}

export function ImageLearn() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('English');
  const [activeTab, setActiveTab] = useState<'explanation' | 'quiz'>('explanation');
  const [isDragging, setIsDragging] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      setError('Only JPG, PNG, or WEBP images are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target?.result as string);
      setMimeType(file.type);
      setAnalysis(null);
      setError(null);
      setAnswers([]);
      setSubmitted(false);
      setActiveTab('explanation');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const analyze = async () => {
    if (!image) return;
    setIsLoading(true);
    setError(null);
    try {
      const base64 = image.replace(/^data:image\/\w+;base64,/, '');
      const result = await analyzeUploadedImage(base64, mimeType, language);
      setAnalysis(result);
      setAnswers(new Array(result.quiz.length).fill(null));
      setSubmitted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
    u.rate = 0.95;
    speechSynthesis.speak(u);
  };

  const score = submitted
    ? analysis?.quiz.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0) ?? 0
    : 0;

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setError(null);
    setAnswers([]);
    setSubmitted(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center shadow-lg">
            <ImageIcon size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Image Learn</p>
            <p className="text-[10px] text-slate-500">Upload an image — AI explains everything</p>
          </div>
        </div>
        <select
          value={language}
          onChange={e => { setLanguage(e.target.value); setAnalysis(null); }}
          className="bg-slate-800 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/60"
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="flex-1 px-6 py-4 space-y-4">
        {/* Upload Zone */}
        {!image ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-4 h-64 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
              isDragging
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-white/10 bg-white/2 hover:border-violet-500/50 hover:bg-violet-500/5'
            }`}
          >
            <motion.div
              animate={isDragging ? { scale: 1.15 } : { scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: isDragging ? 0 : Infinity }}
              className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center"
            >
              <Upload size={28} className="text-violet-400" />
            </motion.div>
            <div className="text-center">
              <p className="text-white font-bold">Drag & drop or click to upload</p>
              <p className="text-slate-500 text-xs mt-1">JPG · PNG · WEBP</p>
              <p className="text-slate-600 text-[10px] mt-2">
                Detects: math · science · charts · biology · maps · code · circuits
              </p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
          </motion.div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
            <img src={image} alt="Uploaded" className="w-full max-h-56 object-contain" />
            <button
              onClick={reset}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">{error}</div>
        )}

        {/* Analyze Button */}
        {image && !analysis && !isLoading && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={analyze}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-600 hover:from-violet-400 hover:to-pink-500 text-white font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Zap size={16} /> Analyze Image
          </motion.button>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full"
            />
            <p className="text-slate-400 text-sm">Analyzing with AI in {language}...</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {analysis && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Subject Badge + Difficulty */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl">
                  <span className="text-xl">{analysis.subjectEmoji}</span>
                  <span className="text-sm font-black text-indigo-300">{analysis.subject}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${DIFFICULTY_COLORS[analysis.difficulty]}`}>
                  {analysis.difficulty}
                </div>
              </div>

              {/* Fun Fact */}
              <div className="px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                <span className="text-xl shrink-0">⚡</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Fun Fact</p>
                  <p className="text-sm text-amber-200/80">{analysis.funFact}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {(['explanation', 'quiz'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                      activeTab === tab
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'explanation' ? '📖 Explanation' : '🧠 Quiz'}
                  </button>
                ))}
              </div>

              {/* Explanation Tab */}
              {activeTab === 'explanation' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="px-4 py-4 bg-slate-800/50 border border-white/8 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Explanation</p>
                      <button
                        onClick={() => speak(analysis.explanation)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] text-slate-400 hover:text-white transition-all"
                      >
                        <Volume2 size={11} /> Read Aloud
                      </button>
                    </div>
                    <div
                      className="text-sm text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.explanation) }}
                    />
                  </div>

                  {/* Key Points */}
                  <div className="px-4 py-4 bg-slate-800/50 border border-white/8 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Key Points</p>
                      <button
                        onClick={() => speak(analysis.keyPoints.join('. '))}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] text-slate-400 hover:text-white transition-all"
                      >
                        <Volume2 size={11} /> Read Aloud
                      </button>
                    </div>
                    <ol className="space-y-2">
                      {analysis.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-violet-500/30 text-violet-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-sm text-slate-300">{pt}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </motion.div>
              )}

              {/* Quiz Tab */}
              {activeTab === 'quiz' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {analysis.quiz.map((q: QuizQuestion, qi: number) => (
                    <div key={qi} className="px-4 py-4 bg-slate-800/50 border border-white/8 rounded-2xl space-y-3">
                      <p className="text-sm font-bold text-white">{qi + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const selected = answers[qi] === oi;
                          const correct = submitted && oi === q.answer;
                          const wrong = submitted && selected && oi !== q.answer;
                          return (
                            <button
                              key={oi}
                              disabled={submitted}
                              onClick={() => {
                                const next = [...answers];
                                next[qi] = oi;
                                setAnswers(next);
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-all flex items-center justify-between ${
                                correct
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                  : wrong
                                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                  : selected
                                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
                                  : 'bg-white/3 border-white/8 text-slate-300 hover:bg-white/8 hover:border-white/15'
                              }`}
                            >
                              <span>{opt}</span>
                              {correct && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                              {wrong && <XCircle size={14} className="text-red-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!submitted ? (
                    <button
                      onClick={() => setSubmitted(true)}
                      disabled={answers.some(a => a === null)}
                      className="w-full h-11 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-600 hover:from-violet-400 hover:to-pink-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`px-4 py-4 rounded-2xl border text-center ${
                        score === analysis.quiz.length
                          ? 'bg-emerald-500/15 border-emerald-500/30'
                          : score >= analysis.quiz.length / 2
                          ? 'bg-amber-500/15 border-amber-500/30'
                          : 'bg-red-500/15 border-red-500/30'
                      }`}
                    >
                      <p className="text-2xl font-black text-white">{score}/{analysis.quiz.length}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {score === analysis.quiz.length ? '🎉 Perfect score!' : score >= analysis.quiz.length / 2 ? '👍 Good job!' : '📚 Keep studying!'}
                      </p>
                      <button
                        onClick={() => { setAnswers(new Array(analysis.quiz.length).fill(null)); setSubmitted(false); }}
                        className="mt-3 px-4 py-2 bg-white/10 border border-white/15 rounded-xl text-xs text-white font-bold hover:bg-white/15 transition-all"
                      >
                        Retry Quiz
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
