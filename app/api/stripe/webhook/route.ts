import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe a besoin du corps BRUT pour vérifier la signature.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET manquant');
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe/webhook] Signature invalide:', msg);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderNumber = pi.metadata?.orderNumber;
    if (orderNumber) {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('order_number', orderNumber);
      if (error) console.error('[stripe/webhook] update order error:', error.message);
    }
  }

  return NextResponse.json({ received: true });
}
