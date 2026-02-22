// ============================================================
// กราฟ Tab 0 (Dashboard) — Income Chart + Tax Waterfall
// ============================================================
import { CHARTS, PINNED } from '../state.js';
import { PIN_COLORS } from '../config.js';
import { fmt } from '../utils.js';

export function updateCharts(r) {
  updateIncomeChart(r);
  updateTaxWaterfallChart(r);
}

// helper สีตาม theme (ใช้ใน function นี้)
function _themeColors() {
  const isDark = document.body.classList.contains('dark');
  return {
    grid: isDark ? '#334155' : '#E2E8F0',
    label: isDark ? '#E2E8F0' : '#1E293B',
    labelBlue: isDark ? '#93C5FD' : '#1E40AF',
    labelRed: isDark ? '#fca5a5' : '#991B1B',
  };
}

export function updateIncomeChart(r) {
  const categories = ['เงินเดือน', 'โบนัส', 'Early Merit', 'ชดเชยกฎหมาย'];
  const currentData = [r.salaryIncome.salaryTotal, r.salaryIncome.bonusMidAmt + r.salaryIncome.bonusEndAmt, r.earlyMerit, r.severanceAmt];

  // ===== โหมดเปรียบเทียบ: Grouped Bar เมื่อมี Pin =====
  if (PINNED.length > 0) {
    // ต้อง destroy chart เก่าถ้าเป็น doughnut (เพราะ Chart.js ไม่ให้เปลี่ยน type)
    if (CHARTS.income) { CHARTS.income.destroy(); CHARTS.income = null; }

    // สร้าง datasets — เฉพาะ Pin A/B/C (ไม่มี "ปัจจุบัน")
    const datasets = [];
    PINNED.forEach((p, i) => {
      const c = PIN_COLORS[i];
      datasets.push({
        label: c.name + ': ' + p.label,
        data: [p.salaryIncome.salaryTotal, p.salaryIncome.bonusMidAmt + p.salaryIncome.bonusEndAmt, p.earlyMerit, p.severanceAmt],
        backgroundColor: c.bg + 'CC',
        borderColor: c.bg,
        borderWidth: 2,
        borderRadius: 4
      });
    });

    CHARTS.income = new Chart(document.getElementById('incomeChart'), {
      type: 'bar',
      data: { labels: categories, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } },
          tooltip: { callbacks: { label: c => c.dataset.label + ': ฿' + fmt(c.raw) } },
          datalabels: {
            display: function(ctx) { return ctx.dataset.data[ctx.dataIndex] > 0; },
            anchor: 'end', align: 'top', offset: 2,
            color: function() { return _themeColors().label; }, font: { weight: 'bold', size: 10 },
            formatter: function(v) { return v >= 1000000 ? '฿' + (v/1000000).toFixed(1) + 'M' : '฿' + fmt(v); }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { ticks: { callback: v => '฿' + fmt(v) }, grid: { color: function() { return _themeColors().grid; } } }
        }
      }
    });
    return;
  }

  // ===== โหมดปกติ: Doughnut =====
  const data = currentData;
  const labels = categories;
  const colors = ['#60A5FA', '#F59E0B', '#10B981', '#A78BFA'];
  const total = data.reduce((a, b) => a + b, 0);

  // ถ้า chart เก่าไม่ใช่ doughnut → destroy ก่อน
  if (CHARTS.income && CHARTS.income.config.type !== 'doughnut') { CHARTS.income.destroy(); CHARTS.income = null; }

  if (!CHARTS.income) {
    CHARTS.income = new Chart(document.getElementById('incomeChart'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        tooltip: { callbacks: { label: c => c.label + ': ฿' + fmt(c.raw) + ' (' + (c.raw / total * 100).toFixed(1) + '%)' } },
        datalabels: {
          display: function(ctx) { return ctx.dataset.data[ctx.dataIndex] / total > 0.03; },
          color: '#fff', font: { weight: 'bold', size: 11 }, textAlign: 'center',
          formatter: function(value, ctx) {
            const pct = (value / total * 100).toFixed(0);
            const label = ctx.chart.data.labels[ctx.dataIndex];
            const amt = value >= 1000000 ? '฿' + (value / 1000000).toFixed(1) + 'M' : '฿' + fmt(value);
            return label + '\n' + amt + ' (' + pct + '%)';
          }
        }
      }}
    });
  } else {
    CHARTS.income.data.datasets[0].data = data;
    const newTotal = data.reduce((a, b) => a + b, 0);
    CHARTS.income.options.plugins.datalabels.display = function(ctx) { return ctx.dataset.data[ctx.dataIndex] / newTotal > 0.03; };
    CHARTS.income.options.plugins.datalabels.formatter = function(value, ctx) {
      const pct = (value / newTotal * 100).toFixed(0);
      const label = ctx.chart.data.labels[ctx.dataIndex];
      const amt = value >= 1000000 ? '฿' + (value / 1000000).toFixed(1) + 'M' : '฿' + fmt(value);
      return label + '\n' + amt + ' (' + pct + '%)';
    };
    CHARTS.income.update();
  }
}

