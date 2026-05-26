---
name: autoparts-design
description: Use this skill to generate well-branded interfaces and assets for АвтоЗапчасти (AutoParts) — an internal ERP/CRM/POS console for a chain of auto-parts retail stores. Use this skill for production interfaces, prototypes, mocks, slides, or any other design artifact that should match the AutoParts brand. Contains essential design guidelines (calm corporate ERP aesthetic, Russian-language UI, IBM Plex Sans + JetBrains Mono, slate neutrals + #2D6CDF primary), color/type/spacing tokens, logo assets, iconography mapping, and a full Ant-Design-based UI kit with click-through admin/POS screens.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css`, `assets/`, `preview/`, `ui_kits/admin/`).

If creating **visual artifacts** (slides, mocks, throwaway prototypes, design previews):
- Copy what you need out of `assets/` (logos) and `ui_kits/admin/*.jsx` (components) into your output folder
- Link `colors_and_type.css` for tokens, or inline the variables you actually use
- Use Lucide icons from CDN as the closest match to Ant Design Icons (mapping table is in `README.md` → Iconography)
- Follow the **Content fundamentals** section religiously — Russian-language UI, sentence case, no emoji, no marketing voice

If working on **production code** for the existing client (React 19 + Ant Design 6 + Vite + TypeScript, see `lab/auto-parts/client/`):
- Use the tokens in `colors_and_type.css` as the source of truth
- Bind Ant Design's `ConfigProvider` to the matching token values (primary `#2D6CDF`, radius `8`, layout bg `#F4F6FA`, font family `IBM Plex Sans`)
- Keep using `@ant-design/icons` — Lucide is a mock-time substitution only
- Match the existing patterns in `lab/auto-parts/client/src/pages/` — table density, status tags, modal structure, page header layout

If the user invokes this skill without further guidance, ask them what they want to build or design (a new page in the console? a slide deck for an internal review? a printed report? a new feature mock?), ask a few sharpening questions about scope and audience, and act as an expert designer who outputs HTML artifacts _or_ production React/Ant Design code as appropriate.

**Always:**
- Russian-language UI strings (`lang="ru"`)
- Sentence case in labels and buttons
- Tabular numerals on every number that appears in a table or statistic
- Calm, technical, non-marketing tone — this is a tool, not a product page
- White surfaces on `#F4F6FA` background; 8 px radius default; one-axis subtle shadows
- No gradients, no emoji, no decorative illustrations
