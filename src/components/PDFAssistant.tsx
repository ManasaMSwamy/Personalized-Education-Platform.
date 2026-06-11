import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, Sparkles, BookOpen, HelpCircle, MessageCircle,
  CheckCircle2, ChevronDown, ChevronUp, Send, X, Loader2,
  Lightbulb, ListChecks, Brain, AlertCircle, File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  generateSummary, generateHighlights, generateMCQs,
  generateShortQuestions, answerDoubt,
  MCQ, ShortQuestion,
} from '@/services/pdfAssistantService';

type Tab = 'summary' | 'highlights' | 'mcq' | 'shortq' | 'doubt';

interface DocFile {
  name: string;
  size: number;
  text: string;
}

export function PDFAssistant() {
  const [doc, setDoc] = useState<DocFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [shortQs, setShortQs] = useState<ShortQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [expandedShortQ, setExpandedShortQ] = useState<Record<number, boolean>>({});

  const [doubtInput, setDoubtInput] = useState('');
  const [doubtHistory, setDoubtHistory] = useState<{ q: string; a: string }[]>([]);
  const [doubtLoading, setDoubtLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractText = async (file: File): Promise<string> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        // Use CDN worker — avoids Vite worker URL resolution issues
        GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const pageTexts = await Promise.all(
          Array.from({ length: pdf.numPages }, (_, i) =>
            pdf.getPage(i + 1)
              .then(p => p.getTextContent())
              .then(tc => tc.items.map((it: any) => it.str).join(' '))
          )
        );
        const extracted = pageTexts.join('\n').trim();
        if (extracted.length > 20) return extracted;
        // PDF had no extractable text (scanned image) — fall through to error
        throw new Error('PDF appears to be a scanned image with no extractable text.');
      } catch (err: any) {
        throw new Error(err?.message ?? 'PDF extraction failed.');
      }
    }
    // Plain text / doc fallback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve((e.target?.result as string) ?? '');
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsText(file);
    });
  };

  const processFile = async (file: File) => {
    if (!file) return;
    if (!file.name.match(/\.(txt|pdf|doc|docx)$/i)) {
      setError('Please upload a .txt, .pdf, .doc, or .docx file.');
      return;
    }

    // Reset all state
    setError(null);
    setDoc(null);
    setSummary(''); setHighlights([]); setMcqs([]); setShortQs([]);
    setSelectedAnswers({}); setExpandedShortQ({}); setDoubtHistory([]);
    setLoading(true);

    let text = '';
    try {
      text = await extractText(file);
    } catch (e: any) {
      setError(e?.message ?? 'Could not read file. For PDFs, ensure the file has selectable text (not a scanned image). Try a .txt file instead.');
      setLoading(false);
      return;
    }

    if (!text.trim() || text.trim().length < 30) {
      setError('File appears empty or has too little text. Try a .txt file with readable content.');
      setLoading(false);
      return;
    }

    setDoc({ name: file.name, size: file.size, text });
    setActiveTab('summary');

    try {
      // Run all 4 AI calls independently — individual failures show per-section
      const [s, h, m, sq] = await Promise.allSettled([
        generateSummary(text),
        generateHighlights(text),
        generateMCQs(text),
        generateShortQuestions(text),
      ]);

      setSummary(s.status === 'fulfilled' ? s.value : '');
      setHighlights(h.status === 'fulfilled' ? h.value : []);
      setMcqs(m.status === 'fulfilled' ? m.value : []);
      setShortQs(sq.status === 'fulfilled' ? sq.value : []);

      // Show error only if ALL failed (likely API key issue)
      if (s.status === 'rejected' && h.status === 'rejected') {
        const reason = (s.reason as Error)?.message ?? 'Unknown error';
        setError(`AI generation failed: ${reason}. Check your VITE_GROQ_API_KEY in .env.local.`);
      }
    } catch (e: any) {
      setError(`AI generation failed: ${e?.message ?? 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtInput.trim() || !doc || doubtLoading) return;
    const q = doubtInput.trim();
    setDoubtInput('');
    setDoubtLoading(true);
    try {
      const a = await answerDoubt(doc.text, q);
      setDoubtHistory(prev => [...prev, { q, a }]);
    } catch {
      setDoubtHistory(prev => [...prev, { q, a: 'Error: Could not get answer. Check your API key.' }]);
    } finally {
      setDoubtLoading(false);
    }
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'summary', label: 'Summary', icon: <BookOpen size={14} />, color: 'indigo' },
    { key: 'highlights', label: 'Highlights', icon: <Lightbulb size={14} />, color: 'yellow' },
    { key: 'mcq', label: 'MCQs', icon: <ListChecks size={14} />, color: 'purple' },
    { key: 'shortq', label: 'Short Q&A', icon: <Brain size={14} />, color: 'emerald' },
    { key: 'doubt', label: 'Ask Doubts', icon: <MessageCircle size={14} />, color: 'pink' },
  ];

  const tabColorMap: Record<string, string> = {
    indigo: 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]',
    yellow: 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.4)]',
    purple: 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]',
    emerald: 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]',
    pink: 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]',
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.4em]">
          <FileText size={12} /> PDF & Notes Assistant
        </div>
        <h2 className="text-4xl md:text-5xl font-black font-display tracking-tighter text-white">
          UPLOAD. ANALYZE. <span className="text-gradient">MASTER.</span>
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          Drop any study material and get instant AI summaries, key highlights, MCQs, and a personal doubt-solving tutor.
        </p>
      </motion.div>

      {/* Upload Zone */}
      {!doc && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer glass-panel rounded-[2.5rem] border-2 border-dashed transition-all duration-300 p-16 flex flex-col items-center justify-center gap-6 group
              ${isDragging ? 'border-purple-500 bg-purple-500/10 scale-[1.01]' : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'}`}
          >
            <div className="scanline" />
            <motion.div
              animate={isDragging ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
              className="w-20 h-20 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"
            >
              <Upload size={36} className="text-purple-400" />
            </motion.div>
            <div className="text-center space-y-2">
              <p className="text-xl font-black text-white">
                {isDragging ? 'Drop it here!' : 'Drag & Drop your file'}
              </p>
              <p className="text-sm text-slate-400">or click to browse — supports .txt, .pdf, .doc, .docx</p>
            </div>
            <div className="flex gap-3">
              {['.TXT', '.PDF', '.DOC', '.DOCX'].map(ext => (
                <span key={ext} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/40 uppercase tracking-widest">{ext}</span>
              ))}
            </div>
            <input ref={fileInputRef} type="file" className="sr-only" accept=".txt,.pdf,.doc,.docx" onChange={onFileChange} />
          </div>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Document loaded */}
      {doc && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* File info bar */}
          <div className="glass-panel rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <File size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white truncate max-w-xs">{doc.name}</p>
                <p className="text-[10px] text-slate-500">{formatSize(doc.size)} · {doc.text.split(/\s+/).length.toLocaleString()} words</p>
              </div>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                  <Loader2 size={12} className="text-indigo-400 animate-spin" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Analyzing...</span>
                </div>
              )}
              {!loading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Ready</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setDoc(null); setSummary(''); setHighlights([]); setMcqs([]); setShortQs([]); setDoubtHistory([]); setError(null); }}
              className="text-slate-500 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200
                  ${activeTab === tab.key ? tabColorMap[tab.color] : 'bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Summary */}
              {activeTab === 'summary' && (
                <div className="glass-panel rounded-[2rem] p-8 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-indigo-500/20"><BookOpen size={16} className="text-indigo-400" /></div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Summary</h3>
                  </div>
                  {loading ? <LoadingSkeleton lines={6} /> : (
                    <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{summary || 'No summary generated.'}</p>
                  )}
                </div>
              )}

              {/* Highlights */}
              {activeTab === 'highlights' && (
                <div className="glass-panel rounded-[2rem] p-8 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-yellow-500/20"><Lightbulb size={16} className="text-yellow-400" /></div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Key Highlights</h3>
                  </div>
                  {loading ? <LoadingSkeleton lines={8} /> : (
                    <ul className="space-y-3">
                      {highlights.length === 0 && <p className="text-slate-500 text-sm">No highlights generated.</p>}
                      {highlights.map((h, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl"
                        >
                          <div className="mt-0.5 w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-yellow-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed">{h}</p>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* MCQs */}
              {activeTab === 'mcq' && (
                <div className="glass-panel rounded-[2rem] p-8 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-purple-500/20"><ListChecks size={16} className="text-purple-400" /></div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Multiple Choice Questions</h3>
                  </div>
                  {loading ? <LoadingSkeleton lines={10} /> : (
                    <div className="space-y-6">
                      {mcqs.length === 0 && <p className="text-slate-500 text-sm">No MCQs generated.</p>}
                      {mcqs.map((mcq, qi) => (
                        <motion.div key={qi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.08 }} className="space-y-3">
                          <p className="text-sm font-bold text-white">
                            <span className="text-purple-400 mr-2">Q{qi + 1}.</span>{mcq.question}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mcq.options.map((opt, oi) => {
                              const selected = selectedAnswers[qi] === opt;
                              const correct = selectedAnswers[qi] !== undefined && opt === mcq.answer;
                              const wrong = selected && opt !== mcq.answer;
                              return (
                                <button
                                  key={oi}
                                  onClick={() => setSelectedAnswers(prev => ({ ...prev, [qi]: opt }))}
                                  disabled={selectedAnswers[qi] !== undefined}
                                  className={`text-left px-4 py-3 rounded-xl text-xs font-medium border transition-all duration-200
                                    ${correct ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                      : wrong ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                      : selected ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'}`}
                                >
                                  {correct && <CheckCircle2 size={12} className="inline mr-1.5 text-emerald-400" />}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {selectedAnswers[qi] !== undefined && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-emerald-400 font-bold pl-1">
                              ✓ Correct Answer: {mcq.answer}
                            </motion.p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Short Questions */}
              {activeTab === 'shortq' && (
                <div className="glass-panel rounded-[2rem] p-8 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20"><Brain size={16} className="text-emerald-400" /></div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Short Answer Questions</h3>
                  </div>
                  {loading ? <LoadingSkeleton lines={8} /> : (
                    <div className="space-y-3">
                      {shortQs.length === 0 && <p className="text-slate-500 text-sm">No questions generated.</p>}
                      {shortQs.map((sq, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                          className="border border-white/10 rounded-2xl overflow-hidden">
                          <button
                            onClick={() => setExpandedShortQ(prev => ({ ...prev, [i]: !prev[i] }))}
                            className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 transition-all text-left"
                          >
                            <span className="text-sm font-medium text-white">
                              <span className="text-emerald-400 font-black mr-2">Q{i + 1}.</span>{sq.question}
                            </span>
                            {expandedShortQ[i] ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                          </button>
                          <AnimatePresence>
                            {expandedShortQ[i] && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="px-6 py-4 bg-emerald-500/5 border-t border-emerald-500/20">
                                <p className="text-sm text-slate-300 leading-relaxed">{sq.answer}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Doubt Chat */}
              {activeTab === 'doubt' && (
                <div className="glass-panel rounded-[2rem] overflow-hidden flex flex-col" style={{ height: '520px' }}>
                  <div className="px-8 py-5 border-b border-white/10 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-pink-500/20"><MessageCircle size={16} className="text-pink-400" /></div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Ask Doubts</h3>
                      <p className="text-[10px] text-slate-500">Ask anything about your uploaded document</p>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 px-8 py-6">
                    {doubtHistory.length === 0 && !doubtLoading && (
                      <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-12">
                        <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                          <HelpCircle size={28} className="text-pink-400" />
                        </div>
                        <p className="text-slate-400 text-sm">Ask any question about your document.<br />The AI will answer based on its content.</p>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {['Summarize the main topic', 'What are the key concepts?', 'Explain the conclusion'].map(s => (
                            <button key={s} onClick={() => setDoubtInput(s)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      {doubtHistory.map((item, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          <div className="flex justify-end">
                            <div className="max-w-[80%] px-4 py-3 bg-pink-600/80 rounded-2xl rounded-tr-sm text-sm text-white">{item.q}</div>
                          </div>
                          <div className="flex justify-start">
                            <div className="max-w-[85%] px-4 py-3 bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{item.a}</div>
                          </div>
                        </motion.div>
                      ))}
                      {doubtLoading && (
                        <div className="flex justify-start">
                          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2">
                            <Loader2 size={14} className="text-pink-400 animate-spin" />
                            <span className="text-xs text-slate-400">Thinking...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <form onSubmit={handleDoubt} className="px-6 py-4 border-t border-white/10 flex gap-3">
                    <input
                      value={doubtInput}
                      onChange={e => setDoubtInput(e.target.value)}
                      placeholder="Type your doubt or question..."
                      disabled={doubtLoading || loading}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                    />
                    <Button type="submit" disabled={!doubtInput.trim() || doubtLoading || loading}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl px-5">
                      {doubtLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </Button>
                  </form>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function LoadingSkeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-white/5 rounded-lg" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}
