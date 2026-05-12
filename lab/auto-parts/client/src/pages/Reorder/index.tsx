import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, InputNumber,
  Input, AutoComplete, Popconfirm, Select, Space, message, Drawer, Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, CheckOutlined, DeleteOutlined,
  SearchOutlined, MinusCircleOutlined, EyeOutlined,
} from '@ant-design/icons';
import { reorderApi, productsApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';
import dayjs from 'dayjs';

interface ReorderItem {
  item_id: number;
  required_quantity: number;
  product: { name: string; article: string | null };
}

interface ReorderRequest {
  reorder_request_id: number;
  created_at: string;
  comment: string | null;
  status: 'ACTIVE' | 'PROCESSED';
  store: { name: string };
  user: { last_name: string; first_name: string };
  items: ReorderItem[];
}

interface FormItem {
  key: number;
  product_id: number | null;
  product_name: string;
  required_quantity: number;
}

type ProductOption = { value: string; label: string; product_id: number };

export default function ReorderPage() {
  const { isAdmin } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [requests, setRequests] = useState<ReorderRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [formItems, setFormItems] = useState<FormItem[]>([
    { key: 0, product_id: null, product_name: '', required_quantity: 1 },
  ]);
  const [productOptions, setProductOptions] = useState<Record<number, ProductOption[]>>({});
  const [filterStatus, setFilterStatus] = useState<string | undefined>('ACTIVE');
  const [nextKey, setNextKey] = useState(1);

  const [selectedRequest, setSelectedRequest] = useState<ReorderRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (activeStoreId) params.store_id = String(activeStoreId);
      const res = await reorderApi.list(params);
      setRequests(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus, activeStoreId]);

  const searchProducts = async (val: string, key: number) => {
    if (!val || val.length < 2) { setProductOptions((p) => ({ ...p, [key]: [] })); return; }
    const res = await productsApi.list({ search: val });
    setProductOptions((p) => ({
      ...p,
      [key]: res.data.map((prod: { product_id: number; name: string; article: string | null }) => ({
        value: prod.name,
        label: prod.article ? `${prod.name} (${prod.article})` : prod.name,
        product_id: prod.product_id,
      })),
    }));
  };

  const addItem = () => {
    setFormItems((prev) => [...prev, { key: nextKey, product_id: null, product_name: '', required_quantity: 1 }]);
    setNextKey((k) => k + 1);
  };

  const removeItem = (key: number) => setFormItems((prev) => prev.filter((i) => i.key !== key));

  const updateItem = (key: number, patch: Partial<FormItem>) =>
    setFormItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const openCreate = () => {
    setComment('');
    setFormItems([{ key: 0, product_id: null, product_name: '', required_quantity: 1 }]);
    setNextKey(1);
    setProductOptions({});
    setCreateOpen(true);
  };

  const hasUnconfirmed = formItems.some((i) => i.product_name && !i.product_id);

  const create = async () => {
    if (hasUnconfirmed) { message.warning('Выберите товар из списка для каждой позиции'); return; }
    const valid = formItems.filter((i) => i.product_id && i.required_quantity > 0);
    if (!valid.length) { message.warning('Добавьте хотя бы один товар'); return; }
    try {
      await reorderApi.create({
        store_id: activeStoreId,
        comment: comment || undefined,
        items: valid.map((i) => ({ product_id: i.product_id, required_quantity: i.required_quantity })),
      });
      message.success('Заявка создана');
      setCreateOpen(false);
      load();
    } catch { message.error('Ошибка создания заявки'); }
  };

  const handleProcessed = async () => {
    if (!selectedRequest) return;
    try {
      await reorderApi.setStatus(selectedRequest.reorder_request_id, 'PROCESSED');
      message.success('Заявка отмечена исполненной');
      setDrawerOpen(false);
      load();
    } catch { message.error('Ошибка обновления статуса'); }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    try {
      await reorderApi.remove(selectedRequest.reorder_request_id);
      message.success('Заявка удалена');
      setDrawerOpen(false);
      load();
    } catch { message.error('Ошибка удаления заявки'); }
  };

  const admin = isAdmin();

  const columns: ColumnsType<ReorderRequest> = [
    { title: '№', dataIndex: 'reorder_request_id', key: 'id', width: 60 },
    {
      title: 'Дата', dataIndex: 'created_at', key: 'date', width: 155,
      render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Создал', key: 'user', width: 170,
      render: (_: unknown, r: ReorderRequest) => `${r.user.last_name} ${r.user.first_name}`,
    },
    {
      title: 'Позиций', key: 'cnt', width: 85,
      render: (_: unknown, r: ReorderRequest) => r.items.length,
    },
    { title: 'Комментарий', dataIndex: 'comment', key: 'comment', ellipsis: true },
    {
      title: 'Статус', key: 'status', width: 120,
      render: (_: unknown, r: ReorderRequest) => (
        <Tag color={r.status === 'ACTIVE' ? 'orange' : 'green'}>
          {r.status === 'ACTIVE' ? 'Активна' : 'Исполнена'}
        </Tag>
      ),
    },
    {
      title: '', key: 'view', width: 48,
      render: (_: unknown, r: ReorderRequest) => (
        <Button
          size="small" icon={<EyeOutlined />}
          onClick={(e) => { e.stopPropagation(); setSelectedRequest(r); setDrawerOpen(true); }}
        />
      ),
    },
  ];

  const itemColumns: ColumnsType<ReorderItem> = [
    { title: 'Товар', dataIndex: ['product', 'name'], key: 'name', ellipsis: true },
    { title: 'Артикул', dataIndex: ['product', 'article'], key: 'article', width: 130, render: (v: string | null) => v || '—' },
    { title: 'Количество', dataIndex: 'required_quantity', key: 'qty', width: 120 },
  ];

  return (
    <StoreGuard>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Заявки на закупку</Typography.Title>
        <Select
          value={filterStatus} onChange={setFilterStatus} allowClear
          placeholder="Все статусы" style={{ width: 160 }}
          options={[{ value: 'ACTIVE', label: 'Активные' }, { value: 'PROCESSED', label: 'Исполненные' }]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Создать заявку
        </Button>
      </div>

      <Table
        dataSource={requests}
        columns={columns}
        rowKey="reorder_request_id"
        loading={loading}
        size="middle"
        onRow={(r: ReorderRequest) => ({
          onClick: () => { setSelectedRequest(r); setDrawerOpen(true); },
          style: { cursor: 'pointer' },
        })}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedRequest ? `Заявка #${selectedRequest.reorder_request_id}` : ''}
        width={520}
        footer={admin && selectedRequest?.status === 'ACTIVE' ? (
          <Space>
            <Button icon={<CheckOutlined />} onClick={handleProcessed}>
              Отметить исполненной
            </Button>
            <Popconfirm title="Удалить заявку?" okText="Удалить" cancelText="Отмена" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>Удалить</Button>
            </Popconfirm>
          </Space>
        ) : null}
      >
        {selectedRequest && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Дата">
                {dayjs(selectedRequest.created_at).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Магазин">{selectedRequest.store.name}</Descriptions.Item>
              <Descriptions.Item label="Создал">
                {selectedRequest.user.last_name} {selectedRequest.user.first_name}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={selectedRequest.status === 'ACTIVE' ? 'orange' : 'green'}>
                  {selectedRequest.status === 'ACTIVE' ? 'Активна' : 'Исполнена'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {selectedRequest.comment && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Комментарий</Typography.Text>
                <div style={{ marginTop: 4, padding: '8px 12px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <Typography.Text>{selectedRequest.comment}</Typography.Text>
                </div>
              </div>
            )}

            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              Позиции ({selectedRequest.items.length})
            </Typography.Text>
            <Table
              dataSource={selectedRequest.items}
              columns={itemColumns}
              rowKey="item_id"
              size="small"
              pagination={false}
            />
          </>
        )}
      </Drawer>

      <Modal
        open={createOpen}
        title="Новая заявка на закупку"
        onOk={create}
        onCancel={() => setCreateOpen(false)}
        okText="Создать"
        cancelText="Отмена"
        okButtonProps={{ disabled: hasUnconfirmed }}
        width={620}
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong>Комментарий</Typography.Text>
            <Input.TextArea
              rows={2} value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Необязательно"
              style={{ marginTop: 4 }}
            />
          </div>

          <Typography.Text strong>
            Позиции заявки <Typography.Text type="danger">*</Typography.Text>
          </Typography.Text>

          <div style={{ marginTop: 8 }}>
            {formItems.map((item) => (
              <div key={item.key} style={{ display: 'flex', gap: 8, marginBottom: item.product_name && !item.product_id ? 0 : 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <AutoComplete
                  value={item.product_name}
                  options={productOptions[item.key] ?? []}
                  onChange={(val) => {
                    updateItem(item.key, { product_name: val, product_id: null });
                    searchProducts(val, item.key);
                  }}
                  onSelect={(val, opt) => updateItem(item.key, {
                    product_id: (opt as ProductOption).product_id,
                    product_name: val,
                  })}
                  style={{ flex: 1 }}
                >
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Поиск товара по названию или артикулу"
                    status={item.product_name && !item.product_id ? 'error' : ''}
                  />
                </AutoComplete>
                <InputNumber
                  min={1} value={item.required_quantity}
                  onChange={(v) => updateItem(item.key, { required_quantity: v ?? 1 })}
                  placeholder="шт" style={{ width: 110 }}
                />
                {formItems.length > 1 && (
                  <Button
                    icon={<MinusCircleOutlined />} danger type="text"
                    onClick={() => removeItem(item.key)}
                  />
                )}
                {item.product_name && !item.product_id && (
                  <Typography.Text type="danger" style={{ fontSize: 12, width: '100%', marginTop: -4, marginBottom: 4 }}>
                    Выберите товар из выпадающего списка
                  </Typography.Text>
                )}
              </div>
            ))}
            <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginTop: 4 }}>
              Добавить позицию
            </Button>
          </div>
        </div>
      </Modal>
    </StoreGuard>
  );
}
