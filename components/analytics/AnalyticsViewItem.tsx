'use client';

import { useEffect } from 'react';
import { trackViewItem } from '@/lib/analytics';

interface Props {
  slug: string;
  name: string;
  categorySlug: string;
  priceHT: number;
  brandSlug?: string;
}

export function AnalyticsViewItem(props: Props) {
  useEffect(() => {
    trackViewItem(props);
  // Une seule fois par page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.slug]);
  return null;
}
