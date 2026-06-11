import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, Sparkles, Download, X, Loader2,
  AlertCircle, File, ChevronDown, ChevronUp, CheckCircle2,
  BookOpen, ClipboardList, Settings, Cpu, BarChart3, Lightbulb,
  Globe, Target, FlaskConical, Layers, Code2, TrendingUp, FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  generateEngineeringReport, downloadAsTxt, downloadAsDoc,
  EngineeringReport,
} from '@/services/reportService';

interface ReportGeneratorProps {}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'Abstract':                <BookOpen size={14} />,
  '1. Introduction':         <FileText size={14} />,
  '2. Problem Statement':    <AlertCircle size={14} />,
  '3. Objectives':           <Target size={14} />,
  '4. Literature Survey':    <ClipboardList size={14} />,
  '5. Methodology':          <Settings size={14} />,
  '6. System Architecture':  <Layers size={14} />,
  '7. Modules Description':  <Cpu size={14} />,
  '8. Technologies Used':    <Code2 size={14} />,
  '9. Implementation':       <FlaskConical size={14} />,
  '10. Results and Discussion': <BarChart3 size={14} />,
  '11. Advantages':          <CheckCircle2 size={14} />,
  '12. Applications':        <Globe size={14} />,
  '13. Future Scope':        <TrendingUp size={14} />,
  '14. Conclusion':          <Lightbulb size={14} />,
  '15. References':          <BookOpen size={14} />,
};

