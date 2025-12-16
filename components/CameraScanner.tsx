import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertTriangle, Zap, ZapOff } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (base64Image: string) => void;
  isProcessing: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

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
        setMediaStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check for Torch capability
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any; // Cast to any because TS might not know torch yet
        if (capabilities.torch) {
          setHasTorch(true);
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
        currentStream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  const toggleTorch = async () => {
    triggerHaptic();
    if (mediaStream && hasTorch) {
      const track = mediaStream.getVideoTracks()[0];
      const newStatus = !isTorchOn;
      try {
        await track.applyConstraints({
          advanced: [{ torch: newStatus } as any]
        });
        setIsTorchOn(newStatus);
      } catch (err) {
        console.error("Error toggling torch", err);
      }
    }
  };

  const handleCapture = () => {
    // Visual Flash Effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    // Haptic Feedback
    if (navigator.vibrate) navigator.vibrate(50); 
    
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
    <div className="relative w-full aspect-[4/5] bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-dark-800 isolate">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover opacity-90"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Shutter Flash Effect Overlay */}
      <div 
        className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-50 ${flashActive ? 'opacity-80' : 'opacity-0'}`}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Darken surrounding area (Mask) */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-40 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] rounded-2xl"></div>
        </div>

        {/* Scanner Corners & Scan Line */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-40">
          <div className="w-full h-full relative">
             {/* Corners */}
             <div className="absolute top-0 left-0 w-8 h-8 border-t-[6px] border-l-[6px] border-brand-400 rounded-tl-xl shadow-[0_0_15px_rgba(250,204,21,0.5)] -mt-1 -ml-1 transition-all duration-300"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-[6px] border-r-[6px] border-brand-400 rounded-tr-xl shadow-[0_0_15px_rgba(250,204,21,0.5)] -mt-1 -mr-1 transition-all duration-300"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[6px] border-l-[6px] border-brand-400 rounded-bl-xl shadow-[0_0_15px_rgba(250,204,21,0.5)] -mb-1 -ml-1 transition-all duration-300"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[6px] border-r-[6px] border-brand-400 rounded-br-xl shadow-[0_0_15px_rgba(250,204,21,0.5)] -mb-1 -mr-1 transition-all duration-300"></div>
             
             {/* Scanning Line Animation */}
             {!isProcessing && (
                <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
             )}
          </div>
          
          <div className="absolute -bottom-10 left-0 right-0 text-center">
            <span className="text-[10px] font-black tracking-widest text-brand-400 bg-black/80 px-3 py-1.5 rounded-full border border-brand-500/20 shadow-lg backdrop-blur-sm">
              ALVO: PREÇO
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 5%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
      `}</style>

      {/* Torch Toggle - Top Right */}
      {hasTorch && (
        <button
          onClick={toggleTorch}
          className={`absolute top-4 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all pointer-events-auto ${
            isTorchOn 
            ? 'bg-brand-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-110' 
            : 'bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60'
          }`}
        >
          {isTorchOn ? <Zap size={22} fill="currentColor" strokeWidth={0} /> : <ZapOff size={22} />}
        </button>
      )}

      {/* Capture Button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto z-40">
        <button
          onClick={handleCapture}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl ${
            isProcessing 
              ? 'bg-dark-800 scale-95 border-4 border-dark-600 cursor-not-allowed' 
              : 'bg-transparent border-[6px] border-white/90 hover:bg-white/10 active:scale-90 active:border-brand-400'
          }`}
          aria-label="Scan Price"
        >
          <div className={`w-16 h-16 rounded-full transition-all duration-300 ${
            isProcessing ? 'bg-gray-500 animate-pulse scale-75' : 'bg-white scale-90 active:scale-100 active:bg-brand-400'
          }`}></div>
        </button>
      </div>
    </div>
  );
};