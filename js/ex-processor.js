/* =========================================================
   PIMAX TOOL — EX ENVIRONMENT PROCESSOR (STABLE INDENT & LINE PARSER)
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

    // TÁCH PHƯƠNG ÁN AN TOÀN
    const optionsData = parseChoicesLineByLine(questionPart, ['A', 'B', 'C', 'D']);

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

    const optionsData = parseChoicesLineByLine(questionPart, ['A', 'B', 'C', 'D']);

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
   THUẬT TOÁN TÁCH PHƯƠNG ÁN AN TOÀN TUỆT ĐỐI (LINE & ANCHOR)
   ========================================================= */

function parseChoicesLineByLine(text, targetKeys) {
  let choices = {};
  
  // Regex bắt nhãn phương án chỉ khi đứng ở đầu dòng HOẶC sau khoảng trắng có dạng A., B., C., D.
  // và kiểm tra ranh giới bằng Lookahead để tránh ăn nhầm vào biểu thức toán
  const choiceRegex = /(?:^|\n|\r)\s*([A-Da-d])[\.\)]\s*/g;
  let matches = [];
  let match;

  while ((match = choiceRegex.exec(text)) !== null) {
    const key = match[1].toUpperCase();
    
    // Kiểm tra xem vị trí nhãn có nằm bên trong dấu $...$ hay không
    const beforeText = text.substring(0, match.index);
    const dollarCount = (beforeText.match(/\$/g) || []).length;
    
    // Nếu số lượng $ trước nhãn là số chẵn -> Nhãn nằm ngoài môi trường Toán -> Hợp lệ!
    if (dollarCount % 2 === 0) {
      matches.push({
        key: key,
        matchIndex: match.index,
        contentStart: match.index + match[0].length
      });
    }
  }

  // Lọc lấy danh sách A -> B -> C -> D đúng thứ tự
  let filteredMatches = [];
  let keyIndex = 0;
  for (let m of matches) {
    if (m.key === targetKeys[keyIndex]) {
      filteredMatches.push(m);
      keyIndex++;
      if (keyIndex >= targetKeys.length) break;
    }
  }

  if (filteredMatches.length === 0) {
    return { stem: text.trim(), choices: {} };
  }

  let stem = text.substring(0, filteredMatches[0].matchIndex).trim();

  for (let i = 0; i < filteredMatches.length; i++) {
    const current = filteredMatches[i];
    const nextStart = (i < filteredMatches.length - 1) ? filteredMatches[i + 1].matchIndex : text.length;
    
    let rawVal = text.substring(current.contentStart, nextStart).trim();
    rawVal = rawVal.replace(/\.\s*$/, ''); // Bỏ dấu chấm thừa cuối câu
    
    choices[current.key] = formatOptionClean(rawVal);
  }

  return { stem: stem, choices: choices };
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

  // Bỏ hết các dấu $ kép bị lặp
  text = text.replace(/\$\$+/g, '$');

  // Nếu phương án có lệnh LaTeX như \cup, \cap, \backslash mà chưa bọc $
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
