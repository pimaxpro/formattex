/* =========================================================
   FORMATTEX — WEB EXPORTER MODULE (VỨT LÊN WEB)
   ========================================================= */

/**
 * Trích xuất nội dung bên trong cặp ngoặc nhọn cân bằng {}
 */
function extractBracedGroup(str, startIndex) {
  let depth = 0;
  let start = -1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: str.substring(start, i),
          endIndex: i
        };
      }
    }
  }
  return null;
}

/**
 * Lấy tất cả các nhóm ngoặc nhọn nối tiếp nhau (VD: \doa{1}{2}{3})
 */
function extractMultipleBracedGroups(str, startIndex) {
  const groups = [];
  let curr = startIndex;
  while (curr < str.length) {
    while (curr < str.length && /\s/.test(str[curr])) curr++;
    if (curr < str.length && str[curr] === '{') {
      const res = extractBracedGroup(str, curr);
      if (res) {
        groups.push(res.content);
        curr = res.endIndex + 1;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return { groups, endIndex: curr };
}

/**
 * Loại bỏ comment trong LaTeX (các đoạn bắt đầu bằng %)
 */
function stripLatexComments(text) {
  if (!text) return "";
  return text.split('\n').map(line => {
    return line.replace(/(^|[^\\])%.*/, (m) => {
      if (/%\s*\\ans\{/i.test(m) || /%\s*\\shortans\{/i.test(m)) {
        return m;
      }
      return '';
    });
  }).join('\n');
}

/**
 * Chuyển đổi các môi trường toán hiển thị (Display Math) thành toán dòng (Inline Math $...$)
 */
function convertDisplayMathToInline(text) {
  if (!text) return "";
  let converted = text;

  // 1. Chuyển \[...\] thành $...$
  converted = converted.replace(/\\\[([\s\S]*?)\\\]/g, (m, math) => `$${math.trim()}$`);

  // 2. Chuyển $$...$$ thành $...$
  converted = converted.replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => `$${math.trim()}$`);

  // 3. Chuyển \begin{equation}...\end{equation}, align, aligned, equation*
  const displayEnvs = ['equation', 'equation\\*', 'align', 'align\\*', 'gather', 'gather\\*'];
  displayEnvs.forEach(env => {
    const regex = new RegExp(`\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}`, 'gi');
    converted = converted.replace(regex, (m, math) => {
      const cleanMath = math.replace(/\\\\/g, ' ').replace(/\s+/g, ' ').trim();
      return `$${cleanMath}$`;
    });
  });

  return converted;
}

/**
 * Thêm dấu chấm vào cuối phương án nếu chưa có
 */
function ensureEndingDot(text) {
  if (!text) return "";
  let trimmed = text.trim();
  if (!/[.!?]$/.test(trimmed)) {
    trimmed += ".";
  }
  return trimmed;
}

/**
 * XÓA TOÀN BỘ CÁC LỆNH LATEX NGOÀI CÔNG THỨC TOÁN
 * Giữ nguyên văn bản tiếng Việt thường và các đoạn nằm trong $...$
 */
function stripOutsideLatexCommands(text) {
  if (!text) return "";

  // Tách văn bản thành các token: đoạn toán ($...$) và đoạn văn bản thường
  const tokens = text.split(/(\$[^$]+\$)/g);

  return tokens.map(token => {
    // Nếu là công thức toán $...$ thì giữ NGUYÊN VẸN 100%
    if (token.startsWith('$') && token.endsWith('$')) {
      return token;
    }

    // Nếu là văn bản thường -> Xóa sạch mọi lệnh LaTeX
    let cleaned = token;

    // 1. Tháo vỏ các lệnh định dạng văn bản có ngoặc nhọn: \textbf{abc} -> abc, \immini{đề}{hình} -> đề
    let cmdWithBraceRegex = /\\([a-zA-Z]+)\s*\{/g;
    let match;
    while ((match = cmdWithBraceRegex.exec(cleaned)) !== null) {
      const cmdName = match[1];
      const res1 = extractBracedGroup(cleaned, match.index + match[0].length - 1);
      if (res1) {
        // Nếu là \immini thì ăn tiếp ngoặc thứ 2 (hình) và chỉ giữ lại văn bản ở ngoặc thứ nhất
        if (cmdName === 'immini') {
          const res2 = extractBracedGroup(cleaned, res1.endIndex + 1);
          const endIndex = res2 ? res2.endIndex : res1.endIndex;
          cleaned = cleaned.substring(0, match.index) + res1.content + cleaned.substring(endIndex + 1);
        } else {
          // Các lệnh khác: \textbf, \textit, \texttt, \textsl,... chỉ lấy ruột
          cleaned = cleaned.substring(0, match.index) + res1.content + cleaned.substring(res1.endIndex + 1);
        }
        cmdWithBraceRegex.lastIndex = match.index;
      } else {
        break;
      }
    }

    // 2. Xóa các lệnh LaTeX đơn không ngoặc (VD: \noindent, \hfill, \vfill, \\, \cr,...)
    cleaned = cleaned.replace(/\\([a-zA-Z]+)\b/g, '');
    cleaned = cleaned.replace(/\\\\/g, '\n');

    // 3. Xóa các ký tự đóng mở ngoặc nhọn mồ côi {}
    cleaned = cleaned.replace(/[{}]/g, '');

    return cleaned;
  }).join('');
}

/**
 * Làm sạch văn bản tổng thể
 */
function cleanTextForWeb(text) {
  if (!text) return "";

  let cleaned = text;

  // 1. Chuyển Display Math sang Inline $...$
  cleaned = convertDisplayMathToInline(cleaned);

  // 2. Xóa khối \loigiai{...}
  const loigiaiRegex = /\\loigiai\s*\{/g;
  let match;
  while ((match = loigiaiRegex.exec(cleaned)) !== null) {
    const res = extractBracedGroup(cleaned, match.index + match[0].length - 1);
    if (res) {
      cleaned = cleaned.substring(0, match.index) + cleaned.substring(res.endIndex + 1);
      loigiaiRegex.lastIndex = match.index;
    } else {
      break;
    }
  }

  // 3. Xóa các môi trường TikZ, Center, Immini
  cleaned = cleaned.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{immini\}[\s\S]*?\\end\{immini\}/gi, '');

  // 4. Chuyển itemize thành danh sách gạch đầu dòng "-"
  cleaned = cleaned.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gi, (m, body) => {
    return '\n' + body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `- ${item}`)
      .join('\n');
  });

  // 5. Chuyển enumerate thành danh sách số "1., 2.,..."
  cleaned = cleaned.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi, (m, body) => {
    let count = 1;
    return '\n' + body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `${count++}. ${item}`)
      .join('\n');
  });

  // 6. Xóa triệt để các comment đáp án đặc biệt sót lại trong nội dung đề bài
  cleaned = cleaned.replace(/%\s*\\ans\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/%\s*\\shortans\{[^}]*\}/gi, '');

  // 7. QUÉT VÀ XÓA SACH TẤT CẢ LỆNH LATEX NGOÀI CÔNG THỨC TOÁN
  cleaned = stripOutsideLatexCommands(cleaned);

  // 8. Thu gọn các dòng trống liên tiếp
  const lines = cleaned.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return lines.join('\n');
}

