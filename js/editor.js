/* =========================================================
   PIMAX TOOL — CLEAN EDITOR & AUTOCOMPLETE ENGINE
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
  { cmd: '\\begin{tikzpicture}\n    \n\\end{tikzpicture}', label: '\\begin{tikzpicture}', desc: 'Hình TikZ' },
  { cmd: '\\int_{}^{}', label: '\\int', desc: 'Tích phân' },
  { cmd: '\\lim_{x \\to }', label: '\\lim', desc: 'Giới hạn' }
];

let activeIndex = 0;
let filteredSuggestions = [];

/* Đếm số dòng mượt mà */
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

  syncScroll(id);
  checkAutocompleteTrigger(id);
}

/* Đồng bộ cuộn giữa số dòng và Textarea */
function syncScroll(id) {
  const textarea = document.getElementById(id);
  const linesDiv = document.getElementById(`lines-${id}`);

  if (textarea && linesDiv) {
    linesDiv.scrollTop = textarea.scrollTop;
  }
}

/* Điều khiển Autocomplete bằng phím Mũi tên & Enter/Tab */
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

  // Phím Tab thụt lề 4 khoảng trắng
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

/* Kích hoạt gợi ý lệnh khi gõ \ */
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
