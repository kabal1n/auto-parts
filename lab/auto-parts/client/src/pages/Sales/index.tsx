import { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Input, Button, Table, InputNumber, Typography,
  Space, Flex, Divider, Modal, Radio, Statistic, message, Tag, AutoComplete,
} from 'antd';
import { DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { productsApi, customersApi, salesApi, stockApi } from '../../api';
import { maskPhone, formatPhone } from '../../utils/phone';
import { useActiveStore } from '../../store/activeStore';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import StoreGuard from '../../components/StoreGuard';

interface Product { product_id: number; name: string; price: number; unit: string; barcode: string | null; article: string | null }
interface CartItem extends Product { quantity: number }
interface Customer { client_id: number; last_name: string; first_name: string; phone: string; personal_discount_percent: number }
interface StockInfo { quantity: number; reserved: number; available: number }

export default function SalesPage() {
  const { activeStoreId } = useActiveStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState<{ value: string; label: React.ReactNode; product: Product }[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string; customer: Customer }[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payType, setPayType] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [cashGiven, setCashGiven] = useState(0);
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedCard, setMixedCard] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [stockMap, setStockMap] = useState<Record<number, StockInfo>>({});

  const loadStock = useCallback(async () => {
    if (!activeStoreId) return;
    try {
      const res = await stockApi.list({ store_id: activeStoreId });
      const map: Record<number, StockInfo> = {};
      for (const s of res.data) map[s.product_id] = {
        quantity: s.quantity,
        reserved: s.reserved_quantity,
        available: s.available_quantity,
      };
      setStockMap(map);
    } catch { /* stock validation still enforced on backend */ }
  }, [activeStoreId]);

  useEffect(() => { loadStock(); }, [loadStock]);

  const addToCart = (product: Product) => {
    const available = stockMap[product.product_id]?.available;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (available !== undefined) {
        if (existing) {
          if (existing.quantity >= available) {
            message.warning(`Максимальное доступное количество (${available}) уже добавлено в корзину`);
            return prev;
          }
        } else if (available === 0) {
          message.warning('Товар недоступен — весь остаток зарезервирован под заказы');
          return prev;
        }
      }
      if (existing) return prev.map((i) => i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
    setProductSearch('');
    setProductOptions([]);
  };

  useBarcodeScanner((barcode) => {
    productsApi.byBarcode(barcode)
      .then((res) => addToCart(res.data))
      .catch(() => message.warning(`Товар со штрих-кодом ${barcode} не найден`));
  });

  const searchProducts = async (val: string) => {
    if (!val) { setProductOptions([]); return; }
    const res = await productsApi.list({ search: val });
    setProductOptions(
      res.data.map((p: Product) => {
        const available = stockMap[p.product_id]?.available ?? 0;
        const label = available > 0
          ? <span>{p.name} — {Number(p.price).toFixed(2)} ₽ <span style={{ color: 'var(--color-fg-3)' }}>— осталось: {available} шт</span></span>
          : <span>{p.name} — {Number(p.price).toFixed(2)} ₽ <span style={{ color: 'var(--color-danger)' }}>— нет в наличии</span></span>;
        return { value: String(p.product_id), label, product: p };
      }),
    );
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) { setCart((c) => c.filter((i) => i.product_id !== id)); return; }
    const available = stockMap[id]?.available;
    const clamped = (available !== undefined && qty > available) ? available : qty;
    setCart((c) => c.map((i) => i.product_id === id ? { ...i, quantity: clamped } : i));
  };

  const onPhoneChange = async (val: string) => {
    const masked = maskPhone(val);
    setCustomerSearch(masked);
    const digits = val.replace(/\D/g, '').replace(/^[78]/, '');
    if (digits.length < 3) { setCustomerOptions([]); return; }
    try {
      const res = await customersApi.list({ search: digits });
      setCustomerOptions(
        res.data.map((c: Customer) => ({
          value: String(c.client_id),
          label: `${c.last_name} ${c.first_name} — ${formatPhone(c.phone)}`,
          customer: c,
        })),
      );
    } catch { setCustomerOptions([]); }
  };

  const onSelectCustomer = (_val: string, opt: { value: string; label: string; customer: Customer }) => {
    setCustomer(opt.customer);
    setCustomerSearch('');
    setCustomerOptions([]);
  };

  const discount = customer ? Number(customer.personal_discount_percent) : 0;
  const subtotal = cart.reduce((s, i) => s + i.quantity * Number(i.price), 0);
  const discountAmt = subtotal * (discount / 100);
  const total = subtotal - discountAmt;

  const resetPayState = (t: number) => {
    setCashGiven(t);
    setMixedCash(0);
    setMixedCard(0);
  };

  const openPayment = () => {
    if (!cart.length) { message.warning('Добавьте товары в корзину'); return; }
    resetPayState(Math.round(total * 100) / 100);
    setPayType('cash');
    setPaymentOpen(true);
  };

  const submitSale = async () => {
    let cash = 0, card = 0, change = 0;
    if (payType === 'cash') {
      if (cashGiven < total - 0.01) { message.error('Сумма наличных меньше суммы к оплате'); return; }
      cash = total;
      change = Math.max(0, cashGiven - total);
    } else if (payType === 'card') {
      card = total;
    } else {
      if (mixedCash + mixedCard < total - 0.01) { message.error('Сумма оплаты меньше итога'); return; }
      cash = mixedCash;
      card = mixedCard;
    }

    setSubmitting(true);
    try {
      await salesApi.create({
        store_id: activeStoreId,
        client_id: customer?.client_id,
        discount_percent: discount,
        cash_amount: cash,
        card_amount: card,
        change_amount: change,
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: Number(i.price) })),
      });
      message.success('Продажа оформлена');
      loadStock();
      setCart([]);
      setCustomer(null);
      setCustomerSearch('');
      setPaymentOpen(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка оформления продажи');
    } finally {
      setSubmitting(false);
    }
  };

  const cartColumns: ColumnsType<CartItem> = [
    { title: 'Товар', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Цена', dataIndex: 'price', key: 'price', width: 100, render: (v: number) => `${Number(v).toFixed(2)} ₽` },
    {
      title: 'Кол-во', key: 'qty', width: 110,
      render: (_: unknown, item: CartItem) => (
        <InputNumber min={0} max={stockMap[item.product_id]?.available} value={item.quantity} size="small" style={{ width: 80 }}
          onChange={(v) => updateQty(item.product_id, v ?? 0)} />
      ),
    },
    {
      title: 'Сумма', key: 'line', width: 110,
      render: (_: unknown, item: CartItem) => `${(item.quantity * Number(item.price)).toFixed(2)} ₽`,
    },
    {
      title: '', key: 'del', width: 50,
      render: (_: unknown, item: CartItem) => (
        <Button danger icon={<DeleteOutlined />} size="small"
          onClick={() => setCart((c) => c.filter((i) => i.product_id !== item.product_id))} />
      ),
    },
  ];

  return (
    <StoreGuard>
      <Row gutter={16}>
        <Col span={15}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>Новая продажа</Typography.Title>
          <AutoComplete
            value={productSearch}
            options={productOptions}
            onChange={(v) => { setProductSearch(v); searchProducts(v); }}
            onSelect={(_v, opt) => addToCart(opt.product)}
            style={{ width: '100%', marginBottom: 12 }}
          >
            <Input prefix={<SearchOutlined />}
              placeholder="Поиск товара по названию, артикулу или сканируйте штрих-код..."
              size="large" />
          </AutoComplete>

          <Table dataSource={cart} columns={cartColumns} rowKey="product_id" size="small"
            pagination={false} locale={{ emptyText: 'Корзина пуста' }} scroll={{ y: 420 }} />
        </Col>

        <Col span={9}>
          <div style={{ background: 'var(--color-bg-surface)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <Typography.Text strong>Клиент (необязательно)</Typography.Text>
            <AutoComplete
              value={customerSearch}
              options={customerOptions}
              onChange={onPhoneChange}
              onSelect={onSelectCustomer}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Input prefix={<UserOutlined />} placeholder="Начните вводить номер телефона..." maxLength={18} />
            </AutoComplete>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              Вводите цифры — «+7» добавится автоматически
            </Typography.Text>

            {customer && (
              <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                <Space>
                  <Typography.Text strong>{customer.last_name} {customer.first_name}</Typography.Text>
                  <Tag color="green">Скидка {Number(customer.personal_discount_percent)}%</Tag>
                  <Button type="text" size="small" danger onClick={() => { setCustomer(null); setCustomerSearch(''); }}>✕</Button>
                </Space>
              </div>
            )}

            <Divider />
            <Flex vertical style={{ width: '100%' }}>
              <Row justify="space-between">
                <Typography.Text>Сумма:</Typography.Text>
                <Typography.Text>{subtotal.toFixed(2)} ₽</Typography.Text>
              </Row>
              {discount > 0 && (
                <Row justify="space-between">
                  <Typography.Text type="secondary">Скидка {discount}%:</Typography.Text>
                  <Typography.Text type="danger">−{discountAmt.toFixed(2)} ₽</Typography.Text>
                </Row>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <Row justify="space-between">
                <Typography.Title level={4} style={{ margin: 0 }}>Итого:</Typography.Title>
                <Typography.Title level={4} style={{ margin: 0 }}>{total.toFixed(2)} ₽</Typography.Title>
              </Row>
            </Flex>

            <Button type="primary" size="large" block style={{ marginTop: 24 }} onClick={openPayment}>
              Оформить оплату
            </Button>
            <Button block style={{ marginTop: 8 }} onClick={() => setCart([])}>
              Очистить корзину
            </Button>
          </div>
        </Col>

        <Modal open={paymentOpen} title="Оплата" onOk={submitSale} onCancel={() => setPaymentOpen(false)}
          okText="Провести продажу" cancelText="Отмена" confirmLoading={submitting} width={420}>
          <Statistic title="К оплате" value={total.toFixed(2)} suffix="₽" style={{ marginBottom: 16 }} />

          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Способ оплаты</Typography.Text>
            <Radio.Group value={payType} onChange={(e) => { setPayType(e.target.value); resetPayState(Math.round(total * 100) / 100); }}>
              <Radio.Button value="cash">Наличные</Radio.Button>
              <Radio.Button value="card">Карта</Radio.Button>
              <Radio.Button value="mixed">Смешанная</Radio.Button>
            </Radio.Group>
          </div>

          {payType === 'cash' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>Принято от покупателя (₽)</Typography.Text>
                <InputNumber
                  value={cashGiven} min={0} step={1} precision={2} style={{ width: '100%' }}
                  onChange={(v) => setCashGiven(v ?? 0)}
                  autoFocus
                />
              </div>
              <div>
                <Typography.Text type="secondary">Сдача</Typography.Text>
                <div style={{ fontSize: 24, fontWeight: 600, color: cashGiven >= total - 0.01 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {Math.max(0, cashGiven - total).toFixed(2)} ₽
                </div>
              </div>
            </>
          )}

          {payType === 'mixed' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>Наличные (₽)</Typography.Text>
                <InputNumber
                  value={mixedCash} min={0} step={0.01} precision={2} style={{ width: '100%' }}
                  onChange={(v) => { const c = Math.max(0, v ?? 0); setMixedCash(c); setMixedCard(Math.max(0, Math.round((total - c) * 100) / 100)); }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>Карта (₽)</Typography.Text>
                <InputNumber
                  value={mixedCard} min={0} step={0.01} precision={2} style={{ width: '100%' }}
                  onChange={(v) => { const c = Math.max(0, v ?? 0); setMixedCard(c); setMixedCash(Math.max(0, Math.round((total - c) * 100) / 100)); }}
                />
              </div>
            </>
          )}
        </Modal>
      </Row>
    </StoreGuard>
  );
}
