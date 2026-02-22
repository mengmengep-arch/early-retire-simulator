// ============================================================
// Dashboard — อัพเดตการ์ด, delta, ตารางเปรียบเทียบ, สรุป
// ============================================================
import { CALC } from '../calc.js';
import { STATE, PINNED, activeProfile } from '../state.js';
import { PIN_COLORS } from '../config.js';
import { fmt } from '../utils.js';
import { updateCharts } from './charts-tab2.js';

export function updateDashboard(r) {
  // อัพเดตการ์ด
  setCardVal('cardTotalIncome', '฿' + fmt(r.totalGross));
  setCardVal('cardTotalTax', '฿' + fmt(r.totalTax));
  setCardVal('cardNetIncome', '฿' + fmt(r.netIncome));
  setCardVal('cardEffRate', r.effectiveRate.toFixed(1) + '%');
  setCardVal('cardEarlyMerit', '฿' + fmt(r.earlyMerit));
  document.querySelector('#cardEarlyMerit .sub').textContent = r.packageMonths + ' เดือน x ฿' + fmt(r.salary);
  setCardVal('cardSeverance', '฿' + fmt(r.severanceAmt));
  document.querySelector('#cardSeverance .sub').textContent = r.severanceDays + ' วัน x ฿' + fmt(r.salary) + '/30';

  // Header
  document.getElementById('headerNetIncome').textContent = '฿' + fmt(r.netIncome);

  // Control panel labels
  document.getElementById('retireMonthLabel').textContent = r.monthLabel;
  document.getElementById('ageDisplay').textContent = r.age + ' ปี';
  const pkgLabel = r.packageMonths + ' เดือน' + (STATE.packageOverride === 'auto' ? ' (Auto)' : ' (Override)');
  document.getElementById('pkgDisplay').textContent = pkgLabel;
  document.getElementById('exempt600kLabel').textContent = STATE.exempt600k ? 'ได้ (ประหยัด ~฿' + fmt(r.lumpTax.exemption > 0 ? 105000 : 0) + ')' : 'ไม่ได้';

  // Age warning
  const alertEl = document.getElementById('ageAlert');
  const alertContent = document.getElementById('ageAlertContent');
  // ตรวจจับกรณี "ลาออกเดือนเกิด" — ถ้าเดือนที่ลาออก = เดือนเกิด อาจทำให้อายุเพิ่มขึ้น → แพคเกจเปลี่ยน
  const birthM = activeProfile.birthMonth || 1;
  const birthD = activeProfile.birthDay || 1;
  // หา package ของอายุปัจจุบัน vs อายุ+1
  const pkgCurrent = CALC.calcPackageMonths(r.age);
  const pkgNext = CALC.calcPackageMonths(r.age + 1);
  if (r.retireMonth >= birthM && pkgCurrent > pkgNext) {
    alertEl.style.display = 'flex';
    alertContent.innerHTML = '<strong>ระวัง!</strong> ถ้าออกหลังวันเกิด (' + birthD + '/' + birthM + ') จะอายุ ' + (r.age + 1) + ' ปี ทำให้แพคเกจลดจาก ' + pkgCurrent + ' เดือน เหลือ ' + pkgNext + ' เดือน!';
  } else if (r.age >= 50 && r.packageMonths < 36) {
    alertEl.style.display = 'flex';
    alertContent.innerHTML = '<strong>แพคเกจลดลง!</strong> อายุ ' + r.age + ' ปี ได้แพคเกจแค่ ' + r.packageMonths + ' เดือน (ไม่ใช่ 36 เดือน) — Early Merit ลดลง ฿' + fmt(r.salary * 36 - r.earlyMerit);
  } else {
    alertEl.style.display = 'none';
  }

  // ประกันสังคม auto label
  const ssAutoLabel = document.getElementById('ssAutoLabel');
  if (ssAutoLabel) {
    const ssAuto = CALC.getSocialSecurity(r.retireYear);
    ssAutoLabel.textContent = 'Auto: ' + ssAuto + ' ฿/เดือน (ปี ' + r.retireYear + ')';
  }

  // Age warning in control
  const ageWarn = document.getElementById('ageWarning');
  if (r.retireMonth >= birthM && pkgCurrent > pkgNext) {
    ageWarn.textContent = '⚠ ระวัง! ต้องออกก่อนวันเกิด ' + birthD + '/' + birthM;
    ageWarn.style.color = '#EF4444';
  } else {
    ageWarn.textContent = 'อายุงาน ' + r.yearsOfService + ' ปี';
    ageWarn.style.color = '#64748B';
  }

  // Delta comparison กับ pinned scenarios (สูงสุด 3)
  updateMultiDeltas(r);

  // ตารางเปรียบเทียบ
  updateCompareTable(r);

  // สรุปตาราง
  updateSummaryTable(r);
  // กราฟ
  updateCharts(r);
}

