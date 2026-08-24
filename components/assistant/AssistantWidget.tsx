'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';

interface Turn { role: 'user' | 'assistant'; text: string }

const GREETING =
  "Bonjour 👋 Je suis l'assistant MN Fermetures. Je peux vous renseigner sur un produit, retrouver une commande ou vous donner son statut. Que puis-je faire pour vous ?";
const CHIPS = [
  'Renseigner un produit',
  'Retrouver ma commande',
  'Suivi de ma livraison',
  'Parler à un commercial',
];

const NAVY = '#10314f';

export function AssistantWidget() {
  const { user, isPro } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  // Réservé aux pros connectés (cohérent avec le pivot B2B).
  if (!user || !isPro()) return null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Turn[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: next }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        (typeof data.reply === 'string' && data.reply) ||
        (typeof data.error === 'string' && data.error) ||
        "Une erreur est survenue. Vous pouvez joindre votre commercial au 04 67 78 06 63.";
      setMessages([...next, { role: 'assistant', text: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', text: "L'assistant est momentanément indisponible. Contactez votre commercial au 04 67 78 06 63." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: NAVY, color: '#fff', fontSize: 24, lineHeight: 1,
          boxShadow: '0 6px 20px rgba(16,49,79,.35)',
        }}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistant MN Fermetures"
          style={{
            position: 'fixed', right: 20, bottom: 88, zIndex: 1000,
            width: 'min(370px, calc(100vw - 32px))', height: 'min(540px, calc(100vh - 140px))',
            display: 'flex', flexDirection: 'column',
            background: '#fff', borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,.22)', border: '1px solid #e5e7eb',
          }}
        >
          {/* En-tête */}
          <div style={{ background: NAVY, color: '#fff', padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Assistant MN Fermetures</div>
            <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 2 }}>Produits · commandes · livraison</div>
          </div>

          {/* Fil */}
          <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f8fafc' }}>
            <Bubble role="assistant" text={GREETING} />
            {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
            {loading && <Bubble role="assistant" text="…" muted />}

            {messages.length === 0 && !loading && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => send(c)}
                    style={{
                      border: `1px solid ${NAVY}`, color: NAVY, background: '#fff',
                      borderRadius: 999, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer',
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Saisie */}
          <div style={{ borderTop: '1px solid #e5e7eb', padding: 10, background: '#fff' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Votre question…"
                rows={1}
                style={{
                  flex: 1, resize: 'none', maxHeight: 90, padding: '9px 11px',
                  border: '1px solid #d1d5db', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button type="button" onClick={() => send(input)} disabled={loading || !input.trim()}
                style={{
                  background: NAVY, color: '#fff', border: 'none', borderRadius: 9,
                  padding: '9px 14px', fontSize: 13.5, fontWeight: 600,
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? 0.6 : 1,
                }}>
                Envoyer
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 7, textAlign: 'center' }}>
              Besoin d'un humain ? <strong style={{ color: '#6b7280' }}>04 67 78 06 63</strong> · lun–ven 8h–17h
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text, muted }: { role: 'user' | 'assistant'; text: string; muted?: boolean }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div
        style={{
          maxWidth: '82%', padding: '9px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: isUser ? NAVY : '#fff', color: isUser ? '#fff' : muted ? '#9ca3af' : '#1f2937',
          border: isUser ? 'none' : '1px solid #e5e7eb',
          borderBottomRightRadius: isUser ? 3 : 12, borderBottomLeftRadius: isUser ? 12 : 3,
        }}
      >
        {text}
      </div>
    </div>
  );
}
