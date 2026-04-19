import { useMemo } from 'react';
import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';

/**
 * Professional FilterBar component for grouped filters
 * Supports status buttons, select dropdowns, and compact layout
 */
const FilterBar = ({ 
  filters = [], // [{ type: 'button'|'select', key, label, value, options?, onChange, active? }]
  onClear,
  className = '',
  compact = false,
  showLabel = true,
  activeCount = 0,
}) => {
  const activeFilters = useMemo(() => {
    return filters.filter(f => f.active || (f.type === 'button' && f.value));
  }, [filters]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with label and clear button */}
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                {activeCount} active
              </span>
            )}
          </div>
          {onClear && activeCount > 0 && (
            <button
              onClick={onClear}
              className="text-xs font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Filter Controls */}
      <div className={`
        flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50
        ${compact ? '' : 'lg:gap-3 lg:p-4'}
      `}>
        {filters.map((filter) => {
          if (filter.type === 'button') {
            return (
              <button
                key={filter.key}
                onClick={() => filter.onChange(filter.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${filter.active || filter.value
                    ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                    : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }
                  ${compact ? 'text-xs px-2.5 py-1' : ''}
                `}
                title={filter.label}
              >
                {filter.label}
              </button>
            );
          }

          if (filter.type === 'select') {
            return (
              <div key={filter.key} className={`relative ${compact ? 'text-sm' : ''}`}>
                <select
                  value={filter.value || ''}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className={`
                    appearance-none px-3 py-1.5 pr-8 rounded-lg text-sm font-medium
                    border border-gray-300 bg-white text-gray-700
                    hover:border-gray-400 hover:bg-gray-50
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-100
                    transition-all duration-200
                    ${compact ? 'text-xs px-2.5 py-1 pr-7' : ''}
                  `}
                >
                  <option value="">{filter.label}</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className={`
                  absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none
                  ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-gray-500
                `} />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default FilterBar;