export function ReportGenerator(_props: ReportGeneratorProps) {
  const [docText, setDocText] = useState('');
  const [docName, setDocName] = useState('');
  const [docSize, setDocSize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EngineeringReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-25');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── PDF / text extraction (reuses same logic as PDFAssistant) ──
  const extractText = async (file: File): Promise<string> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
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
      throw new Error('PDF appears to be a scanned image with no extractable text.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve((e.target?.result as string) ?? '');
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsText(file);
    });
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(txt|pdf|doc|docx)$/i)) {
      setError('Please upload a .txt, .pdf, .doc, or .docx file.');
      return;
    }
    setError(null);
    setReport(null);
    setDocText('');
    try {
      const text = await extractText(file);
      if (!text.trim() || text.trim().length < 50) {
        setError('File has too little text. Please upload a document with more content.');
        return;
      }
      setDocText(text);
      setDocName(file.name);
      setDocSize(file.size);
    } catch (e: any) {
      setError(e?.message ?? 'Could not read file.');
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
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!docText || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setReport(null);
    setExpandedSections({});
    try {
      const result = await generateEngineeringReport(
        docText,
        collegeName.trim() || undefined,
        department.trim() || undefined,
        academicYear.trim() || undefined,
      );
      setReport(result);
      // Expand first 3 sections by default
      setExpandedSections({ 0: true, 1: true, 2: true });
    } catch (e: any) {
      setError(`Report generation failed: ${e?.message ?? 'Unknown error'}. Check your VITE_GROQ_API_KEY.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSection = (i: number) =>
    setExpandedSections(prev => ({ ...prev, [i]: !prev[i] }));

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const reset = () => {
    setDocText(''); setDocName(''); setDocSize(0);
    setReport(null); setError(null); setExpandedSections({});
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em]">
          <FileDown size={12} /> Engineering Report Generator
        </div>
        <h2 className="text-4xl md:text-5xl font-black font-display tracking-tighter text-white">
          UPLOAD. ANALYZE. <span className="text-gradient">REPORT.</span>
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          Upload your project document and get a complete, submission-ready engineering report with all 16 standard sections — instantly.
        </p>
      </motion.div>

      {/* ── Upload Zone ── */}
      {!docText && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer glass-panel rounded-[2.5rem] border-2 border-dashed transition-all duration-300 p-16 flex flex-col items-center justify-center gap-6 group
              ${isDragging ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]' : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5'}`}
          >
            <div className="scanline" />
            <motion.div
              animate={isDragging ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
              className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"
            >
              <Upload size={36} className="text-emerald-400" />
            </motion.div>
            <div className="text-center space-y-2">
              <p className="text-xl font-black text-white">
                {isDragging ? 'Drop your project document!' : 'Upload Project Document'}
              </p>
              <p className="text-sm text-slate-400">Drag & drop or click — supports .txt, .pdf, .doc, .docx</p>
            </div>
            <div className="flex gap-3">
              {['.TXT', '.PDF', '.DOC', '.DOCX'].map(ext => (
                <span key={ext} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white/40 uppercase tracking-widest">{ext}</span>
              ))}
            </div>
            <input ref={fileInputRef} type="file" className="sr-only" accept=".txt,.pdf,.doc,.docx" onChange={onFileChange} />
          </div>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── Document loaded — config + generate ── */}
      {docText && !report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* File info bar */}
          <div className="glass-panel rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <File size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white truncate max-w-xs">{docName}</p>
                <p className="text-[10px] text-slate-500">{formatSize(docSize)} · {docText.split(/\s+/).length.toLocaleString()} words extracted</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Ready</span>
              </div>
            </div>
            <button onClick={reset} className="text-slate-500 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
              <X size={16} />
            </button>
          </div>

          {/* Report config */}
          <div className="glass-panel rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/20"><Settings size={16} className="text-emerald-400" /></div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Report Configuration</h3>
              <span className="text-[10px] text-slate-500">(optional — leave blank for auto-detect)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">College Name</label>
                <input
                  value={collegeName}
                  onChange={e => setCollegeName(e.target.value)}
                  placeholder="e.g. VTU Engineering College"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
                <input
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engg"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Year</label>
                <input
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2024-25"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
            </div>

            {/* Sections preview */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report will include 16 sections:</p>
              <div className="flex flex-wrap gap-2">
                {['Abstract', 'Introduction', 'Problem Statement', 'Objectives', 'Literature Survey',
                  'Methodology', 'System Architecture', 'Modules', 'Technologies', 'Implementation',
                  'Results', 'Advantages', 'Applications', 'Future Scope', 'Conclusion', 'References'
                ].map(s => (
                  <span key={s} className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-400">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
            >
              {isGenerating ? (
                <span className="flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin" />
                  Generating Full Report — This may take 30-60 seconds...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Sparkles size={18} />
                  Generate Engineering Report
                </span>
              )}
            </Button>

            {isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Analyzing document and generating all 16 sections...</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                    animate={{ width: ['5%', '90%'] }}
                    transition={{ duration: 55, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Report Preview ── */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Report header card */}
          <div className="glass-panel rounded-[2rem] p-8 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Report Generated Successfully</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight">{report.projectTitle}</h3>
                <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
                  <span>🏛 {report.collegeName}</span>
                  <span>📚 {report.department}</span>
                  <span>📅 {report.academicYear}</span>
                  <span>📄 {report.sections.length} sections</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => downloadAsDoc(report)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  <Download size={13} /> Download .DOC
                </button>
                <button
                  onClick={() => downloadAsTxt(report)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  <FileDown size={13} /> Download .TXT
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all"
                >
                  <X size={13} /> New Report
                </button>
              </div>
            </div>
          </div>

          {/* Sections accordion */}
          <div className="space-y-3">
            {report.sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-panel rounded-2xl overflow-hidden border border-white/8"
              >
                <button
                  onClick={() => toggleSection(i)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      {SECTION_ICONS[section.title] ?? <FileText size={14} />}
                    </div>
                    <span className="text-sm font-bold text-white">{section.title}</span>
                    <span className="hidden sm:block text-[10px] text-slate-600">
                      {section.content.split(/\s+/).length} words
                    </span>
                  </div>
                  {expandedSections[i]
                    ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                    : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </button>
                <AnimatePresence>
                  {expandedSections[i] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-white/5">
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Bottom download bar */}
          <div className="glass-panel rounded-2xl px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              <span className="text-white font-bold">{report.sections.length} sections</span> · {' '}
              <span className="text-white font-bold">
                {report.sections.reduce((acc, s) => acc + s.content.split(/\s+/).length, 0).toLocaleString()}
              </span> total words
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => downloadAsDoc(report)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              >
                <Download size={13} /> .DOC
              </button>
              <button
                onClick={() => downloadAsTxt(report)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              >
                <FileDown size={13} /> .TXT
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
