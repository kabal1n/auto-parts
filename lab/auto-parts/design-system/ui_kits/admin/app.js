/* eslint-disable */
// Main App — wires shell + screens together

const SCREENS = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  products: 'Products',
};

const App = () => {
  const [active, setActive] = React.useState('sales');
  const [role, setRole] = React.useState('admin');
  const [store, setStore] = React.useState('Магазин «Центральный»');
  const [toasts, setToasts] = React.useState([]);

  const pushToast = (msg, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  // If user becomes cashier on the dashboard, redirect to sales
  React.useEffect(() => {
    if (role === 'cashier' && (active === 'dashboard' || active === 'reports' || active === 'users' || active === 'audit' || active === 'suppliers')) {
      setActive('sales');
    }
  }, [role, active]);

  const renderScreen = () => {
    switch (active) {
      case 'dashboard': return <Dashboard/>;
      case 'sales':     return <Sales pushToast={pushToast}/>;
      case 'products':  return <Products pushToast={pushToast}/>;
      default: {
        const label = NAV_ITEMS.find((i) => i.key === active)?.label ?? active;
        return <Placeholder title={label}/>;
      }
    }
  };

  return (
    <div className="app">
      <Sidebar active={active} onNavigate={setActive} role={role} lowStockCount={4}/>
      <div className="main">
        <TopBar
          role={role}
          onToggleRole={() => setRole((r) => r === 'admin' ? 'cashier' : 'admin')}
          activeStore={store}
          stores={['Магазин «Центральный»', 'Магазин «Северный»', 'Магазин «Южный»']}
          onChangeStore={setStore}
          user={role === 'admin' ? 'Петров А.' : 'Сидорова М.'}
          onLogout={() => pushToast('Сессия завершена')}
        />
        <main className="content">{renderScreen()}</main>
      </div>
      <div className="toast-stack">
        {toasts.map((t) => <Toast key={t.id} tone={t.tone}>{t.msg}</Toast>)}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
