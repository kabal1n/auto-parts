import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Input, Select,
  Popconfirm, Space, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usersApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

interface User {
  user_id: number;
  login: string;
  role: string;
  role_id: number;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  account_status: string;
  created_at: string;
}

const ROLES = [
  { value: 1, label: 'Администратор' },
  { value: 2, label: 'Кассир' },
];

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { const res = await usersApi.list(); setUsers(res.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    form.setFieldsValue({ ...u, password: '' });
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    if (!editing && !values.password) { message.error('Введите пароль'); return; }
    try {
      if (editing) {
        await usersApi.update(editing.user_id, values);
        message.success('Сотрудник обновлён');
      } else {
        await usersApi.create(values);
        message.success('Сотрудник добавлен');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка сохранения');
    }
  };

  const onDelete = async (id: number) => {
    try { await usersApi.remove(id); message.success('Сотрудник удалён'); load(); }
    catch { message.error('Ошибка удаления'); }
  };

  const columns = [
    { title: 'Фамилия', dataIndex: 'last_name', key: 'last_name' },
    { title: 'Имя', dataIndex: 'first_name', key: 'first_name' },
    { title: 'Отчество', dataIndex: 'middle_name', key: 'middle_name' },
    { title: 'Логин', dataIndex: 'login', key: 'login', width: 130 },
    {
      title: 'Роль', key: 'role', width: 140,
      render: (_: unknown, u: User) => <Tag color={u.role === 'Администратор' ? 'blue' : 'green'}>{u.role}</Tag>,
    },
    {
      title: 'Статус', key: 'status', width: 110,
      render: (_: unknown, u: User) => (
        <Tag color={u.account_status === 'ACTIVE' ? 'green' : 'red'}>
          {u.account_status === 'ACTIVE' ? 'Активен' : 'Заблокирован'}
        </Tag>
      ),
    },
    { title: 'Добавлен', dataIndex: 'created_at', key: 'created', width: 130, render: (v: string) => dayjs(v).format('DD.MM.YYYY') },
    {
      title: '', key: 'actions', width: 100,
      render: (_: unknown, u: User) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(u)} />
          {u.user_id !== me?.user_id && (
            <Popconfirm title="Удалить сотрудника?" onConfirm={() => onDelete(u.user_id)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Сотрудники</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить</Button>
      </div>

      <Table dataSource={users} columns={columns} rowKey="user_id" loading={loading} size="middle" />

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="last_name" label="Фамилия" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="first_name" label="Имя" rules={[{ required: true }]}><Input /></Form.Item>
          </Space>
          <Form.Item name="middle_name" label="Отчество"><Input /></Form.Item>
          <Form.Item name="login" label="Логин" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label={editing ? 'Новый пароль (оставьте пустым, если не меняете)' : 'Пароль'}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role_id" label="Роль" rules={[{ required: true }]} initialValue={2}>
            <Select options={ROLES} />
          </Form.Item>
          {editing && (
            <Form.Item name="account_status" label="Статус">
              <Select options={[{ value: 'ACTIVE', label: 'Активен' }, { value: 'BLOCKED', label: 'Заблокирован' }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
