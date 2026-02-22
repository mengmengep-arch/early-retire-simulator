// ============================================================
// Tab 2: ภาพรวมทุกอายุ — กราฟ Package Cliff, Total Wealth, Master Table, YoY
// ============================================================
import { CALC } from '../calc.js';
import { CHARTS, activeProfile, PINNED, showNet, STATE, tab2Init, setTab2Init } from '../state.js';
import { PIN_COLORS, CONFIG, CURRENT_YEAR_BE } from '../config.js';
import { fmt } from '../utils.js';

// Toggle Gross/Net — สลับดูก่อน/หลังหักภาษี

// คำนวณ tax data ต่อ age (เรียก CALC.calcFullScenario ต่อ masterData row)
// ต้องเรียกหลังจาก STATE พร้อมแล้ว (หลัง readState())
export function calcTaxPerAge() {
  const md = activeProfile.masterData;
  if (!md || md.length === 0) return;
  // ถ้าคำนวณแล้ว ไม่ต้องทำซ้ำ (ล้างเมื่อ destroyAllCharts)
  if (md[0]._taxCalcDone) return;

  md.forEach(d => {
    try {
      // สร้าง state ชั่วคราวต่อ age เหมือน npvData pattern
      const tempState = { ...STATE, retireYear: d.year, retireMonth: 6,
        packageOverride: 'auto', baseSalary: d.salary };
      const res = CALC.calcFullScenario(tempState);
      d.lumpTax = res.lumpTax.tax || 0;      // ภาษีเงินก้อน
      d.salaryTaxAmt = res.salaryTax.tax || 0; // ภาษีเงินเดือน (ใช้ชื่อต่างจาก field เดิม)
      d.pvdTaxAmt = res.pvdTax.tax || 0;      // ภาษี PVD
      d.totalTaxAmt = res.totalTax || 0;       // ภาษีรวม
    } catch(e) {
      d.lumpTax = 0; d.salaryTaxAmt = 0; d.pvdTaxAmt = 0; d.totalTaxAmt = 0;
    }
  });
  md[0]._taxCalcDone = true;
}

// อัพเดต totalWealthChart ตาม Gross/Net toggle
export function updateTotalWealthChart() {
  if (!CHARTS.totalWealth) return;
  const md = activeProfile.masterData;
  const isNet = showNet.tab2;

  // คำนวณ tax data ถ้ายังไม่ได้ทำ
  calcTaxPerAge();

  // Net version: หักภาษีจากแต่ละส่วน
  // สะสมสุทธิ (accum) ต้องหัก salaryTax สะสมจากปีแรก
  let runningSalaryTax = 0;
  const accumArr = [], earlyArr = [], pvdArr = [], welfareArr = [];
  md.forEach(d => {
    runningSalaryTax += (d.salaryTaxAmt || 0);
    accumArr.push(isNet ? Math.max(0, d.accum - runningSalaryTax) : d.accum);
    earlyArr.push(isNet ? Math.max(0, d.earlyTotal - (d.lumpTax || 0)) : d.earlyTotal);
    pvdArr.push(isNet ? Math.max(0, d.pvd - (d.pvdTaxAmt || 0)) : d.pvd);
    welfareArr.push(d.welfare); // สวัสดิการไม่เสียภาษี
  });

  // อัพเดต datasets
  CHARTS.totalWealth.data.datasets[0].data = accumArr;
  CHARTS.totalWealth.data.datasets[1].data = earlyArr;
  CHARTS.totalWealth.data.datasets[2].data = pvdArr;
  CHARTS.totalWealth.data.datasets[3].data = welfareArr;

  // เปลี่ยน label ให้สะท้อนสถานะ
  CHARTS.totalWealth.data.datasets[0].label = isNet ? 'สะสมสุทธิ (หลังภาษี)' : 'สะสมสุทธิ';
  CHARTS.totalWealth.data.datasets[1].label = isNet ? 'Early Total (หลังภาษี)' : 'Early Total';
  CHARTS.totalWealth.data.datasets[2].label = isNet ? 'PVD (หลังภาษี)' : 'PVD';

  // Fix Y-axis scale — ใช้ Gross max เป็นเพดานเสมอ (ทั้ง Gross + Net) เพื่อไม่ให้แกนกระโดด
  const grossStackMax = Math.max(...md.map(d => d.accum + d.earlyTotal + d.pvd + d.welfare));
  CHARTS.totalWealth.options.scales.y.max = Math.ceil(grossStackMax * 1.05);

  CHARTS.totalWealth.update();
}

