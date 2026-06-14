const STORAGE_KEY = 'moopans-water-invoice-v1';
const MAX_ROWS = 4;

const defaultState = {
  invoiceNo: 'MR-U-1250',
  invoiceDate: '2026-06-01',
  dueDate: '2026-06-10',
  billToName: 'AL TAQ DEER DISCOUNT CENTER',
  flatNo: 'FLAT NO 104',
  billArea: 'ESR',
  billToExtra: '',
  previousBalance: 0,
  payments: 0,
  totalWords: '',
  companyAddress1: 'Saeed Ali Khammas Building,',
  companyAddress2: 'M Floor, Office M3',
  companyAddress3: 'Fujairah-UAE',
  companyPhone: 'Ph: 056-5114110  056-5114112',
  bankName: 'National Bank Of Fujairah',
  accountNo: '01200 139 3187',
  accountName: 'Moopans Realestate',
  iban: 'AE940380000012001393187',
  swiftCode: 'NBFUAEAFFUJ',
  website: 'www.moopansgroup.ae',
  rows: [
    { description: 'Water & Sewerage', prev: '', curr: '', consumption: '', tariff: '', amount: '' },
    { description: '', prev: '', curr: '', consumption: '', tariff: '', amount: '' },
    { description: '', prev: '', curr: '', consumption: '', tariff: '', amount: '' },
    { description: '', prev: '', curr: '', consumption: '', tariff: '', amount: '' }
  ]
};

let state = loadState();
const form = document.getElementById('invoiceForm');
const rowsEditor = document.getElementById('rowsEditor');
const previewGrid = document.getElementById('previewDetailsGrid');

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);
    const parsed = JSON.parse(saved);
    return normalizeState({ ...structuredClone(defaultState), ...parsed });
  } catch (error) {
    console.warn('Could not load saved invoice', error);
    return structuredClone(defaultState);
  }
}

