import React, { useState, useEffect, useRef } from 'react';
import { Scan, Calculator, History as HistoryIcon, ShoppingCart } from 'lucide-react';
import { CameraScanner } from './components/CameraScanner';
import { EditItemModal } from './components/EditItemModal';
import { CartList } from './components/CartList';
import { ManualEntry, ManualEntryRef } from './components/ManualEntry';
import { HistoryList } from './components/HistoryList';
import { Toast } from './components/Toast';
import { AppHeader } from './components/Header';
import { TotalBar } from './components/TotalBar';
import { AppState, CartItem, ScannedData, ActiveTab, ShoppingSession } from './types';
import { analyzePriceTag } from './services/geminiService';
import { parseDetectedTexts } from './services/ocrUtils';
import { optimizeImage } from './services/imageOptimizer';

// Safe ID generator that works in all environments (http/https)
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.SCANNER);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingScan, setPendingScan] = useState<ScannedData | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [history, setHistory] = useState<ShoppingSession[]>(() => {
    try {
      const saved = localStorage.getItem('shopping_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [calculatorLaunchValue, setCalculatorLaunchValue] = useState(0);
  const manualEntryRef = useRef<ManualEntryRef>(null);
  const currentScanId = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem('shopping_history', JSON.stringify(history));
  }, [history]);

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

  useEffect(() => {
    const handlePopState = () => {
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  const triggerHaptic = (ms: number = 10) => {
    if (navigator.vibrate) navigator.vibrate(ms);
  };

  const handleTabChange = (tab: ActiveTab) => {
    triggerHaptic();
    setActiveTab(tab);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleCapture = async (base64Image: string, detectedTexts: any[], detectedBarcodes: any[]) => {
    setAppState(AppState.PROCESSING);
    triggerHaptic(50); // Immediate feedback on successful capture
    const scanId = generateId();
    currentScanId.current = scanId;

    // 1. Parse local data for immediate results
    const offlineTextResult = parseDetectedTexts(detectedTexts);
    const firstBarcode = detectedBarcodes?.[0]?.rawValue;
    const initialScanData: ScannedData = { price: 0, guessedName: '', productCode: firstBarcode || '' };

    if (offlineTextResult && offlineTextResult.price > 0) {
        initialScanData.price = offlineTextResult.price;
        initialScanData.guessedName = offlineTextResult.guessedName;
    }
    if (firstBarcode && !initialScanData.guessedName) {
        initialScanData.guessedName = 'Item escaneado';
    }

    // 2. Handle offline case: must show modal as we can't be sure of the name
    if (isOffline) {
        if (initialScanData.price > 0 || initialScanData.productCode) {
            setPendingScan(initialScanData);
            setAppState(AppState.CONFIRMING);
        } else {
            showToast("Falha na leitura. Verifique a conexão.", 'error');
            setAppState(AppState.IDLE);
        }
        return;
    }

    // 3. Online: Enhance with Gemini and decide whether to auto-add or confirm
    try {
        const optimizedImage = await optimizeImage(base64Image, { maxWidth: 1024, quality: 0.8 });
        if (scanId !== currentScanId.current) return; // Abort if a new scan has started

        const onlineResult = await analyzePriceTag(optimizedImage);
        if (scanId !== currentScanId.current) return;

        // 4. Merge local and online results
        const finalScanData = { ...initialScanData };
        if (onlineResult) {
            finalScanData.guessedName = onlineResult.guessedName || initialScanData.guessedName;
            if (finalScanData.price === 0 && onlineResult.price > 0) {
                finalScanData.price = onlineResult.price;
            }
        }
        
        // 5. AUTO-ADD vs. MANUAL CONFIRMATION LOGIC
        const hasPrice = finalScanData.price > 0;
        const hasGoodName = finalScanData.guessedName && !['Item escaneado', 'Item desconhecido'].includes(finalScanData.guessedName) && finalScanData.guessedName.length > 3;

        if (hasPrice && hasGoodName) {
            // High confidence: Auto-add to cart
            showToast(`Adicionado: ${finalScanData.guessedName}`, 'success');
            handleAddItem({
                name: finalScanData.guessedName,
                unitPrice: finalScanData.price,
                quantity: 1,
            });
        } else if (hasPrice || finalScanData.productCode) {
            // Medium confidence: Show modal for user confirmation
            setPendingScan(finalScanData);
            setAppState(AppState.CONFIRMING);
        } else {
            // Low confidence: Show error and reset
            showToast("Não foi possível ler o preço ou código.", 'error');
            setAppState(AppState.IDLE);
        }

    } catch (e) {
        console.error("Error during capture processing:", e);
        // Fallback to local data if API fails
        if (initialScanData.price > 0 || initialScanData.productCode) {
            setPendingScan(initialScanData);
            setAppState(AppState.CONFIRMING);
        } else {
            showToast("Falha na análise da imagem.", 'error');
            setAppState(AppState.IDLE);
        }
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
    triggerHaptic(20);
  };

  const handleRemoveItem = (id: string) => {
    triggerHaptic(15);
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const handleFinalize = () => {
    if (items.length === 0) return;
    triggerHaptic(20);
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
    showToast("Compra salva no histórico!", "success");
  };

  const handleClearHistory = () => {
    if (window.confirm("Apagar todo o histórico de compras?")) {
      setHistory([]);
      showToast("Histórico limpo.", "success");
    }
  };

  const handleReloadSession = (session: ShoppingSession) => {
    if (window.confirm(`Recarregar o carrinho com ${session.itemCount} itens (R$ ${session.total.toFixed(2)})? O carrinho atual será substituído.`)) {
      setItems(session.items);
      setActiveTab(ActiveTab.SCANNER);
      showToast("Carrinho recarregado do histórico!", "success");
    }
  };
  
  const handleLaunchFromCalc = () => {
    manualEntryRef.current?.launch();
  };

  const renderContent = () => {
    switch(activeTab) {
      case ActiveTab.SCANNER:
        return (
          <div className="flex flex-col flex-1 min-h-0 animate-fade-in">
            <div className="px-4 pt-2 flex-[0_0_40%] min-h-[250px] flex-shrink-0">
              <CameraScanner 
                onCapture={handleCapture} 
                isProcessing={appState === AppState.PROCESSING} 
                isOffline={isOffline}
                appState={appState}
              />
            </div>
            <div className="px-4 flex-1 min-h-0 flex flex-col mt-4">
              <div className="flex items-center gap-3 mb-2 opacity-50 shrink-0">
                 <div className="h-px bg-white/20 flex-1"></div>
                 <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Lista</span>
                 <div className="h-px bg-white/20 flex-1"></div>
              </div>
              <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0 overflow-y-auto no-scrollbar pt-1 pb-4">
                  <CartList items={items} onRemove={handleRemoveItem} />
                </div>
              </div>
            </div>
          </div>
        );
      case ActiveTab.CALCULATOR:
        return (
          <div className="animate-fade-in h-full flex flex-col p-2">
             <ManualEntry 
                ref={manualEntryRef}
                onAddItem={handleAddItem} 
                onValueChange={setCalculatorLaunchValue}
             />
             {items.length > 0 && (
               <div className="px-2 mt-2 pb-2 shrink-0">
                 <div className="flex items-center gap-3 mb-2 opacity-50">
                   <div className="h-px bg-white/20 flex-1"></div>
                   <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Últimos Itens</span>
                   <div className="h-px bg-white/20 flex-1"></div>
                 </div>
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
            <HistoryList history={history} onClearHistory={handleClearHistory} onReloadSession={handleReloadSession} />
          </div>
        );
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto relative bg-black text-white shadow-2xl overflow-hidden app-select-none border-x border-dark-900">
      
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="h-safe-top bg-black w-full shrink-0"></div>

      <AppHeader 
        activeTab={activeTab}
        calculatorLaunchValue={calculatorLaunchValue}
        isOffline={isOffline}
        onLaunchFromCalc={handleLaunchFromCalc}
      />

      <main className="flex-1 flex flex-col min-h-0 relative">
        {renderContent()}
      </main>

      {(activeTab === ActiveTab.SCANNER || activeTab === ActiveTab.CALCULATOR) && (
        <TotalBar 
          totalAmount={totalAmount}
          itemCount={items.length}
          onFinalize={handleFinalize}
        />
      )}

      <nav className="shrink-0 bg-black/95 border-t border-white/5 pb-safe-bottom pt-2 px-2 z-20 h-[75px] relative">
        <ul className="flex justify-around items-center h-full pb-2">
          <li>
            <button 
              onClick={() => handleTabChange(ActiveTab.SCANNER)}
              className={`group flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === ActiveTab.SCANNER ? 'text-brand-400' : 'text-gray-500 hover:text-white'}`}
            >
              <Scan size={22} strokeWidth={activeTab === ActiveTab.SCANNER ? 3 : 2} className="transition-transform group-active:scale-90" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Scan</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabChange(ActiveTab.CALCULATOR)}
              className={`group flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === ActiveTab.CALCULATOR ? 'text-brand-400' : 'text-gray-500 hover:text-white'}`}
            >
              <Calculator size={22} strokeWidth={activeTab === ActiveTab.CALCULATOR ? 3 : 2} className="transition-transform group-active:scale-90" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Calc</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleTabChange(ActiveTab.HISTORY)}
              className={`group flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === ActiveTab.HISTORY ? 'text-brand-400' : 'text-gray-500 hover:text-white'}`}
            >
              <HistoryIcon size={22} strokeWidth={activeTab === ActiveTab.HISTORY ? 3 : 2} className="transition-transform group-active:scale-90" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Logs</span>
            </button>
          </li>
        </ul>
      </nav>

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