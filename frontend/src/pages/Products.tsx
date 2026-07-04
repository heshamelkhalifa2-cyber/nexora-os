import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Layout from './Layout';
import { useLanguage } from '../context/LanguageContext';

interface Product {
  id: string;
  name: string;
  name_en?: string;
  price: string;
  total_stock: number;
}

interface Warehouse {
  id: string;
  name: string;
  type: string;
}

export default function Products() {
  const { t, lang } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockBreakdown, setStockBreakdown] = useState<any[]>([]);

  const displayName = (p: Product) => (lang === 'en' ? p.name_en || p.name : p.name);

  const load = async () => {
    const res = await api.get('/products');
    setProducts(res.data.data);
  };

  const loadWarehouses = async () => {
    const res = await api.get('/warehouses');
    setWarehouses(res.data);
    if (res.data.length > 0 && !warehouseId) setWarehouseId(res.data[0].id);
  };

  useEffect(() => {
    load();
    loadWarehouses();
  }, []);

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/products', {
        name,
        name_en: nameEn || undefined,
        price: Number(price),
        initial_stock: stock ? Number(stock) : undefined,
        warehouse_id: stock ? warehouseId : undefined,
      });
      setName('');
      setNameEn('');
      setPrice('');
      setStock('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const openStockModal = async (product: Product) => {
    setStockModalProduct(product);
    const res = await api.get(`/products/${product.id}/stock`);
    setStockBreakdown(res.data);
  };

  const updateStockAt = async (whId: string, currentQty: number) => {
    const value = prompt(lang === 'ar' ? 'الكمية الجديدة في هذا الموقع:' : 'New quantity at this location:', String(currentQty));
    if (value === null || !stockModalProduct) return;
    await api.patch(`/products/${stockModalProduct.id}/stock`, {
      warehouse_id: whId,
      quantity: Number(value),
    });
    const res = await api.get(`/products/${stockModalProduct.id}/stock`);
    setStockBreakdown(res.data);
    load();
  };

  return (
    <Layout>
      <h1>{t('products.title')}</h1>

      <form onSubmit={addProduct} style={styles.form}>
        <input style={styles.input} placeholder={t('products.name')} value={name} onChange={(e) => setName(e.target.value)} required />
        <input style={styles.input} placeholder={t('products.nameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        <input style={styles.input} placeholder={t('products.price')} type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input style={styles.input} placeholder={t('products.initialStock')} type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
        {stock && (
          <select style={styles.input} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({t(`warehouses.type.${w.type}` as any)})
              </option>
            ))}
          </select>
        )}
        <button style={styles.button} disabled={loading}>
          {t('products.add')}
        </button>
      </form>
      {error && <div style={styles.error}>{error}</div>}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t('products.table.product')}</th>
            <th style={styles.th}>{t('products.table.price')}</th>
            <th style={styles.th}>{t('products.table.stock')}</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td style={styles.td}>{displayName(p)}</td>
              <td style={styles.td}>{Number(p.price).toFixed(3)}</td>
              <td style={styles.td}>{p.total_stock}</td>
              <td style={styles.td}>
                <button style={styles.smallBtn} onClick={() => openStockModal(p)}>
                  {t('products.stockDetails')}
                </button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td style={styles.td} colSpan={4}>
                {t('products.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {stockModalProduct && (
        <div style={styles.modalOverlay} onClick={() => setStockModalProduct(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {t('products.stockModal.title')}: {displayName(stockModalProduct)}
            </h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('products.stockModal.location')}</th>
                  <th style={styles.th}>{t('products.stockModal.type')}</th>
                  <th style={styles.th}>{t('products.stockModal.quantity')}</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {stockBreakdown.map((s) => (
                  <tr key={s.warehouse_id}>
                    <td style={styles.td}>{s.warehouse_name}</td>
                    <td style={styles.td}>{t(`warehouses.type.${s.warehouse_type}` as any)}</td>
                    <td style={styles.td}>{s.quantity}</td>
                    <td style={styles.td}>
                      <button style={styles.smallBtn} onClick={() => updateStockAt(s.warehouse_id, s.quantity)}>
                        {t('common.edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ ...styles.button, marginTop: 12 }} onClick={() => setStockModalProduct(null)}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', gap: 8, marginBottom: 12, background: '#fff', padding: 16, borderRadius: 10, flexWrap: 'wrap' },
  input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 140 },
  button: { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'start', padding: 12, background: '#f4f5f7', fontSize: 13, color: '#555' },
  td: { padding: 12, borderTop: '1px solid #eee', fontSize: 14 },
  smallBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modal: { background: '#fff', padding: 24, borderRadius: 12, width: 480, maxWidth: '90vw' },
};
