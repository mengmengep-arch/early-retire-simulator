// ============================================================
// PDF EXPORT — Capture ทีละ Tab + Cover page + Timestamp
// ============================================================
import { activeProfile, CHARTS,
  tab2Init, setTab2Init, tab3Init, setTab3Init,
  tab4Init, setTab4Init, tab5Init, setTab5Init,
  destroyAllCharts
} from './state.js';
import { CONFIG, TAB_NAMES, TAB_NAMES_PDF } from './config.js';
import { fmt, showToast } from './utils.js';

// ============================================================
// สร้าง Cover page สำหรับหน้าแรกของ PDF
// ============================================================
function createCoverPage() {
  const now = new Date();
  // วันที่ภาษาไทย
  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const thaiDate = now.getDate() + ' ' + thaiMonths[now.getMonth()] + ' ' + (now.getFullYear() + 543);
  const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ' น.';
  const userName = activeProfile.name || 'ไม่ระบุชื่อ';
  const companyName = activeProfile.company || '';

  const cover = document.createElement('div');
  cover.style.cssText = 'width:794px;height:1123px;position:absolute;left:-9999px;top:0;' +
    'background:linear-gradient(135deg,#0F172A 0%,#1E293B 40%,#334155 100%);' +
    'color:#E2E8F0;font-family:Sarabun,sans-serif;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;text-align:center;padding:60px;box-sizing:border-box;';

  cover.innerHTML = `
    <div style="font-size:22px;letter-spacing:6px;color:#94A3B8;margin-bottom:40px;">EARLY RETIRE & TAX SIMULATOR V.01_2026</div>
    <div style="width:120px;height:4px;background:linear-gradient(90deg,#3B82F6,#10B981);border-radius:2px;margin-bottom:50px;"></div>
    <div style="font-size:48px;font-weight:700;line-height:1.3;margin-bottom:16px;">📊 รายงานการวิเคราะห์<br>แผนเกษียณอายุ</div>
    <div style="font-size:20px;color:#94A3B8;margin-bottom:60px;">คำนวณภาษี • วิเคราะห์แพคเกจ • วางแผน Early Retire</div>
    <div style="width:200px;height:2px;background:#475569;margin-bottom:50px;"></div>
    <div style="font-size:28px;font-weight:600;margin-bottom:12px;">${userName}</div>
    ${companyName ? '<div style="font-size:20px;color:#94A3B8;margin-bottom:40px;">🏢 ' + companyName + '</div>' : '<div style="margin-bottom:40px;"></div>'}
    <div style="font-size:16px;color:#64748B;line-height:2;">
      <div>📅 ${thaiDate}</div>
      <div>🕐 ${timeStr}</div>
    </div>
    <div style="position:absolute;bottom:40px;font-size:12px;color:#475569;">
      สร้างโดย Early Retire & Tax Simulator V.01_2026 — V.01_2026
    </div>
  `;
  document.body.appendChild(cover);
  return cover;
}

// ============================================================
// PDF Helper Functions — Section-by-Section + Smart Slice
// ============================================================

