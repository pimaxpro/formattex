/* =========================================================
   PIMAX TOOL — EX ENVIRONMENT PROCESSOR (FULL FIX PARSER)
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

    // TÁCH PHƯƠNG ÁN CHUẨN XÁC
    const optionsData = parseChoiceOptionsRobust(questionPart, ['A', 'B', 'C', 'D']);

    let mainQuestion = cleanTextSpacingAndLines(optionsData.stem);

    let exCode = `\\begin{ex}\n${mainQuestion}\n\\choice\n`;
    ['A', 'B', 'C', 'D'].forEach(key => {
      let optionText = optionsData.choices[key] || '';
      let isTrue = (key === trueAnswerKey) ? '\\True ' : '';
      exCode += `{${isTrue}${optionText}}\n`;
    });

    if (solutionPart) {
      let cleanSol = cleanTextSpacingAndLines(solutionPart);
      const indentedSolution = cleanSol.split('\n').map(line => line ? `    ${line}` : '').join('\n');
      exCode += `\\loigiai{\n${indentedSolution}\n}\n`;
    } else {
      exCode += `\\loigiai{}\n`;
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

    const optionsData = parseChoiceOptionsRobust(questionPart, ['A', 'B', 'C', 'D']);

    let mainQuestion = cleanTextSpacingAndLines(optionsData.stem);

    let exCode = `\\begin{ex}\n${mainQuestion}\n\\choiceTF\n`;
    const keys = ['A', 'B', 'C', 'D'];
    keys.forEach((key, index) => {
      let optionText = optionsData.choices[key] || '';
      let isTrue = (tfPattern && tfPattern[index]) ? '\\True ' : '';
      exCode += `{${isTrue}${optionText}}\n`;
    });

    if (solutionPart) {
      let cleanSol = cleanTextSpacingAndLines(solutionPart);
      const indentedSolution = cleanSol.split('\n').map(line => line ? `    ${line}` : '').join('\n');
      exCode += `\\loigiai{\n${indentedSolution}\n}\n`;
    } else {
      exCode += `\\loigiai{}\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', results.join('\n\n'));
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

    let mainQuestion = cleanTextSpacingAndLines(questionPart);

    let exCode = `\\begin{ex}\n${mainQuestion}\n\\shortans{${shortAnswerValue}}\n`;
    if (solutionPart) {
      let cleanSol = cleanTextSpacingAndLines(solutionPart);
      const indentedSolution = cleanSol.split('\n').map(line => line ? `    ${line}` : '').join('\n');
      exCode += `\\loigiai{\n${indentedSolution}\n}\n`;
    } else {
      exCode += `\\loigiai{}\n`;
    }

    exCode += `\\end{ex}`;
    results.push(exCode);
  });

  setEditorValue('output-ex', results.join('\n\n'));
}

/* =========================================================
   THUẬT TOÁN TÁCH NHÃN PHƯƠNG ÁN SIÊU ỔN ĐỊNH
   ========================================================= */

function parseChoiceOptionsRobust(text, targetKeys) {
  let choices = {};
  
  // Tìm tất cả các điểm xuất hiện của A., B., C., D. hoặc a), b), c), d) ở biên từ hoặc đầu dòng
  const optionRegex = /(?:^|\n|\s+)([A-Da-d])[\.\)]\s*/g;
  let matches = [];
  let match;

  while ((match = optionRegex.exec(text)) !== null) {
    const key = match[1].toUpperCase();
    const fullMatchText = match[0];
    const matchIndex = match.index + (fullMatchText.length - fullMatchText.trimStart().length - match[1].length - 1);
    
    // Kiểm tra tính hợp lệ: Nhãn A phải xuất hiện trước, B sau A, C sau B, D sau C
    if (targetKeys.includes(key)) {
      matches.push({
        key: key,
        startContentIndex: match.index + fullMatchText.length,
        matchIndex: match.index
      });
    }
  }

  // Lọc chỉ lấy chuỗi tuần tự hợp lệ đầu tiên của A -> B -> C -> D
  let validSequence = [];
  let expectedIndex = 0;
  for (let m of matches) {
    if (m.key === targetKeys[expectedIndex]) {
      validSequence.push(m);
      expectedIndex++;
      if (expectedIndex >= targetKeys.length) break;
    }
  }

  // Nếu không đủ chuỗi A, B, C, D chuẩn thì fallback lại
  if (validSequence.length === 0) {
    return { stem: text, choices: {} };
  }

  let stem = text.substring(0, validSequence[0].matchIndex).trim();

  for (let i = 0; i < validSequence.length; i++) {
    const current = validSequence[i];
    const nextIndex = (i < validSequence.length - 1) ? validSequence[i + 1].matchIndex : text.length;
    
    let rawVal = text.substring(current.startContentIndex, nextIndex).trim();
    rawVal = rawVal.replace(/\.\s*$/, ''); // Gỡ dấu chấm cuối câu phương án nếu có
    
    choices[current.key] = formatOptionTextClean(rawVal);
  }

  return { stem: stem, choices: choices };
}

/* =========================================================
   HÀM CHUẨN HÓA NỘI DUNG VÀ DẤU $ TOÁN HỌC
   ========================================================= */

function cleanHeaderPrefix(rawText) {
  let str = rawText.trim();
  str = str.replace(/^(?:Câu|Bài|Ex)\s+\d+\s*[\.\:-]*/i, '').trim();
  str = str.replace(/^\[[^\]]*\]\s*/i, '').trim();
  str = str.replace(/^\([^\)]*\)\s*/i, '').trim();
  str = str.replace(/^[:\.-]+\s*/, '').trim();
  return str;
}

function formatOptionTextClean(str) {
  if (!str) return '';
  let text = str.trim();

  // Bỏ hết các dấu $ kép hoặc rác dính vào
  text = text.replace(/\$\$+/g, '$');

  // Nếu chuỗi chứa các ký tự/lệnh toán học LaTeX mà chưa bọc $ trọn vẹn
  const containsMathSymbol = /\\[a-zA-Z]+|[\(\)\=\+\-\cup\cap\backslash\subset\in]/.test(text);
  const isWrapped = text.startsWith('$') && text.endsWith('$') && (text.match(/\$/g) || []).length === 2;

  if (containsMathSymbol && !isWrapped) {
    // Làm sạch các dấu $ lẻ ngoằn ngoè bên trong rồi bọc trọn vẹn
    let unescaped = text.replace(/\$/g, '').trim();
    return `$${unescaped}$`;
  }

  return text;
}

function cleanTextSpacingAndLines(text) {
  if (!text) return '';

  let cleaned = text.replace(/\$\$/g, '$');
  cleaned = cleaned.replace(/\s+([\?\,\.\!])/g, '$1');
  
  let lines = cleaned.split('\n');
  let filteredLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd();
    if (line.trim() !== '') {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n').trim();
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
