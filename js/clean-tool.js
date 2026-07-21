function cleanTextSpacingAndLines(text) {
  if (!text) return '';

  let cleaned = text.replace(/\s+([\?\,\.\!])/g, '$1');
  let lines = cleaned.split('\n');
  let filteredLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.trim() !== '') {
      filteredLines.push(line.trimEnd());
    }
  }

  let resultText = filteredLines.join('\n');
  resultText = resultText.replace(/([^\n])\n+(\\begin\{[^}]+\})/g, '$1\n\n$2');
  resultText = resultText.replace(/(\\end\{[^}]+\})\n+([^\n])/g, '$1\n\n$2');
  resultText = resultText.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return resultText.trim();
}

function applyCleanSpacingTool(id) {
  const textarea = document.getElementById(id);
  if (!textarea || !textarea.value.trim()) return;

  textarea.value = cleanTextSpacingAndLines(textarea.value);
  handleInput(id, false);
  saveState(id, true);
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
  handleInput(id, false);
  saveState(id, true);
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
  handleInput(id, false);
  saveState(id, true);
}

function wrapSelectionWithEnv(id, envType) {
  const textarea = document.getElementById(id);
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

  handleInput(id, false);
  saveState(id, true);
}

function formatOptionText(str) {
  if (!str) return '';
  let text = str.trim();
  const containsWords = /[a-zA-ZÀ-ỹ]/.test(text.replace(/\\[a-zA-Z]+/g, ''));
  if (!containsWords && !text.startsWith('$') && !text.endsWith('$')) {
    return `$${text}$`;
  }
  return fixMathSpacing(text);
}

function fixMathSpacing(str) {
  if (!str) return '';
  let text = str;

  text = text.replace(/\$+/g, '$');
  text = text.replace(/\$((?:\\.|[^$])+)\$/g, (m, inner) => `$${inner.trim()}$`);
  text = text.replace(/([\p{L}\p{N}:,;\.\?!])\$/gu, '$1 $');
  text = text.replace(/\$([\p{L}\p{N}])/gu, '$ $1');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\s+([\.,;\)])/g, '$1');
  text = text.replace(/([\(\[])\s+/g, '$1');
  text = text.replace(/\$((?:\\.|[^$])+)\$/g, (m, inner) => `$${inner.trim()}$`);

  return cleanTextSpacingAndLines(text).trim();
}

function cleanHeaderPrefix(rawText) {
  let str = rawText.trim();
  str = str.replace(/^Câu\s+\d+\s*[\.\:-]*/i, '').trim();
  str = str.replace(/^\[[^\]]*\]\s*/i, '').trim();
  str = str.replace(/^\([^\)]*\)\s*/i, '').trim();
  str = str.replace(/^[:\.-]+\s*/, '').trim();
  return str;
}
