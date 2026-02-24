// ============================================================
// Tab 4: กลยุทธ์ & NPV — Best Strategy, Income Breakdown, NPV, Break-even, Decision Table
// ============================================================
import { CALC } from '../calc.js';
import { CHARTS, STATE, activeProfile, PINNED, tab4Init, setTab4Init } from '../state.js';
import { PIN_COLORS, CONFIG, DEFAULT_PROFILE, CURRENT_YEAR_BE } from '../config.js';
import { fmt } from '../utils.js';

// helper สีตาม theme
function _tc() {
  const d = document.body.classList.contains('dark');
  return {
    grid:       d ? '#334155' : '#E2E8F0',
    zeroLine:   d ? '#94A3B8' : '#1E293B',
    textSub:    d ? '#94A3B8' : '#64748B',
    cardBg:     d ? '#1e293b' : '#F1F5F9',
    cardBorder: d ? '#475569' : '#CBD5E1',
    cardText:   d ? '#CBD5E1' : '#334155',
    ocBg:       d ? '#451a03' : '#FEF3C7',
    ocBorder:   d ? '#92400E' : '#FCD34D',
    ocTitle:    d ? '#fde68a' : '#92400E',
    ocCellBg:   d ? '#0f172a' : '#fff',
    score80:    d ? '#064e3b' : '#D1FAE5',
    score60:    d ? '#451a03' : '#FEF3C7',
    score40:    d ? '#431407' : '#FFEDD5',
    scoreRed:   d ? '#3b0a0a' : '#FEE2E2',
    headerBg:   d ? '#0F172A' : '#1E293B',
  };
}

