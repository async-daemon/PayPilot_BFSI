requireAuthOrRedirect();
renderUserChip('welcomeMsg');

let selectedBillForSchedule = null;

async function loadCategories() {
  const data = await api('/bills/categories');
  ['spCategory', 'cmCategory'].forEach((id) => {
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
    if (btn.dataset.tab === 'manage') loadScheduled();
  });
});

async function loadBillsForSchedule() {
  const category = document.getElementById('spCategory').value;
  const fromDate = document.getElementById('spFrom').value;
  const toDate = document.getElementById('spTo').value;
  const qs = new URLSearchParams({ category, fromDate, toDate });
  const data = await api(`/bills/overview?${qs}`);
  const tbody = document.getElementById('spBillRows');
  tbody.innerHTML = '';
  document.getElementById('spEmpty').classList.toggle('hidden', data.bills.length > 0);
  data.bills.forEach((b) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${b.bill_name}</td><td>₹${b.amount}</td><td>${b.due_date}</td>
      <td>${b.is_recurring ? 'Recurring' : 'Non-Recurring'}</td>
      <td><button class="btn" data-select="${b.bill_id}">Schedule Payment</button></td>`;
    tr.querySelector('[data-select]').addEventListener('click', () => openScheduleForm(b));
    tbody.appendChild(tr);
  });
}

function openScheduleForm(bill) {
  selectedBillForSchedule = bill;
  document.getElementById('spFormWrap').classList.remove('hidden');
  document.getElementById('spAmount').value = bill.amount;
  document.getElementById('spFrequencyWrap').style.display = bill.is_recurring ? 'block' : 'none';
  hideBanner(document.getElementById('spBanner'));
}

document.getElementById('confirmScheduleBtn').addEventListener('click', async () => {
  const banner = document.getElementById('spBanner');
  if (!selectedBillForSchedule) return;
  const body = {
    purposeOfPayment: document.getElementById('spPurpose').value,
    payeeName: document.getElementById('payeeName').value.trim(),
    payeeAddress: document.getElementById('payeeAddress').value.trim(),
    payeeBankDetails: document.getElementById('payeeBankDetails').value.trim(),
    paymentMode: document.getElementById('spPaymentMode').value,
    paymentFrequency: document.getElementById('spFrequency').value || undefined,
    payerAccountNumber: document.getElementById('spPayerAccount').value.trim(),
    scheduledDate: document.getElementById('spScheduleDate').value,
    amount: Number(document.getElementById('spAmount').value),
  };
  try {
    const data = await api(`/scheduled-payments/bill/${selectedBillForSchedule.bill_id}`, { method: 'POST', body });
    showBanner(banner, data.message, 'success');
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

async function loadScheduled() {
  const category = document.getElementById('cmCategory').value;
  const fromDate = document.getElementById('cmFrom').value;
  const toDate = document.getElementById('cmTo').value;
  const qs = new URLSearchParams({ category, fromDate, toDate });
  const data = await api(`/scheduled-payments?${qs}`);
  const tbody = document.getElementById('cmRows');
  tbody.innerHTML = '';
  document.getElementById('cmEmpty').classList.toggle('hidden', data.scheduled.length > 0);
  data.scheduled.forEach((sp) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${sp.bill_name}</td><td>₹${sp.amount}</td><td>${sp.due_date}</td>
      <td><input type="date" value="${sp.scheduled_date}" data-datefor="${sp.scheduled_payment_id}" style="width:140px" ${sp.status !== 'Scheduled' ? 'disabled' : ''} /></td>
      <td><span class="badge ${sp.status === 'Scheduled' ? 'blue' : sp.status === 'Cancelled' ? 'red' : 'green'}">${sp.status}</span></td>
      <td class="row-actions">
        <button class="btn secondary" data-cancel="${sp.scheduled_payment_id}" ${sp.status !== 'Scheduled' ? 'disabled' : ''}>Cancel</button>
        <button class="btn" data-modify="${sp.scheduled_payment_id}" ${sp.status !== 'Scheduled' ? 'disabled' : ''}>Modify</button>
      </td>`;
    const banner = document.getElementById('cmBanner');
    tr.querySelector('[data-cancel]').addEventListener('click', async () => {
      const data = await api(`/scheduled-payments/${sp.scheduled_payment_id}/cancel`, { method: 'POST' });
      showBanner(banner, data.message, 'success');
      loadScheduled();
    });
    tr.querySelector('[data-modify]').addEventListener('click', async () => {
      const dateInput = tr.querySelector(`[data-datefor="${sp.scheduled_payment_id}"]`);
      const data = await api(`/scheduled-payments/${sp.scheduled_payment_id}/modify`, { method: 'POST', body: { scheduledDate: dateInput.value } });
      showBanner(banner, data.message, 'success');
      loadScheduled();
    });
    tbody.appendChild(tr);
  });
}

loadCategories();
