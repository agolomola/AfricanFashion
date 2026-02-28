import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  designId: string;
  designName: string;
  designImage: string;
  fabricId: string;
  fabricName: string;
  fabricImage: string;
  fabricMeters: number;
  fabricPrice: number;
  designerId: string;
  designerName: string;
  measurements: Record<string, number>;
  basePrice: number;
  totalPrice: number;
  tryOnImage?: string | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  totalPrice: number;
  itemCount: number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        set((state) => ({
          items: [...state.items, item],
        }));
      },
      
      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },
      
      updateItem: (index, updates) => {
        set((state) => ({
          items: state.items.map((item, i) => {
            if (i === index) {
              const updatedItem = { ...item, ...updates };
              // Recalculate total price if fabricMeters changed
              if (updates.fabricMeters) {
                updatedItem.totalPrice = updatedItem.basePrice + 
                  (updatedItem.fabricPrice * updatedItem.fabricMeters);
              }
              return updatedItem;
            }
            return item;
          }),
        }));
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      get totalPrice() {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
      },
      
      get itemCount() {
        return get().items.length;
      },
      
      getItemCount: () => get().items.length,
    }),
    {
      name: 'cart-storage',
    }
  )
);
