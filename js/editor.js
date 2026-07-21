/* Cập nhật Line Numbers và Sync Scroll khi nội dung thay đổi */
function handleInput(id) {
  const textarea = document.getElementById(id);
  const linesDiv = document.getElementById(`lines-${id}`);
  const hlDiv = document.getElementById(`hl-${id}`);

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

  // 2. Cập nhật Code Highlight (nếu có)
  if (hlDiv) {
    let code = textarea.value;
    // Encode HTML
    code = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Highlight đơn giản cho LaTeX
    code = code.replace(/(\\begin\{[^}]+\}|\\end\{[^}]+\})/g, '<span class="hl-env">$1</span>');
    code = code.replace(/(\\[a-zA-Key]+)/g, '<span class="hl-keyword">$1</span>');
    code = code.replace(/(\$[^$]+\$)/g, '<span class="hl-math">$1</span>');
    
    hlDiv.innerHTML = code + '\n';
  }

  // 3. Đồng bộ cuộn
  syncScroll(id);
}

function syncScroll(id) {
  const textarea = document.getElementById(id);
  const linesDiv = document.getElementById(`lines-${id}`);
  const hlDiv = document.getElementById(`hl-${id}`);

  if (textarea) {
    if (linesDiv) linesDiv.scrollTop = textarea.scrollTop;
    if (hlDiv) {
      hlDiv.scrollTop = textarea.scrollTop;
      hlDiv.scrollLeft = textarea.scrollLeft;
    }
  }
}
