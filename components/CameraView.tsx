
import React, { useRef, useEffect, useState } from 'react';

interface CameraViewProps {
  onCapture: (base64: string) => Promise<void>;
  isProcessing: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 60 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Camera access denied.");
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
      
      if (!isProcessing && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        // ROI narrowed to focus strictly on the question strip (upper middle)
        const cropX = video.videoWidth * 0.05;
        const cropY = video.videoHeight * 0.3; // Focus on the middle question area
        const cropW = video.videoWidth * 0.9;
        const cropH = video.videoHeight * 0.25; // Narrow strip for speed

        canvas.width = cropW;
        canvas.height = cropH;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // SUPER-THRESHOLDING: Force the text to be pure white and everything else black
          // Grayscale + High Contrast (3.0) effectively binarizes for Tesseract
          ctx.filter = 'grayscale(1) contrast(3.0) brightness(1.2)';
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const base64 = dataUrl.split(',')[1];
          
          await onCapture(base64);
        }
      }

      if (active) {
        // High refresh rate for instant feel
        setTimeout(runScan, 200);
      }
    };

    runScan();

    return () => { active = false; };
  }, [error, isProcessing, onCapture]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 border border-red-500 rounded-xl">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-red-600 px-4 py-2 rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-2xl border-2 border-slate-700 bg-black aspect-[16/9]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Target Strip HUD */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[90%] h-[25%] border-4 border-dashed border-emerald-500/50 rounded relative">
            {/* Animation to show active scanning */}
            <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
            
            <div className="absolute top-0 left-0 -translate-x-1 -translate-y-6">
               <span className="text-[10px] font-black text-emerald-400 bg-black/80 px-2 py-0.5 rounded border border-emerald-500/20">
                 ACTIVE QUESTION ZONE
               </span>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraView;
