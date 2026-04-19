const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change,
  changeType = 'neutral',
  subtitle,
  className = '',
}) => {
  const changeColors = {
    positive: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100',
    negative: 'text-rose-700 bg-rose-50 ring-1 ring-rose-100',
    neutral: 'text-slate-600 bg-slate-50 ring-1 ring-slate-100',
  };

  return (
    <div className={`bg-white/95 backdrop-blur rounded-2xl shadow-sm shadow-slate-200/70 border border-slate-200 p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {change && (
            <div className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${changeColors[changeType]}`}>
              {changeType === 'positive' && '↑'}
              {changeType === 'negative' && '↓'}
              {change}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-primary-50 rounded-2xl ring-1 ring-primary-100">
            <Icon className="h-7 w-7 text-primary-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;