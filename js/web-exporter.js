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
 * Bỏ qua khoảng trắng và các dòng comment % nằm giữa các cặp ngoặc nhọn
 */
function skipWhitespaceAndComments(str, startIndex) {
  let curr = startIndex;
  while (curr < str.length) {
    // Bỏ qua khoảng trắng, tab, xuống dòng
    if (/\s/.test(str[curr])) {
      curr++;
      continue;
    }
    // Bỏ qua comment % cho đến hết dòng (trừ comment đáp án %\ans hoặc %\shortans)
    if (str[curr] === '%' && !/^%\s*\\(ans|shortans)\{/i.test(str.substring(curr))) {
      while (curr < str.length && str[curr] !== '\n') {
        curr++;
      }
      continue;
    }
    break;
  }
  return curr;
}

/**
 * Lấy tất cả các nhóm ngoặc nhọn nối tiếp nhau (VD: \choice {A} {B} {C} {D})
 */
function extractMultipleBracedGroups(str, startIndex) {
  const groups = [];
  let curr = startIndex;

  while (curr < str.length) {
    curr = skipWhitespaceAndComments(str, curr);
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
 * Loại bỏ comment % rác trong văn bản
 */
function cleanComments(text) {
  if (!text) return "";
  return text.split('\n').map(line => {
    if (/%\s*\\ans\{/i.test(line) || /%\s*\\shortans\{/i.test(line)) {
      return line;
    }
    return line.replace(/(^|[^\\])%.*/, '$1');
  }).join('\n');
}

/**
 * Chuyển Display Math thành Inline Math $...$
 */
function convertDisplayMathToInline(text) {
  if (!text) return "";
  let converted = text;

  // 1. \[...\] -> $...$
  converted = converted.replace(/\\\[([\s\S]*?)\\\]/g, (m, math) => `$${math.trim()}$`);

  // 2. $$...$$ -> $...$
  converted = converted.replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => `$${math.trim()}$`);

  // 3. các môi trường equation, align, gather
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
 * Làm sạch văn bản đề bài/phương án
 */
function cleanTextForWeb(text) {
  if (!text) return "";

  let cleaned = cleanComments(text);

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

  // 3. Xóa TikZ, Center, Immini
  cleaned = cleaned.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{immini\}[\s\S]*?\\end\{immini\}/gi, '');

  // 4. Lệnh \immini{văn bản}{hình} -> giữ văn bản
  const imminiRegex = /\\immini\s*\{/g;
  while ((match = imminiRegex.exec(cleaned)) !== null) {
    const arg1 = extractBracedGroup(cleaned, match.index + match[0].length - 1);
    if (arg1) {
      const arg2 = extractBracedGroup(cleaned, arg1.endIndex + 1);
      const endIndex = arg2 ? arg2.endIndex : arg1.endIndex;
      cleaned = cleaned.substring(0, match.index) + arg1.content + cleaned.substring(endIndex + 1);
      imminiRegex.lastIndex = match.index;
    } else {
      cleaned = cleaned.substring(0, match.index) + cleaned.substring(match.index + match[0].length);
      imminiRegex.lastIndex = match.index;
    }
  }
  cleaned = cleaned.replace(/\\immini\b/gi, '');

  // 5. itemize -> danh sách gạch đầu dòng "-"
  cleaned = cleaned.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gi, (m, body) => {
    return '\n' + body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `- ${item}`)
      .join('\n');
  });

  // 6. enumerate -> danh sách số "1., 2.,..."
  cleaned = cleaned.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi, (m, body) => {
    let count = 1;
    return '\n' + body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `${count++}. ${item}`)
      .join('\n');
  });

  // 7. Gỡ lệnh định dạng văn bản
  const textCmds = ['textbf', 'textit', 'texttt', 'textsl', 'textsc', 'textsf', 'text'];
  textCmds.forEach(cmd => {
    const regex = new RegExp(`\\\\${cmd}\\s*\\{`, 'g');
    let m;
    while ((m = regex.exec(cleaned)) !== null) {
      const res = extractBracedGroup(cleaned, m.index + m[0].length - 1);
      if (res) {
        cleaned = cleaned.substring(0, m.index) + res.content + cleaned.substring(res.endIndex + 1);
        regex.lastIndex = m.index;
      } else {
        break;
      }
    }
  });

  // 8. Xóa các lệnh căn chỉnh/trình trình bày rác
  const layoutCmds = ['noindent', 'hfill', 'vfill', 'centering', 'raggedright', 'raggedleft', 'clearpage', 'newpage'];
  layoutCmds.forEach(cmd => {
    const r = new RegExp(`\\\\${cmd}\\b`, 'gi');
    cleaned = cleaned.replace(r, '');
  });

  // 9. Xóa comment đáp án rác
  cleaned = cleaned.replace(/%\s*\\ans\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/%\s*\\shortans\{[^}]*\}/gi, '');

  // 10. Dọn khoảng trắng / vspace / hspace / \\
  cleaned = cleaned.replace(/\\\\/g, '\n');
  cleaned = cleaned.replace(/\\vspace\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\\hspace\{[^}]*\}/gi, '');

  // 11. Thu gọn các dòng trống
  const lines = cleaned.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return lines.join('\n');
}

/**
 * Kiểm tra xem câu hỏi có chứa hình vẽ/môi trường đồ họa không
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

  const rawText = inputEl.value;
  if (!rawText.trim()) {
    alert('Vui lòng nhập mã LaTeX gốc vào ô Input!');
    return;
  }

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
        let rawGroupText = g.trim();
        
        // KIỂM TRA \True TRÊN CHUỖI GỐC
        if (/\\True\b/i.test(rawGroupText)) {
          correctAnsLabel = labels[idx];
          rawGroupText = rawGroupText.replace(/\\True\b/gi, '').trim();
        }

        let textClean = cleanTextForWeb(rawGroupText);
        textClean = ensureEndingDot(textClean);
        choicesFormatted.push(`${labels[idx]}. ${textClean}`);
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
        let rawGroupText = g.trim();

        // KIỂM TRA \True TRÊN CHUỖI GỐC
        if (/\\True\b/i.test(rawGroupText)) {
          tfResults.push('D');
          hasAnyTrue = true;
          rawGroupText = rawGroupText.replace(/\\True\b/gi, '').trim();
        } else {
          tfResults.push('S');
        }

        let textClean = cleanTextForWeb(rawGroupText);
        textClean = ensureEndingDot(textClean);
        choicesFormatted.push(`${labels[idx]}) ${textClean}`);
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

      let doaString = "";
      if (/\\doa\b/i.test(stemRaw)) {
        const doaIdx = stemRaw.search(/\\doa\b/i);
        const { groups, endIndex } = extractMultipleBracedGroups(stemRaw, doaIdx + 4);
        if (groups.length > 0) {
          doaString = groups.map(g => `$${cleanTextForWeb(g.trim())}$`).join(' @ ');
        }
        stemRaw = stemRaw.substring(endIndex);
      }

      let ansList = [];
      const ansMatch = exContent.match(/%\s*\\ans\{([^}]+)\}/i);
      if (ansMatch) {
        ansList = ansMatch[1].split('|').map(a => a.trim());
      }

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

  outputEl.value = results.join('\n\n');

  if (typeof handleInput === 'function') {
    handleInput('output-web');
  }
}
