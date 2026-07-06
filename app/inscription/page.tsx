'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { B2C_ENABLED } from '@/lib/config';

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Faible', color: '#ef4444' };
  if (score === 2) return { level: 2, label: 'Moyen', color: '#f59e0b' };
  if (score === 3) return { level: 3, label: 'Fort', color: '#22c55e' };
  return { level: 4, label: 'Très fort', color: '#16a34a' };
}

export default function InscriptionPage() {
  const router = useRouter();

  // Offre B2B uniquement : pas de création de compte particulier
  useEffect(() => {
    if (!B2C_ENABLED) router.replace('/pro');
  }, [router]);

  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [turnstileToken, setToken]    = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [done, setDone]               = useState(false);
  const turnstileRef                  = useRef<() => void>(() => {});

  const strength = getPasswordStrength(password);

  if (!B2C_ENABLED) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPw) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !turnstileToken) {
      setError('Veuillez compléter la vérification anti-robot.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        turnstileRef.current?.();
      } else {
        setDone(true);
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="wrap">
        <div className="reg-success">
          <div className="reg-success-icon">✉</div>
          <h1>Vérifiez votre email !</h1>
          <p>
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <p className="reg-success-note">
            Le lien expire dans 24h. Si vous ne le trouvez pas, vérifiez vos spams.
          </p>
          <Link className="btn solid" href="/pro?type=particulier">
            Se connecter une fois le compte activé
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Breadcrumb crumbs={[
        { label: 'Accueil', href: '/' },
        { label: 'Créer un compte' },
      ]} />

      <div className="inscription-wrap">
        <div className="inscription-form-col">
          <h1 className="inscription-title">Créer un compte</h1>
          <p className="inscription-intro">
            Accédez à votre historique de commandes et téléchargez vos factures.
          </p>

          <form className="inscription-form" onSubmit={handleSubmit}>
            <div className="inscription-row">
              <div className="field">
                <label htmlFor="ins-firstname">Prénom *</label>
                <input
                  id="ins-firstname"
                  type="text"
                  required
                  autoFocus
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                />
              </div>
              <div className="field">
                <label htmlFor="ins-lastname">Nom *</label>
                <input
                  id="ins-lastname"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="ins-email">Adresse email *</label>
              <input
                id="ins-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
              />
            </div>

            <div className="field">
              <label htmlFor="ins-pw">Mot de passe *</label>
              <input
                id="ins-pw"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
              />
              {password && (
                <div className="pw-strength">
                  <div className="pw-strength-bars">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="pw-strength-bar"
                        style={{ background: strength.level >= i ? strength.color : '#e5e7eb' }}
                      />
                    ))}
                  </div>
                  <span className="pw-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="ins-pw2">Confirmer le mot de passe *</label>
              <input
                id="ins-pw2"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
              {confirmPw && password !== confirmPw && (
                <span className="field-hint error">Les mots de passe ne correspondent pas.</span>
              )}
            </div>

            <TurnstileWidget
              onVerify={setToken}
              onExpire={() => setToken('')}
              onError={() => setError('Erreur de vérification anti-robot.')}
            />

            {error && <div className="form-error">{error}</div>}

            <button
              className="btn solid full lg"
              type="submit"
              disabled={loading || (password !== confirmPw && !!confirmPw)}
            >
              {loading ? 'Création du compte…' : 'Créer mon compte'}
            </button>

            <p className="inscription-footer-note">
              En créant un compte, vous acceptez nos{' '}
              <Link href="/cgv">conditions générales de vente</Link>.
            </p>

            <p className="inscription-switch">
              Déjà un compte ?{' '}
              <Link className="inscription-link" href="/pro?type=particulier">Se connecter</Link>
            </p>

            <p className="inscription-switch">
              Professionnel ?{' '}
              <Link className="inscription-link" href="/pro?tab=register">Ouvrir un compte pro</Link>
            </p>
          </form>
        </div>

        <div className="inscription-benefits">
          <h2>Votre espace client</h2>
          <ul className="inscription-benefit-list">
            {[
              ['📦', 'Suivi de vos commandes', 'Statuts et historique en temps réel'],
              ['🧾', 'Factures PDF', 'Téléchargez vos factures à tout moment'],
              ['📍', 'Adresses enregistrées', 'Gagnez du temps à chaque commande'],
              ['🔔', 'Notifications', 'Expédition et livraison confirmées par email'],
            ].map(([icon, title, desc]) => (
              <li key={title} className="inscription-benefit-item">
                <span>{icon}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
