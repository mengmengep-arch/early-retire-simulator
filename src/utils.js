// ============================================================
// UTILS — ฟังก์ชันช่วยเหลือ (formatting, toast, modal, zoom)
// ============================================================
import { CALC } from './calc.js';
import { currentZoom, setCurrentZoom } from './state.js';

// fmt shortcut — จัดรูปแบบตัวเลขเป็น comma format
export function fmt(n) { return CALC.fmt(n); }

// === Comma Formatting สำหรับ input fields ===
export function unformatNumber(str) {
  // ลบ comma ออก แล้วแปลงเป็นตัวเลข
  if (typeof str !== 'string') str = String(str);
  return parseFloat(str.replace(/,/g, '')) || 0;
}

export function formatInputValue(el) {
  // จัดรูปแบบตัวเลขใน input (ใส่ comma) ตอน blur
  const raw = unformatNumber(el.value);
  if (isNaN(raw) || raw === 0) { el.value = '0'; return; }
  el.value = new Intl.NumberFormat('th-TH').format(Math.round(raw));
}

export function unformatInputValue(el) {
  // ลบ comma ออกตอน focus (ให้แก้ตัวเลขง่าย)
  const raw = unformatNumber(el.value);
  el.value = raw || '';
}

export function getNumericValue(id) {
  // อ่านค่าจาก input ที่อาจมี comma
  const el = document.getElementById(id);
  if (!el) return 0;
  return unformatNumber(el.value);
}

export function setNumericValue(id, val) {
  // ตั้งค่า input พร้อมจัดรูปแบบ (ถ้ามี data-format-comma)
  const el = document.getElementById(id);
  if (!el) return;
  if (el.dataset.formatComma === 'true') {
    el.value = new Intl.NumberFormat('th-TH').format(Math.round(val));
  } else {
    el.value = val;
  }
}

export function setupCommaFormatting() {
  // หา input ทุกตัวที่มี data-format-comma="true" แล้วผูก event
  document.querySelectorAll('input[data-format-comma="true"]').forEach(el => {
    // เปลี่ยน type จาก number เป็น text + inputmode
    el.type = 'text';
    el.inputMode = 'numeric';

    // จัดรูปแบบค่าเริ่มต้น
    formatInputValue(el);

    // ตอน focus: แสดงเลขดิบ (ไม่มี comma) ให้แก้ง่าย
    el.addEventListener('focus', function() {
      unformatInputValue(this);
      this.select();
    });

    // ตอน blur: ใส่ comma กลับ
    el.addEventListener('blur', function() {
      formatInputValue(this);
    });
  });
}

// ============ Toast ============
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ============ About Modal ============
export function showAbout() {
  document.getElementById('aboutOverlay').classList.add('show');
}
export function hideAbout() {
  document.getElementById('aboutOverlay').classList.remove('show');
}

// ============ Welcome Modal (แสดงครั้งแรก) ============
export function showWelcome() {
  // ถ้าเคยเห็นแล้ว ไม่ต้องแสดง
  if (localStorage.getItem('earlyRetireWelcomeSeen')) return;
  document.getElementById('welcomeOverlay').classList.add('show');
}
export function closeWelcome(goTab) {
  document.getElementById('welcomeOverlay').classList.remove('show');
  // ถ้าติ๊ก "ไม่ต้องแสดงอีก" → จำไว้
  if (document.getElementById('welcomeNoShow').checked) {
    localStorage.setItem('earlyRetireWelcomeSeen', '1');
  }
  window.switchTab(goTab); // 0 = วิธีใช้, 1 = ข้อมูล
}

// ============================================================
// ปุ่มปรับขนาดตัวหนังสือ (Zoom) — ใช้ CSS zoom
// ============================================================
export function applyZoom() {
  // ตั้งค่า CSS zoom ตามระดับที่เลือก
  document.body.style.zoom = (currentZoom / 100);
  const label = document.getElementById('zoomLabel');
  if (label) label.textContent = currentZoom + '%';
}

export function changeZoom(direction) {
  // direction: -1 = เล็กลง, 0 = reset 100%, 1 = ใหญ่ขึ้น (ทีละ 10%)
  if (direction === 0) { setCurrentZoom(100); }
  else { setCurrentZoom(Math.max(70, Math.min(150, currentZoom + direction * 10))); }
  localStorage.setItem('earlyRetireZoom', currentZoom);
  applyZoom();
}
