import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Layout from './Layout';
import { useLanguage } from '../context/LanguageContext';

interface Order {
  id: string;
  customer_name: string;
  status: string;
  total: string;
  created_at: string;
}

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

const STATUS_COLORS: Record<string, string> = {
  pending: '#d97706',
  confirmed: '#2563eb',
  payment_failed: '#dc2626',
  inventory_failed: '#dc2626',
  picking_started: '#7c3aed',
  packed: '#0891b2',
  out_for_delivery: '#7c3aed',
  delivered: '#16a34a',
};

export default function Orders() {
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [cart, setCart] = useState<{ product_id: string; name: string; quantity: number }[]>([]);
  const [error, setError] = useState('');

  const productName = (p: Product) => (lang === 'en' ? p.name_en || p.name : p.name);

  const loadOrders = async () => {
    const res = await api.get('/orders');
    setOrders(res.data.data);
  };

  const loadProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data.data);
  };

  const loadWarehouses = async () => {
    const res = await api.get('/warehouses');
    setWarehouses(res.data);
    if (res.data.length > 0 && !warehouseId) setWarehouseId(res.data[0].id);
  };

  useEffect(() => {
    loadOrders();
    loadProducts();
    loadWarehouses();
  }, []);

  const addToCart = () => {
    if (!selectedProduct) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    setCart([...cart, { product_id: product.id, name: productName(product), quantity: Number(quantity) }]);
    setSelectedProduct('');
    setQuantity('1');
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cart.length === 0) {
      setError(t('orders.error.needProduct'));
      return;
    }
    if (!warehouseId) {
      setError(t('orders.error.needWarehouse'));
      return;
    }
    try {
      await api.post('/orders', {
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        customer_address: customerAddress || undefined,
        warehouse_id: warehouseId,
        items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
      });
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCart([]);
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  return (
    <Layout>
      <h1>{t('orders.title')}</h1>

      <form onSubmit={createOrder} style={styles.card}>
        <h3 style={{ marginTop: 0 }}>{t('orders.new')}</h3>
        <input
          style={styles.input}
          placeholder={t('orders.customerName')}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
        <input
          style={styles.input}
          placeholder={lang === 'ar' ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder={lang === 'ar' ? 'عنوان التوصيل (اختياري)' : 'Delivery address (optional)'}
          value={customerAddress}
          onChange={(e) => setCustomerAddress(e.target.value)}
        />

        <div>
          <label style={styles.label}>{t('orders.warehouse')}</label>
          <select style={styles.input} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({t(`warehouses.type.${w.type}` as any)})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select style={styles.input} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="">{t('orders.selectProduct')}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {productName(p)} ({p.total_stock})
              </option>
            ))}
          </select>
          <input
            style={{ ...styles.input, width: 80 }}
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <button type="button" style={styles.secondaryBtn} onClick={addToCart}>
            {t('orders.addToCart')}
          </button>
        </div>

        {cart.length > 0 && (
          <ul style={styles.cartList}>
            {cart.map((c, i) => (
              <li key={i}>
                {c.name} × {c.quantity}
              </li>
            ))}
          </ul>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} type="submit">
          {t('orders.create')}
        </button>
      </form>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t('orders.table.customer')}</th>
            <th style={styles.th}>{t('orders.table.total')}</th>
            <th style={styles.th}>{t('orders.table.status')}</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td style={styles.td}>{o.customer_name}</td>
              <td style={styles.td}>{Number(o.total).toFixed(3)}</td>
              <td style={styles.td}>
                <span style={{ color: STATUS_COLORS[o.status] || '#666', fontWeight: 600 }}>
                  {t(`status.${o.status}` as any)}
                </span>
              </td>
              <td style={styles.td}>
                <Link to={`/orders/${o.id}`} style={styles.link}>
                  {t('orders.openOrder')} →
                </Link>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td style={styles.td} colSpan={4}>
                {t('orders.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', padding: 16, borderRadius: 10, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', flex: 1, width: '100%' },
  label: { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 },
  button: { padding: '10px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', alignSelf: 'flex-start' },
  secondaryBtn: { padding: '8px 14px', borderRadius: 6, border: '1px solid #4f46e5', background: '#fff', color: '#4f46e5', cursor: 'pointer' },
  cartList: { margin: 0, paddingInlineStart: 20, fontSize: 14, color: '#444' },
  error: { color: '#dc2626', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'start', padding: 12, background: '#f4f5f7', fontSize: 13, color: '#555' },
  td: { padding: 12, borderTop: '1px solid #eee', fontSize: 14 },
  link: { color: '#4f46e5', textDecoration: 'none', fontSize: 13 },
};
