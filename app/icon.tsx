import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** Favicon : monogramme « mn » blanc sur marine. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0e2f4c',
          color: '#ffffff',
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: -1,
          fontFamily: 'sans-serif',
        }}
      >
        mn
      </div>
    ),
    size,
  );
}
