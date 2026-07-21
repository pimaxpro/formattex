/* =========================================================
   PIMAX TOOL — COMPLETE EDITOR ENGINE & UTILITIES
   ========================================================= */

// System history storage for Undo / Redo
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
   FIND & REPLACE ENGINE
   ========================================================= */

let searchMatches = [];
let currentSearchIndex = -1;

function findText(id) {
  const textarea = document.getElementById(id);
  const findInput = document.getElementById(`find-${id}`) || document.getElementById(`find-output-ex`);
  const countEl = document.getElementById(`count-${id}`) || document.getElementById(`count-output-ex`);
  const matchCaseEl = document.getElementById(`match-case-${id}`) || document.getElementById(`match-case-output-ex`);

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

  try {
    const regex = new RegExp(escapedQuery, flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      searchMatches.push({
        start: match.index,
        end: match.index + match[0].length
      });
      if (match[0].length === 0) break;
    }
  } catch (e) {
    console.error("Lỗi tìm kiếm:", e);
  }

  if (searchMatches.length > 0) {
    currentSearchIndex = 0;
    if (countEl) {
      countEl.textContent = `1/${searchMatches.length}`;
    }
  } else {
    if (countEl) countEl.textContent = "0/0";
  }
}

function navigateSearch(id, direction) {
  if (searchMatches.length === 0) {
    findText(id);
  }
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
  const countEl = document.getElementById(`count-${id}`) || document.getElementById(`count-output-ex`);

  if (!textarea || searchMatches.length === 0) return;

  const match = searchMatches[currentSearchIndex];
  textarea.focus();
  textarea.setSelectionRange(match.start, match.end);

  const textBefore = textarea.value.substring(0, match.start);
  const lineNum = textBefore.split('\n').length;
  textarea.scrollTop = Math.max(0, (lineNum - 3) * 24);

  if (countEl) {
    countEl.textContent = `${currentSearchIndex + 1}/${searchMatches.length}`;
  }
}

function replaceText(id, all = false) {
  const textarea = document.getElementById(id);
  const findInput = document.getElementById(`find-${id}`) || document.getElementById(`find-output-ex`);
  const replaceInput = document.getElementById(`replace-${id}`) || document.getElementById(`replace-output-ex`);
  const matchCaseEl = document.getElementById(`match-case-${id}`) || document.getElementById(`match-case-output-ex`);

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

/* =========================================================
   CÁC HÀM TIỆN ÍCH TIẾP THỊ VĂN BẢN (COPY, DOWNLOAD, CLEAR, LOAD)
   ========================================================= */

// 1. Sao chép nội dung ô Editor vào Clipboard
function copyToClipboard(id) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  const text = textarea.value;
  if (!text) {
    showToast("Chưa có nội dung để sao chép!", true);
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Đã sao chép nội dung vào Clipboard!");
    }).catch(() => {
      fallbackCopyTextToClipboard(text);
    });
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showToast("Đã sao chép nội dung vào Clipboard!");
    } else {
      showToast("Sao chép thất bại, thầy vui lòng chọn và copy thủ công!", true);
    }
  } catch (err) {
    showToast("Không thể sao chép tự động!", true);
  }

  document.body.removeChild(textArea);
}

// 2. Tải nội dung ô Editor thành file văn bản (.tex / .txt)
function downloadSingleText(id, defaultFileName) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  const text = textarea.value;
  if (!text.trim()) {
    showToast("Không có nội dung để tải về!", true);
    return;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFileName || 'file_pimax.tex';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Đã tải xuống file "${a.download}" thành công!`);
}

// 3. Xóa văn bản ô Editor
function clearText(id) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  if (textarea.value && confirm("Thầy có chắc chắn muốn xóa toàn bộ nội dung ô này?")) {
    textarea.value = '';
    handleInput(id);
    showToast("Đã xóa toàn bộ nội dung ô!");
  }
}

// 4. Nạp file từ máy tính vào ô Editor
function loadFile(event, id) {
  const input = event.target;
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const textarea = document.getElementById(id);
    if (textarea) {
      textarea.value = e.target.result;
      handleInput(id);
      showToast(`Đã nạp file "${file.name}" thành công!`);
    }
  };

  reader.readAsText(file);
  input.value = '';
}

// 5. Hiển thị thông báo Toast
function showToast(message, isError = false) {
  let toast = document.getElementById('pimax-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pimax-toast';
    toast.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 text-xs font-semibold px-4 py-2 rounded-lg shadow-xl z-[1000] transition-opacity duration-300 opacity-0 pointer-events-none flex items-center gap-2';
    document.body.appendChild(toast);
  }

  if (isError) {
    toast.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 bg-rose-900 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl z-[1000] transition-opacity duration-300 opacity-0 pointer-events-none flex items-center gap-2 border border-rose-700';
    toast.innerHTML = `<svg class="w-4 h-4 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> <span>${message}</span>`;
  } else {
    toast.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl z-[1000] transition-opacity duration-300 opacity-0 pointer-events-none flex items-center gap-2 border border-slate-700';
    toast.innerHTML = `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span>${message}</span>`;
  }

  toast.classList.remove('opacity-0');
  toast.classList.add('opacity-100');

  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, 2200);
}

// Khởi tạo sự kiện khi tải trang
document.addEventListener("DOMContentLoaded", () => {
  ['output-ex', 'input-ex', 'output-main', 'input-tikz', 'output-tikz-single'].forEach(id => {
    const el = document.getElementById(id);
    if (el) saveState(id, true);

    const findInput = document.getElementById(`find-${id}`);
    const matchCaseEl = document.getElementById(`match-case-${id}`);
    
    if (findInput) {
      findInput.addEventListener('input', () => findText(id));
      findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          navigateSearch(id, e.shiftKey ? -1 : 1);
        }
      });
    }
    if (matchCaseEl) {
      matchCaseEl.addEventListener('change', () => findText(id));
    }
  });
});
