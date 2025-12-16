import React from 'react';
import { CartItem } from '../types';
import { Trash2, ShoppingCart, Tag } from 'lucide-react';

interface CartListProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  isCompact?: boolean;
}

export const CartList: React.FC<CartListProps> = ({ items, onRemove, isCompact = false }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-600 animate-fade-in h-full">
        <div className="bg-dark-900/50 p-6 rounded-full mb-4 border border-dark-800/50 shadow-inner">
          <ShoppingCart size={32} className="opacity-20 text-white" />
        </div>
        <p className="font-bold uppercase tracking-widest text-xs text-gray-500">Seu carrinho está vazio</p>
        <p className="text-[10px] text-gray-600 mt-2">Adicione um item para começar</p>
      </div>
    );
  }

  if (isCompact) {
    return (
       <div className="flex flex-col gap-2 px-1">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="bg-dark-900/80 border border-dark-800 rounded-lg p-2 flex justify-between items-center"
          >
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-bold text-gray-200 text-xs truncate uppercase">
                {item.name}
              </h3>
              <span className="text-gray-500 text-[10px] font-mono">
                {item.quantity}x R$ {item.unitPrice.toFixed(2)}
              </span>
            </div>
            <span className="font-bold text-white text-sm font-mono tracking-tighter">
              R$ {item.totalPrice.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-1 pb-4">
      {items.map((item, index) => (
        <div 
          key={item.id} 
          style={{ animationDelay: `${index * 50}ms` }}
          className="relative group bg-dark-900/80 backdrop-blur-sm border border-dark-800 hover:border-brand-500/30 rounded-xl p-4 flex justify-between items-center animate-slide-up transition-all active:scale-[0.99] overflow-hidden"
        >
          {/* Accent Line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600"></div>

          <div className="flex-1 min-w-0 pl-3 pr-4">
            <h3 className="font-bold text-gray-100 text-sm leading-tight line-clamp-2 uppercase tracking-wide">
              {item.name}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold bg-dark-800 text-brand-500 px-1.5 py-0.5 rounded border border-dark-700">
                {item.quantity}x
              </span>
              <span className="text-gray-500 text-xs font-mono">
                R$ {item.unitPrice.toFixed(2)} un
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="font-black text-white text-lg font-mono tracking-tighter">
              R$ {item.totalPrice.toFixed(2)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="text-gray-500 hover:text-brand-500 hover:bg-brand-500/10 p-2 -mr-2 rounded-lg transition-all"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};