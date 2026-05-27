# АвтоЗапчасти — Design System

A design system for an information system that automates a chain of auto-parts retail stores ("Информационная система автоматизации сети магазинов автозапчастей"). The product is a corporate, in-house tool for store staff (cashiers, store managers, administrators) — it is not a customer-facing site.

This system codifies the calm, technical, ERP/CRM aesthetic the product needs to live in: dense data, fast workflows, premium feel, low visual noise, no marketing flourishes.

---

## Sources

The visual + interaction language documented here is derived from the production codebase:

- **Codebase (imported):** [`kabal1n/auto-parts`](https://github.com/kabal1n/auto-parts) — `lab/auto-parts/client/` (React 19 + Vite + TypeScript + Ant Design 6). Imported files live at `lab/auto-parts/client/**` as read-only reference.
- **Stack:** React 19, Ant Design 6, axios, zustand, react-router-dom 7, dayjs.
- **No Figma, no brand book, no slide deck** were provided. Brand identity (logo mark, full wordmark, refined palette/type beyond Ant Design defaults) was designed for this system to give the product its own premium-corporate identity.

---

## Product context

**АвтоЗапчасти** ("Auto Parts") is an internal operations console for a chain of brick-and-mortar auto-parts stores. There is **one product surface**: a desktop-first web admin/POS console. Two user roles share it:

| Role | Russian label | Scope |
|---|---|---|
| Administrator | Администратор | Full access. Multi-store, can edit stock minimums, manage users, view reports + audit log, manage suppliers. |
| Cashier | Кассир | Locked to one store. Runs the register (Касса/Продажа), looks up products + stock, handles customer orders and incoming receipts. |

### Surfaces

The console is organised as a left-rail navigation with **13 pages**:

1. **Главная** (Dashboard) — admin only. Today's sales, low-stock alerts, receipt issues.
2. **Касса / Продажа** (Sales / Register) — primary cashier workflow. Cart, barcode scanner, customer lookup, mixed payment.
3. **Товары** (Products) — catalog. Name, article, barcode, category, manufacturer, unit, price.
4. **Остатки** (Stock) — per-store on-hand / reserved / available, with editable minimums.
5. **Клиенты** (Customers) — clients + their cars (brand, model, year, VIN), tiered loyalty discounts.
6. **Заказы клиентов** (Customer Orders) — special-order workflow.
7. **Поступления** (Receipts) — incoming inventory, with XLS upload + parse + auto-match to catalog.
8. **Заявки на закупку** (Reorder requests) — low-stock-driven purchase requests.
9. **Отчёты** (Reports) — admin only. Sales aggregates.
10. **Сотрудники** (Employees) — admin only. User management.
11. **Журнал действий** (Audit log) — admin only.
12. **Поставщики** (Suppliers) — admin only.
13. **Login** — credentials → optional store selection step.

---

## Index — what's in this folder

```
.
├── README.md                  ← you are here
├── SKILL.md                   ← Agent Skill manifest (cross-compatible with Claude Code Skills)
├── colors_and_type.css        ← all design tokens (CSS variables) + semantic type classes
├── assets/                    ← logos, brand marks
│   ├── logo.svg               ← horizontal: mark + Cyrillic wordmark
│   ├── logo-mark.svg          ← mark only (favicon, app icon)
│   └── logo-mono.svg          ← monochrome variant for dark backgrounds / print
├── preview/                   ← Design-System-tab cards (registered as assets)
│   ├── color-*.html           ← palette, neutrals, semantic, role
│   ├── type-*.html            ← typography specimens, scale, mono
│   ├── space-*.html           ← spacing, radius, shadow, motion
│   ├── component-*.html       ← buttons, inputs, tags, tables, modals…
│   └── brand-*.html           ← logo, iconography, copy voice
├── ui_kits/
│   └── admin/                 ← the AutoParts admin/POS console UI kit
│       ├── README.md
│       ├── index.html         ← interactive click-through prototype
│       ├── *.jsx              ← AppShell, Sidebar, TopBar, DataTable, …
│       └── styles.css
└── lab/auto-parts/client/     ← imported source from the original codebase (reference)
```

---

## Content fundamentals

> **TL;DR:** Russian, formal-but-warm, sentence case, no emoji, no marketing voice. Copy is short, imperative, and assumes the reader is at work.

- **Language.** Russian throughout (`lang="ru"`). All UI strings — labels, buttons, table headers, error messages, toasts. No mixed-language UI.
- **Tone.** Professional and direct, like a competent colleague. Не "Привет, давай продадим!" — а «Новая продажа». The user is staff using a tool, not a guest being courted.
- **Address.** No "ты"/"вы" pronouns in chrome. Imperative when prompting action ("Введите логин", "Добавьте товары в корзину", "Выберите магазин"). Errors are factual ("Сумма наличных меньше суммы к оплате"), not apologetic.
- **Casing.** **Sentence case everywhere** — including buttons, table headers, page titles. Never Title Case Like English. (Examples from code: "Касса / Продажа", "Журнал действий", "Добавить товар", "Оформить оплату".)
- **Punctuation.** Russian conventions: «» guillemets for quotes, — em-dash with spaces, ₽ for currency (after the number with a space: `1 200,00 ₽`). Decimal separator may be comma or period — the codebase uses periods (`Number(v).toFixed(2)`); we keep that for consistency.
- **Numbers.** Always tabular-numeric in tables (`font-variant-numeric: tabular-nums`). Two decimals for currency. Quantities are whole numbers + unit ("3 шт", "1,5 л").
- **Empty states.** Short, factual, no apology. "Корзина пуста" / "Продаж за сегодня нет" / "Дефицита нет".
- **Status copy.** Verbs in past participle: «Проведено», «Отменено», «На проверке», «Черновик». Severity copy is short: «Мало», «В норме».
- **No emoji.** No emoji anywhere in the UI. Status is communicated with semantic tags + icons.
- **No marketing voice.** No exclamation points, no "Welcome!", no friendly onboarding splash. The user signs in and goes to work.
- **Compact labels.** Column headers shorten where possible: «Кол-во», «Ед.», «Цена», «Сумма». Abbreviations are conventional, not invented.
- **Confirmations.** `Popconfirm` for destructive: `«Удалить товар?» — Удалить / Отмена`. Confirm button is red if destructive.

### Voice examples (verbatim from codebase)

| Context | Copy |
|---|---|
| Page title | `Новая продажа` · `Главная` · `Остатки на складе` · `Журнал действий` |
| Empty state | `Корзина пуста` · `Дефицита нет` · `Продаж за сегодня нет` |
| Hint under input | `Вводите цифры — «+7» добавится автоматически` |
| Validation | `Введите логин` · `Сумма наличных меньше суммы к оплате` |
| Warning toast | `Товар недоступен — весь остаток зарезервирован под заказы` |
| Success toast | `Продажа оформлена` · `Товар обновлён` · `Остаток обновлён` |
| Status tag | `Мало` (red) · `В норме` (green) · `Проведено` · `Черновик` · `На проверке` · `Отменено` |
| Primary CTA | `Войти` · `Оформить оплату` · `Добавить товар` · `Провести продажу` |
| Search placeholder | `Поиск товара по названию, артикулу или сканируйте штрих-код...` |

---

## Visual foundations

> **TL;DR:** White surfaces on a soft slate background. Premium emerald (#1F8A5B) for primary actions and selection. Slate-based neutral scale. Subtle one-axis shadows. 8px radius default. No gradients, no textures, no illustrations. IBM Plex Sans + JetBrains Mono. Motion is fast and out-eased — never bouncy.

### Color

- **Surfaces.** App background `#F4F6FA` (a desaturated slate, calmer than Ant Design's `#f5f5f5`). All cards, modals, the sidebar and the topbar sit on **pure white** (`#FFFFFF`). This is the cornerstone of the "premium" feel — high-contrast white panels, soft non-white ground.
- **Borders.** Hairlines at `#E1E6EF` everywhere structural; `#EEF1F6` for inside-card dividers. Never use a heavy border — depth comes from shadow + tone, not stroke weight.
- **Primary.** `#1F8A5B` — a premium emerald green. Calm, sophisticated, technical — not lime, not minty. Hover `#176E48`, press `#0F5535`. Subtle background `#ECF7F1` for selected nav, primary-tinted tags, info banners.
- **Text.** 4-step grayscale: `#0F172A` (fg-1, headings + numerals), `#334155` (fg-2, body), `#64748B` (fg-3, labels), `#94A3B8` (fg-4, hint/placeholder).
- **Semantic.** Each status has a 3-token group: fg / bg / border.
  - **Success** `#16A34A` / `#ECFDF5` / `#BBF7D0` — "В норме", "Проведено", customer-attached discount.
  - **Danger** `#DC2626` / `#FEF2F2` / `#FECACA` — "Мало", deletion, low-stock alarms.
  - **Warning** `#D97706` / `#FFFBEB` / `#FED7AA` — "Проблемы с приёмкой", validation hints.
  - **Info** = primary emerald.
- **Role accents.** Administrator = emerald tag (brand color); Cashier = neutral slate tag. They're visually distinct so you can tell at a glance which role is signed in, without the cashier tag clashing with the brand green.
- **No gradients.** Anywhere. Backgrounds are flat fills. Statistics use colored numerals on white, not gradient cards.
- **Imagery vibe.** None by default. The product carries no decorative imagery — no hero photos, no illustrations, no patterns. If imagery ever appears (e.g. a car photo on a customer record), it should be clean studio-style, cool-neutral, never warm or grainy.

### Type

- **Family.** **IBM Plex Sans** for all UI. Strong Cyrillic coverage, technical but humane, premium feel. Falls back to Segoe UI → system-ui. **JetBrains Mono** for codes, SKUs, barcodes and any tabular numerical context where alignment matters more than density.
- **Substitution note:** the original codebase uses `'Segoe UI', system-ui, sans-serif`. We upgrade to IBM Plex Sans because the brief calls for a "premium corporate product, not a templated admin panel". **If the team prefers to stay on Segoe UI or has a different licensed family in mind, swap `--font-sans` in `colors_and_type.css`.**
- **Scale.** 12 / 13 / 14 / 15 / 16 / 18 / 20 / 24 / 30 / 38 px. 14 is the default UI size — the codebase makes a point of standardizing on it (`.ant-table { font-size: 14px }`).
- **Weights.** 400 body, 500 emphasised, 600 headings + button labels, 700 reserved for stat hero numbers and the wordmark.
- **Numerals.** `font-variant-numeric: tabular-nums` on every table, every statistic, every monetary string. Non-tabular numbers in data are a smell.
- **Tracking.** Slightly tight (`-0.011em`) on headings and stats. Wide tracking (`+0.04em`) only on small all-caps overlines.

### Spacing & layout

- **4-px base scale.** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64.
- **Density.** Forms, tables and cards use Ant Design `size="middle"` or `size="small"`. Padding inside cards is 20px / 24px depending on importance.
- **App layout.** Fixed 232-px left sider (white, hairline-right) + fixed 56-px top header (white, hairline-bottom) + a `padding: 24px` content area on the app-bg.
- **Page rhythm.** Every page opens with an `h4`-sized title (24px / weight 600) on the left, page-level controls (search, filters, primary CTA) flowing to the right on the same row.
- **Tables.** Ant Design `size="middle"`. Row hover swaps to `--color-bg-subtle`. No zebra striping. Hairline grid only between rows. Sticky header for long lists.

### Radius

- **Buttons + inputs:** `6px`.
- **Cards, modals, tables:** `8px`. The single most-used radius.
- **Login card, large dialogs:** `10px`.
- **Tags / badges:** `4px`.
- **Pills (status chips with strong color):** `999px`. Sparingly.

### Elevation

A 3-step shadow scale, all single-axis (no spread), all warm-neutral against slate background:

- `--shadow-xs` `0 1px 2px rgba(15,23,42,0.04)` — chip-on-card, subtle.
- `--shadow-sm` `0 2px 8px rgba(15,23,42,0.06)` — **default card resting**.
- `--shadow-md` `0 4px 16px rgba(15,23,42,0.08)` — card hover, dropdown.
- `--shadow-lg` `0 12px 32px rgba(15,23,42,0.10)` — modal.
- `--shadow-focus` `0 0 0 3px rgba(31, 138, 91,0.18)` — keyboard focus ring (primary, semi-transparent).

No inner shadows on cards. No "glow" colors. No multi-layer shadows.

### Borders vs. shadows

Cards have **both** a hairline border (`--color-border`) **and** a soft `--shadow-sm`. The border keeps the card crisp at the edge; the shadow lifts it off the slate background. Don't use one without the other.

### Hover / press / focus

- **Buttons.** Hover = primary `#176E48` (one step darker), no scale, no shadow change. Press = `#0F5535`, no shrink. Disabled = 50% opacity, no pointer cursor.
- **Rows.** Hover = `--color-bg-subtle`, full row.
- **Cards.** Hover = shadow steps from `sm` → `md` (`transition: box-shadow 180ms var(--ease-out)`). No translate.
- **Focus.** Always a 3-px primary ring (`--shadow-focus`), never replacing the border, always combining with it.
- **No bounce.** No `transform: scale()`, no spring easings. Easing is `cubic-bezier(0.2, 0.8, 0.2, 1)` for entrances and `cubic-bezier(0.4, 0, 0.2, 1)` for two-way state changes.

### Motion

- **Durations.** 120 ms (instant feedback — hover, focus), 180 ms (default — color/shadow change), 240 ms (modal open/close).
- **No bounces, no parallax, no animated illustrations.** This is corporate software. Animation is feedback, not delight.

### Blur / transparency

Used sparingly and only on overlays: modal scrim `rgba(15,23,42,0.45)` with no backdrop-blur. Tooltips are solid `--color-bg-inverse`. No frosted glass surfaces — they read as flashy and don't fit the brief.

### Layout rules

- **One primary action per view.** Top-right of the page header. Secondary actions are ghost buttons or icon buttons.
- **Tables fill width.** Always. Horizontal scroll only kicks in below their declared `scroll.x` threshold.
- **Modals are narrow + tall.** Default 420–560 px. Two columns of form fields only when needed.
- **Drawers (right-side, 480 px)** for record detail views with secondary CRUD (e.g. customer + their cars).

---

## Iconography

- **Source set: Ant Design Icons** (`@ant-design/icons`) — the line-icon family used throughout the production codebase. ~24×24 viewBox, 1.5–2 px stroke equivalent, line style with selective fills. Used as React components in source; we cannot redistribute the package's SVGs in this design system folder.
- **CDN substitution:** [**Lucide**](https://lucide.dev) (`https://unpkg.com/lucide-static/icons/*.svg`). Lucide matches Ant Design Icons in stroke weight, line style, viewBox and overall vocabulary closely enough to read as the same family in mocks. **This is a substitution — if you ship production designs, render with the original `@ant-design/icons` React components.** Tracked in caveats.
- **Mapping** (used in this design system and the UI kit):

  | Concept (Russian) | Used in | Ant Design icon | Lucide equivalent |
  |---|---|---|---|
  | Home/dashboard | Главная | `HomeOutlined` | `home` |
  | Cart / sale | Касса | `ShoppingCartOutlined` | `shopping-cart` |
  | Products | Товары | `AppstoreOutlined` | `layout-grid` |
  | Stock | Остатки | `DatabaseOutlined` | `database` |
  | Customers | Клиенты | `TeamOutlined` | `users` |
  | Orders | Заказы | `FileTextOutlined` | `file-text` |
  | Receipts | Поступления | `InboxOutlined` | `inbox` |
  | Reorder | Заявки | `UnorderedListOutlined` | `list-checks` |
  | Reports | Отчёты | `BarChartOutlined` | `bar-chart-3` |
  | Users | Сотрудники | `UserOutlined` | `user` |
  | Audit | Журнал | `AuditOutlined` | `clipboard-check` |
  | Suppliers | Поставщики | `TruckOutlined` | `truck` |
  | Store | Магазин | `ShopOutlined` | `store` |
  | Search | поиск | `SearchOutlined` | `search` |
  | Delete | удалить | `DeleteOutlined` | `trash-2` |
  | Edit | редактировать | `EditOutlined` | `pencil` |
  | Logout | Выйти | `LogoutOutlined` | `log-out` |
  | Add | добавить | `PlusOutlined` | `plus` |
  | Lock | пароль | `LockOutlined` | `lock` |

- **No emoji**, ever, in product UI.
- **No Unicode characters** used as icons. (One exception we kept from the original: `✕` as a small "remove" button inside the attached-customer chip; could be swapped for `XOutlined`.)
- **No custom-drawn SVG illustrations** in this system. The brand mark is the only bespoke vector.
- **Icon sizing.** 14 px inline with body, 16 px in buttons, 20 px in nav, 24 px in stat cards. Always set `color: currentColor` so icons inherit semantic intent.
- **Color in icons.** Single-color, inherits text color. The two exceptions: success-green checkmarks on resolved states, danger-red on destructive actions.

---

## Caveats / substitutions

1. **Type substitution.** Original uses `Segoe UI` (system font). We ship **IBM Plex Sans** to give the product its own typographic identity. Easily reverted via `--font-sans`.
2. **Icon substitution.** Production uses **`@ant-design/icons`**. Design-system previews use **Lucide** via CDN as the closest visual match. Mock-only — real designs and production code should use the original icon package.
3. **Logo is new.** No brand mark existed in the codebase (the `public/favicon.svg` and `public/icons.svg` files turned out to be unmodified Vite template assets — not the actual product brand). We designed a calm geometric gear-mark + Cyrillic wordmark in the primary blue. Treat as a v1 placeholder; iterate as needed.
4. **No marketing surface.** The product has no landing page, marketing site, or external website — there's only the internal admin/POS console. So this design system contains **one** UI kit (`ui_kits/admin/`).
5. **Color refinement.** Ant Design's default `#1677ff` blue was replaced with a premium emerald scale (`#1F8A5B`) and slate-based neutrals. To revert, override the `--color-primary` family + neutrals in `colors_and_type.css`.y` family + neutrals in `colors_and_type.css`.

---

## Using this system

- For **production code**: copy `colors_and_type.css` into the client, swap `font-family` + Ant Design `ConfigProvider` theme tokens to match (`token.colorPrimary = '#1F8A5B'`, `token.borderRadius = 8`, `token.colorBgLayout = '#F4F6FA'`, etc).
- For **mockups + prototypes**: include `colors_and_type.css`, use the components in `ui_kits/admin/`, link Lucide icons from CDN, write copy following the rules in *Content fundamentals*.
- For **slides + docs**: use the logo from `assets/`, the primary emerald and slate neutrals, IBM Plex Sans, sentence case, no emoji.
