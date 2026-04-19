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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
