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
  const profileCache = new Map(); // restaurant_id -> profile

  const toast = (msg) => { els.toast.textContent = msg; els.toast.style.display='block'; setTimeout(()=> els.toast.style.display='none', 2200); };
  const money = (v) => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
  const fmtDT = (s) => new Date(s).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

  const fetchProfile = async (rid) => {
    if (profileCache.has(rid)) return profileCache.get(rid);
    try {
      const r = await fetch(`${API}/restaurant/${rid}`);
      if (!r.ok) return null;
      const prof = await r.json();
      profileCache.set(rid, prof);
      return prof;
    } catch { return null; }
  };

  const profileBadge = (prof) => {
    if (!prof) return '';
    const incomplete = !prof.phone || !prof.address;
    return incomplete ? `<span class="badge" title="Ресторан ещё не заполнил все данные">Профиль неполный</span>` : '';
  };

  const card = (o, prof) => {
    const div = document.createElement('div');
    div.className = 'offer';
    const img = o.photo_url ? `<img class="thumb" src="${o.photo_url}" alt="${o.title}">` : `<div class="thumb"></div>`;
    div.innerHTML = `${img}
      <div class="body">
        <div class="title"><b>${o.title}</b></div>
        <div class="meta">${o.restaurant} ${profileBadge(prof)}</div>
        <div class="meta">До: ${fmtDT(o.expires_at)}</div>
        <div class="price">${money(o.price)} • Остаток: ${o.quantity}</div>
        <div class="ops"><button class="btn primary" data-res="${o.id}" ${o.quantity<=0 ? 'disabled':''}>Забронировать</button></div>
      </div>`;
    div.querySelector('[data-res]').onclick = () => openReserve(o);
    return div;
  };

  const render = async () => {
    const q = (els.search.value || '').toLowerCase();
    const sort = els.sort.value;
    let arr = data.slice();
    if (q) arr = arr.filter(o => o.title.toLowerCase().includes(q) || (o.restaurant||'').toLowerCase().includes(q));
    if (sort === 'price') arr.sort((a,b)=> a.price - b.price);
    else if (sort === 'time') arr.sort((a,b)=> new Date(a.expires_at) - new Date(b.expires_at));
    else arr.sort((a,b)=> b.id - a.id);

    els.offers.innerHTML='';
    if (!arr.length) els.empty.classList.remove('hidden'); else els.empty.classList.add('hidden');

    // Render with lightweight profile info (cached)
    for (const o of arr) {
      const prof = await fetchProfile(o.restaurant_id);
      els.offers.appendChild(card(o, prof));
    }
  };

  const load = async () => {
    try { const r = await fetch(`${API}/offers`); data = await r.json(); render(); }
    catch { toast('Сервер недоступен'); }
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
        toast('Ошибка: ' + JSON.stringify(data));
      }
    } catch { toast('Ошибка сети'); }
  });

  els.okClose.onclick = () => els.okModal.close();
  els.search.addEventListener('input', render);
  els.sort.addEventListener('change', render);
  els.refresh.onclick = () => load();

  load();
})(); 
