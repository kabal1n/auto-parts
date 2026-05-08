import { useState, useEffect } from 'react';
import {
  Table, Button, Tag, InputNumber, Modal, Form, Input,
  Select, Space, Typography, message, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { receiptsApi, lookupsApi } from '../../api';
import type { LookupOption } from '../../api';
import CreatableSelect from '../../components/CreatableSelect';

const ISSUE_REASONS = [
  'Неверный штрих-код',
  'Дублирующийся артикул',
  'Некорректное количество',
  'Цена не соответствует договору',
  'Товар не заказывался',
  'Товар не приехал',
  'Товар с браком',
  'Не найден в каталоге',
  'Другое',
];

interface ReceiptItem {
  receipt_item_id: number;
  product_id: number | null;
  quantity: number;
  purchase_price: number;
  sale_price: number;
  match_status: string;
  raw_article: string | null;
  raw_name: string | null;
  raw_barcode: string | null;
  raw_manufacturer: string | null;
  product: { name: string; price: number } | null;
  issues: Array<{ reason: string }>;
}

interface Props {
  receiptId: number;
  initialItems: ReceiptItem[];
  status: string;
  onStatusChange: (newStatus: string) => void;
  onClose: () => void;
}

export default function ReceiptParseTable({ receiptId, initialItems, status, onStatusChange, onClose }: Props) {
  const [items, setItems] = useState<ReceiptItem[]>(initialItems);
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [manufacturers, setManufacturers] = useState<LookupOption[]>([]);
  const [units, setUnits] = useState<LookupOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // New product modal state
  const [newProductModal, setNewProductModal] = useState<ReceiptItem | null>(null);
  const [productForm] = Form.useForm();
  const [savingProduct, setSavingProduct] = useState(false);

  // Issue modal state
  const [issueModal, setIssueModal] = useState<ReceiptItem | null>(null);
  const [issueForm] = Form.useForm();
  const [savingIssue, setSavingIssue] = useState(false);

  useEffect(() => {
    Promise.all([lookupsApi.categories(), lookupsApi.manufacturers(), lookupsApi.units()])
      .then(([c, m, u]) => {
        setCategories(c.data);
        setManufacturers(m.data);
        setUnits(u.data);
      });
  }, []);

  const updateItem = (updated: ReceiptItem) => {
    setItems((prev) => prev.map((i) => i.receipt_item_id === updated.receipt_item_id ? updated : i));
  };

  const handlePriceChange = async (item: ReceiptItem, field: 'purchase_price' | 'sale_price', val: number | null) => {
    const value = val ?? 0;
    const updated = { ...item, [field]: value };
    setItems((prev) => prev.map((i) => i.receipt_item_id === item.receipt_item_id ? updated : i));
    try {
      await receiptsApi.patchItem(receiptId, item.receipt_item_id, { [field]: value });
    } catch { message.error('Не удалось обновить цену'); }
  };

  // New product modal
  const openNewProduct = (item: ReceiptItem) => {
    setNewProductModal(item);
    const pp = Number(item.purchase_price) || 0;
    productForm.resetFields();
    productForm.setFieldsValue({
      name: item.raw_name,
      article: item.raw_article,
      barcode: item.raw_barcode,
      purchase_price: pp,
      sale_price: pp > 0 ? Math.round(pp * 1.5) : 0,
    });
  };

  const recalcSalePrice = () => {
    const catId = productForm.getFieldValue('category_id');
    const pp = Number(productForm.getFieldValue('purchase_price')) || 0;
    const cat = categories.find((c) => c.id === catId);
    const markup = cat?.markup_percent ?? 50;
    productForm.setFieldValue('sale_price', Math.round(pp * (1 + markup / 100)));
  };

  const saveNewProduct = async () => {
    if (!newProductModal) return;
    const values = await productForm.validateFields();
    setSavingProduct(true);
    try {
      const res = await receiptsApi.createProduct(receiptId, newProductModal.receipt_item_id, values);
      updateItem(res.data as ReceiptItem);
      message.success('Товар создан и привязан');
      setNewProductModal(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка создания товара');
    } finally { setSavingProduct(false); }
  };

  // Issue modal
  const openIssue = (item: ReceiptItem) => {
    setIssueModal(item);
    issueForm.resetFields();
  };

  const saveIssue = async () => {
    if (!issueModal) return;
    const values = await issueForm.validateFields();
    setSavingIssue(true);
    try {
      const res = await receiptsApi.createIssue(receiptId, issueModal.receipt_item_id, values);
      updateItem(res.data as ReceiptItem);
      message.success('Проблема зафиксирована');
      setIssueModal(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка');
    } finally { setSavingIssue(false); }
  };

  // Status transitions
  const pendingCount = items.filter((i) => i.match_status === 'pending').length;
  const totalCount = items.length;
  const doneCount = totalCount - pendingCount;

  const setReady = async () => {
    setSubmitting(true);
    try {
      await receiptsApi.patchStatus(receiptId, 'READY');
      message.success('Поступление передано на проверку');
      onStatusChange('READY');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка');
    } finally { setSubmitting(false); }
  };

  const cancelReceipt = async () => {
    setSubmitting(true);
    try {
      await receiptsApi.patchStatus(receiptId, 'CANCELLED');
      message.success('Поступление отменено');
      onStatusChange('CANCELLED');
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка');
    } finally { setSubmitting(false); }
  };

  const isDraft = status === 'DRAFT';

  const matchTag = (item: ReceiptItem) => {
    if (item.match_status === 'matched') return <Tag color="success">Найден</Tag>;
    if (item.match_status === 'created') return <Tag color="processing">Создан</Tag>;
    if (item.match_status === 'issue') return <Tag color="warning">{item.issues[0]?.reason ?? 'Проблема'}</Tag>;
    return <Tag color="default">Не обработан</Tag>;
  };

  const columns: ColumnsType<ReceiptItem> = [
    { title: '#', key: 'idx', width: 45, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: 'Артикул (XLS)', dataIndex: 'raw_article', key: 'art', width: 100, ellipsis: true },
    { title: 'Название (XLS)', dataIndex: 'raw_name', key: 'rname', ellipsis: true, width: 250,
      render: (v: string, item: ReceiptItem) => (
        item.product ? <Tooltip title={v}><span style={{ color: '#52c41a' }}>{item.product.name}</span></Tooltip> : v
      ),
    },
    { title: 'Произв.', dataIndex: 'raw_manufacturer', key: 'mfr', width: 80, ellipsis: true },
    { title: 'Кол-во', dataIndex: 'quantity', key: 'qty', width: 52, align: 'center' as const },
    {
      title: 'Закуп. ₽', key: 'pp', width: 88,
      render: (_: unknown, item: ReceiptItem) => (
        isDraft && item.match_status !== 'issue' ? (
          <InputNumber
            value={Number(item.purchase_price)} min={0} step={0.01} precision={2}
            size="small" style={{ width: 78 }}
            onChange={(v) => handlePriceChange(item, 'purchase_price', v)}
          />
        ) : `${Number(item.purchase_price).toFixed(2)} ₽`
      ),
    },
    {
      title: 'Продажа ₽', key: 'sp', width: 100,
      render: (_: unknown, item: ReceiptItem) => (
        isDraft && item.match_status === 'matched' ? (
          <InputNumber
            value={Number(item.sale_price)} min={0} step={1} precision={0}
            size="small" style={{ width: 90 }}
            onChange={(v) => handlePriceChange(item, 'sale_price', v)}
          />
        ) : `${Number(item.sale_price).toFixed(0)} ₽`
      ),
    },
    {
      title: 'Статус', key: 'status', width: 100, align: 'center' as const,
      render: (_: unknown, item: ReceiptItem) => matchTag(item),
    },
    {
      title: 'Действия', key: 'actions', width: 180, fixed: 'right' as const,
      render: (_: unknown, item: ReceiptItem) => {
        if (!isDraft) return null;
        if (item.match_status === 'pending') {
          return (
            <Space size={4}>
              <Button size="small" type="primary" onClick={() => openNewProduct(item)}>Создать товар</Button>
              <Button size="small" danger onClick={() => openIssue(item)}>Проблема</Button>
            </Space>
          );
        }
        return <Button size="small" onClick={() => openIssue(item)}>Проблема</Button>;
      },
    },
  ];

  return (
    <>
      <Table
        dataSource={items}
        columns={columns}
        rowKey="receipt_item_id"
        size="small"
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 875 }}
      />

      {isDraft && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Typography.Text type="secondary">
            Обработано: {doneCount} из {totalCount} строк
          </Typography.Text>
          <Space>
            <Button danger onClick={cancelReceipt} loading={submitting}>Отменить</Button>
            <Button
              type="primary"
              disabled={pendingCount > 0}
              onClick={setReady}
              loading={submitting}
              title={pendingCount > 0 ? `Осталось необработанных строк: ${pendingCount}` : ''}
            >
              Готово к проверке
            </Button>
          </Space>
        </div>
      )}

      {/* New product modal */}
      <Modal
        open={!!newProductModal}
        title="Создать товар из накладной"
        onOk={saveNewProduct}
        onCancel={() => setNewProductModal(null)}
        okText="Создать и привязать"
        cancelText="Отмена"
        confirmLoading={savingProduct}
        width={560}
      >
        <Form form={productForm} layout="vertical" style={{ marginTop: 12 }}
          onValuesChange={(changed) => {
            if ('category_id' in changed || 'purchase_price' in changed) {
              recalcSalePrice();
            }
          }}
        >
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="article" label="Артикул"><Input /></Form.Item>
            <Form.Item name="barcode" label="Штрих-код"><Input /></Form.Item>
          </Space>
          <Form.Item name="manufacturer_id" label="Производитель">
            <CreatableSelect
              options={manufacturers}
              onAdd={async (name) => {
                const res = await lookupsApi.addManufacturer(name);
                const opt = res.data;
                setManufacturers((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)));
                return opt;
              }}
              placeholder="Выберите или создайте"
            />
          </Form.Item>
          <Form.Item name="category_id" label="Категория">
            <CreatableSelect
              options={categories}
              onAdd={async (name) => {
                const res = await lookupsApi.addCategory(name);
                const opt = res.data;
                setCategories((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)));
                return opt;
              }}
              placeholder="Выберите или создайте"
            />
          </Form.Item>
          <Form.Item name="unit_id" label="Единица измерения">
            <CreatableSelect
              options={units}
              onAdd={async (name) => {
                const res = await lookupsApi.addUnit(name);
                const opt = res.data;
                setUnits((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)));
                return opt;
              }}
              placeholder="шт"
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="purchase_price" label="Цена закупки (₽)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sale_price" label="Цена продажи (₽, целые руб.)" rules={[{ required: true }]}>
              <InputNumber min={0} step={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Issue modal */}
      <Modal
        open={!!issueModal}
        title="Зафиксировать проблему"
        onOk={saveIssue}
        onCancel={() => setIssueModal(null)}
        okText="Зафиксировать"
        cancelText="Отмена"
        confirmLoading={savingIssue}
      >
        <Form form={issueForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="reason" label="Причина" rules={[{ required: true, message: 'Выберите причину' }]}>
            <Select placeholder="Выберите причину">
              {ISSUE_REASONS.map((r) => <Select.Option key={r} value={r}>{r}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="comment" label="Комментарий (необязательно)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
