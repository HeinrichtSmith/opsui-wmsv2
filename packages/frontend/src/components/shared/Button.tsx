/**
 * Button component - Theme-aware (light/dark mode)
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

    const variantStyles = {
      primary:
        'btn-primary text-white rounded-xl',
      secondary:
        'dark:btn-secondary dark:text-gray-200 dark:border-white/[0.1] bg-gray-100 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/[0.08] dark:hover:border-white/[0.15] transition-all',
      success:
        'bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:shadow-lg hover:shadow-success-500/25 hover:-translate-y-0.5 transition-all',
      danger:
        'bg-gradient-to-r from-error-500 to-error-600 text-white rounded-xl hover:shadow-lg hover:shadow-error-500/25 hover:-translate-y-0.5 transition-all',
      warning:
        'bg-gradient-to-r from-warning-500 to-warning-600 text-white rounded-xl hover:shadow-lg hover:shadow-warning-500/25 hover:-translate-y-0.5 transition-all',
      ghost:
        'bg-transparent dark:text-gray-300 text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-white hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-all',
    };

    const sizeStyles = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-13 px-8 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
