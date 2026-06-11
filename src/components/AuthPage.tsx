import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AuthPageProps {
  onLogin: (user: { name: string; email: string }) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    onLogin({ name: form.name || form.email.split('@')[0], email: form.email });
    setLoading(false);
  };

  const particles = Array.from({ length: 20 });

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Animated mesh background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }}
        />
        <motion.div
          animate={{ scale: [1.3, 1, 1.3], rotate: [360, 180, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }}
        />
      </div>

      {/* Floating particles */}
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-indigo-500/40"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{
            y: [0, -60, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center mb-10"
        >
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.3)', '0 0 50px rgba(99,102,241,0.6)', '0 0 20px rgba(99,102,241,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mb-4"
          >
            <Brain className="text-white" size={30} />
          </motion.div>
          <h1 className="text-3xl font-black font-display tracking-tighter text-white uppercase">
            SMART <span className="text-indigo-500">AI TUTOR</span>
          </h1>
          <p className="text-[10px] font-bold text-indigo-300/40 uppercase tracking-[0.4em] mt-1">
            Intelligent Learning Platform
          </p>
        </motion.div>

        {/* Card */}
        <div className="glass-panel rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
          <div className="scanline" />

          {/* Mode Toggle */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-8 relative">
            <motion.div
              layout
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-indigo-600"
              animate={{ left: mode === 'login' ? '4px' : 'calc(50%)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`relative z-10 flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${mode === m ? 'text-white' : 'text-white/40'}`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Full Name</label>
                  <Input
                    placeholder="Your Name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl pr-12"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] h-14 rounded-2xl mt-2 relative overflow-hidden group transition-all duration-300 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Authenticating...
                    </motion.div>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                      {mode === 'login' ? 'Enter System' : 'Create Account'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-[10px] text-white/20 mt-6 uppercase tracking-widest">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold">
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        <p className="text-center text-[9px] text-white/10 uppercase tracking-widest mt-6">
          © 2026 Smart AI Tutor · Secure Encrypted Session
        </p>
      </motion.div>
    </div>
  );
}
