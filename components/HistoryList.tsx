import React from 'react';
import { ShoppingSession } from '../types';
import { Calendar, ShoppingBag, Trash2, Clock } from 'lucide-react';

interface HistoryListProps {
  history: ShoppingSession[];
  onClearHistory: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onClearHistory }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-700 animate-fade-in">
        <Clock size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-bold uppercase tracking-wider">Sem histórico</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-xl font-black italic text-white uppercase tracking-tight">Registro</h2>
        <button 
          onClick={onClearHistory}
          className="text-[10px] text-accent-500 hover:text-accent-400 font-bold uppercase tracking-widest flex items-center gap-1 bg-accent-500/10 px-2 py-1 rounded"
        >
          <Trash2 size={12} /> Limpar Tudo
        </button>
      </div>

      {history.map((session) => (
        <div key={session.id} className="bg-dark-900 border border-dark-800 rounded-lg p-4 shadow-sm flex justify-between items-center hover:border-brand-500/30 transition-colors">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-[10px] mb-1 font-mono uppercase">
              <Calendar size={10} />
              {new Date(session.date).toLocaleDateString('pt-BR')} 
              <span className="text-dark-800">|</span>
              {new Date(session.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
            </div>
            <div className="flex items-center gap-3">
               <span className="text-brand-400 font-black text-xl font-mono tracking-tighter">
                 R$ {session.total.toFixed(2)}
               </span>
               <span className="text-[10px] bg-dark-800 text-gray-400 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                 <ShoppingBag size={10} /> {session.itemCount} itens
               </span>
            </div>
          </div>
          
          <div className="h-8 w-8 rounded bg-brand-500 flex items-center justify-center text-black shadow-[0_0_10px_rgba(234,179,8,0.2)]">
            <CheckCircleIcon />
          </div>
        </div>
      ))}
    </div>
  );
};

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);