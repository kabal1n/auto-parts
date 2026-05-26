/* eslint-disable */
// Sales screen — cash register

const CATALOG = [
  { id: 1,  name: 'Колодка тормозная ATE 13.0460-7308.2', article: 'AP-0042', price: 1284.50, stock: 12 },
  { id: 2,  name: 'Фильтр масляный MANN W 712/52',         article: 'AP-0118', price:  489.00, stock: 3 },
  { id: 3,  name: 'Свеча зажигания NGK BPR6ES',            article: 'AP-0231', price:  352.90, stock: 1204 },
  { id: 4,  name: 'Антифриз Felix Carbox -40 5л',          article: 'AP-0507', price:  980.00, stock: 0 },
  { id: 5,  name: 'Масло моторное Shell Helix HX7 5W-40 4л',article: 'AP-0612', price: 2390.00, stock: 28 },
  { id: 6,  name: 'Аккумулятор Varta Blue Dynamic 60 А·ч', article: 'AP-0801', price: 7890.00, stock: 4 },
  { id: 7,  name: 'Дворник Bosch Aerotwin AR604S',         article: 'AP-0922', price: 1450.00, stock: 16 },
  { id: 8,  name: 'Лампа автомобильная Osram H7 12V',      article: 'AP-1015', price:  420.00, stock: 88 },
];

const CUSTOMERS = [
  { id: 1, last: 'Иванов',  first: 'Сергей',  phone: '+7 (916) 234-56-78', discount: 10, status: 'VIP' },
  { id: 2, last: 'Соколова', first: 'Анна',   phone: '+7 (905) 117-89-02', discount: 5,  status: 'Постоянный' },
  { id: 3, last: 'Петров',  first: 'Дмитрий', phone: '+7 (903) 442-08-11', discount: 0,  status: 'Обычный' },
];

