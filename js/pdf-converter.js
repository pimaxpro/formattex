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

  if (convertBtn) {
    convertBtn.addEventListener('click', startPdfConversion);
  }

  if (modeSelect) {
    modeSelect.addEventListener('change', handleModeChange);
  }
});

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

  convertBtn.disabled = true;
  downloadContainer.classList.add('hidden');
  zipBlobResult = null;

  try {
    statusEl.innerHTML = `<span class="text-rose-700">Đang đọc file PDF...</span>`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const zip = new JSZip();
    const imgFolder = zip.folder(currentPdfFileName);

    for (let i = 1; i <= totalPages; i++) {
      statusEl.innerHTML = `<span class="text-rose-700">Đang xuất trang ${i} / ${totalPages}...</span>`;
      
      const page = await pdf.getPage(i);
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

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      
      const imageDataUrl = canvas.toDataURL(mimeType, 0.92);
      const base64Data = imageDataUrl.split(',')[1];

      const fileName = `trang_${String(i).padStart(3, '0')}.${ext}`;
      imgFolder.file(fileName, base64Data, { base64: true });
    }

    statusEl.innerHTML = `<span class="text-rose-700">Đang nén file ZIP...</span>`;
    zipBlobResult = await zip.generateAsync({ type: 'blob' });

    statusEl.innerHTML = `<span class="text-emerald-600">Hoàn thành! Đã xuất ${totalPages} trang dạng ${format.toUpperCase()}.</span>`;
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

  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlobResult);
  a.download = `${currentPdfFileName}_Images.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
