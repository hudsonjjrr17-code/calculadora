import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Delete, Plus } from 'lucide-react';
import { CartItem } from '../types';

interface ManualEntryProps {
  onAddItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  onValueChange: (value: number) => void;
}

export interface ManualEntryRef {
  launch: () => void;
}

export const ManualEntry = forwardRef<ManualEntryRef, ManualEntryProps>(({ onAddItem, onValueChange }, ref) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

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
    triggerHaptic(12);

    // If an operator is pressed immediately after another (e.g., "5 * +"),
    // just update the operator instead of performing an incorrect calculation.
    // The `operator` check correctly handles starting a new chain after "=".
    if (waitingForNewValue && operator) {
      setOperator(op);
      return;
    }

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
    return isNaN(current) ? 0 : current;
  };
  
  const valueForButton = getValueToLaunch();

  useEffect(() => {
    onValueChange(valueForButton);
  }, [valueForButton, onValueChange]);


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
  
  useImperativeHandle(ref, () => ({
    launch: addToCart,
  }));

  // Helper for button styles
  const btnBase = "h-full rounded-2xl font-bold text-2xl transition-all active:scale-95 flex items-center justify-center select-none shadow-lg touch-manipulation";
  const btnNum = `${btnBase} bg-dark-800 text-white hover:bg-dark-900 shadow-black/40`;
  const btnOp = `${btnBase} bg-brand-500 text-black hover:bg-brand-400 shadow-brand-500/10`;
  const btnClear = `${btnBase} bg-dark-800 text-brand-500 hover:bg-dark-900`;

  return (
    <div className="h-full flex flex-col">
      {/* Display Screen */}
      <div className="bg-black border border-dark-800 rounded-3xl p-4 mb-2 flex flex-col items-end justify-center shadow-inner shadow-dark-900 min-h-[90px] shrink-0">
        <div className="text-gray-500 text-sm h-6 font-mono mb-1">
          {prevValue !== null && operator ? `${prevValue} ${operator}` : ''}
        </div>
        <div className="text-4xl sm:text-5xl font-mono font-black tracking-tighter text-white break-all">
          {display}
        </div>
      </div>

      {/* Calculator Grid - Fills remaining space */}
      <div className="flex-1 grid grid-cols-4 grid-rows-5 gap-2">
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
    </div>
  );
});