import React, { useRef, useEffect, useState } from 'react';
import { Camera } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (base64Image: string) => void;
  isProcessing: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setStreamError("Acesso à câmera negado.");
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && !isProcessing) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(base64);
      }
    }
  };

  if (streamError) {
    return (
      <div className="w-full h-48 bg-dark-800 rounded-2xl flex flex-col items-center justify-center text-center p-4 border border-white/10">
        <Camera className="text-gray-600 mb-2" size={32} />
        <p className="text-red-400 text-sm">{streamError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover opacity-90"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanner Corners */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-32">
          <div className="w-full h-full border-2 border-white/30 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
             <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-400 rounded-tl-lg -mt-0.5 -ml-0.5"></div>
             <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-400 rounded-tr-lg -mt-0.5 -mr-0.5"></div>
             <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-400 rounded-bl-lg -mb-0.5 -ml-0.5"></div>
             <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-400 rounded-br-lg -mb-0.5 -mr-0.5"></div>
             
             {/* Scanning Line Animation */}
             {!isProcessing && (
                <div className="absolute top-0 left-0 w-full h-0.5 bg-brand-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-[scan_2s_infinite]"></div>
             )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>

      {/* Capture Button */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-auto">
        <button
          onClick={handleCapture}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full border-[3px] border-white flex items-center justify-center transition-all duration-300 ${
            isProcessing ? 'bg-gray-500 scale-90 opacity-50 cursor-not-allowed' : 'bg-transparent hover:bg-white/20 active:scale-95'
          }`}
          aria-label="Scan Price"
        >
          <div className={`w-12 h-12 rounded-full ${isProcessing ? 'bg-gray-300' : 'bg-brand-500'}`}></div>
        </button>
      </div>
    </div>
  );
};