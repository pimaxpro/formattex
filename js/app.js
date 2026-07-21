/* =========================================================
   PIMAX TOOL — MAIN APP LOGIC
   ========================================================= */

// Hàm chuyển đổi Menu chính (1: Chuẩn hóa LaTeX, 2: Lọc TikZ, 3: Chuyển PDF thành Ảnh)
function switchMainMenu(menuNum) {
  [1, 2, 3].forEach(n => {
    const section = document.getElementById(`menu-section-${n}`);
    const btn = document.getElementById(`nav-btn-${n}`);
    if (section) section.classList.add('hidden');
    if (btn) {
      btn.classList.remove('theme-btn-pimax');
      btn.classList.add('opacity-75');
    }
  });

  const activeSection = document.getElementById(`menu-section-${menuNum}`);
  const activeBtn = document.getElementById(`nav-btn-${menuNum}`);
  if (activeSection) activeSection.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('theme-btn-pimax');
    activeBtn.classList.remove('opacity-75');
  }

  if (window.lucide) lucide.createIcons();
}

// Bật/tắt Dark Mode
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('pimax_theme', isDark ? 'dark' : 'light');
  
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
  }
}

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('pimax_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.setAttribute('data-lucide', 'sun');
  }
  if (window.lucide) lucide.createIcons();
});
