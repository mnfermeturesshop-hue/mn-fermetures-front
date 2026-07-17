'use client';

/* Éditeur structuré (assistant) d'une définition de configurateur — Phase 3.1.
   Gère Meta + Champs (+ options) + Étapes par formulaires. Les règles de prix,
   conditions et formules restent en mode JSON (constructeurs visuels : 3.2/3.3).
   Édite un objet def « souple » (JSON dynamique) et remonte via onChange. */

type Primitive = string | number | boolean;
interface Opt { value: string; label: string; hex?: string; hint?: string }
interface Fld { id: string; label: string; type: string; unit?: string; default?: Primitive; help?: string; options?: Opt[]; role?: string; [k: string]: unknown }
interface Stp { id: string; title: string; help?: string; fields: string[]; [k: string]: unknown }
export interface DefObj { slug: string; name: string; famille: string; fields: Fld[]; steps?: Stp[]; [k: string]: unknown }

const TYPES = ['choice', 'dimension', 'number', 'boolean', 'text', 'info'];
const inp: React.CSSProperties = { padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13 };
const lbl: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 2 };

export function DefBuilder({ value, onChange }: { value: DefObj; onChange: (d: DefObj) => void }) {
  const d = value;
  const set = (patch: Partial<DefObj>) => onChange({ ...d, ...patch });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Meta */}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>Général</h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div><label style={lbl}>Nom</label><input style={inp} value={d.name ?? ''} onChange={(e) => set({ name: e.target.value })} /></div>
          <div><label style={lbl}>Identifiant (slug)</label><input style={inp} value={d.slug ?? ''} onChange={(e) => set({ slug: e.target.value })} /></div>
          <div><label style={lbl}>Famille (remise B2B)</label><input style={inp} value={d.famille ?? ''} onChange={(e) => set({ famille: e.target.value })} /></div>
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

      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
        Règles de prix, conditions d&apos;affichage et formules s&apos;éditent en mode <strong>JSON (avancé)</strong> — constructeurs visuels à venir.
      </p>
    </div>
  );
}
