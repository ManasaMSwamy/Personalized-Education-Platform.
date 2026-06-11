import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Download, Printer, Sparkles, RefreshCw, Trophy, Star, GraduationCap, CheckCircle2 } from 'lucide-react';
import { DashboardData } from '@/types/dashboard';
import { getOverallAvg } from '@/services/dashboardService';
import { MiniCourse, calcCourseScore } from '@/services/miniCourseServices';
import Groq from 'groq-sdk';

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

export interface CertificateData {
  id: string;
  type: 'quiz' | 'course' | 'overall';
  recipientName: string;
  title: string;
  topic: string;
  score: number;
  grade: string;
  issuedAt: number;
  aiRemark: string;
}

function gradeFromScore(score: number) {
  if (score >= 90) return { grade: 'A+', label: 'Outstanding', color: '#10b981' };
  if (score >= 80) return { grade: 'A',  label: 'Excellent',   color: '#6366f1' };
  if (score >= 70) return { grade: 'B+', label: 'Very Good',   color: '#8b5cf6' };
  if (score >= 60) return { grade: 'B',  label: 'Good',        color: '#f59e0b' };
  return               { grade: 'C',  label: 'Satisfactory', color: '#f97316' };
}

async function generateRemark(name: string, topic: string, score: number, type: string): Promise<string> {
  const res = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Write a single encouraging 1-sentence certificate remark for a student.
Student: ${name}, Topic: ${topic}, Score: ${score}%, Type: ${type}.
Be formal, warm, and specific. No quotes.`,
    }],
    temperature: 0.5,
    max_tokens: 80,
  });
  return res.choices[0]?.message?.content?.trim() ?? `Awarded for outstanding performance in ${topic}.`;
}

function buildCertHTML(cert: CertificateData): string {
  const g = gradeFromScore(cert.score);
  const date = new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const stars = '★'.repeat(Math.round(cert.score / 20)).padEnd(5, '☆');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate — ${cert.recipientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0a1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;padding:20px}
  .cert{width:900px;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);border:2px solid rgba(255,255,255,0.15);border-radius:24px;padding:60px;position:relative;overflow:hidden;box-shadow:0 0 80px rgba(99,102,241,0.3)}
  .cert::before{content:'';position:absolute;inset:8px;border:1px solid rgba(255,255,255,0.08);border-radius:18px;pointer-events:none}
  .corner{position:absolute;width:80px;height:80px;border-color:rgba(255,255,255,0.2);border-style:solid}
  .tl{top:20px;left:20px;border-width:2px 0 0 2px}
  .tr{top:20px;right:20px;border-width:2px 2px 0 0}
  .bl{bottom:20px;left:20px;border-width:0 0 2px 2px}
  .br{bottom:20px;right:20px;border-width:0 2px 2px 0}
  .header{text-align:center;margin-bottom:32px}
  .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:999px;padding:6px 20px;font-size:11px;font-weight:600;color:#a5b4fc;letter-spacing:.15em;text-transform:uppercase;margin-bottom:20px}
  .cert-title{font-family:'Playfair Display',serif;font-size:42px;font-weight:900;color:#fff;letter-spacing:.02em;line-height:1.1}
  .cert-title span{color:#818cf8}
  .divider{width:120px;height:2px;background:linear-gradient(90deg,transparent,#818cf8,transparent);margin:20px auto}
  .presented{font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
  .name{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:#fff;margin:8px 0 4px;text-shadow:0 0 40px rgba(129,140,248,0.5)}
  .topic-line{font-size:15px;color:rgba(255,255,255,0.6);margin-bottom:32px}
  .topic-line strong{color:#c7d2fe}
  .score-row{display:flex;align-items:center;justify-content:center;gap:40px;margin:28px 0}
  .score-box{text-align:center;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px 32px}
  .score-val{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;line-height:1}
  .score-lbl{font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:.12em;margin-top:6px}
  .stars{font-size:22px;letter-spacing:4px;margin:4px 0}
  .remark{font-size:14px;color:rgba(255,255,255,0.65);font-style:italic;text-align:center;max-width:600px;margin:0 auto 32px;line-height:1.7}
  .footer{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;margin-top:8px}
  .sig{text-align:center}
  .sig-line{width:160px;border-top:1px solid rgba(255,255,255,0.3);padding-top:8px;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:.05em}
  .seal{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:3px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 0 30px rgba(99,102,241,0.5)}
  @media print{body{background:#fff;padding:0}.cert{box-shadow:none;border-color:#e2e8f0;background:linear-gradient(135deg,#f8f7ff,#ede9fe,#f0f4ff)}.cert-title,.name{color:#1e1b4b}.cert-title span{color:#4f46e5}.presented,.topic-line,.remark{color:#374151}.score-box{background:#f1f5f9;border-color:#e2e8f0}.score-lbl,.sig-line{color:#6b7280}.divider{background:linear-gradient(90deg,transparent,#4f46e5,transparent)}}
</style>
</head>
<body>
<div class="cert">
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>
  <div class="header">
    <div class="badge">🎓 Certificate of Achievement</div>
    <div class="cert-title">SMART <span>AI TUTOR</span></div>
    <div class="divider"></div>
    <p class="presented">This certificate is proudly presented to</p>
    <div class="name">${cert.recipientName}</div>
    <p class="topic-line">for successfully completing <strong>${cert.topic}</strong></p>
  </div>
  <div class="score-row">
    <div class="score-box">
      <div class="score-val" style="color:${g.color}">${cert.score}%</div>
      <div class="score-lbl">Score</div>
    </div>
    <div class="score-box">
      <div class="score-val" style="color:${g.color}">${g.grade}</div>
      <div class="score-lbl">Grade</div>
      <div class="stars" style="color:${g.color}">${stars}</div>
    </div>
    <div class="score-box">
      <div class="score-val" style="color:${g.color};font-size:32px">${g.label}</div>
      <div class="score-lbl">Classification</div>
    </div>
  </div>
  <p class="remark">"${cert.aiRemark}"</p>
  <div class="footer">
    <div class="sig"><div class="sig-line">Smart AI Tutor Platform</div></div>
    <div class="seal">🏆</div>
    <div class="sig"><div class="sig-line">${date}</div></div>
  </div>
</div>
</body>
</html>`;
}

