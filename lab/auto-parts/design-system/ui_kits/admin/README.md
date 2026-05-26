# АвтоЗапчасти — Admin/POS UI Kit

The console UI kit — a faithful, simplified recreation of the AutoParts admin/POS interface for use in mockups and design exploration. Cosmetic only; no API calls.

## What's here

- `index.html` — interactive click-through prototype with three screens (Dashboard, Sales register, Products catalog) reachable from the sidebar.
- `styles.css` — shared styles for the kit (imports `../../colors_and_type.css`).
- `Icon.jsx` — Lucide-style inline SVG icon set (the icons referenced in the nav, buttons, tables).
- `Sidebar.jsx` — fixed 232 px white sider with brand block + role-filtered nav.
- `TopBar.jsx` — 56 px top header with store selector + role tag + user + logout.
- `PageHeader.jsx` — page title row + filters / primary CTA slot.
- `StatCard.jsx` — dashboard hero statistic.
- `Button.jsx`, `TextInput.jsx`, `Tag.jsx` — primitives.
- `DataTable.jsx` — Ant-Design-style table with hover row + status column.
- `screens/Dashboard.jsx`, `screens/Sales.jsx`, `screens/Products.jsx` — the three demo screens.
- `App.jsx` — wires everything together with simple `useState` view switching.

## Design rules baked in

- Sentence case Russian copy throughout.
- IBM Plex Sans + JetBrains Mono.
- Primary `#2D6CDF`, slate neutrals, white surfaces on `#F4F6FA`.
- 8 px card radius, 6 px button/input radius.
- Single-axis shadows; hover steps the shadow, never translates.
- Tabular numerals on every number that appears in a table or statistic.
- Lucide icons substituting for `@ant-design/icons` (see top-level `README.md` → Iconography for the mapping).

## How to use

Open `index.html` — it's a **self-contained bundle**: all CSS and JS are inlined into a single file (the preview server in this project doesn't serve `.js` or `.css` files from subdirectories, so we bundle).

The split source files (`Icon.js`, `primitives.js`, etc.) are kept alongside as **readable reference** — if you change one of them, regenerate `index.html` by re-running the bundle (concat all `.js` files in load order between `<script type="text/babel" data-presets="react">…</script>` tags, and inline `../../colors_and_type.css` + `styles.css` into a `<style>` block).

For production work, port the JSX in those source files to TypeScript and bind them to Ant Design's `ConfigProvider` (theme tokens: `colorPrimary: '#2D6CDF'`, `borderRadius: 8`, `colorBgLayout: '#F4F6FA'`, `fontFamily: "'IBM Plex Sans', ..."`).
