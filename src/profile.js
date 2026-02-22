// ============================================================
// PROFILE — จัดการ Profile, Snapshots, Package Tiers
// ============================================================
import { CALC } from './calc.js';
import { CONFIG, DEFAULT_PROFILE, CURRENT_YEAR_BE } from './config.js';
import {
  activeProfile, setActiveProfile, PINNED, CHARTS,
  STATE, readState, buildRetireYearOptions,
  destroyAllCharts, showNet,
  tab2Init, setTab2Init, tab3Init, setTab3Init,
  tab4Init, setTab4Init, tab5Init, setTab5Init
} from './state.js';
import { fmt, getNumericValue, setNumericValue, showToast, setupCommaFormatting } from './utils.js';

// ============================================================
// Profile Serialization — แปลง Infinity ↔ 999
// ============================================================
export function prepareProfileForSave(profile) {
  // แปลง Infinity → 999 ก่อน JSON.stringify (JSON ไม่รองรับ Infinity)
  const copy = JSON.parse(JSON.stringify(profile, (key, val) => val === Infinity ? 999 : val));
  return copy;
}

export function restoreProfileInfinity(profile) {
  // แปลง 999 → Infinity กลับ
  if (profile.packageTiers) {
    profile.packageTiers.forEach(t => {
      if (t.maxAge >= 999 || t.maxAge === null) t.maxAge = Infinity;
    });
  }
  return profile;
}

export function autoSaveActiveProfile() {
  try {
    const saveObj = prepareProfileForSave(activeProfile);
    // เก็บ Pinned Scenarios ลง auto-save ด้วย
    saveObj.pinned = JSON.parse(JSON.stringify(PINNED));
    localStorage.setItem('earlyRetireActiveProfile', JSON.stringify(saveObj));
  } catch(e) {}
}

export function autoLoadActiveProfile() {
  try {
    const saved = localStorage.getItem('earlyRetireActiveProfile');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.birthYear && parsed.masterData) {
        setActiveProfile(restoreProfileInfinity(parsed));
        // โหลด Pinned Scenarios กลับจาก auto-save
        PINNED.length = 0;
        if (parsed.pinned && Array.isArray(parsed.pinned)) {
          parsed.pinned.forEach(p => PINNED.push(p));
        }
        return true;
      }
    }
  } catch(e) {}
  return false;
}

// ============================================================
// Profile System — บันทึก / โหลด / ลบ
// ============================================================
export function applyProfileToUI() {
  // อัพเดต Header (ใช้ dynamic elements แทน .header .sub)
  const headerNameEl = document.getElementById('headerUserName');
  const headerCompanyEl = document.getElementById('headerCompany');
  const headerSep1 = document.getElementById('headerSep1');
  if (headerNameEl) {
    headerNameEl.textContent = activeProfile.name || '';
    headerCompanyEl.textContent = activeProfile.company || '';
    headerSep1.style.display = (activeProfile.name && activeProfile.company) ? '' : 'none';
  }
  // อัพเดต Tab ข้อมูลส่วนตัว (ถ้ามี)
  const pName = document.getElementById('profileName');
  if (pName) {
    pName.value = activeProfile.name || '';
    document.getElementById('profileCompany').value = activeProfile.company || '';
    document.getElementById('profileBirthYear').value = activeProfile.birthYear;
    document.getElementById('profileBirthMonth').value = activeProfile.birthMonth;
    document.getElementById('profileBirthDay').value = activeProfile.birthDay;
    document.getElementById('profileStartYear').value = activeProfile.startWorkYear;
    setNumericValue('profileSalary', activeProfile.salary);
    setNumericValue('profilePvd', activeProfile.pvdBalance);
    // คาดการณ์อนาคต inputs
    document.getElementById('mdSalaryGrowth').value = activeProfile.salaryGrowthRate || 1.6;
    document.getElementById('mdRetireMaxAge').value = activeProfile.retireMaxAge || DEFAULT_PROFILE.retireMaxAge;
    // สวัสดิการ 4 หมวด
    setNumericValue('mdWelfareFuel', activeProfile.welfareFuel || 0);
    setNumericValue('mdWelfareMedical', activeProfile.welfareMedical || 0);
    setNumericValue('mdWelfareTollway', activeProfile.welfareTollway || 0);
    setNumericValue('mdWelfareOther', activeProfile.welfareOther || 0);
    document.getElementById('mdWelfareAdjustYears').value = activeProfile.welfareAdjustYears || 5;
    document.getElementById('mdWelfareAdjustPct').value = activeProfile.welfareAdjustPct || 2;
    // เงินเฟ้อ + PVD
    document.getElementById('mdInflationRate').value = activeProfile.inflationRate || 2.5;
    document.getElementById('mdPvdReturn').value = activeProfile.pvdReturnRate || 3.5;
    // --- โบนัส ---
    document.getElementById('bonusMid').checked = activeProfile.bonusMid !== false;
    document.getElementById('bonusMidMult').value = activeProfile.bonusMidMult || 1.3;
    document.getElementById('bonusEnd').checked = activeProfile.bonusEnd !== false;
    document.getElementById('bonusEndMult').value = activeProfile.bonusEndMult || 1.3;
    // --- ค่าลดหย่อนภาษี ---
    setNumericValue('dedPersonal', activeProfile.dedPersonal || 60000);
    document.getElementById('dedParents').value = activeProfile.dedParents || 30000;
    setNumericValue('dedLifeIns', activeProfile.dedLifeIns || 0);
    setNumericValue('dedAnnuity', activeProfile.dedAnnuity || 0);
    document.getElementById('dedPvdRate').value = activeProfile.dedPvdRate || 5;
    setNumericValue('dedRmf', activeProfile.dedRmf || 0);
    setNumericValue('dedEsg', activeProfile.dedEsg || 0);
    // ประกันสังคม auto-calculate ตาม retireYear
    const ssEl2 = document.getElementById('dedSS');
    if (ssEl2) { ssEl2.value = CALC.getSocialSecurity(CURRENT_YEAR_BE); ssEl2.dataset.overridden = ''; }
    // อัพเดตยอดรวมสวัสดิการ
    updateWelfareTotal();
    renderPackageTiersTable();
  }
}

