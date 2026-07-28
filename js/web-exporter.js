/* =========================================================
   FORMATTEX — WEB EXPORTER MODULE (VỨT LÊN WEB & GỘP WORD)
   ========================================================= */

/** Trích xuất nội dung bên trong cặp ngoặc nhọn cân bằng {} */
function extractBracedGroup(str, startIndex) {
  let depth = 0;
  let start = -1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.substring(start, i), endIndex: i };
      }
    }
  }
  return null;
}

function skipWhitespaceAndComments(str, startIndex) {
  let curr = startIndex;
  while (curr < str.length) {
    if (/\s/.test(str[curr])) {
      curr++;
      continue;
    }
    if (str[curr] === '%' && !/^%\s*\\(ans|shortans)\{/i.test(str.substring(curr))) {
      while (curr < str.length && str[curr] !== '\n') curr++;
      continue;
    }
    break;
  }
  return curr;
}

function extractMultipleBracedGroups(str, startIndex) {
  const groups = [];
  let curr = startIndex;
  while (curr < str.length) {
    curr = skipWhitespaceAndComments(str, curr);
    if (curr < str.length && str[curr] === '{') {
      const res = extractBracedGroup(str, curr);
      if (res) {
        groups.push(res.content);
        curr = res.endIndex + 1;
      } else break;
    } else break;
  }
  return { groups, endIndex: curr };
}

function cleanComments(text) {
  if (!text) return "";
  return text.split('\n').map(line => {
    if (/%\s*\\ans\{/i.test(line) || /%\s*\\shortans/i.test(line)) return line;
    return line.replace(/(^|[^\\])%.*/, '$1');
  }).join('\n');
}

function convertDisplayMathToInline(text) {
  if (!text) return "";
  let converted = text;
  converted = converted.replace(/\\\[([\s\S]*?)\\\]/g, (m, math) => `$${math.trim()}$`);
  converted = converted.replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => `$${math.trim()}$`);

  const displayEnvs = ['equation', 'equation\\*', 'align', 'align\\*', 'gather', 'gather\\*'];
  displayEnvs.forEach(env => {
    const regex = new RegExp(`\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}`, 'gi');
    converted = converted.replace(regex, (m, math) => {
      const cleanMath = math.replace(/\\\\/g, ' ').replace(/\s+/g, ' ').trim();
      return `$${cleanMath}$`;
    });
  });

  return converted;
}

function ensureEndingDot(text) {
  if (!text) return "";
  let trimmed = text.trim();
  if (!/[.!?]$/.test(trimmed)) trimmed += ".";
  return trimmed;
}

function cleanTextForWeb(text) {
  if (!text) return "";
  let cleaned = cleanComments(text);
  cleaned = convertDisplayMathToInline(cleaned);

  const loigiaiRegex = /\\loigiai\s*\{/g;
  let match;
  while ((match = loigiaiRegex.exec(cleaned)) !== null) {
    const res = extractBracedGroup(cleaned, match.index + match[0].length - 1);
    if (res) {
      cleaned = cleaned.substring(0, match.index) + cleaned.substring(res.endIndex + 1);
      loigiaiRegex.lastIndex = match.index;
    } else break;
  }

  cleaned = cleaned.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{center\}[\s\S]*?\\end\{center\}/gi, '');
  cleaned = cleaned.replace(/\\begin\{immini\}[\s\S]*?\\end\{immini\}/gi, '');

  const imminiRegex = /\\immini\s*\{/g;
  while ((match = imminiRegex.exec(cleaned)) !== null) {
    const arg1 = extractBracedGroup(cleaned, match.index + match[0].length - 1);
    if (arg1) {
      const arg2 = extractBracedGroup(cleaned, arg1.endIndex + 1);
      const endIndex = arg2 ? arg2.endIndex : arg1.endIndex;
      cleaned = cleaned.substring(0, match.index) + arg1.content + cleaned.substring(endIndex + 1);
      imminiRegex.lastIndex = match.index;
    } else {
      cleaned = cleaned.substring(0, match.index) + cleaned.substring(match.index + match[0].length);
      imminiRegex.lastIndex = match.index;
    }
  }
  cleaned = cleaned.replace(/\\immini\b/gi, '');

  cleaned = cleaned.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gi, (m, body) => {
    return '\n' + body.split('\\item').map(i => i.trim()).filter(i => i.length > 0).map(i => `- ${i}`).join('\n');
  });

  cleaned = cleaned.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi, (m, body) => {
    let count = 1;
    return '\n' + body.split('\\item').map(i => i.trim()).filter(i => i.length > 0).map(i => `${count++}. ${i}`).join('\n');
  });

  const textCmds = ['textbf', 'textit', 'texttt', 'textsl', 'textsc', 'textsf', 'text'];
  textCmds.forEach(cmd => {
    const regex = new RegExp(`\\\\${cmd}\\s*\\{`, 'g');
    let m;
    while ((m = regex.exec(cleaned)) !== null) {
      const res = extractBracedGroup(cleaned, m.index + m[0].length - 1);
      if (res) {
        cleaned = cleaned.substring(0, m.index) + res.content + cleaned.substring(res.endIndex + 1);
        regex.lastIndex = m.index;
      } else break;
    }
  });

  const layoutCmds = ['noindent', 'hfill', 'vfill', 'centering', 'raggedright', 'raggedleft', 'clearpage', 'newpage'];
  layoutCmds.forEach(cmd => {
    cleaned = cleaned.replace(new RegExp(`\\\\${cmd}\\b`, 'gi'), '');
  });

  cleaned = cleaned.replace(/%\s*\\ans\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/(?:%|\s)*\\shortans(?:\[[^\]]*\])?\s*\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\\\\/g, '\n');
  cleaned = cleaned.replace(/\\vspace\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\\hspace\{[^}]*\}/gi, '');

  return cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');
}

