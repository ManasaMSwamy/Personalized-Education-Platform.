import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MODEL = 'llama-3.3-70b-versatile';

// ── Types ─────────────────────────────────────────────────────────
export interface CourseLesson {
  id: number;
  title: string;
  content: string;
  keyPoints: string[];
  example: string;
}

export interface CourseQuiz {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface MiniCourse {
  id: string;
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  estimatedTime: string;
  lessons: CourseLesson[];
  quiz: CourseQuiz[];
  createdAt: number;
}

export interface CourseProgress {
  courseId: string;
  completedLessons: number[];
  quizAnswers: Record<number, string>;
  quizScore: number | null;
  quizTotal: number;
  completedAt: number | null;
  certificateIssued: boolean;
}

export interface Certificate {
  studentName: string;
  courseTopic: string;
  courseLevel: string;
  score: number;
  total: number;
  percentage: number;
  grade: string;
  issuedAt: number;
  certificateId: string;
}

// ── Grade calculator ──────────────────────────────────────────────
export function getGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  return 'D';
}

export function getGradeColor(grade: string): string {
  if (grade === 'A+') return '#10b981';
  if (grade === 'A')  return '#6366f1';
  if (grade === 'B')  return '#f59e0b';
  if (grade === 'C')  return '#f97316';
  return '#ef4444';
}

// ── AI course generator ───────────────────────────────────────────
export async function generateMiniCourse(
  topic: string,
  level: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner',
): Promise<MiniCourse> {
  const prompt = `You are an expert academic course designer for engineering and science students.
Create a complete mini-course on: "${topic}" at ${level} level.

Return ONLY valid JSON — no markdown, no explanation.

{
  "description": "2-sentence course description",
  "estimatedTime": "e.g. 45 minutes",
  "lessons": [
    {
      "id": 1,
      "title": "Lesson title",
      "content": "Detailed lesson content in 3-4 paragraphs. Explain clearly with context.",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
      "example": "A concrete real-world example illustrating this lesson"
    },
    {
      "id": 2,
      "title": "Lesson title",
      "content": "Detailed lesson content in 3-4 paragraphs.",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
      "example": "A concrete real-world example"
    },
    {
      "id": 3,
      "title": "Lesson title",
      "content": "Detailed lesson content in 3-4 paragraphs.",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
      "example": "A concrete real-world example"
    },
    {
      "id": 4,
      "title": "Lesson title",
      "content": "Detailed lesson content in 3-4 paragraphs.",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
      "example": "A concrete real-world example"
    },
    {
      "id": 5,
      "title": "Lesson title",
      "content": "Detailed lesson content in 3-4 paragraphs.",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
      "example": "A concrete real-world example"
    }
  ],
  "quiz": [
    {"question": "Question 1?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A) ...", "explanation": "Why this is correct"},
    {"question": "Question 2?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "B) ...", "explanation": "Why this is correct"},
    {"question": "Question 3?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "C) ...", "explanation": "Why this is correct"},
    {"question": "Question 4?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A) ...", "explanation": "Why this is correct"},
    {"question": "Question 5?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "D) ...", "explanation": "Why this is correct"},
    {"question": "Question 6?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "B) ...", "explanation": "Why this is correct"},
    {"question": "Question 7?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "C) ...", "explanation": "Why this is correct"},
    {"question": "Question 8?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A) ...", "explanation": "Why this is correct"},
    {"question": "Question 9?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "D) ...", "explanation": "Why this is correct"},
    {"question": "Question 10?", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "B) ...", "explanation": "Why this is correct"}
  ]
}`;

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  });

  const raw = res.choices[0]?.message?.content ?? '';
  const parsed = JSON.parse(raw);

  return {
    id: `course_${Date.now()}`,
    topic,
    level,
    description: parsed.description,
    estimatedTime: parsed.estimatedTime,
    lessons: parsed.lessons,
    quiz: parsed.quiz,
    createdAt: Date.now(),
  };
}

