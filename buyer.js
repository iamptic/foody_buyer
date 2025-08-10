// Buyer screen with city filter and "near me"
(() => {
  const urlApi = new URLSearchParams(location.search).get('api');
  if (urlApi) localStorage.setItem('foody_api', urlApi);
  const API = urlApi || localStorage.getItem('foody_api') || 'http://localhost:8000';

  const els = {
    offers: document.getElementById('offers'),
    empty: document.getElementById('empty'),
    search: document.getElementById('search'),
    sort: document.getElementById('sort'),
    refresh: document.getElementById('refreshBtn'),
    toast: document.getElementById('toast')
  };

  // City toolbar
  const filters = document.querySelector('.filters');
  const cityWrap = document.createElement('div'); cityWrap.style.display='flex'; cityWrap.style.gap='8px'; cityWrap.style.alignItems='center';
  cityWrap.innerHTML = `<select id="citySelect" class="input"></select><button id="geoBtn" class="btn ghost">Рядом со мной</button>`;
  filters.prepend(cityWrap);
  const citySelect = cityWrap.querySelector('#citySelect');
  const geoBtn = cityWrap.querySelector('#geoBtn');

  const CITY_COORDS = {
    "Москва": [55.751244, 37.618423],
    "Санкт‑Петербург": [59.93863, 30.31413],
    "Томск": [56.4977, 84.9744],
    "Новосибирск": [55.0415, 82.9346],
    "Екатеринбург": [56.8389, 60.6057],
    "Казань": [55.7963, 49.1088],
    "Нижний Новгород": [56.2965, 43.9361],
    "Самара": [53.1959, 50.1008],
    "Красноярск": [56.0153, 92.8932],
    "Владивосток": [43.1155, 131.8855],
    "Хабаровск": [48.4802, 135.0710]
  };

  let data = [], currentCity = null, currentOffer = null;

  function toast(msg){ els.toast.textContent=msg; els.toast.classList.remove('hidden'); setTimeout(()=>els.toast.classList.add('hidden'),2000); }
  const money = (v) => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
  const fmtDT = (s) => new Date(s).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

  async function loadCities(){
    try{
      const r = await fetch(`${API}/config`);
      const {cities} = await r.json();
      citySelect.innerHTML = `<option value="">Все города</option>` + cities.map(c=>`<option value="${c}">${c}</option>`).join('');
    }catch{
      const cities = Object.keys(CITY_COORDS);
      citySelect.innerHTML = `<option value="">Все города</option>` + cities.map(c=>`<option value="${c}">${c}</option>`).join('');
    }
  }

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
    try {
      const params = new URLSearchParams();
      if (currentCity) params.set('city', currentCity);
      const r = await fetch(`${API}/offers` + (params.toString()?`?${params}`:''));
      data = await r.json(); render();
    } catch { toast('Сервер недоступен'); }
  }

  function openReserve(o){
    currentOffer = o;
    const dlg = document.getElementById('reserveModal');
    const offerEl = document.getElementById('reserveOffer');
    const buyerName = document.getElementById('buyerName');
    offerEl.textContent = `${o.restaurant} • ${o.title} — ${money(o.price)}`;
    buyerName.value=''; document.getElementById('qty').value=1;
    dlg.showModal();
  }

  document.getElementById('reserveForm').addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    if(!currentOffer) return;
    const qty = Math.max(1, parseInt(document.getElementById('qty').value || '1', 10));
    const buyerName = (document.getElementById('buyerName').value || '').trim() || null;
    try{
      const r = await fetch(`${API}/reserve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ offer_id: currentOffer.id, buyer_name: buyerName, qty }) });
      const d = await r.json();
      if(!r.ok) return toast(d?.detail || 'Ошибка бронирования');
      document.getElementById('reserveModal').close();
      document.getElementById('reserveCode').textContent = d.code;
      document.getElementById('reserveUntil').textContent = 'Действует до: ' + fmtDT(d.expires_at);
      document.getElementById('okModal').showModal();
      await load();
    }catch{ toast('Ошибка сети'); }
  });
  document.getElementById('okClose').onclick = () => document.getElementById('okModal').close();

  citySelect.addEventListener('change', async () => { currentCity = citySelect.value || null; await load(); });

  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Геолокация не поддерживается');
    navigator.geolocation.getCurrentPosition(pos => {
      const {latitude, longitude} = pos.coords;
      let best=null, bestDist=1e9;
      for (const [city, [lat, lon]] of Object.entries(CITY_COORDS)){
        const d = Math.hypot(lat - latitude, lon - longitude);
        if (d < bestDist){ bestDist=d; best=city; }
      }
      if (best){
        currentCity = best;
        citySelect.value = best;
        load();
      } else {
        toast('Не удалось определить ближайший город');
      }
    }, ()=>toast('Не удалось получить геолокацию'));
  });

  // wire
  els.search.addEventListener('input', render);
  els.sort.addEventListener('change', render);
  document.getElementById('refreshBtn2')?.addEventListener('click', load);
  els.refresh.onclick = () => load();

  (async () => { await loadCities(); await load(); })();
})();
