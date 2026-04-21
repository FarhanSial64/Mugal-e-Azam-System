import { forwardRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * Professional SearchBar component for filtering lists and tables
 * Includes icon, clear button, and professional styling
 */
const SearchBar = forwardRef(({ 
  value = '', 
  onChange, 
  onClear,
  placeholder = 'Search...',
  className = '',
  disabled = false,
  size = 'md', // sm, md, lg
  variant = 'default', // default, subtle
  icon = <MagnifyingGlassIcon className="h-5 w-5" />,
  ...props 
}, ref) => {
  const sizeClasses = {
    sm: 'py-2 text-sm',
    md: 'py-2.5 text-base sm:text-sm',
    lg: 'py-3 text-base'
  };

  const variantClasses = {
    default: 'border border-gray-300 bg-white hover:border-gray-400 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100',
    subtle: 'border border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-50'
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`
        flex min-h-[44px] items-center rounded-lg px-3 transition-all duration-200
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {/* Icon */}
        <div className="flex-shrink-0 text-gray-400">
          {icon}
        </div>

        {/* Input */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            flex-1 ml-2 bg-transparent outline-none placeholder-gray-400
            text-gray-900 disabled:cursor-not-allowed
            ${sizeClasses[size]}
          `}
          {...props}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onClear ? onClear() : onChange({ target: { value: '' } });
            }}
            disabled={disabled}
            className="flex-shrink-0 ml-2 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
            aria-label="Clear search"
            title="Clear"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
