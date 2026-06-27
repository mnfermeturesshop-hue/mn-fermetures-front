/**
 * Couche analytics fine (GA4 via dataLayer + Microsoft Clarity).
 * Aucun SDK externe — pousse dans window.dataLayer si GTM est branché,
 * appelle window.clarity si Clarity est branché, sinon log en dev.
 * Les composants n'appellent que les helpers ci-dessous.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    dataLayer?: any[];
    clarity?: (method: string, ...args: any[]) => void;
  }
}

function push(event: Record<string, any>) {
  if (typeof window === 'undefined') return;
  if (window.dataLayer) {
    window.dataLayer.push(event);
  } else if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event);
  }
}

function clarityEvent(name: string, value?: string) {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('event', name, value);
  }
}

export function trackViewItem(params: {
  slug: string;
  name: string;
  categorySlug: string;
  priceHT: number;
  brandSlug?: string;
}) {
  push({
    event: 'view_item',
    ecommerce: {
      items: [{
        item_id:       params.slug,
        item_name:     params.name,
        item_category: params.categorySlug,
        item_brand:    params.brandSlug ?? '',
        price:         params.priceHT,
        currency:      'EUR',
      }],
    },
  });
  clarityEvent('view_item', params.slug);
}

export function trackAddToCart(params: {
  key: string;
  name: string;
  categorySlug: string;
  priceHT: number;
  quantity: number;
}) {
  push({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'EUR',
      value:    params.priceHT * params.quantity,
      items: [{
        item_id:       params.key,
        item_name:     params.name,
        item_category: params.categorySlug,
        price:         params.priceHT,
        quantity:      params.quantity,
      }],
    },
  });
  clarityEvent('add_to_cart', params.name);
}

export function trackBeginCheckout(params: { totalHT: number; numItems: number }) {
  push({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'EUR',
      value:    params.totalHT,
      num_items: params.numItems,
    },
  });
  clarityEvent('begin_checkout');
}

export function trackSearch(params: { query: string; numResults: number }) {
  push({
    event: 'search',
    search_term:    params.query,
    search_results: params.numResults,
  });
  clarityEvent('search', params.query);
}
