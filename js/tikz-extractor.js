/* =========================================================
   PIMAX TOOL — TIKZ EXTRACTION ENGINE
   ========================================================= */

function extractAllTikZToSingleFile() {
  const inputEl = document.getElementById('input-tikz');
  const outputMainEl = document.getElementById('output-main');
  const outputSingleTikzEl = document.getElementById('output-tikz-single');
  const containerSingle = document.getElementById('single-tikz-container');
  const badgeCount = document.getElementById('tikz-count-badge');

  if (!inputEl) return;
  const rawText = inputEl.value;

  if (!rawText.trim()) {
    alert("Vui lòng dán nội dung mã LaTeX cần lọc vào ô bên trái!");
    return;
  }

  // Regex bắt toàn bộ môi trường tikzpicture
  const tikzRegex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
  
  const extractedTikz = [];
  let match;

  while ((match = tikzRegex.exec(rawText)) !== null) {
    extractedTikz.push(match[0]);
  }

  if (extractedTikz.length === 0) {
    alert("Không tìm thấy môi trường \\begin{tikzpicture}...\\end{tikzpicture} nào trong mã!");
    return;
  }

  // 1. Loại bỏ toàn bộ khối TikZ khỏi File gốc
  const cleanedMainText = rawText.replace(tikzRegex, '% [ĐÃ TÁCH HÌNH TIKZ TẠI ĐÂY]');
  
  if (outputMainEl) {
    outputMainEl.value = cleanedMainText;
    if (typeof handleInput === 'function') handleInput('output-main');
  }

  // 2. Gom tất cả khối TikZ nối tiếp vào ô kết quả TikZ tổng
  let singleTikzContent = `% ==========================================\n`;
  singleTikzContent += `% TỔNG HỢP ${extractedTikz.length} HÌNH TIKZ TỪ FILE GỐC\n`;
  singleTikzContent += `% Xuất từ PimaX Tool\n`;
  singleTikzContent += `% ==========================================\n\n`;

  extractedTikz.forEach((tikzCode, index) => {
    singleTikzContent += `% --- HÌNH TIKZ SO ${index + 1} ---\n`;
    singleTikzContent += tikzCode + `\n\n`;
  });

  if (outputSingleTikzEl) {
    outputSingleTikzEl.value = singleTikzContent.trim();
    if (typeof handleInput === 'function') handleInput('output-tikz-single');
  }

  // 3. Hiển thị khung kết quả & cập nhật số lượng hình
  if (containerSingle) containerSingle.classList.remove('hidden');
  if (badgeCount) badgeCount.textContent = `${extractedTikz.length} hình TikZ`;

  // Cuộn mượt xuống khung hình TikZ vừa tạo
  containerSingle?.scrollIntoView({ behavior: 'smooth' });
}

function getTikZFilename() {
  const nameInput = document.getElementById('file-name-tikz');
  const extSelect = document.getElementById('file-ext-tikz');
  const name = nameInput ? nameInput.value.trim() : 'tat_ca_hinh_tikz';
  const ext = extSelect ? extSelect.value : '.tex';
  return (name || 'tat_ca_hinh_tikz') + ext;
}
