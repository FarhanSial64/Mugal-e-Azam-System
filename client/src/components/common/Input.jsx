import { forwardRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Input = forwardRef(({ 
  label, 
  error, 
  helpText,
  leftIcon,
  rightIcon,
  className = '',
  variant = 'default', // default, search
  showClearButton = false,
  onClear,
  ...props 
}, ref) => {
  const variantClasses = {
    default: `
      border border-gray-300 rounded-lg shadow-sm
      focus:ring-2 focus:ring-primary-500 focus:border-transparent
    `,
    search: `
      border border-gray-300 rounded-xl shadow-sm
      focus:ring-2 focus:ring-primary-500 focus:border-transparent
      hover:border-gray-400 transition-colors
    `
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            block w-full px-3 py-2 text-sm transition-all duration-200
            placeholder-gray-400
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon && !showClearButton ? 'pr-10' : ''}
            ${showClearButton && props.value ? 'pr-10' : ''}
            ${error 
              ? 'border-red-300 focus:ring-red-500' 
              : variantClasses[variant]
            }
          `}
          {...props}
        />
        {rightIcon && !showClearButton && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
            {rightIcon}
          </div>
        )}
        {showClearButton && props.value && (
          <button
            type="button"
            onClick={() => onClear ? onClear() : ref.current && (ref.current.value = '')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear input"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
