/* =========================================================
   PIMAX TOOL — EX ENVIRONMENT PROCESSOR (FIX FULL CN1, CN2, CN3)
   ========================================================= */

if (typeof window.subModeEx === 'undefined') {
  window.subModeEx = 1;
}

function switchSubMode(mode) {
  window.subModeEx = mode;
  
  [1, 2, 3].forEach(m => {
    const btn = document.getElementById(`sub-btn-${m}`);
    if (btn) {
      if (m === mode) {
        btn.className = "px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 theme-btn-pimax whitespace-nowrap text-white";
      } else {
        btn.className = "px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap";
      }
    }
  });

  const descEl = document.getElementById('sub-mode-desc');
  const btnLabelEl = document.getElementById('btn-ex-label');
  
  if (mode === 1) {
    if (descEl) descEl.innerHTML = 'Chế độ: <b>Trắc nghiệm 4 phương án (\\choice)</b>';
    if (btnLabelEl) btnLabelEl.innerText = 'Chuẩn Hóa Ngay (CN 1)';
  } else if (mode === 2) {
    if (descEl) descEl.innerHTML = 'Chế độ: <b>Trắc nghiệm Đúng / Sai (a, b, c, d)</b>';
    if (btnLabelEl) btnLabelEl.innerText = 'Chuẩn Hóa Ngay (CN 2)';
  } else if (mode === 3) {
    if (descEl) descEl.innerHTML = 'Chế độ: <b>Trả lời ngắn (\\shortans)</b>';
    if (btnLabelEl) btnLabelEl.innerText = 'Chuẩn Hóa Ngay (CN 3)';
  }
}

function processExEnvironment() {
  const currentMode = window.subModeEx || 1;
  if (currentMode === 1) processMode1();
  else if (currentMode === 2) processMode2();
  else if (currentMode === 3) processMode3();
}

/* =========================================================
   CN 1: TRẮC NGHIỆM 4 PHƯƠNG ÁN (\choice)
   ========================================================= */