function hasGraphicElement(exContent) {
  return /\\begin\{tikzpicture\}/i.test(exContent) || /\\immini/i.test(exContent) || /\\begin\{center\}/i.test(exContent);
}

function processWebExporter() {
  const inputEl = document.getElementById('input-web');
  const outputEl = document.getElementById('output-web');

  if (!inputEl || !outputEl) return;
  const rawText = inputEl.value;
  if (!rawText.trim()) {
    alert('Vui lòng nhập mã LaTeX gốc vào ô Input!');
    return;
  }

  const exRegex = /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/gi;
  let exMatch;
  let questionIndex = 1;
  const results = [];

  while ((exMatch = exRegex.exec(rawText)) !== null) {
    const exContent = exMatch[1];
    let processedQuestion = `Câu ${questionIndex}. `;
    let errorMessage = "";
    const needsImageNote = hasGraphicElement(exContent);

    if (/\\choice\b/i.test(exContent)) {
      const choiceIdx = exContent.search(/\\choice\b/i);
      const stemRaw = exContent.substring(0, choiceIdx);
      const stemClean = cleanTextForWeb(stemRaw);
      const rest = exContent.substring(choiceIdx + 7);
      const { groups } = extractMultipleBracedGroups(rest, 0);

      const labels = ['A', 'B', 'C', 'D'];
      let correctAnsLabel = '';
      const choicesFormatted = [];

      groups.slice(0, 4).forEach((g, idx) => {
        let rawGroupText = g.trim();
        if (/\\True\b/i.test(rawGroupText)) {
          correctAnsLabel = labels[idx];
          rawGroupText = rawGroupText.replace(/\\True\b/gi, '').trim();
        }
        let textClean = cleanTextForWeb(rawGroupText);
        textClean = ensureEndingDot(textClean);
        choicesFormatted.push(`${labels[idx]}. ${textClean}`);
      });

      processedQuestion += stemClean;
      if (needsImageNote) processedQuestion += '\n[Thêm hình vẽ vào đây]';
      processedQuestion += '\n' + choicesFormatted.join('\n');

      if (correctAnsLabel) {
        processedQuestion += `\nĐáp án TN: ${correctAnsLabel}`;
      } else {
        processedQuestion += `\nĐáp án TN: `;
        errorMessage = "Câu này thiếu đáp án";
      }
    } else if (/\\choiceTF[t]?\b/i.test(exContent)) {
      const choiceIdx = exContent.search(/\\choiceTF[t]?\b/i);
      const stemRaw = exContent.substring(0, choiceIdx);
      const stemClean = cleanTextForWeb(stemRaw);
      const matchTF = exContent.match(/\\choiceTF[t]?\b/i);
      const rest = exContent.substring(choiceIdx + matchTF[0].length);
      const { groups } = extractMultipleBracedGroups(rest, 0);

      const labels = ['a', 'b', 'c', 'd'];
      const tfResults = [];
      const choicesFormatted = [];
      let hasAnyTrue = false;

      groups.slice(0, 4).forEach((g, idx) => {
        let rawGroupText = g.trim();
        if (/\\True\b/i.test(rawGroupText)) {
          tfResults.push('D');
          hasAnyTrue = true;
          rawGroupText = rawGroupText.replace(/\\True\b/gi, '').trim();
        } else {
          tfResults.push('S');
        }
        let textClean = cleanTextForWeb(rawGroupText);
        textClean = ensureEndingDot(textClean);
        choicesFormatted.push(`${labels[idx]}) ${textClean}`);
      });

      processedQuestion += stemClean;
      if (needsImageNote) processedQuestion += '\n[Thêm hình vẽ vào đây]';
      processedQuestion += '\n' + choicesFormatted.join('\n');
      processedQuestion += `\nĐáp án DS: ${tfResults.join('|')}`;

      if (!hasAnyTrue) errorMessage = "Câu này thiếu đáp án";
    } else if (/\\doa\b/i.test(exContent) || /\\dienkt\b/i.test(exContent)) {
      let stemRaw = exContent;
      let doaString = "";
      if (/\\doa\b/i.test(stemRaw)) {
        const doaIdx = stemRaw.search(/\\doa\b/i);
        const { groups, endIndex } = extractMultipleBracedGroups(stemRaw, doaIdx + 4);
        if (groups.length > 0) {
          doaString = groups.map(g => {
            let cleanedItem = cleanTextForWeb(g.replace(/\\True\b/gi, '').trim());
            return (cleanedItem.startsWith('$') && cleanedItem.endsWith('$')) ? cleanedItem : `$${cleanedItem}$`;
          }).join(' @ ');
        }
        stemRaw = stemRaw.substring(endIndex);
      }

      let ansList = [];
      const ansMatch = exContent.match(/%\s*\\ans\{([^}]+)\}/i);
      if (ansMatch) ansList = ansMatch[1].split('|').map(a => a.trim());

      let dienktCount = 0;
      stemRaw = stemRaw.replace(/\\dienkt\b/g, () => { dienktCount++; return '<KT/>'; });

      const stemClean = cleanTextForWeb(stemRaw);
      processedQuestion += doaString ? (doaString + '\n' + stemClean) : stemClean;
      if (needsImageNote) processedQuestion += '\n[Thêm hình vẽ vào đây]';

      const formattedAns = ansList.map(a => `${a}>`).join('|');
      processedQuestion += `\nĐáp án KT: ${formattedAns}`;

      if (dienktCount === 0 || ansList.length === 0 || dienktCount !== ansList.length) {
        errorMessage = "Câu này thiếu đáp án";
      }
    } else if (/\\dienkq\b/i.test(exContent) || /\\shortans\b/i.test(exContent)) {
      let stemRaw = exContent;
      let shortansVal = "";
      const shortansMatch = exContent.match(/(?:%|\s|^)*\\shortans(?:\s*\[[^\]]*\])?\s*\{([^}]+)\}/i);
      if (shortansMatch) {
        shortansVal = shortansMatch[1].trim().replace(/\$/g, '').trim();
      }
      stemRaw = stemRaw.replace(/\\dienkq\b/g, '__________');
      const stemClean = cleanTextForWeb(stemRaw);

      processedQuestion += stemClean;
      if (needsImageNote) processedQuestion += '\n[Thêm hình vẽ vào đây]';

      if (shortansVal) {
        processedQuestion += `\nĐáp án TLN: ${shortansVal}`;
      } else {
        processedQuestion += `\nĐáp án TLN: `;
        errorMessage = "Câu này thiếu đáp án";
      }
    } else {
      processedQuestion += cleanTextForWeb(exContent);
      if (needsImageNote) processedQuestion += '\n[Thêm hình vẽ vào đây]';
      errorMessage = "Câu này thiếu đáp án";
    }

    if (errorMessage) processedQuestion += `\n${errorMessage}`;
    results.push(processedQuestion);
    questionIndex++;
  }

  outputEl.value = results.join('\n\n');
  if (typeof handleInput === 'function') handleInput('output-web');
}

