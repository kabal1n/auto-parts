import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Modal, Form, Input, InputNumber,
  AutoComplete, Descriptions, Drawer, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { receiptsApi, productsApi } from '../../api';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';
import dayjs from 'dayjs';

interface Receipt {
  receipt_id: number;
  receipt_datetime: string;
  note: string | null;
  user: { last_name: string; first_name: string };
  store: { name: string };
  items: Array<{ product: { name: string }; quantity: number; purchase_price: number; sale_price: number }>;
}

export default function ReceiptsPage() {
  const { activeStoreId } = useActiveStore();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [cartItems, setCartItems] = useState<Array<{ product_id: number; name: string; quantity: number; purchase_price: number; sale_price: number }>>([]);
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; product: { product_id: number; name: string; price: number } }[]>([]);
  const [detail, setDetail] = useState<Receipt | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeStoreId) params.store_id = String(activeStoreId);
      const res = await receiptsApi.list(params);
      setReceipts(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeStoreId]);

  const searchProducts = async (val: string) => {
    if (!val) return;
    const res = await productsApi.list({ search: val });
    setProductOptions(res.data.map((p: { product_id: number; name: string; price: number }) => ({
      value: String(p.product_id), label: p.name, product: p,
    })));
  };

  const addItem = (product: { product_id: number; name: string; price: number }) => {
    if (cartItems.find((i) => i.product_id === product.product_id)) return;
    setCartItems((c) => [...c, { product_id: product.product_id, name: product.name, quantity: 1, purchase_price: 0, sale_price: Number(product.price) }]);
  };

  const create = async () => {
    if (!cartItems.length) { message.warning('Добавьте товары'); return; }
    const values = await form.validateFields();
    try {
      await receiptsApi.create({ store_id: activeStoreId, note: values.note, items: cartItems });
      message.success('Поступление оформлено');
      setCreateOpen(false);
      setCartItems([]);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка');
    }
  };

  const viewDetail = async (id: number) => {
    const res = await receiptsApi.get(id);
    setDetail(res.data);
  };

  const columns: ColumnsType<Receipt> = [
    { title: '№', dataIndex: 'receipt_id', key: 'id', width: 70 },
    { title: 'Дата', dataIndex: 'receipt_datetime', key: 'date', width: 170, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm') },
    { title: 'Магазин', dataIndex: ['store', 'name'], key: 'store' },
    { title: 'Сотрудник', key: 'user', render: (_: unknown, r: Receipt) => `${r.user.last_name} ${r.user.first_name}` },
    { title: 'Товаров', key: 'count', width: 90, render: (_: unknown, r: Receipt) => r.items.length },
    { title: 'Примечание', dataIndex: 'note', key: 'note', ellipsis: true },
    { title: '', key: 'act', width: 60, render: (_: unknown, r: Receipt) => <Button icon={<EyeOutlined />} size="small" onClick={() => viewDetail(r.receipt_id)} /> },
  ];

  return (
    <StoreGuard>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Поступления товаров</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Оформить поступление</Button>
      </div>

      <Table dataSource={receipts} columns={columns} rowKey="receipt_id" loading={loading} size="middle" />

      <Modal open={createOpen} title="Поступление товаров" onOk={create} onCancel={() => setCreateOpen(false)}
        okText="Оформить" cancelText="Отмена" width={620}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Добавить товар">
            <AutoComplete options={productOptions} onChange={searchProducts} onSelect={(_v, opt) => addItem(opt.product)} placeholder="Поиск...">
              <Input prefix={<SearchOutlined />} />
            </AutoComplete>
          </Form.Item>
          {cartItems.map((item, idx) => (
            <div key={item.product_id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Typography.Text style={{ flex: 1 }} ellipsis>{item.name}</Typography.Text>
              <InputNumber placeholder="Кол-во" min={1} value={item.quantity} size="small" style={{ width: 70 }}
                onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, quantity: v ?? 1 } : i))} />
              <InputNumber placeholder="Закуп. ₽" min={0} step={0.01} precision={2} value={item.purchase_price} size="small" style={{ width: 90 }}
                onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, purchase_price: v ?? 0 } : i))} />
              <InputNumber placeholder="Продажа ₽" min={0} step={0.01} precision={2} value={item.sale_price} size="small" style={{ width: 90 }}
                onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, sale_price: v ?? 0 } : i))} />
              <Button size="small" danger onClick={() => setCartItems((c) => c.filter((_, j) => j !== idx))}>✕</Button>
            </div>
          ))}
          <Form.Item name="note" label="Примечание" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title={detail ? `Поступление №${detail.receipt_id}` : ''} open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Дата">{dayjs(detail.receipt_datetime).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Магазин">{detail.store.name}</Descriptions.Item>
              <Descriptions.Item label="Сотрудник">{detail.user.last_name} {detail.user.first_name}</Descriptions.Item>
              {detail.note && <Descriptions.Item label="Примечание">{detail.note}</Descriptions.Item>}
            </Descriptions>
            <Table dataSource={detail.items} rowKey={(_, i) => String(i)} size="small" pagination={false}
              columns={[
                { title: 'Товар', dataIndex: ['product', 'name'], key: 'n', ellipsis: true },
                { title: 'Кол', dataIndex: 'quantity', key: 'q', width: 55 },
                { title: 'Закуп.', dataIndex: 'purchase_price', key: 'pp', width: 80, render: (v: number) => `${Number(v).toFixed(2)} ₽` },
                { title: 'Продажа', dataIndex: 'sale_price', key: 'sp', width: 85, render: (v: number) => `${Number(v).toFixed(2)} ₽` },
              ]}
            />
          </>
        )}
      </Drawer>
    </StoreGuard>
  );
}
