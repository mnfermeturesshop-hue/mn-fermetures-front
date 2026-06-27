'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from '@/components/ui/Toast';
import { getAllBrands, getProductBySlugDB } from '@/lib/catalog/db';
import type { Brand } from '@/lib/catalog/types';
import { flatMenuOptions, categorySlugFromHref } from '@/lib/catalog/menuResolve';
import type { MenuOption } from '@/lib/catalog/menuResolve';

type PricingType = 'unit' | 'matrix' | 'kit';

interface VariantRow { reference: string; label: string; priceHT: number; inStock: boolean; stockQty: number }
interface KitConfigRow { reference: string; label: string; priceHT: number }

const EMPTY_VARIANT: VariantRow = { reference: '', label: '', priceHT: 0, inStock: true, stockQty: 0 };
const EMPTY_KIT: KitConfigRow = { reference: '', label: '', priceHT: 0 };

export default function ProduitForm() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.slug === 'nouveau';
  const fileRef = useRef<HTMLInputElement>(null);

  const [menuOptions] = useState<MenuOption[]>(() => flatMenuOptions());
  const [brands, setBrands] = useState<Brand[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ slug: string; menuPath: string; hasImage: boolean } | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Champs communs
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [menuPath, setMenuPath] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [pricingType, setPricingType] = useState<PricingType>('unit');
  const [proOnly, setProOnly] = useState(false);
  const [uom, setUom] = useState('unite');

  // Variants (unit)
  const [variants, setVariants] = useState<VariantRow[]>([{ ...EMPTY_VARIANT }]);

  // Matrix
  const [matrixCsv, setMatrixCsv] = useState('');

  // Kit configs
  const [kitConfigs, setKitConfigs] = useState<KitConfigRow[]>([{ ...EMPTY_KIT }]);

  useEffect(() => {
    getAllBrands().then(setBrands);

    if (!isNew) {
      getProductBySlugDB(params.slug as string).then((p) => {
        if (!p) return;
        setSlug(p.slug);
        setName(p.name);
        setDescription(p.description ?? '');
        setMenuPath(p.menuPath ?? '');
        setCategorySlug(p.categorySlug);
        setBrandSlug(p.brandSlug ?? '');
        if (p.imageUrl) { setExistingImageUrl(p.imageUrl); setImagePreview(p.imageUrl); }
        setPricingType(p.pricingType);
        setProOnly(p.proOnly ?? false);
        if (p.pricingType === 'unit') {
          setUom(p.uom);
          setVariants(p.variants.map((v) => ({
            reference: v.reference,
            label: v.label ?? '',
            priceHT: v.priceHT,
            inStock: v.inStock,
            stockQty: v.stockQty ?? 0,
          })));
        }
        if (p.pricingType === 'kit') {
          setKitConfigs(p.configs.map((c) => ({
            reference: c.reference,
            label: c.label,
            priceHT: c.priceHT,
          })));
        }
      });
    }
  }, [isNew, params.slug]);

  const autoSlug = (n: string) =>
    n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleNameChange = (v: string) => {
    setName(v);
    if (isNew) setSlug(autoSlug(v));
  };

  const applyImageFile = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) applyImageFile(file);
  };

  const updateVariant = (i: number, field: keyof VariantRow, value: string | number | boolean) => {
    setVariants((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  };

  const updateKit = (i: number, field: keyof KitConfigRow, value: string | number) => {
    setKitConfigs((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !name || !menuPath) {
      toast.error('Champs obligatoires manquants (slug, nom, position menu)');
      return;
    }
    setSaving(true);
    try {
      // Si un nouveau fichier est sélectionné → upload → nouvelle URL
      // Sinon on conserve l'URL déjà en base (existingImageUrl)
      let finalImageUrl: string | null = existingImageUrl;
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        fd.append('slug', slug);
        const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          const { error } = await uploadRes.json();
          throw new Error(error ?? 'Erreur upload image');
        }
        const { url } = await uploadRes.json();
        finalImageUrl = url;
      }

      const payload: Record<string, unknown> = {
        slug,
        name,
        description: description || null,
        menu_path: menuPath,
        category_slug: categorySlugFromHref(menuPath),
        brand_slug: brandSlug || null,
        pricing_type: pricingType,
        pro_only: proOnly,
        active: true,
        image_url: finalImageUrl, // toujours explicite (null = suppression)
      };

      if (pricingType === 'unit') {
        payload.variants = variants.map((v) => ({
          reference: v.reference,
          label: v.label || undefined,
          uom,
          priceHT: Number(v.priceHT),
          inStock: v.inStock,
          stockQty: Number(v.stockQty) || undefined,
        }));
      } else if (pricingType === 'matrix') {
        // Conversion CSV simplifié : lignes = hauteurs, colonnes = largeurs
        try {
          const rows = matrixCsv.trim().split('\n');
          const headers = rows[0].split(';').map(Number);
          const grid: Record<number, number[]> = {};
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(';');
            const h = Number(cols[0]);
            grid[h] = cols.slice(1).map((v) => (v === '' ? null : Number(v)) as number);
          }
          payload.matrix_prices = grid;
          payload.matrix_options = { widths: headers.slice(1), options: [] };
        } catch {
          toast.error('Format de grille invalide');
          setSaving(false);
          return;
        }
      } else if (pricingType === 'kit') {
        payload.configs = kitConfigs.map((c) => ({
          reference: c.reference,
          label: c.label,
          priceHT: Number(c.priceHT),
          bom: [],
        }));
      }

      const saveRes = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) {
        const { error } = await saveRes.json();
        throw new Error(error ?? 'Erreur sauvegarde produit');
      }
      setSavedInfo({ slug, menuPath, hasImage: !!finalImageUrl });
      toast.success(`${isNew ? 'Créé' : 'Sauvegardé'} — menu : ${menuPath}${finalImageUrl ? ' | image ✓' : ' | sans image'}`);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      toast.error(`Erreur : ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">{isNew ? 'Nouveau produit' : `Éditer — ${name || params.slug}`}</h1>
      </div>

      {savedInfo && (
        <div className="adm-saved-banner">
          <div className="adm-saved-info">
            <span className="adm-saved-icon">✓</span>
            <div>
              <b>Produit sauvegardé</b>
              <div className="adm-saved-detail">
                Menu&nbsp;: <code>{savedInfo.menuPath}</code>
              </div>
              <div className="adm-saved-detail">
                Image&nbsp;: {savedInfo.hasImage ? <span className="adm-saved-ok">présente ✓</span> : <span className="adm-saved-warn">aucune image !</span>}
              </div>
            </div>
          </div>
          <div className="adm-saved-actions">
            <a className="btn solid" href={`/produit/${savedInfo.slug}`} target="_blank" rel="noopener">
              Voir le produit →
            </a>
            <button type="button" className="btn ghost" onClick={() => router.push('/admin/produits')}>
              Retour à la liste
            </button>
          </div>
        </div>
      )}

      <form className="adm-form" onSubmit={handleSave}>
        {/* Informations générales */}
        <div className="adm-card">
          <h2 className="adm-card-title">Informations générales</h2>
          <div className="adm-form-grid">
            <div className="adm-field">
              <label>Nom du produit *</label>
              <input value={name} onChange={(e) => handleNameChange(e.target.value)} required />
            </div>
            <div className="adm-field">
              <label>Slug (URL) *</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="adm-mono" />
            </div>
            <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
              <label>Position dans le menu *</label>
              <select
                value={menuPath}
                onChange={(e) => {
                  setMenuPath(e.target.value);
                  setCategorySlug(categorySlugFromHref(e.target.value));
                }}
                required
              >
                <option value="">— Choisir une position —</option>
                {menuOptions.map((o) => (
                  <option key={o.href} value={o.href}>{o.label}</option>
                ))}
              </select>
              {menuPath && (
                <div className="adm-form-hint">
                  Catégorie dérivée : <strong>{categorySlugFromHref(menuPath)}</strong> · URL catalogue : <code>{menuPath}</code>
                </div>
              )}
            </div>
            <div className="adm-field">
              <label>Marque</label>
              <select value={brandSlug} onChange={(e) => setBrandSlug(e.target.value)}>
                <option value="">— Aucune —</option>
                {brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label>Type de prix *</label>
              <select value={pricingType} onChange={(e) => setPricingType(e.target.value as PricingType)}>
                <option value="unit">Unitaire (€/u, €/ml…)</option>
                <option value="matrix">Sur mesure (grille H×L)</option>
                <option value="kit">Kit (configs fixes)</option>
              </select>
            </div>
            <div className="adm-field adm-field-check">
              <label>
                <input type="checkbox" checked={proOnly} onChange={(e) => setProOnly(e.target.checked)} />
                Réservé aux pros (B2B uniquement)
              </label>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="adm-card">
          <h2 className="adm-card-title">Visuel produit</h2>
          <div className="adm-image-upload">
            {imagePreview ? (
              <div
                className={`adm-image-preview${dragOver ? ' adm-drop-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Image src={imagePreview} alt="Aperçu" width={200} height={200} style={{ objectFit: 'contain' }} unoptimized />
                {dragOver && <div className="adm-drop-overlay">Déposer pour remplacer</div>}
                <div className="adm-image-actions">
                  <button type="button" className="adm-image-change" onClick={() => fileRef.current?.click()}>✎ Changer</button>
                  <button type="button" className="adm-image-remove" onClick={() => { setImagePreview(null); setImageFile(null); setExistingImageUrl(null); }}>✕ Supprimer</button>
                </div>
              </div>
            ) : (
              <div
                className={`adm-image-drop${dragOver ? ' adm-drop-over' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <span className="adm-image-icon">{dragOver ? '⬇' : '🖼'}</span>
                <span>{dragOver ? 'Relâcher pour déposer' : 'Glisser une image ici ou cliquer pour parcourir'}</span>
                <span className="adm-image-hint">PNG, JPG, WebP — max 5 Mo</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Champs type-spécifiques */}
        {pricingType === 'unit' && (
          <div className="adm-card">
            <h2 className="adm-card-title">Variantes & prix</h2>
            <div className="adm-field" style={{ marginBottom: 16 }}>
              <label>Unité de vente</label>
              <select value={uom} onChange={(e) => setUom(e.target.value)} style={{ maxWidth: 180 }}>
                <option value="unite">À l&apos;unité</option>
                <option value="ml">Au mètre linéaire</option>
                <option value="paire">Par paire</option>
                <option value="m2">Au m²</option>
              </select>
            </div>
            <div className="adm-variants">
              <div className="adm-variants-head">
                <span>Référence</span><span>Libellé</span><span>Prix HT (€)</span><span>Stock</span><span>Qté</span><span></span>
              </div>
              {variants.map((v, i) => (
                <div key={i} className="adm-variant-row">
                  <input placeholder="REF-001" value={v.reference} onChange={(e) => updateVariant(i, 'reference', e.target.value)} className="adm-mono" />
                  <input placeholder="Blanc, RAL 7016…" value={v.label} onChange={(e) => updateVariant(i, 'label', e.target.value)} />
                  <input type="number" step="0.01" min="0" value={v.priceHT} onChange={(e) => updateVariant(i, 'priceHT', e.target.value)} />
                  <input type="checkbox" checked={v.inStock} onChange={(e) => updateVariant(i, 'inStock', e.target.checked)} title="En stock" />
                  <input type="number" min="0" value={v.stockQty} onChange={(e) => updateVariant(i, 'stockQty', e.target.value)} />
                  <button type="button" className="adm-row-del" onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              <button type="button" className="adm-add-row" onClick={() => setVariants((prev) => [...prev, { ...EMPTY_VARIANT }])}>
                ＋ Ajouter une variante
              </button>
            </div>
          </div>
        )}

        {pricingType === 'matrix' && (
          <div className="adm-card">
            <h2 className="adm-card-title">Grille de prix (sur mesure)</h2>
            <p className="adm-hint">Format CSV avec `;` : première ligne = largeurs (mm), première colonne = hauteurs (mm). Cellule vide = hors abaque.</p>
            <textarea
              className="adm-mono adm-matrix-csv"
              value={matrixCsv}
              onChange={(e) => setMatrixCsv(e.target.value)}
              rows={10}
              placeholder={`;1200;1500;1800;2000\n1000;98.50;112.00;131.50;145.00\n1250;108.00;124.00;145.00;160.00\n1500;118.00;136.00;159.00;175.00`}
            />
          </div>
        )}

        {pricingType === 'kit' && (
          <div className="adm-card">
            <h2 className="adm-card-title">Configurations du kit</h2>
            <div className="adm-variants">
              <div className="adm-variants-head">
                <span>Référence</span><span>Libellé</span><span>Prix HT (€)</span><span></span>
              </div>
              {kitConfigs.map((c, i) => (
                <div key={i} className="adm-variant-row">
                  <input placeholder="KIT-001" value={c.reference} onChange={(e) => updateKit(i, 'reference', e.target.value)} className="adm-mono" />
                  <input placeholder="Largeur 1500 · 10 Nm" value={c.label} onChange={(e) => updateKit(i, 'label', e.target.value)} />
                  <input type="number" step="0.01" min="0" value={c.priceHT} onChange={(e) => updateKit(i, 'priceHT', e.target.value)} />
                  <button type="button" className="adm-row-del" onClick={() => setKitConfigs((prev) => prev.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              <button type="button" className="adm-add-row" onClick={() => setKitConfigs((prev) => [...prev, { ...EMPTY_KIT }])}>
                ＋ Ajouter une configuration
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="adm-form-actions">
          <button type="button" className="btn ghost" onClick={() => router.push('/admin/produits')}>Annuler</button>
          <button type="submit" className="btn solid adm-btn-save" disabled={saving}>
            {saving ? 'Enregistrement…' : (isNew ? 'Créer le produit' : 'Enregistrer les modifications')}
          </button>
        </div>
      </form>
    </div>
  );
}
