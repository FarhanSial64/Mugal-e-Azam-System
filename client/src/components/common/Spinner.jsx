export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={`spinner ${sizeClasses[size]} ${className}`}></div>
  );
};

export const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => {
  return <div className={`animate-pulse bg-slate-200/80 ${rounded} ${className}`} />;
};

export const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Spinner size="xl" className="mx-auto mb-4" />
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  );
};

export const LoadingOverlay = ({ message = 'Processing...' }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100">
        <Spinner size="lg" className="mx-auto mb-3" />
        <p className="text-slate-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default Spinner;