// เพิ่ม header + footer ในแต่ละหน้า PDF (ใช้ร่วมทุก flow)
function pdfAddHeaderFooter(pdf, marginMM, pageWidthMM, pageHeightMM, headerH, footerH, tabName, pageCounter) {
  if (!tabName || !pageCounter) return;
  pageCounter.current++;
  // Header: ชื่อ Tab (ซ้ายบน)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(tabName, marginMM, marginMM + 6);
  // เส้นคั่น header
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.line(marginMM, marginMM + headerH - 2, pageWidthMM - marginMM, marginMM + headerH - 2);
  // Footer: เส้นคั่น + ข้อความ
  const footerY = pageHeightMM - marginMM - footerH + 2;
  pdf.line(marginMM, footerY, pageWidthMM - marginMM, footerY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  const now = new Date();
  const footerText = 'Early Retire & Tax Simulator V.01_2026 | ' +
    (activeProfile.name || '') + ' | ' +
    now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  pdf.text(footerText, marginMM, footerY + 6);
  pdf.text('Page ' + pageCounter.current, pageWidthMM - marginMM, footerY + 6, { align: 'right' });
}

// ดึง section ทั้งหมดจาก panel สำหรับ capture ทีละ section
function getSectionsForPanel(panelEl) {
  const sections = [];
  for (const child of panelEl.children) {
    // ข้าม element ที่ซ่อนอยู่ หรือไม่แสดงผล
    if (child.style.display === 'none' || child.offsetHeight === 0) continue;
    // ข้าม UI ที่ไม่ต้องการใน PDF
    if (child.classList.contains('ctrl-panel') || child.classList.contains('pin-bar') || child.classList.contains('no-print')) continue;
    // กรณี container ที่มี .chart-box ข้างใน (Panel-7 dynamic sections + bestStrategy)
    if (child.id === 'taxLawSection' || child.id === 'timelineSection' ||
        child.id === 'checklistSection' || child.id === 'bestStrategySection') {
      for (const inner of child.children) {
        if (inner.offsetHeight > 0 && inner.style.display !== 'none') {
          sections.push({ el: inner });
        }
      }
      continue;
    }
    sections.push({ el: child });
  }
  return sections;
}

// หาจุดตัดปลอดภัย (safe cut points) จาก DOM — ขอบล่างของทุก <tr>
function findSafeCutPoints(domElement, canvasScale) {
  const safeCuts = [];
  const containerRect = domElement.getBoundingClientRect();
  // วิธีหลัก: หาขอบล่างของทุก <tr> ในทุก table
  const tables = domElement.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const rowRect = row.getBoundingClientRect();
      const bottomRelative = rowRect.bottom - containerRect.top;
      // แปลงเป็น canvas pixel (คูณ scale ของ html2canvas)
      const canvasY = Math.round(bottomRelative * canvasScale);
      safeCuts.push(canvasY);
    });
  });
  // เสริม: หาขอบบนของ heading เพื่อตัดก่อน heading
  const headings = domElement.querySelectorAll('h3, h4');
  headings.forEach(h => {
    const hRect = h.getBoundingClientRect();
    const topRelative = hRect.top - containerRect.top;
    const canvasY = Math.round(topRelative * canvasScale);
    if (canvasY > 10) safeCuts.push(canvasY - 4); // -4px padding
  });
  // เรียงลำดับ + ลบซ้ำ
  return [...new Set(safeCuts)].sort((a, b) => a - b);
}

// เลือก cut point ที่ดีที่สุด: ใกล้ idealEnd มากที่สุด แต่ไม่เกิน
function findBestCutPoint(safeCuts, startY, idealEndY) {
  // กรองเฉพาะ cut points ที่อยู่ระหว่าง startY กับ idealEndY
  const candidates = safeCuts.filter(y => y > startY + 50 && y <= idealEndY);
  if (candidates.length > 0) {
    // เลือกตัวที่ใกล้ idealEnd ที่สุด (ใช้พื้นที่ให้เต็มที่สุด)
    return candidates[candidates.length - 1];
  }
  // ไม่มี safe cut ในช่วง → fallback ใช้ idealEnd ตรงๆ (เหมือน behavior เดิม)
  return idealEndY;
}

// หั่น section ที่สูงกว่า 1 หน้า โดยตัดที่ขอบแถว (ไม่ตัดผ่ากลาง)
async function smartSliceToPages(pdf, canvas, domElement, usableWidthMM, usableHeightMM,
                                  contentTopMM, marginMM, pageWidthMM, pageHeightMM,
                                  headerH, footerH, tabName, pageCounter) {
  const pxPerMM = canvas.width / usableWidthMM;
  const maxSlicePx = Math.floor(usableHeightMM * pxPerMM);
  const canvasScale = canvas.width / domElement.getBoundingClientRect().width;
  // หาจุดตัดปลอดภัย (ขอบแถว table)
  const safeCuts = findSafeCutPoints(domElement, canvasScale);
  let yOffset = 0;
  while (yOffset < canvas.height) {
    const idealEnd = yOffset + maxSlicePx;
    let actualEnd;
    if (idealEnd >= canvas.height) {
      actualEnd = canvas.height; // ส่วนสุดท้าย
    } else {
      actualEnd = findBestCutPoint(safeCuts, yOffset, idealEnd);
    }
    const slicePx = actualEnd - yOffset;
    const sliceMM = slicePx / pxPerMM;
    // สร้าง slice canvas
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = slicePx;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#F0F4F8';
    ctx.fillRect(0, 0, canvas.width, slicePx);
    ctx.drawImage(canvas, 0, yOffset, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
    const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.85);
    pdf.addPage();
    pdfAddHeaderFooter(pdf, marginMM, pageWidthMM, pageHeightMM, headerH, footerH, tabName, pageCounter);
    pdf.addImage(sliceData, 'JPEG', marginMM, contentTopMM, usableWidthMM, sliceMM);
    yOffset = actualEnd;
  }
}

