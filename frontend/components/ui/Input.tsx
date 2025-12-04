import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  badgeText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, badgeText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
              {label}
            </label>
            {badgeText && (
              <span className="text-[0.6rem] sm:text-xs font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-2 py-0.5">
                {badgeText}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base bg-white/50 dark:bg-black/50 backdrop-blur-xl border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all duration-200',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

