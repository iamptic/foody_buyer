(() => {
  const urlp = new URLSearchParams(location.search);
  const API = urlp.get('api') || 'http://localhost:8000';

  const els = {
    offers: document.getElementById('offers'),
    empty: document.getElementById('empty'),
    search: document.getElementById('search'),
    sort: document.getElementById('sort'),
    refresh: document.getElementById('refreshBtn'),
    reserveModal: document.getElementById('reserveModal'),
    reserveForm: document.getElementById('reserveForm'),
    reserveOffer: document.getElementById('reserveOffer'),
    buyerName: document.getElementById('buyerName'),
    okModal: document.getElementById('okModal'),
    reserveCode: document.getElementById('reserveCode'),
    reserveUntil: document.getElementById('reserveUntil'),
    okClose: document.getElementById('okClose'),
    toast: document.getElementById('toast')
  };

  let data = [];
  let currentOffer = null;
  const money = (v) => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
  const fmtDT = (s) => new Date(s).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

  const render = () => {
    const q = (els.search.value || '').toLowerCase();
    const sort = els.sort.value;
    let arr = data.slice();
    if (q) arr = arr.filter(o => o.title.toLowerCase().includes(q) || (o.restaurant||'').toLowerCase().includes(q));
    if (sort === 'price') arr.sort((a,b)=> a.price - b.price);
    else if (sort === 'time') arr.sort((a,b)=> new Date(a.expires_at) - new Date(b.expires_at));
    else arr.sort((a,b)=> b.id - a.id);
    els.offers.innerHTML='';
    if (!arr.length) els.empty.classList.remove('hidden'); else els.empty.classList.add('hidden');
    for (const o of arr) {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<div><b>${o.title}</b></div>
        <div class="muted">${o.restaurant}</div>
        <div class="muted">До: ${fmtDT(o.expires_at)}</div>
        <div style="margin:8px 0"><b>${money(o.price)}</b> • Остаток: ${o.quantity}</div>
        <div><button class="btn primary" data-res="${o.id}" ${o.quantity<=0?'disabled':''}>Забронировать</button></div>`;
      div.querySelector('[data-res]').onclick = () => openReserve(o);
      els.offers.appendChild(div);
    }
  };

  const load = async () => {
    try { const r = await fetch(`${API}/offers`); data = await r.json(); render(); }
    catch { els.toast.textContent='Сервер недоступен'; els.toast.classList.remove('hidden'); setTimeout(()=>els.toast.classList.add('hidden'),2000); }
  };

  const openReserve = (o) => {
    currentOffer = o;
    els.reserveOffer.textContent = `${o.restaurant} • ${o.title} — ${money(o.price)}`;
    els.buyerName.value = '';
    els.reserveModal.showModal();
  };

  els.reserveForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!currentOffer) return;
    try {
      const r = await fetch(`${API}/reserve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ offer_id: currentOffer.id, buyer_name: els.buyerName.value.trim() || null }) });
      const data = await r.json();
      if (data.code) {
        els.reserveCode.textContent = data.code;
        els.reserveUntil.textContent = 'Действует до: ' + fmtDT(data.expires_at);
        els.reserveModal.close();
        els.okModal.showModal();
        load();
      } else {
        els.toast.textContent='Ошибка бронирования'; els.toast.classList.remove('hidden'); setTimeout(()=>els.toast.classList.add('hidden'),2000);
      }
    } catch {
      els.toast.textContent='Ошибка сети'; els.toast.classList.remove('hidden'); setTimeout(()=>els.toast.classList.add('hidden'),2000);
    }
  });

  els.okClose.onclick = () => els.okModal.close();
  els.search.addEventListener('input', render);
  els.sort.addEventListener('change', render);
  els.refresh.onclick = () => load();

  load();
})();
