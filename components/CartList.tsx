import React from 'react';
import { CartItem } from '../types';
import { Trash2, ShoppingCart } from 'lucide-react';

interface CartListProps {
  items: CartItem[];
  onRemove: (id: string) => void;
}

export const CartList: React.FC<CartListProps> = ({ items, onRemove }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <div className="bg-dark-900 p-6 rounded-full mb-4 border border-dark-800">
          <ShoppingCart size={32} className="opacity-30" />
        </div>
        <p className="font-bold uppercase tracking-wider text-xs">Carrinho Vazio</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-32">
      {items.map((item) => (
        <div key={item.id} className="group bg-dark-900 border border-dark-800 hover:border-brand-500/50 rounded-lg p-3 flex justify-between items-center animate-slide-up transition-all active:scale-[0.99]">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-gray-200 text-sm truncate uppercase">{item.name}</h3>
            <div className="text-gray-500 text-xs mt-0.5 font-mono">
              <span className="text-brand-500 font-bold">{item.quantity}x</span> R$ {item.unitPrice.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-black text-brand-400 text-lg font-mono tracking-tighter">
              R${item.totalPrice.toFixed(2)}
            </span>
            <button
              onClick={() => onRemove(item.id)}
              className="text-dark-800 bg-dark-800 hover:bg-accent-500 hover:text-white p-2 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};