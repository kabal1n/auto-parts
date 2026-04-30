import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Tag, Select, Tooltip } from 'antd';
import {
  HomeOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  TeamOutlined,
  FileTextOutlined,
  InboxOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  UserOutlined,
  AuditOutlined,
  LogoutOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useActiveStore } from '../store/activeStore';
import { storesApi } from '../api';

const { Sider, Header, Content } = Layout;

const allItems = [
  { key: '/',          label: 'Главная',            icon: <HomeOutlined />,        adminOnly: false },
  { key: '/sales',     label: 'Касса / Продажа',   icon: <ShoppingCartOutlined />, adminOnly: false },
  { key: '/products',  label: 'Товары',             icon: <AppstoreOutlined />,    adminOnly: false },
  { key: '/stock',     label: 'Остатки',            icon: <DatabaseOutlined />,    adminOnly: false },
  { key: '/customers', label: 'Клиенты',            icon: <TeamOutlined />,        adminOnly: false },
  { key: '/orders',    label: 'Заказы клиентов',    icon: <FileTextOutlined />,    adminOnly: false },
  { key: '/receipts',  label: 'Поступления',        icon: <InboxOutlined />,       adminOnly: true  },
  { key: '/reorder',   label: 'Заявки на закупку',  icon: <UnorderedListOutlined />, adminOnly: false },
  { key: '/reports',   label: 'Отчёты',             icon: <BarChartOutlined />,    adminOnly: true  },
  { key: '/users',     label: 'Сотрудники',         icon: <UserOutlined />,        adminOnly: true  },
  { key: '/audit',     label: 'Журнал действий',    icon: <AuditOutlined />,       adminOnly: true  },
];

interface Store { store_id: number; name: string }

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuthStore();
  const { activeStoreId, setActiveStore } = useActiveStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    storesApi.list().then((res) => {
      setStores(res.data);
      // Auto-select if there is exactly one store
      if (res.data.length === 1 && !activeStoreId) {
        setActiveStore(res.data[0].store_id, res.data[0].name);
      }
    });
  }, []);

  const items = allItems
    .filter((i) => !i.adminOnly || isAdmin())
    .map((i) => ({ key: i.key, label: i.label, icon: i.icon }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong style={{ fontSize: 16 }}>АвтоЗапчасти</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, fontSize: 14 }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          height: 56,
        }}>
          {/* Store selector */}
          <Tooltip title="Активный магазин">
            <Select
              prefix={<ShopOutlined />}
              placeholder={<><ShopOutlined /> Выберите магазин</>}
              value={activeStoreId ?? undefined}
              onChange={(id) => {
                const store = stores.find((s) => s.store_id === id);
                if (store) setActiveStore(store.store_id, store.name);
              }}
              style={{ minWidth: 200 }}
              options={stores.map((s) => ({ value: s.store_id, label: s.name }))}
            />
          </Tooltip>

          {!activeStoreId && (
            <Typography.Text type="danger" style={{ fontSize: 13 }}>
              Выберите магазин для работы
            </Typography.Text>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color={isAdmin() ? 'blue' : 'green'}>{user?.role}</Tag>
            <Typography.Text>{user?.last_name} {user?.first_name}</Typography.Text>
            <Button
              icon={<LogoutOutlined />}
              type="text"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Выйти
            </Button>
          </div>
        </Header>

        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
