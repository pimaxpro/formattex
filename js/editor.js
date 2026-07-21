/* =========================================================
   PIMAX TOOL — EDITOR ENGINE (COMPLETE & POLISHED)
   ========================================================= */

// Hệ thống lưu trữ lịch sử Undo / Redo cho từng Editor
const editorHistories = {};

function initEditorHistory(id) {
  if (!editorHistories[id]) {
    editorHistories[id] = {
      stack: [],
      index: -1,
      isApplying: false
    };
  }
}

function saveState(id, force = false) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  initEditorHistory(id);
  const hist = editorHistories[id];
  const val = textarea.value;

  if (hist.isApplying) return;

  if (hist.index === -1 || hist.stack[hist.index] !== val) {
    if (force || hist.index === -1 || val !== hist.stack[hist.index]) {
      hist.stack = hist.stack.slice(0, hist.index + 1);
      hist.stack.push(val);
      hist.index = hist.stack.length - 1;
      updateUndoRedoButtons(id);
    }
  }
}

function undo(id) {
  initEditorHistory(id);
  const hist = editorHistories[id];
  if (hist.index > 0) {
    hist.index--;
    applyHistoryState(id, hist.stack[hist.index]);
  }
}

function redo(id) {
  initEditorHistory(id);
  const hist = editorHistories[id];
  if (hist.index < hist.stack.length - 1) {
    hist.index++;
    applyHistoryState(id, hist.stack[hist.index]);
  }
}

function applyHistoryState(id, val) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  const hist = editorHistories[id];
  hist.isApplying = true;
  textarea.value = val;
  handleInput(id);
  hist.isApplying = false;
  updateUndoRedoButtons(id);
}

function updateUndoRedoButtons(id) {
  const hist = editorHistories[id];
  if (!hist) return;

  if (id === 'input-ex') {
    updateBtnState(document.getElementById('btn-undo-input-ex'), hist.index <= 0);
    updateBtnState(document.getElementById('btn-redo-input-ex'), hist.index >= hist.stack.length - 1);
  } else if (id === 'output-ex') {
    updateBtnState(document.getElementById('btn-undo-output-ex'), hist.index <= 0);
    updateBtnState(document.getElementById('btn-redo-output-ex'), hist.index >= hist.stack.length - 1);
  } else {
    updateBtnState(document.getElementById(`btn-undo-${id}`), hist.index <= 0);
    updateBtnState(document.getElementById(`btn-redo-${id}`), hist.index >= hist.stack.length - 1);
  }
}

function updateBtnState(btn, isDisabled) {
  if (!btn) return;
  btn.disabled = isDisabled;
  if (isDisabled) {
    btn.classList.add('opacity-40', 'cursor-not-allowed');
    btn.classList.remove('hover:bg-gray-200', 'hover-pimax');
  } else {
    btn.classList.remove('opacity-40', 'cursor-not-allowed');
    btn.classList.add('hover:bg-gray-200', 'hover-pimax');
  }
}

/* =========================================================
   FIND & REPLACE ENGINE (HỖ TRỢ MATCH CASE & HIGHLIGHT)
   ========================================================= */

let searchMatches = [];
let currentSearchIndex = -1;

function findText(id) {
  const textarea = document.getElementById(id);
  const findInput = document.getElementById(`find-${id}`);
  const countEl = document.getElementById(`count-${id}`);
  const matchCaseEl = document.getElementById(`match-case-${id}`);

  if (!textarea || !findInput) return;

  const query = findInput.value;
  const matchCase = matchCaseEl ? matchCaseEl.checked : false;
  searchMatches = [];
  currentSearchIndex = -1;

  if (!query) {
    if (countEl) countEl.textContent = "0/0";
    return;
  }

  const text = textarea.value;
  const flags = matchCase ? 'g' : 'gi';
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, flags);

  let match;
  while ((match = regex.exec(text)) !== null) {
    searchMatches.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }

  if (searchMatches.length > 0) {
    currentSearchIndex = 0;
    highlightMatch(id);
  } else {
    if (countEl) countEl.textContent = "0/0";
  }
}

