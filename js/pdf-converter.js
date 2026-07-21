const PDFJS_VERSION = '2.16.105';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const pdfInput = document.getElementById('pdf-input');
const formatSelect = document.getElementById('format-select');
const modeSelect = document.getElementById('mode-select');
const widthInput = document.getElementById('width-input');
const heightInput = document.getElementById('height-input');
const widthBox = document.getElementById('width-box');
const heightBox = document.getElementById('height-box');
const convertBtn = document.getElementById('convert-btn');
const statusDiv = document.getElementById('status');
const downloadContainer = document.getElementById('download-container');
const downloadBtn = document.getElementById('download-btn');

let zipBlob = null;

if (modeSelect) {
  modeSelect.addEventListener('change', () => {
    const mode = modeSelect.value;
    if (mode === 'width') {
      widthBox.classList.remove('opacity-50', 'pointer-events-none');
      heightBox.classList.add('opacity-50', 'pointer-events-none');
    } else if (mode === 'height') {
      widthBox.classList.add('opacity-50', 'pointer-events-none');
      heightBox.classList.remove('opacity-50', 'pointer-events-none');
    } else {
      widthBox.classList.remove('opacity-50', 'pointer-events-none');
      heightBox.classList.remove('opacity-50', 'pointer-events-none');
    }
  });
}

if (convertBtn) {
  convertBtn.addEventListener('click', async () => {
    const file = pdfInput.files[0];
    if (!file) {
      alert('Vui lòng chọn file PDF!');
      return;
    }

    const format = formatSelect.value;
    const mode = modeSelect.value;
    const targetWidth = parseFloat(widthInput.value);
    const targetHeight = parseFloat(heightInput.value);

    if ((mode === 'width' || mode === 'exact') && (!targetWidth || targetWidth <= 0)) {
      alert('Vui lòng nhập Chiều Rộng hợp lệ!');
      return;
    }
    if ((mode === 'height' || mode === 'exact') && (!targetHeight || targetHeight <= 0)) {
      alert('Vui lòng nhập Chiều Cao hợp lệ!');
      return;
    }

    convertBtn.disabled = true;
    downloadContainer.classList.add('hidden');
    statusDiv.textContent = 'Đang đọc file PDF...';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/standard_fonts/`
      });

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const zip = new JSZip();

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const pageNumString = String(i).padStart(3, '0');
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        let scale = 1.0;
        if (mode === 'width') {
          scale = targetWidth / unscaledViewport.width;
        } else if (mode === 'height') {
          scale = targetHeight / unscaledViewport.height;
        } else if (mode === 'exact') {
          const scaleX = targetWidth / unscaledViewport.width;
          const scaleY = targetHeight / unscaledViewport.height;
          scale = Math.min(scaleX, scaleY);
        }

        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (mode === 'exact') {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const offsetX = (targetWidth - viewport.width) / 2;
          const offsetY = (targetHeight - viewport.height) / 2;

          statusDiv.textContent = `Đang xuất trang ${i} / ${totalPages}...`;
          await page.render({
            canvasContext: ctx,
            viewport: viewport,
            transform: [1, 0, 0, 1, offsetX, offsetY]
          }).promise;
        } else {
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);

          statusDiv.textContent = `Đang xuất trang ${i} / ${totalPages}...`;
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        }

        const imgDataUrl = canvas.toDataURL(mimeType, 0.95);
        const base64Data = imgDataUrl.split(',')[1];
        zip.file(`trang_${pageNumString}.${format}`, base64Data, { base64: true });
      }

      statusDiv.textContent = 'Đang đóng gói file ZIP...';
      zipBlob = await zip.generateAsync({ type: 'blob' });

      statusDiv.textContent = `Hoàn thành! Đã xuất ${totalPages} trang dạng ${format.toUpperCase()}.`;
      downloadContainer.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      statusDiv.textContent = 'Có lỗi xảy ra: ' + err.message;
    } finally {
      convertBtn.disabled = false;
    }
  });
}

if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    if (!zipBlob) return;
    saveBlob(zipBlob, `pdf_converted_${formatSelect.value}.zip`);
  });
}
