/**
 * SectionHeading — Premium section title with kicker, headline, and gold underline.
 *
 * Use it above every major homepage / page section for consistent rhythm.
 */
export default function SectionHeading({
  kicker, title, subtitle, align = 'center', className = '',
}) {
  const alignment = align === 'left' ? 'text-left items-start' : 'text-center items-center';
  return (
    <div className={`flex flex-col ${alignment} max-w-3xl ${align === 'center' ? 'mx-auto' : ''} ${className}`}>
      {kicker && (
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-luxe-600 mb-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-luxe-500" />
          {kicker}
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-luxe-500" />
        </span>
      )}
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-ink-900 leading-[1.1] tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-neutral-600 max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
