import { type InputHTMLAttributes, useState, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  rightAction?: ReactNode;
  fullWidth?: boolean;
}

export default function Input({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  rightAction,
  fullWidth = true,
  className = '',
  type = 'text',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const [focused, setFocused] = useState(false);

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-foreground-300 mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`
          relative flex items-center rounded-lg border transition-all duration-200
          ${focused
            ? 'border-primary-500/60 ring-1 ring-primary-500/20'
            : error
              ? 'border-red-500/60'
              : 'border-secondary-500/25 hover:border-secondary-500/40'
          }
          bg-background-100
        `}
      >
        {icon && iconPosition === 'left' && (
          <span className="pl-3 text-foreground-500 w-5 h-5 flex items-center justify-center shrink-0">
            {icon}
          </span>
        )}
        <input
          type={inputType}
          className={`
            w-full bg-transparent text-sm text-foreground-200 placeholder:text-foreground-600
            outline-none h-10 px-3
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${(isPassword || rightAction) ? 'pr-10' : ''}
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
          style={{
            WebkitTextFillColor: 'oklch(var(--foreground-200))',
            caretColor: 'oklch(var(--foreground-200))',
          }}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-foreground-500 hover:text-foreground-300 transition-colors w-5 h-5 flex items-center justify-center"
            tabIndex={-1}
          >
            <i className={`ri-${showPassword ? 'eye-off' : 'eye'}-line text-sm`}></i>
          </button>
        )}
        {!isPassword && rightAction && (
          <span className="pr-3">{rightAction}</span>
        )}
        {icon && iconPosition === 'right' && !isPassword && !rightAction && (
          <span className="pr-3 text-foreground-500 w-5 h-5 flex items-center justify-center">{icon}</span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-foreground-600">{hint}</p>
      )}
    </div>
  );
}