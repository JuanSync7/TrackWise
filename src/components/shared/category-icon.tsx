
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/icon-map';

interface CategoryIconProps {
  category: Category | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CategoryIcon({ category, size = 'md', className }: CategoryIconProps) {
  if (!category) {
    const DefaultIcon = getIconComponent(undefined); // Get default icon
    return (
       <div
        className={cn(
          'flex items-center justify-center rounded-full p-2',
          sizeClasses[size],
          'bg-gray-300', // Default background
          className
        )}
      >
        <DefaultIcon className={cn(sizeClasses[size], 'text-gray-500')} />
      </div>
    );
  }

  const IconComponent = getIconComponent(category.iconName);
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