interface Props {
  userName: string;
  dashboard: DashboardData;
  completedCourses: { course: MiniCourse; score: number }[];
}

export function AICertificates({ userName, dashboard, completedCourses }: Props) {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  const overallAvg = getOverallAvg(dashboard);

  const generateCert = async (
    type: CertificateData['type'],
    topic: string,
    score: number,
    title: string,
  ) => {
    const key = `${type}_${topic}`;
    setGenerating(key);
    try {
      const aiRemark = await generateRemark(userName, topic, score, type);
      const g = gradeFromScore(score);
      const cert: CertificateData = {
        id: `cert_${Date.now()}`,
        type, recipientName: userName, title, topic, score,
        grade: g.grade, issuedAt: Date.now(), aiRemark,
      };
      setCertificates(prev => [cert, ...prev]);
    } finally {
      setGenerating(null);
    }
  };

  const printCert = (cert: CertificateData) => {
    const html = buildCertHTML(cert);
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

  const downloadCert = (cert: CertificateData) => {
    const html = buildCertHTML(cert);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.topic.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sources for certificates
  const quizSources = dashboard.quizResults.map(q => ({
    type: 'quiz' as const,
    topic: q.topic,
    score: q.score,
    title: `Quiz Certificate — ${q.topic}`,
    key: `quiz_${q.topic}_${q.timestamp}`,
  }));

  const courseSources = completedCourses.map(c => ({
    type: 'course' as const,
    topic: c.course.title,
    score: c.score,
    title: `Course Completion — ${c.course.title}`,
    key: `course_${c.course.id}`,
  }));

  const overallSource = overallAvg > 0 ? [{
    type: 'overall' as const,
    topic: 'Overall Learning Achievement',
    score: overallAvg,
    title: 'Overall Performance Certificate',
    key: 'overall',
  }] : [];

  const allSources = [...overallSource, ...courseSources, ...quizSources];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border-white/8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/20 flex items-center justify-center shrink-0">
          <Award size={22} className="text-yellow-400" />
        </div>
        <div>
          <p className="text-sm font-black text-white">AI Certificates</p>
          <p className="text-[11px] text-slate-500">Generate personalized certificates based on your quiz and course performance.</p>
        </div>
      </div>

      {allSources.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 border-white/8 text-center">
          <Trophy size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-500">No performance data yet</p>
          <p className="text-xs text-slate-600 mt-1">Complete quizzes or mini courses to unlock certificates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Available certificates */}
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Certificates</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allSources.map(src => {
              const g = gradeFromScore(src.score);
              const alreadyGenerated = certificates.some(c => c.topic === src.topic && c.type === src.type);
              const isGenerating = generating === `${src.type}_${src.topic}`;
              return (
                <motion.div key={src.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-2xl p-4 border-white/8 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                    style={{ background: `${g.color}20`, border: `1px solid ${g.color}40` }}>
                    {src.type === 'overall' ? '🏆' : src.type === 'course' ? '🎓' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{src.topic}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black" style={{ color: g.color }}>{src.score}% · {g.grade}</span>
                      <span className="text-[9px] text-slate-600 capitalize">{src.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => generateCert(src.type, src.topic, src.score, src.title)}
                    disabled={!!generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 rounded-xl text-[10px] font-black text-indigo-400 uppercase tracking-widest transition-all disabled:opacity-50 shrink-0"
                  >
                    {isGenerating ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {alreadyGenerated ? 'Regenerate' : 'Generate'}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Generated certificates */}
          {certificates.length > 0 && (
            <>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-6">Generated Certificates</p>
              <div className="space-y-3">
                {certificates.map(cert => {
                  const g = gradeFromScore(cert.score);
                  return (
                    <motion.div key={cert.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className="glass-panel rounded-2xl overflow-hidden border-white/8">
                      {/* Certificate preview banner */}
                      <div className="p-6 text-center"
                        style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">
                          <GraduationCap size={10} /> Certificate of Achievement
                        </div>
                        <p className="text-xs text-slate-400 mb-1">This certifies that</p>
                        <p className="text-2xl font-black text-white mb-1">{cert.recipientName}</p>
                        <p className="text-xs text-slate-400">has successfully completed</p>
                        <p className="text-sm font-black text-indigo-300 mt-1">{cert.topic}</p>
                        <div className="flex items-center justify-center gap-6 mt-4">
                          <div className="text-center">
                            <p className="text-2xl font-black" style={{ color: g.color }}>{cert.score}%</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Score</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black" style={{ color: g.color }}>{g.grade}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Grade</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black" style={{ color: g.color }}>{g.label}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Classification</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 italic mt-3 max-w-md mx-auto">"{cert.aiRemark}"</p>
                      </div>
                      {/* Actions */}
                      <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
                        <p className="text-[10px] text-slate-600">
                          {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => downloadCert(cert)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-bold text-slate-300 transition-all">
                            <Download size={11} /> Download
                          </button>
                          <button onClick={() => printCert(cert)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black text-white transition-all">
                            <Printer size={11} /> Print / PDF
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
