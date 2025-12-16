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
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="bg-dark-800/50 p-6 rounded-full mb-4">
          <ShoppingCart size={32} className="opacity-50" />
        </div>
        <p className="font-medium">Carrinho vazio</p>
        <p className="text-sm opacity-60">Adicione itens para começar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-32 px-1">
      {items.map((item) => (
        <div key={item.id} className="group bg-dark-800/60 backdrop-blur-sm border border-white/5 hover:border-white/10 rounded-2xl p-4 flex justify-between items-center shadow-lg animate-slide-up transition-all">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-medium text-white text-base truncate">{item.name}</h3>
            <div className="text-gray-400 text-sm mt-0.5 font-mono">
              <span className="text-gray-500">{item.quantity}x</span> R$ {item.unitPrice.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-brand-400 text-lg font-mono">
              R$ {item.totalPrice.toFixed(2)}
            </span>
            <button
              onClick={() => onRemove(item.id)}
              className="text-gray-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};