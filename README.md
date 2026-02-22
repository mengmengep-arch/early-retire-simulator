# Early Retire & Tax Simulator

เครื่องมือจำลองการเกษียณอายุก่อนกำหนด และคำนวณภาษีเงินได้บุคคลธรรมดา สำหรับคนไทย

## Features

- คำนวณเงินก้อนชดเชย + ภาษีเงินก้อน (มาตรา 48(5))
- คำนวณภาษีเงินเดือน + PVD + ประกันสังคม
- เปรียบเทียบสถานการณ์ (Pin & Compare)
- Heatmap ภาษี 144 สถานการณ์ (อายุ x เดือน)
- กลยุทธ์ NPV, Break-even, Decision Matrix
- Export PDF รายงานครบทุก Tab
- Save/Load/Export/Import Profile

## Tech Stack

- Vanilla JS + Vite
- Chart.js (CDN)
- jsPDF + html2canvas (CDN)
- ไม่มี backend — ข้อมูลเก็บใน localStorage

## Getting Started

```bash
npm install
npm run dev
```

## Deploy

โปรเจกต์นี้ deploy บน [Vercel](https://vercel.com) — เชื่อม GitHub repo แล้ว auto deploy

## License

MIT
