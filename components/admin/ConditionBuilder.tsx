'use client';

/* Constructeur de conditions visuel (Phase 3.2) — édite un arbre `Condition`
   du moteur v2 sous forme de groupes ET/OU + comparaisons (champ · opérateur ·
   valeur). Réutilisable : visibleWhen des champs, `when` des règles, contraintes.
   Reste sérialisable et 100 % compatible `evalCond` (aucun eval). */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cond = any;
export interface VarInfo { id: string; label: string; type?: string; options?: { value: string; label: string }[] }

const OPS = [
  { v: 'eq', l: '=' }, { v: 'ne', l: '≠' },
  { v: 'lt', l: '<' }, { v: 'lte', l: '≤' }, { v: 'gt', l: '>' }, { v: 'gte', l: '≥' },
  { v: 'in', l: 'parmi' }, { v: 'nin', l: 'hors' },
];
const sel: React.CSSProperties = { padding: '4px 6px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12.5 };
const isGroup = (c: Cond) => c && (Array.isArray(c.all) || Array.isArray(c.any));
const varOf = (n: Cond) => n?.left?.var ?? n?.value?.var ?? '';

function coerce(v: string, type?: string): string | number | boolean {
  if (type === 'dimension' || type === 'number') { const n = Number(v); return Number.isFinite(n) ? n : v; }
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function LeafRow({ node, onChange, vars }: { node: Cond; onChange: (n: Cond) => void; vars: VarInfo[] }) {
  const vid = varOf(node);
  const info = vars.find((v) => v.id === vid);
  const op: string = node.op;
  const isSet = op === 'in' || op === 'nin';

  const reshape = (newOp: string, newVid: string, vinfo?: VarInfo) => {
    if (newOp === 'in' || newOp === 'nin') {
      const set = Array.isArray(node.set) ? node.set : (node.right != null ? [node.right] : []);
      return { op: newOp, value: { var: newVid }, set };
    }
    const right = node.right ?? (Array.isArray(node.set) ? node.set[0] : undefined) ?? vinfo?.options?.[0]?.value ?? '';
    return { op: newOp, left: { var: newVid }, right };
  };

  const numeric = op === 'lt' || op === 'lte' || op === 'gt' || op === 'gte';

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select style={sel} value={vid} onChange={(e) => onChange(reshape(op, e.target.value, vars.find((v) => v.id === e.target.value)))}>
        {!vars.some((v) => v.id === vid) && vid && <option value={vid}>{vid}</option>}
        {vars.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <select style={sel} value={op} onChange={(e) => onChange(reshape(e.target.value, vid, info))}>
        {OPS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      {isSet ? (
        info?.type === 'choice' && info.options ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {info.options.map((o) => {
              const checked = (node.set ?? []).includes(o.value);
              return (
                <label key={o.value} style={{ fontSize: 12, display: 'inline-flex', gap: 3, alignItems: 'center', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked} onChange={() => onChange({ ...node, set: checked ? node.set.filter((x: string) => x !== o.value) : [...(node.set ?? []), o.value] })} />
                  {o.label}
                </label>
              );
            })}
          </div>
        ) : (
          <input style={{ ...sel, minWidth: 160 }} placeholder="valeurs séparées par des virgules"
            value={(node.set ?? []).join(', ')}
            onChange={(e) => onChange({ ...node, set: e.target.value.split(',').map((s) => coerce(s.trim(), info?.type)).filter((s) => s !== '') })} />
        )
      ) : info?.type === 'choice' && info.options && !numeric ? (
        <select style={sel} value={String(node.right ?? '')} onChange={(e) => onChange({ ...node, right: e.target.value })}>
          {info.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : info?.type === 'boolean' && !numeric ? (
        <select style={sel} value={String(node.right ?? '')} onChange={(e) => onChange({ ...node, right: e.target.value === 'true' })}>
          <option value="true">oui</option><option value="false">non</option>
        </select>
      ) : (
        <input style={{ ...sel, width: 110 }} type={numeric ? 'number' : 'text'} value={String(node.right ?? '')}
          onChange={(e) => onChange({ ...node, right: coerce(e.target.value, numeric ? 'number' : info?.type) })} />
      )}
    </div>
  );
}

export function ConditionBuilder({ value, onChange, vars }: { value: Cond; onChange: (c: Cond) => void; vars: VarInfo[] }) {
  const newLeaf = (): Cond => ({ op: 'eq', left: { var: vars[0]?.id ?? '' }, right: vars[0]?.options?.[0]?.value ?? '' });

  if (value === undefined || value === true) {
    return <button type="button" className="btn ghost sm" onClick={() => onChange({ all: [newLeaf()] })}>+ Condition</button>;
  }
  const grp = isGroup(value) ? value : { all: [value] };
  const conn: 'all' | 'any' = Array.isArray(grp.all) ? 'all' : 'any';
  const children: Cond[] = grp[conn];
  const setChildren = (ch: Cond[]) => onChange(ch.length === 0 ? undefined : { [conn]: ch });
  const updChild = (i: number, nc: Cond) => setChildren(children.map((x, j) => (j === i ? nc : x)));

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 8, background: '#fafbfc' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <select style={sel} value={conn} onChange={(e) => onChange({ [e.target.value]: children })}>
          <option value="all">TOUTES (ET)</option>
          <option value="any">AU MOINS UNE (OU)</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>des conditions :</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 10, borderLeft: '2px solid var(--line)' }}>
        {children.map((ch, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {isGroup(ch)
                ? <ConditionBuilder value={ch} onChange={(nc) => updChild(i, nc)} vars={vars} />
                : <LeafRow node={ch} onChange={(nc) => updChild(i, nc)} vars={vars} />}
            </div>
            <button type="button" className="btn ghost sm" onClick={() => setChildren(children.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn ghost sm" onClick={() => setChildren([...children, newLeaf()])}>+ condition</button>
          <button type="button" className="btn ghost sm" onClick={() => setChildren([...children, { all: [newLeaf()] }])}>+ sous-groupe</button>
        </div>
      </div>
    </div>
  );
}
