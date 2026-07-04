import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import Layout from './Layout';
import { useLanguage } from '../context/LanguageContext';

interface Driver {
  id: string;
  name: string;
  status: string;
}

export default function OrderDetail() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const [order, setOrder] = useState<any>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await api.get(`/orders/${id}`);
    setOrder(res.data);
  };

  const loadDrivers = async () => {
    const res = await api.get('/drivers');
    setDrivers(res.data.filter((d: Driver) => d.status === 'available'));
  };

  useEffect(() => {
    load();
    loadDrivers();
  }, [id]);

  const run = async (fn: () => Promise<any>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      await load();
      await loadDrivers();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const openPdf = async (endpoint: string, key: string) => {
    setPdfLoading(key);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err: any) {
      setError(t('common.error'));
    } finally {
      setPdfLoading(null);
    }
  };

  if (!order) return <Layout><p>{t('common.loading')}</p></Layout>;

  const itemName = (it: any) => (lang === 'en' ? it.product_name_snapshot_en || it.product_name_snapshot : it.product_name_snapshot);

  return (
    <Layout>
      <h1>{t('orderDetail.title')} #{order.id.slice(0, 8)}</h1>
      <div style={styles.card}>
        <p><b>{t('orderDetail.customer')}:</b> {order.customer_name}</p>
        <p><b>{t('orderDetail.status')}:</b> {t(`status.${order.status}` as any)}</p>
        <p><b>{t('orderDetail.paymentMethod')}:</b> {order.payment_method || '-'}</p>
        <p><b>{t('orderDetail.total')}:</b> {Number(order.total).toFixed(3)}</p>

        {order.status !== 'pending' && order.status !== 'payment_failed' && order.status !== 'inventory_failed' && (
          <div style={styles.trackBox}>
            <div style={styles.trackStep}>
              <span style={order.picker_id ? styles.stepDone : styles.stepPending}>1. {t('orderDetail.step1')}</span>
              {order.picking_started_at && (
                <span style={styles.stepTime}>{new Date(order.picking_started_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span>
              )}
            </div>
            <div style={styles.trackStep}>
              <span style={order.packer_id ? styles.stepDone : styles.stepPending}>2. {t('orderDetail.step2')}</span>
              {order.packed_at && (
                <span style={styles.stepTime}>{new Date(order.packed_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span>
              )}
            </div>
          </div>
        )}

        <h3>{t('orderDetail.products')}</h3>
        <ul>
          {order.items?.map((it: any) => (
            <li key={it.id}>
              {itemName(it)} × {it.quantity} @ {Number(it.unit_price).toFixed(3)}
            </li>
          ))}
        </ul>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          {order.status === 'pending' && (
            <>
              <button disabled={busy} style={styles.button} onClick={() => run(() => api.post(`/orders/${id}/pay`, { payment_method: 'cash' }))}>
                💵 {t('orderDetail.payCash')}
              </button>
              <button disabled={busy} style={styles.button} onClick={() => run(() => api.post(`/orders/${id}/pay`, { payment_method: 'paid' }))}>
                ✅ {t('orderDetail.payDone')}
              </button>
            </>
          )}

          {(order.status === 'confirmed' || order.status === 'picking_started' || order.status === 'packed') && (
            <button
              disabled={pdfLoading === 'pick-ticket'}
              style={styles.secondaryBtn}
              onClick={() => openPdf(`/orders/${id}/pick-ticket`, 'pick-ticket')}
            >
              📋 {pdfLoading === 'pick-ticket' ? t('common.loading') : t('orderDetail.printPickTicket')}
            </button>
          )}

          {order.status === 'confirmed' && (
            <button disabled={busy} style={styles.button} onClick={() => run(() => api.post(`/orders/${id}/start-picking`))}>
              📋 {t('orderDetail.startPicking')}
            </button>
          )}

          {order.status === 'picking_started' && (
            <button disabled={busy} style={styles.button} onClick={() => run(() => api.post(`/orders/${id}/complete-packing`))}>
              📦 {t('orderDetail.completePacking')}
            </button>
          )}

          {order.status === 'packed' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={styles.select} value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                <option value="">{t('orderDetail.selectDriver')}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                disabled={busy || !selectedDriver}
                style={styles.button}
                onClick={() => run(() => api.post(`/orders/${id}/assign-driver`, { driver_id: selectedDriver }))}
              >
                🚚 {t('orderDetail.assignDriver')}
              </button>
            </div>
          )}

          {(order.status === 'out_for_delivery' || order.status === 'delivered') && (
            <button
              disabled={pdfLoading === 'receipt'}
              style={styles.secondaryBtn}
              onClick={() => openPdf(`/orders/${id}/receipt?width=80`, 'receipt')}
            >
              🧾 {pdfLoading === 'receipt' ? t('common.loading') : t('orderDetail.printReceipt')}
            </button>
          )}

          {order.status === 'out_for_delivery' && (
            <button disabled={busy} style={styles.button} onClick={() => run(() => api.post(`/orders/${id}/deliver`))}>
              📦 {t('orderDetail.confirmDelivery')}
            </button>
          )}

          {order.status === 'delivered' && (
            <button disabled={pdfLoading === 'invoice'} style={styles.linkButton} onClick={() => openPdf(`/orders/${id}/invoice`, 'invoice')}>
              🧾 {pdfLoading === 'invoice' ? t('common.loading') : t('orderDetail.viewInvoice')}
            </button>
          )}

          {order.status === 'inventory_failed' && (
            <p style={{ color: '#dc2626' }}>{t('orderDetail.inventoryFailedMsg')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', padding: 20, borderRadius: 10, maxWidth: 500 },
  actions: { marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' },
  button: { padding: '10px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' },
  secondaryBtn: { padding: '10px 16px', borderRadius: 6, border: '1px solid #4f46e5', background: '#fff', color: '#4f46e5', cursor: 'pointer' },
  select: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' },
  error: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  linkButton: { padding: '10px 16px', borderRadius: 6, background: '#16a34a', color: '#fff', textDecoration: 'none', border: 'none', cursor: 'pointer', fontSize: 14 },
  trackBox: { display: 'flex', gap: 20, margin: '12px 0', padding: 12, background: '#f8f9fb', borderRadius: 8 },
  trackStep: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 },
  stepDone: { color: '#16a34a', fontWeight: 600 },
  stepPending: { color: '#999' },
  stepTime: { color: '#999', fontSize: 11 },
};