// ── Certificate canvas renderer ───────────────────────────────────
export function downloadCertificate(cert: Certificate): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 1200, 850);
  bg.addColorStop(0, '#0f0c29');
  bg.addColorStop(0.5, '#302b63');
  bg.addColorStop(1, '#24243e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 850);

  // Outer border
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, 1140, 790);

  // Inner border
  ctx.strokeStyle = 'rgba(99,102,241,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, 1100, 750);

  // Corner decorations
  const corners = [[60, 60], [1140, 60], [60, 790], [1140, 790]];
  corners.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#6366f1';
    ctx.fill();
  });

  // Header badge
  ctx.fillStyle = 'rgba(99,102,241,0.2)';
  roundRect(ctx, 450, 70, 300, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#a5b4fc';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SMART AI TUTOR · LEARNING PLATFORM', 600, 96);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('Certificate of Achievement', 600, 200);

  // Subtitle line
  ctx.fillStyle = 'rgba(99,102,241,0.6)';
  ctx.fillRect(200, 220, 800, 2);

  // "This is to certify that"
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px Georgia';
  ctx.fillText('This is to certify that', 600, 280);

  // Student name
  ctx.fillStyle = '#e0e7ff';
  ctx.font = 'bold 48px Georgia';
  ctx.fillText(cert.studentName, 600, 350);

  // Name underline
  const nameWidth = ctx.measureText(cert.studentName).width;
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(600 - nameWidth / 2, 362, nameWidth, 3);

  // "has successfully completed"
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px Georgia';
  ctx.fillText('has successfully completed the mini-course', 600, 415);

  // Course topic
  ctx.fillStyle = '#818cf8';
  ctx.font = 'bold 34px Georgia';
  ctx.fillText(`"${cert.courseTopic}"`, 600, 470);

  // Level badge
  ctx.fillStyle = 'rgba(99,102,241,0.25)';
  roundRect(ctx, 520, 490, 160, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#a5b4fc';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`${cert.courseLevel} Level`, 600, 513);

  // Score section
  const gradeColor = getGradeColor(cert.grade);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(ctx, 300, 545, 600, 100, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Score text
  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px Arial';
  ctx.fillText('Final Score', 430, 580);
  ctx.fillText('Grade', 770, 580);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(`${cert.score}/${cert.total}  (${cert.percentage}%)`, 430, 625);

  ctx.fillStyle = gradeColor;
  ctx.font = 'bold 48px Arial';
  ctx.fillText(cert.grade, 770, 630);

  // Divider
  ctx.fillStyle = 'rgba(99,102,241,0.4)';
  ctx.fillRect(200, 665, 800, 1);

  // Footer info
  const date = new Date(cert.issuedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  ctx.fillStyle = '#64748b';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Issued: ${date}`, 220, 700);
  ctx.textAlign = 'right';
  ctx.fillText(`Certificate ID: ${cert.certificateId}`, 980, 700);

  // Seal
  ctx.textAlign = 'center';
  ctx.beginPath();
  ctx.arc(600, 760, 45, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99,102,241,0.15)';
  ctx.fill();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('✓', 600, 770);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Arial';
  ctx.fillText('VERIFIED', 600, 790);

  // Download
  const link = document.createElement('a');
  link.download = `Certificate_${cert.studentName.replace(/\s+/g, '_')}_${cert.courseTopic.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Local storage helpers ─────────────────────────────────────────
const COURSES_KEY = 'smart_tutor_courses';
const PROGRESS_KEY = 'smart_tutor_progress';
const CERTS_KEY = 'smart_tutor_certificates';

export function saveCourse(course: MiniCourse): void {
  const courses = loadCourses();
  courses.unshift(course);
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses.slice(0, 20)));
}

export function loadCourses(): MiniCourse[] {
  try { return JSON.parse(localStorage.getItem(COURSES_KEY) || '[]'); } catch { return []; }
}

export function saveProgress(progress: CourseProgress): void {
  const all = loadAllProgress();
  const idx = all.findIndex(p => p.courseId === progress.courseId);
  if (idx >= 0) all[idx] = progress; else all.push(progress);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

export function loadProgress(courseId: string): CourseProgress {
  const all = loadAllProgress();
  return all.find(p => p.courseId === courseId) ?? {
    courseId, completedLessons: [], quizAnswers: {},
    quizScore: null, quizTotal: 0, completedAt: null, certificateIssued: false,
  };
}

function loadAllProgress(): CourseProgress[] {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]'); } catch { return []; }
}

export function saveCertificate(cert: Certificate): void {
  const certs = loadCertificates();
  certs.unshift(cert);
  localStorage.setItem(CERTS_KEY, JSON.stringify(certs.slice(0, 50)));
}

export function loadCertificates(): Certificate[] {
  try { return JSON.parse(localStorage.getItem(CERTS_KEY) || '[]'); } catch { return []; }
}
