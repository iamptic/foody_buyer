(() => {
  const API = new URLSearchParams(location.search).get('api') || 'http://localhost:8000';
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
  let data = [], currentOffer = null;
  const money = (v) => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
  const fmtDT = (s) => new Date(s).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

  const render = () => {
    const q = (els.search.value || '').toLowerCase();
    const sort = els.sort.value;
    let arr = data.slice();
    if (q) arr = arr.filter(o => (o.title||'').toLowerCase().includes(q) || (o.restaurant||'').toLowerCase().includes(q));
    if (sort === 'price') arr.sort((a,b)=> a.price - b.price);
    else if (sort === 'time') arr.sort((a,b)=> new Date(a.expires_at) - new Date(b.expires_at));
    else arr.sort((a,b)=> b.id - a.id);
    els.offers.innerHTML='';
    if (!arr.length) els.empty.classList.remove('hidden'); else els.empty.classList.add('hidden');
    for (const o of arr) {
      const div = document.createElement('div');
      div.className = 'card-item';
      const img = o.photo_url ? `<div style="margin:6px 0"><img src="${o.photo_url}" alt="" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px"/></div>` : '';
      div.innerHTML = `<div><b>${o.title}</b></div>
        ${img}
        <div class="muted">${o.restaurant}</div>
        <div class="muted">До: ${fmtDT(o.expires_at)}</div>
        <div style="margin:8px 0"><b>${money(o.price)}</b> • Остаток: ${o.quantity}</div>
        <div><button class="btn primary" data-res="${o.id}" ${o.quantity<=0?'disabled':''}>Забронировать</button></div>`;
      div.querySelector('[data-res]').onclick = () => openReserve(o);
      els.offers.appendChild(div);
    }
  };

  async function load(){
    try { const r = await fetch(`${API}/offers`); data = await r.json(); render(); }
    catch { toast('Сервер недоступен'); }
  }

  function toast(msg){ els.toast.textContent=msg; els.toast.classList.remove('hidden'); setTimeout(()=>els.toast.classList.add('hidden'),2000); }

  function openReserve(o){
    currentOffer = o;
    els.reserveOffer.textContent = `${o.restaurant} • ${o.title} — ${money(o.price)}`;
    els.buyerName.value = ''; document.getElementById('qty').value = 1;
    els.reserveModal.showModal();
  }

  els.reserveForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!currentOffer) return;
    const qty = Math.max(1, parseInt(document.getElementById('qty').value || '1', 10));
    const buyerName = els.buyerName.value.trim() || null;

    try {
      const r = await fetch(`${API}/reserve`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ offer_id: currentOffer.id, buyer_name: buyerName, qty })
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data?.detail || 'Ошибка бронирования';
        return toast(msg);
      }
      if (data.code) {
        els.reserveCode.textContent = data.code;
        els.reserveUntil.textContent = 'Действует до: ' + fmtDT(data.expires_at);
        els.reserveModal.close();
        els.okModal.showModal();
        await load();
      } else {
        toast('Ошибка бронирования');
      }
    } catch {
      toast('Ошибка сети');
    }
  });

  els.okClose.onclick = () => els.okModal.close();
  els.search.addEventListener('input', render);
  els.sort.addEventListener('change', render);
  document.getElementById('refreshBtn2')?.addEventListener('click', load);
  els.refresh.onclick = () => load();
  load();
})();
