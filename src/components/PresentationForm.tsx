import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PresentationInput } from '@/types';
import { Loader2, Presentation as PresentationIcon, Sparkles, FileText, Upload, X } from 'lucide-react';

interface PresentationFormProps {
  onSubmit: (input: PresentationInput) => void;
  isLoading: boolean;
}

export function PresentationForm({ onSubmit, isLoading }: PresentationFormProps) {
  const [formData, setFormData] = useState<PresentationInput>({
    topic: '',
    subject: '',
    audience: 'school',
    slideCount: 10,
    tone: 'formal',
    pedagogyMode: 'None',
    pdfUpload: false,
    pdfContent: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#ec4899',
    collegeName: '',
    collegeLogoUrl: '',
    departmentLogoUrl: '',
    submittedBy: '',
    submittedTo: '',
  });

  const [fileName, setFileName] = useState<string | null>(null);
  const [collegeLogoName, setCollegeLogoName] = useState<string | null>(null);
  const [deptLogoName, setDeptLogoName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFormData(prev => ({ ...prev, pdfContent: content, pdfUpload: true }));
      };
      reader.readAsText(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'college' | 'dept') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'college') setCollegeLogoName(file.name);
      else setDeptLogoName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (type === 'college') {
          setFormData(prev => ({ ...prev, collegeLogoUrl: content }));
        } else {
          setFormData(prev => ({ ...prev, departmentLogoUrl: content }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setFileName(null);
    setFormData(prev => ({ ...prev, pdfContent: '', pdfUpload: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="glass-panel rounded-[2.5rem] p-1 overflow-hidden relative">
        <div className="scanline" />
        <div className="p-8 md:p-12 bg-slate-950/40 rounded-[2.4rem]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-indigo-500 rounded-xl neon-glow">
                  <PresentationIcon size={24} className="text-white" />
                </div>
                <h2 className="text-3xl font-black font-display tracking-tight text-white uppercase">
                  Command <span className="text-indigo-400">Center</span>
                </h2>
              </div>
              <p className="text-indigo-200/60 font-medium">Configure your advanced AI pedagogical deployment.</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                v3.0 Advanced
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                System Ready
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Section 1: Core Mission */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <div className="w-8 h-[1px] bg-indigo-500/30" />
                Core Mission Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="topic" className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest ml-1">Mission Topic</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., ARTIFICIAL INTELLIGENCE BASICS"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-14 rounded-2xl focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="subject" className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest ml-1">Subject Field</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., COMPUTER SCIENCE"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-14 rounded-2xl focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <Label className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest ml-1">Audience</Label>
                  <Select value={formData.audience} onValueChange={(v: any) => setFormData({ ...formData, audience: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="school">Students</SelectItem>

                      <SelectItem value="college">Professionals</SelectItem>
                    </SelectContent>

                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest ml-1">Slide Count</Label>
                  <Input
                    type="number"
                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                    value={formData.slideCount}
                    onChange={(e) => setFormData({ ...formData, slideCount: parseInt(e.target.value) })}
                    min={3}
                    max={20}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pedagogical Strategy */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <div className="w-8 h-[1px] bg-purple-500/30" />
                Pedagogical Strategy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-purple-300 text-[10px] font-bold uppercase tracking-widest ml-1">Pedagogy Mode</Label>
                  <Select value={formData.pedagogyMode} onValueChange={(v: any) => setFormData({ ...formData, pedagogyMode: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="None">None (Standard)</SelectItem>
                      <SelectItem value="Socratic">Socratic (Inquiry-Based)</SelectItem>
                      <SelectItem value="Gamified">Gamified (Quiz-Based)</SelectItem>
                      <SelectItem value="Flipped">Flipped Classroom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-purple-300 text-[10px] font-bold uppercase tracking-widest ml-1">Narrative Tone</Label>
                  <Select value={formData.tone} onValueChange={(v: any) => setFormData({ ...formData, tone: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="formal">Formal & Professional</SelectItem>
                      <SelectItem value="friendly">Friendly & Accessible</SelectItem>
                      <SelectItem value="storytelling">Storytelling & Immersive</SelectItem>
                      <SelectItem value="interactive">Highly Interactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Data Sources & Branding */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <div className="w-8 h-[1px] bg-emerald-500/30" />
                  Knowledge Sources
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white uppercase tracking-widest">PDF Knowledge Base</p>
                      <p className="text-[10px] text-emerald-400/60 font-mono italic">Prioritize uploaded documentation</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {fileName ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                          <FileText size={14} className="text-emerald-400" />
                          <span className="text-[10px] text-emerald-200 font-mono truncate max-w-[100px]">{fileName}</span>
                          <button type="button" onClick={clearFile} className="text-emerald-400 hover:text-emerald-300">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer group">
                          <input
                            type="file"
                            className="sr-only"
                            accept=".txt,.pdf,.doc,.docx"
                            onChange={handleFileChange}
                          />
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl group-hover:bg-white/10 transition-all">
                            <Upload size={14} className="text-emerald-400" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Upload Source</span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <Label className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest ml-1">🎥 Auto YouTube Videos</Label>
                    <p className="text-[10px] text-emerald-400/80 italic">AI automatically adds audience-perfect videos (no input needed)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black text-pink-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <div className="w-8 h-[1px] bg-pink-500/30" />
                  Brand Identity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-pink-300 text-[10px] font-bold uppercase tracking-widest ml-1">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-12 h-12 p-1 bg-white/5 border-white/10 rounded-xl cursor-pointer"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      />
                      <Input
                        className="flex-1 bg-white/5 border-white/10 text-white h-12 rounded-xl font-mono text-xs"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-pink-300 text-[10px] font-bold uppercase tracking-widest ml-1">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-12 h-12 p-1 bg-white/5 border-white/10 rounded-xl cursor-pointer"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      />
                      <Input
                        className="flex-1 bg-white/5 border-white/10 text-white h-12 rounded-xl font-mono text-xs"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-pink-300 text-[10px] font-bold uppercase tracking-widest ml-1">Institution Name</Label>
                    <Input
                      placeholder="e.g., MIT / HARVARD / SCHOOL NAME"
                      className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                      value={formData.collegeName}
                      onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-pink-300 text-[10px] font-bold uppercase tracking-widest ml-1">College Logo</Label>
                      <label className="cursor-pointer group block">
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'college')}
                        />
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl group-hover:bg-white/10 transition-all">
                          <Upload size={14} className="text-pink-400" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate">
                            {collegeLogoName || 'Upload College Logo'}
                          </span>
                        </div>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-pink-300 text-[10px] font-bold uppercase tracking-widest ml-1">Dept Logo</Label>
                      <label className="cursor-pointer group block">
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'dept')}
                        />
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl group-hover:bg-white/10 transition-all">
                          <Upload size={14} className="text-pink-400" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate">
                            {deptLogoName || 'Upload Dept Logo'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-pink-300 text-[10px] font-bold uppercase tracking-widest ml-1">Submitted By</Label>
                      <Input
                        placeholder="Your Name / Team"
                        className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                        value={formData.submittedBy}
                        onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-pink-300 text-[10px] font-bold uppercase tracking-widest ml-1">Submitted To</Label>
                      <Input
                        placeholder="Professor / Department"
                        className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                        value={formData.submittedTo}
                        onChange={(e) => setFormData({ ...formData, submittedTo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>



            

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black font-display text-xl py-10 rounded-3xl transition-all duration-500 shadow-[0_0_50px_rgba(79,70,229,0.3)] hover:shadow-[0_0_80px_rgba(79,70,229,0.6)] uppercase tracking-[0.2em] group relative overflow-hidden"
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  SYNTHESIZING PEDAGOGY...
                </div>
              ) : (
                <span className="flex items-center gap-4">
                  INITIATE ADVANCED DEPLOYMENT
                  <Sparkles className="group-hover:rotate-12 transition-transform" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