/* =========================================================
   LOGIC CỬA SỔ POPUP GỘP FILE WORD (BẢN TỐI ƯU TOÀN DIỆN)
   ========================================================= */

let questionImagesMap = {};
let scrollObserver = null;

/** Cuộn mượt tới câu được chọn */
function scrollToQuestionCard(qIndex) {
  const card = document.getElementById(`q-card-${qIndex}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Cập nhật trạng thái màu sắc cho nút Menu dọc */
function updateNavButtonState(qNumber, isImageRequired, hasImage) {
  const navBtn = document.getElementById(`q-nav-btn-${qNumber}`);
  if (!navBtn) return;

  if (isImageRequired) {
    if (hasImage) {
      navBtn.className = "q-nav-btn w-full py-1.5 px-2 text-xs font-bold rounded text-center transition bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-sm";
      navBtn.title = `Câu ${qNumber}: Đã thêm hình vẽ`;
    } else {
      navBtn.className = "q-nav-btn w-full py-1.5 px-2 text-xs font-bold rounded text-center transition bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 shadow-sm animate-pulse";
      navBtn.title = `Câu ${qNumber}: CẦN THÊM HÌNH VẼ!`;
    }
  } else {
    if (hasImage) {
      navBtn.className = "q-nav-btn w-full py-1.5 px-2 text-xs font-bold rounded text-center transition bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-sm";
    } else {
      navBtn.className = "q-nav-btn w-full py-1.5 px-2 text-xs font-bold rounded text-center transition bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300";
    }
  }
}

/** Đẩy khung hình vẽ Lên/Xuống giữa các đoạn văn */
function moveDropZone(dropZoneId, direction) {
  const dropWrapper = document.getElementById(`wrapper-${dropZoneId}`);
  if (!dropWrapper) return;

  if (direction === 'up') {
    const prevNode = dropWrapper.previousElementSibling;
    if (prevNode && prevNode.classList.contains('editable-content')) {
      dropWrapper.parentNode.insertBefore(dropWrapper, prevNode);
    }
  } else if (direction === 'down') {
    const nextNode = dropWrapper.nextElementSibling;
    if (nextNode && nextNode.classList.contains('editable-content')) {
      dropWrapper.parentNode.insertBefore(nextNode, dropWrapper);
    }
  }
}

/** Tải ảnh từ máy tính khi click vào Drop Zone */
function handleFileInputImage(e, dropZoneId) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const imgDataUrl = evt.target.result;
    applyImageToDropZone(dropZoneId, imgDataUrl);
  };
  reader.readAsDataURL(file);
}

function applyImageToDropZone(dropZoneId, imgDataUrl) {
  const dropZone = document.getElementById(dropZoneId);
  if (!dropZone) return;

  questionImagesMap[dropZoneId] = imgDataUrl;

  const qNumber = dropZone.getAttribute('data-qnumber');
  const isRequired = dropZone.getAttribute('data-required') === 'true';

  if (qNumber) updateNavButtonState(qNumber, isRequired, true);

  dropZone.innerHTML = `
    <div class="relative group my-1 w-full">
      <img src="${imgDataUrl}" id="img-${dropZoneId}" class="dropped-img max-h-60 max-w-full rounded border border-slate-300 shadow-sm mx-auto object-contain">
      <button onclick="removeDroppedImage(event, '${dropZoneId}')" class="absolute top-1 right-1 bg-rose-700 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition shadow cursor-pointer">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function openWordMergeModal() {
  const outputEl = document.getElementById('output-web');
  const outputText = outputEl ? outputEl.value : '';

  if (!outputText.trim()) {
    alert('Chưa có nội dung chuẩn hóa ở ô Output. Vui lòng bấm "Vứt Lên Web Ngay" trước!');
    return;
  }

  // CHECK ĐÁP ÁN: CHẶN KHÔNG CHO VÀO NẾU CÓ CÂU THIẾU ĐÁP ÁN
  const missingQuestions = [];
  const rawQuestions = outputText.split(/(?=Câu \d+\.)/g).filter(q => q.trim().length > 0);

  rawQuestions.forEach(qText => {
    if (qText.includes("Câu này thiếu đáp án")) {
      const matchNum = qText.match(/Câu (\d+)\./);
      if (matchNum) missingQuestions.push(`Câu ${matchNum[1]}`);
    }
  });

  if (missingQuestions.length > 0) {
    alert(`⛔ KHÔNG THỂ VÀO GỘP FILE!\n\nPhát hiện ${missingQuestions.length} câu CHƯA CÓ ĐÁP ÁN:\n👉 ${missingQuestions.join(', ')}\n\nVui lòng cập nhật đầy đủ đáp án ở ô Output trước khi gộp file Word!`);
    return;
  }

  const container = document.getElementById('word-merge-preview-container');
  const navContainer = document.getElementById('word-merge-nav-container');
  const modal = document.getElementById('word-merge-modal');

  if (!container || !modal || !navContainer) {
    alert('Không tìm thấy khung Modal trong trang HTML!');
    return;
  }

  container.innerHTML = '';
  navContainer.innerHTML = '';
  questionImagesMap = {};

  rawQuestions.forEach((qText, qIdx) => {
    const qNumber = qIdx + 1;
    const isImageRequired = qText.includes('[Thêm hình vẽ vào đây]');

    // 1. Nút Menu Dọc bên trái
    const navBtn = document.createElement('button');
    navBtn.id = `q-nav-btn-${qNumber}`;
    navBtn.innerText = `Câu ${qNumber}`;
    navBtn.onclick = () => scrollToQuestionCard(qNumber);
    navContainer.appendChild(navBtn);

    updateNavButtonState(qNumber, isImageRequired, false);

    // 2. Card Nội Dung
    const card = document.createElement('div');
    card.id = `q-card-${qNumber}`;
    card.className = "q-card-item bg-white p-3.5 border border-slate-300 rounded shadow-sm space-y-2 text-xs font-mono text-slate-800 leading-relaxed transition hover:border-rose-400";

    const dropZoneId = `dropzone-${qIdx}`;

    if (isImageRequired) {
      const parts = qText.split('[Thêm hình vẽ vào đây]');
      card.innerHTML = `
        <div contenteditable="true" class="q-text-box editable-content focus:outline-none focus:ring-1 focus:ring-rose-400 p-1.5 rounded bg-slate-50/50 hover:bg-amber-50/30 whitespace-pre-wrap">${escapeHtml(parts[0].trim())}</div>
        
        <div id="wrapper-${dropZoneId}" class="my-2 border border-slate-200 p-2 rounded bg-slate-50">
          <div class="flex justify-between items-center mb-1 pb-1 border-b border-slate-200">
            <span class="text-[10px] font-bold text-rose-700 flex items-center gap-1"><i data-lucide="image" class="w-3 h-3"></i> Khung hình vẽ</span>
            <div class="flex items-center space-x-1">
              <button onclick="moveDropZone('${dropZoneId}', 'up')" class="bg-white hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-bold shadow-sm" title="Đẩy khung lên dòng trên">⬆️ Lên</button>
              <button onclick="moveDropZone('${dropZoneId}', 'down')" class="bg-white hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-bold shadow-sm" title="Đẩy khung xuống dòng dưới">⬇️ Xuống</button>
            </div>
          </div>

          <div id="${dropZoneId}" 
               data-qnumber="${qNumber}"
               data-required="true"
               onclick="document.getElementById('file-${dropZoneId}').click()"
               ondragover="handleDragOver(event)" 
               ondragleave="handleDragLeave(event)" 
               ondrop="handleDropImage(event, '${dropZoneId}')"
               class="border-2 border-dashed border-rose-300 bg-rose-50/40 hover:bg-rose-100/60 p-4 rounded text-center transition flex flex-col items-center justify-center min-h-[90px] cursor-pointer">
             <i data-lucide="image-plus" class="w-6 h-6 text-rose-600 mb-1 pointer-events-none"></i>
             <span class="text-[11px] text-rose-700 font-bold pointer-events-none">[Kéo thả hoặc Bấm vào đây để Up Ảnh]</span>
          </div>
          <input type="file" id="file-${dropZoneId}" accept="image/*" class="hidden" onchange="handleFileInputImage(event, '${dropZoneId}')">
        </div>

        <div contenteditable="true" class="q-text-box editable-content focus:outline-none focus:ring-1 focus:ring-rose-400 p-1.5 rounded bg-slate-50/50 hover:bg-amber-50/30 whitespace-pre-wrap">${escapeHtml(parts[1].trim())}</div>
      `;
    } else {
      card.innerHTML = `
        <div contenteditable="true" class="q-text-box editable-content focus:outline-none focus:ring-1 focus:ring-rose-400 p-1.5 rounded bg-slate-50/50 hover:bg-amber-50/30 whitespace-pre-wrap">${escapeHtml(qText.trim())}</div>
        
        <div id="wrapper-${dropZoneId}" class="my-1">
          <div id="${dropZoneId}" 
               data-qnumber="${qNumber}"
               data-required="false"
               onclick="document.getElementById('file-${dropZoneId}').click()"
               ondragover="handleDragOver(event)" 
               ondragleave="handleDragLeave(event)" 
               ondrop="handleDropImage(event, '${dropZoneId}')"
               class="border border-dashed border-slate-300 bg-slate-50 hover:bg-rose-50 p-2 rounded text-center transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] text-slate-500">
             <i data-lucide="image-plus" class="w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
             <span class="pointer-events-none">[Bấm hoặc Kéo ảnh vào đây nếu câu này có hình]</span>
          </div>
          <input type="file" id="file-${dropZoneId}" accept="image/*" class="hidden" onchange="handleFileInputImage(event, '${dropZoneId}')">
        </div>
      `;
    }

    container.appendChild(card);
  });

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();

  // 3. Khởi tạo ScrollSpy lắng nghe cuộn màn hình ở Cột Trái
  setupScrollSpy();
}

/** Tự động Highlight Menu số câu khi Lướt/Cuộn màn hình */
function setupScrollSpy() {
  if (scrollObserver) scrollObserver.disconnect();

  const scrollContainer = document.querySelector('#word-merge-modal .lg\\:col-span-7 .overflow-y-auto');
  if (!scrollContainer) return;

  const cards = document.querySelectorAll('.q-card-item');

  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const qNumber = id.replace('q-card-', '');

        document.querySelectorAll('.q-nav-btn').forEach(btn => {
          btn.classList.remove('ring-2', 'ring-rose-600', 'scale-105');
        });

        const activeBtn = document.getElementById(`q-nav-btn-${qNumber}`);
        if (activeBtn) {
          activeBtn.classList.add('ring-2', 'ring-rose-600', 'scale-105');
        }
      }
    });
  }, {
    root: scrollContainer,
    threshold: 0.4
  });

  cards.forEach(card => scrollObserver.observe(card));
}

