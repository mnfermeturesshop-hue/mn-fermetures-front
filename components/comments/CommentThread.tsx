'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

/**
 * Fil de commentaires rattaché à un devis ou un bon de commande — partagé
 * entre l'espace client et le back-office (l'API applique les périmètres :
 * propriétaire / commercial assigné / admin).
 */

interface Comment {
  id: string;
  authorRole: 'client' | 'commercial' | 'admin';
  authorName: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

const MAX_LEN = 2000;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function CommentThread({ targetType, targetNumber }: {
  targetType: 'devis' | 'order';
  targetNumber: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [viewerIsStaff, setViewerIsStaff] = useState(false);

  const load = () => {
    fetch(`/api/comments?type=${targetType}&number=${encodeURIComponent(targetNumber)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Comment[]) => {
        setComments(data);
        // Si un de MES messages est staff, je suis staff (sinon indéterminé — sans impact)
        const mine = data.find((c) => c.mine);
        if (mine) setViewerIsStaff(mine.authorRole !== 'client');
      })
      .catch(() => toast.error('Impossible de charger les commentaires'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [targetType, targetNumber]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: targetType, number: targetNumber, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
      setDraft('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="cmt-thread">
      {loading ? (
        <p className="cmt-empty">Chargement…</p>
      ) : comments.length === 0 ? (
        <p className="cmt-empty">
          Aucun message — démarrez la conversation{viewerIsStaff ? ' avec votre client' : ' avec votre commercial'}.
        </p>
      ) : (
        <div className="cmt-list">
          {comments.map((c) => (
            <div key={c.id} className={`cmt-msg${c.mine ? ' cmt-msg--mine' : ''}`}>
              <div className="cmt-meta">
                <strong>{c.authorName}</strong>
                {c.authorRole !== 'client' && <span className="cmt-badge">MN Fermetures</span>}
                <span className="cmt-date">{formatDate(c.createdAt)}</span>
              </div>
              <div className="cmt-body">{c.body}</div>
            </div>
          ))}
        </div>
      )}

      <div className="cmt-form">
        <textarea
          value={draft}
          maxLength={MAX_LEN}
          rows={2}
          placeholder="Votre message…"
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="cmt-form-foot">
          <span className="cmt-count">{draft.length}/{MAX_LEN}</span>
          <button className="btn solid sm" type="button" disabled={sending || !draft.trim()} onClick={send}>
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
