'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';

interface Client {
  id: string;
  email: string;
  name: string;
  company: string;
  emailOptout?: boolean;
}

interface Mailing {
  id: string;
  sender_id: string | null;
  sender_name: string;
  subject: string;
  recipients_count: number;
  created_at: string;
}

export default function AdminMailingPage() {
  const [clients, setClients]   = useState<Client[]>([]);
  const [history, setHistory]   = useState<Mailing[]>([]);
  const [viewerRole, setViewerRole] = useState<'admin' | 'commercial'>('admin');
  const [loading, setLoading]   = useState(true);

  const [subject, setSubject]   = useState('');
  const [message, setMessage]   = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reloadHistory = () => {
    fetch('/api/admin/mailing')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setHistory(data); });
  };

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me?.role) setViewerRole(me.role); })
      .catch(() => {});
    reloadHistory();
  }, []);

  const selectable = useMemo(() => clients.filter((c) => !c.emailOptout), [clients]);
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectable.map((c) => c.id)));

  // Aperçu personnalisé sur le premier destinataire sélectionné (sinon exemple)
  const previewClient = selectable.find((c) => selected.has(c.id)) ?? selectable[0];
  const preview = message
    .replaceAll('{nom}', previewClient?.name ?? 'Jean Dupont')
    .replaceAll('{entreprise}', previewClient?.company || previewClient?.name || 'Entreprise SARL');

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/mailing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, recipientIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
      toast.success(
        `Mailing envoyé à ${data.sent} client${data.sent > 1 ? 's' : ''}` +
        (data.skippedOptout > 0 ? ` · ${data.skippedOptout} désinscrit(s) ignoré(s)` : '') +
        (data.failed > 0 ? ` · ${data.failed} échec(s)` : '')
      );
      setSubject(''); setMessage(''); setSelected(new Set());
      setConfirming(false);
      reloadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && selected.size > 0;

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h1 className="adm-h1">Mailing</h1>
          <p className="adm-sub">
            {viewerRole === 'commercial'
              ? 'Écrivez à vos clients — les réponses arrivent directement dans votre boîte email.'
              : 'Écrivez aux clients pro — les réponses arrivent sur votre adresse email.'}
          </p>
        </div>
      </div>

      <div className="mailing-layout">
        {/* ── Composer ── */}
        <div className="adm-card" style={{ padding: 20 }}>
          <label className="profil-label" style={{ marginBottom: 12 }}>
            Objet *
            <input className="profil-input" maxLength={150} value={subject}
              onChange={(e) => setSubject(e.target.value)} placeholder="Nouveautés tarifs volets roulants 2026" />
          </label>
          <label className="profil-label">
            Message *
            <textarea className="profil-input" rows={9} maxLength={5000} value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={'Bonjour {nom},\n\n…'}
            />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Variables : {'{nom}'} (contact) · {'{entreprise}'} — {message.length}/5000
            </span>
          </label>

          {message.trim() && (
            <div style={{ marginTop: 14 }}>
              <div className="profil-form-title">Aperçu{previewClient ? ` (${previewClient.company || previewClient.name})` : ''}</div>
              <div className="mailing-preview">{preview}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
            {confirming ? (
              <>
                <button className="btn ghost" type="button" disabled={sending} onClick={() => setConfirming(false)}>Annuler</button>
                <button className="btn solid" type="button" disabled={sending} onClick={handleSend}>
                  {sending ? 'Envoi…' : `Confirmer l'envoi à ${selected.size} client${selected.size > 1 ? 's' : ''}`}
                </button>
              </>
            ) : (
              <button className="btn solid" type="button" disabled={!canSend} onClick={() => setConfirming(true)}>
                Envoyer à {selected.size} client{selected.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* ── Destinataires ── */}
        <div className="adm-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="profil-form-title" style={{ border: 'none', padding: 0 }}>
              {viewerRole === 'commercial' ? 'Mes clients' : 'Clients pro'} ({selectable.length})
            </div>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Tout sélectionner
            </label>
          </div>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Chargement…</p>
          ) : clients.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {viewerRole === 'commercial' ? 'Aucun client ne vous est assigné.' : 'Aucun client pro.'}
            </p>
          ) : (
            <div className="mailing-clients">
              {clients.map((c) => (
                <label key={c.id} className={`mailing-client${c.emailOptout ? ' mailing-client--optout' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={!!c.emailOptout}
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="mailing-client-name">
                    {c.company || c.name}
                    <small>{c.email}</small>
                  </span>
                  {c.emailOptout && <span className="mailing-optout-tag">désinscrit</span>}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Historique ── */}
      <h2 className="adm-section-title" style={{ marginTop: 28 }}>Historique des envois</h2>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Objet</th>
              <th style={{ textAlign: 'center' }}>Destinataires</th>
              {viewerRole === 'admin' && <th>Envoyé par</th>}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr className="adm-tr"><td colSpan={4} style={{ color: 'var(--muted)' }}>Aucun mailing envoyé.</td></tr>
            )}
            {history.map((m) => (
              <tr key={m.id} className="adm-tr">
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(m.created_at).toLocaleDateString('fr-FR')}{' '}
                  <span className="adm-muted" style={{ fontSize: 11 }}>
                    {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td><strong>{m.subject}</strong></td>
                <td style={{ textAlign: 'center' }}>{m.recipients_count}</td>
                {viewerRole === 'admin' && <td>{m.sender_name}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
