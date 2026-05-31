import clsx from 'clsx';

export default function Input({ label, error, className, ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>}
      <input
        className={clsx(
          'block w-full rounded-lg border px-4 py-2.5 text-sm placeholder-neutral-400',
          'focus:outline-none focus:ring-1 transition-colors',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-400'
            : 'border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900',
          'disabled:bg-neutral-50 disabled:cursor-not-allowed',
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
