import React from 'react';
import { CartItem } from '../types';
import { Trash2, ShoppingCart, Tag } from 'lucide-react';

interface CartListProps {
  items: CartItem[];
  onRemove: (id: string) => void;
}

export const CartList: React.FC<CartListProps> = ({ items, onRemove }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-600 animate-fade-in">
        <div className="bg-dark-900/50 p-8 rounded-full mb-6 border border-dark-800/50 shadow-inner">
          <ShoppingCart size={40} className="opacity-20 text-white" />
        </div>
        <p className="font-bold uppercase tracking-widest text-xs text-gray-500">Seu carrinho está vazio</p>
        <p className="text-[10px] text-gray-600 mt-2">Escaneie um item para começar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-36 px-1">
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
              className="text-gray-500 hover:text-accent-500 hover:bg-accent-500/10 p-2 -mr-2 rounded-lg transition-all"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};