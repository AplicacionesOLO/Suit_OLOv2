import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-primary-500 text-foreground-50 hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-400',
  accent: 'bg-accent-500 text-foreground-50 hover:bg-accent-600 active:bg-accent-700 focus-visible:ring-accent-400',
  secondary: 'bg-secondary-500 text-foreground-50 hover:bg-secondary-600 active:bg-secondary-700 focus-visible:ring-secondary-400',
  ghost: 'bg-transparent text-foreground-300 hover:bg-background-200/60 hover:text-foreground-100 focus-visible:ring-secondary-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-400',
  outline: 'bg-transparent border border-secondary-500/40 text-foreground-300 hover:bg-background-200/40 hover:border-secondary-500/60 hover:text-foreground-100 focus-visible:ring-secondary-400',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium
        transition-all duration-200 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 flex items-center justify-center">
          <i className="ri-loader-4-line animate-spin"></i>
        </span>
      ) : icon && iconPosition === 'left' ? (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      ) : null}
      {children}
      {!loading && icon && iconPosition === 'right' ? (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      ) : null}
    </button>
  );
}