// ============================================================
// คำนวณรวมสวัสดิการ 4 หมวด แสดงยอดรวม
// ============================================================
export function updateWelfareTotal() {
  const fuel = getNumericValue('mdWelfareFuel') || 0;
  const medical = getNumericValue('mdWelfareMedical') || 0;
  const tollway = getNumericValue('mdWelfareTollway') || 0;
  const other = getNumericValue('mdWelfareOther') || 0;
  const total = fuel + medical + tollway + other;
  const label = document.getElementById('mdWelfareTotalLabel');
  if (label) label.textContent = 'รวม: ฿' + total.toLocaleString() + '/ปี';
}

// ============================================================
// คำนวณ masterData อัตโนมัติจาก input ของ user
// ============================================================
export function generateMasterData() {
  const currentYear = new Date().getFullYear() + 543; // ปี พ.ศ. จากวันที่จริง
  const currentAge = currentYear - activeProfile.birthYear;
  const startAge = currentAge - 2; // เริ่มจาก 2 ปีก่อนปัจจุบัน
  const endAge = activeProfile.retireMaxAge || DEFAULT_PROFILE.retireMaxAge;
  const baseSalary = activeProfile.salary;
  const salaryGrowth = (activeProfile.salaryGrowthRate || 1.6) / 100;
  // สวัสดิการ = รวม 4 หมวด
  const baseWelfare = (activeProfile.welfareFuel || 0) +
                      (activeProfile.welfareMedical || 0) +
                      (activeProfile.welfareTollway || 0) +
                      (activeProfile.welfareOther || 0);
  const adjYears = activeProfile.welfareAdjustYears || 5; // ปรับทุกกี่ปี
  const adjPct = (activeProfile.welfareAdjustPct || 2) / 100; // ปรับครั้งละกี่ %
  const pvdReturn = (activeProfile.pvdReturnRate || 3.5) / 100;
  const pvdRate = parseFloat(document.getElementById('dedPvdRate').value || 5) / 100;

  // ดึงค่าโบนัสจาก UI
  const bonusMid = document.getElementById('bonusMid') ? document.getElementById('bonusMid').checked : true;
  const bonusMidMult = parseFloat((document.getElementById('bonusMidMult') || {}).value) || 1.3;
  const bonusEnd = document.getElementById('bonusEnd') ? document.getElementById('bonusEnd').checked : true;
  const bonusEndMult = parseFloat((document.getElementById('bonusEndMult') || {}).value) || 1.3;

  const md = [];
  let prevPvd = activeProfile.pvdBalance || 0;
  // ปรับ prevPvd กลับ 2 ปี (ถ้าเริ่มก่อนปีปัจจุบัน)
  for (let y = 0; y < (currentAge - startAge); y++) {
    prevPvd = Math.round(prevPvd / (1 + pvdReturn) - baseSalary * pvdRate * 12 * 2);
  }
  if (prevPvd < 0) prevPvd = Math.round(activeProfile.pvdBalance * 0.85); // fallback

  for (let age = startAge; age <= endAge; age++) {
    const year = activeProfile.birthYear + age;
    const yearsFromNow = year - currentYear;
    const workYrs = year - activeProfile.startWorkYear;
    if (workYrs < 1) continue;

    // เงินเดือน (compound growth จากปีปัจจุบัน)
    const salary = Math.round(baseSalary * Math.pow(1 + salaryGrowth, yearsFromNow));

    // โบนัสรายปี (กลางปี + ปลายปี) — ใช้ multiplier เดียวกับหน้า Tab 1
    const bonusMidAmt = bonusMid ? Math.round(salary * bonusMidMult) : 0;
    const bonusEndAmt = bonusEnd ? Math.round(salary * bonusEndMult) : 0;
    const bonus = bonusMidAmt + bonusEndAmt;

    // สวัสดิการ (ปรับทุก N ปี ครั้งละ X%)
    // เช่น ปรับทุก 5 ปี +2% → ปี 1-5 = base, ปี 6-10 = base×1.02
    const adjustments = yearsFromNow > 0 ? Math.floor(yearsFromNow / adjYears) : 0;
    const welfare = Math.round(baseWelfare * Math.pow(1 + adjPct, adjustments));

    // PVD (ปีก่อน × ผลตอบแทน + สมทบรายปี ×2 = พนักงาน+บริษัท)
    const annualContrib = salary * pvdRate * 12 * 2;
    const pvd = Math.round(prevPvd * (1 + pvdReturn) + annualContrib);
    prevPvd = pvd;

    // Package & Severance (ใช้ฟังก์ชันเดิม)
    const pkg = CALC.calcPackageMonths(age);
    const earlyMerit = salary * pkg;
    const severanceDays = CALC.calcSeveranceDays(workYrs);
    const severance = Math.round(salary * severanceDays / 30);
    const earlyTotal = earlyMerit + severance;

    // totalIncome = earlyTotal + pvd + welfare สะสมจากจุดนั้น
    const totalIncome = earlyTotal + pvd + welfare;

    // totalIncome รวมทุกอย่าง
    md.push({ age, year, workYrs, salary, bonus, pkg, earlyMerit, severance,
              earlyTotal, accum: 0, pvd, welfare, totalIncome });
  }

  // คำนวณ accum = (เงินเดือน×12 + โบนัส) สะสมจากปีแรกของ masterData
  let runningAccum = 0;
  md.forEach(d => {
    runningAccum += (d.salary * 12) + (d.bonus || 0);
    d.accum = Math.round(runningAccum);
  });

  return md;
}

