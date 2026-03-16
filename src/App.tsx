import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Video, Key, Play, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [hasKey, setHasKey] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('A neon hologram of a cat driving at top speed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Overlay settings
  const [overlayText, setOverlayText] = useState('CYBER CAT');
  const [overlayPosition, setOverlayPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [overlaySize, setOverlaySize] = useState(48);

  // Logo settings
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(100);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback for local dev
        // @ts-ignore
        setHasKey(!!process.env.GEMINI_API_KEY || !!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success as per guidelines to avoid race conditions
      setHasKey(true);
    }
  };

  const generateVideo = async () => {
    if (!videoPrompt.trim()) return;
    
    setIsGenerating(true);
    setGenerationStatus('Initializing...');
    setError(null);
    
    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: videoPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setGenerationStatus('Generating video (this usually takes 1-3 minutes)...');

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!downloadLink) {
        throw new Error("No video URI returned from the model.");
      }

      setGenerationStatus('Fetching video file...');

      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
         setError("API Key error. Please select your API key again.");
         setHasKey(false);
      } else {
         setError(err.message || "An error occurred during video generation.");
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-zinc-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">API Key Required</h1>
          <p className="text-zinc-400 mb-8">
            To generate videos with Veo, you need to select a Google Cloud project with billing enabled.
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
              Learn more about billing requirements
            </a>
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-white text-black font-medium py-3 px-4 rounded-xl hover:bg-zinc-200 transition-colors"
          >
            Select API Key
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar Controls */}
      <div className="w-full md:w-96 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col h-screen overflow-y-auto shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Veo Studio</h1>
        </div>

        <div className="space-y-8">
          {/* Video Generation Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">1. Generate Video</h2>
            
            <div className="space-y-2">
              <label className="text-sm text-zinc-300">Prompt</label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                placeholder="Describe the video you want to generate..."
              />
            </div>

            <button
              onClick={generateVideo}
              disabled={isGenerating || !videoPrompt.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate Video
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </section>

          <div className="h-px bg-zinc-800" />

          {/* Overlay Text Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">2. Overlay Text</h2>
            
            <div className="space-y-2">
              <label className="text-sm text-zinc-300">Text</label>
              <input
                type="text"
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Enter overlay text..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-300">Position</label>
              <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                {(['top', 'center', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setOverlayPosition(pos)}
                    className={`flex-1 py-2 text-sm rounded-lg capitalize transition-colors ${
                      overlayPosition === pos ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">Size ({overlaySize}px)</label>
                <input
                  type="range"
                  min="16"
                  max="120"
                  value={overlaySize}
                  onChange={(e) => setOverlaySize(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-sm text-zinc-400 uppercase">{overlayColor}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-zinc-800" />

          {/* Logo Overlay Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">3. Overlay Logo</h2>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"
              />
            </div>

            {logoUrl && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setLogoPosition(pos)}
                        className={`py-2 text-sm rounded-lg capitalize transition-colors ${
                          logoPosition === pos ? 'bg-zinc-800 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        {pos.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">Logo Size ({logoSize}px)</label>
                  <input
                    type="range"
                    min="32"
                    max="300"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden">
        {/* Background ambient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
        
        <div className="w-full max-w-5xl aspect-video bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-2xl flex items-center justify-center">
          {videoUrl ? (
            <>
              <video
                src={videoUrl}
                autoPlay
                loop
                controls
                className="w-full h-full object-contain"
              />
              {/* Overlay Text */}
              {overlayText && (
                <div 
                  className={`absolute left-0 right-0 p-8 flex justify-center pointer-events-none ${
                    overlayPosition === 'top' ? 'top-0 items-start' :
                    overlayPosition === 'bottom' ? 'bottom-0 items-end' :
                    'top-0 bottom-0 items-center'
                  }`}
                >
                  <h2 
                    className="font-bold text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
                    style={{ 
                      fontSize: `${overlaySize}px`,
                      color: overlayColor,
                      lineHeight: 1.1
                    }}
                  >
                    {overlayText}
                  </h2>
                </div>
              )}
              {/* Overlay Logo */}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Overlay Logo"
                  className={`absolute object-contain pointer-events-none drop-shadow-lg ${
                    logoPosition === 'top-left' ? 'top-6 left-6' :
                    logoPosition === 'top-right' ? 'top-6 right-6' :
                    logoPosition === 'bottom-left' ? 'bottom-6 left-6' :
                    'bottom-6 right-6'
                  }`}
                  style={{ width: `${logoSize}px`, height: 'auto' }}
                />
              )}
            </>
          ) : (
            <div className="text-center text-zinc-500 flex flex-col items-center">
              {isGenerating ? (
                <>
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
                  <p className="text-lg font-medium text-zinc-300">{generationStatus}</p>
                  <p className="text-sm mt-2 max-w-sm text-center">
                    High-quality video generation takes time. Feel free to grab a coffee!
                  </p>
                </>
              ) : (
                <>
                  <Video className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">Your video will appear here</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
