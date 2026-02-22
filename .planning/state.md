# สถานะปัจจุบันของโปรเจค

> อัพเดทล่าสุด: 22 กุมภาพันธ์ 2569 (2026)

---

## ภาพรวม

| รายการ | รายละเอียด |
|--------|------------|
| **ชื่อโปรเจค** | Early Retire & Tax Simulator |
| **เวอร์ชัน** | V.01_2026 |
| **ประเภท** | Single-Page Application (SPA) — ไม่มี backend |
| **กลุ่มเป้าหมาย** | คนไทยที่วางแผนเกษียณก่อนกำหนด |
| **Tech Stack** | Vanilla JS + Vite (ES modules) |
| **CDN Libraries** | Chart.js v4.4.1, chartjs-plugin-datalabels v2.2.0, html2canvas 1.4.1, jsPDF 2.5.1 |
| **Deploy** | Vercel (auto-detect Vite) |
| **Data Storage** | localStorage (browser only) |

---

## ขนาด Codebase

| ไฟล์ | บรรทัด | หมายเหตุ |
|------|--------|----------|
| `index.html` | 533 | HTML shell + CDN scripts |
| `src/styles.css` | 197 | CSS ทั้งหมด |
| `src/main.js` | 355 | Entry point, window bindings |
| `src/config.js` | 98 | Constants, TAX_BRACKETS, DEFAULT_PROFILE |
| `src/state.js` | 146 | Shared mutable state + readState() |
| `src/calc.js` | 364 | CALC engine (ห้ามแก้ logic!) |
| `src/utils.js` | 118 | fmt, toast, zoom, modals |
| `src/profile.js` | 596 | Profile CRUD, snapshots, package tiers |
| `src/pdf.js` | 442 | PDF export |
| `src/ui/dashboard.js` | 196 | Dashboard cards + compare table |
| `src/ui/charts-tab2.js` | 182 | Income + waterfall charts |
| `src/ui/tab3-tax.js` | 126 | Tax detail + step charts |
| `src/ui/tab4-overview.js` | 250 | Age overview + master table |
| `src/ui/tab5-heatmap.js` | 202 | Heatmap 144 scenarios |
| `src/ui/tab6-strategy.js` | 327 | Strategy, NPV, breakeven, decision matrix |
| `src/ui/tab7-legal.js` | 116 | Legal info + checklist |
| **รวม** | **4,248** | |

---

## สถานะ Features

### Tab 0: วิธีใช้
- [x] Tutorial 6 ขั้นตอน
- [x] อภิธานศัพท์ 10 คำ
- [x] FAQ 6 คำถาม
- [x] Disclaimer

### Tab 1: ข้อมูล & แพคเกจ
- [x] Profile CRUD (สร้าง, โหลด, ลบ)
- [x] Export/Import JSON
- [x] Snapshot Timeline (บันทึก/โหลด/ลบ)
- [x] ข้อมูลส่วนตัว (ชื่อ, บริษัท, วันเกิด, เริ่มงาน)
- [x] เงินเดือน + PVD
- [x] โบนัสกลางปี/ปลายปี (เปิด/ปิด + ตัวคูณ)
- [x] ลดหย่อนภาษี (ส่วนตัว, พ่อแม่, ประกันชีวิต, บำนาญ, PVD, RMF, Thai ESG, ประกันสังคม)
- [x] อัตราเงินเดือนเพิ่ม, เงินเฟ้อ, ผลตอบแทน PVD
- [x] Package Tiers แบบกำหนดเอง (ตามช่วงอายุ)
- [x] ตาราง Social Security ตามปี (2568-2575+)
- [x] สวัสดิการ 4 หมวด + ปรับตามรอบปี

### Tab 2: Simulator Dashboard
- [x] Slider เดือน (1-12) + Dropdown ปี
- [x] Package: Auto vs Override (0/6/12/18/36)
- [x] Toggle ยกเว้น 600K
- [x] PVD: โอน RMF vs ถอน
- [x] 6 Dashboard Cards (Gross, Tax, Net, Effective Rate, Early Merit, Severance)
- [x] Pin A/B/C (เทียบ 3 scenarios)
- [x] Delta comparison (±เปรียบเทียบ)
- [x] Chart: Income Composition (Doughnut/Bar)
- [x] Chart: Tax Waterfall
- [x] Summary Table

### Tab 3: รายละเอียดภาษี
- [x] ตารางภาษีเงินก้อน (Early Merit + Severance)
- [x] ตารางภาษีเงินเดือน (Salary + Bonus)
- [x] Step Chart ภาษีขั้นบันได (Lump Sum)
- [x] Step Chart ภาษีขั้นบันได (Salary)
- [x] Grouped bars เมื่อมี Pin (เทียบ A/B/C)

### Tab 4: ภาพรวมทุกอายุ
- [x] Package Cliff Chart (แสดงจุดตกแพคเกจ)
- [x] Total Wealth Chart (Stacked bar + toggle Gross/Net)
- [x] Year-over-Year Chart (ทำงานต่อ 1 ปีได้/เสียเท่าไร)
- [x] Master Data Table (12 แถว: อายุ 47-58)

### Tab 5: Heatmap 144 Scenarios
- [x] Heatmap 12 อายุ × 12 เดือน = 144 scenarios
- [x] Color-coded ตามภาษี (เขียว→เหลือง→แดง)
- [x] Click เพื่อโหลด scenario
- [x] แสดง Min/Max tax scenarios
- [x] สรุปจำนวนตาม color band

