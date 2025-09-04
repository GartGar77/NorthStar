import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const getInitials = (name: string) => {
  if (!name) return '...';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-3xl',
  };

  const containerClasses = `relative inline-block ${sizeClasses[size]} ${className}`;

  return (
    <div className={containerClasses}>
      {src ? (
        <img
          className="h-full w-full rounded-full object-cover"
          src={src}
          alt={name}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
};

export default Avatar;
