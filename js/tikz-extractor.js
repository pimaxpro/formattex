/* =========================================================
   PIMAX TOOL — TIKZ EXTRACTION ENGINE (UPGRADE)
   ========================================================= */

/** Trích xuất 1 khối ngoặc nhọn cân bằng {} */
function extractBracedGroupTikz(str, startIndex) {
  let depth = 0;
  let start = -1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '\\' && (i + 1 < str.length) && (str[i + 1] === '{' || str[i + 1] === '}')) {
      i++;
      continue;
    }
    if (str[i] === '{') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.substring(start, i), startIndex: start - 1, endIndex: i };
      }
    }
  }
  return null;
}

function extractAllTikZToSingleFile() {
  const inputEl = document.getElementById('input-tikz');
  const outputMainEl = document.getElementById('output-main');
  const outputSingleTikzEl = document.getElementById('output-tikz-single');
  const containerSingle = document.getElementById('single-tikz-container');
  const badgeCount = document.getElementById('tikz-count-badge');
  const filterModeSelect = document.getElementById('tikz-filter-mode');

  if (!inputEl) return;
  const rawText = inputEl.value;

  if (!rawText.trim()) {
    alert("Vui lòng dán nội dung mã LaTeX cần lọc vào ô bên trái!");
    return;
  }

  const mode = filterModeSelect ? filterModeSelect.value : 'all';
  const extractedTikz = [];
  let cleanedMainText = rawText;

  // CHẾ ĐỘ 1: CHỈ LỌC TIKZ Ở ĐỀ BÀI ( BỎ QUA TIKZ TRONG \loigiai{} )
  if (mode === 'stem_only') {
    const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/gi;
    
    cleanedMainText = cleanedMainText.replace(exRegex, (fullEx, exBody) => {
      // Xác định phạm vi \loigiai{}
      let loigiaiStart = -1;
      let loigiaiEnd = -1;
      const loigiaiMatch = /\\loigiai\s*\{/i.exec(exBody);

      if (loigiaiMatch) {
        const res = extractBracedGroupTikz(exBody, loigiaiMatch.index + loigiaiMatch[0].length - 1);
        if (res) {
          loigiaiStart = loigiaiMatch.index;
          loigiaiEnd = res.endIndex;
        }
      }

      // Tìm các khối TikZ trong câu ex này
      const tikzRegex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi;
      let tikzMatch;
      let newExBody = "";
      let lastIndex = 0;

      while ((tikzMatch = tikzRegex.exec(exBody)) !== null) {
        const matchIdx = tikzMatch.index;

        // Nếu TikZ nằm trong lời giải -> Giữ nguyên
        if (loigiaiStart !== -1 && matchIdx >= loigiaiStart && matchIdx <= loigiaiEnd) {
          continue;
        }

        // TikZ nằm ở phần đề bài -> Lọc ra
        extractedTikz.push(tikzMatch[0]);
        newExBody += exBody.substring(lastIndex, matchIdx) + '% [ĐÃ TÁCH HÌNH TIKZ ĐỀ BÀI TẠI ĐÂY]';
        lastIndex = tikzMatch.index + tikzMatch[0].length;
      }

      newExBody += exBody.substring(lastIndex);
      return `\\begin{ex}${newExBody}\\end{ex}`;
    });

  } else {
    // CHẾ ĐỘ 2: LỌC TẤT CẢ TIKZ TRONG FILE
    const tikzRegex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
    let match;

    while ((match = tikzRegex.exec(rawText)) !== null) {
      extractedTikz.push(match[0]);
    }

    cleanedMainText = rawText.replace(tikzRegex, '% [ĐÃ TÁCH HÌNH TIKZ TẠI ĐÂY]');
  }

  if (extractedTikz.length === 0) {
    alert(mode === 'stem_only' 
      ? "Không tìm thấy hình TikZ nào trong phần ĐỀ BÀI!" 
      : "Không tìm thấy môi trường \\begin{tikzpicture}...\\end{tikzpicture} nào trong mã!");
    return;
  }

  // 1. Cập nhật kết quả file gốc
  if (outputMainEl) {
    outputMainEl.value = cleanedMainText;
    if (typeof handleInput === 'function') handleInput('output-main');
  }

  // 2. Gom tất cả khối TikZ nối tiếp vào ô kết quả TikZ tổng
  let singleTikzContent = `% ==========================================\n`;
  singleTikzContent += `% TỔNG HỢP ${extractedTikz.length} HÌNH TIKZ TỪ FILE GỐC (${mode === 'stem_only' ? 'ĐỀ BÀI' : 'TOÀN BỘ'})\n`;
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

  containerSingle?.scrollIntoView({ behavior: 'smooth' });
}

function getTikZFilename() {
  const nameInput = document.getElementById('file-name-tikz');
  const extSelect = document.getElementById('file-ext-tikz');
  const name = nameInput ? nameInput.value.trim() : 'tat_ca_hinh_tikz';
  const ext = extSelect ? extSelect.value : '.tex';
  return (name || 'tat_ca_hinh_tikz') + ext;
}
