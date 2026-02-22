// ============================================================
// STATE — ค่าที่ผู้ใช้ปรับ + Shared Mutable State
// ============================================================
import { CURRENT_YEAR_BE, DEFAULT_PROFILE } from './config.js';

// === Mutable State ===
export let activeProfile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
export let STATE = {};
export let PINNED = [];
export const CHARTS = {};

// Tab init flags — ติดตามว่า Tab ไหน init แล้ว
export let tab2Init = false;
export let tab3Init = false;
export let tab4Init = false;
export let tab5Init = false;

// Gross/Net toggle state
export let showNet = { tab2: false, tab4: false };

// Pending update flag
export let pendingUpdate = false;

// Zoom state — อ่านจาก localStorage
export let currentZoom = parseInt(localStorage.getItem('earlyRetireZoom') || '100');

// === Setter Functions (ES modules ต้องใช้ setter เพราะ re-assign exported let ตรงๆ ไม่ได้) ===
export function setActiveProfile(p) { activeProfile = p; }
export function setSTATE(s) { STATE = s; }
export function setPINNED(arr) { PINNED = arr; }
export function setTab2Init(v) { tab2Init = v; }
export function setTab3Init(v) { tab3Init = v; }
export function setTab4Init(v) { tab4Init = v; }
export function setTab5Init(v) { tab5Init = v; }
export function setPendingUpdate(v) { pendingUpdate = v; }
export function setCurrentZoom(v) { currentZoom = v; }

// === Late-bound CALC reference (แก้ circular dep: ใช้ late-bound reference) ===
let _CALC = null;
export function setCalcRef(calc) { _CALC = calc; }

// === Helper functions ภายใน (inline เพื่อหลีกเลี่ยง circular import กับ utils) ===
function _getNumericValue(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(String(el.value).replace(/,/g, '')) || 0;
}

function _setNumericValue(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.dataset.formatComma === 'true') {
    el.value = new Intl.NumberFormat('th-TH').format(Math.round(val));
  } else {
    el.value = val;
  }
}

// === readState — อ่านค่าจาก DOM ลง STATE ===
export function readState() {
  const retireYear = parseInt(document.getElementById('retireYear').value);
  // ประกันสังคม: auto ตามปี หรือ override
  const ssEl = document.getElementById('dedSS');
  // แก้ circular dep: ใช้ late-bound reference แทน CALC ตรงๆ
  const ssAuto = _CALC.getSocialSecurity(retireYear);
  // ถ้ายังเป็นค่า auto (ไม่ได้แก้เอง) → อัพเดตตาม
  if (!ssEl.dataset.overridden) ssEl.value = ssAuto;
  // อัพเดต label แสดงค่า auto ประกันสังคม + ปี
  const ssAutoLabel = document.getElementById('ssAutoLabel');
  if (ssAutoLabel) ssAutoLabel.textContent = 'Auto: ' + ssAuto + ' ฿/เดือน (ปี ' + retireYear + ')';

  // Auto-calculate baseSalary ตามปีลาออก (เงินเดือนปัจจุบัน × อัตราขึ้นเงินเดือน)
  const yearsFromNow = retireYear - CURRENT_YEAR_BE;
  const growthRate = (activeProfile.salaryGrowthRate || 1.6) / 100;
  const autoSalary = Math.round((activeProfile.salary || 0) * Math.pow(1 + growthRate, Math.max(0, yearsFromNow)));
  _setNumericValue('baseSalary', autoSalary);

  STATE = {
    retireYear,
    retireMonth: parseInt(document.getElementById('retireMonth').value),
    packageOverride: document.getElementById('packageMonths').value,
    exempt600k: document.getElementById('exempt600k').checked,
    pvdHandling: document.getElementById('pvdHandling').value,
    baseSalary: autoSalary || activeProfile.salary,
    bonusMid: document.getElementById('bonusMid').checked,
    bonusMidMult: parseFloat(document.getElementById('bonusMidMult').value) || 1.3,
    bonusEnd: document.getElementById('bonusEnd').checked,
    bonusEndMult: parseFloat(document.getElementById('bonusEndMult').value) || 1.3,
    dedPersonal: _getNumericValue('dedPersonal') || 60000,
    dedParents: parseFloat(document.getElementById('dedParents').value) || 30000,
    dedLifeIns: _getNumericValue('dedLifeIns') || 0,
    dedAnnuity: _getNumericValue('dedAnnuity') || 0,
    dedPvdRate: parseFloat(document.getElementById('dedPvdRate').value) || 5,
    dedRmf: _getNumericValue('dedRmf') || 0,
    dedEsg: _getNumericValue('dedEsg') || 0,
    dedSS: parseFloat(ssEl.value) || ssAuto,
  };
}

