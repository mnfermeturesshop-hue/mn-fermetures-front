'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useAuthStore } from '@/lib/store/auth';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';

interface Props { onContinue: () => void }

type Mode = 'choose' | 'guest' | 'login' | 'register';

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Faible', color: '#ef4444' };
  if (score === 2) return { level: 2, label: 'Moyen', color: '#f59e0b' };
  return { level: score >= 4 ? 4 : 3, label: score >= 4 ? 'Très fort' : 'Fort', color: '#22c55e' };
}

export function IdentityStep({ onContinue }: Props) {
  const [mode, setMode]            = useState<Mode>('choose');
  const [guestEmail, setGuestEmailInput] = useState('');
  const [loginEmail, setLoginEmail]      = useState('');
  const [password, setPassword]          = useState('');
  const [error, setError]                = useState('');
  const [loading, setLoading]            = useState(false);

  // Register fields
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [regEmail, setRegEmail]     = useState('');
  const [regPw, setRegPw]           = useState('');
  const [regPw2, setRegPw2]         = useState('');
  const [turnstileToken, setToken]  = useState('');
  const [regDone, setRegDone]       = useState(false);

  const { setGuestEmail, setGuestMode } = useCheckoutStore();
  const { login } = useAuthStore();

  const pwStrength = getPasswordStrength(regPw);

  const handleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const em = guestEmail.trim();
    if (!em || !em.includes('@')) return;
    setGuestEmail(em);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPw !== regPw2) { setError('Les mots de passe ne correspondent pas.'); return; }
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !turnstileToken) { setError('Veuillez compléter la vérification anti-robot.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email: regEmail, password: regPw, turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erreur lors de la création du compte.'); }
      else { setRegDone(true); }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // — Choose —
  if (mode === 'choose') {
    return (
      <div className="identity-wrap">
        <h1 className="identity-title">Passer commande</h1>
        <div className="identity-options identity-options-3">
          <div className="identity-card">
            <div className="identity-card-icon">📧</div>
            <h2>Commander en invité</h2>
            <p>Rapide, sans inscription. Confirmation par email.</p>
            <button className="btn solid full" type="button" onClick={() => setMode('guest')}>
              Commander en invité →
            </button>
          </div>

          <div className="identity-sep"><span>ou</span></div>

          <div className="identity-card">
            <div className="identity-card-icon">🔐</div>
            <h2>Se connecter</h2>
            <p>Accédez à votre historique et vos tarifs pro.</p>
            <button className="btn ghost full" type="button" onClick={() => setMode('login')}>
              Se connecter
            </button>
          </div>

          <div className="identity-sep"><span>ou</span></div>

          <div className="identity-card">
            <div className="identity-card-icon">✨</div>
            <h2>Créer un compte</h2>
            <p>Suivez vos commandes et téléchargez vos factures.</p>
            <button className="btn outline full" type="button" onClick={() => setMode('register')}>
              Créer un compte
            </button>
          </div>
        </div>
      </div>
    );
  }

  // — Guest —
  if (mode === 'guest') {
    return (
      <div className="identity-wrap">
        <button className="identity-back" type="button" onClick={() => setMode('choose')}>← Retour</button>
        <h1 className="identity-title">Commander en invité</h1>
        <form className="identity-form ck-form" onSubmit={handleGuest}>
          <div className="ck-section">
            <p className="identity-intro">Votre confirmation sera envoyée à cette adresse.</p>
            <div className="field">
              <label htmlFor="guest-email">Adresse email *</label>
              <input
                id="guest-email" type="email" required autoFocus
                placeholder="votre@email.fr"
                value={guestEmail} onChange={(e) => setGuestEmailInput(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="ck-actions">
            <button className="btn solid lg" type="submit">Continuer → Adresse de livraison</button>
          </div>
          <p className="identity-switch">
            Vous avez un compte ?{' '}
            <button type="button" className="identity-link" onClick={() => setMode('login')}>Se connecter</button>
          </p>
        </form>
      </div>
    );
  }

  // — Login —
  if (mode === 'login') {
    return (
      <div className="identity-wrap">
        <button className="identity-back" type="button" onClick={() => setMode('choose')}>← Retour</button>
        <h1 className="identity-title">Se connecter</h1>
        <form className="identity-form ck-form" onSubmit={handleLogin}>
          <div className="ck-section">
            {error && <div className="identity-error">{error}</div>}
            <div className="field">
              <label htmlFor="login-email">Email *</label>
              <input id="login-email" type="email" required autoFocus
                value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="login-pwd">
                Mot de passe *
                <Link className="auth-forgot" href="/pro/mot-de-passe-oublie">Oublié ?</Link>
              </label>
              <input id="login-pwd" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" />
            </div>
          </div>
          <div className="ck-actions">
            <button className="btn solid lg" type="submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </div>
          <p className="identity-switch">
            Pas de compte ?{' '}
            <button type="button" className="identity-link" onClick={() => setMode('register')}>Créer un compte</button>
            {' · '}
            <button type="button" className="identity-link" onClick={() => setMode('guest')}>Commander en invité</button>
          </p>
        </form>
      </div>
    );
  }

  // — Register —
  if (regDone) {
    return (
      <div className="identity-wrap">
        <div className="reg-success" style={{ margin: 0 }}>
          <div className="reg-success-icon">✉</div>
          <h1>Vérifiez votre email !</h1>
          <p>
            Un lien de confirmation a été envoyé à <strong>{regEmail}</strong>.
            Activez votre compte puis connectez-vous pour continuer.
          </p>
          <p className="reg-success-note" style={{ marginBottom: 24 }}>
            Vous pouvez aussi continuer en invité pendant ce temps.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setGuestEmail(regEmail);
                setGuestMode(true);
                onContinue();
              }}
            >
              Continuer en invité
            </button>
            <button className="btn solid" type="button" onClick={() => { setRegDone(false); setMode('login'); setLoginEmail(regEmail); }}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="identity-wrap">
      <button className="identity-back" type="button" onClick={() => setMode('choose')}>← Retour</button>
      <h1 className="identity-title">Créer un compte</h1>
      <form className="identity-form ck-form" onSubmit={handleRegister}>
        <div className="ck-section">
          {error && <div className="identity-error">{error}</div>}
          <div className="inscription-row">
            <div className="field">
              <label htmlFor="reg-fn">Prénom *</label>
              <input id="reg-fn" type="text" required autoFocus
                autoComplete="given-name" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="reg-ln">Nom *</label>
              <input id="reg-ln" type="text" required
                autoComplete="family-name" value={lastName}
                onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="reg-em">Email *</label>
            <input id="reg-em" type="email" required
              autoComplete="email" value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="reg-pw">Mot de passe *</label>
            <input id="reg-pw" type="password" required
              autoComplete="new-password" value={regPw}
              placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
              onChange={(e) => setRegPw(e.target.value)} />
            {regPw && (
              <div className="pw-strength">
                <div className="pw-strength-bars">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="pw-strength-bar"
                      style={{ background: pwStrength.level >= i ? pwStrength.color : '#e5e7eb' }} />
                  ))}
                </div>
                <span className="pw-strength-label" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="reg-pw2">Confirmer *</label>
            <input id="reg-pw2" type="password" required
              autoComplete="new-password" value={regPw2}
              onChange={(e) => setRegPw2(e.target.value)} />
          </div>
          <TurnstileWidget
            onVerify={setToken}
            onExpire={() => setToken('')}
            onError={() => setError('Erreur de vérification anti-robot.')}
          />
        </div>
        <div className="ck-actions">
          <button className="btn solid lg" type="submit" disabled={loading}>
            {loading ? 'Création…' : 'Créer mon compte →'}
          </button>
        </div>
        <p className="identity-switch">
          Déjà un compte ?{' '}
          <button type="button" className="identity-link" onClick={() => setMode('login')}>Se connecter</button>
        </p>
      </form>
    </div>
  );
}
