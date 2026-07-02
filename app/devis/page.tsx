'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/Toast';
import type { CartLine } from '@/lib/catalog/types';

const TVA = 0.2;

interface SavedDevis {
  id: string;
  devis_number: string;
  customer_name: string | null;
  company: string | null;
  lines: CartLine[];
  total_ht: number;
  total_ttc: number;
  frais_ht: number;
  created_at: string;
  valid_until: string;
  status: string;
}

function genDevisNumber() {
  return `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function DevisContent() {
  const searchParams  = useSearchParams();
  const orderId       = searchParams.get('order');
  const savedDevisNum = searchParams.get('devis');

  const { placedOrder }                                             = useCheckoutStore();
  const { lines, totalHT, totalTTC, isFranco, fraisLivraison }     = useCartStore();
  const { user, isPro }                                             = useAuthStore();

  const [savedDevis, setSavedDevis]     = useState<SavedDevis | null>(null);
  const [saving, setSaving]             = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [savingPdf, setSavingPdf]       = useState(false);
  // Numéro de devis stable pour toute la durée de la page (ne se régénère pas)
  const [cartDevisNum]                  = useState(genDevisNumber);

  // Mode order (facture commande existante)
  const isOrderMode  = !!orderId && !!placedOrder && placedOrder.id === orderId;
  // Mode devis sauvegardé (chargé depuis compte)
  const isSavedMode  = !!savedDevisNum && !!savedDevis;

  // Charger un devis sauvegardé si param ?devis=
  useEffect(() => {
    if (!savedDevisNum) return;
    const supabase = createClient();
    supabase
      .from('devis')
      .select('*')
      .eq('devis_number', savedDevisNum)
      .single()
      .then(({ data }) => {
        if (data) { setSavedDevis(data as SavedDevis); setAlreadySaved(true); }
      });
  }, [savedDevisNum]);

  // Données à afficher selon le mode
  const devisLines   = isSavedMode ? savedDevis!.lines
                     : isOrderMode ? placedOrder.lines
                     : lines;
  const devisTotalHT  = isSavedMode ? Number(savedDevis!.total_ht)
                      : isOrderMode ? placedOrder.totalHT
                      : totalHT() + fraisLivraison();
  const devisTotalTTC = isSavedMode ? Number(savedDevis!.total_ttc)
                      : isOrderMode ? placedOrder.totalTTC
                      : totalTTC() + fraisLivraison() * (1 + TVA);
  const devisTVA     = devisTotalHT * TVA;
  const devisNum     = isSavedMode ? savedDevis!.devis_number
                     : isOrderMode ? placedOrder.id
                     : cartDevisNum;
  const devisDate    = isSavedMode
                       ? new Date(savedDevis!.created_at).toLocaleDateString('fr-FR')
                       : isOrderMode ? placedOrder.date
                       : new Date().toLocaleDateString('fr-FR');
  const validUntil   = isSavedMode
                       ? new Date(savedDevis!.valid_until).toLocaleDateString('fr-FR')
                       : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');
  const devisFraisHT = isSavedMode ? Number(savedDevis!.frais_ht)
                     : isOrderMode ? placedOrder.fraisHT
                     : fraisLivraison();

  useEffect(() => {
    const label = isOrderMode ? 'Facture' : 'Devis';
    document.title = `${label} ${devisNum} — MN Fermetures`;
  }, [devisNum, isOrderMode]);

  const handleSaveDevis = async () => {
    if (!user || !isPro() || alreadySaved) return;
    setSaving(true);
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisNumber:  devisNum,
          userId:       user.id,
          email:        user.email,
          customerName: user.name,
          company:      user.company ?? null,
          lines:        devisLines,
          totalHT:      devisTotalHT,
          totalTTC:     devisTotalTTC,
          fraisHT:      devisFraisHT,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json() as { error?: string };
        throw new Error(error ?? 'Erreur inconnue');
      }
      setAlreadySaved(true);
      toast.success('Devis sauvegardé dans votre espace compte');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePDF = async () => {
    setSavingPdf(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const element = document.querySelector('.devis-doc');
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${devisNum}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } catch {
      toast.error('Erreur génération PDF');
    } finally {
      setSavingPdf(false);
    }
  };

  return (
    <div className="devis-page">
      <div className="devis-print-bar no-print">
        <span>{isOrderMode ? `Aperçu de la facture — ${devisNum}` : `Aperçu du devis — ${devisNum}`}</span>
        <div className="devis-bar-actions">
          {isPro() && !isOrderMode && (
            <button
              className="btn ghost sm"
              type="button"
              onClick={handleSaveDevis}
              disabled={saving || alreadySaved}
            >
              {alreadySaved ? '✓ Sauvegardé' : saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
            </button>
          )}
          {isPro() && !isOrderMode && (
            <Link className="btn solid" href="/commande-pro">
              Créer un bon de commande →
            </Link>
          )}
          <button
            className="btn ghost"
            type="button"
            onClick={handleSavePDF}
            disabled={savingPdf}
          >
            {savingPdf ? 'Génération…' : 'Enregistrer PDF'}
          </button>
          <button className="btn solid" type="button" onClick={() => window.print()}>
            Imprimer
          </button>
        </div>
      </div>

      <div className="devis-doc">
        {/* En-tête */}
        <div className="devis-header">
          <div className="devis-logo">
            <Image
              src="/logo.png"
              alt="MN Fermetures"
              width={160}
              height={62}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div className="devis-meta">
            <div className="devis-type">{isOrderMode ? 'FACTURE' : 'DEVIS'}</div>
            <table className="devis-meta-table">
              <tbody>
                <tr><td>N°</td><td><strong className="ref">{devisNum}</strong></td></tr>
                <tr><td>Date</td><td>{devisDate}</td></tr>
                {!isOrderMode && <tr><td>Valable jusqu&apos;au</td><td>{validUntil}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adresses */}
        <div className="devis-parties">
          <div className="devis-emetteur">
            <div className="devis-party-label">Émetteur</div>
            <address>
              <strong>MN FERMETURES SARL</strong><br />
              Chemin du Mas de Pastrou<br />
              34560 Villeveyrac<br />
              04 67 78 06 63<br />
              contact@mmfermetures.fr
            </address>
          </div>
          {isOrderMode && placedOrder.shippingAddress.lastName && (
            <div className="devis-destinataire">
              <div className="devis-party-label">Destinataire / Livraison</div>
              <address>
                <strong>{placedOrder.shippingAddress.firstName} {placedOrder.shippingAddress.lastName}</strong><br />
                {placedOrder.shippingAddress.company && <>{placedOrder.shippingAddress.company}<br /></>}
                {placedOrder.shippingAddress.address1}<br />
                {placedOrder.shippingAddress.address2 && <>{placedOrder.shippingAddress.address2}<br /></>}
                {placedOrder.shippingAddress.postalCode} {placedOrder.shippingAddress.city}<br />
                {placedOrder.shippingAddress.phone}
              </address>
            </div>
          )}
        </div>

        {/* Tableau des lignes */}
        <table className="devis-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Réf.</th>
              <th>Qté</th>
              <th>P.U. HT</th>
              <th>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {devisLines.map((l: CartLine, i: number) => (
              <tr key={l.key ?? i}>
                <td>
                  <div className="devis-line-name">{l.name}</div>
                  {l.detail && <div className="devis-line-detail">{l.detail}</div>}
                </td>
                <td className="ref">{l.reference ?? '—'}</td>
                <td>{l.quantity}</td>
                <td>{euro(l.unitPriceHT)}</td>
                <td>{euro(l.unitPriceHT * l.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Frais de livraison HT</td>
              <td>
                {devisFraisHT === 0
                  ? (isOrderMode ? (placedOrder.fraisHT === 0 ? 'Offerte' : euro(placedOrder.fraisHT)) : (isFranco() ? 'Offerte' : euro(fraisLivraison())))
                  : euro(devisFraisHT)}
              </td>
            </tr>
            <tr className="devis-subtotal">
              <td colSpan={4}>Sous-total HT</td>
              <td>{euro(devisTotalHT)}</td>
            </tr>
            <tr>
              <td colSpan={4}>TVA 20 %</td>
              <td>{euro(devisTVA)}</td>
            </tr>
            <tr className="devis-total">
              <td colSpan={4}><strong>Total TTC</strong></td>
              <td><strong>{euro(devisTotalTTC)}</strong></td>
            </tr>
          </tfoot>
        </table>

        {/* Conditions */}
        <div className="devis-conditions">
          <div className="devis-cond-block">
            <strong>Livraison</strong>
            <p>Livraison offerte en Occitanie dès 400 € HT. Forfait 26 € HT en deçà. Express 24h : 42 € HT.</p>
          </div>
          <div className="devis-cond-block">
            <strong>Paiement</strong>
            <p>Comptes professionnels : virement 30 jours fin de mois. Particuliers : CB ou virement anticipé.</p>
          </div>
          {!isOrderMode && (
            <div className="devis-cond-block">
              <strong>Validité</strong>
              <p>Ce devis est valable 30 jours à compter de sa date d&apos;émission. Prix HT — TVA 20 %.</p>
            </div>
          )}
        </div>

        <div className="devis-footer">
          MN FERMETURES SARL · SIRET 123 456 789 00014 · RCS Montpellier · NAF 4669B
        </div>
      </div>
    </div>
  );
}

export default function DevisPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Chargement…</div>}>
      <DevisContent />
    </Suspense>
  );
}
