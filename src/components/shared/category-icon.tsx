
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/icon-map'; // Assuming icon-map is still relevant

interface CategoryIconProps {
  category: Category | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CategoryIcon({ category, size = 'md', className }: CategoryIconProps) {
  const IconComponent = getIconComponent(category?.iconName); // Use optional chaining
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const categoryColor = category?.color || '#CCCCCC'; // Default color if category or category.color is undefined
  const iconColor = category?.color || '#666666'; // Default icon color

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full p-1', // Reduced padding for tighter fit
        size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 w-10', // Container size based on icon
        className
      )}
      style={{ backgroundColor: `${categoryColor}33` }} // Use category color with opacity
    >
      <IconComponent className={cn(sizeClasses[size])} style={{ color: iconColor }} />
    </div>
  );
}
