import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'secondary' | 'outline' | 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'gray';
  className?: string;
}

const variantStyles: Record<string, string> = {
  secondary: 'bg-gray-100 text-gray-700',
  outline: 'border border-gray-300 bg-white text-gray-600',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
};

export default function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}