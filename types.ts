export interface CartItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface ScannedData {
  price: number;
  guessedName: string;
  productCode?: string;
}

export interface ShoppingSession {
  id: string;
  date: string; // ISO String
  total: number;
  itemCount: number;
  items: CartItem[];
}

export enum AppState {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  PROCESSING = 'PROCESSING',
  CONFIRMING = 'CONFIRMING',
}

export enum ActiveTab {
  SCANNER = 'SCANNER',
  CALCULATOR = 'CALCULATOR',
  HISTORY = 'HISTORY',
}