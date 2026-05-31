import clsx from 'clsx';

export default function Badge({ children, variant = 'neutral', className }) {
  const variants = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger:  'bg-red-100 text-red-800',
    info:    'bg-blue-100 text-blue-800',
    neutral: 'bg-neutral-100 text-neutral-700',
    brand:   'bg-brand-100 text-brand-800',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
