// ============================================================
// MAIN.JS — Entry Point สำหรับ Vite
// นำเข้าทุกโมดูลและผูกฟังก์ชันเข้า window สำหรับ onclick handlers
// ============================================================

// === CSS Import (Vite จัดการให้) ===
import './styles.css';

// === Config ===
import { CURRENT_YEAR_BE, CONFIG, DEFAULT_PROFILE, PIN_COLORS, TAB_NAMES } from './config.js';

// === State ===
import {
  activeProfile, setActiveProfile, STATE, PINNED, setPINNED, CHARTS,
  showNet, readState, buildRetireYearOptions, destroyAllCharts, setCalcRef,
  tab2Init, setTab2Init, tab3Init, setTab3Init,
  tab4Init, setTab4Init, tab5Init, setTab5Init,
  pendingUpdate, setPendingUpdate, currentZoom
} from './state.js';

// === Calc ===
import { CALC } from './calc.js';

// === Utils ===
import {
  fmt, getNumericValue, setNumericValue, setupCommaFormatting,
  showToast, showAbout, hideAbout, showWelcome, closeWelcome,
  changeZoom, applyZoom
} from './utils.js';

// === UI Modules ===
import { updateDashboard } from './ui/dashboard.js';
import { updateCharts } from './ui/charts-tab2.js';
import { updateTab1 } from './ui/tab3-tax.js';
import { initTab2, toggleGrossNet } from './ui/tab4-overview.js';
import { initTab3, loadFromHeatmap } from './ui/tab5-heatmap.js';
import { initTab4 } from './ui/tab6-strategy.js';
import { initTab5 } from './ui/tab7-legal.js';

// === Profile ===
import {
  applyProfileToUI, autoLoadActiveProfile, autoSaveActiveProfile,
  generateMasterData, readProfileFromUI, updateWelfareTotal,
  saveProfile, loadProfile, smartLoad, deleteProfile,
  exportProfile, importProfile, renderPackageTiersTable,
  updateProfileDropdown, addPkgTier, removePkgTier, updatePkgTier,
  saveSnapshot, renderSnapshots, loadSnapshot, exportSnapshot,
  deleteSnapshot, clearSnapshots, prepareProfileForSave, restoreProfileInfinity
} from './profile.js';

// === PDF ===
import { exportPDF } from './pdf.js';

// ============================================================
// Wire up late-bound CALC reference (แก้ circular dep)
// ============================================================
setCalcRef(CALC);

// ============================================================
// Main Functions — switchTab, onInputChange, Pin, Reset
// ============================================================

