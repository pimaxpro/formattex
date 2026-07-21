// Quản lý Chuyển Menu Chính
function switchMainMenu(menuNum) {
  // Hide all sections
  [1, 2, 3].forEach(n => {
    const section = document.getElementById(`menu-section-${n}`);
    const btn = document.getElementById(`nav-btn-${n}`);
    if (section) section.classList.add('hidden');
    if (btn) {
      btn.classList.remove('theme-btn-dark', 'theme-btn-pimax');
      btn.classList.add('opacity-75');
    }
  });

  // Show active section & highlight button
  const activeSection = document.getElementById(`menu-section-${menuNum}`);
  const activeBtn = document.getElementById(`nav-btn-${menuNum}`);
  if (activeSection) activeSection.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('theme-btn-dark');
    activeBtn.classList.remove('opacity-75');
  }

  // Refreshes Lucide icons
  if (window.lucide) lucide.createIcons();
}

// Quản lý Chuyển Sub-Mode (CN 1, CN 2, CN 3)
function switchSubMode(modeNum) {
  [1, 2, 3].forEach(n => {
    const btn = document.getElementById(`sub-btn-${n}`);
    if (btn) {
      btn.classList.remove('theme-btn-dark', 'theme-btn-pimax');
      btn.classList.add('opacity-75');
    }
  });

  const activeSubBtn = document.getElementById(`sub-btn-${modeNum}`);
  if (activeSubBtn) {
    activeSubBtn.classList.add('theme-btn-dark');
    activeSubBtn.classList.remove('opacity-75');
  }

  // Cập nhật nhãn thông báo & nhãn nút Chuẩn hóa
  const desc = document.getElementById('sub-mode-desc');
  const label = document.getElementById('btn-ex-label');

  if (modeNum === 1) {
    if (desc) desc.innerHTML = 'Chế độ: <b>Trắc nghiệm 4 phương án (A, B, C, D)</b>';
    if (label) label.innerText = 'Chuẩn Hóa Ngay (CN 1)';
  } else if (modeNum === 2) {
    if (desc) desc.innerHTML = 'Chế độ: <b>Trắc nghiệm Đúng / Sai (a, b, c, d)</b>';
    if (label) label.innerText = 'Chuẩn Hóa Ngay (CN 2)';
  } else if (modeNum === 3) {
    if (desc) desc.innerHTML = 'Chế độ: <b>Trả lời ngắn / Tự luận</b>';
    if (label) label.innerText = 'Chuẩn Hóa Ngay (CN 3)';
  }

  window.currentExSubMode = modeNum;
}

// Quản lý Dark / Light Mode
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('pimax_theme', isDark ? 'dark' : 'light');
  
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
  }
}

// Khởi tạo trạng thái ban đầu khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('pimax_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.setAttribute('data-lucide', 'sun');
  }
  if (window.lucide) lucide.createIcons();
});
