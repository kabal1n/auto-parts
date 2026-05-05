import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber,
  Typography, Popconfirm, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { suppliersApi } from '../../api';
import type { Supplier } from '../../api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.list();
      setSuppliers(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      startRow: 4,
      article: 'B', name: 'C', barcode: 'D', manufacturer: 'E',
      quantity: 'F', purchase_price: 'G',
      supplierNameCells: 'B1,B2',
      aliases: '',
    });
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    const cfg = s.xls_config;
    form.setFieldsValue({
      name_supplier: s.name,
      startRow: cfg.startRow,
      article: cfg.article,
      name: cfg.name,
      barcode: cfg.barcode ?? '',
      manufacturer: cfg.manufacturer ?? '',
      quantity: cfg.quantity,
      purchase_price: cfg.purchase_price,
      supplierNameCells: (cfg.supplierNameCells ?? []).join(','),
      aliases: (cfg.aliases ?? []).join('\n'),
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    const xls_config = {
      startRow: values.startRow,
      article: values.article,
      name: values.name,
      barcode: values.barcode || null,
      manufacturer: values.manufacturer || null,
      quantity: values.quantity,
      purchase_price: values.purchase_price,
      supplierNameCells: values.supplierNameCells
        ? values.supplierNameCells.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      aliases: values.aliases
        ? values.aliases.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };
    try {
      if (editing) {
        await suppliersApi.update(editing.supplier_id, { name: values.name_supplier, xls_config });
        message.success('Поставщик обновлён');
      } else {
        await suppliersApi.create({ name: values.name_supplier, xls_config });
        message.success('Поставщик добавлен');
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
      await suppliersApi.remove(id);
      message.success('Поставщик удалён');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Не удалось удалить');
    }
  };

  const columns: ColumnsType<Supplier> = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Начальная строка XLS', key: 'startRow',
      render: (_: unknown, r: Supplier) => r.xls_config.startRow,
    },
    {
      title: 'Псевдонимы', key: 'aliases',
      render: (_: unknown, r: Supplier) => (r.xls_config.aliases ?? []).join(', '),
      ellipsis: true,
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_: unknown, r: Supplier) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <Popconfirm title="Удалить поставщика?" okText="Удалить" okButtonProps={{ danger: true }}
            cancelText="Отмена" onConfirm={() => onDelete(r.supplier_id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Поставщики</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить поставщика</Button>
      </div>

      <Table dataSource={suppliers} columns={columns} rowKey="supplier_id" loading={loading} size="middle" />

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать поставщика' : 'Добавить поставщика'}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name_supplier" label="Название поставщика" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Конфигурация XLS-файла
          </Typography.Text>

          <Form.Item name="startRow" label="Первая строка данных" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="article" label="Колонка: Артикул" rules={[{ required: true }]}>
              <Input maxLength={3} />
            </Form.Item>
            <Form.Item name="name" label="Колонка: Название" rules={[{ required: true }]}>
              <Input maxLength={3} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="barcode" label="Колонка: Штрих-код">
              <Input maxLength={3} placeholder="не указано" />
            </Form.Item>
            <Form.Item name="manufacturer" label="Колонка: Производитель">
              <Input maxLength={3} placeholder="не указано" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="quantity" label="Колонка: Количество" rules={[{ required: true }]}>
              <Input maxLength={3} />
            </Form.Item>
            <Form.Item name="purchase_price" label="Колонка: Цена закупки" rules={[{ required: true }]}>
              <Input maxLength={3} />
            </Form.Item>
          </Space>

          <Form.Item name="supplierNameCells" label="Ячейки с названием поставщика (через запятую)"
            tooltip="Например: B1,B2 — ячейки, в которых XLS-файл содержит название поставщика">
            <Input placeholder="B1,B2" />
          </Form.Item>

          <Form.Item name="aliases" label="Псевдонимы поставщика (каждый с новой строки)"
            tooltip="Текст из ячеек выше должен содержать хотя бы один из этих псевдонимов">
            <Input.TextArea rows={3} placeholder="ООО Поставщик&#10;Поставщик ООО" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
