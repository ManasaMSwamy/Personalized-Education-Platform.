import { EmotionType, EmotionEvent } from '../types/dashboard';

// ── Keyword maps ──────────────────────────────────────────────────
const PATTERNS: Record<EmotionType, RegExp> = {
  confused: /\b(confus|don'?t understand|not clear|unclear|what does|what is|huh|lost|makes no sense|i don'?t get|can'?t follow|what do you mean|explain again|still don'?t|no idea|help me understand|i'?m stuck|stuck on)\b/i,
  frustrated: /\b(frustrat|annoying|annoyed|this is hard|too hard|impossible|give up|hate this|ugh|argh|why is this|so difficult|doesn'?t make sense|waste of time|useless|not working|i can'?t|can'?t do this|this sucks)\b/i,
  confident: /\b(i (know|understand|get it|got it)|makes sense|clear now|i see|that'?s right|correct|exactly|perfect|easy|simple|i think i|got it|understood|yes!|great|awesome|i'?m good)\b/i,
  curious: /\b(why|how does|what if|tell me more|interesting|curious|wonder|can you explain|what about|how about|what happens|could you|would you|is it possible|what else|more about)\b/i,
  bored: /\b(boring|bored|not interesting|skip|next topic|move on|already know|too easy|i know this|repeat|same thing|again\?)\b/i,
  neutral: /.*/,
};

const PRIORITY: EmotionType[] = ['frustrated', 'confused', 'confident', 'curious', 'bored', 'neutral'];

// ── Detector ──────────────────────────────────────────────────────
export function detectEmotion(text: string): EmotionEvent {
  const lower = text.toLowerCase();
  for (const emotion of PRIORITY) {
    if (emotion === 'neutral') continue;
    const match = PATTERNS[emotion].exec(lower);
    if (match) {
      // Confidence based on how many keyword matches
      const allMatches = lower.match(new RegExp(PATTERNS[emotion].source, 'gi')) ?? [];
      const confidence = Math.min(1, 0.6 + allMatches.length * 0.15);
      return { emotion, confidence, message: text, timestamp: Date.now() };
    }
  }
  return { emotion: 'neutral', confidence: 0.5, message: text, timestamp: Date.now() };
}

// ── Emotion metadata ──────────────────────────────────────────────
export const EMOTION_META: Record<EmotionType, {
  label: string; emoji: string; color: string; bgColor: string; borderColor: string;
}> = {
  confused:   { label: 'Confused',    emoji: '😕', color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/30'   },
  frustrated: { label: 'Frustrated',  emoji: '😤', color: 'text-red-400',     bgColor: 'bg-red-500/10',     borderColor: 'border-red-500/30'     },
  confident:  { label: 'Confident',   emoji: '😊', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  curious:    { label: 'Curious',     emoji: '🤔', color: 'text-indigo-400',  bgColor: 'bg-indigo-500/10',  borderColor: 'border-indigo-500/30'  },
  bored:      { label: 'Bored',       emoji: '😴', color: 'text-slate-400',   bgColor: 'bg-slate-500/10',   borderColor: 'border-slate-500/30'   },
  neutral:    { label: 'Neutral',     emoji: '😐', color: 'text-slate-500',   bgColor: 'bg-slate-800/30',   borderColor: 'border-white/10'       },
};

// ── System prompt modifier ────────────────────────────────────────
export function getEmotionSystemAddition(emotion: EmotionType): string {
  switch (emotion) {
    case 'confused':
      return `\nThe student seems CONFUSED. Use simpler language, break the explanation into smaller numbered steps, use a concrete real-world analogy, and check understanding at the end.`;
    case 'frustrated':
      return `\nThe student seems FRUSTRATED. Start with empathy ("I understand this can be tricky!"), simplify drastically, use an encouraging tone, give one small win first, then build up.`;
    case 'confident':
      return `\nThe student seems CONFIDENT. You can go slightly deeper, use technical terms, challenge them with a harder follow-up question or edge case.`;
    case 'curious':
      return `\nThe student seems CURIOUS. Expand beyond the basics, share an interesting fact or connection, encourage exploration with a thought-provoking question.`;
    case 'bored':
      return `\nThe student seems BORED. Make the response more engaging — use a surprising fact, a challenge, a game-like element, or connect to something they care about.`;
    default:
      return '';
  }
}

// ── Motivational messages ─────────────────────────────────────────
export const MOTIVATIONAL: Record<'confused' | 'frustrated', string[]> = {
  confused: [
    "It's completely okay to feel confused — that means you're learning something new! 🌱",
    "Confusion is the first step to understanding. Let me break this down differently for you.",
    "Great question! This concept trips up a lot of people. Let's tackle it step by step.",
  ],
  frustrated: [
    "Hey, take a breath — you've got this! Every expert was once a beginner. 💪",
    "I can see this is challenging. That's actually a sign you're pushing your limits!",
    "Frustration means you care about learning. Let's try a completely different approach.",
  ],
};

export function getMotivationalMessage(emotion: 'confused' | 'frustrated'): string {
  const msgs = MOTIVATIONAL[emotion];
  return msgs[Math.floor(Math.random() * msgs.length)];
}