// วาง sections ทั้งหมดลง PDF pages พร้อม page break อัจฉริยะ
async function addSectionsToPDF(pdf, sections, A4W, A4H, MARGIN, tabName, pageCounter) {
  const HEADER_H = 12;
  const FOOTER_H = 10;
  const usableWidth = A4W - (MARGIN * 2);   // 186mm
  const usableHeight = A4H - (MARGIN * 2) - HEADER_H - FOOTER_H; // 251mm
  const contentTop = MARGIN + HEADER_H;      // 24mm
  const GAP_MM = 3; // ช่องว่างระหว่าง section (mm)

  let currentY = usableHeight; // เริ่มเต็ม → บังคับขึ้นหน้าใหม่ section แรก

  for (let si = 0; si < sections.length; si++) {
    const { el } = sections[si];
    // Capture section เป็น canvas
    await new Promise(r => setTimeout(r, 80));
    let canvas;
    try {
      canvas = await html2canvas(el, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#F0F4F8',
        windowWidth: Math.min(el.scrollWidth + 40, 1200)
      });
    } catch (err) {
      console.warn('PDF section capture failed:', err);
      continue; // ข้ามไป section ถัดไป
    }
    // คำนวณขนาดใน mm
    const pxPerMM = canvas.width / usableWidth;
    const sectionHeightMM = canvas.height / pxPerMM;

    if (sectionHeightMM <= usableHeight) {
      // Section พอดีใน 1 หน้า
      if (currentY + sectionHeightMM + GAP_MM > usableHeight) {
        // เหลือที่ไม่พอ → ขึ้นหน้าใหม่
        pdf.addPage();
        pdfAddHeaderFooter(pdf, MARGIN, A4W, A4H, HEADER_H, FOOTER_H, tabName, pageCounter);
        currentY = 0;
      }
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      pdf.addImage(imgData, 'JPEG', MARGIN, contentTop + currentY, usableWidth, sectionHeightMM);
      currentY += sectionHeightMM + GAP_MM;
    } else {
      // Section สูงกว่า 1 หน้า → smart slice ที่ขอบแถว
      await smartSliceToPages(pdf, canvas, el, usableWidth, usableHeight,
                              contentTop, MARGIN, A4W, A4H, HEADER_H, FOOTER_H,
                              tabName, pageCounter);
      currentY = usableHeight; // force หน้าใหม่สำหรับ section ถัดไป
    }
  }
}

// Capture canvas เป็น slices ใส่ PDF — วิธีเดิม (fallback)
function addCanvasToPDF(pdf, canvas, imgWidthMM, pageHeightMM, marginMM, tabName, pageCounter) {
  // พื้นที่สำหรับ header + footer (mm)
  const HEADER_H = tabName ? 12 : 0;
  const FOOTER_H = tabName ? 10 : 0;
  const usableWidth = imgWidthMM - (marginMM * 2);
  const usableHeight = pageHeightMM - (marginMM * 2) - HEADER_H - FOOTER_H;
  const contentTop = marginMM + HEADER_H;
  const imgHeightMM = (canvas.height * usableWidth) / canvas.width;

  // ฟังก์ชันเพิ่ม header + footer ในแต่ละหน้า PDF
  function addHeaderFooter() {
    if (!tabName || !pageCounter) return;
    pageCounter.current++;

    // === Header: ชื่อ Tab (ซ้ายบน) ===
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(tabName, marginMM, marginMM + 6);
    // เส้นคั่น header
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.3);
    pdf.line(marginMM, marginMM + HEADER_H - 2, imgWidthMM - marginMM, marginMM + HEADER_H - 2);

    // === Footer: เส้นคั่น + ข้อความ ===
    const footerY = pageHeightMM - marginMM - FOOTER_H + 2;
    pdf.line(marginMM, footerY, imgWidthMM - marginMM, footerY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    const now = new Date();
    const footerText = 'Early Retire & Tax Simulator V.01_2026 | ' +
      (activeProfile.name || '') + ' | ' +
      now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    pdf.text(footerText, marginMM, footerY + 6);
    // Page number (ขวาล่าง)
    pdf.text('Page ' + pageCounter.current, imgWidthMM - marginMM, footerY + 6, { align: 'right' });
  }

  if (imgHeightMM <= usableHeight) {
    // พอดี 1 หน้า
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    pdf.addPage();
    addHeaderFooter();
    pdf.addImage(imgData, 'JPEG', marginMM, contentTop, usableWidth, imgHeightMM);
    return;
  }

  // สูงกว่า 1 หน้า → ต้อง crop slice
  const pxPerMM = canvas.width / usableWidth;
  const sliceHeightPx = Math.floor(usableHeight * pxPerMM);
  let yOffset = 0;

  while (yOffset < canvas.height) {
    const remainPx = canvas.height - yOffset;
    const thisSlicePx = Math.min(sliceHeightPx, remainPx);
    const thisSliceMM = thisSlicePx / pxPerMM;

    // สร้าง canvas ย่อยสำหรับ slice นี้
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = thisSlicePx;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#F0F4F8';
    ctx.fillRect(0, 0, canvas.width, thisSlicePx);
    ctx.drawImage(canvas, 0, yOffset, canvas.width, thisSlicePx, 0, 0, canvas.width, thisSlicePx);

    const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.85);
    pdf.addPage();
    addHeaderFooter();
    pdf.addImage(sliceData, 'JPEG', marginMM, contentTop, usableWidth, thisSliceMM);

    yOffset += thisSlicePx;
  }
}

