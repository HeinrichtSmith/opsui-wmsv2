/**
 * ScanInput component - Theme-aware (light/dark mode)
 *
 * Barcode scanner input component with auto-focus and validation
 */

import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ScanInputProps {
  value: string;
  onChange: (value: string) => void;
  onScan: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  error?: string;
  maxLength?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScanInput({
  value,
  onChange,
  onScan,
  placeholder = 'Scan or enter SKU...',
  disabled = false,
  autoFocus = true,
  className,
  error,
  maxLength = 50,
}: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRef.current?.focus();
    }
  }, [autoFocus, disabled]);

  // Handle input change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Handle key press
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const trimmed = value.trim();
      if (trimmed) {
        onScan(trimmed);
        onChange('');
      }
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={cn(
          'w-full px-5 py-4 text-lg border rounded-xl focus:outline-none transition-all duration-300 font-mono uppercase tracking-wider',
          'dark:bg-white/[0.05] bg-white dark:border-white/[0.08] border-gray-300 dark:text-white text-gray-900 dark:placeholder:text-gray-500 placeholder:text-gray-400',
          'focus:border-primary-500/50 dark:focus:bg-white/[0.08] focus:bg-white focus:shadow-glow',
          error
            ? 'border-error-500/50 focus:border-error-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : '',
          'disabled:bg-gray-100 dark:disabled:bg-white/[0.02] disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed',
          'placeholder:normal-case placeholder:font-sans'
        )}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {error && (
        <p
          className="mt-2 text-sm dark:text-error-400 text-error-600 dark:bg-error-500/10 bg-error-50 border border-error-500/30 rounded-lg px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      )}
      <p className="mt-2 text-xs dark:text-gray-500 text-gray-500 flex items-center gap-2">
        Press{' '}
        <kbd className="px-2 py-1 dark:bg-white/[0.05] bg-gray-100 dark:border-white/[0.1] border border-gray-300 dark:text-gray-400 text-gray-600 rounded text-xs">
          Enter
        </kbd>{' '}
        after scanning
      </p>
    </div>
  );
}
