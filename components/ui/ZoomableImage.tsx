'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Props {
  src: string;
  alt: string;
  sizes?: string;
}

export function ZoomableImage({ src, alt, sizes = '220px' }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div
        className="zoom-thumb"
        onClick={() => setOpen(true)}
        title="Cliquer pour agrandir"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          style={{ objectFit: 'contain', padding: 8 }}
        />
        <span className="zoom-hint">🔍</span>
      </div>

      {open && (
        <div className="zoom-overlay" onClick={() => setOpen(false)}>
          <div className="zoom-modal" onClick={(e) => e.stopPropagation()}>
            <button className="zoom-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            <img src={src} alt={alt} className="zoom-img" />
          </div>
        </div>
      )}
    </>
  );
}
