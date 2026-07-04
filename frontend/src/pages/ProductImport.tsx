import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import Layout from './Layout';
import { useLanguage } from '../context/LanguageContext';

interface Warehouse {
  id: string;
  name: string;
  type: string;
}

type FieldKey = 'name' | 'name_en' | 'price' | 'stock';

const NAME_HINTS = ['name', 'اسم', 'product'];
const NAME_EN_HINTS = ['english', 'name_en', 'en name'];
const PRICE_HINTS = ['price', 'سعر'];
const STOCK_HINTS = ['stock', 'qty', 'quantity', 'كمية', 'مخزون'];

function guessColumn(headers: string[], hints: string[]): number {
  const lower = headers.map((h) => (h || '').toString().toLowerCase());
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx !== -1) return idx;
  }
  return -1;
}

export default function ProductImport() {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>({
    name: -1,
    name_en: -1,
    price: -1,
    stock: -1,
  });
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/warehouses').then((res) => {
      setWarehouses(res.data);
      if (res.data.length > 0) setWarehouseId(res.data[0].id);
    });
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);

    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();

    const handleParsed = (workbook: XLSX.WorkBook) => {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (parsed.length === 0) {
        setError('الملف فاضي');
        return;
      }
      const headerRow = parsed[0].map((h) => String(h));
      const dataRows = parsed.slice(1).filter((r) => r.length > 0);
      setHeaders(headerRow);
      setRows(dataRows);
      setMapping({
        name: guessColumn(headerRow, NAME_HINTS),
        name_en: guessColumn(headerRow, NAME_EN_HINTS),
        price: guessColumn(headerRow, PRICE_HINTS),
        stock: guessColumn(headerRow, STOCK_HINTS),
      });
    };

    if (isCsv) {
      // لازم نقرأ CSV كنص UTF-8 صريح — قراءته كبيانات ثنائية بتكسر أي نص عربي (Mojibake)
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const workbook = XLSX.read(text, { type: 'string' });
        handleParsed(workbook);
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      // ملفات Excel الثنائية (.xlsx/.xls) لها ترميز خاص بالتنسيق نفسه، تُقرأ كـ ArrayBuffer
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        handleParsed(workbook);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const setMap = (field: FieldKey, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const buildItems = () => {
    return rows
      .filter((r) => mapping.name !== -1 && r[mapping.name])
      .map((r) => ({
        name: String(r[mapping.name]),
        name_en: mapping.name_en !== -1 ? String(r[mapping.name_en] ?? '') || undefined : undefined,
        price: mapping.price !== -1 ? Number(r[mapping.price]) || 0 : 0,
        initial_stock: mapping.stock !== -1 ? Number(r[mapping.stock]) || 0 : 0,
      }));
  };

  const confirmImport = async () => {
    setError('');
    setLoading(true);
    try {
      const items = buildItems();
      const res = await api.post('/products/bulk-import', { warehouse_id: warehouseId, items });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const previewItems = buildItems().slice(0, 10);

  return (
    <Layout>
      <h1>{t('import.title')}</h1>

      <div style={styles.card}>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
      </div>

      {headers.length > 0 && (
        <>
          <div style={styles.card}>
            <label style={styles.label}>
              {t('import.warehouse')}
              <select style={styles.input} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>{t('import.mappingTitle')}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: -8 }}>{t('import.mappingHint')}</p>
            <div style={styles.mappingGrid}>
              {(['name', 'name_en', 'price', 'stock'] as FieldKey[]).map((field) => (
                <label key={field} style={styles.label}>
                  {t(`import.field.${field === 'name_en' ? 'nameEn' : field}` as any)}
                  <select style={styles.input} value={mapping[field]} onChange={(e) => setMap(field, e.target.value)}>
                    <option value={-1}>{t('import.notMapped')}</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>{t('import.previewTitle')}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('import.field.name')}</th>
                  <th style={styles.th}>{t('import.field.nameEn')}</th>
                  <th style={styles.th}>{t('import.field.price')}</th>
                  <th style={styles.th}>{t('import.field.stock')}</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((it, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{it.name}</td>
                    <td style={styles.td}>{it.name_en || '-'}</td>
                    <td style={styles.td}>{it.price}</td>
                    <td style={styles.td}>{it.initial_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {error && <div style={styles.error}>{error}</div>}

            <button style={styles.button} disabled={loading || mapping.name === -1} onClick={confirmImport}>
              {loading ? t('common.loading') : t('import.confirm')}
            </button>
          </div>
        </>
      )}

      {result && (
        <div style={styles.card}>
          <p>
            ✅ {result.created} {t('import.resultCreated')} — 🔄 {result.updated} {t('import.resultUpdated')}
            {result.errors.length > 0 && <> — ⚠️ {result.errors.length} {t('import.resultErrors')}</>}
          </p>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((e, i) => (
                <li key={i} style={{ color: '#dc2626', fontSize: 13 }}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: 'var(--color-card)', padding: 20, borderRadius: 10, marginBottom: 16, maxWidth: 800 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--color-text-muted)' },
  mappingGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  input: {
    padding: '8px 10px',
    borderRadius: 6,
    background: 'var(--color-card)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border-strong)',
  },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 16 },
  th: { textAlign: 'start', padding: 8, background: 'var(--color-bg)', fontSize: 13, color: 'var(--color-text-muted)' },
  td: { padding: 8, borderTop: '1px solid var(--color-border)', fontSize: 13 },
  button: { padding: '10px 20px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: 14 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
};
