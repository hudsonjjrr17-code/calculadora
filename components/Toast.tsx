import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000); // Auto-dismiss after 3 seconds
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-safe-top top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[calc(100%-2rem)] animate-slide-down-bounce">
      <div 
        className={`flex items-center gap-3 w-full rounded-2xl p-4 shadow-2xl border backdrop-blur-md ${
          isSuccess 
          ? 'bg-green-500/90 border-green-400/50 text-white' 
          : 'bg-red-500/90 border-red-400/50 text-white'
        }`}
      >
        {isSuccess ? <CheckCircle size={20} strokeWidth={2.5} /> : <XCircle size={20} strokeWidth={2.5} />}
        <p className="font-bold text-sm flex-1 truncate">{message}</p>
        <button onClick={onDismiss} className="p-1 -mr-2 opacity-70 hover:opacity-100 transition-transform active:scale-90">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};