function navigateSearch(id, direction) {
  if (searchMatches.length === 0) return;

  currentSearchIndex += direction;
  if (currentSearchIndex >= searchMatches.length) {
    currentSearchIndex = 0;
  } else if (currentSearchIndex < 0) {
    currentSearchIndex = searchMatches.length - 1;
  }

  highlightMatch(id);
}

function highlightMatch(id) {
  const textarea = document.getElementById(id);
  const countEl = document.getElementById(`count-${id}`);

  if (!textarea || searchMatches.length === 0) return;

  const match = searchMatches[currentSearchIndex];
  textarea.focus();
  
  // Highlight trực quan từ tìm thấy bằng cách bôi đen vùng text đó trong textarea
  textarea.setSelectionRange(match.start, match.end);

  // Cuộn mượt đến dòng chứa kết quả
  const textBefore = textarea.value.substring(0, match.start);
  const lineNum = textBefore.split('\n').length;
  textarea.scrollTop = Math.max(0, (lineNum - 3) * 24);

  if (countEl) {
    countEl.textContent = `${currentSearchIndex + 1}/${searchMatches.length}`;
  }
}

function replaceText(id, all = false) {
  const textarea = document.getElementById(id);
  const findInput = document.getElementById(`find-${id}`);
  const replaceInput = document.getElementById(`replace-${id}`);
  const matchCaseEl = document.getElementById(`match-case-${id}`);

  if (!textarea || !findInput || !replaceInput) return;

  const query = findInput.value;
  const replacement = replaceInput.value;
  const matchCase = matchCaseEl ? matchCaseEl.checked : false;

  if (!query) return;

  const text = textarea.value;

  if (all) {
    const flags = matchCase ? 'g' : 'gi';
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, flags);
    
    textarea.value = text.replace(regex, replacement);
  } else {
    if (searchMatches.length === 0 || currentSearchIndex === -1) {
      findText(id);
      if (searchMatches.length === 0) return;
    }

    const match = searchMatches[currentSearchIndex];
    textarea.value = text.substring(0, match.start) + replacement + text.substring(match.end);
    textarea.setSelectionRange(match.start, match.start + replacement.length);
  }

  handleInput(id);
  findText(id);
}

/* =========================================================
   LATEX AUTOCOMPLETE & EDITOR CORE
   ========================================================= */

const LATEX_SUGGESTIONS = [
  { cmd: '\\begin{ex}\n    \n    \\choice\n    {}\n    {}\n    {}\n    {}\n    \\loigiai{\n    \n    }\n\\end{ex}', label: '\\begin{ex}...\\end{ex}', desc: 'Khối câu hỏi' },
  { cmd: '\\choice\n    {}\n    {}\n    {}\n    {}', label: '\\choice', desc: '4 phương án' },
  { cmd: '\\choiceTF\n    {}\n    {}\n    {}\n    {}', label: '\\choiceTF', desc: 'Đúng / Sai' },
  { cmd: '\\shortans{}', label: '\\shortans{}', desc: 'Trả lời ngắn' },
  { cmd: '\\loigiai{\n    \n}', label: '\\loigiai{}', desc: 'Lời giải' },
  { cmd: '\\True ', label: '\\True', desc: 'Đáp án đúng' },
  { cmd: '\\frac{}{}', label: '\\frac{a}{b}', desc: 'Phân số' },
  { cmd: '\\sqrt{}', label: '\\sqrt{x}', desc: 'Căn bậc hai' },
  { cmd: '\\vec{}', label: '\\vec{a}', desc: 'Vectơ' },
  { cmd: '\\begin{aligned}\n    \n\\end{aligned}', label: '\\begin{aligned}', desc: 'Hệ phương trình' },
  { cmd: '\\begin{cases}\n    \n\\end{cases}', label: '\\begin{cases}', desc: 'Ngoặc nhọn hệ' },
  { cmd: '\\begin{tikzpicture}\n    \n\\end{tikzpicture}', label: '\\begin{tikzpicture}', desc: 'Hình TikZ' }
];

let activeIndex = 0;
let filteredSuggestions = [];

