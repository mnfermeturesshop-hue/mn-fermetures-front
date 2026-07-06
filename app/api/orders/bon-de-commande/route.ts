import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { verifyCartLines } from '@/lib/catalog/verifyCart';
import { getUserDiscounts } from '@/lib/pricing/discounts';
import { computeOrderTotals, type ShippingMethod } from '@/lib/pricing/shipping';
import { escapeHtml } from '@/lib/security/escapeHtml';

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

interface BonDeCommandePayload {
  orderNumber: string;
  email: string;
  customerName: string;
  company: string;
  userId?: string;
  shippingMethod: 'standard' | 'express';
  lines: OrderLine[];
  totalHT: number;
  totalTTC: number;
  fraisHT: number;
  shippingAddress: Address;
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function linesTable(lines: OrderLine[]): string {
  const rows = lines.map((l) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#1e3a5f;">${escapeHtml(l.name)}</div>
        ${l.reference ? `<div style="font-size:12px;color:#6b7280;font-family:monospace;">${escapeHtml(l.reference)}</div>` : ''}
        ${l.detail ? `<div style="font-size:12px;color:#6b7280;">${escapeHtml(l.detail)}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${l.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${euro(l.unitPriceHT)} HT</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${euro(l.unitPriceHT * l.quantity)} HT</td>
    </tr>
  `).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">DÉSIGNATION</th>
          <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;">QTÉ</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">P.U. HT</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600;">TOTAL HT</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function addrBlock(addr: Address): string {
  return `
    <div style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;line-height:1.7;">
      <strong>${escapeHtml(addr.firstName)} ${escapeHtml(addr.lastName)}</strong><br>
      ${addr.company ? escapeHtml(addr.company) + '<br>' : ''}
      ${escapeHtml(addr.address1)}<br>
      ${addr.address2 ? escapeHtml(addr.address2) + '<br>' : ''}
      ${escapeHtml(addr.postalCode)} ${escapeHtml(addr.city)}<br>
      ${escapeHtml(addr.phone)}
    </div>
  `;
}

function totalsBlock(p: BonDeCommandePayload): string {
  const prodHT = p.totalHT - p.fraisHT;
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin-top:12px;">
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Sous-total HT</td>
        <td style="padding:6px 0;text-align:right;font-weight:600;">${euro(prodHT)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Frais de livraison HT (${p.shippingMethod === 'express' ? 'Express 24h' : 'Standard'})</td>
        <td style="padding:6px 0;text-align:right;font-weight:600;">${p.fraisHT === 0 ? '<span style="color:#16a34a">Offerts</span>' : euro(p.fraisHT)}</td>
      </tr>
      <tr style="border-top:2px solid #e5e7eb;">
        <td style="padding:10px 0 4px;font-weight:700;color:#1e3a5f;">Total HT</td>
        <td style="padding:10px 0 4px;text-align:right;font-weight:700;color:#1e3a5f;">${euro(p.totalHT)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#6b7280;font-size:13px;">TVA 20%</td>
        <td style="padding:4px 0;text-align:right;color:#6b7280;font-size:13px;">${euro(p.totalTTC - p.totalHT)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-weight:800;font-size:16px;color:#1e3a5f;">Total TTC</td>
        <td style="padding:4px 0;text-align:right;font-weight:800;font-size:16px;color:#1e3a5f;">${euro(p.totalTTC)}</td>
      </tr>
    </table>
  `;
}

function buildHqEmail(p: BonDeCommandePayload): string {
  const { orderNumber, customerName, company, email, shippingAddress, shippingMethod } = p;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <tr>
      <td style="background:#1e3a5f;padding:24px 32px;">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:800;letter-spacing:.04em;">MN FERMETURES</p>
        <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Nouveau bon de commande à traiter</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px 0;">
        <div style="display:inline-block;padding:8px 18px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-weight:700;color:#92400e;font-size:13px;margin-bottom:20px;">
          📋 BON DE COMMANDE
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;color:#1e3a5f;">${orderNumber}</h1>
        <p style="margin:0;color:#6b7280;font-size:14px;">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 0;">
        <h2 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Client</h2>
        <div style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;line-height:1.7;">
          <strong>${escapeHtml(customerName)}</strong>${company ? ` — ${escapeHtml(company)}` : ''}<br>
          <a href="mailto:${encodeURIComponent(email)}" style="color:#1e3a5f;">${escapeHtml(email)}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 0;">
        <h2 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Articles commandés</h2>
        ${linesTable(p.lines)}
        ${totalsBlock(p)}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 0;">
        <h2 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Adresse de livraison</h2>
        ${addrBlock(shippingAddress)}
        <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Mode : <strong>${shippingMethod === 'express' ? 'Express 24h' : 'Standard 3–5 jours ouvrés'}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;border-top:1px solid #e5e7eb;margin-top:24px;text-align:center;">
        <p style="margin:0;color:#6b7280;font-size:12px;">Bon de commande reçu via l'espace professionnel mn-fermetures.fr</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildCustomerEmail(p: BonDeCommandePayload): string {
  const { orderNumber, customerName } = p;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <tr>
      <td style="background:#1e3a5f;padding:28px 32px;text-align:center;">
        <p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:.04em;">MN FERMETURES</p>
        <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Volets roulants · Motorisations · Pièces détachées</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#dcfce7;line-height:56px;font-size:28px;margin-bottom:16px;">✓</div>
        <h1 style="margin:0 0 8px;font-size:22px;color:#1e3a5f;">Bon de commande transmis !</h1>
        <p style="margin:0;color:#6b7280;font-size:14px;">Merci ${escapeHtml(customerName)}, votre bon de commande a bien été reçu.</p>
        <div style="margin:16px auto;display:inline-block;padding:8px 20px;background:#f0f4f8;border-radius:6px;font-family:monospace;font-weight:700;color:#1e3a5f;font-size:16px;">
          N° ${orderNumber}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 0;">
        <div style="padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
          <p style="margin:0 0 8px;font-weight:700;color:#1e3a5f;">📋 Prochaines étapes</p>
          <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
            Notre équipe commerciale traite votre bon de commande et vous contactera sous <strong>24h ouvrées</strong>
            pour confirmer la disponibilité des articles et convenir des modalités de livraison.
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 0;">
        <h2 style="margin:0 0 12px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Récapitulatif</h2>
        ${linesTable(p.lines)}
        ${totalsBlock(p)}
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 0;">
        <h2 style="margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Adresse de livraison</h2>
        ${addrBlock(p.shippingAddress)}
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 32px;text-align:center;border-top:1px solid #e5e7eb;margin-top:24px;">
        <p style="margin:0;color:#6b7280;font-size:13px;">Une question ? Contactez-nous :</p>
        <p style="margin:4px 0 0;font-weight:700;color:#1e3a5f;">04 67 78 06 63 · Du lun. au ven. 8h–17h</p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">MN Fermetures · 2066 Av. Marcel Pagnol — 34470 Pérols</p>
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
    console.warn('[bon-de-commande] GMAIL_USER ou GMAIL_APP_PASSWORD manquant — email non envoyé');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({ from: `MN Fermetures <${gmailUser}>`, to, subject, html });
  } catch (err) {
    console.error('[bon-de-commande] Gmail SMTP error:', err);
  }
}

export async function POST(req: NextRequest) {
  const payload: BonDeCommandePayload = await req.json();
  const { orderNumber, email, customerName, shippingMethod, shippingAddress } = payload;

  // Le bon de commande est réservé aux pros connectés — user_id issu de la session (audit S5)
  const serverClient = createClient();
  const { data: { user: sessionUser } } = await serverClient.auth.getUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Re-tarification autoritaire (audit S2) — remises pro lues en base, pas du client.
  const method: ShippingMethod = shippingMethod === 'express' ? 'express' : 'standard';
  const discounts = await getUserDiscounts(sessionUser.id);
  const verified = await verifyCartLines(payload.lines, discounts, { userId: sessionUser.id });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }
  const totals = computeOrderTotals(verified.productsHT, method);

  // Payload corrigé (lignes + totaux serveur) pour persistance ET emails
  const finalPayload: BonDeCommandePayload = {
    ...payload,
    lines: verified.lines,
    totalHT: totals.totalHT,
    totalTTC: totals.totalTTC,
    fraisHT: totals.fraisHT,
  };

  // 1. Sauvegarde en base
  const supabase = createAdminClient();
  const { error } = await supabase.from('orders').insert({
    order_number:     orderNumber,
    email:            sessionUser.email ?? email,
    customer_name:    customerName,
    is_guest:         false,
    user_id:          sessionUser.id,
    payment_method:   'bon_de_commande',
    shipping_method:  method,
    lines:            verified.lines,
    total_ht:         totals.totalHT,
    total_ttc:        totals.totalTTC,
    frais_ht:         totals.fraisHT,
    shipping_address: shippingAddress,
    billing_address:  shippingAddress,
    status:           'pending',
  });

  if (error) console.error('[bon-de-commande] Supabase insert error:', error);

  const hqEmail = process.env.CONTACT_BC_EMAIL ?? 'moideparisest@gmail.com';

  // 2. Email interne → équipe MN Fermetures
  await sendEmail(
    hqEmail,
    `📋 Bon de commande ${orderNumber} — ${payload.company || customerName}`,
    buildHqEmail(finalPayload),
  );

  // 3. Email de confirmation → client pro
  await sendEmail(
    email,
    `Votre bon de commande ${orderNumber} — MN Fermetures`,
    buildCustomerEmail(finalPayload),
  );

  return NextResponse.json({ orderNumber });
}
