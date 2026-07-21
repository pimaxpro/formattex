/* =========================================================
   PIMAX TOOL — APPLICATION CONTROLLER (APP.JS FULL)
   ========================================================= */

// Đồng bộ biến toàn cục chọn chế độ
window.subModeEx = 1; // 1: \choice, 2: \choiceTF, 3: \shortans
window.currentMainMenu = 1;

/* =========================================================
   1. ĐIỀU HƯỚNG MENU CHÍNH
   ========================================================= */
function switchMainMenu(menuIndex) {
  window.currentMainMenu = menuIndex;

  const activeClass = "px-4 py-2 text-xs font-bold rounded transition-all flex items-center space-x-2 bg-white text-slate-900 border border-slate-300 shadow-sm cursor-pointer";
  const inactiveClass = "px-4 py-2 text-xs font-semibold rounded transition-all flex items-center space-x-2 bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent cursor-pointer";

  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`nav-btn-${i}`);
    const section = document.getElementById(`menu-section-${i}`);

    if (btn) {
      btn.className = (i === menuIndex) ? activeClass : inactiveClass;
    }

    if (section) {
      if (i === menuIndex) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* =========================================================
   2. ĐIỀU HƯỚNG SUB-MODE (CN1, CN2, CN3)
   ========================================================= */
function switchSubMode(mode) {
  // Gán trực tiếp giá trị vào window.subModeEx
  window.subModeEx = mode;

  const activeClass = "px-4 py-2 text-xs font-bold rounded transition-all flex items-center space-x-2 bg-white text-slate-900 border border-slate-300 shadow-sm cursor-pointer";
  const inactiveClass = "px-4 py-2 text-xs font-semibold rounded transition-all flex items-center space-x-2 bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent cursor-pointer";

  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`sub-btn-${i}`);
    if (!btn) continue;

    if (i === mode) {
      btn.className = activeClass;
      const badge = btn.querySelector('span:last-child');
      if (badge) {
        badge.className = "text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200";
      }
    } else {
      btn.className = inactiveClass;
      const badge = btn.querySelector('span:last-child');
      if (badge) {
        badge.className = "text-[10px] font-mono bg-slate-200/60 text-slate-500 px-2 py-0.5 rounded border border-transparent";
      }
    }
  }

  const labelEl = document.getElementById('current-mode-label');
  const btnLabelEl = document.getElementById('btn-ex-label');

  if (mode === 1) {
    if (labelEl) labelEl.textContent = "Chế độ: Trắc nghiệm 4 phương án (\\choice)";
    if (btnLabelEl) btnLabelEl.textContent = "Chuẩn Hóa Ngay (CN 1)";
  } else if (mode === 2) {
    if (labelEl) labelEl.textContent = "Chế độ: Trắc nghiệm Đúng / Sai (a, b, c, d)";
    if (btnLabelEl) btnLabelEl.textContent = "Chuẩn Hóa Ngay (CN 2)";
  } else if (mode === 3) {
    if (labelEl) labelEl.textContent = "Chế độ: Trả lời ngắn (\\shortans)";
    if (btnLabelEl) btnLabelEl.textContent = "Chuẩn Hóa Ngay (CN 3)";
  }
}

/* =========================================================
   3. TỰ ĐỘNG KHỞI TẠO KHI TẢI TRANG DOM
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  switchMainMenu(1);
  switchSubMode(1);
});