### Tab 6: กลยุทธ์ & NPV
- [x] Best Strategy: Top 3 จาก Decision Score (6 ปัจจัย, ถ่วงน้ำหนัก)
- [x] Income Breakdown Chart (Stacked bar + cumulative line + toggle Gross/Net)
- [x] NPV Comparison Chart
- [x] Break-even Chart (จุดตกแพคเกจ)
- [x] Decision Matrix Table (คะแนนรายอายุ)
- [x] ข้อดี/ข้อเสียของแต่ละอันดับ

### Tab 7: กฎหมาย
- [x] มาตรา 48(5) — เงินได้ครั้งเดียว
- [x] ยกเว้น 600K — เฉพาะถูกเลิกจ้าง
- [x] กฎ PVD — อายุ <55 ต้องโอน RMF
- [x] ตารางอัตราภาษีไทย (0-35%)
- [x] Dynamic Checklist (8-10 items ตาม scenario)
- [x] Timeline

### Cross-cutting Features
- [x] Dark Mode (toggle)
- [x] Zoom Control (70-150%)
- [x] PDF Export (cover + section-by-section)
- [x] Toast Notifications
- [x] Welcome Modal (แสดงครั้งแรก)
- [x] About Modal
- [x] Comma Formatting (input auto-format)
- [x] Auto-save → localStorage
- [x] Lazy Tab Initialization

---

## สถาปัตยกรรม

### Dependency Graph

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

### State Management
- `activeProfile` — โปรไฟล์ปัจจุบัน (clone จาก DEFAULT_PROFILE)
- `STATE` — พารามิเตอร์จำลอง (ปีเกษียณ, เดือน, deductions, bonus, PVD)
- `PINNED[]` — scenarios ที่ pin ไว้ (สูงสุด 3)
- `CHARTS{}` — Chart.js instances
- `tab2Init..tab5Init` — flags สำหรับ lazy-load
- ใช้ setter functions (ES module exported `let` ต้อง re-assign ผ่าน setter)

### Circular Dependency Resolution
- `readState()` อยู่ใน `state.js` (ไม่ใช่ main.js) เพราะ calc.js ต้องใช้
- `state.js` มี `setCalcRef(calc)` — late-bound reference
- `main.js` เรียก `setCalcRef(CALC)` ตอน init

### localStorage Keys
| Key | เนื้อหา |
|-----|---------|
| `retireCalcData` | auto-save profile ปัจจุบัน |
| `retireCalcProfiles` | saved profiles ทั้งหมด |
| `retireCalcSnapshots` | snapshots (array) |

---

## Tax Calculation Engine

### อัตราภาษีไทย (Progressive)
| ช่วงรายได้ (บาท) | อัตราภาษี |
|-------------------|-----------|
| 0 – 150,000 | 0% |
| 150,001 – 300,000 | 5% |
| 300,001 – 500,000 | 10% |
| 500,001 – 750,000 | 15% |
| 750,001 – 1,000,000 | 20% |
| 1,000,001 – 2,000,000 | 25% |
| 2,000,001 – 5,000,000 | 30% |
| 5,000,001+ | 35% |

### ค่าชดเชยตามกฎหมายแรงงาน
| อายุงาน | จำนวนวัน |
|----------|----------|
| 20+ ปี | 400 วัน |
| 10-20 ปี | 300 วัน |
| 6-10 ปี | 240 วัน |
| 3-6 ปี | 180 วัน |
| 1-3 ปี | 90 วัน |
| < 1 ปี | 30 วัน |

### ประกันสังคม (ตามปี พ.ศ.)
| ปี พ.ศ. | เดือนละ | เพดาน/ปี |
|----------|---------|-----------|
| ≤ 2568 | 750 | 15,000 |
| 2569-2571 | 875 | 17,500 |
| 2572-2574 | 1,000 | 20,000 |
| 2575+ | 1,150 | 23,000 |

### Decision Score (6 ปัจจัย)
| ปัจจัย | น้ำหนัก |
|--------|---------|
| Total Wealth | 30% |
| Package Value | 25% |
| Tax Efficiency | 15% |
| PVD Flexibility | 15% |
| Social Security | 10% |
| Business Time/Runway | 5% |

---

## Tech Debt & ข้อจำกัด

| หมวด | รายละเอียด | ความรุนแรง |
|------|------------|------------|
| **Testing** | ไม่มี unit tests / E2E tests | สูง |
| **Type Safety** | ไม่มี TypeScript — อาศัย runtime เท่านั้น | กลาง |
| **Error Handling** | ไม่มี input validation / error boundaries | สูง |
| **ไฟล์ใหญ่** | profile.js (596L), pdf.js (442L), calc.js (364L) | กลาง |
| **Circular Dep** | แก้ด้วย setCalcRef() workaround | ต่ำ |
| **CDN Dependency** | Chart.js, jsPDF, html2canvas ต้องมี internet | กลาง |
| **Data Storage** | localStorage only — single browser, ไม่ sync | กลาง |
| **Mobile** | Responsive จำกัด — ออกแบบสำหรับ desktop/tablet | กลาง |
| **Accessibility** | ARIA labels จำกัด, keyboard navigation ไม่ครบ | กลาง |
| **Mutable State** | ใช้ mutable state — ไม่ immutable | ต่ำ |
