import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Select } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { authApi, storesApi } from '../../api';
import { useAuthStore } from '../../store/auth';
import { useActiveStore } from '../../store/activeStore';

interface Store { store_id: number; name: string }

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'credentials' | 'store'>('credentials');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  const { setAuth } = useAuthStore();
  const { setActiveStore } = useActiveStore();
  const navigate = useNavigate();

  const onFinish = async (values: { login: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(values.login, values.password);
      setAuth(res.data.token, res.data.user);

      if (res.data.user.role === 'Администратор') {
        navigate('/');
      } else {
        const storesRes = await storesApi.list();
        setStores(storesRes.data);
        if (storesRes.data.length === 1) {
          setSelectedStoreId(storesRes.data[0].store_id);
        }
        setStep('store');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const onSelectStore = () => {
    const store = stores.find((s) => s.store_id === selectedStoreId);
    if (!store) return;
    setActiveStore(store.store_id, store.name);
    navigate('/sales');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-subtle)',
    }}>
      <Card style={{ width: 380, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>АвтоЗапчасти</Typography.Title>
          <Typography.Text type="secondary">Информационная система</Typography.Text>
        </div>

        {step === 'credentials' && (
          <>
            {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}
            <Form layout="vertical" onFinish={onFinish} size="large">
              <Form.Item name="login" rules={[{ required: true, message: 'Введите логин' }]}>
                <Input prefix={<UserOutlined />} placeholder="Логин" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Войти
                </Button>
              </Form.Item>
            </Form>
          </>
        )}

        {step === 'store' && (
          <>
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
              Выберите торговую точку
            </Typography.Text>
            <Select
              size="large"
              placeholder={<><ShopOutlined /> Торговая точка</>}
              value={selectedStoreId ?? undefined}
              onChange={setSelectedStoreId}
              style={{ width: '100%', marginBottom: 16 }}
              options={stores.map((s) => ({ value: s.store_id, label: s.name }))}
            />
            <Button
              type="primary" size="large" block
              disabled={!selectedStoreId}
              onClick={onSelectStore}
            >
              Начать работу
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
