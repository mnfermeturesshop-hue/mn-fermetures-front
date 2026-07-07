'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

interface Commercial {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  clients: number;
}

export default function AdminEquipePage() {
  const [team, setTeam]       = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Commercial | null>(null);
  const [acting, setActing]     = useState(false);

  const reload = () => {
    fetch('/api/admin/team')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTeam(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(reload, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Mot de passe : 8 caractères minimum'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
      toast.success(`Compte commercial créé pour ${name}`);
      setName(''); setEmail(''); setPhone(''); setPassword('');
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Commercial) => {
    setActing(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
      toast.success(`Compte de ${c.name} supprimé — ses clients sont repassés « non assigné »`);
      setConfirmDelete(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="adm-page">
      {confirmDelete && (
        <div className="adm-overlay">
          <div className="adm-confirm-box">
            <h3 className="adm-confirm-title">Supprimer ce commercial ?</h3>
            <p className="adm-confirm-body">
              Le compte de <strong>{confirmDelete.name}</strong> sera supprimé.
              {confirmDelete.clients > 0 && (
                <> Ses <strong>{confirmDelete.clients} client{confirmDelete.clients > 1 ? 's' : ''}</strong> repasseront « non assigné » (à réattribuer).</>
              )}
            </p>
            <div className="adm-confirm-actions">
              <button className="btn ghost" type="button" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn danger" type="button" disabled={acting} onClick={() => handleDelete(confirmDelete)}>
                {acting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-page-head">
        <div>
          <h1 className="adm-h1">Équipe commerciale</h1>
          <p className="adm-sub">
            Comptes à droits restreints : chaque commercial ne voit et ne gère que ses propres clients
            (commandes, devis, remises). Assignez les clients depuis l&apos;onglet Clients pro.
          </p>
        </div>
        <button className="btn solid" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Fermer' : '+ Commercial'}
        </button>
      </div>

      {showForm && (
        <form className="adm-card" onSubmit={handleCreate} style={{ marginBottom: 24, padding: 20 }}>
          <div className="adm-form-grid" style={{ marginBottom: 14 }}>
            <label className="profil-label">
              Nom complet *
              <input className="profil-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Martin" />
            </label>
            <label className="profil-label">
              Email *
              <input className="profil-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="j.martin@mnfermetures.fr" />
            </label>
            <label className="profil-label">
              Téléphone <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(affiché à ses clients)</span>
              <input className="profil-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 xx xx xx xx" />
            </label>
            <label className="profil-label">
              Mot de passe *
              <input className="profil-input" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères min." />
            </label>
          </div>
          <button className="btn solid" type="submit" disabled={saving}>
            {saving ? 'Création…' : 'Créer le compte commercial'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="adm-loading">Chargement…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Clients assignés</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 && (
                <tr className="adm-tr"><td colSpan={5} style={{ color: 'var(--muted)' }}>Aucun commercial. Créez le premier compte ci-dessus.</td></tr>
              )}
              {team.map((c) => (
                <tr key={c.id} className="adm-tr">
                  <td><strong>{c.name}</strong></td>
                  <td><span className="adm-slug">{c.email}</span></td>
                  <td>{c.phone ?? <span className="adm-muted">—</span>}</td>
                  <td>{c.clients > 0 ? <strong>{c.clients}</strong> : <span className="adm-muted">0</span>}</td>
                  <td>
                    <button className="adm-action-btn del" type="button" onClick={() => setConfirmDelete(c)}>
                      Supprimer
                    </button>
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