// อัพเดต incomeBreakdownChart ตาม Gross/Net toggle
export function updateIncomeBreakdownChart() {
  if (!CHARTS.incomeBreakdown) return;
  const md = activeProfile.masterData;
  const isNet = showNet.tab4;

  // คำนวณ tax data ถ้ายังไม่ได้ทำ
  calcTaxPerAge();

  const earlyData = md.map(d => isNet ? Math.max(0, d.earlyTotal - (d.lumpTax || 0)) : d.earlyTotal);
  const pvdData = md.map(d => isNet ? Math.max(0, d.pvd - (d.pvdTaxAmt || 0)) : d.pvd);
  const welfareData = md.map(d => d.welfare);

  // Accumulate line — ต้องหักภาษีสะสมด้วย
  let welfareAccum = 0;
  let runningSalaryTax = 0;
  const accumData = md.map(d => {
    welfareAccum += (d.welfare || 0);
    runningSalaryTax += (d.salaryTaxAmt || 0);
    const accumVal = isNet ? Math.max(0, (d.accum || 0) - runningSalaryTax) : (d.accum || 0);
    const earlyVal = isNet ? Math.max(0, (d.earlyTotal || 0) - (d.lumpTax || 0)) : (d.earlyTotal || 0);
    const pvdVal = isNet ? Math.max(0, (d.pvd || 0) - (d.pvdTaxAmt || 0)) : (d.pvd || 0);
    return accumVal + welfareAccum + earlyVal + pvdVal;
  });

  CHARTS.incomeBreakdown.data.datasets[0].data = earlyData;
  CHARTS.incomeBreakdown.data.datasets[1].data = pvdData;
  CHARTS.incomeBreakdown.data.datasets[2].data = welfareData;
  CHARTS.incomeBreakdown.data.datasets[3].data = accumData;

  // เปลี่ยน label
  CHARTS.incomeBreakdown.data.datasets[0].label = isNet ? 'เงินก้อน (หลังภาษี)' : 'เงินก้อน (Package+Severance)';
  CHARTS.incomeBreakdown.data.datasets[1].label = isNet ? 'PVD (หลังภาษี)' : 'PVD สะสม';
  CHARTS.incomeBreakdown.data.datasets[3].label = isNet ? 'Accumulate (หลังภาษี)' : 'Accumulate (สะสมรวม)';

  // Fix Y-axis scale — ใช้ Gross max เป็นเพดานเสมอ (ทั้ง Gross + Net) เพื่อไม่ให้แกนกระโดด
  const grossBarMax = Math.max(...md.map(d => d.earlyTotal + d.pvd + d.welfare));
  CHARTS.incomeBreakdown.options.scales.y.max = Math.ceil(grossBarMax * 1.05);
  // Accumulate line (Gross version) สำหรับ fix y1
  let wAccum2 = 0;
  const grossAccumMax = Math.max(...md.map(d => {
    wAccum2 += (d.welfare || 0);
    return (d.accum || 0) + wAccum2 + (d.earlyTotal || 0) + (d.pvd || 0);
  }));
  CHARTS.incomeBreakdown.options.scales.y1.max = Math.ceil(grossAccumMax * 1.05);

  CHARTS.incomeBreakdown.update();
}

// helper สีตาม theme
function _tc() {
  const d = document.body.classList.contains('dark');
  return {
    grid:       d ? '#334155' : '#E2E8F0',
    btnBg:      d ? '#334155' : '#E2E8F0',
    btnColor:   d ? '#CBD5E1' : '#475569',
    cliffBefore: d ? '#451a03' : '#FEF3C7',
    cliffAfter:  d ? '#3b0a0a' : '#FEE2E2',
    headerCard:  d ? '#1e293b' : '#F1F5F9',
    headerText:  d ? '#94A3B8' : '#334155',
    headerBorder: d ? '#334155' : '#CBD5E1',
  };
}

