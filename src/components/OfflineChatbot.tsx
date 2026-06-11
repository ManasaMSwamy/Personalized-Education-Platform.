import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Mic, MicOff, Volume2, VolumeX, Upload, FileText,
  Trash2, WifiOff, Brain, X, ChevronDown,
} from 'lucide-react';
import {
  generateOfflineResponse, saveMessage, loadMessages, clearMessages,
  saveDocument, loadDocuments, deleteDocument, saveProfile, loadProfile,
  detectLang, OfflineMessage,
} from '@/services/offlineNlpService';

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

const LANG_LABELS: Record<string, string> = {
  en: '🇬🇧 English', es: '🇪🇸 Español', fr: '🇫🇷 Français',
  hi: '🇮🇳 हिन्दी', de: '🇩🇪 Deutsch', it: '🇮🇹 Italiano', pt: '🇧🇷 Português',
};

const QUICK_PROMPTS = [
  'What can you do?', 'Tell me a joke', 'Quiz me', 'What time is it?',
  'Summarize my document', 'Translate hello in Spanish',
];

export function OfflineChatbot() {
  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [docs, setDocs] = useState<{ name: string; text: string }[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [lang, setLang] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const voiceSupported =
    !!(window.SpeechRecognition || window.webkitSpeechRecognition) &&
    'speechSynthesis' in window;

  // Load persisted data on mount
  useEffect(() => {
    Promise.all([loadMessages(), loadDocuments(), loadProfile()]).then(
      ([msgs, savedDocs, prof]) => {
        setMessages(msgs);
        setDocs(savedDocs);
        setProfile(prof);
        if (savedDocs.length > 0) setActiveDoc(savedDocs[0].name);
      }
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript, isLoading]);

  useEffect(() => {
    return () => { speechSynthesis.cancel(); recognitionRef.current?.abort(); };
  }, []);

  const speak = useCallback((text: string, langCode = 'en') => {
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    utt.lang = langCode === 'hi' ? 'hi-IN' : langCode === 'es' ? 'es-ES' : langCode === 'fr' ? 'fr-FR' : langCode === 'de' ? 'de-DE' : 'en-US';
    utt.rate = 0.95; utt.pitch = 1.05; utt.volume = 1;
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith(utt.lang.split('-')[0]));
    if (preferred) utt.voice = preferred;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utt);
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
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'es' ? 'es-ES' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
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
      if (e.error === 'not-allowed') setMicError('Microphone access denied.');
      else if (e.error === 'no-speech') setMicError('No speech detected. Try again.');
      else setMicError(`Mic error: ${e.error}`);
    };
    recognition.onend = () => {
      setIsListening(false); setTranscript('');
      if (finalText.trim()) setTimeout(() => { sendMessage(finalText.trim()); finalText = ''; }, 100);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    recognition.start();
  }, [isListening, lang]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setInput('');

    const detectedLang = detectLang(text);
    if (detectedLang !== 'en') setLang(detectedLang);

    const userMsg: OfflineMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      lang: detectedLang,
    };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(userMsg);

    // Persist name if introduced
    const nameMatch = text.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+)/i);
    if (nameMatch) {
      const newProfile = { ...profile, name: nameMatch[1] };
      setProfile(newProfile);
      await saveProfile('name', nameMatch[1]);
    }

    const docText = activeDoc ? (docs.find(d => d.name === activeDoc)?.text ?? '') : '';
    const reply = generateOfflineResponse(text, docText, profile, messages);

    const assistantMsg: OfflineMessage = {
      id: `${Date.now()}-a`,
      role: 'assistant',
      content: reply,
      timestamp: Date.now(),
      lang: detectedLang,
    };
    setMessages(prev => [...prev, assistantMsg]);
    await saveMessage(assistantMsg);
    if (autoSpeak) speak(reply, detectedLang);
    setIsLoading(false);
  }, [isLoading, messages, profile, docs, activeDoc, autoSpeak, speak]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const pages = await Promise.all(
          Array.from({ length: pdf.numPages }, (_, i) =>
            pdf.getPage(i + 1).then(p => p.getTextContent()).then(c => c.items.map((it: any) => it.str).join(' '))
          )
        );
        text = pages.join('\n\n');
        if (text.trim().length < 20) throw new Error('PDF appears to be a scanned image with no extractable text. Try a .txt file instead.');
      } else {
        text = await file.text();
      }
      await saveDocument(file.name, text);
      const updated = [...docs.filter(d => d.name !== file.name), { name: file.name, text }];
      setDocs(updated);
      setActiveDoc(file.name);
      const sysMsg: OfflineMessage = {
        id: `${Date.now()}-sys`,
        role: 'assistant',
        content: `📄 **"${file.name}"** loaded (${text.split(/\s+/).length.toLocaleString()} words). Ask me anything about it!`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, sysMsg]);
      await saveMessage(sysMsg);
    } catch (err: any) {
      const errMsg: OfflineMessage = {
        id: `${Date.now()}-err`,
        role: 'assistant',
        content: `❌ ${err?.message ?? 'Failed to read file. Please try a plain .txt or .pdf file with selectable text.'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
      await saveMessage(errMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = async () => {
    await clearMessages();
    setMessages([]);
    stopSpeaking();
  };

  const removeDoc = async (name: string) => {
    await deleteDocument(name);
    const updated = docs.filter(d => d.name !== name);
    setDocs(updated);
    if (activeDoc === name) setActiveDoc(updated[0]?.name ?? null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <WifiOff size={16} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-tight">Offline AI Assistant</p>
            <p className="text-[10px] text-slate-500">100% local · No internet · Privacy-first</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/60 hover:text-white transition-all"
            >
              {LANG_LABELS[lang]?.split(' ')[0]} <ChevronDown size={10} />
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[140px]"
                >
                  {Object.entries(LANG_LABELS).map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => { setLang(code); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${lang === code ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-white/5'}`}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auto-speak toggle */}
          {voiceSupported && (
            <button
              onClick={() => { setAutoSpeak(v => !v); if (isSpeaking) stopSpeaking(); }}
              className={`p-2 rounded-xl border transition-all ${autoSpeak ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}
              title="Toggle auto-speak"
            >
              {autoSpeak ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all"
              title="Clear chat"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Document bar ── */}
      {docs.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 border-b border-white/5 bg-white/2 shrink-0 overflow-x-auto">
          <FileText size={11} className="text-slate-500 shrink-0" />
          {docs.map(doc => (
            <div
              key={doc.name}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all shrink-0 ${
                activeDoc === doc.name
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveDoc(doc.name)}
            >
              <span className="max-w-[120px] truncate">{doc.name}</span>
              <button
                onClick={e => { e.stopPropagation(); removeDoc(doc.name); }}
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && !transcript && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-5 py-8"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center"
            >
              <Brain size={32} className="text-emerald-400" />
            </motion.div>
            <div className="space-y-1.5">
              <p className="text-lg font-black text-white">Offline AI Assistant 🔒</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Works 100% without internet. Your data stays on this device.
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                {['📄 PDF/TXT Q&A', '🧠 Knowledge Base', '🌍 Multilingual', '🔢 Math', '🎯 Quiz'].map(f => (
                  <span key={f} className="text-[10px] text-emerald-400/70 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">{f}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] text-slate-400 hover:text-white hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mt-1">
                <WifiOff size={12} className="text-white" />
              </div>
            )}
            <div className="flex flex-col gap-1 max-w-[78%]">
              <div
                className={`relative group px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm'
                    : 'bg-slate-800/60 border border-white/8 text-slate-200 rounded-tl-sm'
                }`}
              >
                {msg.content}
                {msg.role === 'assistant' && voiceSupported && (
                  <button
                    onClick={() => isSpeaking ? stopSpeaking() : speak(msg.content, msg.lang)}
                    className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-600"
                  >
                    {isSpeaking ? <VolumeX size={10} className="text-red-400" /> : <Volume2 size={10} className="text-slate-300" />}
                  </button>
                )}
              </div>
              <span className="text-[9px] text-slate-700 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1 text-[11px]">
                {profile.name?.[0]?.toUpperCase() ?? '👤'}
              </div>
            )}
          </motion.div>
        ))}

        <AnimatePresence>
          {transcript && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-end gap-2.5">
              <div className="max-w-[78%] px-4 py-3 bg-emerald-600/30 border border-emerald-500/30 rounded-2xl rounded-tr-sm">
                <p className="text-sm text-emerald-200 italic">{transcript}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                <WifiOff size={12} className="text-white" />
              </div>
              <div className="px-4 py-3 bg-slate-800/60 border border-white/8 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Speaking indicator ── */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-5 py-2 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end h-4">
                {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                  <motion.div key={i} className="w-0.5 bg-emerald-400 rounded-full"
                    animate={{ height: [`${h * 3}px`, `${h * 6}px`, `${h * 3}px`] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }} />
                ))}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Speaking</span>
            </div>
            <button onClick={stopSpeaking} className="text-[10px] font-bold text-emerald-400/60 hover:text-emerald-400 uppercase tracking-widest">Stop</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar ── */}
      <div className="px-5 py-4 border-t border-white/5 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {/* File upload */}
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shrink-0"
            title="Upload PDF or TXT"
          >
            {uploading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Upload size={14} /></motion.div>
              : <Upload size={14} />
            }
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? '🎙️ Listening...' : 'Ask anything — works offline...'}
            disabled={isLoading || isListening}
            className="flex-1 bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all"
          />

          {voiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                isListening ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-white/5 border border-white/10 hover:bg-white/15'
              }`}
            >
              {isListening && (
                <motion.div className="absolute inset-0 rounded-2xl bg-red-500/30"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1, repeat: Infinity }} />
              )}
              {isListening ? <MicOff size={15} className="text-white relative z-10" /> : <Mic size={15} className="text-slate-400 relative z-10" />}
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 flex items-center justify-center shrink-0 transition-all"
          >
            <Send size={15} className="text-white" />
          </button>
        </form>

        <AnimatePresence>
          {micError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[10px] text-red-400 text-center mt-2">{micError}</motion.p>
          )}
        </AnimatePresence>

        <p className="text-center text-[9px] text-slate-700 mt-2 flex items-center justify-center gap-2">
          <WifiOff size={9} className="text-emerald-600" />
          All processing is local · Data stored in IndexedDB · No server calls
        </p>
      </div>
    </div>
  );
}
