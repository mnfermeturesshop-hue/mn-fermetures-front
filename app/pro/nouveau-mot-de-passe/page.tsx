'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { createClient } from '@/lib/supabase/client';

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

export default function NouveauMotDePassePage() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [ready, setReady]         = useState(false);
  const router = useRouter();
  const strength = getPasswordStrength(password);

  useEffect(() => {
    // Supabase injects the session from the reset link hash automatically
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 8)  { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (!/[A-Z]/.test(password)) { setError('Ajoutez au moins une majuscule.'); return; }
    if (!/[0-9]/.test(password)) { setError('Ajoutez au moins un chiffre.'); return; }

    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: supaError } = await supabase.auth.updateUser({ password });
      if (supaError) {
        setError(supaError.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/pro'), 2500);
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap">
      <Breadcrumb crumbs={[
        { label: 'Accueil', href: '/' },
        { label: 'Espace pro', href: '/pro' },
        { label: 'Nouveau mot de passe' },
      ]} />

      <div className="reset-wrap">
        {success ? (
          <div className="reg-success">
            <div className="reg-success-icon">✓</div>
            <h1>Mot de passe mis à jour !</h1>
            <p>Votre mot de passe a bien été modifié. Vous allez être redirigé vers la connexion…</p>
          </div>
        ) : !ready ? (
          <div className="reset-waiting">
            <p>Vérification du lien de réinitialisation…</p>
            <p className="reg-success-note">
              Si cette page ne se charge pas, le lien a peut-être expiré.{' '}
              <Link href="/pro/mot-de-passe-oublie">Faire une nouvelle demande →</Link>
            </p>
          </div>
        ) : (
          <>
            <h1 className="reset-title">Nouveau mot de passe</h1>
            <p className="reset-intro">Choisissez un mot de passe sécurisé pour votre compte.</p>
            <form className="reset-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="npw">Nouveau mot de passe *</label>
                <input
                  id="npw"
                  type="password"
                  required
                  autoFocus
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
                <label htmlFor="npw2">Confirmer *</label>
                <input
                  id="npw2"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                {confirm && password !== confirm && (
                  <span className="field-hint error">Les mots de passe ne correspondent pas.</span>
                )}
              </div>
              {error && <div className="form-error">{error}</div>}
              <button
                className="btn solid full"
                type="submit"
                disabled={loading || (!!confirm && password !== confirm)}
              >
                {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
