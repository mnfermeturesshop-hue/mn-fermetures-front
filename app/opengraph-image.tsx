import { renderBrandOg, OG_SIZE, OG_ALT } from '@/lib/seo/og';

export const runtime = 'edge';
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderBrandOg();
}
