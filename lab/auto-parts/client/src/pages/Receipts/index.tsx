import { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Modal, Form, Input, InputNumber,
  AutoComplete, Descriptions, Drawer, Tag, Select, Upload, Space, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EyeOutlined, SearchOutlined, UploadOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { receiptsApi, productsApi, suppliersApi, storesApi } from '../../api';
import type { Supplier } from '../../api';

interface Store { store_id: number; name: string }
import { useActiveStore } from '../../store/activeStore';
import { useAuthStore } from '../../store/auth';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import StoreGuard from '../../components/StoreGuard';
import ReceiptParseTable from './ReceiptParseTable';
import dayjs from 'dayjs';

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

interface Receipt {
  receipt_id: number;
  receipt_datetime: string;
  note: string | null;
  status: string;
  file_name: string | null;
  user: { last_name: string; first_name: string };
  store: { name: string };
  supplier: { name: string } | null;
  items: ReceiptItem[];
  issues: Array<{ issue_id: number }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Черновик',   color: 'default'   },
  READY:     { label: 'На проверке', color: 'processing' },
  POSTED:    { label: 'Проведено',  color: 'success'   },
  CANCELLED: { label: 'Отменено',   color: 'error'     },
};

export default function ReceiptsPage() {
  const { activeStoreId } = useActiveStore();
  const { isAdmin } = useAuthStore();
  const admin = isAdmin();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  // Manual receipt modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [cartItems, setCartItems] = useState<Array<{ product_id: number; name: string; quantity: number; purchase_price: number; sale_price: number }>>([]);
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; product: { product_id: number; name: string; price: number } }[]>([]);

  // XLS upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm] = Form.useForm();
  const [xlsFile, setXlsFile] = useState<File | null>(null);
  const [xlsFileList, setXlsFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Parse table (step 2)
  const [parseReceipt, setParseReceipt] = useState<Receipt | null>(null);

  // Detail drawer
  const [detail, setDetail] = useState<Receipt | null>(null);
  const [postingId, setPostingId] = useState<number | null>(null);

  useBarcodeScanner((barcode) => {
    if (!createOpen) return;
    productsApi.byBarcode(barcode)
      .then((res) => addItem(res.data))
      .catch(() => message.warning(`Товар со штрих-кодом ${barcode} не найден`));
  });

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeStoreId) params.store_id = String(activeStoreId);
      const res = await receiptsApi.list(params);
      setReceipts(res.data as Receipt[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeStoreId]);
  useEffect(() => {
    suppliersApi.list().then((r) => setSuppliers(r.data));
    if (admin) storesApi.list().then((r) => setStores(r.data));
  }, []);

  // Manual receipt helpers
  const searchProducts = async (val: string) => {
    if (!val) return;
    const res = await productsApi.list({ search: val });
    setProductOptions(res.data.map((p: { product_id: number; name: string; price: number }) => ({
      value: String(p.product_id), label: p.name, product: p,
    })));
  };

  const addItem = (product: { product_id: number; name: string; price: number }) => {
    if (cartItems.find((i) => i.product_id === product.product_id)) return;
    setCartItems((c) => [...c, { product_id: product.product_id, name: product.name, quantity: 1, purchase_price: 0, sale_price: Number(product.price) }]);
  };

  const createManual = async () => {
    if (!cartItems.length) { message.warning('Добавьте товары'); return; }
    const values = await form.validateFields();
    try {
      await receiptsApi.create({ store_id: activeStoreId, note: values.note, items: cartItems });
      message.success('Поступление оформлено');
      setCreateOpen(false);
      setCartItems([]);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка');
    }
  };

  // XLS upload
  const openUpload = () => {
    uploadForm.resetFields();
    setXlsFile(null);
    setXlsFileList([]);
    setUploadOpen(true);
  };

  const handleUpload = async () => {
    await uploadForm.validateFields();
    if (!xlsFile) { message.warning('Выберите файл'); return; }
    const supplier_id = uploadForm.getFieldValue('supplier_id');
    const store_id = admin ? uploadForm.getFieldValue('store_id') : activeStoreId;

    const fd = new FormData();
    fd.append('file', xlsFile);
    fd.append('supplier_id', String(supplier_id));
    if (store_id) fd.append('store_id', String(store_id));

    setUploading(true);
    try {
      const res = await receiptsApi.upload(fd);
      const receipt = res.data as Receipt;
      setUploadOpen(false);
      setParseReceipt(receipt);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка загрузки файла');
    } finally { setUploading(false); }
  };

  // Detail drawer
  const viewDetail = async (id: number) => {
    const res = await receiptsApi.get(id);
    setDetail(res.data as Receipt);
  };

  const postReceipt = async (id: number) => {
    setPostingId(id);
    try {
      await receiptsApi.patchStatus(id, 'POSTED');
      message.success('Поступление проведено');
      setDetail(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка');
    } finally { setPostingId(null); }
  };

  const cancelReceipt = async (id: number) => {
    setPostingId(id);
    try {
      await receiptsApi.patchStatus(id, 'CANCELLED');
      message.success('Поступление отменено');
      setDetail(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Ошибка');
    } finally { setPostingId(null); }
  };

  const columns: ColumnsType<Receipt> = [
    { title: '№', dataIndex: 'receipt_id', key: 'id', width: 70 },
    {
      title: 'Статус', key: 'status', width: 120,
      render: (_: unknown, r: Receipt) => {
        const s = STATUS_LABELS[r.status] ?? { label: r.status, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    { title: 'Дата', dataIndex: 'receipt_datetime', key: 'date', width: 155, render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm') },
    { title: 'Магазин', dataIndex: ['store', 'name'], key: 'store' },
    { title: 'Поставщик', key: 'sup', render: (_: unknown, r: Receipt) => r.supplier?.name ?? '—' },
    { title: 'Сотрудник', key: 'user', render: (_: unknown, r: Receipt) => `${r.user.last_name} ${r.user.first_name}` },
    { title: 'Товаров', key: 'count', width: 80, render: (_: unknown, r: Receipt) => r.items.length },
    {
      title: '⚠', key: 'issues', width: 50,
      render: (_: unknown, r: Receipt) => r.issues?.length ? <Tag color="warning">{r.issues.length}</Tag> : null,
    },
    {
      title: '', key: 'act', width: 100,
      render: (_: unknown, r: Receipt) => (
        <Space size={4}>
          {r.status === 'DRAFT' && (
            <Button size="small" type="link" onClick={() => {
              setParseReceipt(r);
            }}>Разобрать</Button>
          )}
          {admin && <Button icon={<EyeOutlined />} size="small" onClick={() => viewDetail(r.receipt_id)} />}
        </Space>
      ),
    },
  ];

  // If we're in parse mode, show parse table full-page
  if (parseReceipt) {
    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button onClick={() => { setParseReceipt(null); load(); }}>← Назад к списку</Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Поступление №{parseReceipt.receipt_id}
            {parseReceipt.file_name && <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>({parseReceipt.file_name})</Typography.Text>}
          </Typography.Title>
          <Tag color={STATUS_LABELS[parseReceipt.status]?.color ?? 'default'}>
            {STATUS_LABELS[parseReceipt.status]?.label ?? parseReceipt.status}
          </Tag>
        </div>
        <ReceiptParseTable
          receiptId={parseReceipt.receipt_id}
          initialItems={parseReceipt.items}
          status={parseReceipt.status}
          onStatusChange={(newStatus) => setParseReceipt((r) => r ? { ...r, status: newStatus } : r)}
          onClose={() => { setParseReceipt(null); load(); }}
        />
      </div>
    );
  }

  return (
    <StoreGuard>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0, flexGrow: 1 }}>Поступления товаров</Typography.Title>
        <Button icon={<UploadOutlined />} onClick={openUpload}>Загрузить накладную</Button>
        {admin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Оформить вручную
          </Button>
        )}
      </div>

      <Table dataSource={receipts} columns={columns} rowKey="receipt_id" loading={loading} size="middle" />

      {/* XLS Upload drawer (Step 1) */}
      <Drawer
        open={uploadOpen}
        title="Загрузить накладную XLS"
        onClose={() => setUploadOpen(false)}
        width={420}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setUploadOpen(false)}>Отмена</Button>
              <Button type="primary" loading={uploading} onClick={handleUpload} disabled={!xlsFile}>
                Разобрать
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="supplier_id" label="Поставщик" rules={[{ required: true, message: 'Выберите поставщика' }]}>
            <Select placeholder="Выберите поставщика" options={suppliers.map((s) => ({ value: s.supplier_id, label: s.name }))} />
          </Form.Item>
          {admin && (
            <Form.Item name="store_id" label="Магазин" rules={[{ required: true, message: 'Выберите магазин' }]}>
              <Select
                placeholder="Выберите магазин"
                options={stores.map((s) => ({ value: s.store_id, label: s.name }))}
              />
            </Form.Item>
          )}
          <Form.Item label="Файл накладной (XLS/XLSX)">
            <Upload
              accept=".xls,.xlsx"
              maxCount={1}
              fileList={xlsFileList}
              beforeUpload={(file) => {
                setXlsFile(file);
                setXlsFileList([file]);
                return false;
              }}
              onRemove={() => { setXlsFile(null); setXlsFileList([]); }}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Manual receipt modal */}
      <Modal open={createOpen} title="Поступление товаров" onOk={createManual} onCancel={() => setCreateOpen(false)}
        okText="Оформить" cancelText="Отмена" width={620}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Добавить товар">
            <AutoComplete options={productOptions} onChange={searchProducts} onSelect={(_v, opt) => addItem(opt.product)} placeholder="Поиск...">
              <Input prefix={<SearchOutlined />} />
            </AutoComplete>
          </Form.Item>
          {cartItems.map((item, idx) => (
            <div key={item.product_id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Typography.Text style={{ flex: 1 }} ellipsis>{item.name}</Typography.Text>
              <InputNumber placeholder="Кол-во" min={1} value={item.quantity} size="small" style={{ width: 70 }}
                onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, quantity: v ?? 1 } : i))} />
              <InputNumber placeholder="Закуп. ₽" min={0} step={0.01} precision={2} value={item.purchase_price} size="small" style={{ width: 90 }}
                onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, purchase_price: v ?? 0 } : i))} />
              <InputNumber placeholder="Продажа ₽" min={0} step={0.01} precision={2} value={item.sale_price} size="small" style={{ width: 90 }}
                onChange={(v) => setCartItems((c) => c.map((i, j) => j === idx ? { ...i, sale_price: v ?? 0 } : i))} />
              <Button size="small" danger onClick={() => setCartItems((c) => c.filter((_, j) => j !== idx))}>✕</Button>
            </div>
          ))}
          <Form.Item name="note" label="Примечание" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail drawer (admin only) */}
      <Drawer title={detail ? `Поступление №${detail.receipt_id}` : ''} open={!!detail} onClose={() => setDetail(null)} width={600}>
        {detail && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Статус">
                <Tag color={STATUS_LABELS[detail.status]?.color ?? 'default'}>
                  {STATUS_LABELS[detail.status]?.label ?? detail.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дата">{dayjs(detail.receipt_datetime).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Магазин">{detail.store.name}</Descriptions.Item>
              {detail.supplier && <Descriptions.Item label="Поставщик">{detail.supplier.name}</Descriptions.Item>}
              <Descriptions.Item label="Сотрудник">{detail.user.last_name} {detail.user.first_name}</Descriptions.Item>
              {detail.file_name && <Descriptions.Item label="Файл">{detail.file_name}</Descriptions.Item>}
              {detail.note && <Descriptions.Item label="Примечание">{detail.note}</Descriptions.Item>}
            </Descriptions>

            {admin && ['READY', 'DRAFT'].includes(detail.status) && (
              <Space style={{ marginBottom: 16 }}>
                <Button
                  type="primary" icon={<CheckOutlined />}
                  loading={postingId === detail.receipt_id}
                  onClick={() => postReceipt(detail.receipt_id)}
                >
                  Провести
                </Button>
                <Button
                  danger icon={<CloseOutlined />}
                  loading={postingId === detail.receipt_id}
                  onClick={() => cancelReceipt(detail.receipt_id)}
                >
                  Отклонить
                </Button>
              </Space>
            )}

            <Table dataSource={detail.items} rowKey="receipt_item_id" size="small" pagination={false}
              columns={[
                { title: 'Товар', key: 'n', ellipsis: true,
                  render: (_: unknown, r: ReceiptItem) => r.product?.name ?? r.raw_name ?? '—' },
                { title: 'Статус', key: 'ms', width: 110,
                  render: (_: unknown, r: ReceiptItem) => {
                    const s = r.match_status;
                    if (s === 'matched') return <Tag color="success">Найден</Tag>;
                    if (s === 'created') return <Tag color="processing">Создан</Tag>;
                    if (s === 'issue') return <Tag color="warning">Проблема</Tag>;
                    return <Tag>Ожидание</Tag>;
                  },
                },
                { title: 'Кол', dataIndex: 'quantity', key: 'q', width: 55 },
                { title: 'Закуп.', key: 'pp', width: 80, render: (_: unknown, r: ReceiptItem) => `${Number(r.purchase_price).toFixed(2)} ₽` },
                { title: 'Продажа', key: 'sp', width: 80, render: (_: unknown, r: ReceiptItem) => `${Number(r.sale_price).toFixed(0)} ₽` },
              ]}
            />
          </>
        )}
      </Drawer>
    </StoreGuard>
  );
}
