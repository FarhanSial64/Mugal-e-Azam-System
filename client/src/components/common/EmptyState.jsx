import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Button from './Button';

const EmptyState = ({ 
  title = 'No data found',
  description = 'There are no items to display.',
  icon: Icon = ExclamationTriangleIcon,
  action,
  actionLabel,
  className = '',
}) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        <Icon className="h-8 w-8 text-slate-500" />
      </div>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">{description}</p>
      {action && actionLabel && (
        <div className="mt-6">
          <Button onClick={action}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
