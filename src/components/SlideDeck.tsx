import React, { useState } from 'react';
import { Presentation, Slide as SlideType } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, Play, RotateCcw, HelpCircle, CheckCircle2, Sparkles, User, Users, ArrowRight, Layers, GitBranch, Table as TableIcon, Database, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import PptxGenJS from 'pptxgenjs';

interface SlideDeckProps {
  presentation: Presentation;
  onReset: () => void;
  onToggleChat?: () => void;
}

export function SlideDeck({ presentation, onReset, onToggleChat }: SlideDeckProps) {
  const toggleChat = onToggleChat || (() => {});
  const audience = presentation.audience || 'school';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  
  
  const regularSlidesCount = presentation.slides?.length || 0;
  const maxNavigableSlide = regularSlidesCount;

  const getAudienceStyle = (baseClass: string) => {
    switch (audience) {
      case 'school':
        return `${baseClass} bg-gradient-to-br from-yellow-400/30 via-orange-400/20 to-pink-400/30 border-yellow-400/50 text-yellow-100 shadow-[0_0_30px_rgba(255,193,7,0.4)] rounded-3xl p-6 !font-comic`;
      case 'college':
        return `${baseClass} bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-blue-500/20 border-indigo-400/40 text-indigo-200 shadow-[0_0_25px_rgba(99,102,241,0.3)]`;
      default:
        return `${baseClass} bg-gradient-to-br from-slate-800/50 via-gray-800/30 to-slate-900/50 border-slate-600/40 text-slate-200 shadow-[0_0_20px_rgba(148,163,184,0.2)] !backdrop-blur-sm`;
    }
  };

  const getAudienceIcon = (icon: React.ReactNode) => {
    switch (audience) {
      case 'school':
        return <span className="text-2xl">🎓</span>;
      default:
        return icon;
    }
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return match?.[1] ?? null;
  };

  const normalizeFileName = (value: string) => value
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
    .replace(/ /g, '-');

  const exportPresentationToPptx = async () => {
    try {
      const pptx = new PptxGenJS();
      pptx.author = 'EDUSLIDE ULTRA';
      pptx.company = presentation.brand_theme.college_name || 'EDUSLIDE';
      pptx.title = presentation.presentation_title;
      pptx.layout = 'LAYOUT_WIDE';

      presentation.slides.forEach((slide) => {
        const pptSlide = pptx.addSlide();
        pptSlide.addText(slide.title, {
          x: 0.5,
          y: 0.4,
          w: 12,
          h: 1,
          fontSize: 32,
          bold: true,
          color: '363636',
          align: 'left',
        });

        if (slide.content && slide.content.length) {
          pptSlide.addText(slide.content.map((line) => `• ${line}`).join('\n'), {
            x: 0.5,
            y: 1.6,
            w: 6.5,
            h: 4.5,
            fontSize: 18,
            color: '1f2937',
            align: 'left',
            bullet: true,
            lineSpacing: 24,
          });
        }

        if (slide.video_url) {
          const snippetY = 2.2;
          const videoId = getYouTubeId(slide.video_url);
          pptSlide.addShape(pptx.ShapeType.rect, {
            x: 7.2,
            y: snippetY,
            w: 4.8,
            h: 2.8,
            fill: { color: '000000', transparency: 50 },
            line: { color: 'ffffff', width: 1.5 },
          });
          pptSlide.addText('▶ Watch this YouTube video', {
            x: 7.4,
            y: snippetY + 0.5,
            w: 4.4,
            h: 0.8,
            fontSize: 16,
            bold: true,
            color: 'ffffff',
            align: 'center',
            hyperlink: { url: slide.video_url },
          });
          pptSlide.addText('Click the link to open the video in your browser.', {
            x: 7.4,
            y: snippetY + 1.4,
            w: 4.4,
            h: 1.2,
            fontSize: 12,
            color: 'ffffff',
            align: 'center',
          });

          if (videoId) {
            pptSlide.addText(`Video ID: ${videoId}`, {
              x: 7.4,
              y: snippetY + 2.1,
              w: 4.4,
              h: 0.6,
              fontSize: 10,
              color: 'd1d5db',
              align: 'center',
            });
          }
        }

        if (slide.speaker_notes) {
          pptSlide.addNotes(slide.speaker_notes);
        }
      });

      const fileName = `${normalizeFileName(presentation.presentation_title || 'eduslide') || 'eduslide'}-presentation.pptx`;
      await pptx.writeFile({ fileName });
    } catch (error) {
      console.error('PPTX export failed:', error);
      window.alert('Unable to export PPTX with video integration. Please try again.');
    }
  };

  const handleImageError = (slideIdx: number) => {
    setImageErrors(prev => ({ ...prev, [slideIdx]: true }));
  };

  const nextSlide = () => {
    if (currentSlide < maxNavigableSlide) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const primaryColor = presentation.brand_theme.primary_color || '#4f46e5';
  const secondaryColor = presentation.brand_theme.secondary_color || '#ec4899';

  const renderChart = (slide: SlideType) => {
    if (!slide || !slide.chart_data || !slide.chart_data.data) return null;
    const { type, data } = slide.chart_data;
    const max = Math.max(1, ...(data || []).map(d => d?.value || 0));
    const colors = [primaryColor, secondaryColor, '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

    if (type === 'pie') {
      const total = (data || []).reduce((s, d) => s + (d?.value || 0), 0);
      let cumAngle = 0;
      const slices = (data || []).map((d, i) => {
        const angle = (d.value / total) * 360;
        const start = cumAngle;
        cumAngle += angle;
        const r = 90;
        const cx = 110; const cy = 110;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const x1 = cx + r * Math.cos(toRad(start - 90));
        const y1 = cy + r * Math.sin(toRad(start - 90));
        const x2 = cx + r * Math.cos(toRad(start + angle - 90));
        const y2 = cy + r * Math.sin(toRad(start + angle - 90));
        const large = angle > 180 ? 1 : 0;
        return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: colors[i % colors.length], label: d.label, value: d.value };
      });
      return (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="glass-panel p-6 rounded-3xl border-white/10 bg-white/5 self-start w-fit">
          <h4 className="text-[10px] font-black text-pink-400 uppercase tracking-[0.3em] mb-4">📊 Chart</h4>
          <div className="flex items-center gap-6">
            <svg viewBox="0 0 220 220" className="w-52 h-52 shrink-0">
              {slices.map((s, i) => (
                <motion.path key={i} d={s.path} fill={s.color} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} />
              ))}
            </svg>
            <div className="space-y-3">
              {slices.map((s, i) => (
                <motion.div key={i} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-2 text-sm text-slate-300">
                  <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}: <span className="text-white font-bold">{s.value}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-panel p-8 rounded-3xl border-white/10 bg-white/5 self-start w-full mt-10">
        <h4 className="text-xs font-black text-pink-400 uppercase tracking-[0.3em] mb-6">📊 {type === 'line' ? 'Trend' : 'Chart'}</h4>
        <div className="flex items-end gap-4" style={{ height: '220px' }}>
  {(data || []).map((d: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-xs text-white/60 mb-1">{d.value}</span>
              <motion.div
                className="w-full rounded-t-lg"
                style={{ backgroundColor: colors[i % colors.length] }}
                initial={{ height: 0 }}
                animate={{ height: `${Math.round((d.value / max) * 180)}px` }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
              />
              <span className="text-[10px] text-white/40 text-center truncate w-full mt-1">{d.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderFlowChart = (slide: SlideType) => {
    if (!slide || !slide.flow_chart || !slide.flow_chart.steps) return null;
    const { steps } = slide.flow_chart;
    const shapeClass = (type: string) => {
      if (type === 'start' || type === 'end') return 'rounded-full bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
      if (type === 'decision') return 'rotate-45 bg-amber-500/20 border-amber-500/40 text-amber-300';
      return 'rounded-xl bg-indigo-500/20 border-indigo-500/40 text-indigo-300';
    };
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={getAudienceStyle("glass-panel p-8 rounded-3xl border-white/10 bg-white/5 self-end w-full ml-auto")}>
          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">{getAudienceIcon(<GitBranch size={18} />)} Flow Chart</h4>
        <div className="flex flex-col items-center gap-0">
          {(steps || []).map((step, i) => (
            <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="flex flex-col items-center w-full">
              <div className={`border-2 px-8 py-5 text-base font-bold text-center w-fit min-w-[60%] ${shapeClass(step.type)}`}>
                <span className={step.type === 'decision' ? '-rotate-45 block text-sm' : ''}>{step.text}</span>
              </div>
              {i < steps.length - 1 && (
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.15 + 0.1 }} className="w-1.5 h-10 bg-white/30 origin-top" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderERDiagram = (slide: SlideType) => {
    if (!slide?.er_diagram?.entities?.length) return null;
    const { entities, relations } = slide.er_diagram;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={getAudienceStyle("glass-panel p-6 rounded-3xl border-white/10 bg-white/5 self-start w-full")}>
        <h4 className="text-xs font-black text-purple-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">{getAudienceIcon(<Database size={16} />)} ER Diagram</h4>
        <div className="flex flex-wrap gap-4">
          {entities.map((entity) => (
            <div key={entity.id} className="border border-purple-500/40 rounded-xl overflow-hidden min-w-[140px]">
              <div className="bg-purple-500/20 px-4 py-2 text-sm font-bold text-purple-200 text-center">{entity.name}</div>
              <ul className="px-4 py-2 space-y-1">{entity.attributes.map((attr, i) => <li key={i} className="text-xs text-slate-400">{attr}</li>)}</ul>
            </div>
          ))}
        </div>
        {relations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {relations.map((rel, i) => (
              <span key={i} className="text-[10px] text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {rel.from} <ArrowRight size={10} className="inline" /> {rel.to}{rel.label ? ` (${rel.label})` : ''}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const renderArchitecture = (slide: SlideType) => {
    if (!slide?.architecture?.nodes?.length) return null;
    const { nodes, edges } = slide.architecture;
    const nodeColors: Record<string, string> = { service: 'indigo', database: 'emerald', client: 'pink', api: 'amber', default: 'slate' };
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={getAudienceStyle("glass-panel p-6 rounded-3xl border-white/10 bg-white/5 self-start w-full")}>
        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">{getAudienceIcon(<Layers size={16} />)} Architecture</h4>
        <div className="flex flex-wrap gap-3 mb-4">
          {nodes.map((node) => {
            const c = nodeColors[node.type] || nodeColors.default;
            return (
              <div key={node.id} className={`px-4 py-2 rounded-xl border border-${c}-500/40 bg-${c}-500/10 text-${c}-300 text-xs font-bold`}>{node.label}</div>
            );
          })}
        </div>
        {edges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {edges.map((edge, i) => (
              <span key={i} className="text-[10px] text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {edge.from} <ArrowRight size={10} className="inline" /> {edge.to}{edge.label ? `: ${edge.label}` : ''}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const renderVideo = (slide: SlideType) => {
    if (!slide.video_url) return null;
    const videoId = slide.video_url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1];
    if (!videoId) return null;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className={getAudienceStyle("glass-panel rounded-3xl overflow-hidden border-white/10 self-start w-full")}>
        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] p-4 pb-2 flex items-center gap-2">{getAudienceIcon("▶")} Auto {audience.toUpperCase()} Video</h4>
        <div className="relative" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </motion.div>
    );
  };

  const renderVisuals = (slide: SlideType) => {
    if (renderVideo(slide)) return renderVideo(slide);
    if (renderChart(slide)) return renderChart(slide);
    if (renderFlowChart(slide)) return renderFlowChart(slide);
    if (renderERDiagram(slide)) return renderERDiagram(slide);
    if (renderArchitecture(slide)) return renderArchitecture(slide);
    if (slide.table_data && slide.table_data.headers && slide.table_data.rows) return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={getAudienceStyle("glass-panel overflow-hidden rounded-3xl border-white/10 bg-white/5 self-start w-full")}>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr>{slide.table_data.headers.map((h, i) => <th key={i} className="pb-4 text-xs font-black text-white/40 uppercase tracking-widest border-b border-white/10 pr-6">{h}</th>)}</tr></thead>
            <tbody>{slide.table_data.rows.map((row, i) => <tr key={i} className="group">{row.map((cell, j) => <td key={j} className="py-4 text-sm text-slate-300 border-b border-white/5 group-last:border-0 pr-6">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </motion.div>
    );
    if (currentSlide >= 3 && slide.image_url && !imageErrors[currentSlide]) return (
      <motion.img
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        src={slide.image_url}
        alt={slide.title}
        className="w-3/4 rounded-2xl object-cover max-h-56 ml-0 self-start"
        onError={() => handleImageError(currentSlide)}
      />
    );
    return null;
  };

  const renderSlideContent = () => {
    // Title Slide
    if (currentSlide === 0) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative h-full flex items-center justify-center overflow-hidden bg-slate-950"
          key="title-slide"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-[120px]"
              style={{ background: primaryColor }}
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [90, 0, 90],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-[120px]"
              style={{ background: secondaryColor }}
            />
          </div>

          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-1" />

          {/* Top bar: college logo | college name | dept logo */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4">
            <div className="flex-1 flex justify-start">
              {presentation.brand_theme.college_logo_url && (
                <img src={presentation.brand_theme.college_logo_url} alt="College Logo" className="h-24 w-auto object-contain" />
              )}
            </div>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex-1 text-center text-2xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg"
            >
              {presentation.brand_theme.college_name}
            </motion.p>
            <div className="flex-1 flex justify-end">
              {presentation.brand_theme.department_logo_url && (
                <img src={presentation.brand_theme.department_logo_url} alt="Dept Logo" className="h-24 w-auto object-contain" />
              )}
            </div>
          </div>

          {/* Main content: title left, submission card pinned to right */}
          <div className="relative z-10 w-full h-full flex items-center px-10 pt-28">
            {/* Left: Title */}
            <div className="flex-1 space-y-8 text-left pr-8">
              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white leading-[0.9] drop-shadow-2xl"
              >
                {presentation.presentation_title}
              </motion.h1>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="h-1.5 w-48 rounded-full origin-left"
                style={{ backgroundColor: primaryColor, boxShadow: `0 0 20px ${primaryColor}` }}
              />
            </div>

            {/* Right: Submission card pinned to right edge */}
            <motion.div
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="glass-panel p-10 rounded-[2.5rem] border-white/10 bg-white/5 space-y-8 relative overflow-hidden shrink-0 w-[440px] mr-0"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={80} className="text-white" />
              </div>
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500/30 text-indigo-300">
                    <User size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/50 uppercase tracking-[0.3em]">Submitted By</p>
                    <p className="text-2xl font-bold text-white">{presentation.brand_theme.submitted_by || 'Academic Scholar'}</p>
                  </div>
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/30 text-emerald-300">
                    <Users size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/50 uppercase tracking-[0.3em]">Submitted To</p>
                    <p className="text-2xl font-bold text-white">{presentation.brand_theme.submitted_to || 'Department Faculty'}</p>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <div className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-widest">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Pedagogical Content
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    // Pedagogy Section Slide
    let pedagogySlideIdx = presentation.slides.length + 1;
    if (presentation.pedagogy_section && currentSlide === pedagogySlideIdx) {
      const p = presentation.pedagogy_section;
      return (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="h-full p-16 flex flex-col bg-slate-950"
          key={`pedagogy-${currentSlide}`}
        >
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl neon-glow text-white" style={{ backgroundColor: primaryColor }}>
                <HelpCircle size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black font-display text-white tracking-tight uppercase">
                Pedagogy <span style={{ color: primaryColor }}>Intelligence</span>
              </h2>
            </div>
            <Badge className="bg-white/5 text-white/60 border-white/10 px-4 py-1 uppercase tracking-widest text-[10px]">
              {p.mode} Mode
            </Badge>
          </div>
          
          <ScrollArea className="flex-1 pr-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="glass-panel p-8 rounded-[2rem] border-white/5">
                  <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    Strategy
                  </h3>
                  <p className="text-slate-300 leading-relaxed">{p.strategy_description}</p>
                </div>
                
                {p.quiz && (
                  <div className="glass-panel p-8 rounded-[2rem] border-white/5">
                    <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                      Assessment
                    </h3>
                    <div className="space-y-6">
                      {p.quiz.map((q, idx) => (
                        <div key={idx} className="space-y-3">
                          <p className="text-white font-medium">{q.question}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="p-2 bg-white/5 rounded-lg text-xs text-slate-400 border border-white/5">
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {p.activities && (
                  <div className="glass-panel p-8 rounded-[2rem] border-white/5">
                    <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    Activities
                  </h3>
                  <ul className="space-y-4">
                    {p.activities.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 size={18} className="text-emerald-500 mt-1 flex-shrink-0" />
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>
                )}
                {p.discussion_prompts && (
                  <div className="glass-panel p-8 rounded-[2rem] border-white/5">
                    <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                      Inquiry
                    </h3>
                    <ul className="space-y-4">
                      {p.discussion_prompts.map((prompt, idx) => (
                        <li key={idx} className="p-3 bg-white/5 rounded-xl border-l-2 border-indigo-500 text-slate-300 italic">
                          "{prompt}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      );
    }

    // Data Source Summary Slide
    let dataSourceSlideIdx = presentation.slides.length + 1 + (presentation.pedagogy_section ? 1 : 0);
    if (presentation.data_source_summary && currentSlide === dataSourceSlideIdx) {
      const ds = presentation.data_source_summary;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="h-full p-16 flex flex-col bg-slate-950 items-center justify-center text-center"
          key={`datasource-${currentSlide}`}
        >
          <div className="max-w-3xl space-y-8">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-6 py-2 uppercase tracking-[0.3em] text-xs">
              Knowledge Extraction Summary
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black font-display text-white tracking-tight">
              Sources <span className="text-emerald-500">Synthesized</span>
            </h2>
            <div className="glass-panel p-12 rounded-[3rem] border-white/5 space-y-6">
              <p className="text-2xl text-slate-300 font-light leading-relaxed">
                {ds.summary}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {ds.sources_used.map((source, idx) => (
                  <Badge key={idx} variant="outline" className="px-4 py-1 border-white/10 text-white/40">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Regular Slides - BULLETPROOF VERSION
    const slideIndex = currentSlide - 1;
    console.log('Rendering slide', currentSlide, 'index', slideIndex, 'regularSlidesCount', regularSlidesCount, 'slides length', presentation.slides?.length);
    const slide = presentation.slides && Array.isArray(presentation.slides) && presentation.slides[slideIndex];
    if (!slide) {
      console.error('SLIDE MISSING:', slideIndex, presentation.slides?.length);
      return (
        <motion.div
          key={`slide-missing-${currentSlide}`}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-12 border-4 border-yellow-500/30 rounded-3xl"
        >
          <div className="text-center space-y-6 max-w-lg mx-auto bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <Sparkles className="w-24 h-24 text-yellow-400 mx-auto animate-pulse shadow-2xl" />
            <h2 className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent tracking-tight drop-shadow-lg">DEMO SLIDE {currentSlide}</h2>
            <div className="space-y-3 text-white/90">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-bold">Regular slides:</span> {regularSlidesCount}</div>
                <div><span className="font-bold">Audience:</span> <Badge variant="secondary" className="ml-1 bg-yellow-500/20 text-yellow-200 border-yellow-500/50">{audience}</Badge></div>
              </div>
              <p className="text-lg opacity-80 italic">Generation complete? Check console for errors. Try regenerate!</p>
            </div>
            <div className="flex gap-3 justify-center pt-6">
              <Button onClick={prevSlide} variant="outline" className="border-yellow-400 text-yellow-300 hover:bg-yellow-500/20">
                <ChevronLeft size={20} className="mr-2" />
                Previous
              </Button>
              <Button onClick={nextSlide} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg">
                Next Slide
              </Button>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={`slide-${currentSlide}`}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="h-full flex flex-col bg-slate-950 relative overflow-hidden"
      >
        {/* Top-right: slide number only */}
        <div className="absolute top-0 right-0 p-4 z-20 flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-6xl font-black text-white/5 font-display leading-none">{slide.slide_number}</span>
            <Badge variant="outline" className="mt-[-10px] bg-white/5 text-white/40 border-white/10 px-2 py-0.5 text-[8px] font-bold tracking-widest uppercase">
              Module Segment
            </Badge>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          {/* Left: Text Content */}
          <div className="lg:col-span-5 p-8 flex flex-col justify-center z-10 overflow-hidden border-r border-white/5">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-6 py-4">
                <motion.h2
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-3xl md:text-4xl font-black font-display tracking-tighter leading-tight"
                  style={{ color: presentation.brand_theme.primary_color }}
                >
                  {slide.title}
                </motion.h2>
                <ul className="space-y-4">
                  {slide.content.map((point, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="flex items-start gap-3 text-base text-slate-300 font-light leading-relaxed"
                    >
                      <div className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: secondaryColor, boxShadow: `0 0 8px ${secondaryColor}` }} />
                      {point}
                    </motion.li>
                  ))}
                </ul>

              </div>
            </ScrollArea>
          </div>

          {/* Right: Visuals */}
          <div className="lg:col-span-7 pr-0 pl-6 py-6 overflow-hidden">
            <ScrollArea className="h-full">
              {renderVisuals(slide)}
            </ScrollArea>
          </div>
        </div>

        {/* Speaker Notes Toggle */}
        <div className="absolute bottom-6 right-6 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            className="bg-slate-900/80 backdrop-blur-md border border-white/10 text-white/60 hover:text-white rounded-full px-4"
          >
            <Sparkles size={14} className="mr-2" />
            {showSpeakerNotes ? 'Hide Notes' : 'Speaker Notes'}
          </Button>
        </div>

        {/* Speaker Notes Overlay */}
        <AnimatePresence>
          {showSpeakerNotes && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-0 inset-x-0 p-8 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 z-40"
            >
              <div className="max-w-4xl mx-auto flex items-start gap-6">
                <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded border border-indigo-500/30 mt-1">
                  Voice Guidance
                </div>
                <p className="text-lg text-slate-300 font-medium leading-relaxed italic">
                  "{slide.speaker_notes}"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8">
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            onClick={onReset} 
            className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl px-4"
          >
            <RotateCcw size={18} className="mr-2" />
            <span className="text-xs font-bold uppercase tracking-widest">Reset System</span>
          </Button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Active Deployment: <span className="text-slate-300">{presentation.presentation_title}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest"
            onClick={exportPresentationToPptx}
          >
            <Download size={16} className="mr-2" />
            Export Presentation
          </Button>
          <Button
            onClick={toggleChat}
            variant="ghost"
            size="icon"
            className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 hover:text-white rounded-xl"
          >
            <MessageCircle size={18} />
          </Button>
          
        </div>
      </div>

      <div className="relative aspect-[21/9] lg:aspect-video glass-panel rounded-[3rem] overflow-hidden group border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        <AnimatePresence mode="wait">
          {renderSlideContent()}
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-slate-900/80 backdrop-blur-2xl px-8 py-4 rounded-3xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="rounded-2xl hover:bg-white/10 text-white disabled:opacity-20"
          >
            <ChevronLeft size={28} />
          </Button>
          
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-display text-white">{currentSlide + 1}</span>
              <span className="text-slate-600 font-display">/</span>
              <span className="text-lg font-bold text-slate-500">{maxNavigableSlide + 1}</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
              <motion.div 
                className="h-full"
                style={{ backgroundColor: primaryColor }}
                initial={{ width: 0 }}
                animate={{ width: `${((currentSlide + 1) / (maxNavigableSlide + 1)) * 100}%` }}
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            disabled={currentSlide === maxNavigableSlide}
            className="rounded-2xl hover:bg-white/10 text-white disabled:opacity-20"
          >
            <ChevronRight size={28} />
          </Button>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: maxNavigableSlide + 1 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-1 rounded-full transition-all duration-500 ${
              idx === currentSlide ? 'w-12 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'w-4 bg-white/10 hover:bg-white/20'
            }`}
            style={{ backgroundColor: idx === currentSlide ? primaryColor : undefined }}
          />
        ))}
      </div>
    </div>
  );
}

