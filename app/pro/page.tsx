'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from '@/components/ui/Toast';
import { fetchCompanyBySiret } from '@/lib/siret';

type Tab = 'login' | 'register';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Connexion réussie — bienvenue !');
      router.push('/compte');
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Se connecter</h2>
      <div className="field">
        <label htmlFor="email">Email professionnel</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@votre-entreprise.fr"
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label htmlFor="password">
          Mot de passe
          <Link className="auth-forgot" href="/pro/mot-de-passe-oublie">Oublié ?</Link>
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <button className="btn solid full" type="submit" disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

function RegisterForm() {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState('');
  const [siret, setSiret] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [siretLoading, setSiretLoading] = useState(false);
  const [companyAutoFilled, setCompanyAutoFilled] = useState(false);

  useEffect(() => {
    if (siret.length !== 14) return;
    let cancelled = false;
    setSiretLoading(true);
    fetchCompanyBySiret(siret).then((info) => {
      if (cancelled) return;
      setSiretLoading(false);
      if (info?.nom) {
        setCompany(info.nom);
        setCompanyAutoFilled(true);
      }
    });
    return () => { cancelled = true; };
  }, [siret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pro-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, siret, name, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Une erreur est survenue.'); }
      else { setSubmitted(true); }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">✓</div>
        <h2>Demande envoyée !</h2>
        <p>
          Votre demande de compte professionnel a été transmise à notre équipe.
          Vous recevrez un email de confirmation sous <strong>24h ouvrées</strong>.
        </p>
        <p className="auth-success-contact">
          Un doute ? Appelez-nous : <strong>04 67 78 06 63</strong>
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Ouvrir un compte pro</h2>
      <div className="auth-steps">
        <span className={step >= 1 ? 'active' : ''}>1 · Entreprise</span>
        <span className="auth-step-sep">›</span>
        <span className={step >= 2 ? 'active' : ''}>2 · Contact</span>
      </div>

      {step === 1 && (
        <>
          <div className="field">
            <label htmlFor="siret">N° SIRET *</label>
            <input
              id="siret"
              type="text"
              required
              pattern="[0-9]{14}"
              maxLength={14}
              inputMode="numeric"
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/\D/g, ''))}
              placeholder="12345678900014"
            />
            {siretLoading && <span className="field-hint">Recherche de l&apos;entreprise…</span>}
          </div>
          <div className="field">
            <label htmlFor="company">Raison sociale *</label>
            <input
              id="company"
              type="text"
              required
              value={company}
              onChange={(e) => { setCompany(e.target.value); setCompanyAutoFilled(false); }}
              placeholder="Pose & Déco SARL"
            />
            {companyAutoFilled && !siretLoading && (
              <span className="field-hint" style={{ color: '#16a34a' }}>✓ Entreprise trouvée automatiquement</span>
            )}
          </div>
          <button
            className="btn solid full"
            type="button"
            disabled={!company || siret.length < 14}
            onClick={() => setStep(2)}
          >
            Continuer →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="field">
            <label htmlFor="reg-name">Nom & prénom *</label>
            <input
              id="reg-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
            />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email professionnel *</label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean@votre-entreprise.fr"
            />
          </div>
          <div className="field">
            <label htmlFor="reg-phone">Téléphone</label>
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 xx xx xx xx"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="auth-form-row">
            <button className="btn ghost" type="button" onClick={() => setStep(1)}>← Retour</button>
            <button className="btn solid" type="submit" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

export default function ProPage() {
  const [tab, setTab] = useState<Tab>('login');
  const { user, isPro } = useAuthStore();
  const router = useRouter();

  if (user && isPro()) {
    router.replace('/compte');
    return null;
  }

  return (
    <div className="wrap pro-page">
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Espace pro' }]} />

      <div className="pro-layout">
        {/* Colonne gauche — formulaire */}
        <div className="pro-form-col">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              type="button"
              onClick={() => setTab('login')}
            >
              Se connecter
            </button>
            <button
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              type="button"
              onClick={() => setTab('register')}
            >
              Ouvrir un compte pro
            </button>
          </div>

          {tab === 'login' ? <LoginForm /> : <RegisterForm />}

          <p className="auth-b2c-hint">
            Vous êtes un particulier ?{' '}
            <Link href="/inscription">Créer un compte particulier →</Link>
          </p>
        </div>

        {/* Colonne droite — avantages pro */}
        <div className="pro-benefits">
          <div className="pro-benefit-head">
            <span className="eyebrow">Espace professionnel</span>
            <h2>Les avantages du compte pro MN Fermetures</h2>
          </div>
          <ul className="pro-benefit-list">
            {[
              ['💰', 'Tarifs préférentiels HT', 'Accès aux prix négociés et remises volume'],
              ['📋', 'Devis PDF instantané', 'Générez et téléchargez vos devis en un clic'],
              ['📦', 'Suivi des commandes', 'Historique complet, statuts en temps réel'],
              ['🚚', 'Livraison offerte dès 400 € HT', 'En Occitanie — délai 24/48h'],
              ['💳', 'Paiement différé', 'Règlement par virement à 30 jours fin de mois'],
              ['🤝', 'Accès à votre commercial', 'Contact direct avec votre interlocuteur dédié'],
            ].map(([icon, title, desc]) => (
              <li key={title} className="pro-benefit-item">
                <span className="pro-benefit-icon">{icon}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="pro-contact-box">
            <strong>Besoin d&apos;aide pour créer votre compte ?</strong>
            <p>04 67 78 06 63 · Du lundi au vendredi 8h–17h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
