(() => {
  const API = new URLSearchParams(location.search).get('api') || 'http://localhost:8000';
  const $=(id)=>document.getElementById(id);
  let data=[], current=null;
  const toast=(m)=>{const t=$('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2000)};
  const money=(v)=>new Intl.NumberFormat('ru-RU').format(v)+' ₽';
  const fmt=(s)=>new Date(s).toLocaleString('ru-RU',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'});

  function card(o){
    const d=document.createElement('div'); d.className='offer';
    d.innerHTML=`${o.photo_url?`<img class="thumb" src="${o.photo_url}">`:'<div class="thumb"></div>'}<div class="body"><b>${o.title}</b><div>${o.restaurant}</div><div>До: ${fmt(o.expires_at)}</div><div><b>${money(o.price)}</b> • Остаток: ${o.quantity}</div><p><button data-res="${o.id}" ${o.quantity<=0?'disabled':''}>Забронировать</button></p></div>`;
    d.querySelector('[data-res]').onclick=()=>openReserve(o);
    return d;
  }

  function render(){
    const q=($('search').value||'').toLowerCase(); const sort=$('sort').value;
    let arr=data.slice();
    if(q) arr=arr.filter(o=>o.title.toLowerCase().includes(q)||(o.restaurant||'').toLowerCase().includes(q));
    if(sort==='price') arr.sort((a,b)=>a.price-b.price);
    else if(sort==='time') arr.sort((a,b)=>new Date(a.expires_at)-new Date(b.expires_at));
    else arr.sort((a,b)=>b.id-a.id);
    const box=$('offers'); box.innerHTML=''; (arr.length? $('empty').style.display='none' : $('empty').style.display='block');
    arr.forEach(o=>box.appendChild(card(o)));
  }

  async function load(){ try{const r=await fetch(`${API}/offers`); data=await r.json(); render(); }catch{ toast('Сервер недоступен'); } }
  function openReserve(o){ current=o; $('reserveOffer').textContent=`${o.restaurant} • ${o.title} — ${money(o.price)}`; $('buyerName').value=''; $('reserveModal').showModal(); }

  $('reserveForm').addEventListener('submit', async (e)=>{
    e.preventDefault(); if(!current) return;
    try{const r=await fetch(`${API}/reserve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({offer_id:current.id,buyer_name:$('buyerName').value.trim()||null})}); const j=await r.json();
      if(j.code){ $('reserveCode').textContent=j.code; $('reserveUntil').textContent='Действует до: '+fmt(j.expires_at); $('reserveModal').close(); $('okModal').showModal(); load(); }
      else toast('Ошибка: '+JSON.stringify(j));
    }catch{ toast('Ошибка сети'); }
  });

  $('okClose').onclick=()=>$('okModal').close();
  $('search').oninput=render; $('sort').onchange=render; $('refreshBtn').onclick=load;
  load();
})();