// ============================================================
// อ่านข้อมูลจาก UI → activeProfile
// ============================================================
export function readProfileFromUI() {
  const pName = document.getElementById('profileName');
  if (!pName) return;
  activeProfile.name = pName.value || '';
  activeProfile.company = document.getElementById('profileCompany').value || '';
  activeProfile.birthYear = parseInt(document.getElementById('profileBirthYear').value) || 2521;
  activeProfile.birthMonth = parseInt(document.getElementById('profileBirthMonth').value) || 12;
  activeProfile.birthDay = parseInt(document.getElementById('profileBirthDay').value) || 16;
  activeProfile.startWorkYear = parseInt(document.getElementById('profileStartYear').value) || 2547;
  activeProfile.salary = getNumericValue('profileSalary') || 228341;
  activeProfile.pvdBalance = getNumericValue('profilePvd') || 0;

  // อ่าน input คาดการณ์อนาคต (Auto เท่านั้น)
  activeProfile.salaryGrowthRate = parseFloat(document.getElementById('mdSalaryGrowth').value) || 1.6;
  activeProfile.retireMaxAge = parseInt(document.getElementById('mdRetireMaxAge').value) || 58;
  // สวัสดิการ 4 หมวด
  activeProfile.welfareFuel = getNumericValue('mdWelfareFuel') || 0;
  activeProfile.welfareMedical = getNumericValue('mdWelfareMedical') || 0;
  activeProfile.welfareTollway = getNumericValue('mdWelfareTollway') || 0;
  activeProfile.welfareOther = getNumericValue('mdWelfareOther') || 0;
  activeProfile.welfareAdjustYears = parseInt(document.getElementById('mdWelfareAdjustYears').value) || 5;
  activeProfile.welfareAdjustPct = parseFloat(document.getElementById('mdWelfareAdjustPct').value) || 2;
  // เงินเฟ้อ + PVD
  activeProfile.inflationRate = parseFloat(document.getElementById('mdInflationRate').value) || 2.5;
  activeProfile.pvdReturnRate = parseFloat(document.getElementById('mdPvdReturn').value) || 3.5;
  // --- โบนัส ---
  activeProfile.bonusMid = document.getElementById('bonusMid').checked;
  activeProfile.bonusMidMult = parseFloat(document.getElementById('bonusMidMult').value) || 1.3;
  activeProfile.bonusEnd = document.getElementById('bonusEnd').checked;
  activeProfile.bonusEndMult = parseFloat(document.getElementById('bonusEndMult').value) || 1.3;
  // --- ค่าลดหย่อนภาษี ---
  activeProfile.dedPersonal = getNumericValue('dedPersonal') || 60000;
  activeProfile.dedParents = parseFloat(document.getElementById('dedParents').value) || 30000;
  activeProfile.dedLifeIns = getNumericValue('dedLifeIns') || 0;
  activeProfile.dedAnnuity = getNumericValue('dedAnnuity') || 0;
  activeProfile.dedPvdRate = parseFloat(document.getElementById('dedPvdRate').value) || 5;
  activeProfile.dedRmf = getNumericValue('dedRmf') || 0;
  activeProfile.dedEsg = getNumericValue('dedEsg') || 0;
  // อัพเดต retireYear dropdown ให้ตรงกับ birthYear + retireMaxAge ใหม่
  buildRetireYearOptions();
  // Generate masterData จากสูตร (ทุกครั้ง)
  activeProfile.masterData = generateMasterData();
  // Sync Pinned Scenarios เข้า activeProfile (เพื่อให้ save เก็บไปด้วย)
  activeProfile.pinned = JSON.parse(JSON.stringify(PINNED));

  // อัพเดต Header + auto-save
  applyProfileToUI();
  autoSaveActiveProfile();
  // Reset tab init flags + ล้าง Charts (ข้อมูลเปลี่ยน)
  destroyAllCharts();
  setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
  window.onInputChange();
}

