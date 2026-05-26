/* eslint-disable */
// Shell: Sidebar + TopBar (with role / store / user)

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Главная',          icon: IconHome,     adminOnly: true },
  { key: 'sales',     label: 'Касса / Продажа',  icon: IconCart,     adminOnly: false },
  { key: 'products',  label: 'Товары',           icon: IconGrid,     adminOnly: false },
  { key: 'stock',     label: 'Остатки',          icon: IconDatabase, adminOnly: false },
  { key: 'customers', label: 'Клиенты',          icon: IconUsers,    adminOnly: false },
  { key: 'orders',    label: 'Заказы клиентов',  icon: IconFileText, adminOnly: false },
  { key: 'receipts',  label: 'Поступления',      icon: IconInbox,    adminOnly: false },
  { key: 'reorder',   label: 'Заявки на закупку',icon: IconListChk,  adminOnly: false },
  { key: 'reports',   label: 'Отчёты',           icon: IconBar,      adminOnly: true },
  { key: 'users',     label: 'Сотрудники',       icon: IconUser,     adminOnly: true },
  { key: 'audit',     label: 'Журнал действий',  icon: IconClipChk,  adminOnly: true },
  { key: 'suppliers', label: 'Поставщики',       icon: IconTruck,    adminOnly: true },
];

const Sidebar = ({ active, onNavigate, role, lowStockCount }) => {
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === 'admin');
  return (
    <aside className="sider">
      <div className="brand">
        <BrandMark size={22}/>
        <span className="name">АвтоЗапчасти</span>
      </div>
      <nav>
        {items.map((i) => {
          const Icon = i.icon;
          const isActive = active === i.key;
          const showBadge = i.key === 'stock' && lowStockCount > 0;
          return (
            <button key={i.key} className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onNavigate(i.key)}>
              <Icon className="ic" size={16}/>
              <span>{i.label}</span>
              {showBadge && <span className="badge">{lowStockCount}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

const TopBar = ({ role, onToggleRole, activeStore, stores, onChangeStore, user, onLogout }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);
  return (
    <header className="topbar">
      <div ref={ref} style={{ position: 'relative' }}>
        <button className="store-select" onClick={() => setOpen(!open)}>
          <IconStore className="ic" size={14}/>
          <span>{activeStore}</span>
          <IconChev className="ic" size={12}/>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 220,
            background: '#fff', border: '1px solid var(--color-border)',
            borderRadius: 6, boxShadow: 'var(--shadow-md)', zIndex: 50,
          }}>
            {stores.map((s) => (
              <div key={s} onClick={() => { onChangeStore(s); setOpen(false); }}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: s === activeStore ? 'var(--color-primary-bg)' : 'transparent',
                  color: s === activeStore ? 'var(--color-primary-press)' : 'var(--color-fg-1)',
                }}>
                <IconStore size={12} className="ic"/>{s}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="spacer"/>
      <div className="user-block">
        <button onClick={onToggleRole} style={{ background:'transparent', border:0, padding:0, cursor:'pointer' }}
                title="Переключить роль (демо)">
          <Tag variant={role === 'admin' ? 'admin' : 'cashier'}>
            {role === 'admin' ? 'Администратор' : 'Кассир'}
          </Tag>
        </button>
        <span className="name">{user}</span>
        <Button variant="ghost" size="sm" icon={<IconLogout size={14}/>} onClick={onLogout}>Выйти</Button>
      </div>
    </header>
  );
};

Object.assign(window, { Sidebar, TopBar, NAV_ITEMS });
