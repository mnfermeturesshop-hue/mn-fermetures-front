'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/lib/catalog/types';

export interface Address {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  postalCode: string;
  city: string;
  phone: string;
}

export type ShippingMethod = 'standard' | 'express';
export type PaymentMethod  = 'card' | 'virement';

export interface PlacedOrder {
  id: string;
  date: string;
  lines: CartLine[];
  totalHT: number;
  totalTTC: number;
  fraisHT: number;
  shippingAddress: Address;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
}

export interface PendingOrderPayload {
  orderNumber: string;
  email: string;
  customerName: string;
  isGuest: boolean;
  userId?: string;
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  lines: CartLine[];
  totalHT: number;
  totalTTC: number;
  fraisHT: number;
  shippingAddress: Address;
  billingAddress: Address;
}

const SHIPPING_PRICE: Record<ShippingMethod, number> = {
  standard: 26,   // 0 si franco
  express: 42,
};

export function shippingCostHT(method: ShippingMethod, isFranco: boolean): number {
  if (method === 'standard' && isFranco) return 0;
  return SHIPPING_PRICE[method];
}

const BLANK_ADDR: Address = {
  firstName: '', lastName: '', company: '',
  address1: '', address2: '', postalCode: '', city: '', phone: '',
};

interface CheckoutStore {
  step: 1 | 2 | 3;
  guestEmail: string;
  guestMode: boolean;
  shippingAddress: Address;
  billingAddress: Address;
  sameAsBilling: boolean;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  placedOrder: PlacedOrder | null;
  pendingOrderPayload: PendingOrderPayload | null;

  setPendingOrderPayload: (p: PendingOrderPayload | null) => void;
  setStep: (s: 1 | 2 | 3) => void;
  setGuestEmail: (email: string) => void;
  setGuestMode: (v: boolean) => void;
  setShippingAddress: (a: Address) => void;
  setBillingAddress: (a: Address) => void;
  setSameAsBilling: (v: boolean) => void;
  setShippingMethod: (m: ShippingMethod) => void;
  setPaymentMethod: (m: PaymentMethod) => void;

  placeOrder: (payload: {
    lines: CartLine[];
    totalHT: number;
    totalTTC: number;
    isFranco: boolean;
  }) => string;

  reset: () => void;
}

function genOrderId(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `CMD-${year}-${num}`;
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set, get) => ({
      step: 1,
      guestEmail: '',
      guestMode: false,
      shippingAddress: { ...BLANK_ADDR },
      billingAddress:  { ...BLANK_ADDR },
      sameAsBilling: true,
      shippingMethod: 'standard',
      paymentMethod: 'card',
      placedOrder: null,
      pendingOrderPayload: null,

      setPendingOrderPayload: (p) => set({ pendingOrderPayload: p }),
      setStep: (s) => set({ step: s }),
      setGuestEmail: (email) => set({ guestEmail: email }),
      setGuestMode: (v) => set({ guestMode: v }),
      setShippingAddress: (a) => set({ shippingAddress: a }),
      setBillingAddress: (a) => set({ billingAddress: a }),
      setSameAsBilling: (v) => set({ sameAsBilling: v }),
      setShippingMethod: (m) => set({ shippingMethod: m }),
      setPaymentMethod: (m) => set({ paymentMethod: m }),

      placeOrder: ({ lines, totalHT, totalTTC, isFranco }) => {
        const { shippingAddress, shippingMethod, paymentMethod } = get();
        const fraisHT = shippingCostHT(shippingMethod, isFranco);
        const id = genOrderId();
        const order: PlacedOrder = {
          id,
          date: new Date().toLocaleDateString('fr-FR'),
          lines,
          totalHT,
          totalTTC,
          fraisHT,
          shippingAddress,
          shippingMethod,
          paymentMethod,
        };
        set({ placedOrder: order, step: 1 });
        return id;
      },

      reset: () => set({
        step: 1,
        guestEmail: '',
        guestMode: false,
        shippingAddress: { ...BLANK_ADDR },
        billingAddress: { ...BLANK_ADDR },
        sameAsBilling: true,
        shippingMethod: 'standard',
        paymentMethod: 'card',
      }),
    }),
    {
      name: 'mm-checkout',
      partialize: (s) => ({ placedOrder: s.placedOrder, pendingOrderPayload: s.pendingOrderPayload }),
    }
  )
);
