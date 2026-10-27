/* SOLUCAR MÁS V5 — Página separada para revisar pedido y medio preferido de pago. */
'use strict';
(()=>{
 const $=s=>document.querySelector(s);
 const cartKey='solucar-cart-v3', themeKey='solucar-theme';
 const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
 const products=[{"id":"filter-oil","name":"F","price":8900,"img":"assets/producto-filter-oil.svg"},{"id":"filter-air","name":"F","price":12900,"img":"assets/producto-filter-air.svg"},{"id":"oil-5w30","name":"A","price":29900,"img":"assets/producto-oil-5w30.svg"},{"id":"oil-15w40","name":"A","price":25900,"img":"assets/producto-oil-15w40.svg"},{"id":"pads","name":"P","price":27900,"img":"assets/producto-pads.svg"},{"id":"bulb","name":"A","price":6900,"img":"assets/producto-bulb.svg"},{"id":"wipers","name":"L","price":9900,"img":"assets/producto-wipers.svg"},{"id":"coolant","name":"R","price":7500,"img":"assets/producto-coolant.svg"}];
 const byId=new Map(products.map(p=>[p.id,p]));
 let cart={};try{cart=JSON.parse(localStorage.getItem(cartKey)||'{}')}catch{}
 if(!cart||typeof cart!=='object'||Array.isArray(cart))cart={};
 const lines=()=>Object.entries(cart).filter(([id,n])=>byId.has(id)&&Number.isInteger(n)&&n>0&&n<=99).map(([id,n])=>({...byId.get(id),qty:n}));
 function paint(){const rows=lines();$('#emptyPaymentCart').hidden=rows.length>0;$('#paymentContent').hidden=rows.length===0;$('#paymentItems').replaceChildren();let total=0;
  for(const p of rows){total+=p.price*p.qty;const row=document.createElement('div');row.className='pay-line';const image=document.createElement('img');image.src=p.img;image.alt='Imagen ilustrativa: '+p.name;image.width=74;image.height=60;const t=document.createElement('div');const strong=document.createElement('strong');strong.textContent=p.name;const sub=document.createElement('small');sub.textContent=p.qty+' × '+money(p.price);t.append(strong,sub);const amount=document.createElement('b');amount.textContent=money(p.price*p.qty);row.append(image,t,amount);$('#paymentItems').append(row)}$('#paymentTotal').textContent=money(total)}
 function updateTheme(){const dark=document.documentElement.dataset.theme==='dark';const btn=$('#themeToggle');if(btn){btn.textContent=dark?'☀':'☾';btn.setAttribute('aria-label',dark?'Activar modo claro':'Activar modo oscuro')}}
 $('#themeToggle')?.addEventListener('click',()=>{const val=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=val;try{localStorage.setItem(themeKey,val)}catch{}updateTheme()});
 $('#accountOpen')?.addEventListener('click',()=>location.assign('cuenta.html'));
 $('#cartOpen')?.addEventListener('click',()=>location.assign('tienda.html'));
 $('#menuToggle')?.addEventListener('click',()=>{const nav=$('#mainNav');if(nav){nav.classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(nav.classList.contains('open')))}});
 const badges=$('#cartBadge');if(badges)badges.textContent=lines().reduce((a,b)=>a+b.qty,0);
 // Render existing header icons as simple glyphs on this standalone page.
 const symbols={cart:'🛒',user:'♙',menu:'☰'};for(const e of document.querySelectorAll('[data-icon]')){if(e.closest('#themeToggle'))continue;e.textContent=symbols[e.dataset.icon]||''}
 updateTheme();paint();
 const form=$('#paymentForm');
 form.addEventListener('submit',e=>{
  e.preventDefault();const rows=lines();if(!rows.length){$('#paymentStatus').textContent='Tu carrito está vacío.';return}
  const info=new FormData(form);const selection=info.get('medio_pago');if(!selection){$('#paymentStatus').textContent='Elige tu medio de pago preferido.';return}
  const order=rows.map(p=>p.name+' × '+p.qty+' = '+money(p.price*p.qty)).join('\n');
  const total=rows.reduce((sum,p)=>sum+p.price*p.qty,0);
  const body=['SOLICITUD DE PEDIDO · SOLUCAR MÁS','','PRODUCTOS (PRECIOS REFERENCIALES)',order,'','Subtotal referencial: '+money(total),'Despacho: por cotizar','','DATOS DEL CLIENTE','Nombre: '+info.get('nombre'),'Correo: '+info.get('correo'),'Teléfono: '+info.get('telefono'),'Comuna: '+info.get('comuna'),'Dirección / indicaciones: '+(info.get('notas')||'Sin observaciones'),'Medio de pago preferido: '+selection,'','IMPORTANTE: Esta es una solicitud. No se ha cobrado ningún importe; confirmar disponibilidad, compatibilidad, despacho, medio de pago y precio final antes de pagar.'].join('\n');
  const email='contacto@solucarmas.cl';const subject='SOLUCAR MÁS — Solicitud de pedido (pago '+selection+')';
  const mailto='mailto:'+email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  $('#paymentStatus').textContent='Se abrirá tu aplicación de correo con la solicitud preparada. Debes pulsar Enviar allí para que SOLUCAR MÁS la reciba. Todavía no se ha realizado ningún pago ni pedido confirmado.';
  window.location.href=mailto;
 });
})();