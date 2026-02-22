# Early Retire & Tax Simulator — CLAUDE.md

## Overview
เครื่องมือจำลองการเกษียณอายุก่อนกำหนด + คำนวณภาษีเงินได้บุคคลธรรมดา สำหรับคนไทย
Single-page app (SPA) ไม่มี backend — ข้อมูลเก็บใน localStorage

## Tech Stack
- **Build**: Vite (ES modules)
- **CDN Libraries** (ไม่ได้ npm install — ใช้ผ่าน window globals):
  - Chart.js v4.4.1 + chartjs-plugin-datalabels v2.2.0
  - html2canvas 1.4.1
  - jsPDF 2.5.1
- **Deploy**: Vercel (auto-detect Vite)
- **ภาษา**: Vanilla JS, ไม่มี framework

## โครงสร้างโปรเจกต์

```
early-retire-simulator/
├── index.html               ← HTML shell + CDN scripts
├── src/
│   ├── styles.css           ← CSS ทั้งหมด
│   ├── main.js              ← Entry point, init, window bindings
│   ├── config.js            ← Constants, DEFAULT_PROFILE, TAX_BRACKETS
│   ├── state.js             ← Shared mutable state + readState()
│   ├── calc.js              ← CALC engine (ห้ามแก้ logic!)
│   ├── utils.js             ← fmt, toast, zoom, modals
│   ├── profile.js           ← Profile CRUD, snapshots, package tiers
│   ├── pdf.js               ← PDF export (section-by-section capture)
│   └── ui/
│       ├── dashboard.js     ← Dashboard cards + compare table
│       ├── charts-tab2.js   ← Income + waterfall charts
│       ├── tab3-tax.js      ← Tax detail + step charts
│       ├── tab4-overview.js ← Age overview + master table
│       ├── tab5-heatmap.js  ← Heatmap 144 scenarios
│       ├── tab6-strategy.js ← Strategy, NPV, breakeven, decision matrix
│       └── tab7-legal.js    ← Legal info + checklist
├── package.json
├── vite.config.js
├── vercel.json
└── .gitignore
```

## Dependency Graph (ล่าง → บน)

```
config.js          ← ไม่ depend อะไร
    ↑
state.js           ← depend config
    ↑
calc.js            ← depend config, state
    ↑
utils.js           ← depend calc, state
    ↑
ui/*.js            ← depend config, state, calc, utils
    ↑
profile.js         ← depend config, state, calc, utils
pdf.js             ← depend config, state, utils, ui/*
    ↑
main.js            ← import ทั้งหมด, expose window
```

## Architecture Decisions

### Circular Dependency Resolution
- `readState()` อยู่ใน `state.js` (ไม่ใช่ main.js) เพราะ calc.js ต้องใช้
- `state.js` มี `setCalcRef(calc)` — late-bound reference เพื่อ readState ใช้ CALC ได้
- `main.js` เรียก `setCalcRef(CALC)` ตอน init

### ES Module State Pattern
- Exported `let` ต้องใช้ setter: `setActiveProfile(p)`, `setTab2Init(v)`, etc.
- Array mutation ใช้ `.length = 0` แทน `= []` (เลี่ยง re-assign)

### onclick Handlers
- HTML ใช้ `onclick="functionName()"`
- `main.js` expose ทุกฟังก์ชันผ่าน `window.xxx = xxx`
- ห้ามลบ window binding — จะทำให้ onclick ไม่ทำงาน

### CDN vs npm
- Chart.js, jsPDF, html2canvas เป็น CDN globals
- CDN `<script>` อยู่ใน `<head>` (sync) → โหลดก่อน `<script type="module">` (deferred)

## สิ่งที่ห้ามทำ (CRITICAL)
1. **ห้ามแก้ Tax Calculation Logic** ใน calc.js — สูตรภาษีถูกต้องตามกฎหมายไทย
2. **ห้ามเปลี่ยน HTML element IDs** — onclick handlers + DOM queries ผูกกับ ID
3. **ห้ามเปลี่ยน localStorage keys** — ข้อมูลผู้ใช้เก่าจะหาย
4. **ห้ามย้าย CDN libraries เป็น npm** — จะต้องแก้ทั้ง build config + ทุก file ที่ใช้
5. **ห้ามลบ window.xxx bindings** ใน main.js — onclick จะพัง
6. **ห้ามเปลี่ยน CSS class names** — HTML ผูกอยู่

## Development Commands
```bash
npm run dev      # เปิด dev server (HMR)
npm run build    # Build สำหรับ production → dist/
npm run preview  # Preview production build
```

## localStorage Keys
- `retireCalcData` — auto-save profile ปัจจุบัน
- `retireCalcProfiles` — saved profiles ทั้งหมด (object)
- `retireCalcSnapshots` — snapshots (array)

## การสื่อสาร
- Comment ในโค้ดเขียนเป็นภาษาไทย
- ตอบผู้ใช้เป็นภาษาไทย
- อธิบายก่อนลงมือแก้เสมอ
