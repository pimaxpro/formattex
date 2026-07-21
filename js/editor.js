/* =========================================================
   PIMAX TOOL — EDITOR ENGINE (UNDO/REDO + LINE NUMBERS + AUTOCOMPLETE)
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

  // Nếu trạng thái hiện tại khác trạng thái cuối trong stack thì đẩy vào
  if (hist.index === -1 || hist.stack[hist.index] !== val) {
    if (force || hist.index === -1 || val !== hist.stack[hist.index]) {
      // Cắt bỏ phần dư nếu đang đứng ở giữa lịch sử
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

  // Tùy chỉnh trạng thái sáng/mờ của nút Undo / Redo trên giao diện tương ứng
  const undoBtn = document.getElementById(`btn-undo-${id}`);
  const redoBtn = document.getElementById(`btn-redo-${id}`);

  if (undoBtn) {
    undoBtn.disabled = hist.index <= 0;
    undoBtn.style.opacity = undoBtn.disabled ? "0.4" : "1";
  }
  if (redoBtn) {
    redoBtn.disabled = hist.index >= hist.stack.length - 1;
    redoBtn.style.opacity = redoBtn.disabled ? "0.4" : "1";
  }
}

/* Danh sách gợi ý lệnh LaTeX Toán nâng cao */
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

/* Xử lý nhập liệu chung */
function handleInput(id) {
  const textarea = document.getElementById(id);
  const linesDiv = document.getElementById(`lines-${id}`);

  if (!textarea) return;

  // 1. Cập nhật số dòng
  if (linesDiv) {
    const lineCount = textarea.value.split('\n').length;
    let linesHTML = '';
    for (let i = 1; i <= lineCount; i++) {
      linesHTML += i + '\n';
    }
    linesDiv.textContent = linesHTML;
  }

  // 2. Lưu trạng thái lịch sử Undo/Redo
  saveState(id);

  // 3. Đồng bộ cuộn và kiểm tra gợi ý code
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
