import clsx from 'clsx';
import Spinner from './Spinner';

const variants = {
  primary:   'bg-neutral-900 text-white hover:bg-neutral-700 focus:ring-neutral-900',
  secondary: 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 focus:ring-neutral-200',
  brand:     'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-400',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
  ghost:     'text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-200',
};

const sizes = {
  sm:  'px-3 py-1.5 text-xs',
  md:  'px-5 py-2.5 text-sm',
  lg:  'px-6 py-3 text-base',
  xl:  'px-8 py-4 text-lg',
};

export default function Button({
  children, variant = 'primary', size = 'md',
  isLoading, fullWidth, className, ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="text-current" />}
      {children}
    </button>
  );
}