export function updateTaxWaterfallChart(r) {
  // แบ่ง 2 ส่วน: รายได้ & การหักลด (บน) + ภาษีที่ต้องจ่าย (ล่าง)
  const labels = [
    '💰 เงินก้อนรวม', '  ↳ ยกเว้น 600K', '  ↳ หักอายุงาน', '  ↳ หัก 50%', '  ➤ เงินได้สุทธิ(ก้อน)',
    '───── ภาษี ─────',
    '🔴 ภาษีเงินก้อน', '🔴 ภาษีเงินเดือน',
    r.pvdTax.tax > 0 ? '🔴 ภาษี PVD' : null,
    '⬛ ภาษีรวม'
  ].filter(Boolean);

  const rawData = [
    r.earlyTotal, -r.lumpTax.exemption, -r.lumpTax.yearsDeduction, -r.lumpTax.halfDeduction, r.lumpTax.netForTax,
    0,
    r.lumpTax.tax, r.salaryTax.tax,
    r.pvdTax.tax > 0 ? r.pvdTax.tax : null,
    r.totalTax
  ].filter(v => v !== null);

  // ===== เพิ่มแถวเปรียบเทียบ Pin ด้านล่าง =====
  if (PINNED.length > 0) {
    labels.push('═══ เปรียบเทียบ ═══');
    rawData.push(0);
    PINNED.forEach((p, i) => {
      const c = PIN_COLORS[i];
      labels.push(c.name + ': ภาษีรวม (' + p.label + ')');
      rawData.push(p.totalTax);
    });
  }

  const sepIdx = 5; // ตำแหน่ง separator แรก
  const cmpSepIdx = PINNED.length > 0 ? labels.indexOf('═══ เปรียบเทียบ ═══') : -1;

  const colors = rawData.map((v, i) => {
    if (i === sepIdx || i === cmpSepIdx) return 'rgba(0,0,0,0)'; // separator
    if (i === 0) return '#60A5FA';
    if (i >= 1 && i <= 3) return '#10B981';
    if (i === 4) return '#2563EB';
    // ส่วนเปรียบเทียบ Pin
    if (cmpSepIdx > 0 && i > cmpSepIdx) {
      const pinIdx = i - cmpSepIdx - 1; // 0, 1, 2, ...
      if (pinIdx < PINNED.length) return PIN_COLORS[pinIdx].bg;
    }
    return '#EF4444';
  });

  const chartData = rawData.map(Math.abs);

  // ต้อง destroy + สร้างใหม่เสมอเพราะจำนวน labels เปลี่ยน
  if (CHARTS.waterfall) { CHARTS.waterfall.destroy(); CHARTS.waterfall = null; }

  CHARTS.waterfall = new Chart(document.getElementById('taxWaterfallChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data: chartData, backgroundColor: colors, borderRadius: 4, borderSkipped: false }] },
    options: { responsive: true, indexAxis: 'y', plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => rawData[c.dataIndex] === 0 ? '' : '฿' + fmt(Math.abs(rawData[c.dataIndex])) },
        filter: c => rawData[c.dataIndex] !== 0
      },
      datalabels: {
        display: function(ctx) { return rawData[ctx.dataIndex] !== 0; },
        anchor: 'end', align: 'end', offset: 4,
        color: function(ctx) {
          const tc = _themeColors();
          const i = ctx.dataIndex;
          if (cmpSepIdx > 0 && i > cmpSepIdx) return tc.label;
          return i >= 6 ? tc.labelRed : tc.labelBlue;
        },
        font: { weight: 'bold', size: 11 },
        formatter: function(value, ctx) {
          const raw = rawData[ctx.dataIndex];
          return (raw < 0 ? '-' : '') + '฿' + fmt(Math.abs(raw));
        }
      }
    }, scales: {
      x: { ticks: { callback: v => '฿' + fmt(v) }, grid: { color: function() { return _themeColors().grid; } }, max: Math.max(...chartData) * 1.25 },
      y: { grid: { display: false }, ticks: { font: function(ctx) {
        const isSep = ctx.index === sepIdx || ctx.index === cmpSepIdx;
        return { weight: isSep ? 'bold' : 'normal', size: isSep ? 10 : 12 };
      } } }
    } }
  });
}
