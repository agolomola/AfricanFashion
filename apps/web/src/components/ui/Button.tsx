import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md';
  asChild?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-amber-600 text-white hover:bg-amber-700 border border-transparent',
  outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 border border-transparent hover:bg-gray-100',
  secondary: 'bg-gray-100 text-gray-900 border border-transparent hover:bg-gray-200',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  disabled,
  asChild,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}