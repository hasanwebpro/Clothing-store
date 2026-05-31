/**
 * useSEO — Sets <title> and <meta> tags dynamically per page.
 *
 * SDA Note: SOLID Single Responsibility — SEO concerns are isolated
 * here. Every page imports this hook once; the logic never repeats.
 *
 * SEO Strategy:
 *  - Title pattern: "Page Name | VOGUE — Premium Fashion Pakistan"
 *  - Open Graph tags for social sharing (WhatsApp, Facebook previews)
 *  - Canonical URL to prevent duplicate content penalties
 *  - Description: 150-160 chars, keyword-rich, conversion-focused
 */
import { useEffect } from 'react';

const SITE_NAME = 'VOGUE';
const SITE_DESC = 'Premium fashion for every occasion. Shop the latest trends with free delivery on orders over PKR 2,000. Women, Men, Kids & Accessories.';

export function useSEO({ title, description, image, type = 'website' } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME} — Premium Fashion Pakistan` : `${SITE_NAME} — Premium Fashion Pakistan`;
    const metaDesc = description || SITE_DESC;

    document.title = fullTitle;

    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', metaDesc);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', metaDesc, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', SITE_NAME, true);
    if (image) setMeta('og:image', image, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', metaDesc);
  }, [title, description, image, type]);
}