function setCardVal(cardId, val) {
  document.querySelector('#' + cardId + ' .val').textContent = val;
}

// === Multi-Pin Delta System ===
export function updateMultiDeltas(r) {
  const deltaFields = [
    { group: 'deltaGroupTotalIncome', current: r.totalGross, field: 'totalGross', invert: false, isRate: false },
    { group: 'deltaGroupTotalTax', current: r.totalTax, field: 'totalTax', invert: true, isRate: false },
    { group: 'deltaGroupNetIncome', current: r.netIncome, field: 'netIncome', invert: false, isRate: false },
    { group: 'deltaGroupEffRate', current: r.effectiveRate, field: 'effectiveRate', invert: true, isRate: true },
    { group: 'deltaGroupEarlyMerit', current: r.earlyMerit, field: 'earlyMerit', invert: false, isRate: false },
    { group: 'deltaGroupSeverance', current: r.severanceAmt, field: 'severanceAmt', invert: false, isRate: false },
  ];
  deltaFields.forEach(df => {
    const el = document.getElementById(df.group);
    if (!el) return;
    if (PINNED.length === 0) { el.innerHTML = ''; return; }
    let html = '';
    // Emoji สี: 🔵 A, 🟣 B, 🟢 C
    const pinEmoji = ['🔵','🟣','🟢'];
    PINNED.forEach((p, i) => {
      const c = PIN_COLORS[i];
      const emoji = pinEmoji[i] || '';
      const diff = df.current - p[df.field];
      if (df.isRate) {
        if (Math.abs(diff) < 0.01) return;
        const sign = diff > 0 ? '+' : '';
        const isGood = df.invert ? diff < 0 : diff > 0;
        html += '<div class="delta ' + (isGood ? 'delta-up' : 'delta-down') + '" style="border-left:3px solid ' + c.bg + ';padding-left:4px">vs ' + emoji + c.name + ': ' + sign + diff.toFixed(1) + '%</div>';
      } else {
        if (Math.abs(diff) < 1) return;
        const sign = diff > 0 ? '+' : '';
        const isGood = df.invert ? diff < 0 : diff > 0;
        html += '<div class="delta ' + (isGood ? 'delta-up' : 'delta-down') + '" style="border-left:3px solid ' + c.bg + ';padding-left:4px">vs ' + emoji + c.name + ': ' + sign + '฿' + fmt(Math.abs(diff)) + '</div>';
      }
    });
    el.innerHTML = html;
  });
}

export function updateCompareTable(r) {
  const box = document.getElementById('compareTableBox');
  if (!box) return;
  if (PINNED.length === 0) { box.style.display = 'none'; return; }
  box.style.display = 'block';

  // แสดงเฉพาะ Pin A/B/C (ไม่มี "ปัจจุบัน" — ซ้ำไม่มีประโยชน์)
  const scenarios = [...PINNED];
  const labels = PINNED.map((p, i) => PIN_COLORS[i].name + ': ' + p.label);

  const rows = [
    { label: 'เงินรวม (ก่อนภาษี)', key: 'totalGross', format: 'money' },
    { label: 'ภาษีรวม', key: 'totalTax', format: 'money' },
    { label: 'เงินสุทธิ (หลังภาษี)', key: 'netIncome', format: 'money' },
    { label: 'Effective Tax Rate', key: 'effectiveRate', format: 'percent' },
    { label: 'Early Merit', key: 'earlyMerit', format: 'money' },
    { label: 'ชดเชยกฎหมาย', key: 'severanceAmt', format: 'money' },
    { label: 'แพคเกจ (เดือน)', key: 'packageMonths', format: 'number' },
    { label: 'อายุ', key: 'age', format: 'number' },
    { label: 'อายุงาน', key: 'yearsOfService', format: 'number' },
  ];

  let html = '<tr><th style="min-width:160px"></th>';
  scenarios.forEach((s, i) => {
    const c = PIN_COLORS[i];
    html += '<th style="background:' + c.text + ';color:' + c.bg + ';text-align:right;min-width:140px;font-weight:700">' + labels[i] + '</th>';
  });
  html += '</tr>';

  rows.forEach(row => {
    html += '<tr><td class="bold">' + row.label + '</td>';
    scenarios.forEach((s, i) => {
      const val = s[row.key];
      let display;
      if (row.format === 'money') display = '฿' + fmt(val);
      else if (row.format === 'percent') display = val.toFixed(1) + '%';
      else display = val;
      html += '<td class="right">' + display + '</td>';
    });
    html += '</tr>';
  });

  // แถวสุดท้าย: highlight winner (เงินสุทธิมากสุด)
  if (scenarios.length > 1) {
    const bestIdx = scenarios.reduce((best, s, i) => s.netIncome > scenarios[best].netIncome ? i : best, 0);
    html += '<tr style="background:#ECFDF5"><td class="bold" style="color:#065F46">🏆 Winner</td>';
    scenarios.forEach((s, i) => {
      html += '<td class="center bold" style="font-size:16px;color:' + (i === bestIdx ? '#065F46' : '#94A3B8') + '">' + (i === bestIdx ? '⭐ ' + PIN_COLORS[i].name : '-') + '</td>';
    });
    html += '</tr>';
  }

  document.getElementById('compareTable').innerHTML = html;
}

