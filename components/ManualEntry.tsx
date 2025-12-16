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
      name: name.trim() || 'ITEM MANUAL',
      unitPrice: parsedPrice,
      quantity: quantity
    });

    // Reset fields
    setName('');
    setPrice('');
    setQuantity(1);
  };

  return (
    <div className="p-4 animate-fade-in">
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-500 text-black rounded">
             <Calculator size={20} strokeWidth={3} />
          </div>
          <h2 className="text-lg font-black text-white italic tracking-tight uppercase">Entrada Manual</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Produto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="EX: ARROZ"
              className="w-full bg-black border border-dark-800 rounded-lg px-4 py-4 text-white placeholder-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-bold uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Valor Unit.</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-mono">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-dark-800 rounded-lg pl-10 pr-4 py-4 text-white placeholder-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-mono font-bold text-lg"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Quantidade</label>
              <div className="flex items-center bg-black border border-dark-800 rounded-lg overflow-hidden h-[62px]">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 h-full hover:bg-white/10 text-gray-500 transition-colors font-bold text-lg"
                >
                  -
                </button>
                <div className="flex-1 text-center font-black text-white">
                  {quantity}
                </div>
                <button 
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 h-full hover:bg-white/10 text-brand-500 transition-colors font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-brand-500 hover:bg-brand-400 text-black font-black uppercase tracking-wider py-4 rounded-lg shadow-lg shadow-brand-500/10 hover:shadow-brand-500/30 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            Adicionar
          </button>
        </form>
      </div>
    </div>
  );
};