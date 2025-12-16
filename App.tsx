import React, { useState, useMemo, useEffect } from 'react';
import { Scan, Calculator, History as HistoryIcon, CheckCircle, Download, ShoppingCart } from 'lucide-react';
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
  // Default to CALCULATOR as requested by user
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.CALCULATOR);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingScan, setPendingScan] = useState<ScannedData | null>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
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

  // Calculate Grand Total
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const handleCapture = async (base64Image: string) => {
    setAppState(AppState.PROCESSING);
    
    try {
      const result = await analyzePriceTag(base64Image);
      
      if (result) {
        setPendingScan({
          price: result.price,
          guessedName: result.guessedName
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
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const handleFinalize = () => {
    if (items.length === 0) return;
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

  return (
    // Use 100dvh for mobile browsers
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto relative bg-dark-950 text-white shadow-2xl overflow-hidden app-select-none border-x border-dark-800">
      
      {/* Status Bar Background (iOS Safe Area) */}
      <div className="h-safe-top bg-transparent w-full"></div>

      {/* Dynamic Header */}
      <header className="pt-4 pb-4 px-6 bg-transparent z-10 flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-black italic tracking-tighter text-brand-400">
             {activeTab === ActiveTab.SCANNER && 'SCANNER'}
             {activeTab === ActiveTab.CALCULATOR && 'CALCULADORA'}
             {activeTab === ActiveTab.HISTORY && 'HISTÓRICO'}
           </h1>
           <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">AI Powered System</p>
        </div>
        
        <div className="flex items-center gap-3">
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 text-[10px] bg-brand-500 text-black px-3 py-1.5 rounded font-bold animate-pulse"
            >
              <Download size={12} strokeWidth={3} />
              BAIXAR
            </button>
          )}

          {items.length > 0 && activeTab !== ActiveTab.HISTORY && (
            <button 
              onClick={() => { if(window.confirm("Limpar carrinho atual?")) setItems([]) }}
              className="text-[10px] text-gray-400 hover:text-accent-500 font-bold transition-colors uppercase tracking-wider"
            >
              LIMPAR
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar pb-32">
        
        {/* TAB: SCANNER */}
        {activeTab === ActiveTab.SCANNER && (
          <div className="space-y-4 animate-fade-in h-full flex flex-col">
            <div className="px-4 pt-2">
              <CameraScanner 
                onCapture={handleCapture} 
                isProcessing={appState === AppState.PROCESSING} 
              />
              <div className="mt-4 text-center px-4">
                 <p className="text-gray-500 text-xs font-mono uppercase tracking-tight">
                   {appState === AppState.PROCESSING 
                     ? "/// PROCESSANDO DADOS ///" 
                     : "APONTE A CÂMERA PARA O PREÇO"}
                 </p>
              </div>
            </div>
            
            <div className="px-4 flex-1">
               <div className="flex items-center gap-2 mb-4 mt-2">
                 <div className="h-px bg-dark-800 flex-1"></div>
                 <span className="text-[10px] uppercase tracking-widest font-black text-dark-800">LISTA ATUAL</span>
                 <div className="h-px bg-dark-800 flex-1"></div>
               </div>
               <CartList items={items} onRemove={handleRemoveItem} />
            </div>
          </div>
        )}

        {/* TAB: CALCULATOR (MANUAL) */}
        {activeTab === ActiveTab.CALCULATOR && (
          <div className="animate-fade-in h-full flex flex-col">
             <ManualEntry onAddItem={handleAddItem} />
             {/* Only show list summary in calc mode if there are items, but keep it minimal or hidden to focus on calc */}
             {items.length > 0 && (
               <div className="px-4 mt-2 pb-4">
                 <div className="flex items-center gap-2 mb-4 opacity-60">
                   <div className="h-px bg-dark-800 flex-1"></div>
                   <span className="text-[10px] uppercase tracking-widest font-black text-dark-800">ITENS ADICIONADOS ({items.length})</span>
                   <div className="h-px bg-dark-800 flex-1"></div>
                 </div>
                 {/* Compact list view for calculator tab */}
                 <div className="max-h-32 overflow-y-auto no-scrollbar">
                   <CartList items={items} onRemove={handleRemoveItem} />
                 </div>
              </div>
             )}
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === ActiveTab.HISTORY && (
          <HistoryList history={history} onClearHistory={handleClearHistory} />
        )}

      </main>

      {/* Bottom Floating Total (Only for Scanner and Calc) */}
      {(activeTab === ActiveTab.SCANNER || activeTab === ActiveTab.CALCULATOR) && (
        <div className="absolute bottom-[5.5rem] left-4 right-4 z-20 pointer-events-none">
          <div className="bg-dark-900/90 backdrop-blur-md border border-dark-800 rounded-xl p-4 shadow-2xl shadow-black flex justify-between items-center pointer-events-auto">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Estimado</p>
              <div className="text-3xl font-black text-white font-mono tracking-tighter leading-none mt-1">
                <span className="text-brand-500 text-xl mr-1">R$</span>
                {totalAmount.toFixed(2)}
              </div>
            </div>
            
            <button 
              onClick={handleFinalize}
              disabled={items.length === 0}
              className={`px-6 py-4 rounded-lg font-black uppercase tracking-wide flex items-center gap-2 transition-all active:scale-95 ${
                items.length > 0 
                ? 'bg-brand-500 text-black hover:bg-brand-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                : 'bg-dark-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <CheckCircle size={20} strokeWidth={2.5} />
              <span className="text-sm">Finalizar</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-dark-950/95 backdrop-blur-xl border-t border-dark-800 pb-safe-bottom pt-2 px-6 z-30 h-[80px]">
        <ul className="flex justify-between items-center max-w-xs mx-auto h-full pb-2">
          <li>
            <button 
              onClick={() => setActiveTab(ActiveTab.SCANNER)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${activeTab === ActiveTab.SCANNER ? 'text-brand-400' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Scan size={24} strokeWidth={activeTab === ActiveTab.SCANNER ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">Scanner</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab(ActiveTab.CALCULATOR)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${activeTab === ActiveTab.CALCULATOR ? 'text-brand-400' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Calculator size={24} strokeWidth={activeTab === ActiveTab.CALCULATOR ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">Calc</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab(ActiveTab.HISTORY)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${activeTab === ActiveTab.HISTORY ? 'text-brand-400' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <HistoryIcon size={24} strokeWidth={activeTab === ActiveTab.HISTORY ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider">Histórico</span>
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