const fmt = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Sales = ({ pushToast }) => {
  const [cart, setCart] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [customer, setCustomer] = React.useState(null);
  const [phone, setPhone] = React.useState('');
  const [phoneResults, setPhoneResults] = React.useState([]);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payType, setPayType] = React.useState('cash');
  const [cashGiven, setCashGiven] = React.useState(0);

  const onSearch = (v) => {
    setSearch(v);
    if (!v) { setResults([]); return; }
    setResults(CATALOG.filter((p) =>
      p.name.toLowerCase().includes(v.toLowerCase()) ||
      (p.article || '').toLowerCase().includes(v.toLowerCase())
    ).slice(0, 6));
  };

  const addToCart = (p) => {
    if (p.stock === 0) { pushToast('Товар недоступен — нет в наличии', 'error'); return; }
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock) { pushToast(`Доступно только ${p.stock} шт`, 'error'); return c; }
        return c.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...c, { ...p, qty: 1 }];
    });
    setSearch('');
    setResults([]);
  };

  const setQty = (id, q) => {
    if (q <= 0) { setCart((c) => c.filter((i) => i.id !== id)); return; }
    setCart((c) => c.map((i) => i.id === id ? { ...i, qty: Math.min(q, i.stock) } : i));
  };

  const onPhone = (v) => {
    setPhone(v);
    const digits = v.replace(/\D/g, '');
    if (digits.length < 3) { setPhoneResults([]); return; }
    setPhoneResults(CUSTOMERS.filter((c) => c.phone.replace(/\D/g, '').includes(digits)));
  };

  const pickCustomer = (c) => { setCustomer(c); setPhone(''); setPhoneResults([]); };
  const clearCustomer = () => setCustomer(null);

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const discount = customer ? customer.discount : 0;
  const discountAmt = subtotal * (discount / 100);
  const total = subtotal - discountAmt;

  const openPay = () => {
    if (!cart.length) { pushToast('Добавьте товары в корзину', 'error'); return; }
    setCashGiven(Math.round(total * 100) / 100);
    setPayType('cash');
    setPayOpen(true);
  };

  const submitSale = () => {
    setPayOpen(false);
    setCart([]);
    setCustomer(null);
    pushToast('Продажа оформлена', 'success');
  };

  const change = Math.max(0, cashGiven - total);
  const enough = cashGiven >= total - 0.01;

  return (
    <>
      <PageHeader title="Новая продажа">
        {customer && (
          <Tag variant="info">
            Клиент · скидка {discount}%
          </Tag>
        )}
      </PageHeader>

      <div className="sales-grid">
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <TextInput value={search} onChange={onSearch} size="lg"
              icon={<IconSearch className="ic"/>}
              placeholder="Поиск товара по названию, артикулу или сканируйте штрих-код…"/>
            {results.length > 0 && (
              <div className="search-popup">
                {results.map((p) => (
                  <div key={p.id} className="item" onClick={() => addToCart(p)}>
                    <span className="name">{p.name}</span>
                    <span className="price mono">{fmt(p.price)}&nbsp;₽</span>
                    <span className={`stock ${p.stock < 5 ? 'low' : ''}`}>
                      {p.stock > 0 ? `${p.stock} шт` : 'нет в наличии'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cart-table-wrap">
            {cart.length === 0 ? (
              <div className="cart-empty">Корзина пуста</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Товар</th><th className="right" style={{ width: 110 }}>Цена</th><th style={{ width: 100 }}>Кол-во</th><th className="right" style={{ width: 120 }}>Сумма</th><th style={{ width: 50 }}></th></tr></thead>
                <tbody>
                  {cart.map((i) => (
                    <tr key={i.id}>
                      <td className="name">{i.name}</td>
                      <td className="right mono">{fmt(i.price)}&nbsp;₽</td>
                      <td>
                        <input className="qty-input" type="number" min={0}
                          value={i.qty} onChange={(e) => setQty(i.id, parseInt(e.target.value || '0', 10))}/>
                      </td>
                      <td className="right name mono">{fmt(i.qty * i.price)}&nbsp;₽</td>
                      <td className="right">
                        <Button variant="danger" size="sm" icon={<IconTrash size={13}/>}
                          onClick={() => setQty(i.id, 0)}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg-1)' }}>Клиент (необязательно)</div>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <TextInput value={phone} onChange={onPhone}
                icon={<IconUserCircle className="ic"/>}
                placeholder="Начните вводить номер телефона…"/>
              {phoneResults.length > 0 && (
                <div className="search-popup">
                  {phoneResults.map((c) => (
                    <div key={c.id} className="item" onClick={() => pickCustomer(c)}>
                      <span className="name">{c.last} {c.first}</span>
                      <span className="mono muted">{c.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Вводите цифры — «+7» добавится автоматически</div>

            {customer && (
              <div className="customer-chip">
                <span className="name">{customer.last} {customer.first}</span>
                <Tag variant="success">{customer.status} · {customer.discount}%</Tag>
                <button className="remove" onClick={clearCustomer}>✕</button>
              </div>
            )}

            <div className="divider" style={{ margin: '16px 0' }}/>
            <div className="totals-row"><span className="muted">Сумма:</span><span className="numeric">{fmt(subtotal)}&nbsp;₽</span></div>
            {discount > 0 && (
              <div className="totals-row"><span className="muted">Скидка {discount}%:</span><span className="numeric" style={{ color: 'var(--color-danger)' }}>−{fmt(discountAmt)}&nbsp;₽</span></div>
            )}
            <div className="totals-row total"><span>Итого:</span><span className="numeric">{fmt(total)}&nbsp;₽</span></div>

            <Button variant="primary" size="lg" onClick={openPay} style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>Оформить оплату</Button>
            <Button variant="default" onClick={() => setCart([])} style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>Очистить корзину</Button>
          </Card>
        </div>
      </div>

      <Modal open={payOpen} title="Оплата" onClose={() => setPayOpen(false)} width={420}
        footer={<>
          <Button variant="default" onClick={() => setPayOpen(false)}>Отмена</Button>
          <Button variant="primary" onClick={submitSale} disabled={payType === 'cash' && !enough}>Провести продажу</Button>
        </>}>
        <div className="muted" style={{ fontSize: 12 }}>К оплате</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600,
          color: 'var(--color-fg-1)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.011em',
          marginBottom: 16,
        }}>{fmt(total)}&nbsp;₽</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-fg-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Способ оплаты</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['cash', 'Наличные'], ['card', 'Карта'], ['mixed', 'Смешанная']].map(([k, l]) => (
              <button key={k} onClick={() => setPayType(k)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-sans)',
                  border: '1px solid', cursor: 'pointer',
                  borderColor: payType === k ? 'var(--color-primary)' : 'var(--color-border)',
                  background: payType === k ? 'var(--color-primary-bg)' : '#fff',
                  color: payType === k ? 'var(--color-primary-press)' : 'var(--color-fg-2)',
                  fontWeight: payType === k ? 500 : 400,
                }}>{l}</button>
            ))}
          </div>
        </div>

        {payType === 'cash' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-fg-1)', marginBottom: 4 }}>Принято от покупателя (₽)</div>
            <input className="input" type="number" value={cashGiven}
              onChange={(e) => setCashGiven(parseFloat(e.target.value || '0'))} autoFocus/>
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 12 }}>Сдача</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: enough ? 'var(--color-success)' : 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(change)}&nbsp;₽
              </div>
            </div>
          </>
        )}
        {payType === 'card' && (
          <div style={{ background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, textAlign: 'center', color: 'var(--color-fg-2)', fontSize: 13 }}>
            Ожидание оплаты на терминале…
          </div>
        )}
        {payType === 'mixed' && (
          <div className="muted" style={{ fontSize: 13 }}>Заполните суммы в разделе ниже (демо).</div>
        )}
      </Modal>
    </>
  );
};

Object.assign(window, { Sales });