export function initTab4() {
  if (tab4Init) return; setTab4Init(true);

  // หาตำแหน่ง pinned age ใน masterData
  const pinnedAgeMap = {};
  PINNED.forEach((p, i) => {
    const retireYear = parseInt(p.retireYear || (p.label.match(/(\d{4})/) || [])[1]) || 0;
    const md = activeProfile.masterData.find(d => d.year === retireYear);
    if (md) pinnedAgeMap[md.age] = i;
  });
  const ages = activeProfile.masterData.map(d => d.age);

  // Best Strategy — ใช้ Decision Matrix Score (6 เกณฑ์ถ่วงน้ำหนัก) แสดง Top 3 + ข้อดี/ข้อเสีย
  const bs = document.getElementById('bestStrategySection');
  const mdArr = activeProfile.masterData;
  if (mdArr.length === 0 || !activeProfile.salary) {
    bs.innerHTML = '<div class="info-box">📊 กรุณากรอกข้อมูลใน Tab "ข้อมูล & แพคเกจ" ก่อน จะแสดงกลยุทธ์ที่แนะนำ</div>';
  } else {
    // คำนวณ Decision Scores แล้วเรียงจากมากไปน้อย
    const allScores = CALC.calcDecisionScores(mdArr);
    const ranked = [...allScores].sort((a, b) => b.score - a.score);
    const top3 = ranked.slice(0, 3);
    const medals = ['🏆', '🥈', '🥉'];
    const rankLabels = ['อันดับ 1', 'อันดับ 2', 'อันดับ 3'];
    // สีพื้นหลังแต่ละอันดับ
    const tc = _tc();
    const bgColors = [
      'background:linear-gradient(135deg,#065F46,#10B981);color:#fff',
      'background:linear-gradient(135deg,#1E3A5F,#3B82F6);color:#fff',
      'background:' + tc.cardBg + ';color:' + tc.cardText + ';border:1px solid ' + tc.cardBorder
    ];
    let bsHtml = '';
    top3.forEach((item, idx) => {
      const monthName = CONFIG.monthNames[5]; // มิ.ย.
      const prosHtml = item.pros.slice(0, 3).map(p => '<span style="margin-right:8px">✅ ' + p + '</span>').join('');
      const consHtml = item.cons.slice(0, 2).map(c => '<span style="margin-right:8px">⚠️ ' + c + '</span>').join('');
      const isFirst = idx === 0;
      const fontSize = isFirst ? '32px' : '22px';
      const padding = isFirst ? '24px' : '16px';
      const scoreSize = isFirst ? '15px' : '13px';
      bsHtml += `
      <div style="${bgColors[idx]};border-radius:14px;padding:${padding};margin-bottom:12px;text-align:center">
        <div style="font-size:${scoreSize};opacity:0.85">${medals[idx]} ${rankLabels[idx]} — คะแนน ${item.score}/100</div>
        <div style="font-size:${fontSize};font-weight:900;margin:4px 0">อายุ ${item.age} — ${monthName} ${item.year}</div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:6px">แพคเกจ ${item.pkg} เดือน | รายได้รวม ฿${fmt(item.totalIncome)} | ภาษี ~${(item.taxRate * 100).toFixed(1)}%</div>
        <div style="font-size:12px;opacity:0.85;line-height:1.6">${prosHtml}</div>
        ${consHtml ? '<div style="font-size:12px;opacity:0.75;line-height:1.6;margin-top:2px">' + consHtml + '</div>' : ''}
      </div>`;
    });
    bs.innerHTML = bsHtml;
  }

  // === กราฟ Stacked Bar — รายได้แยกส่วน (เงินก้อน / PVD / สวัสดิการ) + เส้น Accumulate ===
  const earlyTotalData = activeProfile.masterData.map(d => d.earlyTotal);
  const pvdData = activeProfile.masterData.map(d => d.pvd);
  const welfareData = activeProfile.masterData.map(d => d.welfare);
  // เส้น Accumulate = รายได้สะสม (เงินเดือน+โบนัส) + สวัสดิการสะสม + Early(ปีนั้น) + PVD(ปีนั้น)
  // d.accum = เงินเดือน×12 + โบนัส สะสมจากปีแรก (คำนวณไว้ใน generateMasterData)
  let welfareAccum = 0;
  const accumData = activeProfile.masterData.map(d => {
    welfareAccum += (d.welfare || 0);
    return (d.accum || 0) + welfareAccum + (d.earlyTotal || 0) + (d.pvd || 0);
  });
  // border สำหรับ pinned scenarios
  const stackBorderWidths = ages.map(a => pinnedAgeMap.hasOwnProperty(a) ? 3 : 0);
  const stackBorderColors = ages.map(a => pinnedAgeMap.hasOwnProperty(a) ? PIN_COLORS[pinnedAgeMap[a]].bg : 'transparent');

  CHARTS.incomeBreakdown = new Chart(document.getElementById('incomeBreakdownChart'), {
    type: 'bar',
    data: {
      labels: ages.map(a => a + ''),
      datasets: [
        { label: 'เงินก้อน (Package+Severance)', data: earlyTotalData, backgroundColor: '#3B82F6', stack: 'stack1', borderRadius: { topLeft: 0, topRight: 0 } },
        { label: 'PVD สะสม', data: pvdData, backgroundColor: '#8B5CF6', stack: 'stack1' },
        { label: 'สวัสดิการ', data: welfareData, backgroundColor: '#10B981', stack: 'stack1', borderRadius: { topLeft: 6, topRight: 6 } },
        {
          label: 'Accumulate (สะสมรวม)',
          data: accumData,
          type: 'line',
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#F59E0B',
          fill: false,
          tension: 0.3,
          yAxisID: 'y1',
          order: 0,
          datalabels: { display: false }
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true, grid: { display: false }, title: { display: true, text: 'อายุที่ออก' } },
        y: { stacked: true, ticks: { callback: v => '฿' + fmt(v) }, grid: { color: function() { return _tc().grid; } } },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { callback: v => '฿' + fmt(v) },
          title: { display: true, text: 'สะสมรวม (฿)', font: { size: 11 } }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 } } },
        tooltip: {
          mode: 'index', intersect: false,
          callbacks: {
            label: function(c) { return c.dataset.label + ': ฿' + fmt(c.raw); },
            footer: function(items) {
              // ยอมรวมเฉพาะแท่ง bar (ไม่รวม Accumulate line)
              const barTotal = items.filter(i => i.datasetIndex < 3).reduce((s, i) => s + i.raw, 0);
              return '━━━━━━━━━━━━\nรวม: ฿' + fmt(barTotal);
            }
          }
        },
        datalabels: {
          display: function(ctx) {
            // แสดงชื่อ Pin บน dataset welfare (index 2) เท่านั้น
            return ctx.datasetIndex === 2 && stackBorderWidths[ctx.dataIndex] > 0;
          },
          anchor: 'end', align: 'top',
          color: function(ctx) { return stackBorderColors[ctx.dataIndex]; },
          font: { weight: 'bold', size: 10 },
          formatter: function(v, ctx) {
            const idx = pinnedAgeMap[ages[ctx.dataIndex]];
            return idx !== undefined ? '📌' + PIN_COLORS[idx].name : '';
          }
        }
      }
    }
  });

  // NPV Chart — หลังหัก Opportunity Cost (เทียบเกษียณ 58)
  const npvRawData = []; // เก็บข้อมูลดิบสำหรับ tooltip
  const npvDiscountRate = 1 + (activeProfile.inflationRate || 2.5) / 100; // เงินเฟ้อเป็น discount rate
  const npvData = activeProfile.masterData.map(d => {
    const tempState = { ...STATE, retireYear: d.year, retireMonth: 6, packageOverride: 'auto', baseSalary: d.salary };
    const res = CALC.calcFullScenario(tempState);
    const yearsFromNow = d.year - CURRENT_YEAR_BE;
    const grossNPV = Math.round(res.netIncome / Math.pow(npvDiscountRate, Math.max(0, yearsFromNow)));
    // คำนวณ Opportunity Cost แล้วหัก
    const oc = CALC.calcOpportunityCost(d.age);
    const netNPV = grossNPV - oc.totalPV;
    npvRawData.push({ grossNPV, ocPV: oc.totalPV, netNPV, oc });
    return netNPV;
  });
  // สีแท่ง: บวก = เขียว/น้ำเงิน, ลบ = แดง | Pin = สี Pin | Cliff = เขียวเข้ม (dynamic)
  const npvCliff = CALC.findMainCliff();
  const npvCliffBefore = npvCliff ? npvCliff.beforeAge : null;
  const npvBgColors = ages.map((a, i) => {
    if (pinnedAgeMap.hasOwnProperty(a)) return PIN_COLORS[pinnedAgeMap[a]].bg;
    return npvData[i] >= 0 ? (a === npvCliffBefore ? '#10B981' : '#60A5FA') : '#EF4444';
  });
  const npvBorderWidths = ages.map(a => pinnedAgeMap.hasOwnProperty(a) ? 3 : 0);
  const npvBorderColors = ages.map(a => pinnedAgeMap.hasOwnProperty(a) ? PIN_COLORS[pinnedAgeMap[a]].bg : 'transparent');

  CHARTS.npv = new Chart(document.getElementById('npvChart'), {
    type: 'bar', data: { labels: ages.map(a => a + ''), datasets: [{ label: 'NPV หลังหัก OC', data: npvData,
      backgroundColor: npvBgColors, borderRadius: 6, borderWidth: npvBorderWidths, borderColor: npvBorderColors }] },
    options: { responsive: true, plugins: {
      legend: { display: true, labels: { generateLabels: function() {
        return [
          { text: 'NPV > 0 (คุ้มค่าออก)', fillStyle: '#60A5FA', strokeStyle: 'transparent', lineWidth: 0 },
          { text: 'NPV < 0 (ยังไม่คุ้ม)', fillStyle: '#EF4444', strokeStyle: 'transparent', lineWidth: 0 }
        ];
      }, font: { size: 10 } } },
      tooltip: { callbacks: { label: function(c) {
        const rd = npvRawData[c.dataIndex];
        return [
          'NPV สุทธิ: ฿' + fmt(c.raw),
          '  รายได้ (PV): ฿' + fmt(rd.grossNPV),
          '  หัก OC (PV): -฿' + fmt(rd.ocPV)
        ];
      } } },
      datalabels: { display: function(ctx) { return npvBorderWidths[ctx.dataIndex] > 0; }, anchor: 'end',
        align: function(ctx) { return npvData[ctx.dataIndex] >= 0 ? 'top' : 'bottom'; },
        color: function(ctx) { return npvBorderColors[ctx.dataIndex]; }, font: { weight: 'bold', size: 10 },
        formatter: function(v, ctx) { const idx = pinnedAgeMap[ages[ctx.dataIndex]]; return idx !== undefined ? '📌' + PIN_COLORS[idx].name : ''; } } },
      scales: { x: { grid: { display: false }, title: { display: true, text: 'อายุที่ออก' } },
        y: { ticks: { callback: v => '฿' + fmt(v) }, grid: { color: function(ctx) { const t = _tc(); return ctx.tick.value === 0 ? t.zeroLine : t.grid; }, lineWidth: function(ctx) { return ctx.tick.value === 0 ? 2 : 1; } } } } }
  });

  // Opportunity Cost Breakdown Card — แสดงรายละเอียดของ scenario ปัจจุบัน
  const currentAge = CALC.calcAge(STATE.retireYear, STATE.retireMonth || 6);
  const currentOC = CALC.calcOpportunityCost(currentAge);
  const ocCard = document.getElementById('ocBreakdownCard');
  const maxRetireAge = activeProfile.retireMaxAge || DEFAULT_PROFILE.retireMaxAge;
  if (currentOC.breakdown.length > 0) {
    const inflRate = activeProfile.inflationRate || 2.5;
    const adjYrs = activeProfile.welfareAdjustYears || 5;
    const adjPct = activeProfile.welfareAdjustPct || 2;
    const assumptions = '<div style="font-size:11px;color:#78716C;margin-top:6px;text-align:center">' +
      'สมมติฐาน: เงินเดือนโต ' + (activeProfile.salaryGrowthRate || 1.6) + '%/ปี | ' +
      'สวัสดิการปรับทุก ' + adjYrs + ' ปี +' + adjPct + '% | ' +
      'PVD ' + (activeProfile.pvdReturnRate || 3.5) + '%/ปี | ' +
      'เงินเฟ้อ ' + inflRate + '%</div>';
    ocCard.style.display = 'block';
    const tc2 = _tc();
    ocCard.innerHTML = '<div style="margin-top:12px;padding:12px;background:' + tc2.ocBg + ';border-radius:10px;border:1px solid ' + tc2.ocBorder + '">' +
      '<div style="font-weight:700;font-size:13px;color:' + tc2.ocTitle + ';margin-bottom:6px">⚠️ Opportunity Cost (ออกอายุ ' + currentAge + ' แทนเกษียณ ' + maxRetireAge + ')</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">' +
      '<div style="text-align:center;padding:8px;background:' + tc2.ocCellBg + ';border-radius:8px"><div style="color:' + tc2.textSub + '">เงินเดือนเสีย</div><div style="font-weight:700;color:#DC2626">฿' + fmt(currentOC.totalSalary) + '</div></div>' +
      '<div style="text-align:center;padding:8px;background:' + tc2.ocCellBg + ';border-radius:8px"><div style="color:' + tc2.textSub + '">สวัสดิการเสีย</div><div style="font-weight:700;color:#DC2626">฿' + fmt(currentOC.totalWelfare) + '</div></div>' +
      '<div style="text-align:center;padding:8px;background:' + tc2.ocCellBg + ';border-radius:8px"><div style="color:' + tc2.textSub + '">PVD สมทบเสีย</div><div style="font-weight:700;color:#DC2626">฿' + fmt(currentOC.totalPvd) + '</div></div>' +
      '</div>' +
      '<div style="text-align:center;margin-top:8px;font-size:14px;font-weight:700;color:' + tc2.ocTitle + '">รวม OC (PV @ ' + inflRate + '%): ฿' + fmt(currentOC.totalPV) + '</div>' +
      assumptions +
      '</div>';
  } else {
    ocCard.style.display = 'none';
  }

  // Break-even Chart — dynamic cliff จาก packageTiers (ไม่ hardcode อายุ)
  const beCliff = CALC.findMainCliff();
  const beCliffBefore = beCliff ? beCliff.beforeAge : null;
  const beCliffAfter = beCliff ? beCliff.afterAge : null;
  const beCliffRefTotal = beCliff
    ? (activeProfile.masterData.find(d => d.age === beCliffBefore) || {}).totalIncome || 0
    : 0;

  // อัพเดต title + tooltip ให้ dynamic
  const beTitle = document.getElementById('breakevenTitle');
  const beTooltip = document.getElementById('breakevenTooltip');
  if (beTitle && beCliff) {
    const infoSpan = beTitle.querySelector('.chart-info');
    beTitle.textContent = 'Break-even: หน้าผา ' + beCliffBefore + '→' + beCliffAfter;
    if (infoSpan) beTitle.appendChild(infoSpan);
    if (beTooltip) beTooltip.textContent = 'จุด Break-even: ถ้าลาออกอายุ ' + beCliffAfter +
      ' (แพคเกจ ' + beCliff.afterMonths + ' เดือน) ต้องทำงานต่อกี่ปีถึงจะได้เงินสะสมเท่ากับลาออกอายุ ' +
      beCliffBefore + ' (แพคเกจ ' + beCliff.beforeMonths + ' เดือน)?';
  } else if (beTitle && !beCliff) {
    const infoSpan = beTitle.querySelector('.chart-info');
    beTitle.textContent = 'Break-even: รายได้สะสม';
    if (infoSpan) beTitle.appendChild(infoSpan);
  }

  const breakevenDatasets = [
    { label: 'Total Income', data: activeProfile.masterData.map(d => d.totalIncome), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3, borderWidth: 3,
      pointRadius: ages.map(a => {
        if (pinnedAgeMap.hasOwnProperty(a)) return 10;
        return (a === beCliffBefore || a === beCliffAfter) ? 8 : 4;
      }),
      pointBackgroundColor: ages.map(a => {
        if (pinnedAgeMap.hasOwnProperty(a)) return PIN_COLORS[pinnedAgeMap[a]].bg;
        return a === beCliffBefore ? '#10B981' : a === beCliffAfter ? '#EF4444' : '#2563EB';
      }),
      pointBorderWidth: ages.map(a => pinnedAgeMap.hasOwnProperty(a) ? 3 : 1),
      pointBorderColor: ages.map(a => pinnedAgeMap.hasOwnProperty(a) ? '#fff' : '#2563EB')
    },
    // เส้น reference แสดงเฉพาะเมื่อมี cliff (ใช้ spread operator)
    ...(beCliff ? [{ label: 'ระดับอายุ ' + beCliffBefore, data: activeProfile.masterData.map(() => beCliffRefTotal), borderColor: '#F59E0B', borderDash: [8, 4], pointRadius: 0, borderWidth: 2, fill: false }] : [])
  ];

  CHARTS.breakeven = new Chart(document.getElementById('breakevenChart'), {
    type: 'line', data: { labels: ages.map(a => a + ''), datasets: breakevenDatasets },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } },
      tooltip: { callbacks: { label: c => c.dataset.label + ': ฿' + fmt(c.raw) } }, datalabels: { display: false } },
      scales: { x: { grid: { display: false }, title: { display: true, text: 'อายุ' } }, y: { ticks: { callback: v => '฿' + fmt(v) }, grid: { color: function() { return _tc().grid; } } } } }
  });

  // Decision Table — ใช้ calcDecisionScores() ฟังก์ชันกลาง (ไม่ duplicate logic)
  const dt = document.getElementById('decisionTable');
  if (!mdArr.length || !activeProfile.salary) {
    dt.innerHTML = '<tr><td class="center" style="padding:20px;color:' + _tc().textSub + '">กรุณากรอกข้อมูลก่อน</td></tr>';
  } else {
    const allScores = CALC.calcDecisionScores(mdArr);
    if (allScores.length === 0) {
      dt.innerHTML = '<tr><td class="center" style="padding:20px;color:' + _tc().textSub + '">ไม่มีข้อมูลอายุที่แสดง</td></tr>';
    } else {
      const dtAges = allScores.map(s => s.age);
      const criteria = allScores[0].criteria; // criteria เหมือนกันทุก entry
      const totals = allScores.map(s => s.score);
      // หาอายุที่คะแนนรวมสูงสุด
      const bestScore = Math.max(...totals);
      const bestIdx = totals.indexOf(bestScore);

      // Header — highlight อายุที่ดีที่สุดด้วยสีเขียวเข้ม
      let dtHtml = '<tr><th>เกณฑ์ (น้ำหนัก)</th>';
      dtAges.forEach((a, i) => {
        const pinIdx = pinnedAgeMap[a];
        const pinBadge = pinIdx !== undefined ? ' 📌' + PIN_COLORS[pinIdx].name : '';
        const isBest = i === bestIdx;
        let headerStyle = '';
        if (isBest) headerStyle = 'background:#065F46;color:#fff;font-weight:bold';
        else if (pinIdx !== undefined) headerStyle = 'background:' + PIN_COLORS[pinIdx].bg + ';color:#fff';
        const pkgM = allScores[i].pkg;
        dtHtml += `<th class="center" style="${headerStyle}">อายุ ${a} (${pkgM}M)${pinBadge}${isBest ? ' 🏆' : ''}</th>`;
      });
      dtHtml += '</tr>';
      // แถว criteria — แต่ละเกณฑ์ + highlight คอลัมน์ best
      const tc3 = _tc();
      criteria.forEach(c => {
        dtHtml += `<tr><td><strong>${c.name}</strong> (${c.weight}%)</td>`;
        c.scores.forEach((s, i) => {
          const pinIdx = pinnedAgeMap[dtAges[i]];
          const isBest = i === bestIdx;
          let bg = s >= 80 ? tc3.score80 : s >= 60 ? tc3.score60 : s >= 40 ? tc3.score40 : tc3.scoreRed;
          let border = '';
          if (isBest) border = 'border-left:3px solid #065F46;border-right:3px solid #065F46';
          else if (pinIdx !== undefined) border = 'border-left:3px solid ' + PIN_COLORS[pinIdx].bg + ';border-right:3px solid ' + PIN_COLORS[pinIdx].bg;
          dtHtml += `<td class="center bold" style="background:${bg};${border}">${s}</td>`;
        });
        dtHtml += '</tr>';
      });
      // แถวคะแนนรวม — highlight best ด้วยสีเขียวสว่าง
      dtHtml += `<tr style="background:${tc3.headerBg};color:#F59E0B"><td class="bold">คะแนนรวม</td>`;
      totals.forEach((t, i) => {
        const pinIdx = pinnedAgeMap[dtAges[i]];
        const isBest = i === bestIdx;
        let style = '';
        if (isBest) style = 'border-left:3px solid #10B981;border-right:3px solid #10B981;color:#10B981;font-size:16px';
        else if (pinIdx !== undefined) style = 'border-left:3px solid ' + PIN_COLORS[pinIdx].bg + ';border-right:3px solid ' + PIN_COLORS[pinIdx].bg;
        dtHtml += `<td class="center bold" style="${style}">${t.toFixed(1)}${isBest ? ' 🏆' : ''}</td>`;
      });
      dtHtml += '</tr>';
      dt.innerHTML = dtHtml;
    }
  }
}