/**
 * Kiểm tra xem câu hỏi có chứa hình vẽ/môi trường đồ họa bị gỡ bỏ không
 */
function hasGraphicElement(exContent) {
  return /\\begin\{tikzpicture\}/i.test(exContent) || 
         /\\immini/i.test(exContent) || 
         /\\begin\{center\}/i.test(exContent);
}

/**
 * Xử lý chính cho chức năng "Vứt lên web"
 */
function processWebExporter() {
  const inputEl = document.getElementById('input-web');
  const outputEl = document.getElementById('output-web');

  if (!inputEl || !outputEl) return;

  let rawText = inputEl.value;
  if (!rawText.trim()) {
    alert('Vui lòng nhập mã LaTeX gốc vào ô Input!');
    return;
  }

  // 0. Xóa sạch comment LaTeX cũ trước khi phân tích
  rawText = stripLatexComments(rawText);

  // Tách từng câu \begin{ex}...\end{ex}
  const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/gi;
  let exMatch;
  let questionIndex = 1;
  const results = [];

  while ((exMatch = exRegex.exec(rawText)) !== null) {
    const exContent = exMatch[1];
    let processedQuestion = `Câu ${questionIndex}. `;
    let errorMessage = "";
    const needsImageNote = hasGraphicElement(exContent);

    // -------------------------------------------------------------
    // LOẠI 1: CÂU TRẮC NGHIỆM 4 PHƯƠNG ÁN (\choice hoặc \choice*)
    // -------------------------------------------------------------
    if (/\\choice\b/i.test(exContent)) {
      const choiceIdx = exContent.search(/\\choice\b/i);
      const stemRaw = exContent.substring(0, choiceIdx);
      const stemClean = cleanTextForWeb(stemRaw);

      const rest = exContent.substring(choiceIdx + 7); // Bỏ \choice
      const { groups } = extractMultipleBracedGroups(rest, 0);

      const labels = ['A', 'B', 'C', 'D'];
      let correctAnsLabel = '';
      const choicesFormatted = [];

      groups.slice(0, 4).forEach((g, idx) => {
        let text = cleanTextForWeb(g.trim());
        if (text.startsWith('\\True') || text.startsWith('True')) {
          correctAnsLabel = labels[idx];
          text = text.replace(/^(\\True|True)\s*/, '').trim();
        }
        text = ensureEndingDot(text);
        choicesFormatted.push(`${labels[idx]}. ${text}`);
      });

      processedQuestion += stemClean;
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }
      processedQuestion += '\n' + choicesFormatted.join('\n');

      if (correctAnsLabel) {
        processedQuestion += `\nĐáp án TN: ${correctAnsLabel}`;
      } else {
        processedQuestion += `\nĐáp án TN: `;
        errorMessage = "Câu này thiếu đáp án";
      }
    }

    // -------------------------------------------------------------
    // LOẠI 2: CÂU HỎI ĐÚNG / SAI (\choiceTF hoặc \choiceTFt)
    // -------------------------------------------------------------
    else if (/\\choiceTF[t]?\b/i.test(exContent)) {
      const choiceIdx = exContent.search(/\\choiceTF[t]?\b/i);
      const stemRaw = exContent.substring(0, choiceIdx);
      const stemClean = cleanTextForWeb(stemRaw);

      const matchTF = exContent.match(/\\choiceTF[t]?\b/i);
      const rest = exContent.substring(choiceIdx + matchTF[0].length);
      const { groups } = extractMultipleBracedGroups(rest, 0);

      const labels = ['a', 'b', 'c', 'd'];
      const tfResults = [];
      const choicesFormatted = [];
      let hasAnyTrue = false;

      groups.slice(0, 4).forEach((g, idx) => {
        let text = cleanTextForWeb(g.trim());
        if (text.startsWith('\\True') || text.startsWith('True')) {
          tfResults.push('D');
          hasAnyTrue = true;
          text = text.replace(/^(\\True|True)\s*/, '').trim();
        } else {
          tfResults.push('S');
        }
        text = ensureEndingDot(text);
        choicesFormatted.push(`${labels[idx]}) ${text}`);
      });

      processedQuestion += stemClean;
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }
      processedQuestion += '\n' + choicesFormatted.join('\n');
      processedQuestion += `\nĐáp án DS: ${tfResults.join('|')}`;

      if (!hasAnyTrue) {
        errorMessage = "Câu này thiếu đáp án";
      }
    }

    // -------------------------------------------------------------
    // LOẠI 3: CÂU HỎI KÉO THẢ (\doa và \ans{})
    // -------------------------------------------------------------
    else if (/\\doa\b/i.test(exContent) || /\\dienkt\b/i.test(exContent)) {
      let stemRaw = exContent;

      // 1. Trích xuất danh sách \doa{1}{2}{3}...
      let doaString = "";
      if (/\\doa\b/i.test(stemRaw)) {
        const doaIdx = stemRaw.search(/\\doa\b/i);
        const { groups, endIndex } = extractMultipleBracedGroups(stemRaw, doaIdx + 4);
        if (groups.length > 0) {
          doaString = groups.map(g => `$${cleanTextForWeb(g.trim())}$`).join(' @ ');
        }
        stemRaw = stemRaw.substring(endIndex);
      }

      // 2. Trích xuất đáp án từ %\ans{C|A}
      let ansList = [];
      const ansMatch = exContent.match(/%\s*\\ans\{([^}]+)\}/i);
      if (ansMatch) {
        ansList = ansMatch[1].split('|').map(a => a.trim());
      }

      // 3. Thay thế tất cả \dienkt thành <KT/>
      let dienktCount = 0;
      stemRaw = stemRaw.replace(/\\dienkt\b/g, () => {
        dienktCount++;
        return '<KT/>';
      });

      const stemClean = cleanTextForWeb(stemRaw);

      if (doaString) {
        processedQuestion += doaString + '\n' + stemClean;
      } else {
        processedQuestion += stemClean;
      }

      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }

      const formattedAns = ansList.map(a => `${a}>`).join('|');
      processedQuestion += `\nĐáp án KT: ${formattedAns}`;

      if (dienktCount === 0 || ansList.length === 0 || dienktCount !== ansList.length) {
        errorMessage = "Câu này thiếu đáp án";
      }
    }

    // -------------------------------------------------------------
    // LOẠI 4: CÂU TRẢ LỜI NGẮN (\dienkq và %\shortans{})
    // -------------------------------------------------------------
    else if (/\\dienkq\b/i.test(exContent) || /%\s*\\shortans/i.test(exContent)) {
      let stemRaw = exContent;

      stemRaw = stemRaw.replace(/\\dienkq\b/g, '__________');

      let shortansVal = "";
      const shortansMatch = exContent.match(/%\s*\\shortans\{([^}]+)\}/i);
      if (shortansMatch) {
        shortansVal = shortansMatch[1].trim();
      }

      const stemClean = cleanTextForWeb(stemRaw);

      processedQuestion += stemClean;
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }

      if (shortansVal) {
        processedQuestion += `\nĐáp án TLN: ${shortansVal}`;
      } else {
        processedQuestion += `\nĐáp án TLN: `;
        errorMessage = "Câu này thiếu đáp án";
      }
    }

    // -------------------------------------------------------------
    // MẶC ĐỊNH: NẾU KHÔNG THUỘC CÁC LOẠI TRÊN
    // -------------------------------------------------------------
    else {
      const stemClean = cleanTextForWeb(exContent);
      processedQuestion += stemClean;
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }
      errorMessage = "Câu này thiếu đáp án";
    }

    if (errorMessage) {
      processedQuestion += `\n${errorMessage}`;
    }

    results.push(processedQuestion);
    questionIndex++;
  }

  // Cập nhật lên thẻ textarea Output
  outputEl.value = results.join('\n\n');

  // Cập nhật lại thanh line numbers nếu có dùng editor.js
  if (typeof handleInput === 'function') {
    handleInput('output-web');
  }
}
