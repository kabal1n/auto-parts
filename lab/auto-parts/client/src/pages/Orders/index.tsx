import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Select,
  InputNumber, Input, Drawer, message, AutoComplete, DatePicker, Row, Col, Divider, Radio, Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EyeOutlined, SearchOutlined, EditOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { ordersApi, customersApi, productsApi, stockApi } from '../../api';
import { formatPhone } from '../../utils/phone';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

interface StockInfo { quantity: number; reserved: number; available: number }

const ISSUED_STATUS_ID = 4;
const CANCELLED_STATUS_ID = 5;

interface OrderStatus { order_status_id: number; name: string }
interface Order {
  customer_order_id: number;
  created_at: string;
  subtotal_amount: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  prepayment_amount: number;
  amount_due: number;
  expected_date: string | null;
  notes: string | null;
  customer: { last_name: string; first_name: string; phone: string };
  status: OrderStatus;
  user: { last_name: string; first_name: string };
  car: { car_brand: string; car_model: string } | null;
}
interface OrderDetail extends Order {
  items: Array<{ product: { name: string; article: string | null }; quantity: number; price: number; line_amount: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  'Новый': 'blue', 'В работе': 'orange', 'Готов к выдаче': 'cyan', 'Выдан': 'green', 'Отменён': 'red',
};

function fmt(v: number | string) { return `${Number(v).toFixed(2)} ₽`; }

export default function OrdersPage() {
  const { activeStoreId } = useActiveStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [cartItems, setCartItems] = useState<Array<{ product_id: number; name: string; article: string | null; quantity: number; price: number }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; product: { product_id: number; name: string; article: string | null; price: number } }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string; client_id: number; discount: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedDiscount, setSelectedDiscount] = useState(0);
  const [customerCars, setCustomerCars] = useState<Array<{ car_id: number; car_brand: string; car_model: string; car_year: number | null }>>([]);
  const [notesValue, setNotesValue] = useState('');
  const [stockMap, setStockMap] = useState<Record<number, StockInfo>>({});

  // Detail drawer
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);

  // Edit expected_date / notes modal
  const [editField, setEditField] = useState<'expected_date' | 'notes' | null>(null);
  const [editValue, setEditValue] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Checkout modal
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payType, setPayType] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [cashGiven, setCashGiven] = useState(0);
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedCard, setMixedCard] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const load = async (filter?: number | null) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeStoreId) params.store_id = String(activeStoreId);
      const activeFilter = filter !== undefined ? filter : statusFilter;
      if (activeFilter) params.status_id = String(activeFilter);
      const [o, s] = await Promise.all([ordersApi.list(params), ordersApi.statuses()]);
      setOrders(o.data);
      setStatuses(s.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeStoreId, statusFilter]);

  useEffect(() => {
    if (!activeStoreId) return;
    stockApi.list({ store_id: activeStoreId }).then((res) => {
      const map: Record<number, StockInfo> = {};
      for (const s of res.data) map[s.product_id] = { quantity: s.quantity, reserved: s.reserved_quantity, available: s.available_quantity };
      setStockMap(map);
    }).catch(() => {});
  }, [activeStoreId]);

  const searchProducts = async (val: string) => {
    if (!val) return;
    const res = await productsApi.list({ search: val });
    setProductOptions(res.data.map((p: { product_id: number; name: string; article: string | null; price: number }) => ({
      value: String(p.product_id), label: `${p.name} — ${Number(p.price).toFixed(2)} ₽`, product: p,
    })));
  };

  const searchCustomers = async (val: string) => {
    if (!val) return;
    const res = await customersApi.list({ search: val });
    setCustomerOptions(res.data.map((c: { client_id: number; last_name: string; first_name: string; phone: string; personal_discount_percent: number }) => ({
      value: `${c.last_name} ${c.first_name} — ${formatPhone(c.phone)}`,
      label: `${c.last_name} ${c.first_name} — ${formatPhone(c.phone)}`,
      client_id: c.client_id,
      discount: Number(c.personal_discount_percent),
    })));
  };

  const onCustomerSelect = (val: string) => {
    const found = customerOptions.find((c) => c.value === val);
    if (found) {
      setSelectedClientId(found.client_id);
      setSelectedDiscount(found.discount);
      form.setFieldValue('discount_percent', found.discount);
      form.setFieldValue('car_id', null);
      setCustomerCars([]);
      customersApi.get(found.client_id).then((res) => {
        setCustomerCars(res.data.cars ?? []);
      });
    }
  };

  const addItem = (product: { product_id: number; name: string; article: string | null; price: number }) => {
    setCartItems((prev) => {
      if (prev.find((i) => i.product_id === product.product_id)) return prev;
      return [...prev, { product_id: product.product_id, name: product.name, article: product.article ?? null, quantity: 1, price: product.price }];
    });
  };

  const cartSubtotal = cartItems.reduce((s, i) => s + i.quantity * i.price, 0);
  const discountPct = Form.useWatch('discount_percent', form) ?? selectedDiscount;
  const discountAmt = cartSubtotal * (discountPct / 100);
  const cartTotal = cartSubtotal - discountAmt;
  const prepayment = Form.useWatch('prepayment_amount', form) ?? 0;
  const amountDuePreview = Math.max(0, cartTotal - prepayment);

  const createOrder = async () => {
    const values = await form.validateFields();
    if (!selectedClientId) { message.warning('Выберите клиента из списка'); return; }
    if (!cartItems.length) { message.warning('Добавьте товары'); return; }
    try {
      await ordersApi.create({
        client_id: selectedClientId,
        store_id: activeStoreId,
        car_id: values.car_id || null,
        prepayment_amount: values.prepayment_amount || 0,
        discount_percent: values.discount_percent ?? 0,
        expected_date: values.expected_date ? (values.expected_date as Dayjs).format('YYYY-MM-DD') : null,
        notes: notesValue || null,
        items: cartItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
      });
      message.success('Заказ создан');
      setCreateOpen(false);
      setCartItems([]);
      setProductSearch('');
      setProductOptions([]);
      setSelectedClientId(null);
      setSelectedDiscount(0);
      setCustomerCars([]);
      setNotesValue('');
      form.resetFields();
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка создания заказа');
    }
  };

  const changeStatus = async (id: number, status_id: number) => {
    try {
      await ordersApi.setStatus(id, status_id);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Не удалось изменить статус');
    }
  };

  const viewDetail = async (id: number) => {
    const res = await ordersApi.get(id);
    setDetailOrder(res.data);
  };

  const openEdit = (field: 'expected_date' | 'notes') => {
    if (!detailOrder) return;
    setEditField(field);
    setEditValue(field === 'expected_date' ? detailOrder.expected_date : detailOrder.notes);
  };

  const saveEdit = async () => {
    if (!detailOrder || !editField) return;
    setEditSaving(true);
    try {
      await ordersApi.update(detailOrder.customer_order_id, {
        [editField]: editField === 'expected_date' ? editValue : editValue,
      });
      const refreshed = await ordersApi.get(detailOrder.customer_order_id);
      setDetailOrder(refreshed.data);
      setEditField(null);
      load();
    } catch {
      message.error('Не удалось сохранить');
    } finally { setEditSaving(false); }
  };

  const openCheckout = () => {
    setPayType('cash');
    setCashGiven(0);
    setMixedCash(0);
    setMixedCard(0);
    setCheckoutOpen(true);
  };

  const doCheckout = async () => {
    if (!detailOrder) return;
    let cash = 0, card = 0;
    if (payType === 'cash') {
      if (cashGiven < checkoutAmountDue - 0.01) { message.error('Сумма наличных меньше суммы к оплате'); return; }
      cash = checkoutAmountDue; card = 0;
    } else if (payType === 'card') {
      cash = 0; card = checkoutAmountDue;
    } else {
      if (mixedCash + mixedCard < checkoutAmountDue - 0.01) { message.error('Сумма оплаты меньше итога'); return; }
      cash = mixedCash; card = mixedCard;
    }
    setCheckoutLoading(true);
    try {
      const res = await ordersApi.checkout(detailOrder.customer_order_id, {
        cash_amount: cash, card_amount: card,
      });
      message.success('Продажа оформлена');
      setCheckoutOpen(false);
      setDetailOrder(res.data.order);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка оформления продажи');
    } finally { setCheckoutLoading(false); }
  };

  const isFinished = (o: Order) =>
    o.status.order_status_id === ISSUED_STATUS_ID || o.status.order_status_id === CANCELLED_STATUS_ID;

  const checkoutAmountDue = detailOrder ? Number(detailOrder.amount_due) : 0;

  const columns: ColumnsType<Order> = [
    { title: '№', dataIndex: 'customer_order_id', key: 'id', width: 70 },
    { title: 'Дата', dataIndex: 'created_at', key: 'date', width: 150, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm') },
    { title: 'Клиент', key: 'client', render: (_: unknown, o: Order) => `${o.customer.last_name} ${o.customer.first_name} ${formatPhone(o.customer.phone)}` },
    { title: 'Сумма', dataIndex: 'total_amount', key: 'total', width: 110, render: fmt },
    { title: 'К оплате', dataIndex: 'amount_due', key: 'due', width: 110, render: fmt },
    {
      title: 'Срок', dataIndex: 'expected_date', key: 'expected', width: 110,
      render: (v: string | null) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
    },
    {
      title: 'Статус', key: 'status', width: 170,
      render: (_: unknown, o: Order) => (
        <Select
          value={o.status.order_status_id}
          size="small" style={{ width: 160 }}
          options={statuses.map((s) => ({ value: s.order_status_id, label: <Tag color={STATUS_COLORS[s.name] ?? 'default'}>{s.name}</Tag> }))}
          onChange={(v) => changeStatus(o.customer_order_id, v)}
        />
      ),
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_: unknown, o: Order) => <Button icon={<EyeOutlined />} size="small" onClick={() => viewDetail(o.customer_order_id)} />,
    },
  ];

  return (
    <StoreGuard>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Заказы клиентов</Typography.Title>
        <Select
          placeholder="Все статусы"
          allowClear
          style={{ width: 180 }}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? null)}
          options={statuses.map((s) => ({
            value: s.order_status_id,
            label: <Tag color={STATUS_COLORS[s.name] ?? 'default'}>{s.name}</Tag>,
          }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Новый заказ</Button>
      </div>

      <Table dataSource={orders} columns={columns} rowKey="customer_order_id" loading={loading} size="middle" />

      {/* Create order modal */}
      <Modal open={createOpen} title="Новый заказ клиента" onOk={createOrder} onCancel={() => { setCreateOpen(false); setCartItems([]); setProductSearch(''); setProductOptions([]); setSelectedClientId(null); setSelectedDiscount(0); setCustomerCars([]); setNotesValue(''); form.resetFields(); }}
        width={980}
        okText="Создать" cancelText="Отмена">
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={20} style={{ height: 460 }}>

            {/* Левая колонка — товары */}
            <Col span={14} style={{ borderRight: '1px solid #f0f0f0', paddingRight: 20, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography.Text strong style={{ fontSize: 13, color: '#595959', flexShrink: 0 }}>Товары</Typography.Text>
              <Form.Item style={{ marginTop: 8, marginBottom: 8, flexShrink: 0 }}>
                <AutoComplete
                  value={productSearch}
                  options={productOptions}
                  onChange={(val) => { setProductSearch(val); if (!val) { setProductOptions([]); return; } searchProducts(val); }}
                  onSelect={(_v, opt) => { addItem(opt.product); setProductSearch(''); setProductOptions([]); }}
                  placeholder="Поиск по названию или артикулу..."
                  style={{ width: '100%' }}
                >
                  <Input prefix={<SearchOutlined />} />
                </AutoComplete>
              </Form.Item>

              {/* Заголовки колонок */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 4, paddingRight: 2 }}>
                <Typography.Text type="secondary" style={{ flex: 1, fontSize: 11 }}>Наименование</Typography.Text>
                <Typography.Text type="secondary" style={{ width: 88, fontSize: 11, flexShrink: 0 }}>Артикул</Typography.Text>
                <Typography.Text type="secondary" style={{ width: 70, fontSize: 11, flexShrink: 0 }}>Кол-во</Typography.Text>
                <Typography.Text type="secondary" style={{ width: 85, fontSize: 11, textAlign: 'right', flexShrink: 0 }}>Сумма</Typography.Text>
                <div style={{ width: 24, flexShrink: 0 }} />
              </div>

              {/* Скроллируемый список товаров */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 2 }}>
                {cartItems.length === 0 && (
                  <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', paddingTop: 40, fontSize: 13 }}>
                    Добавьте товары через поиск
                  </Typography.Text>
                )}
                {cartItems.map((item, idx) => {
                  const avail = stockMap[item.product_id]?.available ?? 0;
                  const deficit = Math.max(0, item.quantity - avail);
                  return (
                    <div key={item.product_id}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: deficit > 0 ? 2 : 8, alignItems: 'center' }}>
                        <Typography.Text style={{ flex: 1, fontSize: 13 }} ellipsis={{ tooltip: item.name }}>{item.name}</Typography.Text>
                        <Typography.Text style={{ width: 88, fontSize: 12, color: '#8c8c8c', flexShrink: 0 }} ellipsis={{ tooltip: item.article ?? '—' }}>
                          {item.article || '—'}
                        </Typography.Text>
                        <InputNumber min={1} value={item.quantity} size="small" style={{ width: 70, flexShrink: 0 }}
                          onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, quantity: v ?? 1 } : i))} />
                        <Typography.Text style={{ width: 85, textAlign: 'right', fontSize: 13, flexShrink: 0 }}>
                          {(item.quantity * item.price).toFixed(2)} ₽
                        </Typography.Text>
                        <Button size="small" danger onClick={() => setCartItems((c) => c.filter((_, j) => j !== idx))}>✕</Button>
                      </div>
                      {deficit > 0 && (
                        <div style={{ fontSize: 12, color: '#fa8c16', marginBottom: 6, paddingLeft: 2 }}>
                          {avail === 0
                            ? `Нет в наличии · Будет заказано у поставщика: ${item.quantity} шт`
                            : `В наличии: ${avail} шт · Будет заказано у поставщика: ${deficit} шт`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Блок итогов — всегда внизу */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #f0f0f0', paddingTop: 10, marginTop: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c', marginBottom: 3 }}>
                  <span>Сумма до скидки</span><span>{cartSubtotal.toFixed(2)} ₽</span>
                </div>
                {discountPct > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f5222d', marginBottom: 3 }}>
                    <span>Скидка ({discountPct}%)</span><span>−{discountAmt.toFixed(2)} ₽</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: 3 }}>
                  <span>Итого</span><span>{cartTotal.toFixed(2)} ₽</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c', marginBottom: 3 }}>
                  <span>Предоплата</span><span>{Number(prepayment).toFixed(2)} ₽</span>
                </div>
                <div style={{ borderTop: '1px solid #e8e8e8', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1677ff', fontSize: 14 }}>
                  <span>К оплате</span><span>{amountDuePreview.toFixed(2)} ₽</span>
                </div>
              </div>
            </Col>

            {/* Правая колонка — клиент + условия */}
            <Col span={10} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography.Text strong style={{ fontSize: 13, color: '#595959', flexShrink: 0 }}>Клиент</Typography.Text>
              <Form.Item name="client_id" style={{ marginTop: 8, marginBottom: 8, flexShrink: 0 }}>
                <AutoComplete
                  options={customerOptions}
                  onChange={searchCustomers}
                  onSelect={onCustomerSelect}
                  placeholder="Поиск по имени или телефону"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              {customerCars.length > 0 && (
                <Form.Item name="car_id" label="Автомобиль" style={{ marginBottom: 8, flexShrink: 0 }}>
                  <Select
                    allowClear
                    placeholder="Не указан"
                    options={customerCars.map((c) => ({
                      value: c.car_id,
                      label: `${c.car_brand} ${c.car_model}${c.car_year ? ` (${c.car_year})` : ''}`,
                    }))}
                  />
                </Form.Item>
              )}

              <Divider style={{ margin: '12px 0 8px', flexShrink: 0 }} />
              <Typography.Text strong style={{ fontSize: 13, color: '#595959', flexShrink: 0 }}>Условия заказа</Typography.Text>

              <Row gutter={10} style={{ marginTop: 8, flexShrink: 0 }}>
                <Col span={12}>
                  <Form.Item name="discount_percent" label="Скидка (%)" initialValue={0} style={{ marginBottom: 10 }}>
                    <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="prepayment_amount" label="Предоплата (₽)" initialValue={0} style={{ marginBottom: 10 }}>
                    <InputNumber min={0} step={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="expected_date" label="Дата готовности" style={{ marginBottom: 10, flexShrink: 0 }}>
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              {/* Заметки растягиваются на оставшееся место */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Typography.Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.88)', display: 'block', marginBottom: 8 }}>Заметки</Typography.Text>
                <Input.TextArea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Комментарий к заказу..."
                  style={{ flex: 1, resize: 'none', minHeight: 0 }}
                />
              </div>
            </Col>

          </Row>
        </Form>
      </Modal>

      {/* Detail drawer */}
      <Drawer
        title={detailOrder ? `Заказ №${detailOrder.customer_order_id}` : ''}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        width={600}
        extra={
          detailOrder && !isFinished(detailOrder) && (
            <Button type="primary" icon={<ShoppingCartOutlined />} onClick={openCheckout}>
              Оформить продажу
            </Button>
          )
        }
      >
        {detailOrder && (
          <>
            {/* Клиент */}
            <div style={{ marginBottom: 14 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>Клиент</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Typography.Text strong style={{ fontSize: 15 }}>
                  {detailOrder.customer.last_name} {detailOrder.customer.first_name}
                </Typography.Text>
                <Typography.Text style={{ marginLeft: 12, color: '#595959' }}>
                  {formatPhone(detailOrder.customer.phone)}
                </Typography.Text>
              </div>
              <div style={{ marginTop: 2, color: '#8c8c8c', fontSize: 13 }}>
                {detailOrder.car ? `${detailOrder.car.car_brand} ${detailOrder.car.car_model}` : 'Автомобиль не указан'}
                <span style={{ margin: '0 8px' }}>·</span>
                Создан {dayjs(detailOrder.created_at).format('DD.MM.YYYY HH:mm')}
              </div>
            </div>

            <Divider style={{ margin: '10px 0' }} />

            {/* Статус + Срок */}
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>Статус</Typography.Text>
                <div style={{ marginTop: 6 }}>
                  <Tag color={STATUS_COLORS[detailOrder.status.name]}>{detailOrder.status.name}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>Срок готовности</Typography.Text>
                <div style={{ marginTop: 6 }}>
                  {detailOrder.expected_date
                    ? <span>{dayjs(detailOrder.expected_date).format('DD.MM.YYYY')}</span>
                    : <Typography.Text type="secondary">Не указан</Typography.Text>}
                  {!isFinished(detailOrder) && (
                    <Button size="small" icon={<EditOutlined />} type="text" onClick={() => openEdit('expected_date')} />
                  )}
                </div>
              </Col>
            </Row>

            {/* Заметки */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>Заметки</Typography.Text>
                {!isFinished(detailOrder) && (
                  <Button size="small" icon={<EditOutlined />} type="text" onClick={() => openEdit('notes')} />
                )}
              </div>
              <div style={{ marginTop: 4, color: detailOrder.notes ? '#262626' : '#bfbfbf', whiteSpace: 'pre-wrap', fontSize: 13 }}>
                {detailOrder.notes || 'Нет заметок'}
              </div>
            </div>

            <Divider style={{ margin: '10px 0' }} />

            {/* Расчёт */}
            <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 10 }}>Расчёт</Typography.Text>
              {Number(detailOrder.discount_percent) > 0 && <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#595959' }}>
                  <span>Сумма до скидки</span><span>{fmt(detailOrder.subtotal_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#ff4d4f' }}>
                  <span>Скидка ({Number(detailOrder.discount_percent)}%)</span>
                  <span>−{fmt(detailOrder.discount_amount)}</span>
                </div>
              </>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontWeight: 500 }}>
                <span>Итого</span><span>{fmt(detailOrder.total_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c' }}>
                <span>Предоплата</span><span>{fmt(detailOrder.prepayment_amount)}</span>
              </div>
              <div style={{ borderTop: '2px solid #d9d9d9', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: '#1677ff' }}>
                <span>К оплате</span><span>{fmt(detailOrder.amount_due)}</span>
              </div>
            </div>

            {/* Позиции заказа */}
            <Table
              dataSource={detailOrder.items}
              rowKey={(_, i) => String(i)}
              size="small"
              pagination={false}
              columns={[
                { title: 'Товар', dataIndex: ['product', 'name'], key: 'name', ellipsis: true, minWidth: 160 },
                { title: 'Артикул', key: 'article', width: 80, render: (_: unknown, i) => i.product.article || '—' },
                { title: 'Кол', dataIndex: 'quantity', key: 'qty', width: 45 },
                { title: 'Цена', dataIndex: 'price', key: 'price', width: 80, render: fmt },
                { title: 'Сумма', dataIndex: 'line_amount', key: 'line', width: 80, render: fmt },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* Edit field modal */}
      <Modal
        open={!!editField}
        title={editField === 'expected_date' ? 'Ожидаемая дата готовности' : 'Заметки'}
        onOk={saveEdit}
        onCancel={() => setEditField(null)}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={editSaving}
      >
        {editField === 'expected_date' ? (
          <DatePicker
            style={{ width: '100%' }}
            format="DD.MM.YYYY"
            value={editValue ? dayjs(editValue) : null}
            onChange={(d) => setEditValue(d ? d.format('YYYY-MM-DD') : null)}
          />
        ) : (
          <Input.TextArea
            rows={4}
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value || null)}
            placeholder="Заметки к заказу..."
          />
        )}
      </Modal>

      {/* Checkout modal */}
      <Modal
        open={checkoutOpen}
        title="Оформление продажи"
        onOk={doCheckout}
        onCancel={() => setCheckoutOpen(false)}
        okText="Провести продажу"
        cancelText="Отмена"
        okButtonProps={{ loading: checkoutLoading }}
        width={420}
      >
        {detailOrder && (
          <div>
            <Statistic
              title="К оплате"
              value={Number(detailOrder.amount_due).toFixed(2)}
              suffix="₽"
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Способ оплаты</Typography.Text>
              <Radio.Group
                value={payType}
                onChange={(e) => { setPayType(e.target.value); setCashGiven(0); setMixedCash(0); setMixedCard(0); }}
              >
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
                    value={cashGiven} min={0} step={1} precision={2}
                    style={{ width: '100%' }}
                    onChange={(v) => setCashGiven(v ?? 0)}
                    autoFocus
                  />
                </div>
                <div>
                  <Typography.Text type="secondary">Сдача</Typography.Text>
                  <div style={{ fontSize: 24, fontWeight: 600, color: cashGiven >= checkoutAmountDue - 0.01 ? '#52c41a' : '#ff4d4f' }}>
                    {Math.max(0, cashGiven - checkoutAmountDue).toFixed(2)} ₽
                  </div>
                </div>
              </>
            )}

            {payType === 'card' && (
              <div style={{ padding: '12px 0', color: '#595959' }}>
                Будет проведена оплата картой на сумму <strong>{Number(detailOrder.amount_due).toFixed(2)} ₽</strong>
              </div>
            )}

            {payType === 'mixed' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>Наличные (₽)</Typography.Text>
                  <InputNumber
                    value={mixedCash} min={0} step={0.01} precision={2} style={{ width: '100%' }}
                    onChange={(v) => {
                      const c = Math.max(0, v ?? 0);
                      setMixedCash(c);
                      setMixedCard(Math.max(0, Math.round((checkoutAmountDue - c) * 100) / 100));
                    }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>Карта (₽)</Typography.Text>
                  <InputNumber
                    value={mixedCard} min={0} step={0.01} precision={2} style={{ width: '100%' }}
                    onChange={(v) => {
                      const c = Math.max(0, v ?? 0);
                      setMixedCard(c);
                      setMixedCash(Math.max(0, Math.round((checkoutAmountDue - c) * 100) / 100));
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </StoreGuard>
  );
}
