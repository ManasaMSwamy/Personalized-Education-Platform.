import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Printer, Sparkles, RefreshCw } from 'lucide-react';
import Groq from 'groq-sdk';

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

export interface CertTrigger {
  recipientName: string;
  topic: string;
  score: number;
  type: 'quiz' | 'course';
}

function gradeFromScore(score: number) {
  if (score >= 90) return { grade: 'A+', label: 'Outstanding',   color: '#10b981' };
  if (score >= 80) return { grade: 'A',  label: 'Excellent',     color: '#6366f1' };
  if (score >= 70) return { grade: 'B+', label: 'Very Good',     color: '#8b5cf6' };
  if (score >= 60) return { grade: 'B',  label: 'Good',          color: '#f59e0b' };
  return               { grade: 'C',  label: 'Satisfactory',   color: '#f97316' };
}

function buildHTML(name: string, topic: string, score: number, remark: string): string {
  const g = gradeFromScore(score);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const stars = '★'.repeat(Math.round(score / 20)).padEnd(5, '☆');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Certificate — ${name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;padding:20px}
.cert{width:860px;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);border:2px solid rgba(255,255,255,0.15);border-radius:20px;padding:56px;position:relative;overflow:hidden}
.cert::before{content:'';position:absolute;inset:8px;border:1px solid rgba(255,255,255,0.07);border-radius:14px;pointer-events:none}
.c{position:absolute;width:72px;height:72px;border-color:rgba(255,255,255,0.18);border-style:solid}
.tl{top:18px;left:18px;border-width:2px 0 0 2px}.tr{top:18px;right:18px;border-width:2px 2px 0 0}
.bl{bottom:18px;left:18px;border-width:0 0 2px 2px}.br{bottom:18px;right:18px;border-width:0 2px 2px 0}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.4);border-radius:999px;padding:5px 18px;font-size:10px;color:#a5b4fc;letter-spacing:.15em;text-transform:uppercase;margin-bottom:18px}
h1{font-size:38px;color:#fff;letter-spacing:.02em;line-height:1.1;margin-bottom:4px}
h1 span{color:#818cf8}
.div{width:100px;height:2px;background:linear-gradient(90deg,transparent,#818cf8,transparent);margin:16px auto}
.sub{font-size:12px;color:rgba(255,255,255,.45);letter-spacing:.1em;text-transform:uppercase}
.name{font-size:46px;color:#fff;margin:8px 0 4px;text-shadow:0 0 40px rgba(129,140,248,.5)}
.topic{font-size:14px;color:rgba(255,255,255,.55);margin-bottom:28px}
.topic strong{color:#c7d2fe}
.row{display:flex;justify-content:center;gap:32px;margin:24px 0}
.box{text-align:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px 28px}
.val{font-size:44px;font-weight:700;line-height:1}
.lbl{font-size:9px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.12em;margin-top:5px}
.stars{font-size:20px;letter-spacing:3px;margin:3px 0}
.remark{font-size:13px;color:rgba(255,255,255,.6);font-style:italic;text-align:center;max-width:560px;margin:0 auto 28px;line-height:1.7}
.foot{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid rgba(255,255,255,.07);padding-top:22px}
.sig{text-align:center}
.sl{width:150px;border-top:1px solid rgba(255,255,255,.25);padding-top:7px;font-size:10px;color:rgba(255,255,255,.35);letter-spacing:.05em}
.seal{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:3px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:28px}
@media print{body{background:#fff;padding:0}.cert{background:linear-gradient(135deg,#f8f7ff,#ede9fe);border-color:#e2e8f0}h1,.name{color:#1e1b4b}h1 span{color:#4f46e5}.sub,.topic,.remark{color:#374151}.box{background:#f1f5f9;border-color:#e2e8f0}.lbl,.sl{color:#6b7280}}
</style></head><body>
<div class="cert">
<div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
<div style="text-align:center;margin-bottom:28px">
  <div class="badge">🎓 Certificate of Achievement</div>
  <h1>SMART <span>AI TUTOR</span></h1>
  <div class="div"></div>
  <p class="sub">This certificate is proudly presented to</p>
  <div class="name">${name}</div>
  <p class="topic">for successfully completing <strong>${topic}</strong></p>
</div>
<div class="row">
  <div class="box"><div class="val" style="color:${g.color}">${score}%</div><div class="lbl">Score</div></div>
  <div class="box"><div class="val" style="color:${g.color}">${g.grade}</div><div class="lbl">Grade</div><div class="stars" style="color:${g.color}">${stars}</div></div>
  <div class="box"><div class="val" style="color:${g.color};font-size:28px">${g.label}</div><div class="lbl">Classification</div></div>
</div>
<p class="remark">"${remark}"</p>
<div class="foot">
  <div class="sig"><div class="sl">Smart AI Tutor Platform</div></div>
  <div class="seal">🏆</div>
  <div class="sig"><div class="sl">${date}</div></div>
</div>
</div></body></html>`;
}

interface Props {
  trigger: CertTrigger | null;
  onClose: () => void;
}

export function CertificatePopup({ trigger, onClose }: Props) {
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setRemark('');
    setLoading(true);
    client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Write one formal, warm, encouraging certificate remark (1 sentence, no quotes) for:
Student: ${trigger.recipientName}, Topic: ${trigger.topic}, Score: ${trigger.score}%, Type: ${trigger.type}.`,
      }],
      temperature: 0.5,
      max_tokens: 80,
    }).then(res => {
      setRemark(res.choices[0]?.message?.content?.trim() ?? `Awarded for outstanding performance in ${trigger.topic}.`);
    }).catch(() => {
      setRemark(`Awarded for outstanding performance in ${trigger.topic}.`);
    }).finally(() => setLoading(false));
  }, [trigger]);

  const handlePrint = () => {
    if (!trigger) return;
    const html = buildHTML(trigger.recipientName, trigger.topic, trigger.score, remark);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;';
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 1000);
    };
    iframe.src = url;
  };

  const handleDownload = () => {
    if (!trigger) return;
    const html = buildHTML(trigger.recipientName, trigger.topic, trigger.score, remark);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${trigger.topic.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!trigger) return null;

  const g = gradeFromScore(trigger.score);
  const stars = '★'.repeat(Math.round(trigger.score / 20)).padEnd(5, '☆');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg relative"
        >
          {/* Glow */}
          <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
            style={{ background: `radial-gradient(circle, ${g.color}40, transparent 70%)` }} />

          <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>

            {/* Corner decorations */}
            {[['top-3 left-3', '2px 0 0 2px'], ['top-3 right-3', '2px 2px 0 0'],
              ['bottom-3 left-3', '0 0 2px 2px'], ['bottom-3 right-3', '0 2px 2px 0']].map(([pos, bw], i) => (
              <div key={i} className={`absolute ${pos} w-10 h-10`}
                style={{ borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'solid', borderWidth: bw }} />
            ))}

            {/* Close */}
            <button onClick={onClose}
              className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <X size={13} className="text-white" />
            </button>

            <div className="p-8 text-center space-y-4">
              {/* Confetti emoji burst */}
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
                className="text-5xl mb-2"
              >🎉</motion.div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                🎓 Certificate of Achievement
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">This certifies that</p>
                <p className="text-3xl font-black text-white mt-1">{trigger.recipientName}</p>
                <p className="text-xs text-slate-400 mt-1">has successfully completed</p>
                <p className="text-base font-black mt-1" style={{ color: g.color }}>{trigger.topic}</p>
              </div>

              {/* Score row */}
              <div className="flex items-center justify-center gap-4">
                {[
                  { val: `${trigger.score}%`, lbl: 'Score' },
                  { val: g.grade, lbl: 'Grade' },
                  { val: g.label, lbl: 'Classification' },
                ].map(s => (
                  <div key={s.lbl} className="text-center px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xl font-black" style={{ color: g.color }}>{s.val}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{s.lbl}</p>
                  </div>
                ))}
              </div>

              <p className="text-lg" style={{ color: g.color }}>{stars}</p>

              {/* AI Remark */}
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 min-h-[48px] flex items-center justify-center">
                {loading
                  ? <div className="flex items-center gap-2 text-xs text-slate-500"><RefreshCw size={12} className="animate-spin" /> Generating remark...</div>
                  : <p className="text-xs text-slate-300 italic">"{remark}"</p>
                }
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/15 hover:bg-white/10 rounded-xl text-xs font-black text-slate-300 uppercase tracking-widest transition-all">
                  <Download size={13} /> Download
                </button>
                <button onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all"
                  style={{ background: `linear-gradient(135deg, #4f46e5, #7c3aed)` }}>
                  <Printer size={13} /> Print / PDF
                </button>
              </div>

              <button onClick={onClose} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                Close and continue learning
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
