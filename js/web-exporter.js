/* =========================================================
   FORMATTEX — WEB EXPORTER MODULE (VỨT LÊN WEB & GỘP WORD)
   ========================================================= */

/**
 * Trích xuất nội dung bên trong cặp ngoặc nhọn cân bằng {}
 */
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
        return {
          content: str.substring(start, i),
          endIndex: i
        };
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
      while (curr < str.length && str[curr] !== '\n') {
        curr++;
      }
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
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return { groups, endIndex: curr };
}

function cleanComments(text) {
  if (!text) return "";
  return text.split('\n').map(line => {
    if (/%\s*\\ans\{/i.test(line) || /%\s*\\shortans/i.test(line)) {
      return line;
    }
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
  if (!/[.!?]$/.test(trimmed)) {
    trimmed += ".";
  }
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
    } else {
      break;
    }
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
    return '\n' + body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `- ${item}`)
      .join('\n');
  });

  cleaned = cleaned.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi, (m, body) => {
    let count = 1;
    return '\n' + body.split('\\item')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `${count++}. ${item}`)
      .join('\n');
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
      } else {
        break;
      }
    }
  });

  const layoutCmds = ['noindent', 'hfill', 'vfill', 'centering', 'raggedright', 'raggedleft', 'clearpage', 'newpage'];
  layoutCmds.forEach(cmd => {
    const r = new RegExp(`\\\\${cmd}\\b`, 'gi');
    cleaned = cleaned.replace(r, '');
  });

  cleaned = cleaned.replace(/%\s*\\ans\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/(?:%|\s)*\\shortans(?:\[[^\]]*\])?\s*\{[^}]*\}/gi, '');

  cleaned = cleaned.replace(/\\\\/g, '\n');
  cleaned = cleaned.replace(/\\vspace\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/\\hspace\{[^}]*\}/gi, '');

  const lines = cleaned.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return lines.join('\n');
}

function hasGraphicElement(exContent) {
  return /\\begin\{tikzpicture\}/i.test(exContent) || 
         /\\immini/i.test(exContent) || 
         /\\begin\{center\}/i.test(exContent);
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
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }
      processedQuestion += '\n' + choicesFormatted.join('\n');

      if (correctAnsLabel) {
        processedQuestion += `\nĐáp án TN: ${correctAnsLabel}`;
      } else {
        processedQuestion += `\nĐáp án TN: `;
        errorMessage = "Câu này thiếu đáp án";
      }
    }
    else if (/\\choiceTF[t]?\b/i.test(exContent)) {
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
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }
      processedQuestion += '\n' + choicesFormatted.join('\n');
      processedQuestion += `\nĐáp án DS: ${tfResults.join('|')}`;

      if (!hasAnyTrue) {
        errorMessage = "Câu này thiếu đáp án";
      }
    }
    else if (/\\doa\b/i.test(exContent) || /\\dienkt\b/i.test(exContent)) {
      let stemRaw = exContent;

      let doaString = "";
      if (/\\doa\b/i.test(stemRaw)) {
        const doaIdx = stemRaw.search(/\\doa\b/i);
        const { groups, endIndex } = extractMultipleBracedGroups(stemRaw, doaIdx + 4);
        if (groups.length > 0) {
          doaString = groups.map(g => {
            let cleanedItem = g.replace(/\\True\b/gi, '').trim();
            cleanedItem = cleanTextForWeb(cleanedItem);
            if (cleanedItem.startsWith('$') && cleanedItem.endsWith('$')) {
              return cleanedItem;
            }
            return `$${cleanedItem}$`;
          }).join(' @ ');
        }
        stemRaw = stemRaw.substring(endIndex);
      }

      let ansList = [];
      const ansMatch = exContent.match(/%\s*\\ans\{([^}]+)\}/i);
      if (ansMatch) {
        ansList = ansMatch[1].split('|').map(a => a.trim());
      }

      let dienktCount = 0;
      stemRaw = stemRaw.replace(/\\dienkt\b/g, () => {
        dienktCount++;
        return '<KT/>';
      });

      const stemClean = cleanTextForWeb(stemRaw);

      if (doaString) {
        processedQuestion += doaString + '\n' + stemClean;
      } else {
        processedQuestion += stemClean;
      }

      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }

      const formattedAns = ansList.map(a => `${a}>`).join('|');
      processedQuestion += `\nĐáp án KT: ${formattedAns}`;

      if (dienktCount === 0 || ansList.length === 0 || dienktCount !== ansList.length) {
        errorMessage = "Câu này thiếu đáp án";
      }
    }
    else if (/\\dienkq\b/i.test(exContent) || /\\shortans\b/i.test(exContent)) {
      let stemRaw = exContent;

      let shortansVal = "";
      const shortansMatch = exContent.match(/(?:%|\s|^)*\\shortans(?:\s*\[[^\]]*\])?\s*\{([^}]+)\}/i);
      if (shortansMatch) {
        shortansVal = shortansMatch[1].trim();
        shortansVal = shortansVal.replace(/\$/g, '').trim();
      }

      stemRaw = stemRaw.replace(/\\dienkq\b/g, '__________');

      const stemClean = cleanTextForWeb(stemRaw);

      processedQuestion += stemClean;
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }

      if (shortansVal) {
        processedQuestion += `\nĐáp án TLN: ${shortansVal}`;
      } else {
        processedQuestion += `\nĐáp án TLN: `;
        errorMessage = "Câu này thiếu đáp án";
      }
    }
    else {
      const stemClean = cleanTextForWeb(exContent);
      processedQuestion += stemClean;
      if (needsImageNote) {
        processedQuestion += '\n[Thêm hình vẽ vào đây]';
      }
      errorMessage = "Câu này thiếu đáp án";
    }

    if (errorMessage) {
      processedQuestion += `\n${errorMessage}`;
    }

    results.push(processedQuestion);
    questionIndex++;
  }

  outputEl.value = results.join('\n\n');

  if (typeof handleInput === 'function') {
    handleInput('output-web');
  }
}

