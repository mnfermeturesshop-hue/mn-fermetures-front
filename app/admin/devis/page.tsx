'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/Toast';

interface Client {
  id: string;
  email: string;
  name: string;
  company: string;
}

interface DevisRow {
  id: string;
  devis_number: string;
  customer_name: string | null;
  company: string | null;
  email: string;
  total_ht: number;
  status: string;
  source: string;
  pdf_path: string | null;
  created_at: string;
  valid_until: string;
}

interface LineDraft {
  name: string;
  reference: string;
  detail: string;
  quantity: string;
  unitPriceHT: string;
}

const BLANK_LINE: LineDraft = { name: '', reference: '', detail: '', quantity: '1', unitPriceHT: '' };

const euro = (n: number) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

const STATUS_LABEL: Record<string, string> = {
  draft: 'En cours',
  converted: 'Converti en BC',
  expired: 'Expiré',
};

export default function AdminDevisPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [devis, setDevis]     = useState<DevisRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire de création
  const [showForm, setShowForm]     = useState(false);
  const [devisNumber, setDevisNumber] = useState('');
  const [clientId, setClientId]     = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [fraisHT, setFraisHT]       = useState('0');
  const [lines, setLines]           = useState<LineDraft[]>([{ ...BLANK_LINE }]);
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    fetch('/api/admin/devis')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDevis(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setClients(data); });
  }, []);

  const setLine = (i: number, field: keyof LineDraft, value: string) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };

  const totalHT = lines.reduce((s, l) => {
    const q = parseInt(l.quantity) || 0;
    const p = parseFloat(l.unitPriceHT.replace(',', '.')) || 0;
    return s + q * p;
  }, 0) + (parseFloat(fraisHT.replace(',', '.')) || 0);

  const resetForm = () => {
    setDevisNumber(''); setClientId(''); setValidUntil(''); setFraisHT('0');
    setLines([{ ...BLANK_LINE }]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devisNumber.trim()) { toast.error('Numéro de devis requis'); return; }
    if (!clientId)           { toast.error('Sélectionnez un client'); return; }

    const parsedLines = lines
      .filter((l) => l.name.trim())
      .map((l) => ({
        name: l.name.trim(),
        reference: l.reference.trim() || undefined,
        detail: l.detail.trim() || undefined,
        quantity: parseInt(l.quantity) || 1,
        unitPriceHT: parseFloat(l.unitPriceHT.replace(',', '.')) || 0,
      }));
    if (parsedLines.length === 0) { toast.error('Ajoutez au moins une ligne'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      const file = fileRef.current?.files?.[0];
      if (file) fd.append('file', file);
      fd.append('payload', JSON.stringify({
        devisNumber: devisNumber.trim(),
        userId: clientId,
        lines: parsedLines,
        fraisHT: parseFloat(fraisHT.replace(',', '.')) || 0,
        ...(validUntil ? { validUntil } : {}),
      }));

      const res = await fetch('/api/admin/devis', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');

      toast.success(`Devis ${devisNumber.trim()} créé — visible dans l'espace du client`);
      resetForm();
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h1 className="adm-h1">Devis</h1>
          <p className="adm-sub">Devis générés sur le site et devis ERP uploadés manuellement.</p>
        </div>
        <button className="btn solid" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Fermer' : '+ Devis ERP'}
        </button>
      </div>

      {/* ── Formulaire devis ERP ── */}
      {showForm && (
        <form className="adm-card" onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 20 }}>
          <div className="adm-form-grid" style={{ marginBottom: 14 }}>
            <label className="profil-label">
              N° de devis (ERP) *
              <input className="profil-input" value={devisNumber}
                onChange={(e) => setDevisNumber(e.target.value)} placeholder="DEV-ERP-2026-0042" />
            </label>
            <label className="profil-label">
              Client pro *
              <select className="profil-input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.name} ({c.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="profil-label">
              Valide jusqu&apos;au
              <input className="profil-input" type="date" value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)} />
            </label>
            <label className="profil-label">
              Frais de livraison HT (€)
              <input className="profil-input" inputMode="decimal" value={fraisHT}
                onChange={(e) => setFraisHT(e.target.value)} />
            </label>
            <label className="profil-label">
              PDF du devis (ERP)
              <input className="profil-input" type="file" accept="application/pdf" ref={fileRef} />
            </label>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '8px 0' }}>
            Lignes du devis (prix négociés)
          </div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 70px 110px 34px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input className="profil-input" placeholder="Désignation *" value={l.name}
                onChange={(e) => setLine(i, 'name', e.target.value)} />
              <input className="profil-input" placeholder="Référence" value={l.reference}
                onChange={(e) => setLine(i, 'reference', e.target.value)} />
              <input className="profil-input" placeholder="Détail (dim., coloris…)" value={l.detail}
                onChange={(e) => setLine(i, 'detail', e.target.value)} />
              <input className="profil-input" inputMode="numeric" placeholder="Qté" value={l.quantity}
                onChange={(e) => setLine(i, 'quantity', e.target.value)} />
              <input className="profil-input" inputMode="decimal" placeholder="PU HT €" value={l.unitPriceHT}
                onChange={(e) => setLine(i, 'unitPriceHT', e.target.value)} />
              <button type="button" className="cart-del" aria-label="Supprimer la ligne"
                onClick={() => setLines((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn ghost sm" onClick={() => setLines((prev) => [...prev, { ...BLANK_LINE }])}>
            + Ajouter une ligne
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 15 }}>
              Total HT (livraison incluse) : <strong>{euro(totalHT)}</strong>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}> · TTC {euro(totalHT * 1.2)}</span>
            </div>
            <button className="btn solid" type="submit" disabled={saving}>
              {saving ? 'Création…' : 'Créer le devis pour le client'}
            </button>
          </div>
        </form>
      )}

      {/* ── Liste des devis ── */}
      {loading ? (
        <div className="adm-loading">Chargement…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Client</th>
                <th>Source</th>
                <th>Total HT</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {devis.length === 0 && (
                <tr className="adm-tr"><td colSpan={7} style={{ color: 'var(--muted)' }}>Aucun devis.</td></tr>
              )}
              {devis.map((d) => (
                <tr key={d.id} className="adm-tr">
                  <td className="ref">{d.devis_number}</td>
                  <td>
                    {d.company || d.customer_name || '—'}
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.email}</div>
                  </td>
                  <td>
                    <span className={`order-status ${d.source === 'erp' ? 'status-shipping' : 'status-pending'}`}>
                      {d.source === 'erp' ? 'ERP' : 'Site'}
                    </span>
                  </td>
                  <td><strong>{euro(Number(d.total_ht))}</strong></td>
                  <td>{STATUS_LABEL[d.status] ?? d.status}</td>
                  <td>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    {d.pdf_path ? (
                      <a className="btn ghost sm" href={`/api/devis/${d.devis_number}/pdf`} target="_blank" rel="noreferrer">
                        ↓ PDF
                      </a>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
