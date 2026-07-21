// Biến lưu danh sách câu hỏi và trạng thái đáp án
let parsedQuestions = [];

/**
 * Hàm tách các tham số ngoặc nhọn {...} cấp 1 (xử lý tốt ngoặc lồng nhau như \frac{}{})
 */
function extractCurlyBrackets(text) {
  const results = [];
  let depth = 0;
  let startIdx = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) {
        startIdx = i;
      }
      depth++;
    } else if (text[i] === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          results.push({
            fullText: text.substring(startIdx, i + 1),
            innerContent: text.substring(startIdx + 1, i),
            start: startIdx,
            end: i + 1
          });
          startIdx = -1;
        }
      }
    }
  }
  return results;
}

function openAnswerModal() {
  const outputText = document.getElementById('output-ex').value;
  if (!outputText.trim()) {
    alert("Chưa có nội dung câu hỏi trong khung Kết quả chuẩn hóa!");
    return;
  }

  const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/g;
  let match;
  parsedQuestions = [];

  let index = 1;
  while ((match = exRegex.exec(outputText)) !== null) {
    const fullBlock = match[0];
    const innerContent = match[1];

    const isTF = innerContent.includes('\\choiceTF');
    const isShortAns = innerContent.includes('\\shortans');

    let currentAnswers = [];

    if (isTF) {
      const choicesBlockMatch = innerContent.match(/\\choiceTF\s*([\s\S]*?)(?=\\loigiai|\n\s*\n|$)/);
      if (choicesBlockMatch) {
        const optionMatches = extractCurlyBrackets(choicesBlockMatch[1]);
        currentAnswers = optionMatches.slice(0, 4).map(m => m.innerContent.includes('\\True'));
      } else {
        currentAnswers = [false, false, false, false];
      }
    } else if (!isShortAns) {
      const choicesBlockMatch = innerContent.match(/\\choice\s*([\s\S]*?)(?=\\loigiai|\n\s*\n|$)/);
      let selectedOption = null;
      if (choicesBlockMatch) {
        const optionMatches = extractCurlyBrackets(choicesBlockMatch[1]);
        const labels = ['A', 'B', 'C', 'D'];
        optionMatches.slice(0, 4).forEach((m, idx) => {
          if (m.innerContent.includes('\\True')) {
            selectedOption = labels[idx];
          }
        });
      }
      currentAnswers = selectedOption;
    }

    parsedQuestions.push({
      id: index++,
      fullBlock: fullBlock,
      isTF: isTF,
      isShortAns: isShortAns,
      selectedAnswer: currentAnswers
    });
  }

  if (parsedQuestions.length === 0) {
    alert("Không tìm thấy khối câu hỏi \\begin{ex}...\\end{ex} nào!");
    return;
  }

  renderAnswerTable();
  const modal = document.getElementById('answer-modal');
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeAnswerModal() {
  const modal = document.getElementById('answer-modal');
  modal.classList.add('hidden');
}

function renderAnswerTable() {
  const container = document.getElementById('answer-table-container');
  const title = document.getElementById('answer-modal-title');

  const hasTF = parsedQuestions.some(q => q.isTF);
  title.innerText = hasTF ? "Bảng Tích Đáp Án Trắc Nghiệm Đúng/Sai" : "Bảng Tích Đáp Án Trắc Nghiệm 4 Phương Án";

  let html = `
    <table class="w-full border-collapse text-xs text-center">
      <thead>
        <tr class="theme-sub-bg border-b border-slate-300 dark:border-slate-700 font-bold">
          <th class="p-2 border-r border-slate-200 dark:border-slate-700 text-left w-20">Câu số</th>
  `;

  if (hasTF) {
    html += `
          <th class="p-2 border-r border-slate-200 dark:border-slate-700">a) Đ / S</th>
          <th class="p-2 border-r border-slate-200 dark:border-slate-700">b) Đ / S</th>
          <th class="p-2 border-r border-slate-200 dark:border-slate-700">c) Đ / S</th>
          <th class="p-2">d) Đ / S</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
    `;

    parsedQuestions.forEach((q, qIdx) => {
      if (q.isShortAns) return;

      const tfState = Array.isArray(q.selectedAnswer) ? q.selectedAnswer : [false, false, false, false];

      html += `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td class="p-2 border-r border-slate-200 dark:border-slate-700 font-bold text-left">Câu ${q.id}</td>
      `;

      for (let i = 0; i < 4; i++) {
        const isTrue = tfState[i] === true;
        const isFalse = tfState[i] === false;

        html += `
          <td class="p-2 border-r border-slate-200 dark:border-slate-700">
            <div class="flex justify-center items-center space-x-2">
              <label class="cursor-pointer flex items-center space-x-1 px-1.5 py-0.5 rounded ${isTrue ? 'bg-emerald-100 dark:bg-emerald-900/60 font-bold text-emerald-700 dark:text-emerald-300' : ''}">
                <input type="radio" name="tf_${qIdx}_${i}" value="true" ${isTrue ? 'checked' : ''} onchange="toggleTFAnswer(${qIdx}, ${i}, true)">
                <span>Đ</span>
              </label>
              <label class="cursor-pointer flex items-center space-x-1 px-1.5 py-0.5 rounded ${isFalse ? 'bg-rose-100 dark:bg-rose-900/60 font-bold text-rose-700 dark:text-rose-300' : ''}">
                <input type="radio" name="tf_${qIdx}_${i}" value="false" ${isFalse ? 'checked' : ''} onchange="toggleTFAnswer(${qIdx}, ${i}, false)">
                <span>S</span>
              </label>
            </div>
          </td>
        `;
      }
      html += `</tr>`;
    });

  } else {
    html += `
          <th class="p-2 border-r border-slate-200 dark:border-slate-700 w-1/4">PA A</th>
          <th class="p-2 border-r border-slate-200 dark:border-slate-700 w-1/4">PA B</th>
          <th class="p-2 border-r border-slate-200 dark:border-slate-700 w-1/4">PA C</th>
          <th class="p-2 w-1/4">PA D</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
    `;

    parsedQuestions.forEach((q, qIdx) => {
      if (q.isShortAns) return;

      const selected = q.selectedAnswer;

      html += `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td class="p-2 border-r border-slate-200 dark:border-slate-700 font-bold text-left">Câu ${q.id}</td>
      `;

      ['A', 'B', 'C', 'D'].forEach(label => {
        const isChecked = selected === label;
        html += `
          <td class="p-2 border-r border-slate-200 dark:border-slate-700 cursor-pointer" onclick="selectChoiceAnswer(${qIdx}, '${label}')">
            <div class="h-7 flex items-center justify-center font-bold text-sm ${isChecked ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-400' : 'opacity-30 hover:opacity-100'}">
              ${isChecked ? label : ''}
            </div>
          </td>
        `;
      });

      html += `</tr>`;
    });
  }

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function selectChoiceAnswer(qIdx, choiceLabel) {
  if (parsedQuestions[qIdx].selectedAnswer === choiceLabel) {
    parsedQuestions[qIdx].selectedAnswer = null;
  } else {
    parsedQuestions[qIdx].selectedAnswer = choiceLabel;
  }
  renderAnswerTable();
  applyAnswersToOutput();
}

function toggleTFAnswer(qIdx, optionIdx, value) {
  if (!Array.isArray(parsedQuestions[qIdx].selectedAnswer)) {
    parsedQuestions[qIdx].selectedAnswer = [false, false, false, false];
  }
  parsedQuestions[qIdx].selectedAnswer[optionIdx] = value;
  renderAnswerTable();
  applyAnswersToOutput();
}

function clearAllAnswersInModal() {
  parsedQuestions.forEach(q => {
    if (q.isTF) {
      q.selectedAnswer = [false, false, false, false];
    } else {
      q.selectedAnswer = null;
    }
  });
  renderAnswerTable();
  applyAnswersToOutput();
}

function applyAnswersToOutput() {
  let outputText = document.getElementById('output-ex').value;

  const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/g;
  let matchIdx = 0;

  outputText = outputText.replace(exRegex, (fullMatch, innerContent) => {
    const qData = parsedQuestions[matchIdx++];
    if (!qData) return fullMatch;

    let updatedInner = innerContent;

    if (qData.isTF) {
      updatedInner = updatedInner.replace(/(\\choiceTF[\s\S]*?)(?=\\loigiai|\n\s*\n|$)/, (choiceBlock) => {
        const optionMatches = extractCurlyBrackets(choiceBlock);
        if (optionMatches.length < 4) return choiceBlock;

        const updatedOptions = optionMatches.slice(0, 4).map((m, idx) => {
          let cleanContent = m.innerContent.replace(/\\True\s*/g, '').trim();
          const isTrue = qData.selectedAnswer && qData.selectedAnswer[idx] === true;
          return `{${isTrue ? '\\True ' : ''}${cleanContent}}`;
        });

        return `\\choiceTF\n    ${updatedOptions.join('\n    ')}\n    `;
      });
    } else if (!qData.isShortAns) {
      updatedInner = updatedInner.replace(/(\\choice[\s\S]*?)(?=\\loigiai|\n\s*\n|$)/, (choiceBlock) => {
        const optionMatches = extractCurlyBrackets(choiceBlock);
        if (optionMatches.length < 4) return choiceBlock;

        const labels = ['A', 'B', 'C', 'D'];
        const updatedOptions = optionMatches.slice(0, 4).map((m, idx) => {
          let cleanContent = m.innerContent.replace(/\\True\s*/g, '').trim();
          const isTrue = qData.selectedAnswer === labels[idx];
          return `{${isTrue ? '\\True ' : ''}${cleanContent}}`;
        });

        return `\\choice\n    ${updatedOptions.join('\n    ')}\n    `;
      });
    }

    return `\\begin{ex}${updatedInner}\\end{ex}`;
  });

  setEditorValue('output-ex', outputText);
}

function saveAndCloseAnswerModal() {
  applyAnswersToOutput();
  closeAnswerModal();
}
