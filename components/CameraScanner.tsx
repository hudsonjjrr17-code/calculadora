import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertTriangle } from 'lucide-react';

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
      // Check for secure context and mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStreamError("CÂMERA INDISPONÍVEL (Requer HTTPS)");
        return;
      }

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
        setStreamError(null);
      } catch (err: any) {
        console.error("Error accessing camera:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStreamError("PERMISSÃO NEGADA");
        } else {
          setStreamError("ERRO NA CÂMERA");
        }
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
      <div className="w-full h-64 bg-dark-900 rounded-2xl flex flex-col items-center justify-center text-center p-4 border border-accent-500/30">
        <AlertTriangle className="text-accent-500 mb-3" size={40} />
        <p className="text-accent-500 font-bold uppercase tracking-widest">{streamError}</p>
        <p className="text-gray-500 text-xs mt-2">
          {streamError.includes("HTTPS") 
            ? "O navegador bloqueia a câmera em sites não seguros (HTTP)." 
            : "Verifique as permissões do navegador."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/5] bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-dark-800">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover opacity-80"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanner Corners */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32">
          <div className="w-full h-full border-2 border-white/10 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
             <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-500 -mt-1 -ml-1"></div>
             <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-500 -mt-1 -mr-1"></div>
             <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-500 -mb-1 -ml-1"></div>
             <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-500 -mb-1 -mr-1"></div>
             
             {/* Scanning Line Animation */}
             {!isProcessing && (
                <div className="absolute top-0 left-0 w-full h-0.5 bg-brand-500 shadow-[0_0_15px_rgba(234,179,8,1)] animate-[scan_1.5s_infinite]"></div>
             )}
          </div>
          <div className="absolute -bottom-8 left-0 right-0 text-center">
            <span className="text-[10px] font-mono text-brand-500 bg-black/50 px-2 py-1 rounded">ALVO: PREÇO</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      {/* Capture Button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto">
        <button
          onClick={handleCapture}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
            isProcessing 
              ? 'bg-dark-800 scale-95 border-4 border-dark-600 cursor-not-allowed' 
              : 'bg-transparent border-4 border-brand-500 hover:bg-brand-500/10 active:scale-90'
          }`}
          aria-label="Scan Price"
        >
          <div className={`w-14 h-14 rounded-full transition-all ${
            isProcessing ? 'bg-gray-500 animate-pulse' : 'bg-brand-500'
          }`}></div>
        </button>
      </div>
    </div>
  );
};