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
  primary: 'bg-primary-500 text-foreground-50 hover:bg-primary-600 border border-primary-500/35 shadow-[0_8px_22px_rgba(8,159,138,0.20)] font-850',
  accent: 'bg-accent-500 text-foreground-50 hover:bg-accent-600 active:bg-accent-700 font-850',
  secondary: 'bg-secondary-500 text-foreground-50 hover:bg-secondary-600 active:bg-secondary-700 font-950',
  ghost: 'bg-background-100 text-foreground-200 hover:bg-background-200/60 hover:text-foreground-100 font-800 shadow-btn',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 font-850',
  outline: 'bg-transparent border border-secondary-500/40 text-foreground-300 hover:bg-background-200/40 hover:border-secondary-500/60 hover:text-foreground-100 font-800 shadow-btn',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-2.5 py-1.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 py-2 text-sm gap-2',
  lg: 'h-10 px-4 py-2.5 text-sm gap-2',
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
        inline-flex items-center justify-center whitespace-nowrap rounded-lg
        transition-all duration-150 ease-out
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