function closeWordMergeModal() {
  const modal = document.getElementById('word-merge-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (scrollObserver) scrollObserver.disconnect();
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('border-rose-600', 'bg-rose-100');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('border-rose-600', 'bg-rose-100');
}

function handleDropImage(e, dropZoneId) {
  e.preventDefault();
  e.stopPropagation();

  const dropZone = document.getElementById(dropZoneId);
  if (!dropZone) return;

  dropZone.classList.remove('border-rose-600', 'bg-rose-100');

  // Ưu tiên lấy file kéo thả trực tiếp từ máy tính
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        applyImageToDropZone(dropZoneId, evt.target.result);
      };
      reader.readAsDataURL(file);
      return;
    }
  }

  // Lấy Data URL từ danh sách Preview PDF bên phải
  const imgDataUrl = e.dataTransfer.getData('text/plain');
  if (imgDataUrl && imgDataUrl.startsWith('data:image')) {
    applyImageToDropZone(dropZoneId, imgDataUrl);
  } else {
    alert('Vui lòng kéo một hình ảnh hợp lệ!');
  }
}

function removeDroppedImage(e, dropZoneId) {
  e.stopPropagation();
  delete questionImagesMap[dropZoneId];

  const dropZone = document.getElementById(dropZoneId);
  if (!dropZone) return;

  const qNumber = dropZone.getAttribute('data-qnumber');
  const isRequired = dropZone.getAttribute('data-required') === 'true';

  if (qNumber) updateNavButtonState(qNumber, isRequired, false);

  if (isRequired) {
    dropZone.innerHTML = `
       <i data-lucide="image-plus" class="w-6 h-6 text-rose-600 mb-1 pointer-events-none"></i>
       <span class="text-[11px] text-rose-700 font-bold pointer-events-none">[Kéo thả hoặc Bấm vào đây để Up Ảnh]</span>
    `;
  } else {
    dropZone.innerHTML = `
       <i data-lucide="image-plus" class="w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
       <span class="pointer-events-none">[Bấm hoặc Kéo ảnh vào đây nếu câu này có hình]</span>
    `;
  }
  if (window.lucide) lucide.createIcons();
}

