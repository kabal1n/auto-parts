import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Input, Modal, Form, Select,
  InputNumber, Typography, Drawer, Descriptions, Tag,
  Popconfirm, message,
} from 'antd';
import { PlusOutlined, EditOutlined, CarOutlined, SearchOutlined } from '@ant-design/icons';
import { customersApi } from '../../api';
import { formatPhone, maskPhone, normalizePhone } from '../../utils/phone';

interface Customer {
  client_id: number;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  phone: string;
  personal_discount_percent: number;
  comment: string | null;
  client_status_id: number;
  status: { name: string; default_discount_percent: number };
  cars: Car[];
}

interface Car {
  car_id: number;
  car_brand: string;
  car_model: string;
  car_year: number | null;
  vin: string | null;
}

const STATUSES = [
  { value: 1, label: 'Обычный (0%)' },
  { value: 2, label: 'Постоянный (5%)' },
  { value: 3, label: 'VIP (10%)' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form] = Form.useForm();
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [carForm] = Form.useForm();
  const [carModalOpen, setCarModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await customersApi.list(search ? { search } : undefined);
      setCustomers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    form.setFieldsValue({ ...c, phone: maskPhone(c.phone), client_status_id: c.client_status_id });
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    values.phone = normalizePhone(values.phone);
    try {
      if (editing) {
        await customersApi.update(editing.client_id, values);
        message.success('Клиент обновлён');
      } else {
        await customersApi.create(values);
        message.success('Клиент добавлен');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка сохранения');
    }
  };

  const openCarModal = (car?: Car) => {
    setEditingCar(car || null);
    carForm.setFieldsValue(car || {});
    setCarModalOpen(true);
  };

  const saveCar = async () => {
    const values = await carForm.validateFields();
    try {
      if (editingCar) {
        await customersApi.updateCar(editingCar.car_id, values);
      } else {
        await customersApi.addCar(drawerCustomer!.client_id, values);
      }
      message.success('Автомобиль сохранён');
      setCarModalOpen(false);
      const updated = await customersApi.get(drawerCustomer!.client_id);
      setDrawerCustomer(updated.data);
      load();
    } catch {
      message.error('Ошибка сохранения');
    }
  };

  const deleteCar = async (car_id: number) => {
    await customersApi.removeCar(car_id);
    const updated = await customersApi.get(drawerCustomer!.client_id);
    setDrawerCustomer(updated.data);
    load();
  };

  const columns = [
    { title: 'Фамилия', dataIndex: 'last_name', key: 'last_name' },
    { title: 'Имя', dataIndex: 'first_name', key: 'first_name' },
    { title: 'Отчество', dataIndex: 'middle_name', key: 'middle_name' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone', width: 170, render: (v: string) => formatPhone(v) },
    {
      title: 'Статус', key: 'status', width: 140,
      render: (_: unknown, c: Customer) => <Tag color="blue">{c.status?.name}</Tag>,
    },
    {
      title: 'Скидка', key: 'discount', width: 90,
      render: (_: unknown, c: Customer) => `${Number(c.personal_discount_percent)}%`,
    },
    {
      title: '', key: 'actions', width: 120,
      render: (_: unknown, c: Customer) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(c)} />
          <Button icon={<CarOutlined />} size="small" onClick={() => setDrawerCustomer(c)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Клиенты</Typography.Title>
        <Input
          placeholder="Поиск по имени или телефону"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить клиента
        </Button>
      </div>

      <Table dataSource={customers} columns={columns} rowKey="client_id" loading={loading} size="middle" />

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать клиента' : 'Добавить клиента'}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="last_name" label="Фамилия" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="first_name" label="Имя" rules={[{ required: true }]}><Input /></Form.Item>
          </Space>
          <Form.Item name="middle_name" label="Отчество"><Input /></Form.Item>
          <Form.Item name="phone" label="Телефон" rules={[{ required: true, message: 'Телефон обязателен' }]}
            getValueFromEvent={(e: React.ChangeEvent<HTMLInputElement>) => maskPhone(e.target.value)}>
            <Input placeholder="+7 (999) 999-99-99" maxLength={18} />
          </Form.Item>
          <Form.Item name="client_status_id" label="Статус клиента" initialValue={1}>
            <Select options={STATUSES} />
          </Form.Item>
          <Form.Item name="personal_discount_percent" label="Персональная скидка (%)" initialValue={0}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={drawerCustomer ? `Автомобили: ${drawerCustomer.last_name} ${drawerCustomer.first_name}` : ''}
        open={!!drawerCustomer}
        onClose={() => setDrawerCustomer(null)}
        width={480}
        extra={<Button icon={<PlusOutlined />} onClick={() => openCarModal()}>Добавить авто</Button>}
      >
        {drawerCustomer?.cars.map((car) => (
          <Descriptions key={car.car_id} bordered size="small" style={{ marginBottom: 16 }}
            extra={
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openCarModal(car)} />
                <Popconfirm title="Удалить автомобиль?" onConfirm={() => deleteCar(car.car_id)}>
                  <Button size="small" danger>Удалить</Button>
                </Popconfirm>
              </Space>
            }
          >
            <Descriptions.Item label="Марка" span={3}>{car.car_brand}</Descriptions.Item>
            <Descriptions.Item label="Модель" span={3}>{car.car_model}</Descriptions.Item>
            <Descriptions.Item label="Год">{car.car_year ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="VIN" span={2}>{car.vin ?? '—'}</Descriptions.Item>
          </Descriptions>
        ))}
        {!drawerCustomer?.cars.length && <Typography.Text type="secondary">Нет автомобилей</Typography.Text>}
      </Drawer>

      <Modal
        open={carModalOpen}
        title={editingCar ? 'Редактировать авто' : 'Добавить авто'}
        onOk={saveCar}
        onCancel={() => setCarModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={carForm} layout="vertical" style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="car_brand" label="Марка" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="car_model" label="Модель" rules={[{ required: true }]}><Input /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="car_year" label="Год выпуска">
              <InputNumber min={1900} max={2100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="vin" label="VIN"><Input /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
