import React, { useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className, ...props }, ref) => {
    const defaultId = useId();
    const generatedId = id || defaultId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={generatedId}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={generatedId}
          className={twMerge(
            clsx(
              'w-full px-4 py-3 rounded-2xl border text-base outline-none transition-all duration-200',
              'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
              error
                ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-400'
                : 'border-slate-300 dark:border-slate-700',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