function handleInput(id) {
  const textarea = document.getElementById(id);
  const linesDiv = document.getElementById(`lines-${id}`);

  if (!textarea) return;

  if (linesDiv) {
    const lineCount = textarea.value.split('\n').length;
    let linesHTML = '';
    for (let i = 1; i <= lineCount; i++) {
      linesHTML += i + '\n';
    }
    linesDiv.textContent = linesHTML;
  }

  saveState(id);
  syncScroll(id);
  checkAutocompleteTrigger(id);
}

function syncScroll(id) {
  const textarea = document.getElementById(id);
  const linesDiv = document.getElementById(`lines-${id}`);

  if (textarea && linesDiv) {
    linesDiv.scrollTop = textarea.scrollTop;
  }
}

function handleKeyDown(e, id) {
  const dropdown = document.getElementById(`autocomplete-${id}`);
  
  if (dropdown && dropdown.style.display === 'block') {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % filteredSuggestions.length;
      renderAutocompleteItems(id);
      return;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length;
      renderAutocompleteItems(id);
      return;
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filteredSuggestions[activeIndex]) {
        insertSuggestion(id, filteredSuggestions[activeIndex].cmd);
      }
      hideAutocomplete(id);
      return;
    } else if (e.key === 'Escape') {
      hideAutocomplete(id);
      return;
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = document.getElementById(id);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    textarea.value = textarea.value.substring(0, start) + "    " + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 4;
    handleInput(id);
  }
}

function checkAutocompleteTrigger(id) {
  const textarea = document.getElementById(id);
  const dropdown = document.getElementById(`autocomplete-${id}`);
  if (!textarea || !dropdown) return;

  const cursorPos = textarea.selectionStart;
  const textBeforeCursor = textarea.value.substring(0, cursorPos);
  const match = textBeforeCursor.match(/\\([a-zA-Z]*)$/);

  if (match) {
    const query = '\\' + match[1].toLowerCase();
    filteredSuggestions = LATEX_SUGGESTIONS.filter(item => 
      item.label.toLowerCase().includes(query) || item.cmd.toLowerCase().includes(query)
    );

    if (filteredSuggestions.length > 0) {
      activeIndex = 0;
      renderAutocompleteItems(id);
      dropdown.style.display = 'block';
      dropdown.style.top = '30px';
      dropdown.style.left = '40px';
      return;
    }
  }
  hideAutocomplete(id);
}

function renderAutocompleteItems(id) {
  const dropdown = document.getElementById(`autocomplete-${id}`);
  if (!dropdown) return;

  let html = '';
  filteredSuggestions.forEach((item, index) => {
    const isActive = index === activeIndex ? 'active' : '';
    html += `
      <div class="autocomplete-item ${isActive}" onclick="insertSuggestion('${id}', '${escapeJsString(item.cmd)}')">
        <span>${escapeHtml(item.label)}</span>
        <span class="autocomplete-item-desc">${escapeHtml(item.desc)}</span>
      </div>
    `;
  });
  dropdown.innerHTML = html;
}

function insertSuggestion(id, cmd) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  const cursorPos = textarea.selectionStart;
  const textBeforeCursor = textarea.value.substring(0, cursorPos);
  const textAfterCursor = textarea.value.substring(cursorPos);

  const match = textBeforeCursor.match(/\\([a-zA-Z]*)$/);
  if (match) {
    const replaceStart = cursorPos - match[0].length;
    textarea.value = textarea.value.substring(0, replaceStart) + cmd + textAfterCursor;
    textarea.selectionStart = textarea.selectionEnd = replaceStart + cmd.length;
  } else {
    textarea.value = textBeforeCursor + cmd + textAfterCursor;
    textarea.selectionStart = textarea.selectionEnd = cursorPos + cmd.length;
  }

  handleInput(id);
  hideAutocomplete(id);
  textarea.focus();
}

function hideAutocomplete(id) {
  const dropdown = document.getElementById(`autocomplete-${id}`);
  if (dropdown) dropdown.style.display = 'none';
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeJsString(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

// Khởi tạo trạng thái ban đầu khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
  ['input-ex', 'output-ex', 'input-tikz', 'output-main', 'output-tikz-single'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      saveState(id, true);
    }
  });
});
