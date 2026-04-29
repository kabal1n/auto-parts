import { useEffect, useState } from 'react';
import { Table, Typography, Tag, InputNumber, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SaveOutlined } from '@ant-design/icons';
import { stockApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';

interface StockRow {
  stock_id: number;
  quantity: number;
  minimum_quantity: number;
  product: { name: string; article: string | null; unit: string };
  store: { name: string };
}

export default function StockPage() {
  const { isAdmin } = useAuthStore();
  const { activeStoreId } = useActiveStore();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<Record<number, { quantity?: number; minimum_quantity?: number }>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeStoreId) params.store_id = String(activeStoreId);
      const res = await stockApi.list(params);
      setRows(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeStoreId]);

  const saveRow = async (id: number) => {
    if (!edits[id]) return;
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await stockApi.update(id, edits[id]);
      message.success('Остаток обновлён');
      setEdits((e) => { const n = { ...e }; delete n[id]; return n; });
      load();
    } catch {
      message.error('Ошибка сохранения');
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

  const admin = isAdmin();

  const columns: ColumnsType<StockRow> = [
    { title: 'Магазин', dataIndex: ['store', 'name'], key: 'store', width: 160 },
    { title: 'Товар', dataIndex: ['product', 'name'], key: 'name', ellipsis: true },
    { title: 'Артикул', dataIndex: ['product', 'article'], key: 'article', width: 120 },
    { title: 'Ед.', dataIndex: ['product', 'unit'], key: 'unit', width: 60 },
    {
      title: 'Остаток', key: 'quantity', width: 120,
      render: (_: unknown, row: StockRow) => {
        const val = edits[row.stock_id]?.quantity ?? row.quantity;
        const low = val <= row.minimum_quantity;
        if (!admin) return <Tag color={low ? 'red' : 'green'}>{val}</Tag>;
        return (
          <InputNumber value={val} min={0} size="small" style={{ width: 80 }}
            onChange={(v) => setEdits((e) => ({ ...e, [row.stock_id]: { ...e[row.stock_id], quantity: v ?? 0 } }))} />
        );
      },
    },
    {
      title: 'Минимум', key: 'minimum_quantity', width: 120,
      render: (_: unknown, row: StockRow) => {
        const val = edits[row.stock_id]?.minimum_quantity ?? row.minimum_quantity;
        if (!admin) return val;
        return (
          <InputNumber value={val} min={0} size="small" style={{ width: 80 }}
            onChange={(v) => setEdits((e) => ({ ...e, [row.stock_id]: { ...e[row.stock_id], minimum_quantity: v ?? 0 } }))} />
        );
      },
    },
    {
      title: 'Статус', key: 'status', width: 120,
      render: (_: unknown, row: StockRow) => {
        const qty = edits[row.stock_id]?.quantity ?? row.quantity;
        const min = edits[row.stock_id]?.minimum_quantity ?? row.minimum_quantity;
        return qty <= min ? <Tag color="red">Мало</Tag> : <Tag color="green">В норме</Tag>;
      },
    },
    ...(admin ? [{
      title: '', key: 'save', width: 80,
      render: (_: unknown, row: StockRow) => (
        edits[row.stock_id] ? (
          <Button icon={<SaveOutlined />} size="small" type="primary"
            loading={saving[row.stock_id]} onClick={() => saveRow(row.stock_id)} />
        ) : null
      ),
    }] as ColumnsType<StockRow> : []),
  ];

  return (
    <StoreGuard>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Остатки на складе</Typography.Title>
        {admin && (
          <Typography.Text type="secondary" style={{ marginLeft: 'auto', fontSize: 13 }}>
            Редактируйте ячейки и сохраняйте кнопкой
          </Typography.Text>
        )}
      </div>
      <Table dataSource={rows} columns={columns} rowKey="stock_id" loading={loading}
        size="middle" pagination={{ pageSize: 50 }} />
    </StoreGuard>
  );
}