function processMode1() {
  const inputEl = document.getElementById('input-ex');
  if (!inputEl || !inputEl.value.trim()) return;
  const input = inputEl.value;

  const questionBlocks = input.split(/(?=(?:^|\n)\s*Câu\s+\d+)/i).filter(b => b.trim());
  let results = [];

  questionBlocks.forEach(block => {
    let content = cleanHeaderPrefix(block);
    let questionPart = content;
    let solutionPart = "";

    const solutionHeaderRegex = /(?:Lời\s*giải|Hướng\s*dẫn\s*giải)[\.\s:]*/i;
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

    const choiceRegex = /(?:^|\n)\s*([A-D])[\.\)]\s*([\s\S]*?)(?=(?:\n\s*[A-D][\.\)]|$))/gi;
    let choices = {};
    let matches;
    let firstChoiceIndex = -1;

    while ((matches = choiceRegex.exec(questionPart)) !== null) {
      if (firstChoiceIndex === -1) firstChoiceIndex = matches.index;
      const key = matches[1].toUpperCase();
      let choiceVal = matches[2].trim().replace(/\.\s*$/, '');
      choices[key] = formatOptionText(choiceVal);
    }

    let mainQuestion = firstChoiceIndex !== -1 ? questionPart.substring(0, firstChoiceIndex).trim() : questionPart;
    mainQuestion = fixMathSpacing(mainQuestion);

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\choice\n`;
    ['A', 'B', 'C', 'D'].forEach(key => {
      let optionText = choices[key] || '';
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

  const questionBlocks = input.split(/(?=(?:^|\n)\s*Câu\s+\d+)/i).filter(b => b.trim());
  let results = [];

  questionBlocks.forEach(block => {
    let content = cleanHeaderPrefix(block);
    let questionPart = content;
    let solutionPart = "";

    const solutionHeaderRegex = /(?:Lời\s*giải|Hướng\s*dẫn\s*giải)[\.\s:]*/i;
    const solMatch = content.match(solutionHeaderRegex);

    if (solMatch) {
      questionPart = content.substring(0, solMatch.index).trim();
      solutionPart = content.substring(solMatch.index + solMatch[0].length).trim();
    }

    // Tách mẫu Đúng/Sai nếu có dạng Đ S D S
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

    // Regex linh hoạt cho a), b), c), d) hoặc a., b., c., d.
    const choiceTFRegex = /(?:^|\n)\s*([a-d])[\)\.]\s*([\s\S]*?)(?=(?:\n\s*[a-d][\)\.]|$))/gi;
    let choices = {};
    let matches;
    let firstChoiceIndex = -1;

    while ((matches = choiceTFRegex.exec(questionPart)) !== null) {
      if (firstChoiceIndex === -1) firstChoiceIndex = matches.index;
      const key = matches[1].toLowerCase();
      let choiceVal = matches[2].trim().replace(/\.\s*$/, '');
      choices[key] = formatOptionText(choiceVal);
    }

    let mainQuestion = firstChoiceIndex !== -1 ? questionPart.substring(0, firstChoiceIndex).trim() : questionPart;
    mainQuestion = fixMathSpacing(mainQuestion);

    // XUẤT MÃ \choiceTF CHUẨN XÁC
    let exCode = `\\begin{ex}\n    ${mainQuestion}\n    \\choiceTF\n`;
    const keys = ['a', 'b', 'c', 'd'];
    keys.forEach((key, index) => {
      let optionText = choices[key] || '';
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

  const questionBlocks = input.split(/(?=(?:^|\n)\s*Câu\s+\d+)/i).filter(b => b.trim());
  let results = [];

  questionBlocks.forEach(block => {
    let content = cleanHeaderPrefix(block);
    let questionPart = content;
    let solutionPart = "";

    const solutionHeaderRegex = /(?:Lời\s*giải|Hướng\s*dẫn\s*giải)[\.\s:]*/i;
    const solMatch = content.match(solutionHeaderRegex);

    if (solMatch) {
      questionPart = content.substring(0, solMatch.index).trim();
      solutionPart = content.substring(solMatch.index + solMatch[0].length).trim();
    }

    let shortAnswerValue = "";
    const shortAnsHeaderRegex = /(?:Đáp\s*án|Đáp\s*số)[\.\s:]*([^\n]+)/i;
    const ansMatch = questionPart.match(shortAnsHeaderRegex) || solutionPart.match(shortAnsHeaderRegex);

    if (ansMatch) {
      shortAnswerValue = ansMatch[1].trim();
      questionPart = questionPart.replace(shortAnsHeaderRegex, '').trim();
      solutionPart = solutionPart.replace(shortAnsHeaderRegex, '').trim();
    }

    let mainQuestion = fixMathSpacing(questionPart);

    let exCode = `\\begin{ex}\n    ${mainQuestion}\n\n    \\shortans{${shortAnswerValue}}\n\n`;
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
   HÀM BỔ TRỢ & TỰ ĐỘNG CẬP NHẬT SỐ DÒNG (LINE NUMBERS)
   ========================================================= */

function cleanHeaderPrefix(rawText) {
  let str = rawText.trim();
  str = str.replace(/^Câu\s+\d+\s*[\.\:-]*/i, '').trim();
  str = str.replace(/^\[[^\]]*\]\s*/i, '').trim();
  str = str.replace(/^\([^\)]*\)\s*/i, '').trim();
  str = str.replace(/^[:\.-]+\s*/, '').trim();
  return str;
}

function formatOptionText(str) {
  if (!str) return '';
  let text = str.trim();
  const containsWords = /[a-zA-ZÀ-ỹ]/.test(text.replace(/\\[a-zA-Z]+/g, ''));
  if (!containsWords && !text.startsWith('$') && !text.endsWith('$')) {
    return `$${text}$`;
  }
  return fixMathSpacing(text);
}

function fixMathSpacing(str) {
  if (!str) return '';
  let text = str;

  text = text.replace(/\$+/g, '$');
  text = text.replace(/\$((?:\\.|[^$])+)\$/g, (m, inner) => `$${inner.trim()}$`);

  text = text.replace(/([\p{L}\p{N}:,;\.\?!])\$/gu, '$1 $');
  text = text.replace(/\$([\p{L}\p{N}])/gu, '$ $1');

  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\s+([\.,;\)])/g, '$1');
  text = text.replace(/([\(\[])\s+/g, '$1');

  text = text.replace(/\$((?:\\.|[^$])+)\$/g, (m, inner) => `$${inner.trim()}$`);

  text = cleanTextSpacingAndLines(text);

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
    // Cập nhật lại bộ đếm số dòng ngay lập tức
    if (typeof updateLineNumbers === 'function') {
      updateLineNumbers(id);
    } else if (typeof handleInput === 'function') {
      handleInput(id);
    }
  }
}
