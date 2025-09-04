import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', children, icon, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center border font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'text-white bg-brand-primary hover:bg-brand-dark focus:ring-brand-primary border-transparent',
    secondary: 'text-slate-700 bg-slate-100 hover:bg-slate-200 focus:ring-brand-primary border-slate-200',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 border-transparent',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      {...props}
    >
      {icon && <span className="mr-2 -ml-1 h-5 w-5">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;