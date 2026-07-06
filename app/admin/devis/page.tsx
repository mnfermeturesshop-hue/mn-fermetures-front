'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

const euro = (n: number) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

const STATUS_LABEL: Record<string, string> = {
  draft: 'En cours',
  converted: 'Commandé',
  expired: 'Expiré',
};

export default function AdminDevisPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [devis, setDevis]     = useState<DevisRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres (même outil que l'onglet Commandes)
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Formulaire d'import
  const [showForm, setShowForm]     = useState(false);
  const [clientId, setClientId]     = useState('');
  const [totalHT, setTotalHT]       = useState('');
  const [validUntil, setValidUntil] = useState('');
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

  const filtered = useMemo(() => {
    let list = devis;
    if (filterStatus) list = list.filter((d) => d.status === filterStatus);
    if (filterSource) list = list.filter((d) => d.source === filterSource);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.devis_number?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.customer_name?.toLowerCase().includes(q) ||
        d.company?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [devis, search, filterStatus, filterSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file)     { toast.error('Sélectionnez le PDF du devis'); return; }
    if (!clientId) { toast.error('Sélectionnez un client'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', clientId);
      if (totalHT.trim())  fd.append('totalHT', totalHT.trim());
      if (validUntil)      fd.append('validUntil', validUntil);

      const res = await fetch('/api/admin/devis', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');

      toast.success(`Devis ${data.devisNumber} importé — visible dans l'espace du client`);
      setClientId(''); setTotalHT(''); setValidUntil('');
      if (fileRef.current) fileRef.current.value = '';
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h1 className="adm-h1">Devis</h1>
          <p className="adm-sub">Devis générés sur le site et devis ERP importés pour les clients pro.</p>
        </div>
        <button className="btn solid" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Fermer' : '⬆ Importer un devis'}
        </button>
      </div>

      {/* ── Import d'un devis ERP (PDF) ── */}
      {showForm && (
        <form className="adm-card" onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 20 }}>
          <div className="adm-form-grid" style={{ marginBottom: 14 }}>
            <label className="profil-label">
              PDF du devis (ERP) *
              <input className="profil-input" type="file" accept="application/pdf" ref={fileRef} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Le n° de devis est repris du nom du fichier (ex. DEV-2026-0042.pdf).
              </span>
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
              Total HT € <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optionnel, affiché au client)</span>
              <input className="profil-input" inputMode="decimal" value={totalHT}
                onChange={(e) => setTotalHT(e.target.value)} placeholder="1250,00" />
            </label>
            <label className="profil-label">
              Valide jusqu&apos;au <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(défaut : 30 jours)</span>
              <input className="profil-input" type="date" value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)} />
            </label>
          </div>
          <button className="btn solid" type="submit" disabled={saving}>
            {saving ? 'Import…' : 'Importer pour le client'}
          </button>
        </form>
      )}

      {/* ── Filtres (même outil que l'onglet Commandes) ── */}
      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="N° devis, client, entreprise, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="adm-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="adm-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">Toutes les sources</option>
          <option value="site">Site</option>
          <option value="erp">ERP</option>
        </select>
        <span className="adm-count">{filtered.length} devis</span>
      </div>

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
              {filtered.length === 0 && (
                <tr className="adm-tr"><td colSpan={7} style={{ color: 'var(--muted)' }}>Aucun devis.</td></tr>
              )}
              {filtered.map((d) => (
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
                  <td>{Number(d.total_ht) > 0 ? <strong>{euro(Number(d.total_ht))}</strong> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
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
