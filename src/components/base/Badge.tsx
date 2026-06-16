import { type ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-secondary-500/15 text-secondary-300 border-secondary-500/20',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/15 text-red-400 border-red-500/20',
  info: 'bg-accent-500/15 text-accent-400 border-accent-500/20',
  primary: 'bg-primary-500/15 text-primary-400 border-primary-500/20',
};

const dotColors: Record<string, string> = {
  default: 'bg-secondary-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-accent-400',
  primary: 'bg-primary-400',
};

export default function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
  dot = false,
}: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap
        ${variantStyles[variant]}
        ${sizeClass}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}></span>
      )}
      {children}
    </span>
  );
}