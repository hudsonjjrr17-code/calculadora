import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertTriangle, Zap, ZapOff, Maximize2, Lock, WifiOff, MousePointerClick } from 'lucide-react';
import { AppState } from '../types';
import { initializeOfflineDetectors, detectFromVideoFrame } from '../services/offlineOcrService';

interface CameraScannerProps {
  onCapture: (base64Image: string, detectedTexts: any[], detectedBarcodes: any[]) => void;
  isProcessing: boolean;
  isOffline: boolean;
  appState: AppState;
}

// Regex to find prices efficiently in the scan loop
const priceRegex = /(?:R\$?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+[,.]\d{2})/;

export const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, isProcessing, isOffline, appState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef(false);
  
  const [isDetectorSupported, setIsDetectorSupported] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Pré-inicializa os detectores offline para escaneamentos subsequentes mais rápidos.
  useEffect(() => {
    const initDetectors = async () => {
      const { textSupported, barcodeSupported } = await initializeOfflineDetectors();
      setIsDetectorSupported(textSupported || barcodeSupported);
    };
    initDetectors();
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous',
          frameRate: { ideal: 30 }
        } as any,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities.torch) setHasTorch(true);
      
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
      }

      setStreamError(null);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStreamError("PERMISSÃO DA CÂMERA NEGADA");
        setIsPermissionError(true);
      } else {
        setStreamError("ERRO AO INICIAR CÂMERA");
        setIsPermissionError(false);
      }
    }
  };
  
  const takeHighResPicture = () => {
    if (!videoRef.current || !canvasRef.current || appState !== AppState.IDLE) return null;
    
    if (navigator.vibrate) navigator.vibrate(20);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.90);
    }
    return null;
  }
  
  const handleManualCapture = () => {
    if (appState !== AppState.IDLE || !videoRef.current) return;
    const base64 = takeHighResPicture();
    if (base64) {
      onCapture(base64, [], []);
    }
  };

  useEffect(() => {
    if (!isOffline) startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOffline]);
  
  useEffect(() => {
    let animationFrameId: number;

    const scanFrame = async () => {
      // Garante que o componente está em estado de escanear
      if (appState !== AppState.IDLE || isDetectingRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.readyState < 3) {
        animationFrameId = requestAnimationFrame(scanFrame);
        return;
      }

      isDetectingRef.current = true;

      try {
        // Usa o serviço de detecção offline otimizado
        const { detectedTexts, detectedBarcodes } = await detectFromVideoFrame(videoRef.current);
        
        // Aborta se o estado mudou durante a detecção assíncrona
        if (appState !== AppState.IDLE) {
          isDetectingRef.current = false;
          return;
        }

        const priceFound = detectedTexts.some((text: any) => priceRegex.test(text.rawValue));
        const barcodeFound = detectedBarcodes && detectedBarcodes.length > 0;

        if (priceFound || barcodeFound) {
          const base64 = takeHighResPicture();
          if (base64) {
            onCapture(base64, detectedTexts, detectedBarcodes);
            isDetectingRef.current = false;
            return; // Para de escanear até o estado voltar para IDLE
          }
        }
      } catch (e) {
        console.warn('Erro no loop de escaneamento.', e);
      } finally {
        isDetectingRef.current = false;
      }
      
      if (appState === AppState.IDLE) {
        animationFrameId = requestAnimationFrame(scanFrame);
      }
    };

    if (appState === AppState.IDLE && isCameraReady && isDetectorSupported) {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    }
  }, [appState, isCameraReady, isDetectorSupported, onCapture]);

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
        console.error("Erro ao alternar a lanterna", err);
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

  const canAutoScan = isDetectorSupported;

  // Determina os estilos do overlay do scanner com base no estado
  const getScannerStyles = () => {
    if (isProcessing) {
      return {
        corner: 'border-yellow-400 animate-pulse',
        shadow: 'shadow-[0_0_0_9999px_rgba(250,204,21,0.15)]',
      };
    }
    if (appState === AppState.IDLE) {
      if (canAutoScan) {
        return {
          corner: 'animate-scanner-breathing', // A animação fornece a cor da marca
          shadow: 'shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]',
        };
      } else {
        // Modo de escaneamento manual
        return {
          corner: 'border-blue-500',
          shadow: 'shadow-[0_0_0_9999px_rgba(59,130,246,0.1)]',
        };
      }
    }
    // Estado inativo padrão (ex: confirmando)
    return {
      corner: 'border-gray-700',
      shadow: 'shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]',
    };
  };

  const scannerStyles = getScannerStyles();
  const cornerClass = `absolute w-10 h-10 border-[6px] rounded-xl transition-colors duration-300 ${scannerStyles.corner}`;
  const shadowBoxClass = `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[45%] bg-transparent rounded-3xl transition-all duration-300 ${scannerStyles.shadow}`;

  const getStatusText = () => {
    if (isProcessing) return 'ANALISANDO...';
    if (!canAutoScan) return 'TOQUE PARA ESCANEAR';
    return 'PROCURANDO PREÇO/CÓDIGO...';
  };

  return (
    <div 
      onClick={!canAutoScan ? handleManualCapture : undefined}
      className={`relative w-full h-full bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-dark-900 isolate ring-1 ring-white/10 ${!canAutoScan ? 'cursor-pointer' : 'cursor-default'}`}
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

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0">
          <div className={shadowBoxClass}></div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[45%]">
          <div className={`${cornerClass} -top-2 -left-2 border-t border-l rounded-tl-xl`}></div>
          <div className={`${cornerClass} -top-2 -right-2 border-t border-r rounded-tr-xl`}></div>
          <div className={`${cornerClass} -bottom-2 -left-2 border-b border-l rounded-bl-xl`}></div>
          <div className={`${cornerClass} -bottom-2 -right-2 border-b border-r rounded-br-xl`}></div>
        </div>
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className={`flex items-center gap-2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 transition-all ${appState === AppState.IDLE && canAutoScan ? 'animate-pulse-fast' : ''}`}>
                {canAutoScan ?
                  <Maximize2 size={12} className={appState === AppState.IDLE ? 'text-brand-400' : 'text-gray-500'} /> :
                  <MousePointerClick size={12} className={appState === AppState.IDLE ? 'text-brand-400' : 'text-gray-500'} />
                }
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/90">
                  {getStatusText()}
                </span>
             </div>
        </div>
      </div>

      {hasTorch && !isOffline && (
        <button
          onClick={toggleTorch}
          className={`absolute top-4 right-4 z-40 p-3 rounded-full transition-all duration-300 pointer-events-auto active:scale-95 ${isTorchOn ? 'bg-brand-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'bg-black/30 text-white backdrop-blur-md border border-white/10 hover:bg-black/50'}`}
        >
          {isTorchOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
        </button>
      )}
    </div>
  );
};
