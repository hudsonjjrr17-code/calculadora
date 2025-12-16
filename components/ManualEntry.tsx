import React, { useState } from 'react';
import { Plus, Calculator } from 'lucide-react';
import { CartItem } from '../types';

interface ManualEntryProps {
  onAddItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
}

export const ManualEntry: React.FC<ManualEntryProps> = ({ onAddItem }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price.replace(',', '.'));
    
    if (!parsedPrice || isNaN(parsedPrice)) return;

    onAddItem({
      name: name.trim() || 'Item Manual',
      unitPrice: parsedPrice,
      quantity: quantity
    });

    // Reset fields
    setName('');
    setPrice('');
    setQuantity(1);
  };

  return (
    <div className="p-5 animate-fade-in">
      <div className="bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 text-brand-400">
          <div className="p-2 bg-brand-500/10 rounded-lg">
             <Calculator size={24} />
          </div>
          <h2 className="text-xl font-semibold text-white">Adicionar Manual</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Nome (Opcional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Arroz 5kg"
              className="w-full bg-dark-900/80 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Preço Unitário</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-dark-900/80 border border-gray-700 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-mono text-lg"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Quantidade</label>
              <div className="flex items-center bg-dark-900/80 border border-gray-700 rounded-xl overflow-hidden h-[54px]">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 h-full hover:bg-white/5 text-gray-400 transition-colors"
                >
                  -
                </button>
                <div className="flex-1 text-center font-bold text-white">
                  {quantity}
                </div>
                <button 
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 h-full hover:bg-white/5 text-brand-400 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-900/50 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus size={20} />
            Adicionar ao Carrinho
          </button>
        </form>
      </div>
    </div>
  );
};