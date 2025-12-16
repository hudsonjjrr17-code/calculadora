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
      name: name.trim() || 'ITEM GENÉRICO',
      unitPrice: parsedPrice,
      quantity,
    });
  };

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(1, q - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-950 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-brand-500/20 animate-slide-up relative">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight italic">Confirmar Item</h2>

        <div className="space-y-5">
          {/* Name Input */}
          <div>
            <label className="block text-[10px] text-brand-500 mb-1.5 uppercase tracking-widest font-bold">Produto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-lg px-4 py-4 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-bold uppercase placeholder-gray-700"
              placeholder="NOME DO PRODUTO"
            />
          </div>

          <div className="flex gap-4">
            {/* Price Input */}
            <div className="flex-1">
              <label className="block text-[10px] text-brand-500 mb-1.5 uppercase tracking-widest font-bold">Preço</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-lg pl-9 pr-4 py-4 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all font-mono font-bold text-lg"
                />
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="flex-1">
              <label className="block text-[10px] text-brand-500 mb-1.5 uppercase tracking-widest font-bold">Qtd</label>
              <div className="flex items-center bg-dark-900 border border-dark-800 rounded-lg overflow-hidden h-[62px]">
                <button 
                  onClick={decrement}
                  className="px-4 h-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-xl font-bold"
                >
                  -
                </button>
                <div className="flex-1 text-center font-black text-white text-lg">
                  {quantity}
                </div>
                <button 
                  onClick={increment}
                  className="px-4 h-full hover:bg-white/5 text-brand-500 transition-colors text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Subtotal Preview */}
          <div className="bg-dark-900 border border-dark-800 rounded-lg p-4 flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Subtotal</span>
            <span className="text-2xl font-black text-brand-400 font-mono tracking-tighter">
              R$ {((parseFloat(price.replace(',', '.')) || 0) * quantity).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-lg bg-brand-500 hover:bg-brand-400 text-black font-black uppercase tracking-wider shadow-lg shadow-brand-500/10 hover:shadow-brand-500/30 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
          >
            <Check size={20} strokeWidth={3} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
