import { useState } from 'react';
import { Button, DatePicker, Typography, Card, Row, Col, Statistic, Table, message } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { reportsApi } from '../../api';
import { useActiveStore } from '../../store/activeStore';
import StoreGuard from '../../components/StoreGuard';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface SalesSummary { count: number; subtotal: number; discount: number; total: number; cash: number; card: number }
interface TopProduct { name: string; qty: number; amount: number }

export default function ReportsPage() {
  const { activeStoreId } = useActiveStore();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [exporting, setExporting] = useState(false);

  const buildParams = () => {
    const params: Record<string, string> = {};
    if (activeStoreId) params.store_id = String(activeStoreId);
    if (range) {
      params.from = range[0].startOf('day').toISOString();
      params.to = range[1].endOf('day').toISOString();
    }
    return params;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.sales(buildParams());
      setTotals(res.data.totals);
      setTopProducts(res.data.topProducts);
    } catch { message.error('Ошибка загрузки отчёта'); }
    finally { setLoading(false); }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await reportsApi.exportSales(buildParams());
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_${dayjs().format('YYYYMMDD')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { message.error('Ошибка экспорта'); }
    finally { setExporting(false); }
  };

  return (
    <StoreGuard>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Отчёт по продажам</Typography.Title>
        <RangePicker value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} format="DD.MM.YYYY" />
        <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={load}>
          Сформировать
        </Button>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportExcel}>
          Excel
        </Button>
      </div>

      {totals && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}><Card><Statistic title="Продаж" value={totals.count} /></Card></Col>
            <Col span={5}><Card><Statistic title="Сумма" value={totals.subtotal.toFixed(2)} suffix="₽" /></Card></Col>
            <Col span={5}><Card><Statistic title="Скидки" value={totals.discount.toFixed(2)} suffix="₽" valueStyle={{ color: 'var(--color-danger)' }} /></Card></Col>
            <Col span={5}><Card><Statistic title="Итого" value={totals.total.toFixed(2)} suffix="₽" valueStyle={{ color: 'var(--color-success)' }} /></Card></Col>
            <Col span={5}>
              <Card>
                <Statistic title="Наличные" value={totals.cash.toFixed(2)} suffix="₽" />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Карта: {totals.card.toFixed(2)} ₽</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Typography.Title level={5}>Топ товаров по выручке</Typography.Title>
          <Table
            dataSource={topProducts}
            rowKey="name"
            size="small"
            pagination={false}
            columns={[
              { title: 'Товар', dataIndex: 'name', key: 'name' },
              { title: 'Продано (шт)', dataIndex: 'qty', key: 'qty', width: 130 },
              { title: 'Выручка', dataIndex: 'amount', key: 'amount', width: 130, render: (v: number) => `${v.toFixed(2)} ₽` },
            ]}
          />
        </>
      )}
    </StoreGuard>
  );
}
