import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertTriangle, Zap, ZapOff, Maximize2, Lock, WifiOff } from 'lucide-react';
import { AppState } from '../types';

// Add BarcodeDetector type if not present in global scope for TS
declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

interface CameraScannerProps {
  onCapture: (base64Image: string) => void;
  isProcessing: boolean;
  isOffline: boolean;
  appState: AppState;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, isProcessing, isOffline, appState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameCounterRef = useRef(0);
  const barcodeDetectorRef = useRef<any | null>(null);

  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTargetDetected, setIsTargetDetected] = useState(false);
  const [focusIndicator, setFocusIndicator] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  // Initialize Barcode Detector once
  useEffect(() => {
    try {
      if ('BarcodeDetector' in window) {
        window.BarcodeDetector.getSupportedFormats().then((supportedFormats: string[]) => {
           barcodeDetectorRef.current = new window.BarcodeDetector({ formats: supportedFormats });
        });
      } else {
        console.warn('Barcode Detector API not supported.');
      }
    } catch (e) {
      console.error('Error initializing BarcodeDetector:', e);
    }
  }, []);

  const startCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraReady(false);
    setStreamError(null);
    setIsPermissionError(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStreamError("CÂMERA INDISPONÍVEL (Requer HTTPS)");
      return;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissionStatus.state === 'denied') {
          setStreamError("PERMISSÃO DA CÂMERA NEGADA");
          setIsPermissionError(true);
          return;
        }
      }
    } catch (e) {
      console.warn("Permissions API check failed, proceeding.", e);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous'
        } as any,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities.torch) setHasTorch(true);
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
  
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || appState !== AppState.IDLE) return;
    
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);
    
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
  };
  
  const handleFocusClick = async (e: React.MouseEvent) => {
    if (!streamRef.current || !videoRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    if (!(capabilities as any).pointsOfInterest) {
      console.warn('Focus point not supported by this device.');
      return;
    }

    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setFocusIndicator({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
    setTimeout(() => setFocusIndicator(f => f ? { ...f, visible: false } : null), 1000);

    try {
      await (track as any).applyConstraints({
        advanced: [{ pointsOfInterest: [{ x, y }] }]
      });
    } catch (error) {
      console.error('Failed to set focus point:', error);
    }
  };

  useEffect(() => {
    if (!isOffline) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOffline]);
  
  // Smart detection loop using requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;

    const analyzeFrameForHighContrast = (ctx: CanvasRenderingContext2D, w: number, h: number): boolean => {
      const region = { x: w * 0.2, y: h * 0.3, width: w * 0.6, height: h * 0.4 };
      const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
      const data = imageData.data;
      let sum = 0, sumSq = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        sum += grayscale;
        sumSq += grayscale * grayscale;
      }
      
      const mean = sum / pixelCount;
      const stdDev = Math.sqrt(sumSq / pixelCount - mean * mean);
      return stdDev > 40; // Threshold for significant contrast (text on label)
    };

    const detectionLoop = async () => {
      frameCounterRef.current++;
      if (appState !== AppState.IDLE || !isCameraReady || !videoRef.current?.videoWidth || !canvasRef.current) {
        setIsTargetDetected(false);
        animationFrameId = requestAnimationFrame(detectionLoop);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      let detected = false;

      // Always check for barcodes as it's efficient and async
      if (barcodeDetectorRef.current) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(canvas);
          if (barcodes.length > 0) detected = true;
        } catch(e) { /* ignore */ }
      }

      // Throttle the more expensive text/contrast detection
      if (!detected && frameCounterRef.current % 3 === 0) {
        if (analyzeFrameForHighContrast(ctx, canvas.width, canvas.height)) {
          detected = true;
        }
      }

      setIsTargetDetected(detected);

      if (detected) {
        handleCapture();
      }

      animationFrameId = requestAnimationFrame(detectionLoop);
    };

    animationFrameId = requestAnimationFrame(detectionLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [appState, isCameraReady, isOffline]);


  const toggleTorch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(10);
    if (streamRef.current && hasTorch) {
      const track = streamRef.current.getVideoTracks()[0];
      const newStatus = !isTorchOn;
      try {
        await track.applyConstraints({ advanced: [{ torch: newStatus } as any] });
        setIsTorchOn(newStatus);
      } catch (err) {
        console.error("Error toggling torch", err);
      }
    }
  };

  if (streamError) {
    return (
      <div className="relative w-full h-full bg-dark-900 rounded-[32px] flex flex-col items-center justify-center text-center p-6 border-4 border-dark-900 shadow-2xl">
        <div className="bg-brand-500/10 p-4 rounded-full mb-4">
          {isPermissionError ? <Lock className="text-brand-500" size={32} /> : <AlertTriangle className="text-brand-500" size={32} />}
        </div>
        <p className="text-white font-bold uppercase tracking-widest text-sm">{streamError}</p>
        {isPermissionError && (
            <p className="text-gray-500 text-xs mt-2 max-w-[250px]">
              Para escanear, <strong>habilite a permissão da câmera nas configurações do navegador</strong> (no ícone de cadeado <Lock size={10} className="inline-block -mt-1"/> na barra de endereço).
            </p>
        )}
      </div>
    );
  }

  const cornerClass = `absolute w-10 h-10 border-[6px] rounded-xl transition-colors duration-200 ${isTargetDetected ? 'border-green-400' : 'border-brand-400'}`;

  return (
    <div 
      onClick={handleFocusClick}
      className="relative w-full h-full bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-dark-900 isolate ring-1 ring-white/10 cursor-pointer"
    >
      {isOffline && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-center p-4">
          <WifiOff size={40} className="text-gray-600 mb-4" />
          <h3 className="font-bold text-white uppercase tracking-wider">Modo Offline</h3>
          <p className="text-sm text-gray-400 mt-1">O scanner de câmera requer conexão.</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onCanPlay={() => setIsCameraReady(true)}
        className={`w-full h-full object-cover transition-all duration-300 ${isProcessing || isOffline ? 'opacity-50 blur-sm' : 'opacity-100'} ${flashActive ? 'scale-110 brightness-150' : ''}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className={`absolute inset-0 bg-white/80 pointer-events-none transition-opacity duration-200 z-50 ${flashActive ? 'opacity-100' : 'opacity-0'}`} />
      
      {focusIndicator?.visible && (
        <div 
          className="absolute w-16 h-16 border-2 border-white rounded-full transition-all duration-500 z-40 animate-focus-pulse pointer-events-none"
          style={{ left: focusIndicator.x, top: focusIndicator.y, transform: 'translate(-50%, -50%)' }}
        />
      )}

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[45%] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-3xl"></div></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[45%]">
          <div className={`${cornerClass} -top-2 -left-2 border-t border-l rounded-tl-xl`}></div>
          <div className={`${cornerClass} -top-2 -right-2 border-t border-r rounded-tr-xl`}></div>
          <div className={`${cornerClass} -bottom-2 -left-2 border-b border-l rounded-bl-xl`}></div>
          <div className={`${cornerClass} -bottom-2 -right-2 border-b border-r rounded-br-xl`}></div>
             
          {!isProcessing && !isOffline && !isTargetDetected && (
            <div className="absolute left-0 right-0 h-1 bg-brand-400 rounded-full shadow-[0_0_20px_2px_rgba(250,204,21,0.6)] animate-[scan_4s_ease-in-out_infinite]"></div>
          )}
          {isTargetDetected && (
             <div className="absolute left-0 right-0 h-1 bg-green-400 rounded-full shadow-[0_0_20px_2px_rgba(74,222,128,0.6)] animate-pulse"></div>
          )}

          <div className="absolute -bottom-12 left-0 right-0 flex flex-col items-center justify-center">
             <div className="flex items-center gap-2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                <Maximize2 size={12} className={isTargetDetected ? "text-green-400" : "text-brand-400 animate-pulse"} />
                <span className={`text-[10px] font-bold tracking-[0.2em] transition-colors ${isTargetDetected ? "text-green-400" : "text-white/90"}`}>
                  {isProcessing ? 'ANALISANDO...' : (isTargetDetected ? 'ALVO DETECTADO!' : 'APONTE PARA A ETIQUETA')}
                </span>
             </div>
             {!isProcessing && !isTargetDetected && (
                <p className="text-white/50 text-[10px] mt-2 font-bold">Toque na tela para focar</p>
             )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan { 0% { transform: translateY(-10%); opacity: 0.5; } 50% { opacity: 1; } 100% { transform: translateY(110%); opacity: 0; } }
        @keyframes focus-pulse { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
        .animate-focus-pulse { animation: focus-pulse 1s ease-out; }
      `}</style>

      {hasTorch && !isOffline && (
        <button
          onClick={toggleTorch}
          className={`absolute top-4 right-4 z-40 p-3 rounded-full transition-all duration-300 pointer-events-auto ${isTorchOn ? 'bg-brand-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'bg-black/30 text-white backdrop-blur-md border border-white/10 hover:bg-black/50'}`}
        >
          {isTorchOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
        </button>
      )}
    </div>
  );
};
