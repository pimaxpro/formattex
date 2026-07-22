/* =========================================================
   PIMAX TOOL — EX ENVIRONMENT PROCESSOR (PLACEHOLDER PARSER)
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

    // TÁCH PHƯƠNG ÁN BẰNG THUẬT TOÁN PLACEHOLDER SIÊU AN TOÀN
    const optionsData = parseChoicesWithPlaceholder(questionPart, ['A', 'B', 'C', 'D']);

    let mainQuestion = optionsData.stem;

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\choice\n`;
    ['A', 'B', 'C', 'D'].forEach(key => {
      let optionText = optionsData.choices[key] || '';
      let isTrue = (key === trueAnswerKey) ? '\\True ' : '';
      exCode += `    {${isTrue}${optionText}}\n`;
    });

    if (solutionPart) {
      const indentedSolution = solutionPart.split('\n').map(line => line.trim() ? `        ${line.trim()}` : '').join('\n');
      exCode += `    \\loigiai{\n${indentedSolution}\n    }\n`;
    } else {
      exCode += `    \\loigiai{\n    }\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', results.join('\n\n'));
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

    const optionsData = parseChoicesWithPlaceholder(questionPart, ['A', 'B', 'C', 'D']);

    let mainQuestion = optionsData.stem;

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\choiceTF\n`;
    const keys = ['A', 'B', 'C', 'D'];
    keys.forEach((key, index) => {
      let optionText = optionsData.choices[key] || '';
      let isTrue = (tfPattern && tfPattern[index]) ? '\\True ' : '';
      exCode += `    {${isTrue}${optionText}}\n`;
    });

    if (solutionPart) {
      const indentedSolution = solutionPart.split('\n').map(line => line.trim() ? `        ${line.trim()}` : '').join('\n');
      exCode += `    \\loigiai{\n${indentedSolution}\n    }\n`;
    } else {
      exCode += `    \\loigiai{\n    }\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', results.join('\n\n'));
}

/* =========================================================
   CN 3: TRẢ LỜI NGẮN (\shortans)
   ========================================================= */
   /* =========================================================
   CN 3: TRẢ LỜI NGẮN (\shortans) — FIXED ANCHOR & PATTERN
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

    // REGEX CHUẨN: Chỉ bắt "Đáp án/Đáp số/Kết quả/KQ" ở ĐẦU DÒNG hoặc CUỐI CÂU
    // Cấu trúc: (Đầu dòng hoặc \n) + (Đáp án|Đáp số|Kết quả|KQ) + (dấu . : hoặc khoảng trắng) + Nội dung đáp án đến hết dòng
    const strictShortAnsRegex = /(?:^|\n)\s*(?:Đáp\s*án|Đáp\s*số|Kết\s*quả|KQ)[\.\s:]*([^\n]+)/i;

    let ansMatch = questionPart.match(strictShortAnsRegex) || solutionPart.match(strictShortAnsRegex);

    if (ansMatch) {
      shortAnswerValue = ansMatch[1].trim();
      // Bỏ đoạn "Đáp án..." ra khỏi nội dung câu hỏi/lời giải
      questionPart = questionPart.replace(strictShortAnsRegex, '').trim();
      solutionPart = solutionPart.replace(strictShortAnsRegex, '').trim();
    } else {
      // Fallback: Tìm dòng cuối cùng nếu có dạng gán giá trị ngắn (VD dán dính không xuống dòng)
      const inlineAnsRegex = /(?:Đáp\s*án|Đáp\s*số|KQ)[\.\s:]*([A-Za-z0-9\$\\\+\-\{\}\.,\s]+)$/i;
      let inlineMatch = questionPart.match(inlineAnsRegex) || solutionPart.match(inlineAnsRegex);
      if (inlineMatch) {
        shortAnswerValue = inlineMatch[1].trim();
        questionPart = questionPart.replace(inlineAnsRegex, '').trim();
        solutionPart = solutionPart.replace(inlineAnsRegex, '').trim();
      }
    }

    let mainQuestion = questionPart.trim();

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\shortans{${shortAnswerValue}}\n`;
    if (solutionPart) {
      const indentedSolution = solutionPart.split('\n').map(line => line.trim() ? `        ${line.trim()}` : '').join('\n');
      exCode += `    \\loigiai{\n${indentedSolution}\n    }\n`;
    } else {
      exCode += `    \\loigiai{\n    }\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', results.join('\n\n'));
}

/* =========================================================
   THUẬT TOÁN PLACEHOLDER: BẢO VỆ TUYỆT ĐỐI MÔI TRƯỜNG MATH
   ========================================================= */

