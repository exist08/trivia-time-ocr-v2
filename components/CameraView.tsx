
import React, { useRef, useEffect, useState } from 'react';

interface CameraViewProps {
  onCapture: (base64: string) => Promise<void>;
  isProcessing: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const activeProcessingRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Please allow camera access to use the scanner.");
        console.error(err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const runScan = async () => {
      if (!active || error) return;
      
      // Prevent multiple concurrent scans to keep CPU usage low
      if (!isProcessing && !activeProcessingRef.current && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        // Strategic crop for game questions (middle-upper horizontal strip)
        const cropX = video.videoWidth * 0.05;
        const cropY = video.videoHeight * 0.35; 
        const cropW = video.videoWidth * 0.9;
        const cropH = video.videoHeight * 0.22; 

        canvas.width = cropW;
        canvas.height = cropH;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Adaptive binarization for white text on complex backgrounds
          ctx.filter = 'grayscale(1) contrast(4.5) brightness(1.2) invert(0)';
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64 = dataUrl.split(',')[1];
          
          activeProcessingRef.current = true;
          try {
            await onCapture(base64);
          } finally {
            activeProcessingRef.current = false;
          }
        }
      }

      if (active) {
        // Run OCR approximately 2-3 times per second
        setTimeout(runScan, 450);
      }
    };

    runScan();

    return () => { active = false; };
  }, [error, isProcessing, onCapture]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 border-2 border-red-500/20 rounded-3xl h-full">
        <p className="text-red-400 font-medium mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-2 rounded-xl hover:bg-red-500/30 transition-colors">Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-3xl border-2 border-slate-800 bg-black aspect-[16/9] shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Target Strip HUD */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[92%] h-[22%] border-2 border-dashed border-emerald-500/40 rounded-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5" />
          <div className="absolute h-[2px] w-full bg-emerald-400/30 top-1/2 -translate-y-1/2" />
          
          <div className="absolute top-0 left-0 -translate-x-1 -translate-y-9">
             <span className="text-[10px] font-black text-emerald-400 bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/20 backdrop-blur-md shadow-lg">
               ALIGNED SCAN MODE
             </span>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraView;
