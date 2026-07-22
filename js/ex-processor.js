/* =========================================================
   PIMAX TOOL — EX ENVIRONMENT PROCESSOR (FIX CHOICEREX & MATH)
   ========================================================= */

if (typeof window.subModeEx === 'undefined') {
  window.subModeEx = 1;
}

function processExEnvironment() {
  const currentMode = window.subModeEx || 1;
  
  if (currentMode === 1) {
    processMode1();
  } else if (currentMode === 2) {
    processMode2();
  } else if (currentMode === 3) {
    processMode3();
  }
}

/* =========================================================
   CN 1: TRẮC NGHIỆM 4 PHƯƠNG ÁN (\choice)
   ========================================================= */
function processMode1() {
  const inputEl = document.getElementById('input-ex');
  if (!inputEl || !inputEl.value.trim()) return;
  const input = inputEl.value;

  const questionBlocks = input.split(/(?=(?:^|\n)\s*(?:Câu|Bài|Ex)\s+\d+)/i).filter(b => b.trim());
  let results = [];

  questionBlocks.forEach(block => {
    let content = cleanHeaderPrefix(block);
    let questionPart = content;
    let solutionPart = "";

    const solutionHeaderRegex = /(?:Lời\s*giải|Hướng\s*dẫn\s*giải|HDG|Giải)[\.\s:]*/i;
    const solMatch = content.match(solutionHeaderRegex);

    if (solMatch) {
      questionPart = content.substring(0, solMatch.index).trim();
      solutionPart = content.substring(solMatch.index + solMatch[0].length).trim();
    }

    let trueAnswerKey = null;
    const choicePickRegex = /(?:Chọn\s*(?:ý|đáp\s*án)?|Đáp\s*án)\s*([A-D])[\.\s]*/gi;

    let pickMatch;
    if ((pickMatch = choicePickRegex.exec(solutionPart)) !== null) {
      trueAnswerKey = pickMatch[1].toUpperCase();
      solutionPart = solutionPart.replace(/(?:Chọn\s*(?:ý|đáp\s*án)?|Đáp\s*án)\s*[A-D][\.\s]*/gi, '').trim();
    } 
    choicePickRegex.lastIndex = 0;
    if (!trueAnswerKey && (pickMatch = choicePickRegex.exec(questionPart)) !== null) {
      trueAnswerKey = pickMatch[1].toUpperCase();
      questionPart = questionPart.replace(/(?:Chọn\s*(?:ý|đáp\s*án)?|Đáp\s*án)\s*[A-D][\.\s]*/gi, '').trim();
    }

    // TÁCH ĐÁP ÁN CHUẨN XÁC KHÔNG BỊ NUỐT CÁC CHỮ CÁI A, B, C, D TRONG MÔI TRƯỜNG MATH $...$
    const optionsData = parseChoiceOptions(questionPart, ['A', 'B', 'C', 'D']);

    let mainQuestion = optionsData.stem;
    mainQuestion = fixMathSpacing(mainQuestion);

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\choice\n`;
    ['A', 'B', 'C', 'D'].forEach(key => {
      let optionText = optionsData.choices[key] || '';
      let isTrue = (key === trueAnswerKey) ? '\\True ' : '';
      exCode += `    {${isTrue}${optionText}}\n`;
    });

    if (solutionPart) {
      let cleanSol = fixMathSpacing(solutionPart);
      const indentedSolution = cleanSol.split('\n').map(line => line ? `        ${line}` : '').join('\n');
      exCode += `    \\loigiai{\n${indentedSolution}\n    }\n`;
    } else {
      exCode += `    \\loigiai{\n\n    }\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', cleanTextSpacingAndLines(results.join('\n\n')));
}

/* =========================================================
   CN 2: TRẮC NGHIỆM ĐÚNG / SAI (\choiceTF)
   ========================================================= */
function processMode2() {
  const inputEl = document.getElementById('input-ex');
  if (!inputEl || !inputEl.value.trim()) return;
  const input = inputEl.value;

  const questionBlocks = input.split(/(?=(?:^|\n)\s*(?:Câu|Bài|Ex)\s+\d+)/i).filter(b => b.trim());
  let results = [];

  questionBlocks.forEach(block => {
    let content = cleanHeaderPrefix(block);
    let questionPart = content;
    let solutionPart = "";

    const solutionHeaderRegex = /(?:Lời\s*giải|Hướng\s*dẫn\s*giải|HDG|Giải)[\.\s:]*/i;
    const solMatch = content.match(solutionHeaderRegex);

    if (solMatch) {
      questionPart = content.substring(0, solMatch.index).trim();
      solutionPart = content.substring(solMatch.index + solMatch[0].length).trim();
    }

    let tfPattern = null;
    const answerTFRegex = /(?:Đáp\s*án|Chọn)[\.\s:]*([DĐS[\s\-\,\.]+){4}/gi;

    let tfMatch = answerTFRegex.exec(solutionPart) || answerTFRegex.exec(questionPart);
    if (tfMatch) {
      let cleanStr = tfMatch[0].replace(/(?:Đáp\s*án|Chọn)[\.\s:]*/i, '').replace(/[\s\-\,\.]/g, '').toUpperCase();
      if (cleanStr.length === 4) {
        tfPattern = cleanStr.split('').map(ch => (ch === 'D' || ch === 'Đ'));
      }
    }

    questionPart = questionPart.replace(/(?:Đáp\s*án|Chọn)[\.\s:]*([DĐS[\s\-\,\.]+){4}\.?\s*/gi, '').trim();
    solutionPart = solutionPart.replace(/(?:Đáp\s*án|Chọn)[\.\s:]*([DĐS[\s\-\,\.]+){4}\.?\s*/gi, '').trim();

    const optionsData = parseChoiceOptions(questionPart, ['a', 'b', 'c', 'd']);

    let mainQuestion = optionsData.stem;
    mainQuestion = fixMathSpacing(mainQuestion);

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\choiceTF\n`;
    const keys = ['a', 'b', 'c', 'd'];
    keys.forEach((key, index) => {
      let optionText = optionsData.choices[key] || '';
      let isTrue = (tfPattern && tfPattern[index]) ? '\\True ' : '';
      exCode += `    {${isTrue}${optionText}}\n`;
    });

    if (solutionPart) {
      let cleanSol = fixMathSpacing(solutionPart);
      const indentedSolution = cleanSol.split('\n').map(line => line ? `        ${line}` : '').join('\n');
      exCode += `    \\loigiai{\n${indentedSolution}\n    }\n`;
    } else {
      exCode += `    \\loigiai{\n\n    }\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', cleanTextSpacingAndLines(results.join('\n\n')));
}

/* =========================================================
   CN 3: TRẢ LỜI NGẮN (\shortans)
   ========================================================= */
function processMode3() {
  const inputEl = document.getElementById('input-ex');
  if (!inputEl || !inputEl.value.trim()) return;
  const input = inputEl.value;

  const questionBlocks = input.split(/(?=(?:^|\n)\s*(?:Câu|Bài|Ex)\s+\d+)/i).filter(b => b.trim());
  let results = [];

  questionBlocks.forEach(block => {
    let content = cleanHeaderPrefix(block);
    let questionPart = content;
    let solutionPart = "";

    const solutionHeaderRegex = /(?:Lời\s*giải|Hướng\s*dẫn\s*giải|HDG|Giải)[\.\s:]*/i;
    const solMatch = content.match(solutionHeaderRegex);

    if (solMatch) {
      questionPart = content.substring(0, solMatch.index).trim();
      solutionPart = content.substring(solMatch.index + solMatch[0].length).trim();
    }

    let shortAnswerValue = "";
    const shortAnsHeaderRegex = /(?:Đáp\s*án|Đáp\s*số|Kết\s*quả)[\.\s:]*([^\n]+)/i;
    const ansMatch = questionPart.match(shortAnsHeaderRegex) || solutionPart.match(shortAnsHeaderRegex);

    if (ansMatch) {
      shortAnswerValue = ansMatch[1].trim();
      questionPart = questionPart.replace(shortAnsHeaderRegex, '').trim();
      solutionPart = solutionPart.replace(shortAnsHeaderRegex, '').trim();
    }

    let mainQuestion = fixMathSpacing(questionPart);

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\shortans{${shortAnswerValue}}\n`;
    if (solutionPart) {
      let cleanSol = fixMathSpacing(solutionPart);
      const indentedSolution = cleanSol.split('\n').map(line => line ? `        ${line}` : '').join('\n');
      exCode += `    \\loigiai{\n${indentedSolution}\n    }\n`;
    } else {
      exCode += `    \\loigiai{\n\n    }\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', cleanTextSpacingAndLines(results.join('\n\n')));
}

/* =========================================================
   BO PHAN TACH PHUONG AN THONG MINH CHONG NHOI CONG THUC
   ========================================================= */

function parseChoiceOptions(text, keysList) {
  let choices = {};
  let isOutsideMath = true;
  let matches = [];

  // Tìm vị trí các nhãn A., B., C., D. chuẩn xác (Chỉ tìm khi nằm ngoài $)
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$') {
      isOutsideMath = !isOutsideMath;
    }

    if (isOutsideMath) {
      // Kiểm tra ranh giới nhãn phương án
      const sub = text.substring(i);
      const m = sub.match(/^(?:^|\n|\s+)([A-Da-d])[\.\)]\s*/);
      if (m) {
        const key = m[1];
        if (keysList.includes(key) || keysList.includes(key.toUpperCase()) || keysList.includes(key.toLowerCase())) {
          matches.push({
            key: key.toUpperCase(),
            index: i + (m[0].length - m[1].length - m[0].trimStart().length) - (m[0].startsWith(' ') || m[0].startsWith('\n') ? 0 : 0),
            fullMatchLength: m[0].length,
            matchStr: m[0]
          });
          i += m[0].length - 1; // Nhảy qua đoạn nhãn vừa bắt
        }
      }
    }
  }

  // Lọc trùng và sắp xếp thứ tự nhãn A -> B -> C -> D
  let cleanMatches = [];
  let foundKeys = new Set();
  for (let m of matches) {
    if (!foundKeys.has(m.key)) {
      foundKeys.add(m.key);
      cleanMatches.push(m);
    }
  }

  if (cleanMatches.length === 0) {
    return { stem: text, choices: {} };
  }

  let stem = text.substring(0, cleanMatches[0].index).trim();

  for (let i = 0; i < cleanMatches.length; i++) {
    const current = cleanMatches[i];
    const startVal = current.index + current.fullMatchLength;
    const endVal = (i < cleanMatches.length - 1) ? cleanMatches[i + 1].index : text.length;

    let rawVal = text.substring(startVal, endVal).trim();
    // Bỏ dấu chấm thừa ở cuối đáp án nếu có
    rawVal = rawVal.replace(/\.\s*$/, '');
    
    // Đưa vào chuẩn hóa định dạng toán
    choices[current.key.toUpperCase()] = formatOptionText(rawVal);
    choices[current.key.toLowerCase()] = choices[current.key.toUpperCase()];
  }

  return { stem: stem, choices: choices };
}

/* =========================================================
   HÀM BỔ TRỢ & CHUẨN HÓA DẤU $ TOÁN HỌC
   ========================================================= */

function cleanHeaderPrefix(rawText) {
  let str = rawText.trim();
  str = str.replace(/^(?:Câu|Bài|Ex)\s+\d+\s*[\.\:-]*/i, '').trim();
  str = str.replace(/^\[[^\]]*\]\s*/i, '').trim();
  str = str.replace(/^\([^\)]*\)\s*/i, '').trim();
  str = str.replace(/^[:\.-]+\s*/, '').trim();
  return str;
}

function formatOptionText(str) {
  if (!str) return '';
  let text = str.trim();

  // Làm sạch các dấu $ trùng lặp từ trước
  text = text.replace(/\$\$+/g, '$');

  // Kiểm tra nếu có lệnh LaTeX (\cup, \cap, \backslash...) mà chưa được bọc $
  const hasLatexCmd = /\\[a-zA-Z]+/.test(text);
  const isFullyWrapped = text.startsWith('$') && text.endsWith('$') && (text.match(/\$/g) || []).length === 2;

  if (hasLatexCmd && !isFullyWrapped) {
    // Nếu chưa bọc $ thì bọc lại toàn bộ phương án
    text = text.replace(/^\$|\$$/g, ''); // Bỏ các dấu $ lẻ loi ở đầu/cuối
    return `$${text.trim()}$`;
  }

  return fixMathSpacing(text);
}

function fixMathSpacing(str) {
  if (!str) return '';
  let text = str;

  // Dọn dẹp dấu $ trùng lặp
  text = text.replace(/\$\$+/g, '$');
  
  // Chuẩn hóa khoảng trắng bên trong công thức $ ... $
  text = text.replace(/\$((?:\\.|[^$])+)\$/g, (m, inner) => `$${inner.trim()}$`);

  // Đảm bảo khoảng cách giữa chữ tiếng Việt và dấu $
  text = text.replace(/([\p{L}\p{N}:,;\.\?!])\$/gu, '$1 $');
  text = text.replace(/\$([\p{L}\p{N}])/gu, '$ $1');

  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\s+([\.,;\)])/g, '$1');
  text = text.replace(/([\(\[])\s+/g, '$1');

  return text.trim();
}

function cleanTextSpacingAndLines(text) {
  if (!text) return '';

  let cleaned = text.replace(/\s+([\?\,\.\!])/g, '$1');
  let lines = cleaned.split('\n');
  let filteredLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.trim() !== '') {
      filteredLines.push(line.trimEnd());
    }
  }

  let resultText = filteredLines.join('\n');
  resultText = resultText.replace(/([^\n])\n+(\\begin\{[^}]+\})/g, '$1\n\n$2');
  resultText = resultText.replace(/(\\end\{[^}]+\})\n+([^\n])/g, '$1\n\n$2');
  resultText = resultText.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return resultText.trim();
}

function setEditorValue(id, val) {
  const el = document.getElementById(id);
  if (el) {
    el.value = val;
    if (typeof updateLineNumbers === 'function') {
      updateLineNumbers(id);
    } else if (typeof handleInput === 'function') {
      handleInput(id);
    }
  }
}
