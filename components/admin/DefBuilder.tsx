'use client';

import { ConditionBuilder, type VarInfo } from './ConditionBuilder';

/* Éditeur structuré (assistant) d'une définition de configurateur — Phase 3.1.
   Gère Meta + Champs (+ options) + Étapes par formulaires. Les règles de prix,
   conditions et formules restent en mode JSON (constructeurs visuels : 3.2/3.3).
   Édite un objet def « souple » (JSON dynamique) et remonte via onChange. */

type Primitive = string | number | boolean;
interface Opt { value: string; label: string; hex?: string; hint?: string }
interface Fld { id: string; label: string; type: string; unit?: string; default?: Primitive; help?: string; options?: Opt[]; role?: string; [k: string]: unknown }
interface Stp { id: string; title: string; help?: string; fields: string[]; [k: string]: unknown }
interface Rule { code: string; label: string; kind: string; when?: unknown; amount: unknown; [k: string]: unknown }
export interface DefObj { slug: string; name: string; famille: string; fields: Fld[]; steps?: Stp[]; [k: string]: unknown }

const TYPES = ['choice', 'dimension', 'number', 'boolean', 'text', 'info'];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Amt = any;
function amtMode(a: Amt): 'fixe' | 'm2' | 'table2d' | 'table1d' | 'json' {
  if (typeof a === 'number') return 'fixe';
  if (a && a.op === 'lookup2d') return 'table2d';
  if (a && a.op === 'lookup1d') return 'table1d';
  if (a && a.op === 'round' && a.arg?.op === '*' && (a.arg.args ?? []).some((x: Amt) => x?.var === 'surface_m2')) return 'm2';
  return 'json';
}
const m2Rate = (a: Amt): number => ((a?.arg?.args ?? []).find((x: Amt) => typeof x === 'number') ?? 0);
const tableSelVal = (t: Amt): string => (t && t.var ? `var:${t.var}` : String(t ?? ''));
const tableSelSet = (v: string): Amt => (v.startsWith('var:') ? { var: v.slice(4) } : v);

/** Éditeur de montant d'une règle : fixe / au m² / table 2D / table 1D / avancé. */
function AmountEditor({ value, onChange, d2ids, d1ids, vars }: { value: Amt; onChange: (a: Amt) => void; d2ids: string[]; d1ids: string[]; vars: VarInfo[] }) {
  const mode = amtMode(value);
  const s: React.CSSProperties = { padding: '4px 6px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12.5 };
  const v0 = vars[0]?.id ?? '';
  const setMode = (m: string) => {
    if (m === 'fixe') onChange(0);
    else if (m === 'm2') onChange({ op: 'round', arg: { op: '*', args: [{ var: 'surface_m2' }, 0] } });
    else if (m === 'table2d') onChange({ op: 'lookup2d', table: d2ids[0] ?? { var: 'grid' }, row: { var: v0 }, col: { var: v0 } });
    else if (m === 'table1d') onChange({ op: 'lookup1d', table: d1ids[0] ?? '', key: { var: v0 } });
    else onChange(value ?? 0);
  };
  const varSel = (val: string, on: (v: string) => void) => (
    <select style={s} value={val} onChange={(e) => on(e.target.value)}>
      {!vars.some((x) => x.id === val) && val && <option value={val}>{val}</option>}
      {vars.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
    </select>
  );
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select style={s} value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="fixe">Montant fixe</option>
        <option value="m2">Au m² (surface × €/m²)</option>
        <option value="table2d">Table 2D (grille L×H)</option>
        <option value="table1d">Table 1D (barème largeur)</option>
        <option value="json">Avancé (JSON)</option>
      </select>
      {mode === 'fixe' && <><input style={{ ...s, width: 90 }} type="number" value={Number(value) || 0} onChange={(e) => onChange(Number(e.target.value) || 0)} /> €</>}
      {mode === 'm2' && <><input style={{ ...s, width: 80 }} type="number" value={m2Rate(value)} onChange={(e) => onChange({ op: 'round', arg: { op: '*', args: [{ var: 'surface_m2' }, Number(e.target.value) || 0] } })} /> €/m²</>}
      {mode === 'table2d' && <>
        <span style={{ fontSize: 12 }}>table</span>
        <select style={s} value={tableSelVal(value.table)} onChange={(e) => onChange({ ...value, table: tableSelSet(e.target.value) })}>
          <option value="var:grid">▸ variable « grid »</option>
          {d2ids.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <span style={{ fontSize: 12 }}>ligne</span>{varSel(value.row?.var ?? '', (v) => onChange({ ...value, row: { var: v } }))}
        <span style={{ fontSize: 12 }}>col</span>{varSel(value.col?.var ?? '', (v) => onChange({ ...value, col: { var: v } }))}
      </>}
      {mode === 'table1d' && <>
        <span style={{ fontSize: 12 }}>table</span>
        <select style={s} value={String(value.table ?? '')} onChange={(e) => onChange({ ...value, table: e.target.value })}>
          {d1ids.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <span style={{ fontSize: 12 }}>clé</span>{varSel(value.key?.var ?? '', (v) => onChange({ ...value, key: { var: v } }))}
      </>}
      {mode === 'json' && <input style={{ ...s, flex: 1, minWidth: 200, fontFamily: 'monospace' }} value={JSON.stringify(value)}
        onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { /* saisie en cours */ } }} />}
    </div>
  );
}

/** Toutes les variables utilisables dans les conditions : champs + variables
 *  dérivées + toute variable déjà référencée dans la def (ex. pose, mode). */
function collectVarNames(obj: unknown, acc: Set<string>): void {
  if (Array.isArray(obj)) { obj.forEach((x) => collectVarNames(x, acc)); return; }
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>;
    if (typeof o.var === 'string') acc.add(o.var);
    for (const k of Object.keys(o)) collectVarNames(o[k], acc);
  }
}
const inp: React.CSSProperties = { padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13 };
const lbl: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 2 };

