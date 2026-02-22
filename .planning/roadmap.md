# Roadmap — Early Retire & Tax Simulator

> อัพเดทล่าสุด: 22 กุมภาพันธ์ 2569 (2026)

---

## วิสัยทัศน์

เป็นเครื่องมือวางแผนเกษียณก่อนกำหนดที่ **ครบถ้วน แม่นยำ และใช้ง่าย** สำหรับพนักงานเอกชนไทย โดยครอบคลุมการคำนวณภาษี, กลยุทธ์ออก, และ decision support — ทั้งหมดทำงานในเบราว์เซอร์โดยไม่ต้องเก็บข้อมูลบน server

---

## Phase 1: ปรับปรุงคุณภาพโค้ด (Foundation)

เป้าหมาย: เพิ่มความมั่นคง, ลด tech debt, ปรับปรุง developer experience

| # | รายการ | Priority | หมายเหตุ |
|---|--------|----------|----------|
| 1.1 | **เพิ่ม Input Validation & Error Handling** | สูง | ตรวจสอบ input ที่ผู้ใช้กรอก (เช่น เงินเดือนติดลบ, วันเกิดอนาคต, อายุเกษียณไม่ valid) แสดง error message ที่ชัดเจน |
| 1.2 | **เพิ่ม Unit Tests สำหรับ calc.js** | สูง | ครอบคลุม: calcProgressiveTax, calcLumpSumTax, calcSalaryTax, calcPvdTax, calcSeveranceDays — ใช้ Vitest (มี Vite อยู่แล้ว) |
| 1.3 | **ปรับปรุง Mobile Responsiveness** | สูง | Dashboard cards, heatmap, master table ต้องใช้งานได้ดีบนมือถือ |
| 1.4 | **แยกไฟล์ใหญ่** | กลาง | `profile.js` (596L) → แยก snapshot logic, package tier logic ออก; `calc.js` → พิจารณาแยก scoring/opportunity cost |
| 1.5 | **เพิ่ม JSDoc สำหรับ Public Functions** | กลาง | ครอบคลุม calc.js, state.js, profile.js — ช่วย onboard developer ใหม่ |
| 1.6 | **Error Boundary สำหรับ Charts** | กลาง | Chart.js พังไม่ควรทำให้ทั้งหน้าพัง — ใส่ try-catch + fallback message |

---

## Phase 2: ปรับปรุง UX & Features ใหม่

เป้าหมาย: ยกระดับประสบการณ์ผู้ใช้ และเพิ่มความสามารถวิเคราะห์

| # | รายการ | Priority | หมายเหตุ |
|---|--------|----------|----------|
| 2.1 | **ปรับปรุง Accessibility** | สูง | เพิ่ม ARIA labels, keyboard navigation สำหรับ tabs/modals, focus management, contrast ratio ตาม WCAG 2.1 AA |
| 2.2 | **เพิ่ม Undo/Redo** | กลาง | สำหรับการแก้ไขข้อมูลส่วนตัว + slider/dropdown — ป้องกันกรอกผิดแล้วย้อนไม่ได้ |
| 2.3 | **Chart Interaction** | กลาง | Click bar/segment เพื่อ drill down ดูรายละเอียด, tooltip ที่ชัดเจนขึ้น |
| 2.4 | **Interactive Onboarding Tour** | กลาง | แทนที่ Tab 0 แบบ static — highlight องค์ประกอบ UI ทีละขั้น (ใช้ได้ครั้งแรกหรือเรียกซ้ำ) |
| 2.5 | **รองรับภาษาอังกฤษ (i18n)** | ต่ำ | สำหรับ expats หรือชาวต่างชาติที่ทำงานในไทย — แยก string resources ออกจาก code |
| 2.6 | **เพิ่ม Scenario Notes** | ต่ำ | ให้ผู้ใช้จดโน้ตประกอบแต่ละ Pin scenario — ช่วยจำเหตุผลที่เลือก |

---

## Phase 3: สถาปัตยกรรม & Scale

เป้าหมาย: เตรียมโครงสร้างสำหรับการเติบโต และรองรับ use case ที่ซับซ้อนขึ้น

| # | รายการ | Priority | หมายเหตุ |
|---|--------|----------|----------|
| 3.1 | **PWA Support (Offline Mode)** | สูง | Service Worker + manifest — ใช้งานได้แม้ไม่มี internet (แก้ปัญหา CDN dependency) |
| 3.2 | **E2E Testing** | สูง | Playwright หรือ Cypress — ครอบคลุม critical flow: กรอกข้อมูล → ดู dashboard → pin → compare → PDF |
| 3.3 | **อัพเดทภาษีอัตโนมัติตามปี พ.ศ.** | กลาง | สร้างระบบ config versioning — เมื่อปีภาษีเปลี่ยน ผู้ใช้เลือกปีได้ หรืออัพเดทอัตโนมัติ |
| 3.4 | **TypeScript Migration** | กลาง | เริ่มจาก config.js + calc.js → ค่อยขยาย — เพิ่ม type safety สำหรับ financial calculations |
| 3.5 | **Cloud Sync (Optional Backend)** | ต่ำ | ให้ผู้ใช้ sync profiles ข้ามเบราว์เซอร์/อุปกรณ์ — อาจใช้ Firebase, Supabase, หรือ simple REST API |
| 3.6 | **Performance Optimization** | ต่ำ | Heatmap 144 scenarios — พิจารณา Web Worker เพื่อไม่ block UI thread |

---

## บันทึก

- **ห้ามแก้ Tax Calculation Logic** ใน calc.js — สูตรภาษีถูกต้องตามกฎหมายไทย (unit tests ใน 1.2 เพื่อยืนยัน ไม่ใช่แก้)
- ทุก phase ควรเริ่มจาก items ที่ Priority สูงก่อน
- แต่ละ item ควรทำเป็น branch แยก + PR review ก่อน merge
- อัพเดทเอกสาร `state.md` ทุกครั้งที่ feature ใหม่เสร็จ
