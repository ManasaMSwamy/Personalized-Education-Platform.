import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, MessageCircle, Sparkles, Volume2, Mic, MicOff, VolumeX, Brain, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Groq from 'groq-sdk';
import { QuizResult, EmotionEvent, EmotionType } from '@/types/dashboard';
import { detectEmotion, getEmotionSystemAddition, getMotivationalMessage, EMOTION_META } from '@/services/emotionService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  emotion?: EmotionType;
}

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

const SUGGESTIONS = [
  'Explain this concept simply',
  'Give me a real-world example',
  'Quiz me on this topic',
  'What are the key points?',
  'Break it down step by step',
  'Why is this important?',
];

const SEARCH_RECOMMENDATIONS: Record<string, string[]> = {
  math: ['Mathematics basics explained', 'Math formulas for students', 'How to solve algebra equations', 'Calculus concepts simplified', 'Geometry theorems and proofs'],
  phys: ['Physics laws explained simply', 'Newton\'s laws of motion', 'How does gravity work?', 'Quantum physics for beginners', 'Electricity and magnetism basics'],
  chem: ['Chemistry periodic table explained', 'Chemical reactions and equations', 'Organic chemistry basics', 'Acids and bases in chemistry', 'Atomic structure explained'],
  bio: ['Biology cell structure explained', 'How does photosynthesis work?', 'Human body systems overview', 'DNA and genetics basics', 'Evolution theory explained'],
  hist: ['History of ancient civilizations', 'World War II causes and effects', 'Industrial Revolution impact', 'French Revolution explained', 'History of democracy'],
  geo: ['Geography continents and countries', 'How do volcanoes form?', 'Climate change explained', 'Ocean currents and weather', 'Plate tectonics basics'],
  comp: ['Computer science basics', 'How does the internet work?', 'Programming concepts for beginners', 'Artificial intelligence explained', 'Data structures and algorithms'],
  eng: ['English grammar rules', 'How to write an essay', 'Literary devices explained', 'Shakespeare plays summary', 'Vocabulary building tips'],
  eco: ['Economics supply and demand', 'How does inflation work?', 'GDP explained simply', 'Stock market basics', 'Microeconomics vs macroeconomics'],
  psy: ['Psychology basics explained', 'How does memory work?', 'Cognitive biases list', 'Freud\'s theories explained', 'Emotional intelligence tips'],
  how: ['How does the brain work?', 'How do vaccines work?', 'How is electricity generated?', 'How do computers process data?', 'How does photosynthesis work?'],
  what: ['What is quantum mechanics?', 'What is machine learning?', 'What causes climate change?', 'What is the theory of relativity?', 'What is DNA?'],
  why: ['Why is the sky blue?', 'Why do we dream?', 'Why is biodiversity important?', 'Why does the moon affect tides?', 'Why do we need sleep?'],
  explain: ['Explain Newton\'s laws', 'Explain the water cycle', 'Explain photosynthesis step by step', 'Explain how computers work', 'Explain the Big Bang theory'],
  quiz: ['Quiz me on mathematics', 'Quiz me on world history', 'Quiz me on science facts', 'Quiz me on geography', 'Quiz me on biology'],
};

function getRecommendations(query: string): string[] {
  if (!query.trim() || query.length < 2) return [];
  const q = query.toLowerCase();
  for (const [key, recs] of Object.entries(SEARCH_RECOMMENDATIONS)) {
    if (q.startsWith(key) || q.includes(key)) {
      return recs.filter(r => r.toLowerCase().includes(q) || r.toLowerCase().startsWith(q.slice(0, 3)));
    }
  }
  // Generic fallback: filter all recommendations
  const all = Object.values(SEARCH_RECOMMENDATIONS).flat();
  return all.filter(r => r.toLowerCase().includes(q)).slice(0, 5);
}

interface ChatbotProps {
  topic?: string;
  onMessage?: () => void;
  onQuizResult?: (result: QuizResult) => void;
  onEmotionDetected?: (event: EmotionEvent) => void;
  onAccuracyUpdate?: (isCorrect: boolean) => void;
}

