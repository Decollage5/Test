const STORAGE_KEY = 'dividendenkalender';
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const $ = (id) => document.getElementById(id);
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

let state = load();
let year = new Date().getFullYear();

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.positions)) return { taxRate: 26.375, ...data };
  } catch (e) { /* ignore corrupt or unavailable storage */ }
  return { taxRate: 26.375, positions: [] };
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
}

function payment(p) {
  return p.shares * p.dividend;
}

function net(amount) {
  return amount * (1 - state.taxRate / 100);
}

function renderCalendar() {
  const perMonth = MONTHS.map((_, m) =>
    state.positions
      .filter((p) => p.months.includes(m))
      .map((p) => ({ name: p.name, day: p.day, amount: payment(p) }))
      .sort((a, b) => (a.day || 99) - (b.day || 99))
  );
  const sums = perMonth.map((list) => list.reduce((s, x) => s + x.amount, 0));
  const max = Math.max(...sums, 1);
  const total = sums.reduce((a, b) => a + b, 0);
  const now = new Date();

  $('calendar').innerHTML = perMonth.map((list, m) => {
    const current = now.getFullYear() === year && now.getMonth() === m ? ' current' : '';
    const items = list.length
      ? list.map((x) => `<li><span>${x.day ? `${String(x.day).padStart(2, '0')}.` : ''} ${escapeHtml(x.name)}</span><span>${euro.format(x.amount)}</span></li>`).join('')
      : '<li class="muted">Keine Zahlungen</li>';
    return `<div class="month${current}">
      <h3>${MONTHS_LONG[m]} <span>${euro.format(sums[m])}</span></h3>
      <div class="bar"><div style="width:${(sums[m] / max) * 100}%"></div></div>
      <ul>${items}</ul>
    </div>`;
  }).join('');

  $('year').textContent = year;
  $('total-gross').textContent = euro.format(total);
  $('total-net').textContent = euro.format(net(total));
  $('avg-month').textContent = euro.format(net(total) / 12);
}

function renderPositions() {
  $('empty').hidden = state.positions.length > 0;
  $('positions').innerHTML = state.positions.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td class="num">${p.shares.toLocaleString('de-DE')}</td>
      <td class="num">${euro.format(p.dividend)}</td>
      <td>${p.months.map((m) => MONTHS[m]).join(', ') || '–'}</td>
      <td class="num">${euro.format(payment(p) * p.months.length)}</td>
      <td class="num">
        <button data-edit="${p.id}">Bearbeiten</button>
        <button data-delete="${p.id}">Löschen</button>
      </td>
    </tr>`).join('');
}

function render() {
  renderCalendar();
  renderPositions();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// --- Formular ---

function buildMonthCheckboxes() {
  $('months').innerHTML = MONTHS.map((name, m) =>
    `<label><input type="checkbox" value="${m}"> ${name}</label>`).join('');
}

function monthBoxes() {
  return [...$('months').querySelectorAll('input')];
}

function setPreset(step) {
  const boxes = monthBoxes();
  // Startmonat: erster bereits angehakter Monat, sonst Januar
  const start = Math.max(0, boxes.findIndex((b) => b.checked));
  boxes.forEach((b, m) => {
    b.checked = step > 0 && m >= start % step && (m - start) % step === 0;
  });
}

function resetForm() {
  $('position-form').reset();
  $('edit-id').value = '';
  $('form-title').textContent = 'Position hinzufügen';
  $('submit-btn').textContent = 'Hinzufügen';
  $('cancel-edit').hidden = true;
}

function editPosition(id) {
  const p = state.positions.find((x) => x.id === id);
  if (!p) return;
  $('edit-id').value = p.id;
  $('name').value = p.name;
  $('shares').value = p.shares;
  $('dividend').value = p.dividend;
  $('day').value = p.day || '';
  monthBoxes().forEach((b, m) => { b.checked = p.months.includes(m); });
  $('form-title').textContent = `Position bearbeiten: ${p.name}`;
  $('submit-btn').textContent = 'Speichern';
  $('cancel-edit').hidden = false;
  $('position-form').scrollIntoView({ behavior: 'smooth' });
}

$('position-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const position = {
    id: $('edit-id').value || crypto.randomUUID(),
    name: $('name').value.trim(),
    shares: Number($('shares').value),
    dividend: Number($('dividend').value),
    day: Number($('day').value) || null,
    months: monthBoxes().filter((b) => b.checked).map((b) => Number(b.value)),
  };
  const i = state.positions.findIndex((p) => p.id === position.id);
  if (i >= 0) state.positions[i] = position;
  else state.positions.push(position);
  state.positions.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  save();
  resetForm();
  render();
});

$('cancel-edit').addEventListener('click', resetForm);

document.querySelectorAll('[data-preset]').forEach((btn) =>
  btn.addEventListener('click', () => setPreset(Number(btn.dataset.preset))));

$('positions').addEventListener('click', (e) => {
  const { edit, delete: del } = e.target.dataset;
  if (edit) editPosition(edit);
  if (del) {
    const p = state.positions.find((x) => x.id === del);
    if (p && confirm(`„${p.name}“ wirklich löschen?`)) {
      state.positions = state.positions.filter((x) => x.id !== del);
      save();
      render();
    }
  }
});

// --- Einstellungen & Navigation ---

$('tax-rate').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  if (v >= 0 && v <= 100) {
    state.taxRate = v;
    save();
    renderCalendar();
  }
});

$('prev-year').addEventListener('click', () => { year--; renderCalendar(); });
$('next-year').addEventListener('click', () => { year++; renderCalendar(); });

// --- Export / Import ---

$('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dividendenkalender.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.positions)) throw new Error('Ungültiges Format');
    state = { taxRate: 26.375, ...data };
    $('tax-rate').value = state.taxRate;
    save();
    render();
  } catch (err) {
    alert(`Import fehlgeschlagen: ${err.message}`);
  }
  e.target.value = '';
});

buildMonthCheckboxes();
$('tax-rate').value = state.taxRate;
render();
