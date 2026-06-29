import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { amountTTC, orderNumber, email } = await req.json() as {
    amountTTC: number;
    orderNumber: string;
    email: string;
  };

  if (!amountTTC || amountTTC <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountTTC * 100), // centimes
    currency: 'eur',
    metadata: { orderNumber, email },
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
