const Card = ({ 
  children, 
  title, 
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  ...props 
}) => {
  return (
    <div 
      className={`bg-white/95 backdrop-blur rounded-2xl shadow-sm shadow-slate-200/70 border border-slate-200 overflow-hidden ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div>
            {title && <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="w-full sm:w-auto">{action}</div>}
        </div>
      )}
      <div className={`p-4 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
