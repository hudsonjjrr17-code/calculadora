import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertTriangle, Zap, ZapOff, Maximize2, Lock, WifiOff } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (base64Image: string) => void;
  isProcessing: boolean;
  isOffline: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, isProcessing, isOffline }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const startCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setStreamError(null);
    setIsPermissionError(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStreamError("CÂMERA INDISPONÍVEL (Requer HTTPS)");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities.torch) {
        setHasTorch(true);
      }
      setStreamError(null);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStreamError("PERMISSÃO DA CÂMERA NEGADA");
        setIsPermissionError(true);
      } else {
        setStreamError("ERRO AO INICIAR CÂMERA");
        setIsPermissionError(false);
      }
    }
  };

  useEffect(() => {
    if (!isOffline) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [isOffline]);

  const toggleTorch = async () => {
    triggerHaptic();
    if (streamRef.current && hasTorch) {
      const track = streamRef.current.getVideoTracks()[0];
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
    // Stronger capture feedback
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200); // Increased duration for better visibility

    if (navigator.vibrate) navigator.vibrate(50); 
    
    if (videoRef.current && canvasRef.current && !isProcessing) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.90);
        onCapture(base64);
      }
    }
  };

  if (streamError) {
    return (
      <div className="relative w-full aspect-[4/5] bg-dark-900 rounded-[32px] flex flex-col items-center justify-center text-center p-6 border-4 border-dark-900 shadow-2xl">
        <div className="bg-accent-500/10 p-4 rounded-full mb-4">
          {isPermissionError ? 
            <Lock className="text-accent-500" size={32} /> :
            <AlertTriangle className="text-accent-500" size={32} />
          }
        </div>
        <p className="text-white font-bold uppercase tracking-widest text-sm">{streamError}</p>
        
        {isPermissionError ? (
          <>
            <p className="text-gray-500 text-xs mt-2 max-w-[250px]">
              Para continuar, autorize o acesso à câmera nas configurações do seu navegador.
            </p>
            <button
              onClick={startCamera}
              className="mt-6 bg-brand-500 text-black font-bold text-sm px-6 py-3 rounded-full hover:bg-brand-400 transition-all active:scale-95 shadow-lg shadow-brand-500/10"
            >
              Tentar Novamente
            </button>
          </>
        ) : (
          <p className="text-gray-500 text-xs mt-2 max-w-[200px]">
            Verifique as conexões ou tente recarregar a página.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/5] bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-dark-900 isolate ring-1 ring-white/10">
      
      {/* Offline Overlay */}
      {isOffline && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-center p-4">
          <WifiOff size={40} className="text-gray-600 mb-4" />
          <h3 className="font-bold text-white uppercase tracking-wider">Modo Offline</h3>
          <p className="text-sm text-gray-400 mt-1">O scanner de câmera requer conexão com a internet.</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-all duration-300 ${isProcessing || isOffline ? 'opacity-50 blur-sm' : 'opacity-100'} ${flashActive ? 'scale-110 brightness-150' : ''}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Shutter Flash - More impactful */}
      <div 
        className={`absolute inset-0 bg-white/80 pointer-events-none transition-opacity duration-200 z-50 ${flashActive ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Modern Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Blurred Outer Mask */}
        <div className="absolute inset-0">
          {/* Clear Center Cutout */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[45%] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-3xl"></div>
        </div>

        {/* Scanner Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[45%]">
          {/* Corner Brackets - More prominent */}
          <div className="absolute -top-2 -left-2 w-10 h-10 border-t-[6px] border-l-[6px] border-brand-400 rounded-tl-xl"></div>
          <div className="absolute -top-2 -right-2 w-10 h-10 border-t-[6px] border-r-[6px] border-brand-400 rounded-tr-xl"></div>
          <div className="absolute -bottom-2 -left-2 w-10 h-10 border-b-[6px] border-l-[6px] border-brand-400 rounded-bl-xl"></div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 border-b-[6px] border-r-[6px] border-brand-400 rounded-br-xl"></div>
             
          {/* Laser Scan Line - Enhanced */}
          {!isProcessing && !isOffline && (
            <div className="absolute left-0 right-0 h-1 bg-brand-400 rounded-full shadow-[0_0_20px_2px_rgba(250,204,21,0.6)] animate-[scan_3s_ease-in-out_infinite]"></div>
          )}

          {/* Status Badge */}
          <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
             <div className="flex items-center gap-2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                <Maximize2 size={12} className="text-brand-400 animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/90">
                  {isProcessing ? 'ANALISANDO...' : 'BUSCANDO PREÇO'}
                </span>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-10%); opacity: 0; }
          10%, 90% { opacity: 1; }
          100% { transform: translateY(110%); opacity: 0; }
        }
      `}</style>

      {/* Torch Button */}
      {hasTorch && !isOffline && (
        <button
          onClick={toggleTorch}
          className={`absolute top-4 right-4 z-40 p-3 rounded-full transition-all duration-300 ${
            isTorchOn 
            ? 'bg-brand-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]' 
            : 'bg-black/30 text-white backdrop-blur-md border border-white/10 hover:bg-black/50'
          }`}
        >
          {isTorchOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
        </button>
      )}

      {/* Capture Button Area */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto z-40">
        <button
          onClick={handleCapture}
          disabled={isProcessing || isOffline}
          className={`group relative flex items-center justify-center transition-all duration-300 ${isProcessing || isOffline ? 'scale-95 opacity-50 cursor-not-allowed' : 'active:scale-90'}`}
          aria-label="Capturar"
        >
          {/* Outer Ring */}
          <div className={`w-20 h-20 rounded-full border-[3px] transition-all duration-300 ${
            isProcessing ? 'border-brand-500/30' : 'border-white/80 group-hover:border-brand-400'
          }`}></div>
          
          {/* Inner Circle */}
          <div className={`absolute w-16 h-16 rounded-full transition-all duration-300 shadow-lg ${
            isProcessing 
              ? 'bg-brand-500 animate-pulse-fast' 
              : 'bg-white group-active:bg-brand-400 group-active:scale-95'
          }`}></div>
        </button>
      </div>
    </div>
  );
};