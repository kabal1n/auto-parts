/* eslint-disable */
// Products screen — catalog with search/filter/edit modal

const PRODUCTS = [
  { id: 1,  name: 'Колодка тормозная ATE 13.0460-7308.2',   article: 'AP-0042', barcode: '4607013500128', category: 'Тормозная система', mfr: 'ATE',    unit: 'к-т', price: 1284.50 },
  { id: 2,  name: 'Фильтр масляный MANN W 712/52',           article: 'AP-0118', barcode: '4607013500135', category: 'Фильтры',           mfr: 'MANN',   unit: 'шт',  price:  489.00 },
  { id: 3,  name: 'Свеча зажигания NGK BPR6ES',              article: 'AP-0231', barcode: '4607013500142', category: 'Зажигание',         mfr: 'NGK',    unit: 'шт',  price:  352.90 },
  { id: 4,  name: 'Антифриз Felix Carbox -40 5л',            article: 'AP-0507', barcode: '4607013500159', category: 'Технические жидкости', mfr: 'Felix', unit: 'л', price: 980.00 },
  { id: 5,  name: 'Масло моторное Shell Helix HX7 5W-40 4л', article: 'AP-0612', barcode: '4607013500166', category: 'Масла',             mfr: 'Shell',  unit: 'л',   price: 2390.00 },
  { id: 6,  name: 'Аккумулятор Varta Blue Dynamic 60 А·ч',   article: 'AP-0801', barcode: '4607013500173', category: 'Электрика',         mfr: 'Varta',  unit: 'шт',  price: 7890.00 },
  { id: 7,  name: 'Дворник Bosch Aerotwin AR604S',           article: 'AP-0922', barcode: '4607013500180', category: 'Кузов',             mfr: 'Bosch',  unit: 'шт',  price: 1450.00 },
  { id: 8,  name: 'Лампа автомобильная Osram H7 12V',        article: 'AP-1015', barcode: '4607013500197', category: 'Электрика',         mfr: 'Osram',  unit: 'шт',  price:  420.00 },
  { id: 9,  name: 'Тормозной диск Brembo 09.A455.10',        article: 'AP-1108', barcode: '4607013500203', category: 'Тормозная система', mfr: 'Brembo', unit: 'шт',  price: 4280.00 },
  { id: 10, name: 'Воздушный фильтр K&N 33-2865',            article: 'AP-1233', barcode: '4607013500210', category: 'Фильтры',           mfr: 'K&N',    unit: 'шт',  price: 1980.00 },
];

const Products = ({ pushToast }) => {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [editing, setEditing] = React.useState(null);

  const fmt = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = PRODUCTS.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.article.toLowerCase().includes(q) && !p.barcode.includes(q)) return false;
    }
    if (category && p.category !== category) return false;
    return true;
  });

  const categories = [...new Set(PRODUCTS.map((p) => p.category))];

  return (
    <>
      <PageHeader title="Товары">
        <div className="input-icon" style={{ width: 280 }}>
          <IconSearch className="ic"/>
          <input className="input" placeholder="Поиск по названию, артикулу, штрих-коду"
            value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select className="input" style={{ width: 200, paddingLeft: 12 }}
          value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <Button variant="primary" icon={<IconPlus size={14}/>}
          onClick={() => setEditing({ name: '', article: '', barcode: '', category: '', mfr: '', unit: 'шт', price: 0 })}>
          Добавить товар
        </Button>
      </PageHeader>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Название</th>
              <th style={{ width: 110 }}>Артикул</th>
              <th style={{ width: 140 }}>Штрих-код</th>
              <th style={{ width: 170 }}>Категория</th>
              <th style={{ width: 130 }}>Производитель</th>
              <th style={{ width: 60 }}>Ед.</th>
              <th className="right" style={{ width: 110 }}>Цена</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="name">{p.name}</td>
                <td className="mono muted">{p.article}</td>
                <td className="mono muted">{p.barcode}</td>
                <td><Tag>{p.category}</Tag></td>
                <td>{p.mfr}</td>
                <td className="muted">{p.unit}</td>
                <td className="right name mono">{fmt(p.price)}&nbsp;₽</td>
                <td className="right">
                  <Button variant="default" size="sm" icon={<IconPencil size={13}/>}
                    onClick={() => setEditing(p)}/>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-fg-3)' }}>Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} title={editing?.id ? 'Редактировать товар' : 'Добавить товар'}
        onClose={() => setEditing(null)} width={520}
        footer={<>
          {editing?.id && <Button variant="danger" icon={<IconTrash size={13}/>}>Удалить</Button>}
          <div style={{ flex: 1 }}/>
          <Button variant="default" onClick={() => setEditing(null)}>Отмена</Button>
          <Button variant="primary" onClick={() => { setEditing(null); pushToast(editing?.id ? 'Товар обновлён' : 'Товар добавлен', 'success'); }}>Сохранить</Button>
        </>}>
        {editing && (
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Название"><input className="input" defaultValue={editing.name}/></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Артикул"><input className="input" defaultValue={editing.article}/></Field>
              <Field label="Штрих-код (EAN-13)"><input className="input" defaultValue={editing.barcode}/></Field>
            </div>
            <Field label="Категория">
              <select className="input" defaultValue={editing.category} style={{ paddingLeft: 12 }}>
                <option value="">—</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Производитель"><input className="input" defaultValue={editing.mfr}/></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Единица измерения"><input className="input" defaultValue={editing.unit}/></Field>
              <Field label="Цена (₽)"><input className="input" type="number" defaultValue={editing.price}/></Field>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

const Field = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-fg-3)', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

const Placeholder = ({ title }) => (
  <>
    <PageHeader title={title}/>
    <Card style={{ minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-fg-3)' }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-fg-2)' }}>Раздел в разработке</div>
      <div style={{ fontSize: 13 }}>Этот экран есть в продакшен-коде, но не входит в демо UI-кита.</div>
    </Card>
  </>
);

Object.assign(window, { Products, Placeholder });