/** Render PDF thành danh sách ảnh dọc ôm VỪA KHÍT cả chiều ngang và chiều dọc */
async function renderModalPdfImages() {
  const fileInput = document.getElementById('modal-pdf-input');
  const gallery = document.getElementById('modal-image-gallery');
  const statusEl = document.getElementById('modal-pdf-status');
  const dpiInput = document.getElementById('modal-dpi-slider');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert('Vui lòng chọn file PDF!');
    return;
  }

  const file = fileInput.files[0];
  const targetDpi = parseInt(dpiInput?.value) || 300;
  const scaleRatio = targetDpi / 72;

  gallery.innerHTML = '';
  statusEl.innerHTML = `<span class="text-rose-700 font-semibold">Đang đọc PDF ở độ phân giải ${targetDpi} DPI...</span>`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      statusEl.innerHTML = `<span class="text-rose-700 font-semibold">Đang xuất trang ${i} / ${totalPages}...</span>`;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: scaleRatio });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      const imgDataUrl = canvas.toDataURL('image/png', 1.0);

      // Card chứa ảnh: FIT KHÍT HOÀN TOÀN CẢ CHIỀU NGANG VÀ DỌC (max-h-[400px])
      const item = document.createElement('div');
      item.className = "bg-white p-2 border border-slate-300 rounded shadow-sm flex flex-col items-center space-y-1.5 cursor-grab active:cursor-grabbing hover:border-rose-500 transition shrink-0 w-full";
      item.innerHTML = `
        <span class="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Trang ${i} (${Math.round(viewport.width)}x${Math.round(viewport.height)}px)</span>
        <img src="${imgDataUrl}" draggable="true" ondragstart="handleImageDragStart(event)" class="max-h-[400px] w-full object-contain rounded border border-slate-200 shadow-sm">
      `;
      gallery.appendChild(item);
    }

    statusEl.innerHTML = `<span class="text-emerald-600 font-bold">Đã xuất ${totalPages} ảnh (${targetDpi} DPI)!</span>`;
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span class="text-rose-600">Lỗi: ${err.message}</span>`;
  }
}

function handleImageDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.src);
}

function loadImageAsync(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** XUẤT FILE WORD .DOCX GIỮ NGUYÊN TỶ LỆ CHUẨN MẤT MÉO */
async function exportToWordDocx() {
  if (typeof docx === 'undefined') {
    alert('Thư viện docx chưa tải xong. Vui lòng kiểm tra lại kết nối mạng!');
    return;
  }

  const container = document.getElementById('word-merge-preview-container');
  if (!container || container.children.length === 0) {
    alert('Chưa có nội dung để xuất!');
    return;
  }

  const { Document, Packer, Paragraph, TextRun, ImageRun } = docx;
  const docParagraphs = [];

  const cards = container.children;
  for (let card of cards) {
    const childNodes = card.childNodes;

    for (let node of childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('editable-content')) {
        const text = node.innerText.trim();
        if (text) {
          text.split('\n').forEach(line => {
            docParagraphs.push(new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  font: "Arial",
                  size: 24, // 12pt
                })
              ],
              spacing: { after: 120 }
            }));
          });
        }
      } 
      else if (node.nodeType === Node.ELEMENT_NODE && node.id && node.id.startsWith('wrapper-dropzone')) {
        const dropZoneId = node.id.replace('wrapper-', '');
        const imgDataUrl = questionImagesMap[dropZoneId];

        if (imgDataUrl) {
          try {
            const loadedImg = await loadImageAsync(imgDataUrl);
            const naturalW = loadedImg.naturalWidth || 400;
            const naturalH = loadedImg.naturalHeight || 300;

            const wordTargetWidth = 450; 
            const wordTargetHeight = Math.round((wordTargetWidth * naturalH) / naturalW);

            const base64Data = imgDataUrl.split(',')[1];
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            docParagraphs.push(new Paragraph({
              children: [
                new ImageRun({
                  data: bytes.buffer,
                  transformation: {
                    width: wordTargetWidth,
                    height: wordTargetHeight,
                  },
                })
              ],
              spacing: { before: 180, after: 180 }
            }));
          } catch (e) {
            console.error('Lỗi tính tỷ lệ ảnh:', e);
          }
        }
      }
    }

    docParagraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: docParagraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `FormatTex_Export_${Date.now()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
