/* =========================================================
   PIMAX TOOL — APPLICATION CONTROLLER (APP.JS FULL - SQUARE UI)
   ========================================================= */

// Trạng thái ứng dụng hiện tại
let currentMainMenu = 1; // 1: Chuẩn hóa LaTeX, 2: Lọc TikZ, 3: Chuyển PDF thành ảnh
let currentSubMode = 1;  // 1: \choice, 2: \choiceTF, 3: \shortans

/* =========================================================
   1. ĐIỀU HƯỚNG MENU CHÍNH (VUÔNG VỨC GÓC CẠNH - MÀU PIMAX)
   ========================================================= */
function switchMainMenu(menuIndex) {
  currentMainMenu = menuIndex;

  // Lớp CSS chuẩn vuông vức (rounded-none) cho Menu Chính
  const activeClass = "px-4 py-2 text-xs font-bold rounded-none transition-all flex items-center space-x-2 bg-rose-700 text-white shadow-md cursor-pointer border border-rose-800";
  const inactiveClass = "px-4 py-2 text-xs font-semibold rounded-none transition-all flex items-center space-x-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 shadow-sm cursor-pointer";

  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`nav-btn-${i}`);
    const section = document.getElementById(`menu-section-${i}`);

    if (btn) {
      if (i === menuIndex) {
        btn.className = activeClass;
      } else {
        btn.className = inactiveClass;
      }
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
   2. ĐIỀU HƯỚNG MENU PHỤ (SUB-MODE - VUÔNG VỨC GÓC CẠNH)
   ========================================================= */
function switchSubMode(mode) {
  currentSubMode = mode;

  // Lớp CSS chuẩn vuông vức (rounded-none) cho Sub-Mode
  const activeClass = "px-4 py-2 text-xs font-bold rounded-none transition-all flex items-center space-x-2 bg-rose-700 text-white shadow-md cursor-pointer border border-rose-800";
  const inactiveClass = "px-4 py-2 text-xs font-semibold rounded-none transition-all flex items-center space-x-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 shadow-sm cursor-pointer";

  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`sub-btn-${i}`);
    if (!btn) continue;

    if (i === mode) {
      btn.className = activeClass;
      const badge = btn.querySelector('span:last-child');
      if (badge) {
        badge.className = "text-[10px] font-mono bg-rose-900/60 text-rose-100 px-2 py-0.5 rounded-none border border-rose-500/40";
      }
    } else {
      btn.className = inactiveClass;
      const badge = btn.querySelector('span:last-child');
      if (badge) {
        badge.className = "text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-none border border-slate-200 dark:border-slate-700";
      }
    }
  }

  // Cập nhật nhãn trạng thái chế độ
  const labelEl = document.getElementById('current-mode-label');
  const btnLabelEl = document.getElementById('btn-ex-label');

  if (mode === 1) {
    if (labelEl) labelEl.textContent = "Chế độ: Trắc nghiệm 4 phương án (\\choice)";
    if (btnLabelEl) btnLabelEl.textContent = "Chuẩn Hóa Ngay (Trắc nghiệm)";
  } else if (mode === 2) {
    if (labelEl) labelEl.textContent = "Chế độ: Câu hỏi Đúng / Sai (\\choiceTF)";
    if (btnLabelEl) btnLabelEl.textContent = "Chuẩn Hóa Ngay (Đúng / Sai)";
  } else if (mode === 3) {
    if (labelEl) labelEl.textContent = "Chế độ: Trả lời ngắn (\\shortans)";
    if (btnLabelEl) btnLabelEl.textContent = "Chuẩn Hóa Ngay (Trả lời ngắn)";
  }
}

/* =========================================================
   3. CHUYỂN ĐỔI CHẾ ĐỘ SÁNG / TỐI (DARK / LIGHT MODE)
   ========================================================= */
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  const icon = document.getElementById('theme-icon');

  if (icon) {
    if (isDark) {
      icon.setAttribute('data-lucide', 'sun');
    } else {
      icon.setAttribute('data-lucide', 'moon');
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* =========================================================
   4. TỰ ĐỘNG KHỞI TẠO KHI TẢI TRANG DOM
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  switchMainMenu(1);
  switchSubMode(1);
});
