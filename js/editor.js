const historyStacks = {}; 

function initHistory(id) {
  if (!historyStacks[id]) {
    historyStacks[id] = { undoStack: [], redoStack: [], timeout: null };
  }
}

function saveState(id, force = false) {
  initHistory(id);
  const textarea = document.getElementById(id);
  if (!textarea) return;

  const state = {
    value: textarea.value,
    selectionStart: textarea.selectionStart,
    selectionEnd: textarea.selectionEnd
  };

  const h = historyStacks[id];
  const lastState = h.undoStack[h.undoStack.length - 1];

  if (lastState && lastState.value === state.value) return;

  if (force) {
    h.undoStack.push(state);
    h.redoStack = [];
    updateHistoryButtons(id);
  } else {
    clearTimeout(h.timeout);
    h.timeout = setTimeout(() => {
      h.undoStack.push(state);
      h.redoStack = [];
      updateHistoryButtons(id);
    }, 300);
  }
}

function undo(id) {
  initHistory(id);
  const h = historyStacks[id];
  const textarea = document.getElementById(id);
  if (!textarea || h.undoStack.length <= 1) return;

  const currentState = h.undoStack.pop();
  h.redoStack.push(currentState);

  const previousState = h.undoStack[h.undoStack.length - 1];
  textarea.value = previousState.value;
  textarea.setSelectionRange(previousState.selectionStart, previousState.selectionEnd);

  handleInput(id, false);
  updateHistoryButtons(id);
}

function redo(id) {
  initHistory(id);
  const h = historyStacks[id];
  const textarea = document.getElementById(id);
  if (!textarea || h.redoStack.length === 0) return;

  const nextState = h.redoStack.pop();
  h.undoStack.push(nextState);

  textarea.value = nextState.value;
  textarea.setSelectionRange(nextState.selectionStart, nextState.selectionEnd);

  handleInput(id, false);
  updateHistoryButtons(id);
}

function updateHistoryButtons(id) {
  initHistory(id);
  const h = historyStacks[id];
  const btnUndo = document.getElementById(`btn-undo-${id}`);
  const btnRedo = document.getElementById(`btn-redo-${id}`);

  if (btnUndo) btnUndo.disabled = h.undoStack.length <= 1;
  if (btnRedo) btnRedo.disabled = h.redoStack.length === 0;
}

document.addEventListener('keydown', function(e) {
  const activeEl = document.activeElement;
  if (activeEl && activeEl.tagName === 'TEXTAREA') {
    const id = activeEl.id;
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(id); else undo(id);
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo(id);
      }
    }
  }
});

const latexKeywords = [
  "\\begin{ex}", "\\end{ex}", "\\begin{itemize}", "\\end{itemize}",
  "\\begin{enumerate}", "\\end{enumerate}", "\\begin{description}", "\\end{description}",
  "\\begin{tikzpicture}", "\\end{tikzpicture}", "\\begin{tabular}", "\\end{tabular}",
  "\\begin{align}", "\\end{align}", "\\begin{align*}", "\\end{align*}",
  "\\begin{equation}", "\\end{equation}", "\\begin{equation*}", "\\end{equation*}",
  "\\begin{center}", "\\end{center}", "\\begin{flushleft}", "\\end{flushleft}",
  "\\begin{flushright}", "\\end{flushright}", "\\begin{quote}", "\\end{quote}",
  "\\begin{abstract}", "\\end{abstract}", "\\begin{figure}", "\\end{figure}",
  "\\begin{table}", "\\end{table}", "\\begin{matrix}", "\\end{matrix}",
  "\\begin{pmatrix}", "\\end{pmatrix}", "\\begin{bmatrix}", "\\end{bmatrix}",
  "\\begin{vmatrix}", "\\end{vmatrix}", "\\begin{Bmatrix}", "\\end{Bmatrix}",
  "\\begin{cases}", "\\end{cases}", "\\begin{array}", "\\end{array}",
  "\\begin{aligned}", "\\end{aligned}",
  "\\choice", "\\choiceTF", "\\True", "\\loigiai", "\\item", "\\shortans{}",
  "\\frac{}{}", "\\sqrt{}", "\\sqrt[]{}", "\\left", "\\right",
  "\\vec{}", "\\overrightarrow{}", "\\overline{}", "\\bar{}",
  "\\sum_{}^{}", "\\int_{}^{}", "\\iint", "\\iiint", "\\oint",
  "\\lim_{ \\to }", "\\infty", "\\partial", "\\nabla", "\\times", "\\div",
  "\\pm", "\\mp", "\\cdot", "\\ast", "\\star", "\\circ", "\\bullet",
  "\\leq", "\\geq", "\\neq", "\\approx", "\\equiv", "\\sim", "\\simeq",
  "\\subset", "\\supset", "\\subseteq", "\\supseteq", "\\in", "\\notin",
  "\\cup", "\\cap", "\\setminus", "\\emptyset", "\\forall", "\\exists",
  "\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon", "\\varepsilon",
  "\\sin", "\\cos", "\\tan", "\\cot", "\\sec", "\\csc", "\\log", "\\ln"
];