// ============================================================
// Profile CRUD — Save / Load / Delete
// ============================================================
export function saveProfile() {
  readProfileFromUI();
  const saveName = prompt('ตั้งชื่อ Profile:', activeProfile.name || 'Profile ใหม่');
  if (!saveName) return;
  let saved = JSON.parse(localStorage.getItem('earlyRetireProfiles') || '[]');
  // ถ้าชื่อซ้ำ ให้ overwrite
  saved = saved.filter(p => p.name !== saveName);
  const profileCopy = prepareProfileForSave(activeProfile);
  profileCopy.name = saveName;
  // เก็บ Pinned Scenarios ลง Profile ด้วย
  profileCopy.pinned = JSON.parse(JSON.stringify(PINNED));
  saved.push(profileCopy);
  localStorage.setItem('earlyRetireProfiles', JSON.stringify(saved));
  updateProfileDropdown();
  const pinMsg = PINNED.length > 0 ? ' (+ Pin ' + PINNED.length + ' scenarios)' : '';
  showToast('บันทึก Profile "' + saveName + '" แล้ว' + pinMsg);
}

export function loadProfile() {
  const sel = document.getElementById('profileSelect');
  if (!sel || !sel.value) return;
  const saved = JSON.parse(localStorage.getItem('earlyRetireProfiles') || '[]');
  const found = saved.find(p => p.name === sel.value);
  if (!found) { showToast('ไม่พบ Profile'); return; }
  setActiveProfile(restoreProfileInfinity(JSON.parse(JSON.stringify(found))));
  // โหลด Pinned Scenarios กลับมา (ถ้ามี)
  PINNED.length = 0;
  if (found.pinned && Array.isArray(found.pinned)) {
    found.pinned.forEach(p => PINNED.push(p));
  }
  window.updatePinBar();
  window.updatePinButton();
  applyProfileToUI();
  // baseSalary จะ auto-calculate ใน readState() ตามปีลาออก
  autoSaveActiveProfile();
  // Reset tab flags + ล้าง Charts
  destroyAllCharts();
  setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
  window.onInputChange();
  const pinMsg = PINNED.length > 0 ? ' (+ Pin ' + PINNED.length + ' scenarios)' : '';
  showToast('โหลด Profile "' + found.name + '" แล้ว' + pinMsg);
}