// สลับ Tab (Lazy init)
function switchTab(idx) {
  document.querySelectorAll('.main-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
  // Lazy init
  if (idx === 1) { updateProfileDropdown(); renderPackageTiersTable(); }
  if (idx === 2) { readState(); updateDashboard(CALC.calcFullScenario(STATE)); }
  if (idx === 3) { readState(); updateTab1(CALC.calcFullScenario(STATE)); }
  if (idx === 4) initTab2();
  if (idx === 5) initTab3();
  if (idx === 6) initTab4();
  if (idx === 7) initTab5();
}

// เปิด/ปิด section (accordion)
function toggleSection(id) {
  document.getElementById(id).classList.toggle('collapsed');
}

// อัพเดต Dashboard เมื่อ input เปลี่ยน (debounced ด้วย requestAnimationFrame)
function onInputChange() {
  if (!pendingUpdate) {
    setPendingUpdate(true);
    requestAnimationFrame(() => {
      readState();
      const results = CALC.calcFullScenario(STATE);
      updateDashboard(results);
      setPendingUpdate(false);
    });
  }
}

// ============================================================
// onPinChange() — Refresh ทุก Tab เมื่อ pin เปลี่ยน
// ============================================================
function onPinChange() {
  // 1) Refresh Tab 2 (Simulator) — dashboard + กราฟ income/waterfall
  onInputChange();

  // 2) Tab 3 (รายละเอียดภาษี, idx=3) — ไม่มี init flag, updateTab1 + updateStepChart
  //    ล้าง step charts เก่า เพื่อให้สร้างใหม่แบบ grouped bar
  ['lumpStep','salaryStep'].forEach(k => {
    if (CHARTS[k] && typeof CHARTS[k].destroy === 'function') { CHARTS[k].destroy(); delete CHARTS[k]; }
  });
  // ถ้า Tab 3 active อยู่ → refresh ทันที
  const activeIdx = [...document.querySelectorAll('.main-tab')].findIndex(t => t.classList.contains('active'));
  if (activeIdx === 3) {
    readState();
    updateTab1(CALC.calcFullScenario(STATE));
  }

  // 3) Tab 4 (ภาพรวมทุกอายุ, idx=4) — reset init + destroy charts
  if (tab2Init) {
    ['pkgCliff','totalWealth','yoy'].forEach(k => {
      if (CHARTS[k] && typeof CHARTS[k].destroy === 'function') { CHARTS[k].destroy(); delete CHARTS[k]; }
    });
    setTab2Init(false);
    if (activeIdx === 4) initTab2();
  }

  // 4) Tab 5 (Heatmap, idx=5) — reset init (ไม่มี chart, แค่ตาราง)
  if (tab3Init) {
    setTab3Init(false);
    if (activeIdx === 5) initTab3();
  }

  // 5) Tab 6 (กลยุทธ์ & NPV, idx=6) — reset init + destroy charts
  if (tab4Init) {
    ['npv','breakeven'].forEach(k => {
      if (CHARTS[k] && typeof CHARTS[k].destroy === 'function') { CHARTS[k].destroy(); delete CHARTS[k]; }
    });
    setTab4Init(false);
    if (activeIdx === 6) initTab4();
  }
}

// ============================================================
// Pin Functions — บันทึก/ลบ/โหลด Pinned Scenarios
// ============================================================
function pinScenario() {
  if (PINNED.length >= 3) {
    showToast('Pin ได้สูงสุด 3 scenarios — ลบอันเก่าก่อน');
    return;
  }
  readState();
  const scenario = CALC.calcFullScenario(STATE);
  // ตรวจซ้ำ — ถ้า label เดียวกัน ไม่ pin ซ้ำ
  if (PINNED.some(p => p.label === scenario.label)) {
    showToast('Scenario นี้ pin อยู่แล้ว');
    return;
  }
  PINNED.push(scenario);
  updatePinBar();
  updatePinButton();
  onPinChange(); // ← refresh ทุก Tab
  showToast('Pin scenario #' + PINNED.length + ': ' + scenario.label);
}

function removePin(index) {
  PINNED.splice(index, 1);
  updatePinBar();
  updatePinButton();
  onPinChange(); // ← refresh ทุก Tab
  showToast('ลบ Pin แล้ว (เหลือ ' + PINNED.length + ')');
}

function clearAllPins() {
  PINNED.length = 0; // ใช้ mutation แทน re-assign (ES module)
  updatePinBar();
  updatePinButton();
  onPinChange(); // ← refresh ทุก Tab
  showToast('ลบ Pin ทั้งหมดแล้ว');
}

function updatePinBar() {
  const bar = document.getElementById('pinBar');
  if (PINNED.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  let chipsHtml = '';
  PINNED.forEach((p, i) => {
    const c = PIN_COLORS[i];
    // chip body จิ้มได้ → โหลด scenario (ปี+เดือน) | ปุ่ม × → ลบ pin
    chipsHtml += '<span class="pin-chip" style="background:' + c.bg + ';cursor:pointer" ' +
      'onclick="loadPinScenario(' + i + ')" title="คลิกเพื่อโหลด scenario นี้">' +
      c.name + ': ' + p.label + ' | ฿' + fmt(p.netIncome) +
      ' <span class="pin-remove" onclick="event.stopPropagation();removePin(' + i + ')" title="ลบ Pin ' + c.name + '">&times;</span>' +
      '</span>';
  });
  document.getElementById('pinChips').innerHTML = chipsHtml;
}

// โหลด scenario จาก Pin chip → set ปี+เดือนลาออก กลับขึ้น Control Panel
function loadPinScenario(index) {
  const p = PINNED[index];
  if (!p) return;
  const c = PIN_COLORS[index];
  // Set ปีลาออก
  document.getElementById('retireYear').value = p.retireYear;
  // Set เดือนลาออก
  document.getElementById('retireMonth').value = p.retireMonth;
  // อัพเดต Dashboard + กราฟทันที
  onInputChange();
  showToast('โหลด Pin ' + c.name + ': ' + p.monthLabel);
}

function updatePinButton() {
  const btn = document.querySelector('[onclick="pinScenario()"]');
  if (!btn) return;
  if (PINNED.length >= 3) {
    btn.disabled = true;
    btn.textContent = '📌 Pin เต็ม (3/3)';
    btn.style.opacity = '0.5';
  } else {
    btn.disabled = false;
    btn.textContent = '📌 Pin Scenario (' + PINNED.length + '/3)';
    btn.style.opacity = '1';
  }
}

// ============================================================
// Dark Mode Toggle — สลับ Light/Dark + จำค่าใน localStorage
// ============================================================
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('earlyRetireTheme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  // Re-render charts ด้วยสี theme ใหม่ (ถ้า Tab ที่ active มี chart)
  const activeIdx = [...document.querySelectorAll('.main-tab')]
    .findIndex(t => t.classList.contains('active'));
  if (activeIdx >= 2) {
    destroyAllCharts();
    setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
    switchTab(activeIdx);
  }
}

// ============================================================
// resetDefaults — ล้างข้อมูลทั้งหมด กลับค่าเริ่มต้น
// ============================================================
function resetDefaults() {
  // Reset activeProfile กลับเป็นค่าว่าง (DEFAULT_PROFILE)
  setActiveProfile(JSON.parse(JSON.stringify(DEFAULT_PROFILE)));
  applyProfileToUI();
  // สร้าง retireYear dropdown ใหม่จาก DEFAULT birthYear/retireMaxAge ก่อน set ค่า
  buildRetireYearOptions(CURRENT_YEAR_BE);
  // Reset simulator controls
  document.getElementById('retireYear').value = String(CURRENT_YEAR_BE);
  document.getElementById('retireMonth').value = 6;
  document.getElementById('packageMonths').value = 'auto';
  document.getElementById('exempt600k').checked = true;
  document.getElementById('pvdHandling').value = 'rmf';
  // baseSalary จะ auto-calculate ใน readState() ตามปีลาออก
  document.getElementById('bonusMid').checked = true;
  document.getElementById('bonusMidMult').value = 1.3;
  document.getElementById('bonusEnd').checked = true;
  document.getElementById('bonusEndMult').value = 1.3;
  setNumericValue('dedPersonal', 60000);
  document.getElementById('dedParents').value = 30000;
  setNumericValue('dedLifeIns', 100000);
  setNumericValue('dedAnnuity', 155000);
  document.getElementById('dedPvdRate').value = 5;
  setNumericValue('dedRmf', 0);
  setNumericValue('dedEsg', 0);
  const ssEl = document.getElementById('dedSS');
  ssEl.value = CALC.getSocialSecurity(CURRENT_YEAR_BE);
  ssEl.dataset.overridden = '';
  autoSaveActiveProfile();
  // คำนวณ masterData ใหม่จาก input (ไม่ใช้ hardcoded ของ DEFAULT_PROFILE)
  activeProfile.masterData = generateMasterData();
  // Reset tab init flags + ล้าง Charts เก่า
  destroyAllCharts();
  setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
  // ล้าง Pinned Scenarios (ข้อมูลเก่าอาจเป็นความลับ — ไม่ควรค้าง)
  PINNED.length = 0;
  updatePinBar();
  updatePinButton();
  // ล้าง Snapshot history จาก localStorage
  localStorage.removeItem('earlyRetireSnapshots');
  renderSnapshots();
  onInputChange();
  showToast('🧹 ล้างข้อมูลทั้งหมดแล้ว — เริ่มใส่ข้อมูลใหม่ได้เลย');
}

// ============================================================
// Expose ALL functions to window สำหรับ HTML onclick handlers
// ============================================================
window.switchTab = switchTab;
window.toggleSection = toggleSection;
window.onInputChange = onInputChange;
window.onPinChange = onPinChange;
window.pinScenario = pinScenario;
window.removePin = removePin;
window.clearAllPins = clearAllPins;
window.updatePinBar = updatePinBar;
window.loadPinScenario = loadPinScenario;
window.updatePinButton = updatePinButton;
window.resetDefaults = resetDefaults;
window.toggleDarkMode = toggleDarkMode;
window.changeZoom = changeZoom;
window.showAbout = showAbout;
window.hideAbout = hideAbout;
window.showWelcome = showWelcome;
window.closeWelcome = closeWelcome;
window.exportPDF = exportPDF;
window.saveProfile = saveProfile;
window.loadProfile = loadProfile;
window.smartLoad = smartLoad;
window.deleteProfile = deleteProfile;
window.exportProfile = exportProfile;
window.importProfile = importProfile;
window.readProfileFromUI = readProfileFromUI;
window.toggleGrossNet = toggleGrossNet;
window.loadFromHeatmap = loadFromHeatmap;
window.renderPackageTiersTable = renderPackageTiersTable;
window.updatePkgTier = updatePkgTier;
window.addPkgTier = addPkgTier;
window.removePkgTier = removePkgTier;
window.saveSnapshot = saveSnapshot;
window.loadSnapshot = loadSnapshot;
window.exportSnapshot = exportSnapshot;
window.deleteSnapshot = deleteSnapshot;
window.clearSnapshots = clearSnapshots;
window.updateWelfareTotal = updateWelfareTotal;
window.initTab2 = initTab2;
window.initTab3 = initTab3;
window.initTab4 = initTab4;
window.initTab5 = initTab5;
// Helper สำหรับ PDF export: re-draw income/tax charts ใน theme ปัจจุบัน
// เรียกขณะที่ panel นั้น visible เพื่อให้ Chart.js ได้ขนาด canvas ที่ถูกต้อง
window.reDrawChartsForPanel = function(panelIdx) {
  readState();
  const r = CALC.calcFullScenario(STATE);
  if (panelIdx === 2) updateCharts(r);
  if (panelIdx === 3) updateTab1(r);
};

// ============================================================
// เริ่มต้น — Initialization
// ============================================================
// Disable datalabels globally (เปิดเฉพาะกราฟที่ต้องการ)
Chart.defaults.plugins.datalabels = { display: false };
// โหลดระดับ zoom ที่บันทึกไว้
applyZoom();
// โหลด Dark Mode จาก localStorage
if (localStorage.getItem('earlyRetireTheme') === 'dark') {
  document.body.classList.add('dark');
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.textContent = '☀️';
}
// โหลด activeProfile จาก localStorage (ถ้ามี) หรือใช้ดีฟอลต์
autoLoadActiveProfile();
// อัพเดต Pin Bar จาก Pinned ที่โหลดมา
updatePinBar();
updatePinButton();
applyProfileToUI();
// สร้าง retireYear dropdown แบบ dynamic จาก birthYear
buildRetireYearOptions();
// Generate masterData จาก input (ไม่ใช้ hardcode)
activeProfile.masterData = generateMasterData();
// baseSalary จะ auto-calculate ใน readState() ตามปีลาออก (ไม่ต้อง set เอง)
// อัพเดตประกันสังคมตามปีดีฟอลต์
const ssInitEl = document.getElementById('dedSS');
ssInitEl.value = CALC.getSocialSecurity(parseInt(document.getElementById('retireYear').value));
ssInitEl.dataset.overridden = '';
// เปิดใช้ comma formatting สำหรับ input ที่กำหนด
setupCommaFormatting();
// แสดง Snapshot Timeline ที่บันทึกไว้ (ถ้ามี)
renderSnapshots();
onInputChange();
// แสดง Welcome Modal (ถ้ายังไม่เคยเห็น)
showWelcome();
