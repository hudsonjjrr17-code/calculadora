import React from 'react';
import { CheckCircle } from 'lucide-react';

interface TotalBarProps {
  totalAmount: number;
  itemCount: number;
  onFinalize: () => void;
}

export const TotalBar: React.FC<TotalBarProps> = ({ totalAmount, itemCount, onFinalize }) => {
  return (
    <div className="shrink-0 px-4 pb-2 z-10">
      <div className="bg-dark-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex justify-between items-center transition-all duration-300">
        <div>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Total Estimado</p>
          <div className="text-3xl font-black text-white font-mono tracking-tighter leading-none flex items-baseline">
            <span className="text-brand-500 text-lg mr-1.5">R$</span>
            {totalAmount.toFixed(2)}
          </div>
        </div>
        <button 
          onClick={onFinalize}
          disabled={itemCount === 0}
          className={`h-12 px-6 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 ${
            itemCount > 0 
            ? 'bg-brand-500 text-black hover:bg-brand-400 shadow-[0_0_20px_rgba(234,179,8,0.25)]' 
            : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          <span className="text-xs">Finalizar</span>
          <CheckCircle size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
