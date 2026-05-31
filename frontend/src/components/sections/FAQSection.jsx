/**
 * FAQSection — Frequently Asked Questions accordion.
 *
 * Business Goal: Remove the last objections before purchase.
 * Top 3 reasons people abandon checkout: shipping cost, return policy, payment security.
 * FAQs address all three, directly reducing cart abandonment.
 *
 * SEO Value: FAQ content creates natural keyword clusters
 * (e.g., "free delivery Pakistan", "JazzCash clothing store") that rank
 * for long-tail queries with buying intent.
 *
 * Structured Data: Implement JSON-LD FAQ schema in the head via useSEO
 * for rich snippets in Google results (increases CTR by 20-30%).
 *
 * Accessibility: Uses aria-expanded and role="region" for screen readers.
 * Keyboard navigable via Enter/Space on buttons.
 */
import { useState } from 'react';
import { useRevealClass } from '../../hooks/useScrollReveal';

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 2–5 business days across Pakistan. Lahore, Karachi, and Islamabad typically receive orders in 2–3 days. Remote areas may take up to 5–7 days. You will receive a tracking number via SMS and email once your order ships.',
  },
  {
    q: 'Is there free delivery?',
    a: 'Yes! All orders over PKR 2,000 qualify for free standard delivery anywhere in Pakistan. Orders below PKR 2,000 have a flat shipping fee of PKR 200. We also offer express delivery for PKR 350 with 1–2 day delivery to major cities.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Cash on Delivery (COD), JazzCash, and Easypaisa. All digital payments are encrypted and secure. COD is available across Pakistan with no additional fee.',
  },
  {
    q: 'What is your return and exchange policy?',
    a: "We offer a hassle-free 30-day return and exchange policy. If you are not satisfied for any reason — wrong size, damaged item, or simply changed your mind — contact us and we will arrange a free pickup and full refund or exchange.",
  },
  {
    q: 'How do I know if the product will fit me?',
    a: 'Every product page includes a detailed size guide with measurements in centimeters. We recommend measuring yourself before ordering. If you are between sizes, we suggest going one size up. You can also chat with our style team for personalized advice.',
  },
  {
    q: 'Are the products authentic?',
    a: 'Absolutely. We source directly from verified manufacturers and authorized distributors. Every product goes through a quality inspection before shipping. All international brands sold on VOGUE are 100% authentic with original tags.',
  },
  {
    q: 'Can I track my order?',
    a: 'Yes. Once your order ships, you will receive a tracking number via SMS and email. You can also track your order in real-time from the "My Orders" section of your account.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'Currently we ship within Pakistan only. International shipping is on our roadmap for 2025. Subscribe to our newsletter to be the first to know when international shipping launches.',
  },
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        className="w-full flex items-start justify-between gap-4 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded cursor-pointer"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-neutral-900 text-sm md:text-base pr-2">{faq.q}</span>
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center transition-all duration-200 ${isOpen ? 'rotate-45 bg-brand-100 text-brand-600' : 'text-neutral-600'}`}
          aria-hidden="true"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </span>
      </button>
      <div
        role="region"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}
      >
        <p className="text-sm text-neutral-600 leading-relaxed">{faq.a}</p>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);
  const { ref, className } = useRevealClass();

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="faq">
      <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
        {/* Left: Intro */}
        <div ref={ref} className={`${className} lg:col-span-2`}>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Got Questions?</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mt-2" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.45))' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-neutral-500 mt-4 leading-relaxed">
            Cannot find your answer here? Our customer support team is available 24/7 to help.
          </p>
          <div className="mt-6 space-y-3">
            <a
              href="mailto:support@vogue.pk"
              className="flex items-center gap-3 text-sm font-medium text-neutral-900 hover:text-brand-600 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              support@vogue.pk
            </a>
            <a
              href="https://wa.me/923001234567"
              className="flex items-center gap-3 text-sm font-medium text-neutral-900 hover:text-brand-600 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </span>
              WhatsApp Support
            </a>
          </div>
        </div>

        {/* Right: Accordion */}
        <div className="lg:col-span-3 card p-0 overflow-hidden">
          <div className="px-6">
            {FAQS.map((faq, i) => (
              <FAQItem
                key={i}
                faq={faq}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
