import React, { useState, useMemo, useEffect } from 'react';
import { Scan, Calculator, History as HistoryIcon, CheckCircle } from 'lucide-react';
import { CameraScanner } from './components/CameraScanner';
import { EditItemModal } from './components/EditItemModal';
import { CartList } from './components/CartList';
import { ManualEntry } from './components/ManualEntry';
import { HistoryList } from './components/HistoryList';
import { AppState, CartItem, ScannedData, ActiveTab, ShoppingSession } from './types';
import { analyzePriceTag } from './services/ocrService'; // Alterado para o serviço OCR

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.SCANNER);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingScan, setPendingScan] = useState<ScannedData | null>(null);
  
  // History State
  const [history, setHistory] = useState<ShoppingSession[]>(() => {
    const saved = localStorage.getItem('shopping_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('shopping_history', JSON.stringify(history));
  }, [history]);

  // Calculate Grand Total
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const handleCapture = async (base64Image: string) => {
    setAppState(AppState.PROCESSING);
    
    try {
      // Processa a imagem usando OCR local
      const result = await analyzePriceTag(base64Image);
      
      if (result && result.price > 0) {
        setPendingScan({
          price: result.price,
          guessedName: result.guessedName
        });
      } else {
        // Se falhar ou não achar preço, abre zerado
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    <div className="h-full flex flex-col max-w-md mx-auto relative bg-gradient-to-br from-dark-900 via-dark-900 to-gray-900 text-white shadow-2xl overflow-hidden">
      
      {/* Dynamic Header */}
      <header className="pt-6 pb-2 px-6 bg-transparent z-10 flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-white">
             {activeTab === ActiveTab.SCANNER && 'PriceSnap'}
             {activeTab === ActiveTab.CALCULATOR && 'Calculadora'}
             {activeTab === ActiveTab.HISTORY && 'Histórico'}
           </h1>
           <p className="text-xs text-gray-400 font-medium">Supermarket Assistant</p>
        </div>
        
        {items.length > 0 && activeTab !== ActiveTab.HISTORY && (
          <button 
            onClick={() => { if(window.confirm("Limpar carrinho atual?")) setItems([]) }}
            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-gray-300 transition-colors"
          >
            Limpar
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar">
        
        {/* TAB: SCANNER */}
        {activeTab === ActiveTab.SCANNER && (
          <div className="space-y-4 animate-fade-in">
            <div className="px-4 pt-2">
              <CameraScanner 
                onCapture={handleCapture} 
                isProcessing={appState === AppState.PROCESSING} 
              />
              <div className="mt-3 text-center px-4">
                 <p className="text-gray-400 text-xs">
                   {appState === AppState.PROCESSING 
                     ? "Lendo números na etiqueta..." 
                     : "Aponte para o PREÇO e toque no botão."}
                 </p>
              </div>
            </div>
            
            <div className="px-4">
               <div className="flex items-center gap-2 mb-2 opacity-60">
                 <div className="h-px bg-gray-700 flex-1"></div>
                 <span className="text-xs uppercase tracking-wider font-semibold">Carrinho Atual</span>
                 <div className="h-px bg-gray-700 flex-1"></div>
               </div>
               <CartList items={items} onRemove={handleRemoveItem} />
            </div>
          </div>
        )}

        {/* TAB: CALCULATOR (MANUAL) */}
        {activeTab === ActiveTab.CALCULATOR && (
          <div className="animate-fade-in">
             <ManualEntry onAddItem={handleAddItem} />
             <div className="px-4">
               <div className="flex items-center gap-2 mb-2 opacity-60">
                 <div className="h-px bg-gray-700 flex-1"></div>
                 <span className="text-xs uppercase tracking-wider font-semibold">Itens Adicionados</span>
                 <div className="h-px bg-gray-700 flex-1"></div>
               </div>
               <CartList items={items} onRemove={handleRemoveItem} />
            </div>
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === ActiveTab.HISTORY && (
          <HistoryList history={history} onClearHistory={handleClearHistory} />
        )}

      </main>

      {/* Bottom Floating Total (Only for Scanner and Calc) */}
      {(activeTab === ActiveTab.SCANNER || activeTab === ActiveTab.CALCULATOR) && (
        <div className="absolute bottom-20 left-4 right-4 z-20">
          <div className="bg-dark-800/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Estimado</p>
              <div className="text-3xl font-bold text-white font-mono tracking-tight leading-none mt-1">
                <span className="text-brand-500 text-xl mr-1">R$</span>
                {totalAmount.toFixed(2)}
              </div>
            </div>
            
            <button 
              onClick={handleFinalize}
              disabled={items.length === 0}
              className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                items.length > 0 
                ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/30' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle size={18} />
              Finalizar
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-dark-900/90 backdrop-blur-md border-t border-white/5 pb-5 pt-3 px-6 z-30">
        <ul className="flex justify-between items-center max-w-xs mx-auto">
          <li>
            <button 
              onClick={() => setActiveTab(ActiveTab.SCANNER)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === ActiveTab.SCANNER ? 'text-brand-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Scan size={24} strokeWidth={activeTab === ActiveTab.SCANNER ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Scanner</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab(ActiveTab.CALCULATOR)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === ActiveTab.CALCULATOR ? 'text-brand-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Calculator size={24} strokeWidth={activeTab === ActiveTab.CALCULATOR ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Manual</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab(ActiveTab.HISTORY)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === ActiveTab.HISTORY ? 'text-brand-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <HistoryIcon size={24} strokeWidth={activeTab === ActiveTab.HISTORY ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Histórico</span>
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