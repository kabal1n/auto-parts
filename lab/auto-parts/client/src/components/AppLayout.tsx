import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Tag, Select, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
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
  TruckOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useActiveStore } from '../store/activeStore';
import { storesApi } from '../api';

const { Sider, Header, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const adminItems: MenuItem[] = [
  { key: '/', label: 'Главная', icon: <HomeOutlined /> },
  {
    type: 'group', label: 'Продажи',
    children: [
      { key: '/sales',     label: 'Касса / Продажа', icon: <ShoppingCartOutlined /> },
      { key: '/customers', label: 'Клиенты',          icon: <TeamOutlined /> },
      { key: '/orders',    label: 'Заказы клиентов',  icon: <FileTextOutlined /> },
    ],
  },
  {
    type: 'group', label: 'Склад',
    children: [
      { key: '/products', label: 'Товары',            icon: <AppstoreOutlined /> },
      { key: '/stock',    label: 'Остатки',           icon: <DatabaseOutlined /> },
      { key: '/receipts', label: 'Поступления',       icon: <InboxOutlined /> },
      { key: '/reorder',  label: 'Заявки на закупку', icon: <UnorderedListOutlined /> },
    ],
  },
  {
    type: 'group', label: 'Управление',
    children: [
      { key: '/reports',   label: 'Отчёты',         icon: <BarChartOutlined /> },
      { key: '/suppliers', label: 'Поставщики',      icon: <TruckOutlined /> },
      { key: '/users',     label: 'Сотрудники',      icon: <UserOutlined /> },
      { key: '/audit',     label: 'Журнал действий', icon: <AuditOutlined /> },
    ],
  },
];

const cashierItems: MenuItem[] = [
  {
    type: 'group', label: 'Продажи',
    children: [
      { key: '/sales',     label: 'Касса / Продажа', icon: <ShoppingCartOutlined /> },
      { key: '/customers', label: 'Клиенты',          icon: <TeamOutlined /> },
      { key: '/orders',    label: 'Заказы клиентов',  icon: <FileTextOutlined /> },
    ],
  },
  {
    type: 'group', label: 'Склад',
    children: [
      { key: '/products', label: 'Товары',            icon: <AppstoreOutlined /> },
      { key: '/stock',    label: 'Остатки',           icon: <DatabaseOutlined /> },
      { key: '/receipts', label: 'Поступления',       icon: <InboxOutlined /> },
      { key: '/reorder',  label: 'Заявки на закупку', icon: <UnorderedListOutlined /> },
    ],
  },
];

interface Store { store_id: number; name: string }

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuthStore();
  const { activeStoreId, activeStoreName, setActiveStore, clearActiveStore } = useActiveStore();
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

  const items = isAdmin() ? adminItems : cashierItems;

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong style={{ fontSize: 15 }}>АвтоЗапчасти</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, fontSize: 13, marginTop: 4 }}
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
          {/* Store selector — admin only; cashier sees a locked label */}
          {isAdmin() ? (
            <>
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
            </>
          ) : (
            <Typography.Text style={{ fontSize: 14 }}>
              <ShopOutlined style={{ marginRight: 6 }} />{activeStoreName}
            </Typography.Text>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color={isAdmin() ? 'blue' : 'green'}>{user?.role}</Tag>
            <Typography.Text>{user?.last_name} {user?.first_name}</Typography.Text>
            <Button
              icon={<LogoutOutlined />}
              type="text"
              onClick={() => { clearActiveStore(); logout(); navigate('/login'); }}
            >
              Выйти
            </Button>
          </div>
        </Header>

        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto', minHeight: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
