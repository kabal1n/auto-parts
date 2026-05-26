/* eslint-disable */
// Dashboard screen — stats + tables

const Dashboard = () => {
  const totals = { count: 42, total: 128540, cash: 62180, card: 66360 };
  const recent = [
    { id: 1, time: '14:32', customer: 'Иванов Сергей', total: 2126.40, pay: 'Карта' },
    { id: 2, time: '14:18', customer: '—', total: 489.00, pay: 'Нал.' },
    { id: 3, time: '13:55', customer: 'Соколова Анна', total: 3290.00, pay: 'Карта' },
    { id: 4, time: '13:42', customer: 'Петров Дмитрий', total: 980.00, pay: 'Нал.' },
    { id: 5, time: '13:21', customer: '—', total: 705.80, pay: 'Карта' },
    { id: 6, time: '12:58', customer: 'Мухин В.', total: 1284.50, pay: 'Смеш.' },
  ];
  const low = [
    { id: 1, name: 'Фильтр масляный MANN W 712/52', article: 'AP-0118', qty: 3, min: 5 },
    { id: 2, name: 'Антифриз Felix Carbox -40 5л', article: 'AP-0507', qty: 0, min: 4 },
    { id: 3, name: 'Колодка тормозная Brembo P85020', article: 'AP-0298', qty: 1, min: 4 },
    { id: 4, name: 'Свеча зажигания Bosch FR7DC', article: 'AP-0233', qty: 2, min: 6 },
  ];
  const issues = [
    { id: 1, receipt: '№142', date: '14.05 09:12', item: 'Стартер Bosch 0001…', reason: 'Артикул не найден' },
    { id: 2, receipt: '№142', date: '14.05 09:12', item: 'Шкворень Tatra', reason: 'Цена в XLS пуста' },
  ];

  const fmt = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n) => n.toLocaleString('ru-RU');

  return (
    <>
      <PageHeader title="Главная"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Продаж сегодня" value={totals.count} icon={<IconCart size={16}/>}/>
        <StatCard label="Выручка сегодня" value={fmtInt(totals.total)} suffix="₽" tone="pos" icon={<IconRise size={16}/>}/>
        <StatCard label="Наличными" value={fmtInt(totals.cash)} suffix="₽" icon={<IconCart size={16}/>}/>
        <StatCard label="Дефицит товаров" value={low.length} tone="neg" icon={<IconAlert size={16}/>}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div>
          <SectionTitle>Продажи за сегодня</SectionTitle>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th style={{ width: 80 }}>Время</th><th>Клиент</th><th className="right" style={{ width: 130 }}>Сумма</th><th style={{ width: 100 }}>Оплата</th></tr></thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.time}</td>
                    <td className={s.customer === '—' ? 'muted' : 'name'}>{s.customer}</td>
                    <td className="right name">{fmt(s.total)}&nbsp;₽</td>
                    <td>{s.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <SectionTitle tone="danger">Товары ниже минимума ({low.length})</SectionTitle>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Товар</th><th style={{ width: 100 }}>Артикул</th><th className="right" style={{ width: 70 }}>Ост.</th><th className="right" style={{ width: 70 }}>Мин.</th></tr></thead>
              <tbody>
                {low.map((r) => (
                  <tr key={r.id}>
                    <td className="name">{r.name}</td>
                    <td className="mono muted">{r.article}</td>
                    <td className="right"><Tag variant="danger">{r.qty}</Tag></td>
                    <td className="right">{r.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionTitle tone="warning">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconAlert size={15}/> Проблемы с приёмкой ({issues.length})
          </span>
        </SectionTitle>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th style={{ width: 110 }}>Поступление</th><th style={{ width: 130 }}>Дата</th><th>Товар (XLS)</th><th>Причина</th><th style={{ width: 90 }}></th></tr></thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id}>
                  <td className="mono name">{i.receipt}</td>
                  <td className="mono muted">{i.date}</td>
                  <td>{i.item}</td>
                  <td>{i.reason}</td>
                  <td className="right"><Button variant="default" size="sm">Закрыть</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

Object.assign(window, { Dashboard });
