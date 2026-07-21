/* =========================================================
   PIMAX TOOL — CLEAN & FORMATTING TOOLS
   ========================================================= */

function applyCleanSpacingTool(id) {
  const textarea = document.getElementById(id);
  if (!textarea || !textarea.value.trim()) return;

  textarea.value = cleanTextSpacingAndLines(textarea.value);
  if (typeof handleInput === 'function') handleInput(id, false);
  if (typeof saveState === 'function') saveState(id, true);
}

function convertArrayToAligned(id) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  let text = textarea.value;
  const arrayRegex = /\\begin\{array\}\s*\{[^}]*\}([\s\S]*?)\\end\{array\}/g;

  text = text.replace(arrayRegex, (match, innerContent) => {
    let lines = innerContent.split('\\\\');
    
    let processedLines = lines.map(line => {
      let trimmed = line.trim();
      if (!trimmed) return '';
      trimmed = trimmed.replace(/&/g, '').trim();
      if (trimmed.includes('=')) {
        trimmed = trimmed.replace('=', '&=');
      }
      return `    ${trimmed}`;
    });

    const formattedBody = processedLines.filter(l => l !== '').join(' \\\\\n');
    return `\\begin{aligned}\n${formattedBody}\n\\end{aligned}`;
  });

  text = cleanTextSpacingAndLines(text);

  textarea.value = text;
  if (typeof handleInput === 'function') handleInput(id, false);
  if (typeof saveState === 'function') saveState(id, true);
}

function autoAddMathDollars(text) {
  if (!text) return '';

  const excludeList = ['VCB', 'VND', 'VNĐ', 'THPT', 'SGD', 'BGD', 'SGK', 'HCM', 'HN', 'VN', 'USD', 'STT', 'NXB', 'KHTN', 'GDĐT'];
  const parts = text.split(/(\$(?:\\.|[^$])+\$)/g);

  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith('$')) {
      let str = parts[i];

      str = str.replace(/(?<![\$\w\\])(\([A-Z0-9a-z;,\s\-\+]+\)|[A-Z]{2,}\s*=\s*[\-+]?\d+(?:[\.,]\d+)?)(?![\$\w])/g, (m, p1) => `$${p1}$`);
      str = str.replace(/(?<![\$\w\\])(\d+(?:\s*[\.,]\s*\d+)?\s*(?:\\%)?)(?![\$\w\\])/g, (m, p1) => `$${p1}$`);
      str = str.replace(/(?<![\p{L}\p{N}\\])([A-Z]{1,4})(?![\p{L}\p{N}])/gu, (match, p1) => {
        if (excludeList.includes(p1)) return match;
        return `$${p1}$`;
      });

      parts[i] = str;
    }
  }

  let result = parts.join('');
  return fixMathSpacing(result);
}

function applyAutoMath(id) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const fullText = textarea.value;

  if (start === end) {
    alert("Vui lòng bôi đen đoạn văn bản cần tự động thêm dấu $!");
    return;
  }

  const selectedText = fullText.substring(start, end);
  const processedText = autoAddMathDollars(selectedText);

  textarea.setRangeText(processedText, start, end, 'select');
  if (typeof handleInput === 'function') handleInput(id, false);
  if (typeof saveState === 'function') saveState(id, true);
}

function wrapSelectionWithEnv(id, envType) {
  const textarea = document.getElementById(id);
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const fullText = textarea.value;

  if (start === end) {
    const emptyEnv = `\\begin{${envType}}\n\\item \n\\end{${envType}}`;
    textarea.setRangeText(emptyEnv, start, end, 'select');
  } else {
    const selectedText = fullText.substring(start, end);
    const lines = selectedText.split('\n');

    const convertedLines = lines.map(line => {
      let cleanedLine = line.trim();
      if (!cleanedLine) return '';
      cleanedLine = cleanedLine.replace(/^(?:\\item\s*|[\-\*\+]\s*|\d+[\.\)]\s*)/, '').trim();
      return `\\item ${cleanedLine}`;
    });

    const formattedContent = convertedLines.filter(l => l !== '').join('\n');
    const wrappedText = `\\begin{${envType}}\n${formattedContent}\n\\end{${envType}}`;

    textarea.setRangeText(wrappedText, start, end, 'select');
  }

  if (typeof handleInput === 'function') handleInput(id, false);
  if (typeof saveState === 'function') saveState(id, true);
}