function parseChoicesWithPlaceholder(text, targetKeys) {
  let mathBlocks = [];
  
  // 1. Ẩn tất cả công thức toán $...$ vào danh sách mảng tạm
  let maskedText = text.replace(/\$((?:\\.|[^$])+)\$/g, (m) => {
    mathBlocks.push(m);
    return `___MATH_BLOCK_${mathBlocks.length - 1}___`;
  });

  // 2. Tìm vị trí nhãn A., B., C., D. trên chuỗi đã được giấu công thức
  const choiceRegex = /(?:^|\n|\s+)([A-Da-d])[\.\)]\s*/g;
  let matches = [];
  let match;

  while ((match = choiceRegex.exec(maskedText)) !== null) {
    const key = match[1].toUpperCase();
    matches.push({
      key: key,
      matchIndex: match.index,
      contentStart: match.index + match[0].length
    });
  }

  // Lọc đúng tuần tự A -> B -> C -> D
  let validMatches = [];
  let expectedIndex = 0;
  for (let m of matches) {
    if (m.key === targetKeys[expectedIndex]) {
      validMatches.push(m);
      expectedIndex++;
      if (expectedIndex >= targetKeys.length) break;
    }
  }

  if (validMatches.length === 0) {
    return { stem: restoreMath(maskedText, mathBlocks).trim(), choices: {} };
  }

  // Tách đề bài và các phương án
  let stem = restoreMath(maskedText.substring(0, validMatches[0].matchIndex), mathBlocks).trim();
  let choices = {};

  for (let i = 0; i < validMatches.length; i++) {
    const current = validMatches[i];
    const nextStart = (i < validMatches.length - 1) ? validMatches[i + 1].matchIndex : maskedText.length;
    
    let rawVal = maskedText.substring(current.contentStart, nextStart).trim();
    rawVal = rawVal.replace(/\.\s*$/, ''); // Bỏ dấu chấm thừa cuối đáp án
    
    // Khôi phục lại công thức toán cho từng phương án
    let restoredVal = restoreMath(rawVal, mathBlocks);
    choices[current.key] = formatOptionClean(restoredVal);
  }

  return { stem: stem, choices: choices };
}

function restoreMath(maskedText, mathBlocks) {
  return maskedText.replace(/___MATH_BLOCK_(\d+)___/g, (m, id) => {
    return mathBlocks[parseInt(id, 10)];
  });
}

function cleanHeaderPrefix(rawText) {
  let str = rawText.trim();
  str = str.replace(/^(?:Câu|Bài|Ex)\s+\d+\s*[\.\:-]*/i, '').trim();
  str = str.replace(/^\[[^\]]*\]\s*/i, '').trim();
  str = str.replace(/^\([^\)]*\)\s*/i, '').trim();
  str = str.replace(/^[:\.-]+\s*/, '').trim();
  return str;
}

function formatOptionClean(str) {
  if (!str) return '';
  let text = str.trim();

  // Bỏ bớt dấu $ trùng
  text = text.replace(/\$\$+/g, '$');

  // Nếu phương án chưa có $ bọc mà chứa ký tự toán
  const hasLatex = /\\[a-zA-Z]+/.test(text);
  const isWrapped = text.startsWith('$') && text.endsWith('$');

  if (hasLatex && !isWrapped) {
    return `$${text}$`;
  }

  return text;
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
