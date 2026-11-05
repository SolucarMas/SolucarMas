/* SOLUCAR MÁS · Pago por tarjeta. Precios cargados desde Supabase y validados nuevamente en el servidor. */
'use strict';
(() => {
  const CART_KEY='solucar-cart-v3', THEME_KEY='solucar-theme', PENDING_KEY='solucar-webpay-orden-pendiente';
  const $ = selector => document.querySelector(selector);
  const money = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
  const form=$('#paymentForm'), statusNode=$('#paymentStatus'), submit=form?.querySelector('button[type="submit"]');
  let products=[],cart={},lines=[],ready=false,missingProduct=false;
  const config=window.SOLUCAR_AUTH_CONFIG||{};
  function inform(message,kind=''){
    if(!statusNode)return;
    statusNode.textContent=message;
    statusNode.style.color=kind==='error'?'#f25b70':kind==='success'?'#3bbe94':'';
  }
  function refreshCart(){
    try{cart=JSON.parse(localStorage.getItem(CART_KEY)||'{}')}catch{cart={}};
    if(!cart||typeof cart!=='object'||Array.isArray(cart))cart={};
    lines=products.filter(p=>Number.isInteger(cart[p.id])&&cart[p.id]>0&&cart[p.id]<=20)
      .map(p=>({...p,qty:cart[p.id]}));
    $('#emptyPaymentCart').hidden=lines.length>0 || !ready;
    $('#paymentContent').hidden=lines.length===0 || !ready;
    const badge=$('#cartBadge');if(badge)badge.textContent=lines.reduce((sum,p)=>sum+p.qty,0);
    const root=$('#paymentItems');root.replaceChildren();
    for(const p of lines){
      const row=document.createElement('div');row.className='pay-item';
      row.style.cssText='display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--line)';
      const label=document.createElement('span');label.textContent=`${p.name} × ${p.qty}`;
      const amount=document.createElement('strong');amount.textContent=money(p.qty*p.price);
      row.append(label,amount);root.append(row);
    }
    $('#paymentTotal').textContent=money(lines.reduce((sum,p)=>sum+p.price*p.qty,0));
    if(submit)submit.disabled=!ready||!lines.length||missingProduct;
  }
  async function loadProducts(){
    inform('Verificando los precios actualizados de tu pedido…');
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url||'')||!config.publishableKey){
      inform('La conexión con el catálogo no está configurada.','error');return;
    }
    const ctrl=new AbortController(), timeout=setTimeout(()=>ctrl.abort(),15000);
    try{
      const url=config.url.replace(/\/$/,'')+'/rest/v1/store_products?select=id,name,price_clp,active&active=eq.true';
      const response=await fetch(url,{headers:{apikey:config.publishableKey},signal:ctrl.signal,cache:'no-store'});
      if(!response.ok)throw Error(`No se pudo obtener el catálogo (HTTP ${response.status}).`);
      const rows=await response.json();if(!Array.isArray(rows))throw Error('Respuesta inesperada del catálogo.');
      products=rows.filter(p=>/^[a-z0-9-]{3,50}$/.test(p.id)&&Number.isInteger(p.price_clp)&&p.price_clp>0)
        .map(p=>({id:p.id,name:p.name,price:p.price_clp}));
      ready=true;
      let currentCart={};try{currentCart=JSON.parse(localStorage.getItem(CART_KEY)||'{}')}catch{}
      missingProduct=Object.keys(currentCart||{}).some(id=>currentCart[id]>0&&!products.some(p=>p.id===id));
      refreshCart();
      inform(missingProduct?'Uno o más productos del carrito ya no están disponibles. Vuelve a la tienda y actualiza tu carrito antes de pagar.':'',missingProduct?'error':'');
    }catch(err){ready=false;refreshCart();inform('No se pudieron verificar los precios actuales. No inicies el pago: actualiza la página más tarde. '+(err.message||''),'error');}
    finally{clearTimeout(timeout)}
  }
  function normalizePhone(raw,country){
    const code=String(country||'+56'),prefix=code.replace(/\D/g,'');
    let digits=String(raw||'').replace(/\D/g,'');
    if(prefix&&digits.startsWith(prefix)&&digits.length>prefix.length+6)digits=digits.slice(prefix.length);
    if(code==='+56'&&digits.startsWith('09'))digits=digits.slice(1);
    return (code+' '+digits).trim();
  }
  function titleCase(value){return String(value||'').trim().toLocaleLowerCase('es-CL').replace(/(^|[\s-])([a-záéíóúñ])/g,(m,a,b)=>a+b.toLocaleUpperCase('es-CL'))}
  async function loadCommunes(){
    const list=$('#comunasPago');if(!list)return;
    const fallback=['Alto Hospicio','Antofagasta','Arica','Buin','Calama','Cerrillos','Cerro Navia','Chillán','Colina','Concepción','Coquimbo','Copiapó','Curicó','El Bosque','Estación Central','Huechuraba','Iquique','La Cisterna','La Florida','La Granja','La Pintana','La Reina','Las Condes','Lo Barnechea','Lo Espejo','Lo Prado','Macul','Maipú','Ñuñoa','Padre Hurtado','Peñalolén','Providencia','Pudahuel','Puente Alto','Quilicura','Quinta Normal','Rancagua','Recoleta','Renca','San Bernardo','San Joaquín','San Miguel','San Ramón','Santiago','Talagante','Temuco','Valdivia','Valparaíso','Viña del Mar'];
    const populate=names=>list.replaceChildren(...[...new Set(names)].sort((a,b)=>a.localeCompare(b,'es-CL')).map(name=>{const option=document.createElement('option');option.value=name;return option}));
    populate(fallback);
    for(const endpoint of ['https://apis.modernizacion.cl/dpa/comunas','https://apis.digital.gob.cl/dpa/comunas']){
      try{const resp=await fetch(endpoint,{headers:{Accept:'application/json'}});if(!resp.ok)continue;
        const data=await resp.json();const raw=Array.isArray(data)?data:Array.isArray(data?.data)?data.data:[];
        const names=raw.map(v=>titleCase(v?.nombre||v?.Nombre||v?.name)).filter(Boolean);
        if(names.length>100){populate(names);break}
      }catch{}
    }
  }
  function configureNavigation(){
    let theme;try{theme=localStorage.getItem(THEME_KEY)}catch{}
    if(theme==='dark'||theme==='light')document.documentElement.dataset.theme=theme;
    $('#themeToggle')?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem(THEME_KEY,next)}catch{}});
    $('#accountOpen')?.addEventListener('click',()=>location.href='cuenta.html');
    $('#cartOpen')?.addEventListener('click',()=>location.href='tienda.html');
    $('#menuToggle')?.addEventListener('click',()=>{const menu=$('#mainNav');const opened=menu.classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(opened))});
  }
  async function checkout(event){
    event.preventDefault();if(!form.reportValidity())return;
    if(!ready)return inform('El catálogo todavía no está disponible.','error');
    if(missingProduct)return inform('Tu carrito contiene un producto que ya no está disponible. Actualízalo antes de pagar.','error');
    if(!lines.length)return inform('El carrito está vacío o los productos ya no están disponibles.','error');
    const customer=Object.fromEntries(new FormData(form).entries());delete customer.medio_pago;delete customer.acepta_condiciones;
    customer.telefono=normalizePhone(customer.telefono,$('#orderPhoneCountry')?.value);
    customer.comuna=titleCase(customer.comuna);
    if(customer.telefono.replace(/\D/g,'').length<8)return inform('Revisa el número de teléfono.','error');
    const checkoutUrl=config.url.replace(/\/$/,'')+'/functions/v1/webpay?accion=iniciar';
    submit.disabled=true;inform('Conectando de forma segura con Transbank…');
    const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),20000);
    try{
      const response=await fetch(checkoutUrl,{method:'POST',mode:'cors',signal:ctl.signal,
        headers:{'Content-Type':'application/json',apikey:config.publishableKey},
        body:JSON.stringify({customer,items:lines.map(p=>({id:p.id,qty:p.qty,expectedPrice:p.price}))})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.ok!==true){
        if(response.status===409){await loadProducts();throw Error('El precio de un producto cambió. Revisa el nuevo total antes de pagar.')}
        throw Error(data.error||`No se pudo iniciar el pago (HTTP ${response.status}).`);
      }
      const redirect=new URL(data.url);
      if(redirect.protocol!=='https:'||!new Set(['webpay3g.transbank.cl','webpay3gint.transbank.cl']).has(redirect.hostname)||!/^[A-Za-z0-9._-]{20,256}$/.test(data.token||''))
        throw Error('Transbank devolvió una respuesta de redirección inválida.');
      try{sessionStorage.setItem(PENDING_KEY,JSON.stringify({pedido:data.pedido,cart}))}catch{}
      const post=document.createElement('form');post.method='POST';post.action=redirect.href;
      const hidden=document.createElement('input');hidden.type='hidden';hidden.name='token_ws';hidden.value=data.token;
      post.append(hidden);document.body.append(post);inform('Abriendo la plataforma segura de Transbank…');post.submit();
    }catch(err){inform((err.name==='AbortError'?'Tiempo de espera agotado; el estado del pago no pudo comprobarse.':err.message||'No se pudo conectar.')+' Si ya autorizaste un pago, consulta con la tienda antes de reintentarlo.','error')}
    finally{clearTimeout(timeout);submit.disabled=!ready||!lines.length||missingProduct}
  }
  configureNavigation();
  if(submit){submit.textContent='Pagar con tarjeta →';submit.disabled=true}
  form?.addEventListener('submit',checkout);
  refreshCart();loadProducts();loadCommunes();
})();
