function extractAllTikZToSingleFile() {
  const input = document.getElementById('input-tikz').value;
  if (!input.trim()) return;

  const tikzRegex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
  const matches = input.match(tikzRegex);

  if (!matches || matches.length === 0) {
    alert('Không tìm thấy môi trường \\begin{tikzpicture} nào trong dữ liệu!');
    return;
  }

  let count = 0;
  let combinedTikZContent = `% ==============================================\n`;
  combinedTikZContent += `% TỔNG HỢP TẤT CẢ HÌNH TIKZ (${matches.length} HÌNH)\n`;
  combinedTikZContent += `% ==============================================\n\n`;

  const modifiedMainContent = input.replace(tikzRegex, (match) => {
    count++;
    combinedTikZContent += `% --- HÌNH SỐ ${count} ---\n${match}\n\n`;
    return `% [Đã bóc tách hình TikZ số ${count}]`;
  });

  setEditorValue('output-main', cleanTextSpacingAndLines(modifiedMainContent));
  setEditorValue('output-tikz-single', cleanTextSpacingAndLines(combinedTikZContent.trim()));

  document.getElementById('tikz-count-badge').textContent = `${matches.length} hình TikZ`;
  document.getElementById('single-tikz-container').classList.remove('hidden');
  lucide.createIcons();
}

function getTikZFilename() {
  const name = document.getElementById('file-name-tikz').value || 'tat_ca_hinh_tikz';
  const ext = document.getElementById('file-ext-tikz').value || '.tex';
  return `${name}${ext}`;
}
