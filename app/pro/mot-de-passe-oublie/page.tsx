'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { createClient } from '@/lib/supabase/client';

export default function MotDePasseOubliePage() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error: supaError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${siteUrl}/pro/nouveau-mot-de-passe` }
      );
      if (supaError) {
        setError(supaError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap">
      <Breadcrumb crumbs={[
        { label: 'Accueil', href: '/' },
        { label: 'Espace pro', href: '/pro' },
        { label: 'Mot de passe oublié' },
      ]} />

      <div className="reset-wrap">
        {sent ? (
          <div className="reg-success">
            <div className="reg-success-icon">✉</div>
            <h1>Email envoyé !</h1>
            <p>
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
              Cliquez dessus pour définir un nouveau mot de passe.
            </p>
            <p className="reg-success-note">
              Le lien expire dans 1h. Vérifiez vos spams si besoin.
            </p>
            <Link className="btn ghost" href="/pro">Retour à la connexion</Link>
          </div>
        ) : (
          <>
            <h1 className="reset-title">Mot de passe oublié</h1>
            <p className="reset-intro">
              Entrez votre adresse email. Si un compte existe, vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            <form className="reset-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="reset-email">Adresse email *</label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button className="btn solid full" type="submit" disabled={loading}>
                {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </button>
              <p className="inscription-switch">
                <Link className="inscription-link" href="/pro">← Retour à la connexion</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