// Smart Load — ถ้าเลือก Profile ใน dropdown → โหลดจาก localStorage | ถ้าว่าง → เปิด Import JSON
export function smartLoad() {
  const sel = document.getElementById('profileSelect');
  if (sel && sel.value) {
    loadProfile();
  } else {
    document.getElementById('importFile').click();
  }
}

export function deleteProfile() {
  const sel = document.getElementById('profileSelect');
  if (!sel || !sel.value) return;
  if (!confirm('ลบ Profile "' + sel.value + '" ?')) return;
  let saved = JSON.parse(localStorage.getItem('earlyRetireProfiles') || '[]');
  saved = saved.filter(p => p.name !== sel.value);
  localStorage.setItem('earlyRetireProfiles', JSON.stringify(saved));
  updateProfileDropdown();
  showToast('ลบ Profile แล้ว');
}

// ============================================================
// Export Profile → ดาวน์โหลดเป็นไฟล์ JSON
// ============================================================
export function exportProfile() {
  readProfileFromUI();
  const data = prepareProfileForSave(activeProfile);
  // เพิ่ม metadata
  data._exportDate = new Date().toISOString();
  data._version = 'v6';
  // บันทึก Sim State (ปีลาออก + ค่าควบคุม Simulator ทั้งหมด)
  data._simState = {
    retireYear:      parseInt(document.getElementById('retireYear').value),
    retireMonth:     parseInt(document.getElementById('retireMonth').value),
    packageOverride: document.getElementById('packageMonths').value,
    exempt600k:      document.getElementById('exempt600k').checked,
    pvdHandling:     document.getElementById('pvdHandling').value,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // ชื่อไฟล์: ProfileName_YYYY-MM-DD_HHmm.json (เพิ่ม timestamp)
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
  a.download = (activeProfile.name || 'Profile').replace(/\s+/g, '_') + '_' + dateStr + '_' + timeStr + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Export สำเร็จ');
}

// ============================================================
// Import Profile ← อัพโหลดไฟล์ JSON กลับ
// ============================================================
export function importProfile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // ตรวจว่ามี field birthYear อยู่จริง (รองรับค่า 0 ด้วย)
      if (!('birthYear' in data) && !data.name && !data.salary) {
        showToast('❌ ไฟล์ไม่ถูกต้อง — ไม่ใช่ Profile JSON ที่ Export จาก App นี้');
        return;
      }
      // เติม field ที่อาจขาด (backward compatibility กับ JSON เก่า)
      if (!('birthYear' in data)) data.birthYear = DEFAULT_PROFILE.birthYear;
      if (!data.packageTiers) data.packageTiers = DEFAULT_PROFILE.packageTiers;
      setActiveProfile(restoreProfileInfinity(data));
      // โหลด Pin Scenarios จาก JSON ที่ Import เข้ามา
      PINNED.length = 0;
      if (data.pinned && Array.isArray(data.pinned)) {
        data.pinned.forEach(p => PINNED.push(p));
      }
      applyProfileToUI();
      // rebuild retireYear dropdown ให้ตรงกับ birthYear + retireMaxAge ที่ import มา
      buildRetireYearOptions(data._simState ? data._simState.retireYear : undefined);
      // Restore Sim State ถ้ามี (_simState ถูกเพิ่มตั้งแต่ _version v6)
      if (data._simState) {
        const sim = data._simState;
        if (sim.retireYear)             document.getElementById('retireYear').value      = sim.retireYear;
        if (sim.retireMonth)            document.getElementById('retireMonth').value     = sim.retireMonth;
        if (sim.packageOverride != null) document.getElementById('packageMonths').value  = sim.packageOverride;
        if (sim.exempt600k != null)     document.getElementById('exempt600k').checked    = sim.exempt600k;
        if (sim.pvdHandling)            document.getElementById('pvdHandling').value     = sim.pvdHandling;
      }
      activeProfile.masterData = generateMasterData();
      // baseSalary จะ auto-calculate ใน readState() ตามปีลาออก
      autoSaveActiveProfile();
      destroyAllCharts();
      setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
      window.onInputChange();
      window.updatePinBar();
      window.updatePinButton();
      const pinMsg = PINNED.length > 0 ? ' (+ Pin ' + PINNED.length + ' scenarios)' : '';
      showToast('✅ Import "' + (data.name || 'Profile') + '" สำเร็จ' + pinMsg);
    } catch(err) {
      showToast('❌ อ่านไฟล์ไม่ได้: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // reset เพื่อเลือกไฟล์เดิมซ้ำได้
}

// ============================================================
// Snapshot Timeline — บันทึกผลลัพธ์ตามวันที่
// ============================================================
export function saveSnapshot() {
  readProfileFromUI();
  readState();
  const r = CALC.calcFullScenario(STATE);
  const currentAge = CALC.calcAge(STATE.retireYear, STATE.retireMonth || 6);
  // คำนวณ NPV ณ ตอนนี้
  const yearsFromNow = STATE.retireYear - CURRENT_YEAR_BE;
  const discRate = 1 + (activeProfile.inflationRate || 2.5) / 100;
  const grossNPV = Math.round(r.netIncome / Math.pow(discRate, Math.max(0, yearsFromNow)));
  const oc = CALC.calcOpportunityCost(currentAge);
  const netNPV = grossNPV - oc.totalPV;

  const snapshot = {
    date: new Date().toISOString(),
    name: activeProfile.name,
    summary: {
      retireAge: currentAge,
      retireYear: STATE.retireYear,
      totalIncome: r.totalIncome,
      totalTax: r.totalTax,
      netIncome: r.netIncome,
      npv: netNPV
    },
    profile: prepareProfileForSave(activeProfile),
    state: { retireYear: STATE.retireYear, retireMonth: STATE.retireMonth }
  };
  let snaps = JSON.parse(localStorage.getItem('earlyRetireSnapshots') || '[]');
  snaps.push(snapshot);
  localStorage.setItem('earlyRetireSnapshots', JSON.stringify(snaps));
  renderSnapshots();
  showToast('📸 บันทึก Snapshot สำเร็จ');
}

export function renderSnapshots() {
  const container = document.getElementById('snapshotList');
  if (!container) return;
  const snaps = JSON.parse(localStorage.getItem('earlyRetireSnapshots') || '[]');
  if (!snaps.length) {
    container.innerHTML = '<p style="color:#64748B;font-size:12px">ยังไม่มี snapshot — กดปุ่ม 📸 เพื่อบันทึกผลลัพธ์ปัจจุบัน</p>';
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:8px">';
  snaps.forEach((s, i) => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) +
                    ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const npvColor = s.summary.npv >= 0 ? '#059669' : '#DC2626';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;flex-wrap:wrap;gap:6px">' +
      '<div style="flex:1;min-width:200px">' +
      '<div style="font-weight:600;font-size:13px;color:#1E293B">' + dateStr + '</div>' +
      '<div style="font-size:11px;color:#64748B">' + (s.name || 'ไม่ระบุ') +
      ' | ออกอายุ ' + s.summary.retireAge + ' (พ.ศ.' + s.summary.retireYear + ')' +
      ' | สุทธิ ฿' + fmt(s.summary.netIncome) +
      ' | <span style="color:' + npvColor + '">NPV ฿' + fmt(s.summary.npv) + '</span></div>' +
      '</div>' +
      '<div style="display:flex;gap:4px">' +
      '<button class="btn btn-secondary btn-sm" onclick="loadSnapshot(' + i + ')" title="โหลด snapshot นี้">📂</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="exportSnapshot(' + i + ')" title="ดาวน์โหลด JSON">📥</button>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteSnapshot(' + i + ')" title="ลบ">×</button>' +
      '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

export function loadSnapshot(index) {
  const snaps = JSON.parse(localStorage.getItem('earlyRetireSnapshots') || '[]');
  if (!snaps[index]) return;
  setActiveProfile(restoreProfileInfinity(JSON.parse(JSON.stringify(snaps[index].profile))));
  applyProfileToUI();
  activeProfile.masterData = generateMasterData();
  // โหลด STATE (ปีออก, เดือนออก)
  if (snaps[index].state) {
    if (snaps[index].state.retireYear) document.getElementById('retireYear').value = snaps[index].state.retireYear;
    if (snaps[index].state.retireMonth) document.getElementById('retireMonth').value = snaps[index].state.retireMonth;
  }
  // baseSalary จะ auto-calculate ใน readState() ตามปีลาออก
  autoSaveActiveProfile();
  destroyAllCharts();
  setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
  window.onInputChange();
  showToast('📂 โหลด Snapshot สำเร็จ');
}

export function exportSnapshot(index) {
  const snaps = JSON.parse(localStorage.getItem('earlyRetireSnapshots') || '[]');
  if (!snaps[index]) return;
  const data = snaps[index];
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date(data.date).toISOString().slice(0, 10);
  a.download = 'Snapshot_' + (data.name || 'NoName').replace(/\s+/g, '_') + '_' + dateStr + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 ดาวน์โหลดไปที่โฟลเดอร์ Downloads แล้ว');
}

export function deleteSnapshot(index) {
  if (!confirm('ลบ Snapshot นี้?')) return;
  let snaps = JSON.parse(localStorage.getItem('earlyRetireSnapshots') || '[]');
  snaps.splice(index, 1);
  localStorage.setItem('earlyRetireSnapshots', JSON.stringify(snaps));
  renderSnapshots();
  showToast('ลบ Snapshot แล้ว');
}

export function clearSnapshots() {
  if (!confirm('ล้าง Snapshot ทั้งหมด?')) return;
  localStorage.removeItem('earlyRetireSnapshots');
  renderSnapshots();
  showToast('ล้าง Snapshot แล้ว');
}

// ============================================================
// Profile Dropdown — อัพเดตตัวเลือก Profile
// ============================================================
export function updateProfileDropdown() {
  const sel = document.getElementById('profileSelect');
  if (!sel) return;
  const saved = JSON.parse(localStorage.getItem('earlyRetireProfiles') || '[]');
  sel.innerHTML = '<option value="">-- เลือก Profile --</option>';
  saved.forEach(p => {
    sel.innerHTML += '<option value="' + p.name + '">' + p.name + '</option>';
  });
}

// ============================================================
// Package Tiers — ตารางแพคเกจตามช่วงอายุ
// ============================================================
export function renderPackageTiersTable() {
  const tbody = document.getElementById('pkgTiersBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  activeProfile.packageTiers.forEach((tier, i) => {
    const maxAgeVal = tier.maxAge === Infinity ? 999 : tier.maxAge;
    const label = tier.maxAge === Infinity ? '∞' : tier.maxAge;
    tbody.innerHTML += '<tr><td><input type="number" value="' + maxAgeVal + '" min="40" max="999" style="width:70px;padding:4px;border:1px solid #CBD5E1;border-radius:4px" onchange="updatePkgTier(' + i + ',\'maxAge\',this.value)"></td><td><input type="number" value="' + tier.months + '" min="0" max="60" style="width:70px;padding:4px;border:1px solid #CBD5E1;border-radius:4px" onchange="updatePkgTier(' + i + ',\'months\',this.value)"></td><td><button class="btn btn-danger btn-sm" onclick="removePkgTier(' + i + ')">ลบ</button></td></tr>';
  });
}

export function updatePkgTier(idx, field, val) {
  const v = parseInt(val);
  if (field === 'maxAge') activeProfile.packageTiers[idx].maxAge = v >= 999 ? Infinity : v;
  else activeProfile.packageTiers[idx].months = v;
  autoSaveActiveProfile();
  destroyAllCharts();
  setTab2Init(false); setTab3Init(false); setTab4Init(false);
  window.onInputChange();
}

export function addPkgTier() {
  activeProfile.packageTiers.push({maxAge:60, months:0});
  activeProfile.packageTiers.sort((a,b) => a.maxAge - b.maxAge);
  autoSaveActiveProfile();
  renderPackageTiersTable();
}

export function removePkgTier(idx) {
  if (activeProfile.packageTiers.length <= 1) { showToast('ต้องมีอย่างน้อย 1 tier'); return; }
  activeProfile.packageTiers.splice(idx, 1);
  autoSaveActiveProfile();
  renderPackageTiersTable();
  destroyAllCharts();
  setTab2Init(false); setTab3Init(false);
  window.onInputChange();
}
