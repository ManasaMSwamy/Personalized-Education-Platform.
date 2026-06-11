import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, BookOpen, Sparkles, Lightbulb, Zap, Eye, Brain, AlertCircle, Settings, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeImageWithAI, generateLearningPlan, VisionAnalysis } from '@/services/visionService';
import { Button } from '@/components/ui/button';

type ErrorType = 'permission-denied' | 'not-found' | 'not-allowed' | 'not-supported' | 'unknown' | null;

export function CameraLearn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [learningPlan, setLearningPlan] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [activeTab, setActiveTab] = useState<'capture' | 'analysis' | 'learning'>('capture');
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    console.log('CameraLearn component mounted, videoRef:', videoRef.current);
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setErrorType(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsVideoReady(true);
          }).catch(err => {
            console.error('Video play error:', err);
            setError('Failed to start video playback.');
          });
        };
        setIsCameraActive(true);
      } else {
        console.error('Video element ref is null');
        setError('Video element not available. Please refresh the page.');
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      let errorMsg = 'Camera error. Please try again.';
      let errType: ErrorType = 'unknown';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission denied';
        errType = 'permission-denied';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found on your device';
        errType = 'not-found';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is in use by another application';
        errType = 'not-allowed';
      } else if (err.name === 'TypeError') {
        errorMsg = 'Camera is not supported on this device or browser';
        errType = 'not-supported';
      }

      setError(errorMsg);
      setErrorType(errType);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
      setIsVideoReady(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      setAnalysis(null);
      setLearningPlan([]);
      setActiveTab('analysis');
      setError(null);
      await analyzeCapturedImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const captureImage = async () => {
    if (!canvasRef.current || !videoRef.current) {
      setError('Camera not ready. Please wait for the video to load.');
      return;
    }

    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setError('Video dimensions not available. Please try again.');
      return;
    }

    try {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        setError('Canvas context not available.');
        return;
      }

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9);

      if (!imageData || imageData === 'data:,') {
        setError('Failed to capture image. Please try again.');
        return;
      }

      setCapturedImage(imageData);
      setActiveTab('analysis');
      setAnalysis(null);
      setLearningPlan([]);
      setError(null);

      console.log('Starting automatic analysis immediately...');
      await analyzeCapturedImage(imageData);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture image. Please check camera permissions and try again.');
    }
  };

  const analyzeCapturedImage = async (imageData: string) => {
    console.log('Starting image analysis...');
    setIsLoading(true);
    setError(null);

    try {
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
      console.log('Base64 image length:', base64.length);

      const result = await analyzeImageWithAI(base64, 'image/jpeg');
      console.log('Analysis result:', result);

      setAnalysis(result);

      const plan = await generateLearningPlan(result.objectDetected);
      console.log('Learning plan:', plan);

      setLearningPlan(plan);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    await analyzeCapturedImage(capturedImage);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setLearningPlan([]);
    setActiveTab('capture');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Camera size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Point Camera & Learn</h1>
            <p className="text-xs text-slate-400">AI Vision Tutor - Point at anything to learn!</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!capturedImage ? (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full p-6 gap-4"
            >
              {/* Camera Preview */}
              <div className="relative flex-1 bg-black rounded-3xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: isCameraActive ? 'block' : 'none' }}
                />
                {!isCameraActive ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 bg-gradient-to-br from-slate-800 to-slate-900">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-20 h-20 rounded-3xl bg-cyan-500/20 flex items-center justify-center"
                    >
                      <Eye size={40} className="text-cyan-400" />
                    </motion.div>
                    <p className="text-slate-400 text-center">Click "Start Camera" to begin</p>
                  </div>
                ) : !isVideoReady ? (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
                      <p className="text-sm">Loading camera...</p>
                    </div>
                  </div>
                ) : null}
                {isCameraActive && isVideoReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-cyan-400/30 rounded-2xl" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-cyan-400 rounded-full opacity-20" />
                  </div>
                )}
              </div>

              {/* Error Display with Troubleshooting */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-300">{error}</p>
                      <p className="text-xs text-red-300/60 mt-1">
                        {errorType === 'permission-denied' &&
                          'Please grant camera permission in your browser settings.'}
                        {errorType === 'not-found' &&
                          'Connect a camera device to your computer and try again.'}
                        {errorType === 'not-allowed' &&
                          'Close other apps using the camera and try again.'}
                        {errorType === 'not-supported' &&
                          'Your browser may not support camera access. Try Chrome, Firefox, or Safari.'}
                        {errorType === 'unknown' &&
                          'There was an unexpected error. Please refresh and try again.'}
                      </p>
                    </div>
                  </div>

                  {errorType === 'permission-denied' && (
                    <div className="bg-red-500/5 rounded-lg p-3 space-y-3 border border-red-500/20">
                      <div className="flex items-center gap-2">
                        <Settings size={14} className="text-red-400" />
                        <p className="text-xs font-bold text-red-300">How to enable camera:</p>
                      </div>

                      <div className="space-y-2">
                        <div className="bg-red-500/10 rounded p-2">
                          <p className="text-xs font-bold text-red-300 mb-1">Method 1 — From Address Bar</p>
                          <ul className="text-xs text-red-300/80 space-y-0.5 ml-4 list-decimal">
                            <li>Open the website</li>
                            <li>Look near the URL bar: 🔒 lock icon or 📷 camera blocked icon</li>
                            <li>Click it</li>
                            <li>Find Camera</li>
                            <li>Change from: Block → Allow</li>
                            <li>Refresh the page</li>
                          </ul>
                        </div>

                        <div className="bg-red-500/10 rounded p-2">
                          <p className="text-xs font-bold text-red-300 mb-1">Method 2 — Browser Settings</p>
                          <ul className="text-xs text-red-300/80 space-y-0.5 ml-4 list-decimal">
                            <li>Click the three dots (⋮) in the top-right corner</li>
                            <li>Go to Settings → Privacy and security → Site settings</li>
                            <li>Find Camera</li>
                            <li>Change to "Sites can ask to use camera"</li>
                            <li>Refresh the page</li>
                          </ul>
                        </div>

                        <div className="bg-red-500/10 rounded p-2">
                          <p className="text-xs font-bold text-red-300 mb-1">Method 3 — Quick Fix</p>
                          <ul className="text-xs text-red-300/80 space-y-0.5 ml-4 list-decimal">
                            <li>Click the camera blocked icon in the address bar</li>
                            <li>Select "Always allow on this site"</li>
                            <li>Click "Done"</li>
                            <li>Refresh the page</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {(errorType === 'not-found' || errorType === 'not-allowed') && (
                    <div className="bg-red-500/5 rounded-lg p-3 space-y-2 border border-red-500/20">
                      <div className="flex items-center gap-2">
                        <HelpCircle size={14} className="text-red-400" />
                        <p className="text-xs font-bold text-red-300">Troubleshooting:</p>
                      </div>
                      <ul className="text-xs text-red-300/80 space-y-1 ml-6 list-decimal">
                        <li>Check if camera is connected properly</li>
                        <li>Close other applications using the camera</li>
                        <li>Restart your browser</li>
                        <li>Update your browser to the latest version</li>
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Upload Alternative when Camera Fails */}
              {error && !isCameraActive && (
                <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-300 text-center">
                    💡 Tip: You can upload a photo from your device gallery as an alternative
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isCameraActive ? (
                  <>
                    <Button
                      onClick={startCamera}
                      className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Camera size={18} /> Start Camera
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                    >
                      📁 Upload Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={captureImage}
                      disabled={!isVideoReady}
                      className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={18} /> {isVideoReady ? 'Capture Photo' : 'Loading Camera...'}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl"
                    >
                      Close
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full overflow-y-auto"
            >
              {/* Captured Image Preview */}
              <div className="px-6 pt-4 pb-2 shrink-0">
                <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-black">
                  <img src={capturedImage} alt="Captured" className="w-full h-48 object-cover" />
                  <button
                    onClick={retakePhoto}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 px-6 pt-4 pb-2 shrink-0 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold text-sm transition-all ${
                    activeTab === 'analysis'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Brain size={14} className="inline mr-2" /> Analysis
                </button>
                {learningPlan.length > 0 && (
                  <button
                    onClick={() => setActiveTab('learning')}
                    className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold text-sm transition-all ${
                      activeTab === 'learning'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <BookOpen size={14} className="inline mr-2" /> Learning Plan
                  </button>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-64 gap-4"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full"
                    />
                    <p className="text-slate-400 font-medium">Analyzing image with AI...</p>
                  </motion.div>
                ) : activeTab === 'analysis' && analysis ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Object Detected */}
                    <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl">
                      <p className="text-xs text-cyan-300 font-bold uppercase tracking-wider mb-1">Object Detected</p>
                      <h2 className="text-2xl font-black text-white">{analysis.objectDetected}</h2>
                    </div>

                    {/* What Is It */}
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye size={16} className="text-cyan-400" />
                        <p className="text-sm font-bold text-cyan-300">What Is It?</p>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{analysis.whatIsIt}</p>
                    </div>

                    {/* How It Works */}
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-yellow-400" />
                        <p className="text-sm font-bold text-yellow-300">How It Works</p>
                      </div>
                      <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                        {analysis.howItWorks.split('\n').map((item, idx) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Real World Applications */}
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={16} className="text-orange-400" />
                        <p className="text-sm font-bold text-orange-300">Real World Applications</p>
                      </div>
                      <div className="space-y-2">
                        {analysis.realWorldApplications.map((app, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-xs font-bold text-orange-400 mt-0.5">•</span>
                            <span className="text-sm text-slate-300">{app}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interesting Facts */}
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl">
                      <p className="text-sm font-bold text-purple-300 mb-2">💡 Interesting Facts</p>
                      <div className="space-y-2">
                        {analysis.interestingFacts.map((fact, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-xs font-bold text-purple-400 mt-0.5">✓</span>
                            <span className="text-sm text-slate-300">{fact}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggested Questions */}
                    <div className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl">
                      <p className="text-sm font-bold text-green-300 mb-3">❓ Test Your Understanding</p>
                      <div className="space-y-2">
                        {analysis.suggestedQuestions.map((question, idx) => (
                          <div key={idx} className="text-sm text-slate-300">• {question}</div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'learning' && learningPlan.length > 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl">
                      <p className="text-sm font-bold text-blue-300">📚 5-Step Learning Plan</p>
                      <p className="text-xs text-slate-400 mt-1">Follow these steps to master the concept</p>
                    </div>
                    {learningPlan.map((step, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-slate-300 pt-0.5">{step}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : null}
              </div>

              {/* Bottom Actions */}
              <div className="px-6 pb-4 shrink-0 flex gap-3">
                {!isLoading && (
                  <>
                    {!analysis && (
                      <Button
                        onClick={analyzeImage}
                        className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                      >
                        <Sparkles size={18} /> Analyze with AI
                      </Button>
                    )}
                    <Button
                      onClick={retakePhoto}
                      className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-2xl"
                    >
                      Retake Photo
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
