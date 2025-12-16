import React from 'react';
import { ShoppingSession } from '../types';
import { Calendar, ShoppingBag, Trash2 } from 'lucide-react';

interface HistoryListProps {
  history: ShoppingSession[];
  onClearHistory: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onClearHistory }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-fade-in">
        <Calendar size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">Sem histórico</p>
        <p className="text-sm">Suas compras finalizadas aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="p-5 pb-24 space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-white">Minhas Compras</h2>
        <button 
          onClick={onClearHistory}
          className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
        >
          <Trash2 size={12} /> Limpar
        </button>
      </div>

      {history.map((session) => (
        <div key={session.id} className="bg-dark-800/80 backdrop-blur border border-white/5 rounded-xl p-4 shadow-md flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Calendar size={12} />
              {new Date(session.date).toLocaleDateString('pt-BR')} às {new Date(session.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-white font-semibold text-lg">
                 R$ {session.total.toFixed(2)}
               </span>
               <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <ShoppingBag size={10} /> {session.itemCount}
               </span>
            </div>
          </div>
          
          <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};