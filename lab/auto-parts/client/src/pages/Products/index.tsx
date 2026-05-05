import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Input, Select, Modal, Form,
  InputNumber, Typography, Popconfirm, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { productsApi, lookupsApi } from '../../api';
import type { LookupOption } from '../../api';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useAuthStore } from '../../store/auth';
import CreatableSelect from '../../components/CreatableSelect';

interface Product {
  product_id: number;
  name: string;
  article: string | null;
  barcode: string | null;
  category_id: number | null;
  category: string | null;
  manufacturer_id: number | null;
  manufacturer: string | null;
  unit_id: number | null;
  unit: string | null;
  price: number;
  description: string | null;
}

export default function ProductsPage() {
  const { isAdmin } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [manufacturers, setManufacturers] = useState<LookupOption[]>([]);
  const [units, setUnits] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [unconfirmed, setUnconfirmed] = useState({ cat: false, mfr: false, unit: false });
  const hasUnconfirmed = unconfirmed.cat || unconfirmed.mfr || unconfirmed.unit;

  useBarcodeScanner((barcode) => setSearch(barcode));

  const loadLookups = async () => {
    const [c, m, u] = await Promise.all([
      lookupsApi.categories(),
      lookupsApi.manufacturers(),
      lookupsApi.units(),
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
      if (categoryId) params.category_id = String(categoryId);
      const p = await productsApi.list(params);
      setProducts(p.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { load(); }, [search, categoryId]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setUnconfirmed({ cat: false, mfr: false, unit: false });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setUnconfirmed({ cat: false, mfr: false, unit: false });
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      article: p.article,
      barcode: p.barcode,
      category_id: p.category_id,
      manufacturer_id: p.manufacturer_id,
      unit_id: p.unit_id,
      price: p.price,
      description: p.description,
    });
    setModalOpen(true);
  };

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
          value={categoryId}
          onChange={setCategoryId}
          style={{ width: 180 }}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
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
              <Button type="primary" onClick={onSave} disabled={hasUnconfirmed}>Сохранить</Button>
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
          <Form.Item name="category_id" label="Категория">
            <CreatableSelect
              options={categories}
              onAdd={async (name) => {
                const res = await lookupsApi.addCategory(name);
                const opt = res.data;
                setCategories((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)));
                return opt;
              }}
              onTyping={(v) => setUnconfirmed((u) => ({ ...u, cat: v }))}
              placeholder="Выберите или создайте категорию"
            />
          </Form.Item>
          <Form.Item name="manufacturer_id" label="Производитель">
            <CreatableSelect
              options={manufacturers}
              onAdd={async (name) => {
                const res = await lookupsApi.addManufacturer(name);
                const opt = res.data;
                setManufacturers((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)));
                return opt;
              }}
              onTyping={(v) => setUnconfirmed((u) => ({ ...u, mfr: v }))}
              placeholder="Выберите или создайте производителя"
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="unit_id" label="Единица измерения">
              <CreatableSelect
                options={units}
                onAdd={async (name) => {
                  const res = await lookupsApi.addUnit(name);
                  const opt = res.data;
                  setUnits((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)));
                  return opt;
                }}
                onTyping={(v) => setUnconfirmed((u) => ({ ...u, unit: v }))}
                placeholder="шт"
              />
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
