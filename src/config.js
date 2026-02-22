// ============================================================
// CONFIG — ค่าคงที่ทั้งหมด
// ============================================================

// ปีปัจจุบัน พ.ศ. (คำนวณจากวันที่จริง — ไม่ hardcode)
export const CURRENT_YEAR_BE = new Date().getFullYear() + 543;

// ============================================================
// DEFAULT PROFILE — ค่าว่าง/0 สำหรับ public repo
// ============================================================
export const DEFAULT_PROFILE = {
  name: '',
  company: '',
  birthYear: 2530,
  birthMonth: 1,
  birthDay: 1,
  startWorkYear: 2555,
  salary: 0,
  pvdBalance: 0,
  // ข้อมูลคาดการณ์อนาคต
  salaryGrowthRate: 1.6,        // ขึ้นเงินเดือน %/ปี (ค่าทั่วไป)
  retireMaxAge: 55,             // อายุเกษียณ (ค่าเริ่มต้นทั่วไป)
  welfareFuel: 0,               // ค่าน้ำมันรถ (บาท/ปี)
  welfareMedical: 0,            // ค่ารักษาพยาบาล
  welfareTollway: 0,            // ค่าทางด่วน
  welfareOther: 0,              // สวัสดิการอื่นๆ
  welfareAdjustYears: 5,        // ปรับสวัสดิการทุกกี่ปี
  welfareAdjustPct: 2,          // ปรับครั้งละกี่ %
  inflationRate: 2.5,           // อัตราเงินเฟ้อ %/ปี
  pvdReturnRate: 3.5,           // ผลตอบแทน PVD %/ปี
  // โบนัส (ค่าเริ่มต้น)
  bonusMid: true,               // โบนัสกลางปี เปิด
  bonusMidMult: 1.3,            // x1.3 เดือน
  bonusEnd: true,               // โบนัสปลายปี เปิด
  bonusEndMult: 1.3,            // x1.3 เดือน
  // ค่าลดหย่อนภาษี (ค่าเริ่มต้น)
  dedPersonal: 60000,           // ส่วนตัว
  dedParents: 30000,            // บิดามารดา
  dedLifeIns: 100000,           // ประกันชีวิต
  dedAnnuity: 155000,           // ประกันบำนาญ
  dedPvdRate: 5,                // PVD contribution %
  dedRmf: 0,                   // RMF
  dedEsg: 0,                   // Thai ESG
  // แก้สำหรับ public repo — ไม่มีข้อมูลเฉพาะบริษัท
  packageTiers: [{maxAge: 999, months: 0}],
  masterData: [],               // ว่าง — จะคำนวณใหม่หลัง Reset
  pinned: []                    // Pinned Scenarios (ค่าเริ่มต้นว่าง)
};

export const CONFIG = {
  // ชื่อเดือนภาษาไทย
  monthNames: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],

  // ขั้นภาษีไทย
  taxBrackets: [
    {limit:150000,rate:0},{limit:300000,rate:0.05},{limit:500000,rate:0.10},
    {limit:750000,rate:0.15},{limit:1000000,rate:0.20},{limit:2000000,rate:0.25},
    {limit:5000000,rate:0.30},{limit:Infinity,rate:0.35}
  ],

  // วันชดเชยตามอายุงาน (กฎหมายคุ้มครองแรงงาน)
  severanceTiers: [
    {minYears:20,days:400},{minYears:10,days:300},{minYears:6,days:240},
    {minYears:3,days:180},{minYears:1,days:90},{minYears:0,days:30}
  ],

  // ประกันสังคม — อัตราใหม่ตามราชกิจจานุเบกษา
  socialSecurityTiers: [
    {maxYear:2568, monthly:750, cap:15000},
    {maxYear:2571, monthly:875, cap:17500},
    {maxYear:2574, monthly:1000, cap:20000},
    {maxYear:Infinity, monthly:1150, cap:23000}
  ]
};

// สีสำหรับ Pinned Scenarios (สูงสุด 3 อัน)
export const PIN_COLORS = [
  { name: 'A', bg: '#2563EB', text: '#DBEAFE' },  // น้ำเงิน
  { name: 'B', bg: '#7C3AED', text: '#EDE9FE' },  // ม่วง
  { name: 'C', bg: '#059669', text: '#D1FAE5' }   // เขียว
];

// ชื่อ Tab สำหรับ PDF header (ใช้ภาษาอังกฤษ เพราะ jsPDF ไม่รองรับ Thai font)
export const TAB_NAMES_PDF = [
  'How to Use',
  'Personal Info & Package',
  'Simulator Dashboard',
  'Tax Details',
  'Income Overview (All Ages)',
  'Heatmap',
  'Strategy & NPV',
  'Legal & Reference'
];

// ชื่อ Tab สำหรับ Toast (ภาษาไทย)
export const TAB_NAMES = [
  'วิธีใช้', 'ข้อมูล', 'Simulator', 'ภาษี', 'ภาพรวมทุกอายุ', 'Heatmap', 'กลยุทธ์ & NPV', 'กฎหมาย'
];
