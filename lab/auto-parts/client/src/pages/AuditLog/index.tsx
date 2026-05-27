import { useEffect, useState } from 'react';
import { Table, Typography, Select, DatePicker } from 'antd';
import { auditApi, usersApi } from '../../api';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface LogEntry {
  log_id: number;
  event_datetime: string;
  action_type: string;
  entity_name: string;
  entity_id: number | null;
  description: string | null;
  user: { login: string; last_name: string; first_name: string };
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
};

const ENTITY_LABELS: Record<string, string> = {
  customers:      'Клиенты',
  goods_receipts: 'Поступления',
  products:       'Товары',
  customer_orders:'Заказы',
  sales:          'Продажи',
  reorder_list:   'Заявки поставщикам',
  stock_by_store: 'Остатки',
  stores:         'Магазины',
  users:          'Пользователи',
};

export default function AuditLogPage() {
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [users, setUsers]             = useState<{ user_id: number; last_name: string; first_name: string }[]>([]);
  const [range, setRange]             = useState<[Dayjs, Dayjs] | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter]   = useState<number | null>(null);

  useEffect(() => {
    usersApi.list().then((r) => setUsers(r.data));
  }, []);

  useEffect(() => {
    const params: Record<string, string> = { limit: '500' };
    if (range) {
      params.from = range[0].startOf('day').toISOString();
      params.to   = range[1].endOf('day').toISOString();
    }
    if (actionFilter) params.action_type = actionFilter;
    if (entityFilter) params.entity_name = entityFilter;
    if (userFilter)   params.user_id     = String(userFilter);

    setLoading(true);
    auditApi.list(params).then((res) => setLogs(res.data)).finally(() => setLoading(false));
  }, [range, actionFilter, entityFilter, userFilter]);

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Журнал действий</Typography.Title>
        <RangePicker
          value={range}
          onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
          format="DD.MM.YYYY"
        />
        <Select
          placeholder="Тип действия"
          allowClear
          style={{ width: 160 }}
          value={actionFilter}
          onChange={(v) => setActionFilter(v ?? null)}
          options={Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
        <Select
          placeholder="Раздел"
          allowClear
          style={{ width: 190 }}
          value={entityFilter}
          onChange={(v) => setEntityFilter(v ?? null)}
          options={Object.entries(ENTITY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
        <Select
          placeholder="Пользователь"
          allowClear
          style={{ width: 190 }}
          value={userFilter}
          onChange={(v) => setUserFilter(v ?? null)}
          options={users.map((u) => ({ value: u.user_id, label: `${u.last_name} ${u.first_name}` }))}
        />
      </div>

      <Table
        dataSource={logs}
        columns={[
          { title: 'Дата',         dataIndex: 'event_datetime', key: 'date',   width: 155, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm:ss') },
          { title: 'Пользователь', key: 'user',   width: 180, render: (_: unknown, l: LogEntry) => `${l.user.last_name} ${l.user.first_name}` },
          { title: 'Действие',     dataIndex: 'action_type',   key: 'action', width: 110, render: (v: string) => ACTION_LABELS[v] ?? v },
          { title: 'Раздел',       dataIndex: 'entity_name',   key: 'entity', width: 160, render: (v: string) => ENTITY_LABELS[v] ?? v },
          { title: 'ID',           dataIndex: 'entity_id',     key: 'eid',    width: 65 },
          { title: 'Описание',     dataIndex: 'description',   key: 'desc',   ellipsis: true },
        ]}
        rowKey="log_id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 100 }}
      />
    </>
  );
}
