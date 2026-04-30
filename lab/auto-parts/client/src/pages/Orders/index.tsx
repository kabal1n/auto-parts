import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Select,
  InputNumber, Input, Descriptions, Drawer, message, AutoComplete,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { ordersApi, customersApi, productsApi } from '../../api';
import { formatPhone } from '../../utils/phone';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';
import dayjs from 'dayjs';

interface OrderStatus { order_status_id: number; name: string }
interface Order {
  customer_order_id: number;
  created_at: string;
  total_amount: number;
  prepayment_amount: number;
  amount_due: number;
  customer: { last_name: string; first_name: string; phone: string };
  status: OrderStatus;
  user: { last_name: string; first_name: string };
  car: { car_brand: string; car_model: string } | null;
}
interface OrderDetail extends Order {
  items: Array<{ product: { name: string }; quantity: number; price: number; line_amount: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  'Новый': 'blue', 'В работе': 'orange', 'Готов к выдаче': 'cyan', 'Выдан': 'green', 'Отменён': 'red',
};

export default function OrdersPage() {
  const { activeStoreId } = useActiveStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [cartItems, setCartItems] = useState<Array<{ product_id: number; name: string; quantity: number; price: number }>>([]);
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; product: { product_id: number; name: string; price: number } }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string; client_id: number }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeStoreId) params.store_id = String(activeStoreId);
      const [o, s] = await Promise.all([ordersApi.list(params), ordersApi.statuses()]);
      setOrders(o.data);
      setStatuses(s.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeStoreId]);

  const searchProducts = async (val: string) => {
    if (!val) return;
    const res = await productsApi.list({ search: val });
    setProductOptions(res.data.map((p: { product_id: number; name: string; price: number }) => ({
      value: String(p.product_id), label: `${p.name} — ${Number(p.price).toFixed(2)} ₽`, product: p,
    })));
  };

  const searchCustomers = async (val: string) => {
    if (!val) return;
    const res = await customersApi.list({ search: val });
    setCustomerOptions(res.data.map((c: { client_id: number; last_name: string; first_name: string; phone: string }) => ({
      value: String(c.client_id),
      label: `${c.last_name} ${c.first_name} — ${formatPhone(c.phone)}`,
      client_id: c.client_id,
    })));
  };

  const addItem = (product: { product_id: number; name: string; price: number }) => {
    setCartItems((prev) => {
      if (prev.find((i) => i.product_id === product.product_id)) return prev;
      return [...prev, { product_id: product.product_id, name: product.name, quantity: 1, price: product.price }];
    });
  };

  const createOrder = async () => {
    const values = await form.validateFields();
    if (!cartItems.length) { message.warning('Добавьте товары'); return; }
    try {
      await ordersApi.create({
        client_id: Number(values.client_id),
        store_id: activeStoreId,
        car_id: values.car_id || null,
        prepayment_amount: values.prepayment_amount || 0,
        items: cartItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
      });
      message.success('Заказ создан');
      setCreateOpen(false);
      setCartItems([]);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка создания заказа');
    }
  };

  const changeStatus = async (id: number, status_id: number) => {
    await ordersApi.setStatus(id, status_id);
    load();
  };

  const viewDetail = async (id: number) => {
    const res = await ordersApi.get(id);
    setDetailOrder(res.data);
  };

  const columns: ColumnsType<Order> = [
    { title: '№', dataIndex: 'customer_order_id', key: 'id', width: 70 },
    { title: 'Дата', dataIndex: 'created_at', key: 'date', width: 160, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm') },
    { title: 'Клиент', key: 'client', render: (_: unknown, o: Order) => `${o.customer.last_name} ${o.customer.first_name} ${formatPhone(o.customer.phone)}` },
    { title: 'Сумма', dataIndex: 'total_amount', key: 'total', width: 110, render: (v: number) => `${Number(v).toFixed(2)} ₽` },
    { title: 'К оплате', dataIndex: 'amount_due', key: 'due', width: 110, render: (v: number) => `${Number(v).toFixed(2)} ₽` },
    {
      title: 'Статус', key: 'status', width: 160,
      render: (_: unknown, o: Order) => (
        <Select
          value={o.status.order_status_id}
          size="small" style={{ width: 150 }}
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
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Заказы клиентов</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Новый заказ</Button>
      </div>

      <Table dataSource={orders} columns={columns} rowKey="customer_order_id" loading={loading} size="middle" />

      <Modal open={createOpen} title="Новый заказ клиента" onOk={createOrder} onCancel={() => setCreateOpen(false)}
        okText="Создать" cancelText="Отмена" width={580}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="client_id" label="Клиент" rules={[{ required: true, message: 'Выберите клиента' }]}>
            <AutoComplete
              options={customerOptions}
              onChange={searchCustomers}
              onSelect={(v) => form.setFieldValue('client_id', v)}
              placeholder="Поиск по имени или телефону"
            />
          </Form.Item>
          <Form.Item label="Добавить товары">
            <AutoComplete
              options={productOptions}
              onChange={searchProducts}
              onSelect={(_v, opt) => addItem(opt.product)}
              placeholder="Поиск товара..."
            >
              <Input prefix={<SearchOutlined />} />
            </AutoComplete>
          </Form.Item>
          {cartItems.map((item, idx) => (
            <div key={item.product_id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Typography.Text style={{ flex: 1 }}>{item.name}</Typography.Text>
              <InputNumber min={1} value={item.quantity} size="small" style={{ width: 70 }}
                onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, quantity: v ?? 1 } : i))} />
              <Typography.Text style={{ width: 80, textAlign: 'right' }}>{(item.quantity * item.price).toFixed(2)} ₽</Typography.Text>
              <Button size="small" danger onClick={() => setCartItems((c) => c.filter((_, j) => j !== idx))}>✕</Button>
            </div>
          ))}
          <Form.Item name="prepayment_amount" label="Предоплата (₽)" initialValue={0}>
            <InputNumber min={0} step={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title={detailOrder ? `Заказ №${detailOrder.customer_order_id}` : ''} open={!!detailOrder}
        onClose={() => setDetailOrder(null)} width={480}>
        {detailOrder && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Клиент">{detailOrder.customer.last_name} {detailOrder.customer.first_name}</Descriptions.Item>
              <Descriptions.Item label="Телефон">{formatPhone(detailOrder.customer.phone)}</Descriptions.Item>
              <Descriptions.Item label="Автомобиль">{detailOrder.car ? `${detailOrder.car.car_brand} ${detailOrder.car.car_model}` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Создан">{dayjs(detailOrder.created_at).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Статус"><Tag color={STATUS_COLORS[detailOrder.status.name]}>{detailOrder.status.name}</Tag></Descriptions.Item>
              <Descriptions.Item label="Итого">{Number(detailOrder.total_amount).toFixed(2)} ₽</Descriptions.Item>
              <Descriptions.Item label="Предоплата">{Number(detailOrder.prepayment_amount).toFixed(2)} ₽</Descriptions.Item>
              <Descriptions.Item label="К оплате">{Number(detailOrder.amount_due).toFixed(2)} ₽</Descriptions.Item>
            </Descriptions>
            <Table dataSource={detailOrder.items} rowKey={(_, i) => String(i)} size="small" pagination={false}
              columns={[
                { title: 'Товар', dataIndex: ['product', 'name'], key: 'name', ellipsis: true },
                { title: 'Кол', dataIndex: 'quantity', key: 'qty', width: 60 },
                { title: 'Цена', dataIndex: 'price', key: 'price', width: 90, render: (v: number) => `${Number(v).toFixed(2)} ₽` },
                { title: 'Сумма', dataIndex: 'line_amount', key: 'line', width: 90, render: (v: number) => `${Number(v).toFixed(2)} ₽` },
              ]}
            />
          </>
        )}
      </Drawer>
    </StoreGuard>
  );
}
