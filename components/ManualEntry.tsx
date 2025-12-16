import React, 'react';
import { Delete, Plus } from 'lucide-react';
import { CartItem } from '../types';

interface ManualEntryProps {
  onAddItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
}

export const ManualEntry: React.FC<ManualEntryProps> = ({ onAddItem }) => {
  const [display, setDisplay] = React.useState('0');
  const [prevValue, setPrevValue] = React.useState<number | null>(null);
  const [operator, setOperator] = React.useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = React.useState(false);

  // Native Android Haptic Feedback
  const triggerHaptic = (ms: number = 10) => {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };
  
  const calculate = (a: number, b: number, op: string) => {
    // Avoid floating point issues with multiplication and division
    const precision = 100;
    switch (op) {
      case '+': return (a * precision + b * precision) / precision;
      case '-': return (a * precision - b * precision) / precision;
      case '*': return (a * b);
      case '/': return (a / b);
      default: return b;
    }
  };

  const handleNumber = (num: string) => {
    triggerHaptic(8); // Light vibration for numbers
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    triggerHaptic(8);
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    triggerHaptic(15);
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const handleOperation = (op: string) => {
    triggerHaptic(12); // Slightly stronger for operations
    const current = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(current);
    } else if (operator) {
      const result = calculate(prevValue, current, operator);
      setPrevValue(result);
      setDisplay(String(result));
    }

    setWaitingForNewValue(true);
    setOperator(op);
  };

  const handleEquals = () => {
    triggerHaptic(20); // Stronger for equals
    if (operator && prevValue !== null) {
      const current = parseFloat(display);
      const result = calculate(prevValue, current, operator);
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setWaitingForNewValue(true);
    }
  };

  const handleBackspace = () => {
    triggerHaptic(10);
    if (waitingForNewValue) return;
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  // Helper function to determine the value to be launched
  const getValueToLaunch = () => {
    const current = parseFloat(display);
    if (operator && prevValue !== null && !waitingForNewValue) {
        return calculate(prevValue, current, operator);
    }
    return current;
  };

  const addToCart = () => {
    triggerHaptic(40); // Success vibration
    const valueToAdd = getValueToLaunch();

    if (valueToAdd > 0) {
      onAddItem({
        name: 'ITEM CALCULADO',
        unitPrice: valueToAdd,
        quantity: 1
      });
      clear();
    }
  };

  // Helper for button styles - REMOVED h-16, ADDED aspect-square
  const btnBase = "aspect-square rounded-2xl font-bold text-2xl transition-all active:scale-95 flex items-center justify-center select-none shadow-lg touch-manipulation";
  const btnNum = `${btnBase} bg-dark-800 text-white hover:bg-dark-900 shadow-black/40`;
  const btnOp = `${btnBase} bg-brand-500 text-black hover:bg-brand-400 shadow-brand-500/10`;
  const btnClear = `${btnBase} bg-accent-500/20 text-accent-500 hover:bg-accent-500/30`;
  
  const valueForButton = getValueToLaunch();

  return (
    <div className="h-full flex flex-col p-3">
      {/* Display Screen */}
      <div className="bg-black border border-dark-800 rounded-3xl p-6 mb-3 flex flex-col items-end justify-center shadow-inner shadow-dark-900 min-h-[120px]">
        <div className="text-gray-500 text-sm h-6 font-mono mb-1">
          {prevValue !== null && operator ? `${prevValue} ${operator}` : ''}
        </div>
        <div className="text-5xl font-mono font-black tracking-tighter text-white break-all">
          {display}
        </div>
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-4 gap-3">
        <button onClick={clear} className={`${btnClear}`}>C</button>
        <button onClick={() => handleOperation('/')} className={btnOp}>÷</button>
        <button onClick={() => handleOperation('*')} className={btnOp}>×</button>
        <button onClick={handleBackspace} className={`${btnBase} bg-dark-800 text-gray-400 hover:text-white`}><Delete size={24} /></button>

        <button onClick={() => handleNumber('7')} className={btnNum}>7</button>
        <button onClick={() => handleNumber('8')} className={btnNum}>8</button>
        <button onClick={() => handleNumber('9')} className={btnNum}>9</button>
        <button onClick={() => handleOperation('-')} className={btnOp}>−</button>

        <button onClick={() => handleNumber('4')} className={btnNum}>4</button>
        <button onClick={() => handleNumber('5')} className={btnNum}>5</button>
        <button onClick={() => handleNumber('6')} className={btnNum}>6</button>
        <button onClick={() => handleOperation('+')} className={btnOp}>+</button>

        <button onClick={() => handleNumber('1')} className={btnNum}>1</button>
        <button onClick={() => handleNumber('2')} className={btnNum}>2</button>
        <button onClick={() => handleNumber('3')} className={btnNum}>3</button>
        <button onClick={handleEquals} className={`${btnBase} bg-brand-400 text-black row-span-2 shadow-brand-500/20`}>=</button>

        <button onClick={() => handleNumber('0')} className={`${btnNum} col-span-2`}>0</button>
        <button onClick={handleDecimal} className={btnNum}>.</button>
      </div>

      {/* Add to Cart Button - Pushed to bottom with mt-auto */}
      <div className="mt-auto pt-3">
        <button 
          onClick={addToCart}
          disabled={valueForButton === 0}
          className="w-full h-14 bg-dark-800 border border-brand-500/30 rounded-2xl flex items-center justify-center gap-3 text-brand-500 font-black uppercase tracking-wider hover:bg-brand-500 hover:text-black transition-all active:scale-95 shadow-lg shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <Plus size={20} strokeWidth={3} />
          Lançar R$ {valueForButton.toFixed(2)}
        </button>
      </div>
    </div>
  );
};