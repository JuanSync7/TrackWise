
import { 
    Utensils, ShoppingCart, CarFront, Home, Lightbulb, Drama, HeartPulse, 
    ShoppingBag, Archive, Plane, BookOpen, Sparkles, Gift, ReceiptText, 
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
};

export const DEFAULT_ICON_NAME = 'Archive'; // Fallback icon name

export function getIconComponent(iconName: string | undefined): LucideIcon {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return iconMap[DEFAULT_ICON_NAME]; // Return a default icon if name is not found
}
