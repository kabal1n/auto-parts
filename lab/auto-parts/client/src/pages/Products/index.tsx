import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Input, Select, Modal, Form,
  InputNumber, Typography, Popconfirm, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { productsApi } from '../../api';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useAuthStore } from '../../store/auth';
import CreatableSelect from '../../components/CreatableSelect';

interface Product {
  product_id: number;
  name: string;
  article: string | null;
  barcode: string | null;
  category: string | null;
  manufacturer: string | null;
  unit: string;
  price: number;
  description: string | null;
}

export default function ProductsPage() {
  const { isAdmin } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();

  useBarcodeScanner((barcode) => setSearch(barcode));

  const loadLookups = async () => {
    const [c, m, u] = await Promise.all([
      productsApi.categories(),
      productsApi.manufacturers(),
      productsApi.units(),
    ]);
    setCategories(c.data);
    setManufacturers(m.data);
    setUnits(u.data);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const p = await productsApi.list(params);
      setProducts(p.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { load(); }, [search, category]);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); form.setFieldsValue(p); setModalOpen(true); };

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await productsApi.update(editing.product_id, values);
        message.success('Товар обновлён');
      } else {
        await productsApi.create(values);
        message.success('Товар добавлен');
      }
      setModalOpen(false);
      load();
      loadLookups();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка сохранения');
    }
  };

  const onDelete = async (id: number) => {
    try {
      await productsApi.remove(id);
      message.success('Товар удалён');
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Не удалось удалить товар');
    }
  };

  const admin = isAdmin();

  const columns: ColumnsType<Product> = [
    { title: 'Название', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Артикул', dataIndex: 'article', key: 'article', width: 120 },
    { title: 'Штрих-код', dataIndex: 'barcode', key: 'barcode', width: 140 },
    {
      title: 'Категория', dataIndex: 'category', key: 'category', width: 140,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: 'Производитель', dataIndex: 'manufacturer', key: 'manufacturer', width: 160, ellipsis: true },
    { title: 'Ед.', dataIndex: 'unit', key: 'unit', width: 60 },
    {
      title: 'Цена', dataIndex: 'price', key: 'price', width: 100,
      render: (v: number) => `${Number(v).toFixed(2)} ₽`,
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_: unknown, record: Product) => (
        <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Товары</Typography.Title>
        <Input
          placeholder="Поиск по названию, артикулу, штрих-коду"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 320 }}
        />
        <Select
          placeholder="Категория"
          allowClear
          value={category}
          onChange={setCategory}
          style={{ width: 180 }}
          options={categories.map((c) => ({ label: c, value: c }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить товар
        </Button>
      </div>

      <Table
        dataSource={products}
        columns={columns}
        rowKey="product_id"
        loading={loading}
        size="middle"
        pagination={{ pageSize: 50, showSizeChanger: false }}
        scroll={{ x: 900 }}
      />

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать товар' : 'Добавить товар'}
        onCancel={() => setModalOpen(false)}
        width={560}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {editing && admin && (
                <Popconfirm title="Удалить товар?" okText="Удалить" okButtonProps={{ danger: true }} cancelText="Отмена"
                  onConfirm={() => onDelete(editing.product_id)}>
                  <Button danger icon={<DeleteOutlined />}>Удалить</Button>
                </Popconfirm>
              )}
            </div>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Отмена</Button>
              <Button type="primary" onClick={onSave}>Сохранить</Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="article" label="Артикул"><Input /></Form.Item>
          <Form.Item name="barcode" label="Штрих-код (EAN-13)"><Input /></Form.Item>
          <Form.Item name="category" label="Категория">
            <CreatableSelect options={categories} placeholder="Выберите или создайте категорию" />
          </Form.Item>
          <Form.Item name="manufacturer" label="Производитель">
            <CreatableSelect options={manufacturers} placeholder="Выберите или создайте производителя" />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="unit" label="Единица измерения" initialValue="шт">
              <CreatableSelect options={units} placeholder="шт" />
            </Form.Item>
            <Form.Item name="price" label="Цена (₽)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
