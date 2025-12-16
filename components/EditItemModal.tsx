import React, { useState } from 'react';
import { ScannedData, CartItem } from '../types';
import { X, Check } from 'lucide-react';

interface EditItemModalProps {
  scannedData: ScannedData;
  onConfirm: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  onCancel: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({ scannedData, onConfirm, onCancel }) => {
  const [name, setName] = useState(scannedData.guessedName);
  const [price, setPrice] = useState(scannedData.price.toString());
  const [quantity, setQuantity] = useState(1);
  
  const handleConfirm = () => {
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) return;
    
    onConfirm({
      name: name.trim() || 'Item',
      unitPrice: parsedPrice,
      quantity,
    });
  };

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(1, q - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-dark-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-dark-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10 animate-slide-up relative">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Confirmar Item</h2>

        <div className="space-y-5">
          {/* Name Input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-semibold">Produto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dark-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-4">
            {/* Price Input */}
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-semibold">Preço</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-dark-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3.5 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-semibold">Qtd</label>
              <div className="flex items-center bg-dark-900 border border-gray-700 rounded-xl overflow-hidden h-[50px]">
                <button 
                  onClick={decrement}
                  className="px-3 h-full hover:bg-white/5 text-gray-400 transition-colors"
                >
                  -
                </button>
                <div className="flex-1 text-center font-bold text-white">
                  {quantity}
                </div>
                <button 
                  onClick={increment}
                  className="px-3 h-full hover:bg-white/5 text-brand-400 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Subtotal Preview */}
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 flex justify-between items-center mt-2">
            <span className="text-sm text-brand-200">Subtotal</span>
            <span className="text-xl font-bold text-brand-400 font-mono">
              R$ {((parseFloat(price.replace(',', '.')) || 0) * quantity).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-500 transition-colors shadow-lg shadow-brand-900/50 flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};