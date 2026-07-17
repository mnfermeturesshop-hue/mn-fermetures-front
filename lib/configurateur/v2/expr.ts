/* =====================================================================
   MN FERMETURES — Moteur v2 · Évaluateur d'expressions & conditions
   Aucun `eval` : on parcourt des arbres sérialisables. Utilisé côté client
   (prix instantané) ET serveur (re-tarification). `null` se propage depuis
   les lookups hors abaque.
   ===================================================================== */

import type { Expr, Condition, Primitive, Values, Table1D, Table2D } from './types';

export interface Tables { d1?: Record<string, Table1D>; d2?: Record<string, Table2D>; }

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const num = (v: Primitive | null): number | null => {
  if (v === null) return null;
  const n = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Plus petite borne >= value (snap vers le haut). null si hors bornes. */
export function snapUp(value: number, steps: number[]): number | null {
  let best: number | null = null;
  for (const s of steps) if (s >= value && (best === null || s < best)) best = s;
  return best;
}

function lookup1d(t: Table1D | undefined, key: number | null): number | null {
  if (!t || key === null) return null;
  const k = snapUp(key, t.keys);
  if (k === null) return null;
  return t.values[t.keys.indexOf(k)] ?? null;
}
function lookup2d(t: Table2D | undefined, row: number | null, col: number | null): number | null {
  if (!t || row === null || col === null) return null;
  const r = snapUp(row, t.rows), c = snapUp(col, t.cols);
  if (r === null || c === null) return null;
  return t.cells[t.rows.indexOf(r)]?.[t.cols.indexOf(c)] ?? null;
}

/** Évalue une expression → primitive ou null (hors abaque). */
export function evalExpr(e: Expr, ctx: Values, tables: Tables = {}): Primitive | null {
  if (!isObj(e)) return e;                                 // littéral number/string/boolean
  if ('var' in e) { const v = ctx[e.var as string]; return v === undefined ? null : v; }
  const op = (e as { op: string }).op;
  const E = (x: Expr) => evalExpr(x, ctx, tables);
  const N = (x: Expr) => num(E(x));

  switch (op) {
    case '+': case '-': case '*': case '/': {
      const args = (e as { args: Expr[] }).args.map(N);
      if (args.some((a) => a === null)) return null;
      const ns = args as number[];
      if (op === '+') return ns.reduce((a, b) => a + b, 0);
      if (op === '*') return ns.reduce((a, b) => a * b, 1);
      if (op === '-') return ns.slice(1).reduce((a, b) => a - b, ns[0] ?? 0);
      return ns.slice(1).reduce((a, b) => (b === 0 ? a : a / b), ns[0] ?? 0);
    }
    case 'min': case 'max': {
      const ns = (e as { args: Expr[] }).args.map(N);
      if (ns.some((a) => a === null)) return null;
      return op === 'min' ? Math.min(...(ns as number[])) : Math.max(...(ns as number[]));
    }
    case 'neg': { const n = N((e as { arg: Expr }).arg); return n === null ? null : -n; }
    case 'round': {
      const n = N((e as { arg: Expr }).arg);
      if (n === null) return null;
      const d = (e as { decimals?: number }).decimals ?? 2;
      const f = Math.pow(10, d);
      return Math.round(n * f) / f;
    }
    case 'concat': {
      const parts = (e as { args: Expr[] }).args.map(E);
      if (parts.some((p) => p === null)) return null;
      return parts.map(String).join('');
    }
    case 'snap': {
      const v = N((e as { value: Expr }).value);
      if (v === null) return null;
      return snapUp(v, (e as { steps: number[] }).steps);
    }
    case 'lookup1d': {
      const id = E((e as { table: Expr }).table);
      return lookup1d(tables.d1?.[String(id)], N((e as { key: Expr }).key));
    }
    case 'lookup2d': {
      const id = E((e as { table: Expr }).table);
      return lookup2d(tables.d2?.[String(id)], N((e as { row: Expr }).row), N((e as { col: Expr }).col));
    }
    case 'if': {
      const c = e as { cond: Condition; then: Expr; else: Expr };
      return evalCond(c.cond, ctx, tables) ? E(c.then) : E(c.else);
    }
    default:
      return null;
  }
}

/** Évalue une condition → booléen. */
export function evalCond(c: Condition, ctx: Values, tables: Tables = {}): boolean {
  if (typeof c === 'boolean') return c;
  if ('all' in c) return c.all.every((x) => evalCond(x, ctx, tables));
  if ('any' in c) return c.any.some((x) => evalCond(x, ctx, tables));
  if ('not' in c) return !evalCond(c.not, ctx, tables);
  const op = (c as { op: string }).op;
  if (op === 'in' || op === 'nin') {
    const cc = c as { value: Expr; set: Primitive[] };
    const v = evalExpr(cc.value, ctx, tables);
    const inSet = v !== null && cc.set.includes(v);
    return op === 'in' ? inSet : !inSet;
  }
  const cc = c as { left: Expr; right: Expr };
  const l = evalExpr(cc.left, ctx, tables);
  const r = evalExpr(cc.right, ctx, tables);
  if (op === 'eq') return l === r;
  if (op === 'ne') return l !== r;
  const ln = num(l), rn = num(r);
  if (ln === null || rn === null) return false;
  switch (op) {
    case 'lt': return ln < rn;
    case 'lte': return ln <= rn;
    case 'gt': return ln > rn;
    case 'gte': return ln >= rn;
    default: return false;
  }
}
