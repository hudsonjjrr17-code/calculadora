import React, { useState, useMemo } from 'react';
import { Delete, Plus } from 'lucide-react';
import { CartItem } from '../types';

interface ManualEntryProps {
  onAddItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
}

export const ManualEntry: React.FC<ManualEntryProps> = ({ onAddItem }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  // Native Android Haptic Feedback
  const triggerHaptic = (