export function Chatbot({
  topic,
  onMessage,
  onQuizResult,
  onEmotionDetected,
  onAccuracyUpdate,
}: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  const [showMotivation, setShowMotivation] = useState<string | null>(null);
  const [lastPrediction, setLastPrediction] = useState<EmotionType | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [showRecs, setShowRecs] = useState(false);

  const [voiceSupported] = useState(
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition) && 'speechSynthesis' in window
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript, isLoading]);

  useEffect(() => {
    return () => { speechSynthesis.cancel(); recognitionRef.current?.abort(); };
  }, []);

  // Auto-dismiss motivation banner
  useEffect(() => {
    if (!showMotivation) return;
    const t = setTimeout(() => setShowMotivation(null), 5000);
    return () => clearTimeout(t);
  }, [showMotivation]);

  const speak = useCallback((text: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; utterance.pitch = 1.05; utterance.lang = 'en-US'; utterance.volume = 1;
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => { speechSynthesis.cancel(); setIsSpeaking(false); }, []);

  const toggleListening = useCallback(() => {
    if (isListening) { recognitionRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopSpeaking();
    setMicError(null);
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setIsListening(true); setTranscript(''); };
    let finalText = '';
    recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      setTranscript(finalText + interim);
    };
    recognition.onerror = (e: any) => {
      setIsListening(false); setTranscript('');
      if (e.error === 'not-allowed') setMicError('Microphone access denied. Allow mic in browser settings.');
      else if (e.error === 'no-speech') setMicError('No speech detected. Try again.');
      else setMicError(`Mic error: ${e.error}`);
    };
    recognition.onend = () => {
      setIsListening(false); setTranscript('');
      if (finalText.trim()) setTimeout(() => { sendMessage(finalText.trim()); finalText = ''; }, 100);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    recognition.start();
  }, [isListening]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // ── Emotion detection ──
    const emotionEvent = detectEmotion(text);
const emotion = emotionEvent.emotion;

setLastPrediction(emotion);
setShowFeedback(true);
setCurrentEmotion(emotion);

// Accuracy tracking
const predictedEmotion = emotion;

const isCorrect = predictedEmotion === emotion;

onAccuracyUpdate?.(isCorrect);

console.log("Predicted:", predictedEmotion);
console.log("Actual:", emotion);
console.log("Correct:", isCorrect);

onEmotionDetected?.(emotionEvent);

    // Show motivational banner for confusion/frustration
    if (emotion === 'confused' || emotion === 'frustrated') {
      setShowMotivation(getMotivationalMessage(emotion));
    }

    setMessages(prev => [...prev, { role: 'user', content: text, emotion }]);
    setInput('');
    setIsLoading(true);

    try {
      const emotionAddition = getEmotionSystemAddition(emotion);
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are Smart AI Tutor, an intelligent voice-based learning assistant.
Answer student questions clearly and conversationally.
Explain concepts step-by-step in simple language.
If the topic is difficult, use examples and analogies.
Keep responses concise but educational (3-5 sentences max unless a detailed explanation is needed).
End with a short follow-up question to keep the student engaged.
${topic ? `Current study topic: ${topic}` : ''}${emotionAddition}`,
          },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: text },
        ],
        temperature: emotion === 'frustrated' ? 0.6 : emotion === 'curious' ? 0.85 : 0.75,
        max_tokens: emotion === 'confused' || emotion === 'frustrated' ? 600 : 500,
      });

      const reply = response.choices[0]?.message?.content || 'Sorry, I could not process that.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (autoSpeak) speak(reply);
      onMessage?.();

      // Auto-detect quiz results
      if (onQuizResult && reply.toLowerCase().includes('correct') && reply.toLowerCase().includes('question')) {
        const m = reply.match(/(\d+)\s*(?:out of|\/)\s*(\d+)/i);
        if (m) {
          const correct = parseInt(m[1]), total = parseInt(m[2]);
          if (total > 0 && correct <= total)
            onQuizResult({ topic: topic || text.slice(0, 40), score: Math.round((correct / total) * 100), total, correct, timestamp: Date.now() });
        }
      }
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || JSON.stringify(err) || 'Unknown error';
      const isAuth = msg.toLowerCase().includes('401') || msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('unauthorized');
      const isRate = msg.toLowerCase().includes('429') || msg.toLowerCase().includes('rate limit');
      const isNetwork = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror') || msg.toLowerCase().includes('load failed');
      const reply = isAuth
        ? '❌ Invalid API key. Go to console.groq.com → API Keys and paste a valid key into .env.local as VITE_GROQ_API_KEY, then restart the dev server.'
        : isRate
        ? '⏳ Rate limit reached. Wait 30 seconds and try again, or upgrade your Groq plan at console.groq.com.'
        : isNetwork
        ? '📡 Network error — check your internet connection and try again.'
        : `❌ Error: ${msg}`;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, autoSpeak, speak, topic, onMessage, onQuizResult, onEmotionDetected]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRecs(false);
    sendMessage(input);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const recs = getRecommendations(val);
    setRecommendations(recs);
    setShowRecs(recs.length > 0 && val.length >= 2);
  };

  const selectRecommendation = (rec: string) => {
    setShowRecs(false);
    sendMessage(rec);
  };

  const meta = EMOTION_META[currentEmotion];
const handleEmotionFeedback = (isCorrect: boolean) => {
  onAccuracyUpdate?.(isCorrect);
  setShowFeedback(false);
};
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div
              animate={isSpeaking ? { boxShadow: ['0 0 0px rgba(99,102,241,0.4)', '0 0 20px rgba(99,102,241,0.8)', '0 0 0px rgba(99,102,241,0.4)'] } : {}}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"
            >
              <Brain size={18} className="text-white" />
            </motion.div>
            {isListening && (
              <motion.div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            )}
            {isSpeaking && (
              <motion.div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            )}
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-tight">Smart AI Tutor</p>
            <p className="text-[10px] text-slate-500">
              {isSpeaking ? '🔊 Speaking...' : isListening ? '🎙️ Listening...' : '✨ Voice-based learning assistant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live emotion badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEmotion}
              initial={{ opacity: 0, scale: 0.8, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 4 }}
              transition={{ duration: 0.2 }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${meta.bgColor} ${meta.borderColor} ${meta.color}`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </motion.div>
          </AnimatePresence>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
            <MessageCircle size={11} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-white/40">{messages.length} msgs</span>
          </div>

          {voiceSupported && (
            <button
              onClick={() => { setAutoSpeak(v => !v); if (isSpeaking) stopSpeaking(); }}
              className={`p-2 rounded-xl transition-all border ${autoSpeak ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}
            >
              {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); stopSpeaking(); setCurrentEmotion('neutral'); }}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/30 hover:text-white/60 hover:bg-white/10 transition-all uppercase tracking-widest"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Motivational banner ── */}
      <AnimatePresence>
        {showMotivation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`shrink-0 overflow-hidden ${currentEmotion === 'frustrated' ? 'bg-red-500/8 border-b border-red-500/20' : 'bg-amber-500/8 border-b border-amber-500/20'}`}
          >
            <div className="px-6 py-3 flex items-center gap-3">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-xl shrink-0"
              >
                {currentEmotion === 'frustrated' ? '💪' : '🌱'}
              </motion.span>
              <p className={`text-xs font-medium ${currentEmotion === 'frustrated' ? 'text-red-300' : 'text-amber-300'}`}>
                {showMotivation}
              </p>
              <button onClick={() => setShowMotivation(null)} className="ml-auto text-white/20 hover:text-white/50 text-xs shrink-0">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !transcript && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-6 py-8">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center"
            >
              <Sparkles size={32} className="text-indigo-400" />
            </motion.div>
            <div className="space-y-2">
              <p className="text-lg font-black text-white">Hi! I'm your Smart AI Tutor 👋</p>
              <p className="text-sm text-slate-500 max-w-sm">Ask me anything — I adapt my explanations based on how you're feeling.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] text-slate-400 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all">
                  {s}
                </button>
              ))}
            </div>
            {voiceSupported && (
              <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
                <Mic size={10} /> Click the mic button below to speak
              </p>
            )}
          </motion.div>
        )}

        {messages.map((message, idx) => {
          const msgMeta = message.emotion ? EMOTION_META[message.emotion] : null;
          return (
            
            <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                  <Brain size={13} className="text-white" />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[75%]">
                {/* Emotion tag on user messages */}
                {message.role === 'user' && msgMeta && message.emotion !== 'neutral' && (
                  <div className={`self-end flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${msgMeta.bgColor} ${msgMeta.color} border ${msgMeta.borderColor}`}>
                    {msgMeta.emoji} {msgMeta.label}
                  </div>
                )}
                <div className={`relative group ${message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3'
                  : 'bg-slate-800/60 border border-white/8 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && voiceSupported && (
                    <button
                      onClick={() => isSpeaking ? stopSpeaking() : speak(message.content)}
                      className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-600"
                    >
                      {isSpeaking ? <VolumeX size={10} className="text-red-400" /> : <Volume2 size={10} className="text-slate-300" />}
                    </button>
                  )}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                  <BookOpen size={13} className="text-indigo-300" />
                </div>
              )}
            </motion.div>
          );{showFeedback && idx === messages.length - 1 && message.role === 'assistant' && (
  <div className="flex gap-2 mt-2">

    <button
      onClick={() => handleEmotionFeedback(true)}
      className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold"
    >
      😊 Correct Emotion
    </button>

    <button
      onClick={() => handleEmotionFeedback(false)}
      className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold"
    >
      ❌ Wrong Emotion
    </button>

  </div>
)}
        })}

        <AnimatePresence>
          {transcript && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-end gap-3">
              <div className="max-w-[75%] px-4 py-3 bg-indigo-600/30 border border-indigo-500/30 rounded-2xl rounded-tr-sm">
                <p className="text-sm text-indigo-200 italic">{transcript}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Brain size={13} className="text-white" />
              </div>
              <div className="px-4 py-3 bg-slate-800/60 border border-white/8 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                    animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="px-6 py-4 border-t border-white/5 shrink-0">
        <AnimatePresence>
          {isSpeaking && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mb-3 flex items-center justify-between px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 items-end h-4">
                  {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                    <motion.div key={i} className="w-0.5 bg-emerald-400 rounded-full"
                      animate={{ height: [`${h * 3}px`, `${h * 6}px`, `${h * 3}px`] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }} />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI Speaking</span>
              </div>
              <button onClick={stopSpeaking} className="text-[10px] font-bold text-emerald-400/60 hover:text-emerald-400 transition-colors uppercase tracking-widest">Stop</button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex gap-2 items-center relative">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onFocus={() => recommendations.length > 0 && setShowRecs(true)}
              onBlur={() => setTimeout(() => setShowRecs(false), 150)}
              placeholder={isListening ? '🎙️ Listening...' : 'Ask your tutor anything...'}
              disabled={isLoading || isListening}
              className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all"
            />
            <AnimatePresence>
              {showRecs && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 left-0 right-0 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                >
                  {recommendations.map((rec, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectRecommendation(rec)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-500/15 hover:text-white flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                    >
                      <span className="text-indigo-400 shrink-0">🔍</span>
                      <span>{rec}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {voiceSupported && (
            <button type="button" onClick={toggleListening} disabled={isLoading}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${isListening ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-white/8 border border-white/10 hover:bg-white/15 hover:border-white/20'}`}>
              {isListening && (
                <motion.div className="absolute inset-0 rounded-2xl bg-red-500/30"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1, repeat: Infinity }} />
              )}
              {isListening ? <MicOff size={16} className="text-white relative z-10" /> : <Mic size={16} className="text-slate-400 relative z-10" />}
            </button>
          )}
          <Button type="submit" disabled={isLoading || !input.trim()}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shrink-0 p-0">
            {isLoading ? <Sparkles size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </form>

        <AnimatePresence>
          {micError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[10px] text-red-400 text-center mt-2">{micError}</motion.p>
          )}
        </AnimatePresence>
        {voiceSupported && !micError && (
          <p className="text-center text-[10px] text-slate-700 mt-2">
            {isListening ? '🔴 Click mic to stop & send' : 'Click mic to speak · AI adapts to your mood'}
          </p>
        )}
      </div>
    </div>
  );
}
