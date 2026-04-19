const Badge = ({ 
  children, 
  variant = 'gray',
  size = 'sm',
  className = '',
}) => {
  const variants = {
    gray: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    danger: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    primary: 'bg-primary-50 text-primary-700 ring-1 ring-primary-100',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;
