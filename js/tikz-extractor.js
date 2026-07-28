/* =========================================================
   PIMAX TOOL — TIKZ EXTRACTION ENGINE
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

  // CHẾ ĐỘ 1: CHỈ LỌC TIKZ Ở ĐỀ BÀI ( BỎ QUA TIKZ TRONG \loigiai{} )
  if (mode === 'stem_only') {
    const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/gi;
    let exMatch;

    while ((exMatch = exRegex.exec(rawText)) !== null) {
      const exBody = exMatch[1];
      
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

      while ((tikzMatch = tikzRegex.exec(exBody)) !== null) {
        const matchIdx = tikzMatch.index;

        // Nếu TikZ nằm trong lời giải -> Bỏ qua
        if (loigiaiStart !== -1 && matchIdx >= loigiaiStart && matchIdx <= loigiaiEnd) {
          continue;
        }

        // TikZ nằm ở phần đề bài -> Lọc ra
        extractedTikz.push(tikzMatch[0]);
      }
    }

  } else {
    // CHẾ ĐỘ 2: LỌC TẤT CẢ TIKZ TRONG FILE
    const tikzRegex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
    let match;

    while ((match = tikzRegex.exec(rawText)) !== null) {
      extractedTikz.push(match[0]);
    }
  }

  if (extractedTikz.length === 0) {
    alert(mode === 'stem_only' 
      ? "Không tìm thấy hình TikZ nào trong phần ĐỀ BÀI!" 
      : "Không tìm thấy môi trường \\begin{tikzpicture}...\\end{tikzpicture} nào trong mã!");
    return;
  }

  // Gom toàn bộ khối TikZ đổ thẳng vào Editor cột bên phải (#output-main)
  let singleTikzContent = `% ==========================================\n`;
  singleTikzContent += `% TỔNG HỢP ${extractedTikz.length} HÌNH TIKZ TỪ FILE GỐC (${mode === 'stem_only' ? 'ĐỀ BÀI' : 'TOÀN BỘ'})\n`;
  singleTikzContent += `% Xuất từ PimaX Tool\n`;
  singleTikzContent += `% ==========================================\n\n`;

  extractedTikz.forEach((tikzCode, index) => {
    singleTikzContent += `% --- HÌNH TIKZ SO ${index + 1} ---\n`;
    singleTikzContent += tikzCode + `\n\n`;
  });

  if (outputMainEl) {
    outputMainEl.value = singleTikzContent.trim();
    if (typeof handleInput === 'function') handleInput('output-main');
  }

  // Cập nhật số lượng hình ở badge trên tiêu đề cột phải
  if (badgeCount) badgeCount.textContent = `${extractedTikz.length} hình TikZ`;
}

function getTikZFilename() {
  const nameInput = document.getElementById('file-name-tikz');
  const extSelect = document.getElementById('file-ext-tikz');
  const name = nameInput ? nameInput.value.trim() : 'tat_ca_hinh_tikz';
  const ext = extSelect ? extSelect.value : '.tex';
  return (name || 'tat_ca_hinh_tikz') + ext;
}
