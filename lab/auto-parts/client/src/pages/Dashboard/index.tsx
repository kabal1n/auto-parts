import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Tag } from 'antd';
import {
  ShoppingCartOutlined,
  WarningOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { reportsApi, stockApi, salesApi } from '../../api';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';

interface SalesTotals { count: number; subtotal: number; discount: number; total: number; cash: number; card: number }
interface LowStockItem { stock_id: number; quantity: number; minimum_quantity: number; product: { name: string; article: string | null } }
interface RecentSale { sale_id: number; sale_datetime: string; total_amount: number; cash_amount: number; card_amount: number; customer: { last_name: string; first_name: string } | null; items: unknown[] }

export default function DashboardPage() {
  const { activeStoreId } = useActiveStore();
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeStoreId) return;
    setLoading(true);
    const storeParam = { store_id: String(activeStoreId) };
    const todayFrom = dayjs().startOf('day').toISOString();
    const todayTo = dayjs().endOf('day').toISOString();

    Promise.all([
      reportsApi.sales({ ...storeParam, from: todayFrom, to: todayTo }),
      stockApi.low(storeParam),
      salesApi.list({ ...storeParam, from: todayFrom, to: todayTo }),
    ])
      .then(([repRes, lowRes, salesRes]) => {
        setTotals(repRes.data.totals);
        setLowStock(lowRes.data);
        setRecentSales(salesRes.data.slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, [activeStoreId]);

  const lowStockColumns: ColumnsType<LowStockItem> = [
    { title: 'Товар', dataIndex: ['product', 'name'], key: 'name', ellipsis: true },
    { title: 'Артикул', dataIndex: ['product', 'article'], key: 'article', width: 120 },
    {
      title: 'Остаток', key: 'qty', width: 90,
      render: (_: unknown, r: LowStockItem) => (
        <Tag color="red">{r.quantity}</Tag>
      ),
    },
    {
      title: 'Минимум', dataIndex: 'minimum_quantity', key: 'min', width: 90,
    },
  ];

  const salesColumns: ColumnsType<RecentSale> = [
    {
      title: 'Время', dataIndex: 'sale_datetime', key: 'dt', width: 140,
      render: (v: string) => dayjs(v).format('HH:mm'),
    },
    {
      title: 'Клиент', key: 'customer', width: 180,
      render: (_: unknown, r: RecentSale) =>
        r.customer ? `${r.customer.last_name} ${r.customer.first_name}` : '—',
    },
    {
      title: 'Сумма', dataIndex: 'total_amount', key: 'total', width: 120,
      render: (v: number) => `${Number(v).toFixed(2)} ₽`,
    },
    {
      title: 'Оплата', key: 'pay', width: 140,
      render: (_: unknown, r: RecentSale) => (
        <span style={{ fontSize: 12 }}>
          {Number(r.cash_amount) > 0 && `Нал ${Number(r.cash_amount).toFixed(2)} `}
          {Number(r.card_amount) > 0 && `Карта ${Number(r.card_amount).toFixed(2)}`}
        </span>
      ),
    },
  ];

  return (
    <StoreGuard>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>Главная</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Продаж сегодня"
              value={totals?.count ?? 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Выручка сегодня"
              value={totals ? Number(totals.total).toFixed(2) : '0.00'}
              suffix="₽"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Наличными сегодня"
              value={totals ? Number(totals.cash).toFixed(2) : '0.00'}
              suffix="₽"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="Дефицит товаров"
              value={lowStock.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: lowStock.length > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Typography.Title level={5}>Продажи за сегодня</Typography.Title>
          <Table
            dataSource={recentSales}
            columns={salesColumns}
            rowKey="sale_id"
            size="small"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'Продаж за сегодня нет' }}
            scroll={{ y: 320 }}
          />
        </Col>
        <Col span={10}>
          <Typography.Title level={5} style={{ color: lowStock.length > 0 ? '#cf1322' : undefined }}>
            Товары ниже минимума {lowStock.length > 0 && `(${lowStock.length})`}
          </Typography.Title>
          <Table
            dataSource={lowStock}
            columns={lowStockColumns}
            rowKey="stock_id"
            size="small"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'Дефицита нет' }}
            scroll={{ y: 320 }}
          />
        </Col>
      </Row>
    </StoreGuard>
  );
}
