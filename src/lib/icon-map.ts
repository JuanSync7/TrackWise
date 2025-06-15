
import { 
    Utensils, ShoppingCart, CarFront, Home, Lightbulb, Drama, HeartPulse, 
    ShoppingBag, Archive, Plane, BookOpen, Sparkles, Gift, ReceiptText, 
    DollarSign, Briefcase, Laptop, TrendingUp, PiggyBank, CreditCard, Landmark,
    type LucideIcon 
} from 'lucide-react';

export const iconMap: { [key: string]: LucideIcon } = {
  Utensils,
  ShoppingCart,
  CarFront,
  Home,
  Lightbulb,
  Drama,
  HeartPulse,
  ShoppingBag,
  Archive,
  Plane,
  BookOpen,
  Sparkles,
  Gift,
  ReceiptText,
  DollarSign,
  Briefcase,
  Laptop,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Landmark
  // Add more icons here as needed by name
};

export const DEFAULT_ICON_NAME = 'Archive'; // Fallback icon name
export const availableIconNames = Object.keys(iconMap) as (keyof typeof iconMap)[];

export function getIconComponent(iconName: string | undefined): LucideIcon {
  if (iconName && iconMap[iconName as keyof typeof iconMap]) {
    return iconMap[iconName as keyof typeof iconMap];
  }
  return iconMap[DEFAULT_ICON_NAME]; // Return a default icon if name is not found
}

