/* =========================================================
   PIMAX TOOL — EX ENVIRONMENT PROCESSOR (FULL LOGIC GỐC)
   ========================================================= */

// Biến lưu trữ chế độ phụ (1: \choice, 2: \choiceTF, 3: \shortans)
if (typeof window.subModeEx === 'undefined') {
  window.subModeEx = 1;
}

// Hàm chuyển đổi tab chế độ (CN1, CN2, CN3)
function switchSubMode(mode) {
  window.subModeEx = mode;

  [1, 2, 3].forEach(m => {
    const btn = document.getElementById(`sub-btn-${m}`);
    if (btn) {
      if (m === mode) {
        btn.className = "px-3 py-1.5 text-xs font-semibold rounded transition flex items-center justify-center space-x-1.5 theme-btn-pimax whitespace-nowrap";
      } else {
        btn.className = "px-3 py-1.5 text-xs font-semibold rounded transition flex items-center justify-center space-x-1.5 opacity-75 hover:opacity-100 whitespace-nowrap";
      }
    }
  });

  const descEl = document.getElementById('sub-mode-desc');
  const btnLabelEl = document.getElementById('btn-ex-label');

  if (mode === 1) {
    if (descEl) descEl.innerHTML = 'Chế độ: <b>Trắc nghiệm 4 phương án (\\choice)</b>';
    if (btnLabelEl) btnLabelEl.innerText = 'Chuẩn Hóa Ngay (CN 1)';
  } else if (mode === 2) {
    if (descEl) descEl.innerHTML = 'Chế độ: <b>Trắc nghiệm Đúng/Sai (\\choiceTF)</b>';
    if (btnLabelEl) btnLabelEl.innerText = 'Chuẩn Hóa Ngay (CN 2)';
  } else if (mode === 3) {
    if (descEl) descEl.innerHTML = 'Chế độ: <b>Trả lời ngắn (\\shortans)</b>';
    if (btnLabelEl) btnLabelEl.innerText = 'Chuẩn Hóa Ngay (CN 3)';
  }
}

// Hàm điều hướng chính khi nhấn nút "Chuẩn Hóa Ngay"
function processExEnvironment() {
  const mode = window.subModeEx || 1;
  if (mode === 1) processMode1();
  else if (mode === 2) processMode2();
  else processMode3();
}

/* =========================================================
   MODE 1: CHUẨN HÓA TRẮC NGHIỆM 4 PHƯƠNG ÁN (\choice)
   ========================================================= */
function processMode1() {
  const inputEl = document.getElementById('input-ex');
  if (!inputEl || !inputEl.value.trim()) {
    alert("Vui lòng nhập nội dung dữ liệu thô vào ô bên trái!");
    return;
  }

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

    const choiceRegex = /(?:^|\n)\s*([A-D])\.\s*([\s\S]*?)(?=(?:\n\s*[A-D]\.|$))/g;
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
   MODE 2: CHUẨN HÓA TRẮC NGHIỆM ĐÚNG/SAI (\choiceTF)
   ========================================================= */
function processMode2() {
  const inputEl = document.getElementById('input-ex');
  if (!inputEl || !inputEl.value.trim()) {
    alert("Vui lòng nhập nội dung dữ liệu thô vào ô bên trái!");
    return;
  }

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
   MODE 3: CHUẨN HÓA TRẢ LỜI NGẮN (\shortans)
   ========================================================= */
function processMode3() {
  const inputEl = document.getElementById('input-ex');
  if (!inputEl || !inputEl.value.trim()) {
    alert("Vui lòng nhập nội dung dữ liệu thô vào ô bên trái!");
    return;
  }

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
   CÁC HÀM HELPER BỔ TRỢ (ĐẢM BẢO KHÔNG BỊ LỖI THIẾU HÀM)
   ========================================================= */

function cleanHeaderPrefix(str) {
  return str.replace(/^(?:\s*Câu\s+\d+[\.\s:]*)/i, '').trim();
}

function formatOptionText(str) {
  return str.trim();
}

function fixMathSpacing(str) {
  if (typeof applyCleanSpacingTool === 'function') {
    return applyCleanSpacingTool(null, str);
  }
  return str;
}

function cleanTextSpacingAndLines(str) {
  return str.replace(/\n{3,}/g, '\n\n').trim();
}

function setEditorValue(id, val) {
  const el = document.getElementById(id);
  if (el) {
    el.value = val;
    if (typeof handleInput === 'function') {
      handleInput(id);
    }
  }
}
