const dropzone = document.querySelector('#dropzone');
const fileInput = document.querySelector('#file-input');
const browseButton = document.querySelector('#browse-button');
const emptyState = document.querySelector('#empty-state');
const previewWrap = document.querySelector('#preview-wrap');
const preview = document.querySelector('#preview');
const resultContent = document.querySelector('#result-content');
const loading = document.querySelector('#loading');
const errorBox = document.querySelector('#error');

browseButton.addEventListener('click', (event) => { event.stopPropagation(); fileInput.click(); });
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => fileInput.files[0] && analyze(fileInput.files[0]));
['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', (event) => { const file = event.dataTransfer.files[0]; if (file) analyze(file); });
document.querySelector('#clear-button').addEventListener('click', (event) => { event.stopPropagation(); reset(); });

function analyze(file) {
  if (!file.type.startsWith('image/')) return showError('Please choose an image file.');
  if (file.size > 10 * 1024 * 1024) return showError('That image is larger than 10 MB.');
  errorBox.classList.add('hidden'); emptyState.classList.add('hidden'); resultContent.classList.add('hidden'); loading.classList.remove('hidden');
  previewWrap.classList.remove('hidden'); preview.src = URL.createObjectURL(file);
  const formData = new FormData(); formData.append('image', file);
  fetch('/predict', { method: 'POST', body: formData }).then(async (response) => {
    const body = await response.text();
    let data = {};
    if (body.trim()) {
      try { data = JSON.parse(body); } catch { /* The server returned non-JSON text. */ }
    }
    if (!response.ok) throw new Error(data.error || `The server returned an error (${response.status}).`);
    if (!data.label) throw new Error('The server returned an empty prediction.');
    return data;
  }).then(renderResult).catch((error) => { loading.classList.add('hidden'); showError(error.message || 'The image could not be analyzed.'); });
}
function renderResult(data) { loading.classList.add('hidden'); resultContent.classList.remove('hidden'); document.querySelector('#result-label').textContent = data.label; document.querySelector('#result-badge').textContent = data.shortLabel; document.querySelector('#probability').textContent = `AI PROBABILITY ${data.aiProbability}%`; document.querySelector('#confidence').textContent = `${data.confidence}%`; document.querySelector('#meter-fill').style.width = `${data.aiProbability}%`; }
function showError(message) { errorBox.textContent = message; errorBox.classList.remove('hidden'); }
function reset() { fileInput.value = ''; previewWrap.classList.add('hidden'); resultContent.classList.add('hidden'); errorBox.classList.add('hidden'); emptyState.classList.remove('hidden'); }