// Toggle สลับ Gross/Net
export function toggleGrossNet(tab) {
  showNet[tab] = !showNet[tab];
  const isNet = showNet[tab];
  const tc = _tc();

  if (tab === 'tab2') {
    updateTotalWealthChart();
    const btn = document.getElementById('toggleGrossNet2');
    if (btn) {
      btn.textContent = isNet ? '✅ Net (หลังหักภาษี)' : '💰 Gross (ก่อนภาษี)';
      btn.className = isNet ? 'btn toggle-net' : 'btn';
      btn.style.background = isNet ? '' : tc.btnBg;
      btn.style.color = isNet ? '' : tc.btnColor;
    }
  }
  if (tab === 'tab4') {
    updateIncomeBreakdownChart();
    const btn = document.getElementById('toggleGrossNet4');
    if (btn) {
      btn.textContent = isNet ? '✅ Net (หลังหักภาษี)' : '💰 Gross (ก่อนภาษี)';
      btn.className = isNet ? 'btn toggle-net' : 'btn';
      btn.style.background = isNet ? '' : tc.btnBg;
      btn.style.color = isNet ? '' : tc.btnColor;
    }
  }
}

// ============================================================
// Tab 2: ภาพรวมทุกอายุ
// ============================================================
export function initTab2() {
  if (tab2Init) return; setTab2Init(true);
  const tc = _tc();
  const ages = activeProfile.masterData.map(d => d.age + '');
  const pkgColors = activeProfile.masterData.map(d => d.pkg >= 36 ? '#10B981' : d.pkg >= 18 ? '#F59E0B' : d.pkg >= 12 ? '#F97316' : d.pkg >= 6 ? '#EF4444' : '#94A3B8');

  // หาตำแหน่ง pinned age ใน masterData (สำหรับ highlight)
  const pinnedAgeMap = {}; // { age: PIN_COLORS index }
  PINNED.forEach((p, i) => {
    const retireYear = parseInt(p.retireYear || p.label.match(/(\d{4})/)?.[1]) || 0;
    const md = activeProfile.masterData.find(d => d.year === retireYear);
    if (md) pinnedAgeMap[md.age] = i;
  });

  // สร้าง border arrays สำหรับ highlight pinned bars
  const borderWidths = ages.map((a) => pinnedAgeMap.hasOwnProperty(parseInt(a)) ? 3 : 0);
  const borderColors = ages.map((a) => {
    const idx = pinnedAgeMap[parseInt(a)];
    return idx !== undefined ? PIN_COLORS[idx].bg : 'transparent';
  });

  // หน้าผาแพคเกจ
  CHARTS.pkgCliff = new Chart(document.getElementById('pkgCliffChart'), {
    type: 'bar', data: { labels: ages, datasets: [{ label: 'Early Merit (เดือน)', data: activeProfile.masterData.map(d => d.pkg), backgroundColor: pkgColors, borderRadius: 6,
      borderWidth: borderWidths, borderColor: borderColors }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw + ' เดือน' } },
      datalabels: { display: function(ctx) { return borderWidths[ctx.dataIndex] > 0; }, anchor: 'end', align: 'top', color: function(ctx) { return borderColors[ctx.dataIndex]; },
        font: { weight: 'bold', size: 11 }, formatter: function(v, ctx) { const idx = pinnedAgeMap[parseInt(ages[ctx.dataIndex])]; return idx !== undefined ? '📌' + PIN_COLORS[idx].name : ''; } } },
      scales: { x: { grid: { display: false }, title: { display: true, text: 'อายุ (ปี)' } }, y: { title: { display: true, text: 'เดือน' }, grid: { color: tc.grid } } } }
  });

  // Total Wealth Stacked — highlight border บน dataset สุดท้าย (top of stack)
  const wealthDatasets = [
    { label: 'สะสมสุทธิ', data: activeProfile.masterData.map(d => d.accum), backgroundColor: '#60A5FA', borderRadius: 2 },
    { label: 'Early Total', data: activeProfile.masterData.map(d => d.earlyTotal), backgroundColor: '#10B981', borderRadius: 2 },
    { label: 'PVD', data: activeProfile.masterData.map(d => d.pvd), backgroundColor: '#F59E0B', borderRadius: 2 },
    { label: 'สวัสดิการ', data: activeProfile.masterData.map(d => d.welfare), backgroundColor: '#A78BFA', borderRadius: 2,
      borderWidth: borderWidths, borderColor: borderColors }
  ];
  CHARTS.totalWealth = new Chart(document.getElementById('totalWealthChart'), {
    type: 'bar', data: { labels: ages, datasets: wealthDatasets },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } },
      tooltip: { callbacks: { label: c => c.dataset.label + ': ฿' + fmt(c.raw) } }, datalabels: { display: false } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: v => '฿' + fmt(v) }, grid: { color: tc.grid } } } }
  });

  // Master Table — highlight rows ที่ pinned + cliff ages (dynamic)
  const mt = document.getElementById('masterTable');
  const mtCliff = CALC.findMainCliff();
  const mtCliffBefore = mtCliff ? mtCliff.beforeAge : null;
  const mtCliffAfter = mtCliff ? mtCliff.afterAge : null;
  let html = '<tr><th>อายุ</th><th>ปี</th><th>ทำงาน</th><th>เงินเดือน</th><th>แพคเกจ</th><th class="right">Early Merit</th><th class="right">ชดเชย</th><th class="right">Early Total</th><th class="right">PVD</th><th class="right">Total Income</th></tr>';
  activeProfile.masterData.forEach(d => {
    const pinIdx = pinnedAgeMap[d.age];
    let hl = '';
    let badge = '';
    if (pinIdx !== undefined) {
      const c = PIN_COLORS[pinIdx];
      hl = ' style="background:' + c.text + ';border-left:4px solid ' + c.bg + '"';
      badge = ' <span style="background:' + c.bg + ';color:#fff;padding:1px 5px;border-radius:8px;font-size:10px;font-weight:700">' + c.name + '</span>';
    } else {
      hl = d.age === mtCliffBefore ? ' style="background:' + tc.cliffBefore + '"' : d.age === mtCliffAfter ? ' style="background:' + tc.cliffAfter + '"' : '';
    }
    const pkgCls = d.pkg >= 36 ? 'pkg-36' : d.pkg >= 18 ? 'pkg-18' : d.pkg >= 12 ? 'pkg-12' : d.pkg >= 6 ? 'pkg-6' : 'pkg-0';
    html += `<tr${hl}><td class="bold">${d.age}${badge}</td><td>${d.year}</td><td>${d.workYrs}</td><td class="right">${fmt(d.salary)}</td><td><span class="pkg-badge ${pkgCls}">${d.pkg}M</span></td><td class="right">${fmt(d.earlyMerit)}</td><td class="right">${fmt(d.severance)}</td><td class="right bold">${fmt(d.earlyTotal)}</td><td class="right">${fmt(d.pvd)}</td><td class="right bold">${fmt(d.totalIncome)}</td></tr>`;
  });
  mt.innerHTML = html;

  // YoY Chart — highlight transition bars ที่ pinned age
  const yoyData = [];
  for (let i = 0; i < activeProfile.masterData.length - 1; i++) {
    yoyData.push(activeProfile.masterData[i + 1].totalIncome - activeProfile.masterData[i].totalIncome);
  }
  const yoyLabels = activeProfile.masterData.slice(0, -1).map((d, i) => d.age + '→' + activeProfile.masterData[i + 1].age);
  const yoyBgColors = yoyData.map((v, i) => {
    // ถ้า age ต้นทาง หรือ ปลายทาง ตรงกับ pinned → ใช้สี PIN
    const fromAge = activeProfile.masterData[i].age;
    const toAge = activeProfile.masterData[i + 1].age;
    if (pinnedAgeMap.hasOwnProperty(toAge)) return PIN_COLORS[pinnedAgeMap[toAge]].bg + 'CC';
    if (pinnedAgeMap.hasOwnProperty(fromAge)) return PIN_COLORS[pinnedAgeMap[fromAge]].bg + '66';
    return v >= 0 ? '#10B981' : '#EF4444';
  });
  const yoyBorderWidths = yoyData.map((v, i) => {
    const toAge = activeProfile.masterData[i + 1].age;
    return pinnedAgeMap.hasOwnProperty(toAge) ? 2 : 0;
  });
  const yoyBorderColors = yoyData.map((v, i) => {
    const toAge = activeProfile.masterData[i + 1].age;
    const idx = pinnedAgeMap[toAge];
    return idx !== undefined ? PIN_COLORS[idx].bg : 'transparent';
  });
  CHARTS.yoy = new Chart(document.getElementById('yoyChart'), {
    type: 'bar', data: { labels: yoyLabels,
      datasets: [{ label: 'Net Change', data: yoyData, backgroundColor: yoyBgColors, borderRadius: 6, borderWidth: yoyBorderWidths, borderColor: yoyBorderColors }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => (c.raw >= 0 ? '+' : '') + '฿' + fmt(c.raw) } }, datalabels: { display: false } },
      scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => (v >= 0 ? '+' : '') + '฿' + fmt(v) }, grid: { color: tc.grid } } } }
  });
}