export function updateSummaryTable(r) {
  const t = document.getElementById('summaryTable');
  t.innerHTML = `
  <tr><th colspan="2" style="background:#1E293B;color:#F59E0B;font-size:13px">รายได้</th></tr>
  <tr><td>เงินเดือน ${r.retireMonth} เดือน</td><td class="right bold">฿${fmt(r.salaryIncome.salaryTotal)}</td></tr>
  <tr><td>โบนัสกลางปี</td><td class="right">${r.salaryIncome.bonusMidAmt > 0 ? '฿' + fmt(r.salaryIncome.bonusMidAmt) : '-'}</td></tr>
  <tr><td>โบนัสปลายปี</td><td class="right">${r.salaryIncome.bonusEndAmt > 0 ? '฿' + fmt(r.salaryIncome.bonusEndAmt) : '-'}</td></tr>
  <tr style="background:#EFF6FF"><td class="bold">รวมเงินเดือน+โบนัส</td><td class="right bold">฿${fmt(r.salaryIncome.totalIncome40_1)}</td></tr>
  <tr><td>Early Merit (${r.packageMonths} เดือน)</td><td class="right bold">฿${fmt(r.earlyMerit)}</td></tr>
  <tr><td>ชดเชยกฎหมาย (${r.severanceDays} วัน)</td><td class="right bold">฿${fmt(r.severanceAmt)}</td></tr>
  <tr style="background:#DBEAFE"><td class="bold" style="font-size:15px">รวมเงินก้อน</td><td class="right bold" style="font-size:15px">฿${fmt(r.earlyTotal)}</td></tr>
  <tr><th colspan="2" style="background:#1E293B;color:#EF4444;font-size:13px">ภาษี</th></tr>
  <tr><td>ภาษีเงินเดือน</td><td class="right bold">${r.salaryTax.tax > 0 ? '฿' + fmt(r.salaryTax.tax) : '฿0'}</td></tr>
  <tr><td>ภาษีเงินก้อน (แยกยื่น${r.lumpTax.exemption > 0 ? ', ได้ยกเว้น 600K' : ''})</td><td class="right bold">฿${fmt(r.lumpTax.tax)}</td></tr>
  ${r.pvdTax.tax > 0 ? `<tr><td>ภาษี PVD (ถอนก่อน 55)</td><td class="right bold" style="color:#EF4444">฿${fmt(r.pvdTax.tax)}</td></tr>` : ''}
  <tr style="background:#FEE2E2"><td class="bold" style="font-size:15px">ภาษีรวม</td><td class="right bold" style="font-size:15px;color:#991B1B">฿${fmt(r.totalTax)}</td></tr>
  <tr><th colspan="2" style="background:#1E293B;color:#10B981;font-size:13px">สุทธิ</th></tr>
  <tr style="background:#ECFDF5"><td class="bold" style="font-size:16px">เงินสุทธิรวม</td><td class="right bold" style="font-size:16px;color:#065F46">฿${fmt(r.netIncome)}</td></tr>
  <tr><td>Effective Tax Rate</td><td class="right bold">${r.effectiveRate.toFixed(1)}%</td></tr>
  <tr><td>PVD (${r.pvdHandling === 'rmf' ? 'โอนไป RMF' : 'ถอนออก'})</td><td class="right bold">฿${fmt(r.pvdTax.net)}</td></tr>
  `;
}
