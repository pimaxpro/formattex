/* =========================================================
   PIMAX TOOL — PDF TO IMAGES & ZIP CONVERTER
   ========================================================= */

// Cấu hình worker cho PDF.js
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

let zipBlobResult = null; // Lưu trữ blob file zip sau khi chuyển đổi xong
let currentPdfFileName = "PimaX_Images";

document.addEventListener("DOMContentLoaded", () => {
  const convertBtn = document.getElementById('convert-btn');
  const modeSelect = document.getElementById('mode-select');
  const pageRangeRadios = document.querySelectorAll('input[name="page-range-option"]');

  if (convertBtn) {
    convertBtn.addEventListener('click', startPdfConversion);
  }

  if (modeSelect) {
    modeSelect.addEventListener('change', handleModeChange);
  }

  pageRangeRadios.forEach(radio => {
    radio.addEventListener('change', handlePageRangeOptionChange);
  });
});

function handlePageRangeOptionChange() {
  const selectedOption = document.querySelector('input[name="page-range-option"]:checked').value;
  const customPagesBox = document.getElementById('custom-pages-box');

  if (selectedOption === 'custom') {
    customPagesBox.classList.remove('hidden');
  } else {
    customPagesBox.classList.add('hidden');
  }
}

function handleModeChange() {
  const mode = document.getElementById('mode-select').value;
  const widthBox = document.getElementById('width-box');
  const heightBox = document.getElementById('height-box');

  if (mode === 'width') {
    widthBox.classList.remove('opacity-50', 'pointer-events-none');
    heightBox.classList.add('opacity-50', 'pointer-events-none');
  } else if (mode === 'height') {
    widthBox.classList.add('opacity-50', 'pointer-events-none');
    heightBox.classList.remove('opacity-50', 'pointer-events-none');
  } else if (mode === 'exact') {
    widthBox.classList.remove('opacity-50', 'pointer-events-none');
    heightBox.classList.remove('opacity-50', 'pointer-events-none');
  }
}

/**
 * Phân tích chuỗi phạm vi trang (VD: "1,2,3,4" hoặc "1-4,13-36")
 * Trả về mảng các số trang hợp lệ đã được sắp xếp tăng dần và loại bỏ trùng lặp.
 */
function parsePageRange(inputStr, totalPages) {
  if (!inputStr || !inputStr.trim()) return [];

  const pages = new Set();
  const parts = inputStr.split(',');

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const range = part.split('-');
      if (range.length === 2) {
        const start = parseInt(range[0].trim(), 10);
        const end = parseInt(range[1].trim(), 10);

        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            if (i >= 1 && i <= totalPages) {
              pages.add(i);
            }
          }
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pages.add(p);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

async function startPdfConversion() {
  const fileInput = document.getElementById('pdf-input');
  const statusEl = document.getElementById('status');
  const downloadContainer = document.getElementById('download-container');
  const convertBtn = document.getElementById('convert-btn');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert('Vui lòng chọn một file PDF!');
    return;
  }

  const file = fileInput.files[0];
  currentPdfFileName = file.name.replace(/\.[^/.]+$/, "");

  const format = document.getElementById('format-select').value;
  const mode = document.getElementById('mode-select').value;
  const targetWidth = parseInt(document.getElementById('width-input').value) || 1920;
  const targetHeight = parseInt(document.getElementById('height-input').value) || 1080;

  const rangeOption = document.querySelector('input[name="page-range-option"]:checked').value;
  const rangeInputVal = document.getElementById('page-range-input').value;

  convertBtn.disabled = true;
  downloadContainer.classList.add('hidden');
  zipBlobResult = null;

  try {
    statusEl.innerHTML = `<span class="text-rose-700">Đang đọc file PDF...</span>`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    let targetPages = [];
    if (rangeOption === 'all') {
      for (let i = 1; i <= totalPages; i++) targetPages.push(i);
    } else {
      targetPages = parsePageRange(rangeInputVal, totalPages);
      if (targetPages.length === 0) {
        alert(`Cú pháp trang không hợp lệ hoặc vượt quá tổng số trang (${totalPages})!`);
        statusEl.innerHTML = `<span class="text-rose-600">Lỗi: Phạm vi trang không hợp lệ.</span>`;
        return;
      }
    }

    const zip = new JSZip();
    const imgFolder = zip.folder(currentPdfFileName);

    for (let idx = 0; idx < targetPages.length; idx++) {
      const pageNum = targetPages[idx];
      statusEl.innerHTML = `<span class="text-rose-700">Đang xuất trang ${pageNum} (${idx + 1}/${targetPages.length})...</span>`;

      const page = await pdf.getPage(pageNum);
      let viewport = page.getViewport({ scale: 1.0 });

      let scale = 1.0;
      if (mode === 'width') {
        scale = targetWidth / viewport.width;
      } else if (mode === 'height') {
        scale = targetHeight / viewport.height;
      } else if (mode === 'exact') {
        scale = Math.min(targetWidth / viewport.width, targetHeight / viewport.height);
      }

      viewport = page.getViewport({ scale: scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Tô nền trắng tránh bị đen nền khi lưu dưới dạng JPG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';

      const imageDataUrl = canvas.toDataURL(mimeType, 0.92);
      const base64Data = imageDataUrl.split(',')[1];

      const fileName = `trang_${String(pageNum).padStart(3, '0')}.${ext}`;
      imgFolder.file(fileName, base64Data, { base64: true });
    }

    statusEl.innerHTML = `<span class="text-rose-700">Đang nén file ZIP...</span>`;
    zipBlobResult = await zip.generateAsync({ type: 'blob' });

    statusEl.innerHTML = `<span class="text-emerald-600">Hoàn thành! Đã xuất ${targetPages.length} trang dạng ${format.toUpperCase()}.</span>`;
    downloadContainer.classList.remove('hidden');

    if (window.lucide) {
      lucide.createIcons();
    }

  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span class="text-rose-600">Lỗi trong quá trình xử lý: ${err.message}</span>`;
  } finally {
    convertBtn.disabled = false;
  }
}

// HÀM KÍCH HOẠT TẢI FILE ZIP
function downloadZip() {
  if (!zipBlobResult) {
    alert('Chưa có dữ liệu file ZIP để tải!');
    return;
  }

  const blobUrl = URL.createObjectURL(zipBlobResult);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${currentPdfFileName}_Images.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
