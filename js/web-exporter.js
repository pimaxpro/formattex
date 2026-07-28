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
    // Bỏ qua khoảng trắng
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
 * Làm sạch văn bản: Loại bỏ môi trường tikz, center, immini, loigiai,
 * gỡ các lệnh định dạng text (\textbf, \textit, \texttt,...) nhưng giữ nguyên công thức toán.
 */
function cleanTextForWeb(text) {
  if (!text) return "";

  let cleaned = text;

  // 1. Xóa khối \loigiai{...}
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

  // 2. Xóa các môi trường TikZ, Center, Immini
  cleaned = cleaned.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{immini\}[\s\S]*?\\end\{immini\}/gi, '');

  // 3. Chuyển itemize thành danh sách gạch đầu dòng "-"
  cleaned = cleaned.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gi, (m, body) => {
    return body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `- ${item}`)
      .join('\n');
  });

  // 4. Chuyển enumerate thành danh sách số "1., 2.,..."
  cleaned = cleaned.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi, (m, body) => {
    let count = 1;
    return body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `${count++}. ${item}`)
      .join('\n');
  });

  // 5. Gỡ bỏ các lệnh định dạng văn bản (\textbf, \textit, \texttt, \text, \mathrm khi ở ngoài công thức)
  // Chỉ gỡ vỏ lệnh, giữ lại nội dung bên trong
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

  // 6. Xóa các ký tự xuống dòng rác/dấu gạch nối LaTeX dư thừa (\vspace, \hspace, \\)
  cleaned = cleaned.replace(/\\\\/g, '\n');
  cleaned = cleaned.replace(/\\vspace\{[^}]*\}/g, '');
  cleaned = cleaned.replace(/\\hspace\{[^}]*\}/g, '');

  // 7. Thu gọn nhiều dòng trống liên tiếp
  const lines = cleaned.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return lines.join('\n');
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
    let hasError = false;
    let errorMessage = "";

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
        let text = g.trim();
        if (text.startsWith('\\True')) {
          correctAnsLabel = labels[idx];
          text = text.replace(/^\\True\s*/, '').trim();
        }
        choicesFormatted.push(`${labels[idx]}. ${text}`);
      });

      processedQuestion += stemClean + '\n' + choicesFormatted.join('\n');
      if (correctAnsLabel) {
        processedQuestion += `\nĐáp án TN: ${correctAnsLabel}`;
      } else {
        processedQuestion += `\nĐáp án TN: [Chưa tích đáp án True]`;
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

      groups.slice(0, 4).forEach((g, idx) => {
        let text = g.trim();
        if (text.startsWith('\\True')) {
          tfResults.push('D');
          text = text.replace(/^\\True\s*/, '').trim();
        } else {
          tfResults.push('S');
        }
        choicesFormatted.push(`${labels[idx]}) ${text}`);
      });

      processedQuestion += stemClean + '\n' + choicesFormatted.join('\n');
      processedQuestion += `\nĐáp án DS: ${tfResults.join('|')}`;
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
          doaString = groups.map(g => `$${g.trim()}$`).join(' @ ');
        }
        // Gỡ đoạn \doa khỏi đề bài
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

      processedQuestion += stemClean;
      if (doaString) {
        processedQuestion = processedQuestion.replace(`Câu ${questionIndex}.`, `Câu ${questionIndex}.\n${doaString}`);
      }

      // Tạo dòng đáp án
      const formattedAns = ansList.map(a => `${a}>`).join('|');
      processedQuestion += `\nĐáp án: ${formattedAns}`;

      // Kiểm tra thiếu đáp án
      if (dienktCount !== ansList.length) {
        errorMessage = "Câu này thiếu đáp án";
      }
    }

    // -------------------------------------------------------------
    // LOẠI 4: CÂU TRẢ LỜI NGẮN (\dienkq và %\shortans{})
    // -------------------------------------------------------------
    else if (/\\dienkq\b/i.test(exContent) || /%\s*\\shortans/i.test(exContent)) {
      let stemRaw = exContent;

      // 1. Thay \dienkq thành 10 dấu gạch chân "__________"
      stemRaw = stemRaw.replace(/\\dienkq\b/g, '__________');

      // 2. Lấy đáp án từ %\shortans{36}
      let shortansVal = "";
      const shortansMatch = exContent.match(/%\s*\\shortans\{([^}]+)\}/i);
      if (shortansMatch) {
        shortansVal = shortansMatch[1].trim();
      }

      const stemClean = cleanTextForWeb(stemRaw);

      processedQuestion += stemClean;
      if (shortansVal) {
        processedQuestion += `\nĐáp án TLN: ${shortansVal}`;
      } else {
        processedQuestion += `\nĐáp án TLN: [Chưa có đáp án shortans]`;
      }
    }

    // -------------------------------------------------------------
    // MẶC ĐỊNH: NẾU KHÔNG THUỘC CÁC LOẠI TRÊN
    // -------------------------------------------------------------
    else {
      const stemClean = cleanTextForWeb(exContent);
      processedQuestion += stemClean;
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
