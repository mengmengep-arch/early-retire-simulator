// ============================================================
// Tab 1: รายละเอียดภาษี — ตารางภาษีเงินก้อน/เงินเดือน + กราฟขั้นบันได
// ============================================================
import { CHARTS, PINNED } from '../state.js';
import { PIN_COLORS } from '../config.js';
import { fmt } from '../utils.js';

export function updateTab1(r) {
  // ===== Helper: สร้างคอลัมน์ header — เฉพาะ Pin A/B/C (ไม่มี "ปัจจุบัน") =====
  const hasPins = PINNED.length > 0;

  // Helper: สร้าง th header row
  function makeHeader() {
    let h = '<th>รายการ</th>';
    if (hasPins) {
      PINNED.forEach((p, i) => {
        const c = PIN_COLORS[i];
        h += '<th class="right" style="color:' + c.bg + ';font-size:11px">' + c.name + ': ' + p.label + '</th>';
      });
    } else {
      h += '<th class="right">จำนวนเงิน</th>';
    }
    return '<tr>' + h + '</tr>';
  }

  // Helper: สร้าง td cells — เฉพาะ Pin A/B/C (ไม่มี "ปัจจุบัน")
  function makeCells(fieldFn, styleFn) {
    let cells = '';
    if (hasPins) {
      PINNED.forEach((p, i) => { cells += '<td class="right" style="' + (styleFn ? styleFn(p) : '') + '">฿' + fmt(fieldFn(p)) + '</td>'; });
    } else {
      cells += '<td class="right" style="' + (styleFn ? styleFn(r) : '') + '">฿' + fmt(fieldFn(r)) + '</td>';
    }
    return cells;
  }

  // ตารางภาษีเงินก้อน
  const lt = document.getElementById('lumpTaxTable');
  lt.innerHTML = makeHeader() +
    '<tr><td>Early Merit</td>' + makeCells(s => s.earlyMerit, () => 'font-weight:700') + '</tr>' +
    '<tr><td>ชดเชยกฎหมาย</td>' + makeCells(s => s.severanceAmt, () => 'font-weight:700') + '</tr>' +
    '<tr style="background:#EFF6FF"><td class="bold">รวมเงินก้อน</td>' + makeCells(s => s.earlyTotal, () => 'font-weight:700') + '</tr>' +
    '<tr style="background:#ECFDF5"><td>หักยกเว้น 600K</td>' + makeCells(s => s.lumpTax.exemption, () => 'color:#10B981') + '</tr>' +
    '<tr><td>หักอายุงาน</td>' + makeCells(s => s.lumpTax.yearsDeduction, () => 'color:#10B981') + '</tr>' +
    '<tr><td>เหลือหลังหัก</td>' + makeCells(s => s.lumpTax.afterYears, () => 'font-weight:700') + '</tr>' +
    '<tr style="background:#FEF3C7"><td>หักอีก 50%</td>' + makeCells(s => s.lumpTax.halfDeduction, () => 'color:#10B981') + '</tr>' +
    '<tr style="background:#DBEAFE"><td class="bold" style="font-size:15px">เงินได้สุทธิ(แยกยื่น)</td>' + makeCells(s => s.lumpTax.netForTax, () => 'font-weight:700;font-size:15px;color:#1E40AF') + '</tr>' +
    '<tr style="background:#FEE2E2"><td class="bold" style="font-size:15px">ภาษีเงินก้อน</td>' + makeCells(s => s.lumpTax.tax, () => 'font-weight:700;font-size:15px;color:#991B1B') + '</tr>';

  // ตารางภาษีเงินเดือน
  const st = document.getElementById('salaryTaxTable');
  st.innerHTML = makeHeader() +
    '<tr><td>เงินได้ 40(1)</td>' + makeCells(s => s.salaryTax.totalIncome40_1, () => 'font-weight:700') + '</tr>' +
    '<tr><td>หักค่าใช้จ่าย</td>' + makeCells(s => s.salaryTax.expense, () => 'color:#10B981') + '</tr>' +
    '<tr><td>หักค่าลดหย่อนรวม</td>' + makeCells(s => s.salaryTax.dedTotal, () => 'color:#10B981') + '</tr>' +
    '<tr style="background:#DBEAFE"><td class="bold">เงินได้สุทธิ</td>' + makeCells(s => s.salaryTax.netIncome, () => 'font-weight:700;color:#1E40AF') + '</tr>' +
    '<tr style="background:#FEE2E2"><td class="bold" style="font-size:15px">ภาษีเงินเดือน</td>' + makeCells(s => s.salaryTax.tax, () => 'font-weight:700;font-size:15px;color:#991B1B') + '</tr>';

  // กราฟขั้นบันได
  updateStepChart('lumpStepChart', 'lumpStep', r.lumpTax.steps, 'ภาษีเงินก้อน');
  updateStepChart('salaryStepChart', 'salaryStep', r.salaryTax.steps, 'ภาษีเงินเดือน');
}

