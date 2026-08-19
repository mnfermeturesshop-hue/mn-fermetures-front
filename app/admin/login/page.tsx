'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Session expirée (déconnexion automatique par le middleware) → message d'invite.
  // Lu côté client (window) pour éviter d'imposer un Suspense boundary à useSearchParams.
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('expired') === '1') setExpired(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Email ou mot de passe incorrect.');
        setLoading(false);
        return;
      }

      // Le middleware vérifie le rôle admin côté serveur
      router.push('/admin');
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
      setLoading(false);
    }
  }

  return (
    <div className="adm-login-wrap">
      <div className="adm-login-box">
        <div className="adm-logo" style={{ marginBottom: 32 }}>
          <div className="adm-logo-mark">MN</div>
          <div>
            <div className="adm-logo-name">FERMETURES</div>
            <div className="adm-logo-tag">Administration</div>
          </div>
        </div>

        {expired && (
          <p className="adm-login-error" style={{ background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }}>
            Votre session a expiré pour raison de sécurité. Merci de vous reconnecter.
          </p>
        )}

        <form onSubmit={handleSubmit} className="adm-login-form">
          <div className="adm-form-field">
            <label className="adm-form-label">Email</label>
            <input
              type="email"
              className="adm-form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@example.com"
            />
          </div>

          <div className="adm-form-field">
            <label className="adm-form-label">Mot de passe</label>
            <input
              type="password"
              className="adm-form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && <p className="adm-login-error">{error}</p>}

          <button type="submit" className="adm-login-btn" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
