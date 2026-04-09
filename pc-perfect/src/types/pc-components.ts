export type ComponentCategory = 
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'motherboard'
  | 'psu'
  | 'case'
  | 'cooling';

export interface PCComponent {
  id: string;
  name: string;
  brand: string;
  category: ComponentCategory;
  price: number;
  usedPrice?: number;
  image: string;
  specs: Record<string, string | number>;
  rating: number;
  inStock: boolean;
  isNew?: boolean;
}

export interface PCBuild {
  id: string;
  name: string;
  components: {
    [key in ComponentCategory]?: PCComponent;
  };
  totalPrice: number;
  createdAt: Date;
}

export interface UserPreferences {
  budget: number;
  usage: 'gaming' | 'workstation' | 'streaming' | 'office' | 'all-rounder';
  preferredBrands: string[];
  allowUsed: boolean;
}

export interface CartItem {
  component: PCComponent;
  quantity: number;
  isUsed: boolean;
}
