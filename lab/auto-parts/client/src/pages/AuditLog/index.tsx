import { useEffect, useState } from 'react';
import { Table, Typography, Input, DatePicker, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { auditApi } from '../../api';
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

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [entity, setEntity] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '500' };
      if (range) {
        params.from = range[0].startOf('day').toISOString();
        params.to = range[1].endOf('day').toISOString();
      }
      if (entity) params.entity_name = entity;
      const res = await auditApi.list(params);
      setLogs(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Журнал действий</Typography.Title>
        <RangePicker
          value={range}
          onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
          format="DD.MM.YYYY"
        />
        <Input
          placeholder="Объект (sales, products...)"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          allowClear
          style={{ width: 200 }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={load}>Найти</Button>
      </div>

      <Table
        dataSource={logs}
        columns={[
          { title: 'Дата', dataIndex: 'event_datetime', key: 'date', width: 170, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm:ss') },
          { title: 'Пользователь', key: 'user', width: 180, render: (_: unknown, l: LogEntry) => `${l.user.last_name} (${l.user.login})` },
          { title: 'Действие', dataIndex: 'action_type', key: 'action', width: 110, render: (v: string) => ACTION_LABELS[v] ?? v },
          { title: 'Объект', dataIndex: 'entity_name', key: 'entity', width: 150 },
          { title: 'ID', dataIndex: 'entity_id', key: 'eid', width: 70 },
          { title: 'Описание', dataIndex: 'description', key: 'desc', ellipsis: true },
        ]}
        rowKey="log_id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 100 }}
      />
    </>
  );
}