function handleKeyDown(e, id) {
  const textarea = document.getElementById(id);
  const dropdown = document.getElementById(`autocomplete-${id}`);

  if (e.key === 'Tab') {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (dropdown && dropdown.style.display === 'block') {
      const activeItem = dropdown.querySelector('.autocomplete-item.active') || dropdown.querySelector('.autocomplete-item');
      if (activeItem) {
        activeItem.click();
        return;
      }
    }

    if (start === end) {
      textarea.setRangeText('    ', start, end, 'end');
    } else {
      const value = textarea.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const selectedText = value.substring(lineStart, end);
      const lines = selectedText.split('\n');
      
      if (e.shiftKey) {
        const indented = lines.map(l => l.startsWith('    ') ? l.substring(4) : (l.startsWith('\t') ? l.substring(1) : l)).join('\n');
        textarea.setRangeText(indented, lineStart, end, 'select');
      } else {
        const indented = lines.map(l => '    ' + l).join('\n');
        textarea.setRangeText(indented, lineStart, end, 'select');
      }
    }
    handleInput(id);
    return;
  }

  if (dropdown && dropdown.style.display === 'block') {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    let activeIdx = Array.from(items).findIndex(el => el.classList.contains('active'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeIdx < items.length - 1) {
        if (activeIdx >= 0) items[activeIdx].classList.remove('active');
        items[activeIdx + 1].classList.add('active');
        items[activeIdx + 1].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeIdx > 0) {
        items[activeIdx].classList.remove('active');
        items[activeIdx - 1].classList.add('active');
        items[activeIdx - 1].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && dropdown.style.display === 'block') {
        e.preventDefault();
        items[activeIdx].click();
        return;
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  }
}

function updateAutocomplete(id) {
  const textarea = document.getElementById(id);
  const dropdown = document.getElementById(`autocomplete-${id}`);
  if (!dropdown) return;

  const cursorPos = textarea.selectionStart;
  const textBefore = textarea.value.substring(0, cursorPos);
  const match = textBefore.match(/\\[a-zA-Z]*$/);

  if (!match || match[0].length <= 1) {
    dropdown.style.display = 'none';
    return;
  }

  const query = match[0].toLowerCase();
  const filtered = latexKeywords.filter(kw => kw.toLowerCase().startsWith(query));

  if (filtered.length === 0 || (filtered.length === 1 && filtered[0].toLowerCase() === query)) {
    dropdown.style.display = 'none';
    return;
  }

  dropdown.innerHTML = '';
  filtered.forEach((kw, idx) => {
    const item = document.createElement('div');
    item.className = `autocomplete-item ${idx === 0 ? 'active bg-slate-200 dark:bg-slate-700 font-semibold' : ''}`;
    item.textContent = kw;
    item.onclick = () => {
      const start = textarea.selectionStart;
      const replaceStart = start - query.length;
      
      let insertText = kw;
      let cursorOffset = kw.length;

      if (kw.startsWith('\\begin{') && kw.endsWith('}')) {
        const envName = kw.substring(7, kw.length - 1);
        insertText = `\\begin{${envName}}\n    \n\\end{${envName}}`;
        cursorOffset = `\\begin{${envName}}\n    `.length;
      }

      textarea.setRangeText(insertText, replaceStart, start, 'end');
      textarea.setSelectionRange(replaceStart + cursorOffset, replaceStart + cursorOffset);

      dropdown.style.display = 'none';
      handleInput(id);
      textarea.focus();
    };
    dropdown.appendChild(item);
  });

  dropdown.style.display = 'block';
  dropdown.style.left = '48px'; 
  dropdown.style.top = '48px';
}

const searchStates = {};

function highlightText(text, id) {
  if (!text) return '';
  let searchKeyword = "";
  let matchCase = false;
  let activeIndex = -1;

  if (id && document.getElementById(`find-${id}`)) {
    searchKeyword = document.getElementById(`find-${id}`).value;
    matchCase = document.getElementById(`match-case-${id}`).checked;
    if (searchStates[id]) activeIndex = searchStates[id].activeMatchIndex;
  }

  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/(\%[^\n]*)/g, '<span class="hl-comment">$1</span>');
  html = html.replace(/(\$(?:[^\$\\]|\\.)*\$)/g, '<span class="hl-math">$1</span>');
  html = html.replace(/\\(begin|end|choice|choiceTF|loigiai|item|shortans)\b/g, '<span class="hl-keyword">\\$1</span>');
  html = html.replace(/\\True\b/g, '<span class="hl-true">\\True</span>');
  html = html.replace(/(\{ex\}|\{tikzpicture\}|\{itemize\}|\{enumerate\})/g, '<span class="hl-env">$1</span>');

  if (searchKeyword.trim()) {
    const flags = matchCase ? 'g' : 'gi';
    const searchRegex = new RegExp(escapeRegExp(searchKeyword), flags);
    const parts = html.split(/(<[^>]+>)/g);
    let matchCounter = 0;

    for (let i = 0; i < parts.length; i++) {
      if (!parts[i].startsWith('<')) {
        parts[i] = parts[i].replace(searchRegex, (match) => {
          const isCurrent = (matchCounter++ === activeIndex);
          return `<mark class="${isCurrent ? 'hl-search-match-active' : 'hl-search-match'}">${match}</mark>`;
        });
      }
    }
    html = parts.join('');
  }

  if (html.endsWith('\n')) html += ' ';
  return html;
}

function handleInput(id, recordHistory = true) {
  const textarea = document.getElementById(id);
  const hlDiv = document.getElementById(`hl-${id}`);
  const linesDiv = document.getElementById(`lines-${id}`);

  hlDiv.innerHTML = highlightText(textarea.value, id);
  const lineCount = textarea.value.split('\n').length;
  linesDiv.innerHTML = Array.from({length: lineCount}, (_, i) => i + 1).join('\n');
  syncScroll(id);

  updateAutocomplete(id);
  if (recordHistory) saveState(id);
}

function syncScroll(id) {
  const textarea = document.getElementById(id);
  const hlDiv = document.getElementById(`hl-${id}`);
  const linesDiv = document.getElementById(`lines-${id}`);

  hlDiv.scrollTop = textarea.scrollTop;
  linesDiv.scrollTop = textarea.scrollTop;
}

function setEditorValue(id, value) {
  const textarea = document.getElementById(id);
  textarea.value = value;
  handleInput(id, false);
  saveState(id, true);
}

function findText(id) {
  const findVal = document.getElementById(`find-${id}`).value;
  const countSpan = document.getElementById(`count-${id}`);
  const matchCase = document.getElementById(`match-case-${id}`).checked;
  const textarea = document.getElementById(id);

  if (!searchStates[id]) searchStates[id] = { matches: [], activeMatchIndex: -1 };

  if (!findVal) {
    searchStates[id] = { matches: [], activeMatchIndex: -1 };
    countSpan.textContent = "0/0";
    handleInput(id, false);
    return;
  }

  const flags = matchCase ? 'g' : 'gi';
  const regex = new RegExp(escapeRegExp(findVal), flags);
  const matches = [];
  let match;

  while ((match = regex.exec(textarea.value)) !== null) {
    matches.push({ index: match.index, length: match[0].length });
  }

  searchStates[id].matches = matches;

  if (matches.length > 0) {
    if (searchStates[id].activeMatchIndex < 0 || searchStates[id].activeMatchIndex >= matches.length) {
      searchStates[id].activeMatchIndex = 0;
    }
    countSpan.textContent = `${searchStates[id].activeMatchIndex + 1}/${matches.length}`;
    scrollToMatch(id);
  } else {
    searchStates[id].activeMatchIndex = -1;
    countSpan.textContent = "0/0";
  }

  handleInput(id, false);
}

function navigateSearch(id, direction) {
  const state = searchStates[id];
  if (!state || !state.matches || state.matches.length === 0) return;

  state.activeMatchIndex += direction;
  if (state.activeMatchIndex >= state.matches.length) state.activeMatchIndex = 0;
  else if (state.activeMatchIndex < 0) state.activeMatchIndex = state.matches.length - 1;

  document.getElementById(`count-${id}`).textContent = `${state.activeMatchIndex + 1}/${state.matches.length}`;
  scrollToMatch(id);
  handleInput(id, false);
}

function scrollToMatch(id) {
  const state = searchStates[id];
  if (!state || state.activeMatchIndex < 0) return;

  const textarea = document.getElementById(id);
  const match = state.matches[state.activeMatchIndex];

  const textBefore = textarea.value.substring(0, match.index);
  const lineNumber = textBefore.split('\n').length;
  textarea.scrollTop = (lineNumber - 3) * 24;
  syncScroll(id);
}

function replaceText(id, replaceAll = false) {
  const findVal = document.getElementById(`find-${id}`).value;
  const replaceVal = document.getElementById(`replace-${id}`).value;
  const matchCase = document.getElementById(`match-case-${id}`).checked;
  const textarea = document.getElementById(id);

  if (!findVal) return;

  const flags = matchCase ? 'g' : 'gi';

  if (replaceAll) {
    const regex = new RegExp(escapeRegExp(findVal), flags);
    textarea.value = textarea.value.replace(regex, replaceVal);
  } else {
    const state = searchStates[id];
    if (state && state.matches && state.activeMatchIndex >= 0) {
      const match = state.matches[state.activeMatchIndex];
      const before = textarea.value.substring(0, match.index);
      const after = textarea.value.substring(match.index + match.length);
      textarea.value = before + replaceVal + after;
    } else {
      const regex = new RegExp(escapeRegExp(findVal), matchCase ? '' : 'i');
      textarea.value = textarea.value.replace(regex, replaceVal);
    }
  }

  findText(id);
  saveState(id, true);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadFile(event, targetId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) { setEditorValue(targetId, e.target.result); };
  reader.readAsText(file);
}

function clearText(id) {
  setEditorValue(id, '');
  if (id === 'input-ex') setEditorValue('output-ex', '');
}

function copyToClipboard(id) {
  const textarea = document.getElementById(id);
  if (!textarea.value) return;
  navigator.clipboard.writeText(textarea.value);
  alert('Đã copy vào bộ nhớ tạm!');
}

function downloadSingleText(elementId, filename) {
  const text = document.getElementById(elementId).value;
  if (!text) return;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveBlob(blob, filename);
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
