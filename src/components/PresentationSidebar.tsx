import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Download, RotateCcw,
  Presentation, Loader2, Sparkles, ChevronDown, ChevronUp,
  Play, FileText, Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Presentation as PresentationType, PresentationInput, LoadingStage } from '@/types';
import { generatePresentation } from '@/services/geminiService';
import PptxGenJS from 'pptxgenjs';

interface PresentationSidebarProps {
  onTopicChange?: (topic: string) => void;
}

const LOADING_LABELS: Record<string, string> = {
  analyzing: 'Analyzing...',
  generating: 'Generating...',
  media: 'Fetching media...',
  finalizing: 'Finalizing...',
};

export function PresentationSidebar({ onTopicChange }: PresentationSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(true);
  const [presentation, setPresentation] = useState<PresentationType | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PresentationInput>({
    topic: '', subject: '', audience: 'college', slideCount: 8,
    tone: 'formal', pedagogyMode: 'None', pdfUpload: false,
    primaryColor: '#4f46e5', secondaryColor: '#ec4899',
    collegeName: '', submittedBy: '', submittedTo: '',
  });

  const isLoading = loadingStage !== 'idle';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim()) return;
    setError(null);
    setPresentation(null);
    setCurrentSlide(0);
    onTopicChange?.(form.topic);

    setLoadingStage('analyzing');
    try {
      const p = generatePresentation(form);
      await new Promise(r => setTimeout(r, 1200));
      setLoadingStage('generating');
      await new Promise(r => setTimeout(r, 1200));
      setLoadingStage('media');
      await new Promise(r => setTimeout(r, 1000));
      setLoadingStage('finalizing');
      const data = await p;
      setPresentation({
        ...data,
        audience: form.audience,
        brand_theme: { ...data.brand_theme },
      });
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setLoadingStage('idle');
    }
  };

  const exportPptx = async () => {
    if (!presentation) return;
    try {
      const pptx = new PptxGenJS();
      pptx.title = presentation.presentation_title;
      pptx.author = presentation.brand_theme.college_name || 'Smart AI Tutor';
      pptx.layout = 'LAYOUT_WIDE';

      const primary = presentation.brand_theme.primary_color?.replace('#', '') || '4f46e5';
      const secondary = presentation.brand_theme.secondary_color?.replace('#', '') || 'ec4899';

      presentation.slides.forEach((slide, idx) => {
        const s = pptx.addSlide();

        // Background
        s.background = { color: '0f172a' };

        // Slide number badge
        s.addText(`${idx + 1} / ${presentation.slides.length}`, {
          x: 11.5, y: 0.1, w: 1.8, h: 0.3,
          fontSize: 8, color: '64748b', align: 'right',
        });

        // College name footer
        if (presentation.brand_theme.college_name) {
          s.addText(presentation.brand_theme.college_name, {
            x: 0.3, y: 6.9, w: 8, h: 0.25,
            fontSize: 8, color: '475569', italic: true,
          });
        }

        // Title
        s.addText(slide.title, {
          x: 0.4, y: 0.25, w: 12.5, h: 0.9,
          fontSize: 26, bold: true,
          color: primary,
          fontFace: 'Calibri',
        });

        // Divider line
        s.addShape(pptx.ShapeType.line, {
          x: 0.4, y: 1.2, w: 12.5, h: 0,
          line: { color: primary, width: 1.5, transparency: 60 },
        });

        // Bullet content — left column
        if (slide.content?.length) {
          const bullets = slide.content.map(line => ({
            text: line,
            options: { bullet: { type: 'bullet' as const }, fontSize: 14, color: 'cbd5e1', paraSpaceAfter: 6 },
          }));
          s.addText(bullets, {
            x: 0.4, y: 1.35, w: 7.2, h: 5.2,
            fontFace: 'Calibri',
            valign: 'top',
          });
        }

        // Table data — right column
        if (slide.table_data?.headers?.length) {
          const tableRows = [
            slide.table_data.headers.map(h => ({ text: h, options: { bold: true, color: 'ffffff', fill: { color: primary } } })),
            ...slide.table_data.rows.map((row, ri) =>
              row.map(cell => ({ text: cell, options: { color: 'cbd5e1', fill: { color: ri % 2 === 0 ? '1e293b' : '0f172a' } } }))
            ),
          ];
          s.addTable(tableRows, {
            x: 7.8, y: 1.35, w: 5, colW: [2, 1.5, 1.5],
            fontSize: 11, border: { type: 'solid', color: '334155', pt: 0.5 },
          });
        }

        // Chart data — right column
        if (slide.chart_data?.data?.length && !slide.table_data) {
          const chartData = [{
            name: slide.title,
            labels: slide.chart_data.data.map((d: any) => d.label),
            values: slide.chart_data.data.map((d: any) => d.value),
          }];
          const chartType = slide.chart_data.type === 'pie'
            ? pptx.ChartType.pie
            : slide.chart_data.type === 'line'
              ? pptx.ChartType.line
              : pptx.ChartType.bar;
          s.addChart(chartType, chartData, {
            x: 7.8, y: 1.35, w: 5, h: 3.8,
            chartColors: [primary, secondary, '10b981', 'f59e0b', '3b82f6'],
            showLegend: true, legendPos: 'b',
            showValue: true,
          });
        }

        // Speaker notes
        if (slide.speaker_notes) {
          s.addNotes(slide.speaker_notes);
        }
      });

      const safeName = presentation.presentation_title
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-')
        .slice(0, 50) || 'presentation';
      await pptx.writeFile({ fileName: `${safeName}.pptx` });
    } catch (e) {
      setError(`PPTX export failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const slide = presentation?.slides[currentSlide];
  const totalSlides = presentation?.slides.length ?? 0;

  return (
    <div className="flex h-full">
      {/* Collapse toggle tab */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center justify-center w-5 self-stretch bg-white/3 hover:bg-white/8 border-l border-white/5 transition-all group shrink-0"
        title={isOpen ? 'Collapse panel' : 'Expand panel'}
      >
        <motion.div animate={{ rotate: isOpen ? 0 : 180 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden shrink-0"
          >
            <div className="w-80 h-full flex flex-col border-l border-white/5 bg-slate-950/60">
              {/* Sidebar header */}
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Presentation size={13} className="text-indigo-400" />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-widest">Slides</span>
                </div>
                {presentation && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={exportPptx} title="Export PPTX"
                      className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all">
                      <Download size={12} className="text-slate-400 hover:text-indigo-400" />
                    </button>
                    <button onClick={() => { setPresentation(null); setFormOpen(true); setCurrentSlide(0); }} title="Reset"
                      className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-all">
                      <RotateCcw size={12} className="text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">

                  {/* Generate Form */}
                  <div className="glass-panel rounded-2xl overflow-hidden border-white/8">
                    <button
                      onClick={() => setFormOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={13} className="text-purple-400" />
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Generate Slides</span>
                      </div>
                      {formOpen ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {formOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <form onSubmit={handleGenerate} className="px-4 pb-4 space-y-3 border-t border-white/5">
                            <div className="pt-3 space-y-3">
                              <Input
                                placeholder="Topic (e.g. Machine Learning)"
                                value={form.topic}
                                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 rounded-xl text-xs"
                                required
                              />
                              <Input
                                placeholder="Subject (e.g. Computer Science)"
                                value={form.subject}
                                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 rounded-xl text-xs"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Select value={form.audience} onValueChange={(v: any) => setForm(f => ({ ...f, audience: v }))}>
                                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="school">Students</SelectItem>
                                    <SelectItem value="college">College</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number" min={3} max={20}
                                  value={form.slideCount}
                                  onChange={e => setForm(f => ({ ...f, slideCount: parseInt(e.target.value) }))}
                                  className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs"
                                  placeholder="Slides"
                                />
                              </div>
                              <Select value={form.tone} onValueChange={(v: any) => setForm(f => ({ ...f, tone: v }))}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 rounded-xl text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                  <SelectItem value="formal">Formal</SelectItem>
                                  <SelectItem value="friendly">Friendly</SelectItem>
                                  <SelectItem value="storytelling">Storytelling</SelectItem>
                                  <SelectItem value="interactive">Interactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {error && <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

                            <Button
                              type="submit"
                              disabled={isLoading || !form.topic.trim()}
                              className="w-full h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-black uppercase tracking-widest"
                            >
                              {isLoading ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 size={12} className="animate-spin" />
                                  {LOADING_LABELS[loadingStage]}
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Play size={12} /> Generate
                                </span>
                              )}
                            </Button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Slide Viewer */}
                  {presentation && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {/* Presentation title */}
                      <div className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Active Deck</p>
                        <p className="text-xs font-bold text-white truncate">{presentation.presentation_title}</p>
                        <p className="text-[10px] text-slate-500">{totalSlides} slides</p>
                      </div>

                      {/* Current slide preview */}
                      {slide && (
                        <div className="glass-panel rounded-2xl overflow-hidden border-white/8">
                          {/* Slide mini preview */}
                          <div className="aspect-video bg-slate-900 relative overflow-hidden p-3 flex flex-col justify-between"
                            style={{ background: `linear-gradient(135deg, ${presentation.brand_theme.primary_color}15, #020617)` }}>
                            <div className="absolute top-0 right-0 px-2 py-1 bg-black/40 text-[9px] font-bold text-white/40 rounded-bl-lg">
                              {currentSlide + 1}/{totalSlides}
                            </div>
                            <p className="text-[10px] font-black text-white leading-tight line-clamp-2"
                              style={{ color: presentation.brand_theme.primary_color }}>
                              {slide.title}
                            </p>
                            <ul className="space-y-0.5 mt-1">
                              {slide.content.slice(0, 3).map((c, i) => (
                                <li key={i} className="text-[8px] text-white/50 flex items-start gap-1">
                                  <span className="mt-0.5 w-1 h-1 rounded-full shrink-0"
                                    style={{ backgroundColor: presentation.brand_theme.secondary_color }} />
                                  <span className="line-clamp-1">{c}</span>
                                </li>
                              ))}
                              {slide.content.length > 3 && (
                                <li className="text-[8px] text-white/20">+{slide.content.length - 3} more</li>
                              )}
                            </ul>
                          </div>

                          {/* Slide controls */}
                          <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
                            <button
                              onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
                              disabled={currentSlide === 0}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all"
                            >
                              <ChevronLeft size={13} className="text-white" />
                            </button>
                            <div className="flex gap-1">
                              {Array.from({ length: Math.min(totalSlides, 8) }).map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setCurrentSlide(i)}
                                  className={`h-1 rounded-full transition-all ${i === currentSlide ? 'w-4' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                                  style={i === currentSlide ? { backgroundColor: presentation.brand_theme.primary_color } : {}}
                                />
                              ))}
                              {totalSlides > 8 && <span className="text-[8px] text-white/20 self-center">+{totalSlides - 8}</span>}
                            </div>
                            <button
                              onClick={() => setCurrentSlide(s => Math.min(totalSlides - 1, s + 1))}
                              disabled={currentSlide === totalSlides - 1}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all"
                            >
                              <ChevronRight size={13} className="text-white" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Speaker notes */}
                      {slide?.speaker_notes && (
                        <div className="px-3 py-2.5 bg-white/3 border border-white/8 rounded-xl">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <FileText size={9} /> Speaker Notes
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-4">{slide.speaker_notes}</p>
                        </div>
                      )}

                      {/* Slide thumbnails list */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">All Slides</p>
                        {presentation.slides.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 ${i === currentSlide
                              ? 'bg-indigo-500/15 border border-indigo-500/30'
                              : 'bg-white/3 border border-white/5 hover:bg-white/8'}`}
                          >
                            <span className={`text-[9px] font-black w-4 shrink-0 ${i === currentSlide ? 'text-indigo-400' : 'text-slate-600'}`}>
                              {i + 1}
                            </span>
                            <span className="text-[10px] text-slate-300 truncate leading-tight">{s.title}</span>
                          </button>
                        ))}
                      </div>

                      {/* Export button */}
                      <Button
                        onClick={exportPptx}
                        className="w-full h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-xs font-bold text-slate-300 hover:text-white transition-all"
                        variant="ghost"
                      >
                        <Download size={13} className="mr-2" /> Export PPTX
                      </Button>

                      {/* Brand info */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/3 border border-white/8 rounded-xl">
                        <Palette size={11} className="text-slate-600 shrink-0" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: presentation.brand_theme.primary_color }} />
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: presentation.brand_theme.secondary_color }} />
                          <span className="text-[9px] text-slate-600 truncate">{presentation.brand_theme.college_name || 'Custom theme'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
