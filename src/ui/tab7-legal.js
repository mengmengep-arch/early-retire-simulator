// ============================================================
// Tab 5: กฎหมาย & Checklist — ข้อมูลภาษี, Checklist, Timeline
// ============================================================
import { CALC } from '../calc.js';
import { activeProfile, tab5Init, setTab5Init } from '../state.js';
import { CONFIG, CURRENT_YEAR_BE, DEFAULT_PROFILE } from '../config.js';
import { fmt } from '../utils.js';

export function initTab5() {
  if (tab5Init) return; setTab5Init(true);

  document.getElementById('taxLawSection').innerHTML = `
  <div class="chart-box">
  <h3>1. เงินได้ครั้งเดียวเพราะเหตุออกจากงาน (มาตรา 48(5))</h3>
  <div style="font-size:13px;line-height:1.8;color:#475569"><ul style="padding-left:20px">
  <li><strong>Early Merit + เงินชดเชย</strong> = เงินได้ครั้งเดียว → แยกยื่นภาษีได้ (ทำงาน 5 ปี+)</li>
  <li><strong>วิธีคำนวณ:</strong> (1) หัก 7,000 x ปีทำงาน (2) เหลือหัก 50% (3) คำนวณภาษีขั้นบันได</li>
  </ul></div></div>
  <div class="chart-box">
  <h3>2. สิทธิยกเว้นภาษี 600,000 บาท</h3>
  <div style="font-size:13px;line-height:1.8;color:#475569"><ul style="padding-left:20px">
  <li>เฉพาะกรณี "เลิกจ้าง" ตาม พ.ร.บ.คุ้มครองแรงงาน</li>
  <li>Early Retirement อาจไม่ถือเป็นเลิกจ้าง → <strong>ตรวจสอบ HR</strong></li>
  <li>ผลต่อภาษี: ประหยัดได้ ~฿105,000</li>
  </ul></div></div>
  <div class="chart-box">
  <h3>3. กองทุนสำรองเลี้ยงชีพ (PVD)</h3>
  <div style="font-size:13px;line-height:1.8;color:#475569"><ul style="padding-left:20px">
  <li>อายุ < 55 ถอนออก = ต้องเสียภาษี → <strong>โอนไป RMF for PVD</strong> ปลอดภาษี</li>
  <li>อายุ ≥ 55 ถอนได้เลย ปลอดภาษีทั้งก้อน</li>
  </ul></div></div>
  <div class="chart-box">
  <h3>4. อัตราภาษีเงินได้บุคคลธรรมดา (ขั้นบันได)</h3>
  <table>
  <tr><th>ช่วงเงินได้สุทธิ</th><th class="right">อัตรา</th><th class="right">ภาษีสะสมสูงสุด</th></tr>
  <tr><td>0 — 150,000</td><td class="right">ยกเว้น</td><td class="right">฿0</td></tr>
  <tr><td>150,001 — 300,000</td><td class="right">5%</td><td class="right">฿7,500</td></tr>
  <tr><td>300,001 — 500,000</td><td class="right">10%</td><td class="right">฿27,500</td></tr>
  <tr><td>500,001 — 750,000</td><td class="right">15%</td><td class="right">฿65,000</td></tr>
  <tr><td>750,001 — 1,000,000</td><td class="right">20%</td><td class="right">฿115,000</td></tr>
  <tr><td>1,000,001 — 2,000,000</td><td class="right">25%</td><td class="right">฿365,000</td></tr>
  <tr><td>2,000,001 — 5,000,000</td><td class="right">30%</td><td class="right">฿1,265,000</td></tr>
  <tr style="background:#FEE2E2"><td class="bold">5,000,001 ขึ้นไป</td><td class="right bold">35%</td><td class="right bold">-</td></tr>
  </table></div>
  `;

  // Checklist — Dynamic: ปรับอายุ/ปีตาม best scenario
  const clMd = activeProfile.masterData;
  const clBest = clMd.length > 0 ? clMd.reduce((a, b) => b.totalIncome > a.totalIncome ? b : a) : null;
  const clHasData = clBest && activeProfile.salary > 0;
  const clAge = clHasData ? clBest.age : '??';
  const clYear = clHasData ? clBest.year : CURRENT_YEAR_BE;
  const clPkg = clHasData ? CALC.calcPackageMonths(clBest.age) : '??';
  // Checklist items — ปรับตามข้อมูล user
  const clItems = [
    'ยืนยันเงื่อนไข Early Retirement Program กับ HR',
    'ตรวจสอบว่าถือเป็น "เลิกจ้าง" หรือไม่ → สิทธิยกเว้น 600K',
    '<strong style="color:#991B1B">ยืนยัน deadline อายุ ' + clAge + ' ปี — ต้องออกก่อนปี ' + clYear + '</strong>',
    'ติดต่อผู้ดูแล PVD เรื่องโอน PVD → RMF for PVD',
    'ซื้อ RMF ให้ครบก่อนลาออก',
    'จ่ายเบี้ยประกันชีวิต + ประกันบำนาญ ปี ' + clYear + ' ให้ครบ',
    'เคลียร์ Company Loan ที่เหลือ',
    'สมัครประกันสังคม ม.39 ภายใน 6 เดือนหลังลาออก'
  ];
  // เพิ่ม item ถ้าอายุ < 55 (ต้องถือ RMF ต่อ)
  if (!clHasData || clBest.age < 55) {
    clItems.push('ถือ RMF ต่อจนอายุ 55 ปี');
  }
  clItems.push('อย่าขาย Thai ESG/ESGX ก่อนครบ 5 ปี');
  clItems.push('ปรึกษานักวางแผนการเงิน/ที่ปรึกษาภาษีก่อนตัดสินใจ');

  document.getElementById('checklistSection').innerHTML = `
  <div class="chart-box">
  <h3>Checklist สิ่งที่ต้องเตรียม</h3>
  <ul class="checklist">
  ${clItems.map(item => '<li>' + item + '</li>').join('\n  ')}
  </ul></div>
  `;

  // Timeline — Dynamic: คำนวณวันที่จาก best scenario
  const tlSection = document.getElementById('timelineSection');
  if (!clHasData) {
    tlSection.innerHTML = '<div class="info-box">📋 กรุณากรอกข้อมูลก่อนจะแสดง Timeline</div>';
  } else {
    const retireYear = clBest.year;
    const retireMonthIdx = 5; // default มิ.ย. (index 5)
    const retireMonthName = CONFIG.monthNames[retireMonthIdx];
    const prevYear = retireYear - 1;
    const nextYear = retireYear + 1;
    const pkgMonths = CALC.calcPackageMonths(clBest.age);
    const pvdBal = clBest.pvd || 0;
    const earlyTotal = clBest.earlyTotal || 0;
    // โบนัสกลางปี (ถ้าเปิด)
    const bonusMidOn = document.getElementById('bonusMid') ? document.getElementById('bonusMid').checked : true;
    const bonusMidMult = parseFloat((document.getElementById('bonusMidMult') || {}).value) || 1.3;
    const bonusMidAmt = bonusMidOn ? Math.round(clBest.salary * bonusMidMult) : 0;
    // ชดเชยตามกฎหมาย
    const workYrs = retireYear - activeProfile.startWorkYear;
    const sevDays = CALC.calcSeveranceDays(workYrs);

    tlSection.innerHTML = `
    <div class="chart-box">
    <h3>Timeline — Scenario แนะนำ (${retireMonthName} ${retireYear})</h3>
    <div class="timeline">
    <div class="tl-item"><div class="tl-date">${CONFIG.monthNames[9]}-${CONFIG.monthNames[11]} ${prevYear}</div><div class="tl-title">สอบถาม HR เรื่อง Early Retirement</div><div class="tl-desc">ยืนยัน Early Merit ${pkgMonths} เดือน + ชดเชย ${sevDays} วัน / ขั้นตอนการสมัคร</div></div>
    <div class="tl-item"><div class="tl-date">${CONFIG.monthNames[0]}-${CONFIG.monthNames[1]} ${retireYear}</div><div class="tl-title">เตรียมด้านลงทุน & ประกัน</div><div class="tl-desc">ซื้อ RMF/Thai ESG ก่อนลาออก / จ่ายเบี้ยประกัน</div></div>
    <div class="tl-item"><div class="tl-date">${CONFIG.monthNames[2]}-${CONFIG.monthNames[3]} ${retireYear}</div><div class="tl-title">สมัคร Early Retirement</div><div class="tl-desc">ยื่นใบสมัครตามขั้นตอนของบริษัท</div></div>
    ${bonusMidAmt > 0 ? '<div class="tl-item"><div class="tl-date">' + CONFIG.monthNames[5] + ' ' + retireYear + '</div><div class="tl-title">รับโบนัสกลางปี ~฿' + fmt(bonusMidAmt) + '</div></div>' : ''}
    <div class="tl-item star"><div class="tl-date">ปลาย ${retireMonthName} ${retireYear}</div><div class="tl-title" style="color:#F59E0B;font-size:16px">วันลาออก</div><div class="tl-desc">รับเงินก้อน ฿${fmt(earlyTotal)}</div></div>
    ${clBest.age < 55 ? '<div class="tl-item"><div class="tl-date">' + CONFIG.monthNames[6] + ' ' + retireYear + '</div><div class="tl-title">โอน PVD → RMF for PVD</div><div class="tl-desc">฿' + fmt(pvdBal) + ' ปลอดภาษี / ถอนได้อายุ 55</div></div>' : '<div class="tl-item"><div class="tl-date">' + CONFIG.monthNames[6] + ' ' + retireYear + '</div><div class="tl-title">ถอน PVD ปลอดภาษี (อายุ ≥ 55)</div><div class="tl-desc">฿' + fmt(pvdBal) + '</div></div>'}
    <div class="tl-item"><div class="tl-date">${CONFIG.monthNames[6]}-${CONFIG.monthNames[11]} ${retireYear}</div><div class="tl-title">เริ่มธุรกิจ / ชีวิตหลังเกษียณ</div></div>
    <div class="tl-item"><div class="tl-date">${CONFIG.monthNames[0]}-${CONFIG.monthNames[2]} ${nextYear}</div><div class="tl-title">ยื่นภาษีปี ${retireYear}</div></div>
    </div></div>
    `;
  }
}
