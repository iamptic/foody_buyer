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
    toast: document.getElementById('toast'),
    minPrice: document.getElementById('minPrice'),
    maxPrice: document.getElementById('maxPrice'),
    category: document.getElementById('category'),
    onlyFav: document.getElementById('onlyFav'),
    radius: document.getElementById('radius'),
    geoBtn: document.getElementById('geoBtn'),
    geoState: document.getElementById('geoState'),
  };

  let data = [];
  let currentOffer = null;
  let myPos = null; // {lat, lon}

  const favKey = 'foody_fav_restaurants';
  const loadFavs = () => { try { return JSON.parse(localStorage.getItem(favKey) || '[]'); } catch { return []; } };
  const saveFavs = (arr) => localStorage.setItem(favKey, JSON.stringify(arr));
  const isFav = (rest) => loadFavs().includes(rest);
  const toggleFav = (rest) => { const favs = loadFavs(); const idx = favs.indexOf(rest); if (idx>=0) favs.splice(idx,1); else favs.push(rest); saveFavs(favs); };

  const toast = (msg) => { els.toast.textContent = msg; els.toast.style.display='block'; setTimeout(()=> els.toast.style.display='none', 2200); };
  const money = (v) => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
  const fmtDT = (s) => new Date(s).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

  const haversine = (lat1, lon1, lat2, lon2) => {
    if ([lat1,lon1,lat2,lon2].some(v => v == null)) return NaN;
    const R = 6371; // km
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const card = (o) => {
    const div = document.createElement('div');
    div.className = 'offer';
    const img = o.photo_url ? `<img class="thumb" src="${o.photo_url}" alt="${o.title}">` : `<div class="thumb"></div>`;
    const cat = o.category ? `<span class="badge-chip">${o.category}</span>` : '';
    const tags = (o.tags||'').split(',').map(t=>t.trim()).filter(Boolean).slice(0,4).map(t=>`<span class="badge-chip">${t}</span>`).join('');
    const heart = `<button class="heart" title="В избранное" data-heart="${o.restaurant}">${isFav(o.restaurant) ? '❤️' : '🤍'}</button>`;
    const dist = (isFinite(o._distKm) ? `<span class="meta-dist">• ${o._distKm.toFixed(1)} км</span>` : '');
    div.innerHTML = `${img}
      <div class="body">
        <div class="title"><b>${o.title}</b></div>
        <div class="meta">${cat}${tags}<span class="rest">• ${o.restaurant}</span> ${heart} ${dist}</div>
        <div class="meta">${o.restaurant_address || ''}</div>
        <div class="meta">До: ${fmtDT(o.expires_at)}</div>
        <div class="price">${money(o.price)} • Остаток: ${o.quantity}</div>
        <div class="ops"><button class="btn primary" data-res="${o.id}" ${o.quantity<=0 ? 'disabled':''}>Забронировать</button></div>
      </div>`;
    div.querySelector('[data-res]').onclick = () => openReserve(o);
    div.querySelector('[data-heart]').onclick = (e) => { toggleFav(o.restaurant); e.currentTarget.textContent = isFav(o.restaurant) ? '❤️' : '🤍'; render(); };
    return div;
  };

  const categoriesFromData = () => {
    const set = new Set();
    data.forEach(o => { if (o.category) set.add(o.category); });
    const arr = Array.from(set).sort();
    els.category.innerHTML = '<option value="">Категория — все</option>' + arr.map(c=>`<option>${c}</option>`).join('');
  };

  const applyGeo = (arr) => {
    if (!myPos) { arr.forEach(o => o._distKm = NaN); return arr; }
    arr.forEach(o => {
      o._distKm = haversine(myPos.lat, myPos.lon, o.restaurant_lat ?? NaN, o.restaurant_lon ?? NaN);
    });
    const radius = parseFloat(els.radius.value || 'NaN');
    if (isFinite(radius) && radius > 0) {
      arr = arr.filter(o => isFinite(o._distKm) and o._distKm <= radius);
    }
    return arr;
  };

  const render = () => {
    let arr = data.slice();
    const q = (els.search.value || '').toLowerCase();
    const cat = els.category.value;
    const minP = parseFloat(els.minPrice.value || 'NaN');
    const maxP = parseFloat(els.maxPrice.value || 'NaN');
    const favOnly = els.onlyFav.checked;
    if (q) arr = arr.filter(o => o.title.toLowerCase().includes(q) || (o.restaurant||'').toLowerCase().includes(q) || (o.tags||'').toLowerCase().includes(q));
    if (cat) arr = arr.filter(o => o.category === cat);
    if (isFinite(minP)) arr = arr.filter(o => o.price >= minP);
    if (isFinite(maxP)) arr = arr.filter(o => o.price <= maxP);
    if (favOnly) arr = arr.filter(o => isFav(o.restaurant));
    arr = applyGeo(arr);
    const sort = els.sort.value;
    if (sort === 'price') arr.sort((a,b)=> a.price - b.price);
    else if (sort === 'time') arr.sort((a,b)=> new Date(a.expires_at) - new Date(b.expires_at));
    else if (sort === 'dist') arr.sort((a,b)=> (a._distKm ?? Infinity) - (b._distKm ?? Infinity));
    else arr.sort((a,b)=> b.id - a.id);
    els.offers.innerHTML='';
    if (!arr.length) els.empty.classList.remove('hidden'); else els.empty.classList.add('hidden');
    arr.forEach(o => els.offers.appendChild(card(o)));
  };

  const load = async () => {
    try { const r = await fetch(`${API}/offers`); data = await r.json(); categoriesFromData(); render(); }
    catch { els.toast.textContent='Сервер недоступен'; els.toast.style.display='block'; setTimeout(()=>els.toast.style.display='none',2200); }
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
        els.toast.textContent='Ошибка: '+JSON.stringify(data); els.toast.style.display='block'; setTimeout(()=>els.toast.style.display='none',2200);
      }
    } catch { els.toast.textContent='Ошибка сети'; els.toast.style.display='block'; setTimeout(()=>els.toast.style.display='none',2200); }
  });

  const askGeo = () => {
    if (!navigator.geolocation) { els.geoState.textContent='Геолокация: недоступна'; return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        myPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        els.geoState.textContent = 'Геолокация: определена';
        render();
      },
      (err) => { els.geoState.textContent = 'Геолокация: отказано'; },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
    );
  };

  els.geoBtn.onclick = askGeo;
  ['input','change'].forEach(evt => {
    els.search.addEventListener(evt, render);
    els.category.addEventListener(evt, render);
    els.minPrice.addEventListener(evt, render);
    els.maxPrice.addEventListener(evt, render);
    els.sort.addEventListener(evt, render);
    els.onlyFav.addEventListener(evt, render);
    els.radius.addEventListener(evt, render);
  });
  els.refresh.onclick = () => load();

  load();
})();
