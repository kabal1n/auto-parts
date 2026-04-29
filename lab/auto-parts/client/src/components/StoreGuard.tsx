import { Alert } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { useActiveStore } from '../store/activeStore';

interface Props {
  children: React.ReactNode;
}

export default function StoreGuard({ children }: Props) {
  const { activeStoreId } = useActiveStore();

  if (!activeStoreId) {
    return (
      <Alert
        icon={<ShopOutlined />}
        showIcon
        type="warning"
        message="Магазин не выбран"
        description="Выберите активный магазин в правом верхнем углу, чтобы продолжить работу."
        style={{ maxWidth: 520 }}
      />
    );
  }

  return <>{children}</>;
}