export function DefBuilder({ value, onChange }: { value: DefObj; onChange: (d: DefObj) => void }) {
  const d = value;
  const set = (patch: Partial<DefObj>) => onChange({ ...d, ...patch });
  const theme = (d.theme as { primary?: string; logo?: string }) ?? {};
  const setTheme = (patch: { primary?: string; logo?: string }) => set({ theme: { ...theme, ...patch } });
  const fields = d.fields ?? [];
  const steps = d.steps ?? [];

  const setFields = (f: Fld[]) => set({ fields: f });
  const updField = (i: number, patch: Partial<Fld>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const addField = () => setFields([...fields, { id: `champ_${fields.length + 1}`, label: 'Nouveau champ', type: 'choice', options: [] }]);
  const delField = (i: number) => setFields(fields.filter((_, j) => j !== i));
  const moveField = (i: number, dir: number) => { const a = [...fields]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setFields(a); };
  const opts = (fi: number) => fields[fi].options ?? [];
  const updOpt = (fi: number, oi: number, patch: Partial<Opt>) => updField(fi, { options: opts(fi).map((o, j) => (j === oi ? { ...o, ...patch } : o)) });
  const addOpt = (fi: number) => updField(fi, { options: [...opts(fi), { value: '', label: '' }] });
  const delOpt = (fi: number, oi: number) => updField(fi, { options: opts(fi).filter((_, j) => j !== oi) });

  const setSteps = (s: Stp[]) => set({ steps: s });
  const updStep = (i: number, patch: Partial<Stp>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addStep = () => setSteps([...steps, { id: `etape_${steps.length + 1}`, title: 'Nouvelle étape', fields: [] }]);
  const delStep = (i: number) => setSteps(steps.filter((_, j) => j !== i));
  const moveStep = (i: number, dir: number) => { const a = [...steps]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setSteps(a); };
  const toggleStepField = (si: number, fid: string) => { const s = steps[si]; const has = s.fields.includes(fid); updStep(si, { fields: has ? s.fields.filter((x) => x !== fid) : [...s.fields, fid] }); };

  // Variables disponibles pour les conditions (champs + dérivées + pose/mode…).
  const varNames = new Set<string>();
  collectVarNames(d, varNames);
  const varInfos: VarInfo[] = [
    ...fields.map((f) => ({ id: f.id, label: f.label, type: f.type, options: f.type === 'choice' ? (f.options ?? []).map((o) => ({ value: o.value, label: o.label })) : undefined })),
    ...[...varNames].filter((n) => !fields.some((f) => f.id === n)).map((n) => ({ id: n, label: n })),
  ];

  const rules = (d.priceRules as Rule[]) ?? [];
  const setRules = (r: Rule[]) => set({ priceRules: r });
  const updRule = (i: number, patch: Partial<Rule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRule = () => setRules([...rules, { code: `regle_${rules.length + 1}`, label: 'Nouvelle règle', kind: 'add', amount: 0 }]);
  const delRule = (i: number) => setRules(rules.filter((_, j) => j !== i));
  const moveRule = (i: number, dir: number) => { const a = [...rules]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setRules(a); };
  const d2ids = Object.keys((d.tables as { d2?: Record<string, unknown> })?.d2 ?? {});
  const d1ids = Object.keys((d.tables as { d1?: Record<string, unknown> })?.d1 ?? {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Meta */}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>Général</h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label style={lbl}>Nom</label><input style={inp} value={d.name ?? ''} onChange={(e) => set({ name: e.target.value })} /></div>
          <div><label style={lbl}>Identifiant (slug)</label><input style={inp} value={d.slug ?? ''} onChange={(e) => set({ slug: e.target.value })} /></div>
          <div><label style={lbl}>Famille (remise B2B)</label><input style={inp} value={d.famille ?? ''} onChange={(e) => set({ famille: e.target.value })} /></div>
          <div><label style={lbl}>Couleur d&apos;accent</label>
            <input type="color" value={theme.primary ?? '#3d5a80'} onChange={(e) => setTheme({ primary: e.target.value })} style={{ width: 44, height: 30, border: '1px solid var(--line)', borderRadius: 6, padding: 0 }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}><label style={lbl}>Logo (URL, facultatif)</label><input style={{ ...inp, width: '100%' }} value={theme.logo ?? ''} onChange={(e) => setTheme({ logo: e.target.value })} /></div>
        </div>
      </section>

      {/* Champs */}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>Champs ({fields.length})</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fields.map((f, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div><label style={lbl}>id</label><input style={{ ...inp, width: 120 }} value={f.id} onChange={(e) => updField(i, { id: e.target.value })} /></div>
                <div style={{ flex: 1, minWidth: 140 }}><label style={lbl}>Libellé</label><input style={{ ...inp, width: '100%' }} value={f.label} onChange={(e) => updField(i, { label: e.target.value })} /></div>
                <div><label style={lbl}>Type</label>
                  <select style={inp} value={f.type} onChange={(e) => updField(i, { type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {(f.type === 'dimension' || f.type === 'number') && (
                  <div><label style={lbl}>Unité</label><input style={{ ...inp, width: 60 }} value={f.unit ?? ''} onChange={(e) => updField(i, { unit: e.target.value })} /></div>
                )}
                <div><label style={lbl}>Défaut</label>
                  {f.type === 'boolean'
                    ? <select style={inp} value={String(f.default ?? '')} onChange={(e) => updField(i, { default: e.target.value === 'true' })}><option value="">—</option><option value="true">oui</option><option value="false">non</option></select>
                    : <input style={{ ...inp, width: 90 }} value={f.default === undefined ? '' : String(f.default)}
                        onChange={(e) => { const v = e.target.value; updField(i, { default: (f.type === 'dimension' || f.type === 'number') ? (v === '' ? undefined : Number(v)) : v }); }} />}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="btn ghost sm" onClick={() => moveField(i, -1)}>↑</button>
                  <button type="button" className="btn ghost sm" onClick={() => moveField(i, 1)}>↓</button>
                  <button type="button" className="btn ghost sm" onClick={() => delField(i)}>✕</button>
                </div>
              </div>
              <div style={{ marginTop: 6 }}><label style={lbl}>Aide (facultatif)</label><input style={{ ...inp, width: '100%' }} value={f.help ?? ''} onChange={(e) => updField(i, { help: e.target.value })} /></div>

              <div style={{ marginTop: 8 }}>
                <label style={lbl}>Affiché si (facultatif)</label>
                <ConditionBuilder value={f.visibleWhen} onChange={(c) => updField(i, { visibleWhen: c })} vars={varInfos} />
              </div>

              {f.type === 'choice' && (
                <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--line)' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Options</div>
                  {opts(i).map((o, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                      <input style={{ ...inp, width: 110 }} placeholder="valeur" value={o.value} onChange={(e) => updOpt(i, oi, { value: e.target.value })} />
                      <input style={{ ...inp, flex: 1 }} placeholder="libellé" value={o.label} onChange={(e) => updOpt(i, oi, { label: e.target.value })} />
                      <input style={{ ...inp, width: 84 }} placeholder="#hex" value={o.hex ?? ''} onChange={(e) => updOpt(i, oi, { hex: e.target.value || undefined })} />
                      {o.hex && <span style={{ width: 18, height: 18, borderRadius: 4, background: o.hex, border: '1px solid var(--line)' }} />}
                      <button type="button" className="btn ghost sm" onClick={() => delOpt(i, oi)}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn ghost sm" onClick={() => addOpt(i)}>+ Option</button>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={addField}>+ Ajouter un champ</button>
        </div>
      </section>

      {/* Étapes */}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>Étapes de l&apos;assistant ({steps.length})</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}><label style={lbl}>Titre</label><input style={{ ...inp, width: '100%' }} value={s.title} onChange={(e) => updStep(i, { title: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="btn ghost sm" onClick={() => moveStep(i, -1)}>↑</button>
                  <button type="button" className="btn ghost sm" onClick={() => moveStep(i, 1)}>↓</button>
                  <button type="button" className="btn ghost sm" onClick={() => delStep(i)}>✕</button>
                </div>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {fields.map((f) => (
                  <label key={f.id} style={{ fontSize: 12, display: 'inline-flex', gap: 4, alignItems: 'center', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 7px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={s.fields.includes(f.id)} onChange={() => toggleStepField(i, f.id)} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={addStep}>+ Ajouter une étape</button>
        </div>
      </section>

      {/* Règles de prix */}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>Règles de prix ({rules.length})</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((r, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}><label style={lbl}>Libellé</label><input style={{ ...inp, width: '100%' }} value={r.label} onChange={(e) => updRule(i, { label: e.target.value })} /></div>
                <div><label style={lbl}>Type</label>
                  <select style={inp} value={r.kind} onChange={(e) => updRule(i, { kind: e.target.value })}>
                    <option value="base">Prix de base</option>
                    <option value="add">Supplément / moins-value</option>
                  </select>
                </div>
                <div><label style={lbl}>code</label><input style={{ ...inp, width: 110 }} value={r.code} onChange={(e) => updRule(i, { code: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="btn ghost sm" onClick={() => moveRule(i, -1)}>↑</button>
                  <button type="button" className="btn ghost sm" onClick={() => moveRule(i, 1)}>↓</button>
                  <button type="button" className="btn ghost sm" onClick={() => delRule(i)}>✕</button>
                </div>
              </div>
              <div style={{ marginTop: 8 }}><label style={lbl}>Appliquée si (vide = toujours)</label>
                <ConditionBuilder value={r.when} onChange={(c) => updRule(i, { when: c })} vars={varInfos} />
              </div>
              <div style={{ marginTop: 8 }}><label style={lbl}>Montant</label>
                <AmountEditor value={r.amount} onChange={(a) => updRule(i, { amount: a })} d2ids={d2ids} d1ids={d1ids} vars={varInfos} />
              </div>
            </div>
          ))}
          <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={addRule}>+ Ajouter une règle</button>
        </div>
      </section>

      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
        Les <strong>tables de prix</strong> (grilles/barèmes) s&apos;éditent dans l&apos;Excel ; les <strong>variables dérivées</strong> (surface, snaps…) restent en mode <strong>JSON (avancé)</strong>.
      </p>
    </div>
  );
}
