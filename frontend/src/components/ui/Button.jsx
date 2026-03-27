// components/ui/Button.jsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility to merge tailwind classes safely
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Button = React.forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  children, 
  disabled, 
  loading,
  ...props 
}, ref) => {
  
  // 1. Base Styles (Applied to all buttons)
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50 [-webkit-tap-highlight-color:transparent] active:scale-[0.98]";
  
  // 2. Variants (Color schemes)
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20 hover:shadow-red-900/40",
    outline: "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white",
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white",
    ghost: "hover:bg-slate-800 hover:text-white text-slate-400",
    link: "text-indigo-400 underline-offset-4 hover:underline",
  };

  // 3. Sizes
  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-xl px-8 text-base",
    icon: "h-9 w-9",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = "Button";

export { Button };