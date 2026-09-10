'use client';

import { useState } from 'react';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';

type Audience = 'pro' | 'particulier';

function ContactForm({ audience }: { audience: Audience }) {
  const isPro = audience === 'pro';
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (siteKey && !token) { setError('Veuillez compléter la vérification anti-robot.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          company: isPro ? company : '',
          name, email, phone, message,
          turnstileToken: token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Une erreur est survenue.'); }
      else { setSent(true); }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="vt-form" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3 style={{ fontSize: 18 }}>Message envoyé</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Merci {name ? name.split(' ')[0] : ''} — notre équipe vous répond sous 24&nbsp;h ouvrées.
        </p>
      </div>
    );
  }

  return (
    <form className="vt-form" onSubmit={submit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span className="vt-badge" style={{ background: isPro ? 'var(--navy-700)' : 'var(--alu-400)' }}>
          {isPro ? 'PRO' : 'PARTICULIER'}
        </span>
        <h3 style={{ fontSize: 18 }}>{isPro ? 'Vous êtes professionnel' : 'Vous êtes un particulier'}</h3>
      </div>

      {!isPro && (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
          Nous vendons exclusivement aux professionnels. Laissez-nous vos coordonnées : nous vous
          orientons vers un installateur partenaire près de chez vous.
        </p>
      )}

      {isPro && (
        <div className="field">
          <label htmlFor={`${audience}-company`}>Entreprise</label>
          <input id={`${audience}-company`} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Pose & Déco SARL" required />
        </div>
      )}
      <div className="field">
        <label htmlFor={`${audience}-name`}>Nom &amp; prénom</label>
        <input id={`${audience}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={isPro ? 'Jean Dupont' : 'Marie Martin'} required />
      </div>
      <div className="vt-form-row2">
        <div className="field">
          <label htmlFor={`${audience}-email`}>Email</label>
          <input id={`${audience}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={isPro ? 'jean@entreprise.fr' : 'marie@email.fr'} required />
        </div>
        <div className="field">
          <label htmlFor={`${audience}-phone`}>Téléphone</label>
          <input id={`${audience}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 xx xx xx xx" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${audience}-message`}>{isPro ? 'Votre message' : 'Votre projet'}</label>
        <textarea id={`${audience}-message`} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={isPro ? 'Votre besoin, vos volumes…' : 'Décrivez votre projet…'} required />
      </div>

      {siteKey && (
        <div style={{ marginBottom: 14 }}>
          <TurnstileWidget onVerify={setToken} onExpire={() => setToken('')} onError={() => setError('Erreur de vérification anti-robot.')} />
        </div>
      )}

      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

      <button className={`btn ${isPro ? 'solid' : 'ghost'} full`} type="submit" disabled={loading}>
        {loading ? 'Envoi…' : isPro ? 'Envoyer ma demande' : 'Être recontacté'}
      </button>
    </form>
  );
}

/** Deux formulaires de contact (pro / particulier) pour la page vitrine. */
export function ContactForms() {
  return (
    <>
      <ContactForm audience="pro" />
      <ContactForm audience="particulier" />
    </>
  );
}
