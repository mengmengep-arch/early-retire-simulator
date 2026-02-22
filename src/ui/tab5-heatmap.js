// ============================================================
// Tab 3: Heatmap — ตาราง Heatmap ภาษีรวมทุกอายุ x ทุกเดือน
// ============================================================
import { CALC } from '../calc.js';
import { CHARTS, STATE, activeProfile, PINNED, tab3Init, setTab3Init } from '../state.js';
import { PIN_COLORS, CONFIG } from '../config.js';
import { fmt, showToast } from '../utils.js';

export function initTab3() {
  if (tab3Init) return; setTab3Init(true);
  const ht = document.getElementById('heatmapTable');
  let minTax = Infinity, maxTax = 0, minInfo = '', maxInfo = '';

  // หา pinned (year, month) สำหรับ highlight cells
  const pinnedCells = {}; // key = "year-month" → pinIndex
  PINNED.forEach((p, i) => {
    const yr = parseInt(p.retireYear || (p.label.match(/(\d{4})/) || [])[1]) || 0;
    const mo = parseInt(p.retireMonth || 0);
    if (yr && mo) pinnedCells[yr + '-' + mo] = i;
  });

  // Header
  let hdr = '<tr><th>อายุ</th><th>แพคเกจ</th>';
  CONFIG.monthNames.forEach((m, i) => { hdr += `<th>${m}</th>`; });
  hdr += '</tr>';
  ht.innerHTML = hdr;

  // แถว (cliff highlight dynamic จาก packageTiers)
  const hmCliff = CALC.findMainCliff();
  const hmCliffBefore = hmCliff ? hmCliff.beforeAge : null;
  const hmCliffAfter = hmCliff ? hmCliff.afterAge : null;
  activeProfile.masterData.forEach(d => {
    const tr = document.createElement('tr');
    if (d.age === hmCliffBefore) tr.style.background = '#FEF3C7';
    if (d.age === hmCliffAfter) tr.style.background = '#FEE2E2';
    const pkgCls = d.pkg >= 36 ? 'pkg-36' : d.pkg >= 18 ? 'pkg-18' : d.pkg >= 12 ? 'pkg-12' : d.pkg >= 6 ? 'pkg-6' : 'pkg-0';
    let cells = `<td class="bold">${d.age}</td><td><span class="pkg-badge ${pkgCls}">${d.pkg}M</span></td>`;

    for (let m = 1; m <= 12; m++) {
      // คำนวณภาษีรวมสำหรับ scenario นี้
      const tempState = { ...STATE, retireYear: d.year, retireMonth: m, packageOverride: 'auto', baseSalary: d.salary };
      const res = CALC.calcFullScenario(tempState);
      const totalTax = res.totalTax;

      if (totalTax < minTax) { minTax = totalTax; minInfo = 'อายุ ' + d.age + ' ' + CONFIG.monthNames[m - 1]; }
      if (totalTax > maxTax) { maxTax = totalTax; maxInfo = 'อายุ ' + d.age + ' ' + CONFIG.monthNames[m - 1]; }

      const cls = totalTax < 200000 ? 'ht-green' : totalTax < 500000 ? 'ht-lgreen' : totalTax < 1000000 ? 'ht-yellow' : totalTax < 1500000 ? 'ht-orange' : totalTax < 2000000 ? 'ht-red' : 'ht-dred';
      // Highlight pinned cells ด้วย outline + badge
      const pinKey = d.year + '-' + m;
      const pinIdx = pinnedCells[pinKey];
      let pinStyle = '';
      let pinBadge = '';
      if (pinIdx !== undefined) {
        const c = PIN_COLORS[pinIdx];
        pinStyle = 'outline:3px solid ' + c.bg + ';outline-offset:-2px;position:relative;';
        pinBadge = '<span style="position:absolute;top:-2px;right:-2px;background:' + c.bg + ';color:#fff;font-size:8px;font-weight:700;padding:1px 3px;border-radius:4px;line-height:1">' + c.name + '</span>';
      }
      cells += `<td class="${cls}" style="${pinStyle}" onclick="loadFromHeatmap(${d.year},${m})" title="อายุ ${d.age} ${CONFIG.monthNames[m - 1]}: ฿${fmt(totalTax)}">฿${fmt(totalTax / 1000)}K${pinBadge}</td>`;
    }
    tr.innerHTML = cells;
    ht.appendChild(tr);
  });

  // Summary cards + Pin cards
  const hc = document.getElementById('heatmapCards');
  let cardsHtml = `
  <div class="card card-green"><div class="label">ภาษีรวมต่ำสุด</div><div class="val">฿${fmt(minTax)}</div><div class="sub">${minInfo}</div></div>
  <div class="card card-red"><div class="label">ภาษีรวมสูงสุด</div><div class="val">฿${fmt(maxTax)}</div><div class="sub">${maxInfo}</div></div>
  <div class="card card-blue"><div class="label">ส่วนต่าง</div><div class="val">฿${fmt(maxTax - minTax)}</div><div class="sub">ประหยัดได้มากแค่ไหน</div></div>
  `;
  // เพิ่ม cards สำหรับ pinned scenarios
  PINNED.forEach((p, i) => {
    const c = PIN_COLORS[i];
    cardsHtml += `<div class="card" style="border-left:4px solid ${c.bg}">
      <div class="label" style="color:${c.bg}">📌 ${c.name}: ${p.label}</div>
      <div class="val" style="color:${c.bg}">฿${fmt(p.totalTax)}</div>
      <div class="sub">Eff.Rate: ${p.effectiveRate} | Net: ฿${fmt(p.netIncome)}</div>
    </div>`;
  });
  hc.innerHTML = cardsHtml;
}

export function loadFromHeatmap(year, month) {
  document.getElementById('retireYear').value = year;
  document.getElementById('retireMonth').value = month;
  window.switchTab(2);
  window.onInputChange();
  showToast('โหลด: ' + CONFIG.monthNames[month - 1] + ' ' + year);
}
