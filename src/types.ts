export interface Category {
  id: string;
  title: string;
  order: number;
}

export type PriceType = 'fixed' | 'starting' | 'consult';

export interface Side {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  priceType?: PriceType;
  duration?: number; // In minutes
  gender?: 'feminino' | 'masculino' | 'ambos';
  image: string; // Base64
  categoryId?: string;
  isMeal?: boolean;
  ingredients?: string; // Comma separated
  allowedSides?: string[]; // IDs of sides
  isActive?: boolean;
  order?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  mealOptions?: {
    removals: string[];
    sides: Side[];
  };
}

export interface Order {
  id: string;
  customerName: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  instagram?: string;
  address: string;
  street?: string;
  number?: string;
  zipCode?: string;
  city?: string;
  pickupDate?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus?: 'paid' | 'pending';
  pendingAmount?: number;
  pendingDate?: string;
  tip?: number;
  discount?: number;
  giftCard?: number;
  voucher?: number;
  paymentMethod?: string;
  birthday: string;
  observation: string;
  email: string;
  items: {
    title: string;
    quantity: number;
    price: number;
    priceType?: PriceType;
    mealOptions?: {
      removals: string[];
      sides: Side[];
    };
  }[];
  total: number;
  createdAt: any;
  orderLanguage?: string;
}

export interface Settings {
  logo: string;
  primaryColor: string;
  whatsappNumber: string;
  whatsappCountryCode?: string;
  slug: string;
  brandName: string;
  adminPassword?: string;
  slogan?: string;
  welcomeSlogan?: string;
  whatsappClosingMessage?: string;
  whatsappSummaryMessage?: string;
  whatsappCompletionMessage?: string;
  backgroundImage?: string;
  glassColor?: string;
  textColor?: string;
  language?: 'pt' | 'en' | 'es';
  currency?: 'BRL' | 'USD';
  checkoutTitle?: string;
  infoBlock1Title?: string;
  infoBlock1Text?: string;
  infoBlock2Title?: string;
  infoBlock2Text?: string;
  zelleQR?: string;
  venmoQR?: string;
  paypalQR?: string;
  businessHours?: BusinessHours;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // e.g. "09:00 AM" or "09:00"
  closeTime: string; // e.g. "06:00 PM" or "18:00"
}

export interface BusinessHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}