function normalizeState(value) {
  const next = { ...structuredClone(defaultState), ...value };
  next.rows = Array.isArray(value.rows) ? value.rows.slice(0, MAX_ROWS) : structuredClone(defaultState.rows);
  while (next.rows.length < MAX_ROWS) {
    next.rows.push({ description: '', prev: '', curr: '', consumption: '', tariff: '', amount: '' });
  }
  return next;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setFormValues() {
  Object.keys(defaultState).forEach((key) => {
    if (key === 'rows') return;
    const input = form.elements[key];
    if (input) input.value = state[key] ?? '';
  });
  renderRowsEditor();
}

function renderRowsEditor() {
  rowsEditor.innerHTML = '';
  state.rows.forEach((row, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'row-editor';
    wrap.innerHTML = `
      <div class="row-editor-head">
        <span>Line ${index + 1}</span>
        ${index > 0 ? `<button class="remove-row" type="button" data-remove-row="${index}">Remove</button>` : ''}
      </div>
      <div class="row-editor-grid">
        ${rowInput(index, 'description', 'Description', 'text')}
        ${rowInput(index, 'prev', 'Prev. Reading', 'number')}
        ${rowInput(index, 'curr', 'Curr. Reading', 'number')}
        ${rowInput(index, 'consumption', 'Consumption', 'number')}
        ${rowInput(index, 'tariff', 'Tariff', 'number')}
        ${rowInput(index, 'amount', 'Amount', 'number')}
      </div>
    `;
    rowsEditor.appendChild(wrap);
  });
}

function rowInput(index, key, label, type) {
  const step = type === 'number' ? ' step="0.01"' : '';
  return `<label>${label}<input data-row="${index}" data-field="${key}" type="${type}"${step} value="${escapeAttribute(state.rows[index][key] ?? '')}" /></label>`;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function money(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0.00';
  return number.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function maybeBlankMoney(value) {
  if (value === '' || value === null || value === undefined) return '';
  return money(value);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function calculateRow(row) {
  const prev = cleanNumber(row.prev);
  const curr = cleanNumber(row.curr);
  const tariff = cleanNumber(row.tariff);
  const hasPrevCurr = row.prev !== '' && row.curr !== '';
  if (hasPrevCurr) {
    const consumption = Math.max(curr - prev, 0);
    row.consumption = round2(consumption);
    if (row.tariff !== '') {
      row.amount = round2(consumption * tariff);
    }
  } else if (row.consumption !== '' && row.tariff !== '') {
    row.amount = round2(cleanNumber(row.consumption) * tariff);
  }
  return row;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateTotals() {
  state.rows.forEach(calculateRow);
  const currentCharges = state.rows.reduce((sum, row) => sum + cleanNumber(row.amount), 0);
  const totalDue = cleanNumber(state.previousBalance) + currentCharges - cleanNumber(state.payments);
  return { currentCharges: round2(currentCharges), totalDue: round2(totalDue) };
}

function updatePreview() {
  const totals = calculateTotals();
  bindText('pCompanyAddress1', state.companyAddress1);
  bindText('pCompanyAddress2', state.companyAddress2);
  bindText('pCompanyAddress3', state.companyAddress3);
  bindText('pCompanyPhone', state.companyPhone);
  bindText('pInvoiceNo', state.invoiceNo);
  bindText('pInvoiceDate', formatDate(state.invoiceDate));
  bindText('pDueDate', formatDate(state.dueDate));
  bindText('pBillToName', state.billToName);
  bindText('pFlatNo', state.flatNo);
  bindText('pBillArea', state.billArea);
  bindText('pBillToExtra', state.billToExtra);
  bindText('pTotalCurrentCharges', money(totals.currentCharges));
  bindText('pPreviousBalance', money(state.previousBalance));
  bindText('pCurrentCharges', money(totals.currentCharges));
  bindText('pPayments', money(state.payments));
  bindText('pTotalDue', money(totals.totalDue));
  bindText('pTotalWords', state.totalWords.trim() || amountInWords(totals.totalDue));
  bindText('pBankName', state.bankName);
  bindText('pAccountNo', state.accountNo);
  bindText('pAccountName', state.accountName);
  bindText('pIban', state.iban);
  bindText('pSwiftCode', state.swiftCode);
  renderPreviewGrid();
}

function bindText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? '';
}

function renderPreviewGrid() {
  const columns = [
    { key: 'description', label: 'Description', format: (v) => v || '' },
    { key: 'prev', label: 'Prev. Reading', format: (v) => v || '' },
    { key: 'curr', label: 'Curr. Reading', format: (v) => v || '' },
    { key: 'consumption', label: 'Consumption', format: (v) => v || '' },
    { key: 'tariff', label: 'Tariff', format: (v) => v || '' },
    { key: 'amount', label: 'Amount', format: maybeBlankMoney }
  ];

  previewGrid.innerHTML = columns.map((column) => {
    const cells = state.rows.map((row) => `<div class="details-cell">${escapeHtml(column.format(row[column.key]))}</div>`).join('');
    return `<div class="details-column"><div class="details-head">${column.label}</div>${cells}</div>`;
  }).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function amountInWords(value) {
  const amount = Math.max(0, Number(value || 0));
  const dirhams = Math.floor(amount);
  const fils = Math.round((amount - dirhams) * 100);
  let words = `${numberToWords(dirhams)} Dirhams`;
  if (fils > 0) words += ` and ${numberToWords(fils)} Fils`;
  return `${words} Only`;
}

function numberToWords(num) {
  num = Number(num);
  if (!Number.isFinite(num) || num < 0) return '';
  if (num === 0) return 'Zero';
  const belowTwenty = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function chunk(n) {
    let out = '';
    if (n >= 100) {
      out += `${belowTwenty[Math.floor(n / 100)]} Hundred`;
      n %= 100;
      if (n) out += ' ';
    }
    if (n >= 20) {
      out += tens[Math.floor(n / 10)];
      n %= 10;
      if (n) out += ` ${belowTwenty[n]}`;
    } else if (n > 0) {
      out += belowTwenty[n];
    }
    return out;
  }

  const parts = [];
  const billions = Math.floor(num / 1_000_000_000);
  num %= 1_000_000_000;
  const millions = Math.floor(num / 1_000_000);
  num %= 1_000_000;
  const thousands = Math.floor(num / 1000);
  const rest = num % 1000;
  if (billions) parts.push(`${chunk(billions)} Billion`);
  if (millions) parts.push(`${chunk(millions)} Million`);
  if (thousands) parts.push(`${chunk(thousands)} Thousand`);
  if (rest) parts.push(chunk(rest));
  return parts.join(' ');
}

function syncFromForm(event) {
  const target = event.target;
  if (!target.name) return;
  state[target.name] = target.value;
  updatePreview();
  saveState();
}

form.addEventListener('input', syncFromForm);
form.addEventListener('change', syncFromForm);

rowsEditor.addEventListener('input', (event) => {
  const target = event.target;
  const rowIndex = Number(target.dataset.row);
  const field = target.dataset.field;
  if (!Number.isInteger(rowIndex) || !field) return;
  state.rows[rowIndex][field] = target.value;
  calculateRow(state.rows[rowIndex]);
  renderRowsEditor();
  updatePreview();
  saveState();
  const selector = `[data-row="${rowIndex}"][data-field="${field}"]`;
  const newTarget = rowsEditor.querySelector(selector);
  if (newTarget) {
    newTarget.focus();
    try {
      const len = newTarget.value.length;
      newTarget.setSelectionRange(len, len);
    } catch (_) {
      // Number inputs do not support text selection in some browsers.
    }
  }
});

rowsEditor.addEventListener('click', (event) => {
  const removeIndex = event.target.dataset.removeRow;
  if (removeIndex === undefined) return;
  state.rows.splice(Number(removeIndex), 1);
  while (state.rows.length < MAX_ROWS) state.rows.push({ description: '', prev: '', curr: '', consumption: '', tariff: '', amount: '' });
  renderRowsEditor();
  updatePreview();
  saveState();
});

document.getElementById('addRowBtn').addEventListener('click', () => {
  const emptyIndex = state.rows.findIndex((row) => !row.description && !row.prev && !row.curr && !row.consumption && !row.tariff && !row.amount);
  if (emptyIndex === -1) {
    alert(`This template supports ${MAX_ROWS} detail lines for exact A4 matching.`);
    return;
  }
  const target = rowsEditor.querySelector(`[data-row="${emptyIndex}"][data-field="description"]`);
  if (target) target.focus();
});

function printInvoice() {
  updatePreview();
  window.print();
}

document.getElementById('printBtn').addEventListener('click', printInvoice);
document.getElementById('printBtnTop').addEventListener('click', printInvoice);

document.getElementById('saveBtn').addEventListener('click', () => {
  saveState();
  alert('Saved in this browser.');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Reset all invoice details to the template sample?')) return;
  state = structuredClone(defaultState);
  saveState();
  setFormValues();
  updatePreview();
});

document.getElementById('downloadJsonBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.invoiceNo || 'invoice'}-details.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('importJson').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const text = await file.text();
    state = normalizeState(JSON.parse(text));
    saveState();
    setFormValues();
    updatePreview();
  } catch (error) {
    alert('Could not import this JSON file.');
  } finally {
    event.target.value = '';
  }
});

setFormValues();
updatePreview();
