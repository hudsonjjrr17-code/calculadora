import React, { useState, useMemo, useEffect } from 'react';
import { Scan, Calculator, History as HistoryIcon, CheckCircle, Download, ShoppingCart, X, Smartphone, WifiOff } from 'lucide-react';
import { CameraScanner } from './components/CameraScanner';
import { EditItemModal } from './components/EditItemModal';
import { CartList } from './components/CartList';
import { ManualEntry } from './components/ManualEntry';
import { HistoryList } from './components/HistoryList';
import { AppState, CartItem, ScannedData, ActiveTab, ShoppingSession } from './types';
import { analyzePriceTag } from './services/geminiService';

// Safe ID generator that works in all environments (http/https/older browsers)
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.SCANNER);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingScan, setPendingScan] = useState<ScannedData | null>(null);
  
  // Offline State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isInstallBannerVisible, setIsInstallBannerVisible] = useState(true);
  
  // History State
  const [history, setHistory] = useState<ShoppingSession[]>(() => {
    try {
      const saved = localStorage.getItem('shopping_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('shopping_history', JSON.stringify(history));
  }, [history]);

  // Offline/Online Listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  // Handle Android Back Button Logic
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (appState === AppState.CONFIRMING) {
        setPendingScan(null);
        setAppState(AppState.IDLE);
      } 
      else if (activeTab !== ActiveTab.SCANNER) {
        setActiveTab(ActiveTab.SCANNER);
      }
    };
    window.addEventListener('popstate', handlePopState);
    if (appState === AppState.CONFIRMING || activeTab !== ActiveTab.SCANNER) {
      window.history.pushState({ view: 'modal_or_tab' }, '');
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [appState, activeTab]);

  // PWA Install Prompt Listener
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

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleTabChange = (tab: ActiveTab) => {
    triggerHaptic();
    setActiveTab(tab);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleCapture = async (base64Image: string) => {
    if (isOffline) {
      alert("Função indisponível offline. Conecte-se à internet para usar o scanner.");
      return;
    }
    
    setAppState(AppState.PROCESSING);
    triggerHaptic();
    
    try {
      const result = await analyzePriceTag(base64Image);
      
      if (result) {
        setPendingScan({
          price: result.price,
          guessedName: result.guessedName,
          productCode: result.productCode
        });
      } else {
        setPendingScan({
          price: 0,
          guessedName: ''
        });
      }
    } catch (error) {
      console.error("Erro ao processar imagem", error);
      setPendingScan({
        price: 0,
        guessedName: ''
      });
    } finally {
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]); 
      setAppState(AppState.CONFIRMING);
    }
  };

  const handleAddItem = (newItemData: Omit<CartItem, 'id' | 'totalPrice'>) => {
    const newItem: CartItem = {
      ...newItemData,
      id: generateId(),
      totalPrice: newItemData.unitPrice * newItemData.quantity,
    };
    setItems((prev) => [newItem, ...prev]);
    setPendingScan(null);
    setAppState(AppState.IDLE);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const handleRemoveItem = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const handleFinalize = () => {
    if (items.length === 0) return;
    if (navigator.vibrate) navigator.vibrate(20);
    if (!window.confirm("Finalizar esta compra e salvar no histórico?")) return;

    const session: ShoppingSession = {
      id: generateId(),
      date: new Date().toISOString(),
      total: totalAmount,
      itemCount: items.length,
      items: [...items]
    };

    setHistory(prev => [session, ...prev]);
    setItems([]);
    setActiveTab(ActiveTab.HISTORY);
  };

  const handleClearHistory = () => {
    if (window.confirm("Apagar todo o histórico de compras?")) {
      setHistory([]);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case ActiveTab.SCANNER:
        return (
          <div className="flex flex-col flex-1 min-h-0 animate-fade-in">
            <div className="px-4 pt-2">
              <CameraScanner 
                onCapture={handleCapture} 
                isProcessing={appState === AppState.PROCESSING} 
                isOffline={isOffline}
              />
            </div>
            {/* Lista de itens com altura fixa e rolagem interna */}
            <div className="px-4 flex-1 min-h-0 flex flex-col mt-4">
              <div className="flex items-center gap-3 mb-2 opacity-50 shrink-0">
                 <div className="h-px bg-white/20 flex-1"></div>
                 <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Lista</span>
                 <div className="h-px bg-white/20 flex-1"></div>
              </div>
              <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0 overflow-y-auto no-scrollbar pt-1 pb-24">
                  <CartList items={items} onRemove={handleRemoveItem} />
                </div>
              </div>
            </div>
          </div>
        );
      case ActiveTab.CALCULATOR:
        return (
          <div className="animate-fade-in h-full flex flex-col p-2">
             <ManualEntry onAddItem={handleAddItem} />
             {items.length > 0 && (
               <div className="px-2 mt-2 pb-2 shrink-0">
                 <div className="flex items-center gap-3 mb-2 opacity-50">
                   <div className="h-px bg-white/20 flex-1"></div>
                   <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Últimos Itens</span>
                   <div className="h-px bg-white/20 flex-1"></div>
                 </div>
                 {/* Mostra apenas os 3 itens mais recentes para economizar espaço */}
                 <div className="max-h-24 overflow-hidden no-scrollbar relative">
                   <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>
                   <CartList items={items.slice(0, 3)} onRemove={handleRemoveItem} isCompact={true} />
                 </div>
              </div>
             )}
          </div>
        );
      case ActiveTab.HISTORY:
        return (
          <div className="flex-1 min-h-0 animate-fade-in">
            <HistoryList history={history} onClearHistory={handleClearHistory} />
          </div>
        );
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto relative bg-black text-white shadow-2xl overflow-hidden app-select-none border-x border-dark-900">
      
      {/* iOS Status Bar Spacer */}
      <div className="h-safe-top bg-black w-full shrink-0"></div>

      {/* Header */}
      <header className="pt-6 pb-2 px-6 bg-gradient-to-b from-black to-transparent z-10 flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-black italic tracking-tighter text-white">
          Supermarket Calculadora
        </h1>
        
        <div className="flex items-center gap-4">
          {isOffline && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold bg-dark-900/50 px-2 py-1 rounded-full border border-dark-800">
              <WifiOff size={12} strokeWidth={3} />
              <span>OFFLINE</span>
            </div>
          )}
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 text-[10px] bg-dark-800 text-white border border-white/10 px-3 py-1.5 rounded-full font-bold hover:bg-brand-500 hover:text-black transition-all"
            >
              <Download size={12} strokeWidth={3} />
              APP
            </button>
          )}
        </div>
      </header>

      {/* Main Area com PWA Banner */}
      {showInstallBtn && isInstallBannerVisible && (
        <div className="shrink-0 mx-4 mt-2 mb-2 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 text-black shadow-lg shadow-brand-500/10 animate-slide-up relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/30 transition-all"></div>
           <button onClick={() => setIsInstallBannerVisible(false)} className="absolute top-3 right-3 p-1 text-black/40 hover:text-black transition-colors z-20"><X size={18} /></button>
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

      {/* Main Content Area - Flexível e sem rolagem externa */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {renderContent()}
      </main>

      {/* Floating Total Bar (Glassmorphism) */}
      {(activeTab === ActiveTab.SCANNER || activeTab === ActiveTab.CALCULATOR) && (
        <div className="absolute bottom-[85px] left-4 right-4 z-20 pb-safe-bottom">
          <div className="bg-dark-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex justify-between items-center transition-all duration-300">
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Total Estimado</p>
              <div className="text-3xl font-black text-white font-mono tracking-tighter leading-none flex items-baseline">
                <span className="text-brand-500 text-lg mr-1.5">R$</span>
                {totalAmount.toFixed(2)}
              </div>
            </div>
            <button 
              onClick={handleFinalize}
              disabled={items.length === 0}
              className={`h-12 px-6 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 ${
                items.length > 0 
                ? 'bg-brand-500 text-black hover:bg-brand-400 shadow-[0_0_20px_rgba(234,179,8,0.25)]' 
                : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              <span className="text-xs">Finalizar</span>
              <CheckCircle size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="shrink-0 bg-black/95 border-t border-white/5 pb-safe-bottom pt-2 px-2 z-30 h-[85px] relative">
        <ul className="flex justify-around items-center h-full pb-3">
          <li>
            <button 
              onClick={() => handleTabChange(ActiveTab.SCANNER)}
              className={`group flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-300 ${activeTab === ActiveTab.SCANNER ? 'bg-white/10 text-brand-400' : 'text-gray-500 hover:text-white'}`}
            >
              <Scan size={22} strokeWidth={activeTab === ActiveTab.SCANNER ? 3 : 2} className="transition-transform group-active:scale-90" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Scan</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabChange(ActiveTab.CALCULATOR)}
              className={`group flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-300 ${activeTab === ActiveTab.CALCULATOR ? 'bg-white/10 text-brand-400' : 'text-gray-500 hover:text-white'}`}
            >
              <Calculator size={22} strokeWidth={activeTab === ActiveTab.CALCULATOR ? 3 : 2} className="transition-transform group-active:scale-90" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Calc</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabChange(ActiveTab.HISTORY)}
              className={`group flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-300 ${activeTab === ActiveTab.HISTORY ? 'bg-white/10 text-brand-400' : 'text-gray-500 hover:text-white'}`}
            >
              <HistoryIcon size={22} strokeWidth={activeTab === ActiveTab.HISTORY ? 3 : 2} className="transition-transform group-active:scale-90" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Logs</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Modals */}
      {appState === AppState.CONFIRMING && pendingScan && (
        <EditItemModal
          scannedData={pendingScan}
          onConfirm={handleAddItem}
          onCancel={() => { setPendingScan(null); setAppState(AppState.IDLE); }}
        />
      )}
    </div>
  );
};

export default App;