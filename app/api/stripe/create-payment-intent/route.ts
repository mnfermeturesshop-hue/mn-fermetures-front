import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { verifyCartLines } from '@/lib/catalog/verifyCart';
import { getUserDiscounts } from '@/lib/pricing/discounts';
import { computeOrderTotals, type ShippingMethod } from '@/lib/pricing/shipping';
import { rateLimit, clientIp } from '@/lib/security/rateLimit';
import { B2C_ENABLED } from '@/lib/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  // Offre B2B uniquement : le paiement CB (parcours B2C) est fermé.
  if (!B2C_ENABLED) {
    return NextResponse.json(
      { error: 'Le paiement en ligne est réservé au parcours professionnel.' },
      { status: 403 }
    );
  }

  if (!rateLimit(`payment-intent:${clientIp(req)}`, 15, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes. Patientez un instant.' }, { status: 429 });
  }

  const { lines, shippingMethod, orderNumber, email } = await req.json() as {
    lines: unknown;
    shippingMethod: ShippingMethod;
    orderNumber: string;
    email?: string;
  };

  if (typeof orderNumber !== 'string' || !orderNumber) {
    return NextResponse.json({ error: 'Commande invalide.' }, { status: 400 });
  }

  // Le MONTANT est recalculé côté serveur (audit S2) — jamais reçu du client.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const discounts = await getUserDiscounts(user?.id ?? null);
  const verified = await verifyCartLines(lines, discounts, { userId: user?.id ?? null });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  const method: ShippingMethod = shippingMethod === 'express' ? 'express' : 'standard';
  const { totalTTC } = computeOrderTotals(verified.productsHT, method);
  if (totalTTC <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalTTC * 100), // centimes — montant autoritaire serveur
    currency: 'eur',
    metadata: { orderNumber, email: user?.email ?? email ?? '' },
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, amountTTC: totalTTC });
}
