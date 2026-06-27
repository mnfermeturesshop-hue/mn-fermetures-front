'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'volet' | 'besoin' | null;

interface Choice { label: string; icon: string; value: string }

const VOLET_TYPES: Choice[] = [
  { icon: '🏠', label: 'Rénovation', value: 'renovation' },
  { icon: '🏗️', label: 'Bloc baie neuf', value: 'bloc-baie' },
  { icon: '🪟', label: 'Volet traditionnel', value: 'traditionnel' },
  { icon: '❓', label: 'Je ne sais pas', value: 'tout' },
];

const BESOINS: Choice[] = [
  { icon: '⚙', label: 'Kit axe complet', value: 'kits-axes' },
  { icon: '▤', label: 'Tablier / lames', value: 'tabliers' },
  { icon: '⊙', label: 'Moteur', value: 'motorisations' },
  { icon: '⎚', label: 'Commande / télécommande', value: 'commandes' },
  { icon: '▬', label: 'Profilé / coffre', value: 'profils' },
  { icon: '◖', label: 'Pièce détachée', value: 'embouts' },
];

// Affiner la catégorie selon le type de volet
const CATEGORY_MAP: Record<string, Record<string, string>> = {
  'kits-axes': {
    renovation:      '/catalogue/kits-axes/renovation',
    'bloc-baie':     '/catalogue/kits-axes/bloc-baie',
    traditionnel:    '/catalogue/kits-axes',
    tout:            '/catalogue/kits-axes',
  },
};

function getCatalogUrl(volet: string, besoin: string): string {
  return CATEGORY_MAP[besoin]?.[volet] ?? `/catalogue/${besoin}`;
}

export function FindMyPart() {
  const [step, setStep] = useState<Step>('volet');
  const [volet, setVolet] = useState('');
  const router = useRouter();

  const chooseVolet = (v: string) => {
    setVolet(v);
    setStep('besoin');
  };

  const chooseBesoin = (b: string) => {
    router.push(getCatalogUrl(volet, b));
  };

  const reset = () => { setStep('volet'); setVolet(''); };

  return (
    <div className="findpart">
      <div className="findpart-head">
        <span className="eyebrow">Guide d&apos;achat</span>
        <h2>Trouver ma pièce</h2>
        <p className="findpart-sub">
          Vous ne connaissez pas la référence ? Répondez à 2 questions.
        </p>
      </div>

      {step === 'volet' && (
        <div className="findpart-step">
          <div className="findpart-q">Quel type de volet roulant ?</div>
          <div className="findpart-choices">
            {VOLET_TYPES.map((c) => (
              <button
                key={c.value}
                type="button"
                className="findpart-choice"
                onClick={() => chooseVolet(c.value)}
              >
                <span className="findpart-icon">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'besoin' && (
        <div className="findpart-step">
          <div className="findpart-q">
            <button type="button" className="findpart-back" onClick={reset}>← Retour</button>
            Que recherchez-vous ?
          </div>
          <div className="findpart-choices findpart-choices--wide">
            {BESOINS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="findpart-choice"
                onClick={() => chooseBesoin(c.value)}
              >
                <span className="findpart-icon">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