export function updateStepChart(canvasId, chartKey, steps, title) {
  const bracketLabels = steps.map(s => fmt(s.from) + '-' + fmt(s.to) + ' (' + (s.rate * 100) + '%)');
  const defaultColors = ['#D1FAE5','#A7F3D0','#6EE7B7','#FCD34D','#FBBF24','#F59E0B','#EF4444','#B91C1C'];

  // ===== มี Pin → Grouped bar =====
  if (PINNED.length > 0) {
    // ต้อง destroy chart เก่าก่อน เพราะจำนวน datasets เปลี่ยน
    if (CHARTS[chartKey]) { CHARTS[chartKey].destroy(); CHARTS[chartKey] = null; }

    // หา tax field ที่ตรงกับ chartKey
    const taxField = chartKey === 'lumpStep' ? 'lumpTax' : 'salaryTax';

    // รวม bracket labels จากทุก scenario (ใช้ของปัจจุบันเป็นหลัก)
    const datasets = [];
    PINNED.forEach((p, i) => {
      const c = PIN_COLORS[i];
      const pSteps = p[taxField].steps;
      const pData = bracketLabels.map((lbl, j) => (pSteps[j] ? pSteps[j].tax : 0));
      datasets.push({
        label: c.name + ': ' + p.label,
        data: pData,
        backgroundColor: c.bg + '99',
        borderColor: c.bg,
        borderWidth: 1,
        borderRadius: 4
      });
    });
    // ไม่มี dataset "ปัจจุบัน" — แสดงเฉพาะ Pin A/B/C

    CHARTS[chartKey] = new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: { labels: bracketLabels, datasets },
      options: { responsive: true, indexAxis: 'y',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, usePointStyle: true } },
          tooltip: { callbacks: { label: c => c.dataset.label + ': ฿' + fmt(c.raw) } },
          datalabels: { display: false }
        },
        scales: {
          x: { ticks: { callback: v => '฿' + fmt(v) }, grid: { color: '#E2E8F0' } },
          y: { grid: { display: false } }
        }
      }
    });
    return;
  }

  // ===== ปกติ: Bar เดี่ยว =====
  const data = steps.map(s => s.tax);
  if (!CHARTS[chartKey]) {
    CHARTS[chartKey] = new Chart(document.getElementById(canvasId), {
      type: 'bar', data: { labels: bracketLabels, datasets: [{ label: title, data, backgroundColor: defaultColors.slice(0, data.length), borderRadius: 4 }] },
      options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '฿' + fmt(c.raw) } },
        datalabels: { display: false } },
        scales: { x: { ticks: { callback: v => '฿' + fmt(v) }, grid: { color: '#E2E8F0' } }, y: { grid: { display: false } } } }
    });
  } else {
    CHARTS[chartKey].data.labels = bracketLabels;
    CHARTS[chartKey].data.datasets[0].data = data;
    CHARTS[chartKey].data.datasets[0].backgroundColor = defaultColors.slice(0, data.length);
    CHARTS[chartKey].update();
  }
}
