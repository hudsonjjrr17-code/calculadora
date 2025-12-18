import React, { useState, useEffect } from 'react';
import { ActiveTab } from '../types';
import { WifiOff, Plus, Download, X, Smartphone, ShoppingCart } from 'lucide-react';

interface AppHeaderProps {
  activeTab: ActiveTab;
  calculatorLaunchValue: number;
  isOffline: boolean;
  onLaunchFromCalc: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  calculatorLaunchValue,
  isOffline,
  onLaunchFromCalc
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isInstallBannerVisible, setIsInstallBannerVisible] = useState(true);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      <header className="pt-4 pb-2 px-4 bg-gradient-to-b from-black to-transparent z-10 flex justify-between items-center shrink-0 gap-4">
        {activeTab === ActiveTab.CALCULATOR ? (
            <button 
              onClick={onLaunchFromCalc}
              disabled={calculatorLaunchValue === 0}
              className="h-12 text-sm bg-dark-800 border border-brand-500/30 rounded-2xl flex items-center justify-center gap-2 text-brand-500 font-bold uppercase tracking-wider hover:bg-brand-500 hover:text-black transition-all active:scale-95 shadow-lg shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation px-4 whitespace-nowrap shrink min-w-0"
            >
              <Plus size={16} strokeWidth={3} className="shrink-0" />
              <span className="truncate">Lançar R$ {calculatorLaunchValue.toFixed(2)}</span>
            </button>
          ) : (
            <h1 className="text-2xl font-black italic tracking-tighter text-white flex items-center gap-2.5 truncate">
              <ShoppingCart size={24} className="text-brand-400 shrink-0" />
              <span className="truncate">Calculadora</span>
            </h1>
        )}
        
        <div className="flex items-center gap-4 shrink-0">
          {isOffline && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold bg-dark-900/50 px-2 py-1 rounded-full border border-dark-800">
              <WifiOff size={12} strokeWidth={3} />
              <span>OFFLINE</span>
            </div>
          )}
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 text-[10px] bg-dark-800 text-white border border-white/10 px-3 py-1.5 rounded-full font-bold hover:bg-brand-500 hover:text-black transition-all active:scale-95"
            >
              <Download size={12} strokeWidth={3} />
              APP
            </button>
          )}
        </div>
      </header>

      {showInstallBtn && isInstallBannerVisible && (
        <div className="shrink-0 mx-4 mt-2 mb-2 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 text-black shadow-lg shadow-brand-500/10 animate-slide-up relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/30 transition-all"></div>
           <button onClick={() => setIsInstallBannerVisible(false)} className="absolute top-3 right-3 p-1 text-black/40 hover:text-black transition-colors z-20 active:bg-black/20 rounded-full"><X size={18} /></button>
           <div className="flex items-center gap-4 relative z-10 mb-3">
             <div className="bg-black/10 p-3 rounded-xl backdrop-blur-sm"><Smartphone size={24} className="text-black" strokeWidth={2.5} /></div>
             <div className="flex-1">
               <h3 className="font-black text-base uppercase leading-none">Instalar App</h3>
               <p className="text-xs font-medium opacity-80 mt-1">Uso offline e performance nativa</p>
             </div>
           </div>
           <button onClick={handleInstallClick} className="w-full bg-black text-brand-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
             <Download size={14} strokeWidth={3} /> Instalar Agora
           </button>
        </div>
      )}
    </>
  );
};