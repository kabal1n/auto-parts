import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, InputNumber,
  Input, AutoComplete, Popconfirm, Select, Space, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, CheckOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { reorderApi, productsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';
import dayjs from 'dayjs';

interface Entry {
  reorder_entry_id: number;
  created_at: string;
  required_quantity: number;
  comment: string | null;
  status: 'ACTIVE' | 'PROCESSED';
  product: { name: string; article: string | null };
  store: { name: string };
  user: { last_name: string; first_name: string };
}

export default function ReorderPage() {
  const { isAdmin } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; product_id: number }[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | undefined>('ACTIVE');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (activeStoreId) params.store_id = String(activeStoreId);
      const res = await reorderApi.list(params);
      setEntries(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus, activeStoreId]);

  const searchProducts = async (val: string) => {
    if (!val) return;
    const res = await productsApi.list({ search: val });
    setProductOptions(res.data.map((p: { product_id: number; name: string }) => ({
      value: String(p.product_id), label: p.name, product_id: p.product_id,
    })));
  };

  const create = async () => {
    const values = await form.validateFields();
    try {
      await reorderApi.create({ ...values, store_id: activeStoreId });
      message.success('Заявка создана');
      setCreateOpen(false);
      form.resetFields();
      load();
    } catch { message.error('Ошибка создания заявки'); }
  };

  const admin = isAdmin();

  const columns: ColumnsType<Entry> = [
    { title: '№', dataIndex: 'reorder_entry_id', key: 'id', width: 60 },
    { title: 'Дата', dataIndex: 'created_at', key: 'date', width: 160, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm') },
    { title: 'Товар', dataIndex: ['product', 'name'], key: 'product', ellipsis: true },
    { title: 'Артикул', dataIndex: ['product', 'article'], key: 'article', width: 120 },
    { title: 'Кол-во', dataIndex: 'required_quantity', key: 'qty', width: 80 },
    { title: 'Магазин', dataIndex: ['store', 'name'], key: 'store', width: 130 },
    { title: 'Комментарий', dataIndex: 'comment', key: 'comment', ellipsis: true },
    {
      title: 'Статус', key: 'status', width: 120,
      render: (_: unknown, e: Entry) => (
        <Tag color={e.status === 'ACTIVE' ? 'orange' : 'green'}>
          {e.status === 'ACTIVE' ? 'Активна' : 'Исполнена'}
        </Tag>
      ),
    },
    ...(admin ? [{
      title: '', key: 'actions', width: 100,
      render: (_: unknown, e: Entry) => (
        e.status === 'ACTIVE' ? (
          <Space.Compact size="small">
            <Button icon={<CheckOutlined />}
              onClick={async () => { await reorderApi.setStatus(e.reorder_entry_id, 'PROCESSED'); load(); }} />
            <Popconfirm title="Удалить заявку?"
              onConfirm={async () => { await reorderApi.remove(e.reorder_entry_id); load(); }}>
              <Button icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space.Compact>
        ) : null
      ),
    }] as ColumnsType<Entry> : []),
  ];

  return (
    <StoreGuard>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Заявки на закупку</Typography.Title>
        <Select value={filterStatus} onChange={setFilterStatus} allowClear placeholder="Все статусы"
          style={{ width: 160 }}
          options={[{ value: 'ACTIVE', label: 'Активные' }, { value: 'PROCESSED', label: 'Исполненные' }]} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Создать заявку
        </Button>
      </div>

      <Table dataSource={entries} columns={columns} rowKey="reorder_entry_id" loading={loading} size="middle" />

      <Modal open={createOpen} title="Новая заявка на закупку" onOk={create}
        onCancel={() => setCreateOpen(false)} okText="Создать" cancelText="Отмена">
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="product_id" label="Товар" rules={[{ required: true }]}>
            <AutoComplete options={productOptions} onChange={searchProducts}
              onSelect={(v) => form.setFieldValue('product_id', Number(v))} placeholder="Поиск товара...">
              <Input prefix={<SearchOutlined />} />
            </AutoComplete>
          </Form.Item>
          <Form.Item name="required_quantity" label="Необходимое количество" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </StoreGuard>
  );
}
