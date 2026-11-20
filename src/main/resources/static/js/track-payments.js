requireAuthOrRedirect();
renderUserChip('welcomeMsg');

async function loadCategories() {
  const data = await api('/bills/categories');
  ['pgCategory', 'poCategory', 'phCategory'].forEach((id) => {
    const select = document.getElementById(id);
    select.innerHTML = data.categories.map((c) => `<option value="${c}">${c}</option>`).join('');
  });
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'progress') loadProgress();
    if (btn.dataset.tab === 'overview') loadPaymentOverview();
    if (btn.dataset.tab === 'history') loadHistory();
  });
});

async function loadProgress() {
  const category = document.getElementById('pgCategory').value;
  const search = document.getElementById('pgSearch').value;
  const qs = new URLSearchParams({ category, search });
  const data = await api(`/payments/progress?${qs}`);
  const tbody = document.getElementById('pgRows');
  tbody.innerHTML = '';
  document.getElementById('pgEmpty').classList.toggle('hidden', data.bills.length > 0);
  data.bills.forEach((b) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${b.bill_name}</td><td>₹${b.amount}</td><td>${b.due_date}</td>
      <td>
        <div class="progress-bar-track"><div class="progress-bar-fill ${b.progress_color}" style="width:${b.progress_percent}%"></div></div>
        <span style="font-size:11px;color:var(--muted)">${b.progress_percent}% paid</span>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function loadPaymentOverview() {
  const category = document.getElementById('poCategory').value;
  const fromDate = document.getElementById('poFrom').value;
  const toDate = document.getElementById('poTo').value;
  const qs = new URLSearchParams({ category, fromDate, toDate });
  const data = await api(`/payments/overview?${qs}`);
  const tbody = document.getElementById('poRows');
  tbody.innerHTML = '';
  document.getElementById('poEmpty').classList.toggle('hidden', data.bills.length > 0);
  data.bills.forEach((b) => {
    const badge = b.payment_status === 'Paid' ? 'green' : b.payment_status === 'Overdue' ? 'red' : 'orange';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${b.bill_name}</td><td>${b.bill_category}</td><td>${b.due_date}</td><td>₹${b.amount}</td>
      <td><span class="badge ${badge}">${b.payment_status}</span></td>`;
    tbody.appendChild(tr);
  });
}

async function loadHistory() {
  const category = document.getElementById('phCategory').value;
  const fromDate = document.getElementById('phFrom').value;
  const toDate = document.getElementById('phTo').value;
  const qs = new URLSearchParams({ category, fromDate, toDate });
  const data = await api(`/payments/history?${qs}`);
  const tbody = document.getElementById('phRows');
  tbody.innerHTML = '';
  document.getElementById('phEmpty').classList.toggle('hidden', data.payments.length > 0);
  data.payments.forEach((p) => {
    const tr = document.createElement('tr');
    const detail = p.payment_institution
      ? `${p.payment_mode} (${p.payment_institution})`
      : p.card_last4
      ? `${p.payment_mode} (•••• ${p.card_last4})`
      : p.payment_mode || '-';
    tr.innerHTML = `<td>${p.bill_name}</td><td>₹${p.amount_paid}</td><td>${p.due_date}</td><td>${p.payment_date}</td><td>${detail}</td>`;
    tbody.appendChild(tr);
  });
}

loadCategories().then(loadProgress);
