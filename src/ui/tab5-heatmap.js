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

  // counters สำหรับ summary
  const colorCounts = { green: 0, lgreen: 0, yellow: 0, orange: 0, red: 0, dred: 0 };
  const taxSumByMonth = new Array(13).fill(0);
  const taxCountByMonth = new Array(13).fill(0);

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

      // นับสี + สะสม tax ตามเดือน
      if (cls === 'ht-green') colorCounts.green++;
      else if (cls === 'ht-lgreen') colorCounts.lgreen++;
      else if (cls === 'ht-yellow') colorCounts.yellow++;
      else if (cls === 'ht-orange') colorCounts.orange++;
      else if (cls === 'ht-red') colorCounts.red++;
      else colorCounts.dred++;
      taxSumByMonth[m] += totalTax;
      taxCountByMonth[m]++;

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

  // === Heatmap Summary (Top3 + Color Stats + Best Month) ===
  const summaryEl = document.getElementById('heatmapSummary');
  if (!summaryEl) return;

  // Top 3 อายุแนะนำ จาก Decision Scores
  const scores = CALC.calcDecisionScores(activeProfile.masterData);
  const top3 = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  const medalColors = ['#F59E0B', '#94A3B8', '#D97706'];

  // หาเดือนที่ดีที่สุด (avg tax ต่ำสุด)
  let bestMonth = 1, bestAvg = Infinity;
  for (let m = 1; m <= 12; m++) {
    if (taxCountByMonth[m] > 0) {
      const avg = taxSumByMonth[m] / taxCountByMonth[m];
      if (avg < bestAvg) { bestAvg = avg; bestMonth = m; }
    }
  }

  const totalCells = Object.values(colorCounts).reduce((s, v) => s + v, 0);

  let html = '<div class="chart-box" style="margin-bottom:20px"><h3>🔍 สรุปวิเคราะห์ Heatmap</h3>';

  // --- Top 3 ---
  if (top3.length > 0) {
    html += '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:10px">🏆 Top 3 อายุแนะนำ <span style="font-size:11px;font-weight:400;color:#64748B">(คะแนนรวม 6 ปัจจัย: ความมั่งคั่ง, แพคเกจ, ภาษี, PVD, ประกันสังคม, เวลา)</span></div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">';
    top3.forEach((s, i) => {
      const pct = Math.min(Math.round(s.score), 100);
      html += '<div style="background:#F8FAFC;border-radius:10px;padding:14px;border:2px solid ' + medalColors[i] + '">' +
        '<div style="font-size:20px;font-weight:900;color:' + medalColors[i] + '">' + medals[i] + ' อายุ ' + s.age + '</div>' +
        '<div style="font-size:11px;color:#64748B;margin-bottom:6px">พ.ศ. ' + s.year + ' | ' + s.pkg + ' เดือน</div>' +
        '<div style="font-size:12px;font-weight:700;color:#1E293B">คะแนน: ' + s.score.toFixed(1) + '/100</div>' +
        '<div class="score-bar" style="margin:4px 0 6px"><div class="score-fill" style="width:' + pct + '%;background:' + medalColors[i] + '"></div></div>' +
        '<div style="font-size:11px;color:#059669">💰 Net: ฿' + fmt(s.totalIncome) + '</div>' +
        '<div style="font-size:11px;color:#DC2626">🧾 ภาษี: ' + (s.taxRate * 100).toFixed(1) + '%</div>' +
        (s.pros.slice(0, 2).map(p => '<div style="font-size:10px;color:#64748B;margin-top:3px">✓ ' + p + '</div>').join('')) +
        '</div>';
    });
    html += '</div></div>';
  }

  // --- Color Distribution + Best Month (2 columns) ---
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';

  // Color distribution
  const colorDefs = [
    { key: 'green',  label: '🟢 ต่ำมาก (<200K)',     textColor: '#065F46' },
    { key: 'lgreen', label: '🟢 ต่ำ (<500K)',          textColor: '#065F46' },
    { key: 'yellow', label: '🟡 ปานกลาง (<1M)',        textColor: '#92400E' },
    { key: 'orange', label: '🟠 ค่อนข้างสูง (<1.5M)',  textColor: '#9A3412' },
    { key: 'red',    label: '🔴 สูง (<2M)',             textColor: '#991B1B' },
    { key: 'dred',   label: '🔴 สูงมาก (≥2M)',         textColor: '#7F1D1D' },
  ];
  html += '<div><div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px">🎨 การกระจายตัว 144 Scenarios</div>';
  colorDefs.forEach(cd => {
    const cnt = colorCounts[cd.key];
    if (cnt === 0) return;
    const pct = Math.round(cnt / totalCells * 100);
    html += '<div style="margin-bottom:5px">' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">' +
      '<span style="color:' + cd.textColor + ';font-weight:600">' + cd.label + '</span>' +
      '<span style="color:#64748B"><strong>' + cnt + '</strong> (' + pct + '%)</span></div>' +
      '<div style="height:5px;background:#E2E8F0;border-radius:3px">' +
      '<div style="height:100%;width:' + pct + '%;background:' + cd.textColor + ';border-radius:3px"></div></div></div>';
  });
  html += '</div>';

  // Best Month
  const monthAvgs = [];
  for (let m = 1; m <= 12; m++) {
    if (taxCountByMonth[m] > 0) monthAvgs.push({ m, avg: taxSumByMonth[m] / taxCountByMonth[m] });
  }
  monthAvgs.sort((a, b) => a.avg - b.avg);
  const monthMaxAvg = Math.max(...monthAvgs.map(x => x.avg));

  html += '<div><div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px">📅 เดือนแนะนำโดยเฉลี่ย</div>';
  html += '<div style="background:#F0FDF4;border-radius:10px;padding:12px;border:2px solid #10B981;text-align:center;margin-bottom:10px">';
  html += '<div style="font-size:26px;font-weight:900;color:#059669">' + CONFIG.monthNames[bestMonth - 1] + '</div>';
  html += '<div style="font-size:11px;color:#64748B;margin-top:2px">avg ภาษีต่ำสุด: ฿' + fmt(Math.round(bestAvg)) + '</div>';
  html += '</div>';
  monthAvgs.forEach((ma, rank) => {
    const barPct = Math.round(ma.avg / monthMaxAvg * 100);
    const barColor = rank === 0 ? '#10B981' : rank <= 2 ? '#3B82F6' : '#CBD5E1';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:11px">' +
      '<span style="min-width:30px;color:#64748B">' + CONFIG.monthNames[ma.m - 1] + '</span>' +
      '<div style="flex:1;height:5px;background:#E2E8F0;border-radius:3px">' +
      '<div style="height:100%;width:' + barPct + '%;background:' + barColor + ';border-radius:3px"></div></div>' +
      '<span style="min-width:44px;text-align:right;color:#64748B">฿' + fmt(Math.round(ma.avg / 1000)) + 'K</span></div>';
  });
  html += '</div>';

  html += '</div>'; // end grid
  html += '</div>'; // end chart-box
  summaryEl.innerHTML = html;
}

export function loadFromHeatmap(year, month) {
  document.getElementById('retireYear').value = year;
  document.getElementById('retireMonth').value = month;
  window.switchTab(2);
  window.onInputChange();
  showToast('โหลด: ' + CONFIG.monthNames[month - 1] + ' ' + year);
}
