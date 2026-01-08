
import React, { useState, useCallback, useRef } from 'react';
import CameraView from './components/CameraView';
import { analyzeQuestionImage } from './services/geminiService';

interface Result {
  identifiedQuestion: string;
  officialAnswer: string;
}

const App: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready");
  
  const lastQuestionRef = useRef<string | null>(null);

  const handleCapture = useCallback(async (base64: string) => {
    setIsProcessing(true);
    try {
      const data = await analyzeQuestionImage(base64);
      if (data) {
        setRawText(data.rawText.trim());
        
        if (data.match) {
          if (data.match.identifiedQuestion !== lastQuestionRef.current) {
            setResult(data.match);
            lastQuestionRef.current = data.match.identifiedQuestion;
          }
          setStatus("Matched");
        } else {
          setStatus("Searching...");
        }
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
            <span className="text-[10px] font-mono font-bold text-emerald-500 tracking-[0.2em] uppercase">{status}</span>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-1 italic">
          TRIVIA<span className="text-emerald-500">BOLT</span>
        </h1>
        <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.4em]">Sub-Second Database Matching</p>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Camera Display */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 to-transparent rounded-[2.5rem] blur-xl opacity-20 transition-opacity group-hover:opacity-40"></div>
          <div className="relative bg-slate-900/20 rounded-3xl p-2 border border-slate-800/40 backdrop-blur-xl">
            <CameraView onCapture={handleCapture} isProcessing={isProcessing} />
          </div>
        </div>

        {/* Real-time Result Area */}
        <div className="min-h-[160px] flex flex-col items-center">
          {!result ? (
            <div className="flex flex-col items-center gap-6 mt-8">
              <div className="flex gap-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-bounce" style={{animationDelay: `${i*0.2}s`}} />
                ))}
              </div>
              <div className="text-center">
                <p className="text-slate-700 font-mono text-[9px] uppercase tracking-widest mb-4">Targeting question box...</p>
                {rawText && (
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 max-w-xs overflow-hidden">
                    <p className="text-[10px] text-slate-500 font-mono line-clamp-2 italic">"{rawText}"</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900/80 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center gap-2 text-slate-500 font-mono text-[9px] uppercase tracking-[0.2em]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Question Identified
                  </div>
                  <p className="text-lg md:text-xl font-bold text-slate-100 leading-tight">
                    {result.identifiedQuestion}
                  </p>
                </div>
                
                <div className="relative group/btn">
                  <div className="absolute -inset-2 bg-emerald-500/40 blur opacity-20 group-hover/btn:opacity-40 transition-opacity"></div>
                  <div className="relative bg-emerald-600 text-white px-10 py-5 rounded-2xl shadow-2xl text-center border-t border-emerald-400/40 min-w-[180px]">
                    <span className="block text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Final Answer</span>
                    <span className="text-3xl font-black tracking-tight">{result.officialAnswer}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Raw Text Log - Helps User Debug Alignment */}
      <footer className="mt-auto py-6 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="flex gap-6 text-[9px] font-mono text-slate-700 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            ENGINE: TESS-V5
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            THRESHOLD: ADAPTIVE
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
            MATCH: FUZZY-JAC
          </div>
        </div>
        <div className="text-[8px] font-mono text-slate-800 text-center leading-loose">
          PRIVATE SCANNER // HIGH REFRESH RATE // DATABASE V1.04
        </div>
      </footer>
    </div>
  );
};

export default App;
