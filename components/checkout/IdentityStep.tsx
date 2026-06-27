'use client';

import { useState } from 'react';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useAuthStore } from '@/lib/store/auth';

interface Props { onContinue: () => void }

type Mode = 'choose' | 'guest' | 'login';

export function IdentityStep({ onContinue }: Props) {
  const [mode, setMode]         = useState<Mode>('choose');
  const [guestEmail, setGuestEmailInput] = useState('');
  const [loginEmail, setLoginEmail]      = useState('');
  const [password, setPassword]          = useState('');
  const [error, setError]                = useState('');
  const [loading, setLoading]            = useState(false);

  const { setGuestEmail, setGuestMode } = useCheckoutStore();
  const { login } = useAuthStore();

  const handleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const email = guestEmail.trim();
    if (!email || !email.includes('@')) return;
    setGuestEmail(email);
    setGuestMode(true);
    onContinue();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(loginEmail.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onContinue();
    }
  };

  if (mode === 'choose') {
    return (
      <div className="identity-wrap">
        <h1 className="identity-title">Passer commande</h1>
        <div className="identity-options">
          <div className="identity-card">
            <div className="identity-card-icon">📧</div>
            <h2>Commander en invité</h2>
            <p>Rapide, sans inscription. Vous recevrez un email de confirmation avec le détail de votre commande.</p>
            <button className="btn solid full" type="button" onClick={() => setMode('guest')}>
              Commander en invité →
            </button>
          </div>

          <div className="identity-sep"><span>ou</span></div>

          <div className="identity-card">
            <div className="identity-card-icon">🔐</div>
            <h2>Se connecter</h2>
            <p>Accédez à votre historique de commandes, vos adresses enregistrées et vos tarifs pro.</p>
            <button className="btn ghost full" type="button" onClick={() => setMode('login')}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'guest') {
    return (
      <div className="identity-wrap">
        <button className="identity-back" type="button" onClick={() => setMode('choose')}>
          ← Retour
        </button>
        <h1 className="identity-title">Commander en invité</h1>
        <form className="identity-form ck-form" onSubmit={handleGuest}>
          <div className="ck-section">
            <p className="identity-intro">
              Votre confirmation de commande et vos informations de livraison seront envoyées à cette adresse.
            </p>
            <div className="field">
              <label htmlFor="guest-email">Adresse email *</label>
              <input
                id="guest-email"
                type="email"
                required
                autoFocus
                placeholder="votre@email.fr"
                value={guestEmail}
                onChange={(e) => setGuestEmailInput(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="ck-actions">
            <button className="btn solid lg" type="submit">
              Continuer → Adresse de livraison
            </button>
          </div>
          <p className="identity-switch">
            Vous avez un compte ?{' '}
            <button type="button" className="identity-link" onClick={() => setMode('login')}>
              Se connecter
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="identity-wrap">
      <button className="identity-back" type="button" onClick={() => setMode('choose')}>
        ← Retour
      </button>
      <h1 className="identity-title">Se connecter</h1>
      <form className="identity-form ck-form" onSubmit={handleLogin}>
        <div className="ck-section">
          {error && <div className="identity-error">{error}</div>}
          <div className="field">
            <label htmlFor="login-email">Email *</label>
            <input
              id="login-email"
              type="email"
              required
              autoFocus
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="login-pwd">Mot de passe *</label>
            <input
              id="login-pwd"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>
        <div className="ck-actions">
          <button className="btn solid lg" type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter →'}
          </button>
        </div>
        <p className="identity-switch">
          Pas de compte ?{' '}
          <button type="button" className="identity-link" onClick={() => setMode('guest')}>
            Commander en invité
          </button>
        </p>
      </form>
    </div>
  );
}