// ============================================================
// Main Export Function — สร้าง PDF ทั้งฉบับ
// ============================================================
export async function exportPDF() {
  // ตรวจว่า library พร้อมใช้งาน
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    showToast('❌ Library สำหรับ PDF ยังโหลดไม่เสร็จ — กรุณารอสักครู่แล้วลองใหม่');
    return;
  }

  showToast('⏳ กำลังสร้าง PDF... อาจใช้เวลา 15-30 วินาที');

  // Overlay: ปิดกั้น UI ไม่ให้ user เห็น theme switching ระหว่าง export
  const pdfOverlay = document.createElement('div');
  pdfOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.95);z-index:99999;'
    + 'display:flex;align-items:center;justify-content:center;color:#e2e8f0;'
    + 'font-size:16px;font-family:Sarabun,sans-serif;flex-direction:column;gap:12px;pointer-events:none';
  pdfOverlay.innerHTML = '<div style="font-size:32px">📄</div>'
    + '<div>กำลังเตรียม PDF...</div>'
    + '<div style="font-size:12px;color:#94a3b8">อาจใช้เวลา 15-30 วินาที</div>';
  document.body.appendChild(pdfOverlay);

  // 1. ถ้า dark mode → switch เป็น light ก่อน (charts จะ init per-panel ใน step 6)
  const wasDark = document.body.classList.contains('dark');
  if (wasDark) {
    document.body.classList.remove('dark');
    destroyAllCharts();
    setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
    await new Promise(r => setTimeout(r, 300));
    // หมายเหตุ: ไม่เรียก initTab ที่นี่ → จะ init per-panel ในขณะที่ panel visible (step 6)
  }

  // 2. จำสถานะเดิม
  const panels = document.querySelectorAll('.tab-panel');
  const origDisplay = [];
  panels.forEach((p, i) => { origDisplay[i] = p.style.display; });
  const origZoom = document.body.style.zoom;

  // 3. ซ่อน UI controls ที่ไม่ต้องการใน PDF
  const hideSelectors = '.main-tabs, .ctrl-panel, .pin-bar, .no-print';
  const hideEls = document.querySelectorAll(hideSelectors);
  const origHide = [];
  hideEls.forEach((el, i) => { origHide[i] = el.style.display; el.style.display = 'none'; });

  // 4. Reset zoom
  document.body.style.zoom = '1';

  // ใช้ TAB_NAMES (ไทย) สำหรับ Toast, TAB_NAMES_PDF (อังกฤษ) สำหรับ PDF header
  let tabsOK = 0;
  let tabsFail = 0;
  const pageCounter = { current: 0 }; // นับเลขหน้าต่อเนื่อง (Cover ไม่นับ)

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const A4W = 210, A4H = 297, MARGIN = 12; // เพิ่ม margin 5→12mm ป้องกันเนื้อหาตกขอบ

    // ===== 5. Cover page =====
    try {
      const coverEl = createCoverPage();
      await new Promise(r => setTimeout(r, 500));
      const coverCanvas = await html2canvas(coverEl, {
        scale: 2, useCORS: true, logging: false, backgroundColor: null,
        width: 794, height: 1123
      });
      const coverData = coverCanvas.toDataURL('image/jpeg', 0.9);
      // ใส่ cover เป็นหน้าแรก (pdf เริ่มมี 1 หน้าอยู่แล้ว)
      pdf.addImage(coverData, 'JPEG', 0, 0, A4W, A4H);
      coverEl.remove();
    } catch (coverErr) {
      console.error('PDF Cover error:', coverErr);
      // ถ้า cover fail ก็ไม่เป็นไร — ใช้หน้าเปล่าแทน
    }

    // ===== 6. Capture ทีละ Tab — Section-by-Section + Smart Slice =====
    const tabsToExport = [1, 2, 3, 4, 5, 6, 7];

    for (const tabIdx of tabsToExport) {
      try {
        showToast('⏳ กำลังแคป Tab ' + tabIdx + '/7: ' + TAB_NAMES[tabIdx] + '...');

        // แสดงเฉพาะ tab ที่จะ capture
        panels.forEach((p, i) => {
          p.style.display = (i === tabIdx) ? 'block' : 'none';
        });

        // Init charts AFTER panel visible เพื่อให้ canvas ได้ขนาดที่ถูกต้อง
        // dark mode: re-draw income/tax charts ด้วย light theme colors
        if (wasDark && tabIdx === 2) window.reDrawChartsForPanel?.(2);
        if (wasDark && tabIdx === 3) window.reDrawChartsForPanel?.(3);
        // lazy-init สำหรับ flagged tabs (panels 4-7)
        if (tabIdx === 4 && !tab2Init) window.initTab2();
        if (tabIdx === 5 && !tab3Init) window.initTab3();
        if (tabIdx === 6 && !tab4Init) window.initTab4();
        if (tabIdx === 7 && !tab5Init) window.initTab5();

        // รอ render (กราฟ + layout) — เพิ่มเวลาให้ Chart.js resize + repaint
        await new Promise(r => setTimeout(r, 800));

        const panel = document.getElementById('panel-' + tabIdx);
        if (!panel) { tabsFail++; continue; }

        // ใช้ section-by-section capture (ไม่ตัดผ่ากลางแถว)
        const sections = getSectionsForPanel(panel);
        if (sections.length > 0) {
          await addSectionsToPDF(pdf, sections, A4W, A4H, MARGIN, TAB_NAMES_PDF[tabIdx], pageCounter);
        } else {
          // Fallback: ถ้าหา section ไม่ได้ → ใช้วิธีเดิม
          const tabCanvas = await html2canvas(panel, {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: '#F0F4F8',
            windowWidth: Math.min(panel.scrollWidth, 1200)
          });
          addCanvasToPDF(pdf, tabCanvas, A4W, A4H, MARGIN, TAB_NAMES_PDF[tabIdx], pageCounter);
        }
        tabsOK++;

      } catch (tabErr) {
        tabsFail++;
        console.error('PDF Tab ' + tabIdx + ' (' + TAB_NAMES[tabIdx] + ') error:', tabErr);
        showToast('⚠️ แคป Tab ' + TAB_NAMES[tabIdx] + ' ไม่สำเร็จ — ข้ามไป');
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // ===== 7. บันทึก PDF พร้อม timestamp =====
    if (tabsOK === 0) {
      showToast('❌ ไม่สามารถแคป Tab ได้เลย — ยกเลิกการสร้าง PDF');
      console.error('PDF Export: ไม่มี tab สำเร็จแม้แต่ tab เดียว');
    } else {
      showToast('⏳ กำลังบันทึก PDF...');

      const now = new Date();
      const dateStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
      const timeStr = String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
      const safeName = (activeProfile.name || 'Report').replace(/\s+/g, '_');
      const fileName = 'EarlyRetire_' + safeName + '_' + dateStr + '_' + timeStr + '.pdf';

      pdf.save(fileName);

      const msg = tabsFail > 0
        ? '📄 PDF สำเร็จ (' + tabsOK + '/7 tabs) ⚠️ ' + tabsFail + ' tabs ข้าม → ' + fileName
        : '📄 ดาวน์โหลด PDF สำเร็จ! → ' + fileName;
      showToast(msg);
    }

  } catch (err) {
    showToast('❌ สร้าง PDF ไม่สำเร็จ: ' + err.message);
    console.error('PDF Export fatal error:', err);
  }

  // 8. คืนสถานะเดิม
  document.body.style.zoom = origZoom;
  panels.forEach((p, i) => p.style.display = origDisplay[i]);
  hideEls.forEach((el, i) => el.style.display = origHide[i]);
  // คืน dark mode (ถ้าเคยเป็น dark) + reset tab flags ให้ charts re-render ใน dark theme
  if (wasDark) {
    document.body.classList.add('dark');
    destroyAllCharts();
    setTab2Init(false); setTab3Init(false); setTab4Init(false); setTab5Init(false);
  }
  pdfOverlay.remove(); // เอา overlay ออกหลังทุกอย่างเสร็จ
}
