(() => {
  const urlp = new URLSearchParams(location.search);
  const API = urlp.get('api') || 'https://foodyback-production.up.railway.app';
  const els = {
    offers: document.getElementById('offers'),
    empty: document.getElementById('empty'),
  };
  const money = (v) => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
  const fmtDT = (s) => new Date(s).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

  const card = (o) => {
    const div = document.createElement('div');
    div.className = 'offer';
    const img = o.photo_url ? `<img class="thumb" src="${o.photo_url}" alt="${o.title}">` : `<div class="thumb"></div>`;
    div.innerHTML = `${img}
      <div class="body">
        <div class="title"><b>${o.title}</b></div>
        <div class="meta">${o.restaurant}</div>
        <div class="meta">До: ${fmtDT(o.expires_at)}</div>
        <div class="price">${money(o.price)} • Остаток: ${o.quantity}</div>
      </div>`;
    return div;
  };

  const load = async () => {
    try { const r = await fetch(`${API}/offers`); const data = await r.json();
      els.offers.innerHTML=''; if (!Array.isArray(data) || !data.length) { els.empty.classList.remove('hidden'); return; }
      els.empty.classList.add('hidden'); data.forEach(o => els.offers.appendChild(card(o)));
    } catch { els.empty?.classList.remove('hidden'); }
  };

  load();
})();
