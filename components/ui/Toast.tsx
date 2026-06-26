'use client';

import { create } from 'zustand';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Appel rapide depuis n'importe quel composant client. */
export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error: (msg: string) => useToastStore.getState().add(msg, 'error'),
  info: (msg: string) => useToastStore.getState().add(msg, 'info'),
};

function ToastItem({ t, remove }: { t: Toast; remove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => remove(t.id), 3500);
    return () => clearTimeout(timer);
  }, [t.id, remove]);

  return (
    <div className={`toast toast-${t.type}`} role="alert">
      <span>{t.message}</span>
      <button type="button" onClick={() => remove(t.id)} aria-label="Fermer">✕</button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} remove={remove} />
      ))}
    </div>
  );
}