/* =========================================================
   LOGIC MỚI: CỬA SỔ POPUP GỘP FILE WORD & DRAG-DROP ẢNH (ĐÃ FIX HIỂN THỊ)
   ========================================================= */

let questionImagesMap = {};

function openWordMergeModal() {
  const outputEl = document.getElementById('output-web');
  const outputText = outputEl ? outputEl.value : '';

  if (!outputText.trim()) {
    alert('Chưa có nội dung chuẩn hóa ở ô Output. Vui lòng bấm "Vứt Lên Web Ngay" trước!');
    return;
  }

  const container = document.getElementById('word-merge-preview-container');
  const modal = document.getElementById('word-merge-modal');

  if (!container || !modal) {
    alert('Không tìm thấy khung Modal trong trang HTML!');
    return;
  }

  container.innerHTML = '';
  questionImagesMap = {};

  const questions = outputText.split(/(?=Câu \d+\.)/g).filter(q => q.trim().length > 0);

  if (questions.length === 0) {
    container.innerHTML = '<div class="text-center text-xs text-slate-500 py-10">Không tìm thấy câu hỏi nào!</div>';
  }

  questions.forEach((qText, qIdx) => {
    const card = document.createElement('div');
    card.className = "bg-white p-3.5 border border-slate-300 rounded shadow-sm space-y-2 text-xs font-mono text-slate-800 leading-relaxed";

    if (qText.includes('[Thêm hình vẽ vào đây]')) {
      const parts = qText.split('[Thêm hình vẽ vào đây]');
      const dropZoneId = `dropzone-${qIdx}`;

      card.innerHTML = `
        <div class="whitespace-pre-wrap">${escapeHtml(parts[0].trim())}</div>
        <div id="${dropZoneId}" 
             ondragover="handleDragOver(event)" 
             ondragleave="handleDragLeave(event)" 
             ondrop="handleDropImage(event, '${dropZoneId}')"
             class="border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/60 p-4 rounded text-center my-2 transition flex flex-col items-center justify-center min-h-[100px] cursor-pointer">
           <i data-lucide="image-plus" class="w-6 h-6 text-indigo-500 mb-1 pointer-events-none"></i>
           <span class="text-[11px] text-indigo-700 font-bold pointer-events-none">[Kéo thả hình vẽ từ cột phải vào đây]</span>
        </div>
        <div class="whitespace-pre-wrap">${escapeHtml(parts[1].trim())}</div>
      `;
    } else {
      const dropZoneId = `dropzone-optional-${qIdx}`;
      card.innerHTML = `
        <div class="whitespace-pre-wrap">${escapeHtml(qText.trim())}</div>
        <div id="${dropZoneId}" 
             ondragover="handleDragOver(event)" 
             ondragleave="handleDragLeave(event)" 
             ondrop="handleDropImage(event, '${dropZoneId}')"
             class="border border-dashed border-slate-300 bg-slate-50 hover:bg-indigo-50 p-2 rounded text-center my-1 transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] text-slate-500">
           <i data-lucide="image-plus" class="w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
           <span class="pointer-events-none">[Thả ảnh vào đây nếu câu này có hình]</span>
        </div>
      `;
    }

    container.appendChild(card);
  });

  // KÍCH HOẠT HIỂN THỊ MODAL BẰNG FLEX
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeWordMergeModal() {
  const modal = document.getElementById('word-merge-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('border-indigo-600', 'bg-indigo-100');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('border-indigo-600', 'bg-indigo-100');
}

function handleDropImage(e, dropZoneId) {
  e.preventDefault();
  const dropZone = document.getElementById(dropZoneId);
  if (!dropZone) return;

  dropZone.classList.remove('border-indigo-600', 'bg-indigo-100');

  const imgDataUrl = e.dataTransfer.getData('text/plain');
  if (!imgDataUrl || !imgDataUrl.startsWith('data:image')) {
    alert('Vui lòng kéo một hình ảnh hợp lệ từ danh sách bên phải!');
    return;
  }

  questionImagesMap[dropZoneId] = imgDataUrl;

  dropZone.innerHTML = `
    <div class="relative group my-1">
      <img src="${imgDataUrl}" class="max-h-48 max-w-full rounded border border-slate-300 shadow-sm mx-auto">
      <button onclick="removeDroppedImage(event, '${dropZoneId}')" class="absolute top-1 right-1 bg-rose-700 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition shadow">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function removeDroppedImage(e, dropZoneId) {
  e.stopPropagation();
  delete questionImagesMap[dropZoneId];

  const dropZone = document.getElementById(dropZoneId);
  if (!dropZone) return;

  dropZone.innerHTML = `
     <i data-lucide="image-plus" class="w-5 h-5 text-indigo-500 mb-1 pointer-events-none"></i>
     <span class="text-[11px] text-indigo-700 font-bold pointer-events-none">[Kéo thả hình vẽ từ cột phải vào đây]</span>
  `;
  if (window.lucide) lucide.createIcons();
}

async function renderModalPdfImages() {
  const fileInput = document.getElementById('modal-pdf-input');
  const gallery = document.getElementById('modal-image-gallery');
  const statusEl = document.getElementById('modal-pdf-status');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert('Vui lòng chọn file PDF!');
    return;
  }

  const file = fileInput.files[0];
  const mode = document.getElementById('modal-mode-select').value;
  const targetSize = parseInt(document.getElementById('modal-size-input').value) || 1200;

  gallery.innerHTML = '';
  statusEl.innerHTML = `<span class="text-indigo-700">Đang đọc PDF...</span>`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      statusEl.innerHTML = `<span class="text-indigo-700">Đang xuất trang ${i} / ${totalPages}...</span>`;
      const page = await pdf.getPage(i);
      const originalViewport = page.getViewport({ scale: 1.0 });

      let scale = 1.0;
      if (mode === 'width') {
        scale = targetSize / originalViewport.width;
      } else {
        scale = targetSize / originalViewport.height;
      }

      const viewport = page.getViewport({ scale: scale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      const imgDataUrl = canvas.toDataURL('image/png', 1.0);

      const item = document.createElement('div');
      item.className = "bg-white p-2 border border-slate-300 rounded shadow-sm flex flex-col items-center space-y-1 cursor-grab active:cursor-grabbing hover:border-indigo-500 transition";
      item.innerHTML = `
        <span class="text-[10px] font-bold text-slate-500">Trang ${i}</span>
        <img src="${imgDataUrl}" draggable="true" ondragstart="handleImageDragStart(event)" class="max-h-36 object-contain rounded border border-slate-100">
      `;
      gallery.appendChild(item);
    }

    statusEl.innerHTML = `<span class="text-emerald-600">Đã xuất ${totalPages} ảnh sẵn sàng!</span>`;
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span class="text-rose-600">Lỗi: ${err.message}</span>`;
  }
}

function handleImageDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.src);
}

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
      if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('whitespace-pre-wrap')) {
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
      else if (node.nodeType === Node.ELEMENT_NODE && node.id && node.id.startsWith('dropzone')) {
        const dropZoneId = node.id;
        const imgDataUrl = questionImagesMap[dropZoneId];

        if (imgDataUrl) {
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
                  width: 320,
                  height: 200,
                },
              })
            ],
            spacing: { before: 180, after: 180 }
          }));
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
  a.download = `VutLenWeb_${Date.now()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
