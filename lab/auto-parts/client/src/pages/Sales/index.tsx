import { useEffect, useRef, useState } from 'react';
import {
  Row, Col, Input, Button, Table, InputNumber, Typography,
  Space, Flex, Divider, Modal, Form, Radio, Statistic, message, Tag, AutoComplete,
} from 'antd';
import { DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { productsApi, customersApi, salesApi } from '../../api';
import { maskPhone, normalizePhone } from '../../utils/phone';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';

interface Product { product_id: number; name: string; price: number; unit: string; barcode: string | null; article: string | null }
interface CartItem extends Product { quantity: number }
interface Customer { client_id: number; last_name: string; first_name: string; phone: string; personal_discount_percent: number }

export default function SalesPage() {
  const { activeStoreId } = useActiveStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; product: Product }[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payForm] = Form.useForm();
  const [payType, setPayType] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [submitting, setSubmitting] = useState(false);

  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        const barcode = barcodeBuffer.current;
        barcodeBuffer.current = '';
        productsApi.byBarcode(barcode)
          .then((res) => addToCart(res.data))
          .catch(() => message.warning(`Товар со штрих-кодом ${barcode} не найден`));
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 80);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart]);

  const searchProducts = async (val: string) => {
    if (!val) { setProductOptions([]); return; }
    const res = await productsApi.list({ search: val });
    setProductOptions(
      res.data.map((p: Product) => ({
        value: String(p.product_id),
        label: `${p.name} — ${Number(p.price).toFixed(2)} ₽`,
        product: p,
      })),
    );
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) return prev.map((i) => i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
    setProductSearch('');
    setProductOptions([]);
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) { setCart((c) => c.filter((i) => i.product_id !== id)); return; }
    setCart((c) => c.map((i) => i.product_id === id ? { ...i, quantity: qty } : i));
  };

  const searchCustomer = async () => {
    if (!customerSearch) return;
    try {
      const res = await customersApi.byPhone(normalizePhone(customerSearch));
      setCustomer(res.data);
    } catch {
      message.warning('Клиент не найден');
      setCustomer(null);
    }
  };

  const discount = customer ? Number(customer.personal_discount_percent) : 0;
  const subtotal = cart.reduce((s, i) => s + i.quantity * Number(i.price), 0);
  const discountAmt = subtotal * (discount / 100);
  const total = subtotal - discountAmt;

  const openPayment = () => {
    if (!cart.length) { message.warning('Добавьте товары в корзину'); return; }
    payForm.setFieldsValue({ cash_amount: total.toFixed(2), card_amount: 0 });
    setPaymentOpen(true);
  };

  const submitSale = async () => {
    const values = await payForm.validateFields();
    const cash = payType === 'card' ? 0 : Number(values.cash_amount || 0);
    const card = payType === 'cash' ? 0 : Number(values.card_amount || 0);
    if (cash + card < total - 0.01) { message.error('Сумма оплаты меньше итога'); return; }

    setSubmitting(true);
    try {
      await salesApi.create({
        store_id: activeStoreId,
        client_id: customer?.client_id,
        discount_percent: discount,
        cash_amount: cash,
        card_amount: card,
        items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: Number(i.price) })),
      });
      message.success('Продажа оформлена');
      setCart([]);
      setCustomer(null);
      setCustomerSearch('');
      setPaymentOpen(false);
      payForm.resetFields();
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
        <InputNumber min={0} value={item.quantity} size="small" style={{ width: 80 }}
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
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Typography.Text strong>Клиент (необязательно)</Typography.Text>
            <Space.Compact style={{ width: '100%', marginTop: 8, marginBottom: 12 }}>
              <Input prefix={<UserOutlined />} placeholder="+7 (999) 999-99-99" maxLength={18}
                value={customerSearch} onChange={(e) => setCustomerSearch(maskPhone(e.target.value))} onPressEnter={searchCustomer} />
              <Button onClick={searchCustomer}>Найти</Button>
            </Space.Compact>

            {customer && (
              <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
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
          <Form form={payForm} layout="vertical">
            <Form.Item label="Способ оплаты">
              <Radio.Group value={payType} onChange={(e) => setPayType(e.target.value)}>
                <Radio.Button value="cash">Наличные</Radio.Button>
                <Radio.Button value="card">Карта</Radio.Button>
                <Radio.Button value="mixed">Смешанная</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {payType !== 'card' && (
              <Form.Item name="cash_amount" label="Наличные (₽)">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            )}
            {payType !== 'cash' && (
              <Form.Item name="card_amount" label="Карта (₽)">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </Row>
    </StoreGuard>
  );
}
