import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { verifyCartLines } from '@/lib/catalog/verifyCart';
import { getUserDiscounts } from '@/lib/pricing/discounts';
import { computeOrderTotals, type ShippingMethod } from '@/lib/pricing/shipping';
import { escapeHtml } from '@/lib/security/escapeHtml';
import { B2C_ENABLED } from '@/lib/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface OrderLine {
  key: string;
  name: string;
  reference?: string;
  detail?: string;
  quantity: number;
  unitPriceHT: number;
}

interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  postalCode: string;
  city: string;
  phone: string;
}

interface OrderPayload {
  orderNumber: string;
  email: string;
  customerName: string;
  isGuest: boolean;
  userId?: string;
  paymentMethod: 'card' | 'virement';
  shippingMethod: 'standard' | 'express';
  lines: OrderLine[];
  totalHT: number;
  totalTTC: number;
  fraisHT: number;
  shippingAddress: Address;
  billingAddress?: Address;
  paymentIntentId?: string;
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function buildEmailHtml(payload: OrderPayload): string {
  const { orderNumber, customerName, lines, totalHT, totalTTC, fraisHT, shippingAddress, paymentMethod, shippingMethod } = payload;
  const isVirement = paymentMethod === 'virement';

  const linesHtml = lines.map((l) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#1e3a5f;">${escapeHtml(l.name)}</div>
        ${l.reference ? `<div style="font-size:12px;color:#6b7280;font-family:monospace;">${escapeHtml(l.reference)}</div>` : ''}
        ${l.detail ? `<div style="font-size:12px;color:#6b7280;">${escapeHtml(l.detail)}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${euro(l.unitPriceHT * l.quantity)}&nbsp;HT</td>
    </tr>
  `).join('');

  const virementBlock = isVirement ? `
    <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
      <p style="margin:0 0 12px;font-weight:700;color:#1e3a5f;">Virement à effectuer sous 5 jours ouvrés</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#6b7280;">Titulaire</td><td style="font-weight:600;">MN FERMETURES SAS</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">IBAN</td><td style="font-family:monospace;font-weight:600;">FR76 3000 4004 0300 0100 1234 567</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">BIC</td><td style="font-family:monospace;font-weight:600;">BNPAFRPPXXX</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Référence</td><td style="font-family:monospace;font-weight:700;color:#1e3a5f;">${orderNumber}</td></tr>
      </table>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <!-- Header -->
    <tr>
      <td style="background:#1e3a5f;padding:28px 32px;text-align:center;">
        <p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:.04em;">MN FERMETURES</p>
        <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Volets roulants · Motorisations · Pièces détachées</p>
      </td>
    </tr>
    <!-- Confirmation badge -->
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#dcfce7;line-height:56px;font-size:28px;margin-bottom:16px;">✓</div>
        <h1 style="margin:0 0 8px;font-size:22px;color:#1e3a5f;">Commande confirmée !</h1>
        <p style="margin:0;color:#6b7280;font-size:14px;">Merci ${escapeHtml(customerName)} pour votre commande.</p>
        <div style="margin:16px auto;display:inline-block;padding:8px 20px;background:#f0f4f8;border-radius:6px;font-family:monospace;font-weight:700;color:#1e3a5f;font-size:16px;">
          N° ${orderNumber}
        </div>
      </td>
    </tr>
    <!-- Lines -->
    <tr>
      <td style="padding:24px 32px 0;">
        <h2 style="margin:0 0 12px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Récapitulatif</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">PRODUIT</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">QTÉ</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">TOTAL HT</th>
            </tr>
          </thead>
          <tbody>${linesHtml}</tbody>
          <tfoot>
            <tr style="background:#f9fafb;">
              <td colspan="2" style="padding:10px 12px;font-size:13px;color:#6b7280;">Frais de livraison (${shippingMethod === 'express' ? 'Express 24h' : 'Standard'})</td>
              <td style="padding:10px 12px;text-align:right;font-weight:600;">${fraisHT === 0 ? '<span style="color:#16a34a;">Offerts</span>' : euro(fraisHT) + '&nbsp;HT'}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:12px;font-weight:700;color:#1e3a5f;font-size:15px;border-top:2px solid #e5e7eb;">Total TTC</td>
              <td style="padding:12px;text-align:right;font-weight:800;color:#1e3a5f;font-size:18px;border-top:2px solid #e5e7eb;">${euro(totalTTC)}</td>
            </tr>
          </tfoot>
        </table>
      </td>
    </tr>
    <!-- Shipping address -->
    <tr>
      <td style="padding:24px 32px 0;">
        <h2 style="margin:0 0 12px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Adresse de livraison</h2>
        <div style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;line-height:1.7;">
          <strong>${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}</strong><br>
          ${shippingAddress.company ? escapeHtml(shippingAddress.company) + '<br>' : ''}
          ${escapeHtml(shippingAddress.address1)}<br>
          ${shippingAddress.address2 ? escapeHtml(shippingAddress.address2) + '<br>' : ''}
          ${escapeHtml(shippingAddress.postalCode)} ${escapeHtml(shippingAddress.city)}<br>
          ${escapeHtml(shippingAddress.phone)}
        </div>
      </td>
    </tr>
    ${virementBlock ? `<tr><td style="padding:0 32px;">${virementBlock}</td></tr>` : ''}
    <!-- ETA -->
    <tr>
      <td style="padding:24px 32px 0;">
        <div style="padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;display:flex;gap:10px;align-items:flex-start;">
          <span style="font-size:20px;">📦</span>
          <div>
            <strong style="color:#1e3a5f;">Expédition estimée</strong>
            <p style="margin:4px 0 0;color:#374151;font-size:13px;">${shippingMethod === 'express' ? '24h ouvrées après réception du paiement' : '3 à 5 jours ouvrés après réception du paiement'}</p>
          </div>
        </div>
      </td>
    </tr>
    <!-- Contact -->
    <tr>
      <td style="padding:24px 32px 32px;text-align:center;border-top:1px solid #e5e7eb;margin-top:24px;">
        <p style="margin:0;color:#6b7280;font-size:13px;">Une question ? Contactez-nous :</p>
        <p style="margin:4px 0 0;font-weight:700;color:#1e3a5f;">04 67 78 06 63 · Du lun. au ven. 8h–17h</p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">
          MN Fermetures · 2066 Av. Marcel Pagnol — 34470 Pérols
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.warn('[orders] GMAIL_USER ou GMAIL_APP_PASSWORD manquant — email non envoyé');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({
      from: `MN Fermetures <${gmailUser}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[orders] Gmail SMTP error:', err);
  }
}

export async function POST(req: NextRequest) {
  // Offre B2B uniquement : le tunnel de commande B2C (carte/virement) est fermé.
  // Les pros passent par /api/orders/bon-de-commande.
  if (!B2C_ENABLED) {
    return NextResponse.json(
      { error: 'La commande en ligne est réservée aux professionnels (bon de commande).' },
      { status: 403 }
    );
  }

  const payload: OrderPayload = await req.json();
  const { orderNumber, email, customerName,
    paymentMethod, shippingMethod, shippingAddress, billingAddress, paymentIntentId } = payload;

  // user_id dérivé de la session — jamais du body (anti-usurpation, cf. audit S5)
  const serverClient = createClient();
  const { data: { user: sessionUser } } = await serverClient.auth.getUser();
  const trustedUserId = sessionUser?.id ?? null;
  const trustedEmail = sessionUser?.email ?? email;

  const method: ShippingMethod = shippingMethod === 'express' ? 'express' : 'standard';

  // Re-tarification autoritaire du panier côté serveur (audit S2)
  const discounts = await getUserDiscounts(trustedUserId);
  const verified = await verifyCartLines(payload.lines, discounts, { userId: trustedUserId });

  // Détermination du montant et du statut de confiance
  let lines = payload.lines;
  let totals = { fraisHT: payload.fraisHT, totalHT: payload.totalHT, totalTTC: payload.totalTTC };
  let status: 'pending' | 'paid' = 'pending';

  if (paymentMethod === 'card') {
    // Paiement carte : le montant réellement encaissé fait foi (audit S3).
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Référence de paiement manquante.' }, { status: 400 });
    }
    let pi: Stripe.PaymentIntent;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 400 });
    }
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Paiement non confirmé.' }, { status: 402 });
    }
    status = 'paid';
    // Montant TTC = ce que Stripe a réellement encaissé (montant serveur du PaymentIntent).
    const paidTTC = pi.amount / 100;
    if (verified.ok) {
      const t = computeOrderTotals(verified.productsHT, method);
      lines = verified.lines;
      totals = { fraisHT: t.fraisHT, totalHT: t.totalHT, totalTTC: paidTTC };
    } else {
      // Filet : le charge est déjà correct (montant fixé serveur à l'intent) ;
      // on conserve l'affichage client mais on force le TTC réellement payé.
      totals = { ...totals, totalTTC: paidTTC };
    }
  } else {
    // Virement / autre : aucun encaissement → le panier DOIT être vérifiable.
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }
    const t = computeOrderTotals(verified.productsHT, method);
    lines = verified.lines;
    totals = t;
  }

  // Payload corrigé (montants/lignes autoritaires) pour la persistance ET l'email
  const finalPayload: OrderPayload = {
    ...payload,
    lines,
    totalHT: totals.totalHT,
    totalTTC: totals.totalTTC,
    fraisHT: totals.fraisHT,
  };

  // 1. Sauvegarde en base
  const supabase = createAdminClient();
  const { error } = await supabase.from('orders').insert({
    order_number: orderNumber,
    email: trustedEmail,
    customer_name: customerName,
    is_guest: !sessionUser,
    user_id: trustedUserId,
    payment_method: paymentMethod,
    shipping_method: method,
    lines,
    total_ht: totals.totalHT,
    total_ttc: totals.totalTTC,
    frais_ht: totals.fraisHT,
    shipping_address: shippingAddress,
    billing_address: billingAddress ?? shippingAddress,
    status,
  });

  if (error) {
    console.error('[orders] Supabase insert error:', error);
    // On continue quand même pour envoyer l'email et confirmer au client
  }

  // 2. Email de confirmation
  const html = buildEmailHtml(finalPayload);
  await sendEmail(
    trustedEmail,
    `Confirmation de commande ${orderNumber} — MN Fermetures`,
    html
  );

  return NextResponse.json({ orderNumber });
}
