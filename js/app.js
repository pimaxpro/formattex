lucide.createIcons();

let activeMainMenu = 1;
function switchMainMenu(menuIndex) {
  activeMainMenu = menuIndex;
  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`nav-btn-${i}`);
    const sec = document.getElementById(`menu-section-${i}`);
    if (i === menuIndex) {
      btn.className = "px-4 py-2 text-xs font-semibold transition-all flex items-center space-x-2 theme-btn-dark";
      sec.classList.remove('hidden');
    } else {
      btn.className = "px-4 py-2 text-xs font-semibold transition-all flex items-center space-x-2 opacity-75 hover:opacity-100";
      sec.classList.add('hidden');
    }
  }
}

let subModeEx = 1;
function switchSubMode(mode) {
  subModeEx = mode;
  const btn1 = document.getElementById('sub-btn-1');
  const btn2 = document.getElementById('sub-btn-2');
  const btn3 = document.getElementById('sub-btn-3');
  const desc = document.getElementById('sub-mode-desc');
  const label = document.getElementById('btn-ex-label');

  [btn1, btn2, btn3].forEach(b => {
    b.className = "px-3 py-1.5 text-xs font-semibold transition flex items-center justify-center space-x-1.5 opacity-75 hover:opacity-100 whitespace-nowrap";
  });

  if (mode === 1) {
    btn1.className = "px-3 py-1.5 text-xs font-semibold transition flex items-center justify-center space-x-1.5 theme-btn-dark whitespace-nowrap";
    desc.innerHTML = "Chế độ: <b>Trắc nghiệm 4 phương án (A, B, C, D)</b>";
    label.innerText = "Chuẩn Hóa Ngay (CN 1)";
  } else if (mode === 2) {
    btn2.className = "px-3 py-1.5 text-xs font-semibold transition flex items-center justify-center space-x-1.5 theme-btn-dark whitespace-nowrap";
    desc.innerHTML = "Chế độ: <b>Trắc nghiệm Đúng/Sai (a, b, c, d)</b>";
    label.innerText = "Chuẩn Hóa Ngay (CN 2)";
  } else {
    btn3.className = "px-3 py-1.5 text-xs font-semibold transition flex items-center justify-center space-x-1.5 theme-btn-dark whitespace-nowrap";
    desc.innerHTML = "Chế độ: <b>Trắc nghiệm trả lời ngắn (\\shortans)</b>";
    label.innerText = "Chuẩn Hóa Ngay (CN 3)";
  }
}

function toggleDarkMode() {
  const body = document.body;
  const icon = document.getElementById('theme-icon');
  
  body.classList.toggle('dark');
  const isDark = body.classList.contains('dark');
  
  if (isDark) {
    icon.setAttribute('data-lucide', 'sun');
    localStorage.setItem('pimax_theme', 'dark');
  } else {
    icon.setAttribute('data-lucide', 'moon');
    localStorage.setItem('pimax_theme', 'light');
  }
  lucide.createIcons();
}

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('pimax_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.setAttribute('data-lucide', 'sun');
    lucide.createIcons();
  }

  ['input-ex', 'output-ex', 'input-tikz', 'output-main', 'output-tikz-single'].forEach(id => {
    initHistory(id);
    const el = document.getElementById(id);
    if (el) {
      saveState(id, true);
    }
  });
});