// === สร้าง retireYear dropdown options แบบ dynamic จาก birthYear ===
export function buildRetireYearOptions(selectedYear) {
  const sel = document.getElementById('retireYear');
  if (!sel) return;
  const birthYear = activeProfile.birthYear || 2530;
  const maxAge = activeProfile.retireMaxAge || DEFAULT_PROFILE.retireMaxAge;
  // เริ่มตั้งแต่ปีปัจจุบัน - 2 ถึง birthYear + maxAge + 1
  const startYear = CURRENT_YEAR_BE - 2;
  const endYear = birthYear + maxAge + 1;
  const currentAge = CURRENT_YEAR_BE - birthYear;
  // เก็บค่าเดิมไว้ (ถ้ามี)
  const prevVal = selectedYear || sel.value || String(CURRENT_YEAR_BE);
  sel.innerHTML = '';
  for (let yr = startYear; yr <= endYear; yr++) {
    const age = yr - birthYear;
    if (age < currentAge - 2) continue; // ข้ามอายุที่ผ่านไปแล้วเกิน 2 ปี
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr + ' (อายุ ' + age + ')';
    if (String(yr) === String(prevVal)) opt.selected = true;
    sel.appendChild(opt);
  }
  // ถ้าค่าเดิมไม่อยู่ใน range → เลือกปีปัจจุบัน
  if (!sel.value || sel.value !== String(prevVal)) {
    sel.value = String(CURRENT_YEAR_BE);
  }
}

// ============================================================
// ล้าง Charts เก่าทั้งหมด (ก่อน re-init)
// ============================================================
export function destroyAllCharts() {
  // ล้าง Charts ที่อยู่นอก Tab 0 (income, waterfall อยู่ใน Tab 2 — ล้างหมดเลย)
  Object.keys(CHARTS).forEach(key => {
    if (CHARTS[key] && typeof CHARTS[key].destroy === 'function') {
      CHARTS[key].destroy();
    }
    delete CHARTS[key];
  });
  // ล้าง flag tax calc เพื่อให้คำนวณใหม่เมื่อข้อมูลเปลี่ยน
  if (activeProfile.masterData && activeProfile.masterData.length > 0) {
    activeProfile.masterData[0]._taxCalcDone = false;
  }
  // Reset toggle กลับเป็น Gross (default)
  showNet.tab2 = false; showNet.tab4 = false;
  const btn2 = document.getElementById('toggleGrossNet2');
  const btn4 = document.getElementById('toggleGrossNet4');
  const _isDark = document.body.classList.contains('dark');
  const _btnBg = _isDark ? '#334155' : '#E2E8F0';
  const _btnColor = _isDark ? '#CBD5E1' : '#475569';
  if (btn2) { btn2.textContent = '💰 Gross (ก่อนภาษี)'; btn2.className = 'btn'; btn2.style.background = _btnBg; btn2.style.color = _btnColor; }
  if (btn4) { btn4.textContent = '💰 Gross (ก่อนภาษี)'; btn4.className = 'btn'; btn4.style.background = _btnBg; btn4.style.color = _btnColor; }
}
