import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  category: Category | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CategoryIcon({ category, size = 'md', className }: CategoryIconProps) {
  if (!category) {
    return null; // Or a default icon
  }

  const IconComponent = category.icon;
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full p-2',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${category.color}33` }} // Use category color with opacity
    >
      <IconComponent className={cn(sizeClasses[size])} style={{ color: category.color }} />
    </div>
  );
}
