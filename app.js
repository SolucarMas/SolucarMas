/* SOLUCAR MÁS - Sitio estático para GitHub Pages.
   Configura correo, productos y precios antes de publicar ventas reales.
   Para pagos/usuarios reales: conectar servicios backend seguros. */
'use strict';
const SETTINGS={contactEmail:'contacto@solucarmas.cl',cartKey:'solucar-cart-v3',themeKey:'solucar-theme'};
let productList=[];
const PRODUCT_PHOTOS={"filter-oil":"foto-filter-oil.webp","filter-air":"foto-filter-air.webp","oil-5w30":"foto-oil-5w30.webp","oil-15w40":"foto-oil-15w40.webp","pads":"foto-pads.webp","bulb":"foto-bulb.webp","wipers":"foto-wipers.webp","coolant":"foto-coolant.webp"};
const icons={
moon:'<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 2h3l3 14h14l2-10H5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',x:'<path d="m5 5 14 14M19 5 5 19"/>',arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',up:'<path d="m5 14 7-7 7 7M12 7v14"/>',bag:'<path d="M4 7h16l-1 14H5L4 7Zm4 0V6a4 4 0 0 1 8 0v1"/>',truck:'<path d="M3 5h11v12H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',package:'<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',shield:'<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/>',filter:'<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M8 8h8M8 12h8M8 16h8"/>',oil:'<path d="M8 3h8v3H8zM7 6h10l2 4v11H5V10l2-4Z"/><path d="M8 13h8M12 10v7"/>',brake:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',light:'<path d="M9 18h6m-5 3h4M8 15a7 7 0 1 1 8 0l-1 3H9l-1-3Z"/>',wiper:'<path d="M3 19c7-13 11-13 18 0M5 17l14-9"/>'};
const $=sel=>document.querySelector(sel);
let catalogReady=false;let repaintStore=null;
const catalogConfig=()=>window.SOLUCAR_AUTH_CONFIG||{};
function photoForProduct(p){
 const config=catalogConfig();
 if(p.imagePath && /^[a-zA-Z0-9_./-]{1,240}$/.test(p.imagePath) && config.url){
   return config.url.replace(/\/$/,'')+'/storage/v1/object/public/store-products/'+p.imagePath.split('/').map(encodeURIComponent).join('/');
 }
 return PRODUCT_PHOTOS[p.id]||'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 270"><rect width="400" height="270" fill="#e7edf3"/><text x="200" y="138" text-anchor="middle" font-size="19" fill="#526175">Imagen próximamente</text></svg>');
}
function refreshCategoryButtons(){
 const filters=$('#productFilters');if(!filters)return;
 const current=filters.querySelector('[aria-pressed="true"]')?.dataset.category||'Todos';
 const names=['Todos',...new Set(productList.map(p=>p.category))];
 filters.replaceChildren(...names.map(name=>{
   const b=document.createElement('button');b.type='button';b.className='filter-chip';b.dataset.category=name;
   b.setAttribute('aria-pressed',String(name===current));b.textContent=name;return b;
 }));
 if(!names.includes(current)){filters.querySelector('button')?.setAttribute('aria-pressed','true');}
}
async function loadEditableCatalog(){
 const cfg=catalogConfig();
 const problem=msg=>{catalogReady=false;const grid=$('#productsGrid');if(grid){
   let alert=$('#catalogAlert');if(!alert){alert=document.createElement('p');alert.id='catalogAlert';alert.className='no-results';grid.before(alert)}
   alert.textContent=msg+' Puedes pedir una cotización si necesitas un producto.';
    const count=document.querySelector('#catalogCount');if(count)count.textContent='Catálogo no disponible en este momento';
 } renderCart();if(repaintStore)repaintStore();};
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||'')||!cfg.publishableKey){
   problem('Catálogo temporalmente no disponible. Comunícate con la tienda.');return;
 }
 const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),15000);
 try{
   const url=cfg.url.replace(/\/$/,'')+'/rest/v1/store_products?select=id,name,category,details,price_clp,image_path,active,sort_order&active=eq.true&order=sort_order.asc,name.asc';
   const res=await fetch(url,{headers:{apikey:cfg.publishableKey},signal:ctl.signal,cache:'no-store'});
   if(!res.ok)throw Error('Catálogo HTTP '+res.status);
   const data=await res.json();if(!Array.isArray(data))throw Error('Catálogo inválido');
   productList=data.filter(p=>/^[a-z0-9-]{3,50}$/.test(p.id)&&Number.isInteger(p.price_clp)&&p.price_clp>0)
     .map(p=>({id:p.id,name:p.name,category:p.category,details:p.details||'',price:p.price_clp,imagePath:p.image_path}));
   catalogReady=true;$('#catalogAlert')?.remove();
   refreshCategoryButtons();
   normalizeCart();try{localStorage.setItem(SETTINGS.cartKey,JSON.stringify(cart))}catch{}
   renderCart();if(repaintStore)repaintStore();
 }catch(e){console.warn('Catálogo:',e);problem('No se pudo actualizar el catálogo. La compra está deshabilitada hasta recuperar la conexión.');}
 finally{clearTimeout(tm)}
}

const money=value=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
const safeLoad=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}};
const icon=(name,size=22)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.package}</svg>`;
const makeMail=(subject,body)=>{const uri='mailto:'+SETTINGS.contactEmail+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);window.location.href=uri};
let cart=safeLoad(SETTINGS.cartKey,{});
if(!cart||Array.isArray(cart)||typeof cart!=='object')cart={};
let toastTimer;
function toast(message){const node=$('#toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),3100)}
function normalizeCart(){if(!catalogReady)return;const valid=new Map(productList.map(p=>[p.id,p]));for(const id of Object.keys(cart)){if(!valid.has(id)||!Number.isInteger(cart[id])||cart[id]<1||cart[id]>20)delete cart[id]}}
function saveCart(){normalizeCart();try{localStorage.setItem(SETTINGS.cartKey,JSON.stringify(cart))}catch{}renderCart()}
function cartLines(){normalizeCart();return productList.filter(p=>cart[p.id]).map(p=>({...p,qty:cart[p.id]}))}
function cartSum(){return cartLines().reduce((sum,p)=>sum+p.price*p.qty,0)}
function addToCart(id){if(!catalogReady)return toast('Espera a que carguen los precios actuales.');if(!productList.find(p=>p.id===id))return;cart[id]=Math.min(20,(cart[id]||0)+1);saveCart();toast('Producto agregado al carrito')}
function adjustQty(id,delta){const next=(cart[id]||0)+delta;if(next<=0)delete cart[id];else cart[id]=Math.min(20,next);saveCart()}
function renderCart(){const lines=cartLines(),count=lines.reduce((s,p)=>s+p.qty,0);const countNode=$('#cartBadge');if(countNode)countNode.textContent=count;const totalNode=$('#cartTotal');if(totalNode)totalNode.textContent=money(cartSum());const root=$('#cartItems');if(!root)return;root.replaceChildren();if(lines.length===0){root.innerHTML=`<div class="empty-cart">${icon('bag',48)}<h3>Tu carrito está vacío</h3><p>Explora la tienda esencial y añade los productos que necesites.</p><a class="button button-primary" href="${'tienda.html'}">Ir a la tienda</a></div>`}for(const p of lines){const row=document.createElement('div');row.className='cart-line';const left=document.createElement('div');const title=document.createElement('strong');title.textContent=p.name;const small=document.createElement('small');small.textContent=money(p.price)+' c/u · catálogo actualizado';const qty=document.createElement('div');qty.className='quantity';const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Quitar una unidad de '+p.name);minus.addEventListener('click',()=>adjustQty(p.id,-1));const number=document.createElement('span');number.className='qty-no';number.textContent=p.qty;const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Agregar una unidad de '+p.name);plus.addEventListener('click',()=>adjustQty(p.id,1));qty.append(minus,number,plus);left.append(title,small,qty);const right=document.createElement('div');right.className='line-total';const price=document.createElement('div');price.textContent=money(p.price*p.qty);const remove=document.createElement('button');remove.type='button';remove.className='remove-item';remove.textContent='Eliminar';remove.addEventListener('click',()=>{delete cart[p.id];saveCart()});right.append(price,remove);row.append(left,right);root.append(row)}const checkout=$('#checkoutStart');if(checkout)checkout.disabled=!catalogReady||!lines.length}
let focusBeforeCart=null;
function openOverlay(type){if(type!=='cart')return;const backdrop=$('#dialogBackdrop'),panel=$('#cartPanel');focusBeforeCart=document.activeElement;backdrop.classList.add('open');document.body.style.overflow='hidden';panel.classList.add('open');panel.setAttribute('aria-hidden','false');$('#cartClose').focus()}
function closeOverlay(){const backdrop=$('#dialogBackdrop'),panel=$('#cartPanel');backdrop.classList.remove('open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');document.body.style.overflow='';$('#cartMain').classList.remove('hidden');if(focusBeforeCart?.isConnected)focusBeforeCart.focus()}
function setupUI(){document.querySelectorAll('[data-icon]').forEach(el=>{const name=el.dataset.icon;el.innerHTML=icon(name)});let saved;try{saved=localStorage.getItem(SETTINGS.themeKey)}catch{};setTheme(saved||document.documentElement.dataset.theme||'light');$('#themeToggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',true));$('#menuToggle').addEventListener('click',()=>{const isOpen=$('#mainNav').classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(isOpen))});document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{$('#mainNav').classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false')}));$('#cartOpen').addEventListener('click',()=>openOverlay('cart'));$('#accountOpen').addEventListener('click',()=>{window.location.href=$('#accountOpen').dataset.accountUrl||'cuenta.html'});$('#cartClose').addEventListener('click',closeOverlay);$('#dialogBackdrop').addEventListener('click',closeOverlay);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlay()});$('#checkoutStart').addEventListener('click',()=>{if(catalogReady&&cartLines().length)window.location.assign('pago.html')});$('#backTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));const progress=()=>{const max=document.documentElement.scrollHeight-innerHeight;$('#scrollMeter').style.width=(max>0?scrollY/max*100:0)+'%';$('#backTop').classList.toggle('show',scrollY>450)};addEventListener('scroll',progress,{passive:true});progress();$('#year').textContent=new Date().getFullYear();renderCart()}
function setTheme(mode,persist=false){document.documentElement.dataset.theme=mode==='dark'?'dark':'light';const b=$('#themeToggle');if(b){b.innerHTML=icon(mode==='dark'?'sun':'moon');b.setAttribute('aria-label',mode==='dark'?'Activar modo claro':'Activar modo oscuro')}if(persist){try{localStorage.setItem(SETTINGS.themeKey,mode)}catch{}}}
function setupReveals(){const nodes=[...document.querySelectorAll('.reveal')];if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver'in window)){nodes.forEach(node=>node.classList.add('in-view'));return}const obs=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)entry.target.classList.add('in-view');else entry.target.classList.remove('in-view')}},{rootMargin:'0px 0px -7% 0px',threshold:.08});nodes.forEach(node=>obs.observe(node))}

const COMMUNE_FALLBACK=["Antofagasta","Arica","Buin","Calama","Cerrillos","Cerro Navia","Chillán","Colina","Concón","Concepción","Coquimbo","Copiapó","Curicó","El Bosque","Estación Central","Hualpén","Huechuraba","Iquique","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Linares","Lo Barnechea","Lo Espejo","Lo Prado","Los Ángeles","Maipú","Melipilla","Ñuñoa","Osorno","Ovalle","Peñalolén","Providencia","Puente Alto","Pudahuel","Punta Arenas","Quilicura","Quillota","Quilpué","Quinta Normal","Rancagua","Recoleta","Renca","San Antonio","San Bernardo","San Felipe","San Joaquín","San Miguel","San Pedro de la Paz","San Ramón","Santiago","Talca","Talcahuano","Temuco","Valdivia","Valparaíso","Viña del Mar","Villa Alemana","Vitacura"];
function titleCase(value){return String(value||'').trim().toLocaleLowerCase('es-CL').replace(/(^|[\s-])([a-záéíóúñ])/g,(m,a,b)=>a+b.toLocaleUpperCase('es-CL'));}
async function setupQuoteHelpers(){
 const town=$('#quoteTown');const datalist=$('#comunasChile');if(town&&datalist){
  let names=[];
  const endpoints=['https://apis.modernizacion.cl/dpa/comunas','https://apis.digital.gob.cl/dpa/comunas'];
  for(const endpoint of endpoints){
   try{
    const response=await fetch(endpoint,{headers:{Accept:'application/json'}});
    if(!response.ok)continue;
    const payload=await response.json();
    const raw=Array.isArray(payload)?payload:payload&&Array.isArray(payload.data)?payload.data:[];
    names=raw.map(item=>titleCase(item?.nombre||item?.Nombre||item?.name||'')).filter(Boolean);
    if(names.length)break;
   }catch(err){}
  }
  if(!names.length)names=[...COMMUNE_FALLBACK];
  const unique=[...new Set(names)].sort((a,b)=>a.localeCompare(b,'es-CL'));
  datalist.replaceChildren(...unique.map(name=>{const option=document.createElement('option');option.value=name;return option}));
 }
}
function normalizePhoneForQuote(raw,countryCode){
 const code=String(countryCode||'+56').trim();
 let value=String(raw||'').trim();
 if(!value)return '';
 const digitsCode=code.replace(/\D/g,'');
 let digits=value.replace(/\D/g,'');
 if(digitsCode&&digits.startsWith(digitsCode)&&digits.length>digitsCode.length+6)digits=digits.slice(digitsCode.length);
 if(code==='+56'&&digits.startsWith('09'))digits=digits.slice(1);
 const readable=digits?digits.replace(/(\d{1,4})(?=\d)/g,'$1 ').trim():value.replace(/\s+/g,' ').trim();
 return (code+' '+readable).replace(/\s+/g,' ').trim();
}
function setupMailForms(){
 const chosen=new URLSearchParams(location.search).get('producto');
 const description=document.querySelector('#quoteDescription');if(description && chosen && /^[a-z0-9-]{3,50}$/.test(chosen) && !description.value)description.value='Quisiera confirmar compatibilidad y disponibilidad del producto código '+chosen+'.';
const quote=$('#quoteForm');
if(quote)quote.addEventListener('submit',async e=>{
 e.preventDefault();
 const status=$('#quoteStatus'), submit=quote.querySelector('button[type="submit"]');
 const cfg=window.SOLUCAR_AUTH_CONFIG||{};
 status.classList.remove('is-success','is-error');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||'')||!cfg.publishableKey){status.textContent='Servicio no configurado. Comunícate con contacto@solucarmas.cl.';status.classList.add('is-error');return;}
 const d=new FormData(quote);
 const phoneField=$('#quotePhone');
 const phoneCountry=$('#quotePhoneCountry');
 const fields=['nombre','correo','telefono','patente','comuna','necesidad'];
 const payload=Object.fromEntries(fields.map(k=>[k,String(d.get(k)||'').trim()]));
 payload.telefono=normalizePhoneForQuote(phoneField?phoneField.value:payload.telefono,phoneCountry?phoneCountry.value:'+56');
 if(phoneField)phoneField.value=payload.telefono;
 payload.comuna=titleCase(payload.comuna);
 payload.website=String(d.get('website')||'');
 payload.patente=payload.patente.toUpperCase().replace(/[^A-Z0-9]/g,'');if(/^[A-Z]{3}[0-9]{2}$/.test(payload.patente))payload.patente=payload.patente.slice(0,3)+'0'+payload.patente.slice(3);
 if(!/^[A-Z0-9]{6}$/.test(payload.patente)){
   status.textContent='Escribe una patente chilena válida de 6 caracteres (ejemplo: ABCD12 o AB1234).';status.classList.add('is-error');document.getElementById('quotePlate')?.focus();return;
 }
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.correo)){
   status.textContent='Revisa el correo electrónico.';status.classList.add('is-error');return;
 }
 // Abrir la pestaña desde el gesto del usuario evita bloqueos de ventanas emergentes.
 // La pestaña solo mostrará la confirmación tras una respuesta exitosa de Supabase.
 const confirmationUrl=new URL('cotizacion-recibida.html',location.href);
 let confirmationTab=null;
 try{confirmationTab=window.open(confirmationUrl.href,'_blank');}catch{}
 submit.disabled=true;status.textContent='Enviando solicitud y consultando datos básicos de la patente…';
 let timer;
 try{
   const controller=new AbortController();timer=setTimeout(()=>controller.abort(),23000);
   const url=cfg.url.replace(/\/$/,'')+'/functions/v1/enviar-cotizacion';
   const response=await fetch(url,{
     method:'POST',mode:'cors',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey},
     body:JSON.stringify(payload),signal:controller.signal
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||result.ok!==true){
     const defaultMsg=response.status===404?'La función enviar-cotizacion no está publicada en Supabase.':response.status===401||response.status===403?'La función está bloqueada por la configuración de autenticación (Verify JWT).':response.status===503?'Falta configurar Resend en las variables secretas de Supabase.':'El servidor no confirmó el envío (HTTP '+response.status+').';
     throw new Error(typeof result.error==='string'?result.error:defaultMsg);
   }
   // Solo se genera un comprobante visual si el backend confirmó la recepción.
   const receipt={reference:String(result.reference||'').slice(0,60),createdAt:Date.now()};
   const receiptKey='solucar-cotizacion-recibida-v20';
   let opened=false;
   if(confirmationTab && !confirmationTab.closed){
     try{
       confirmationTab.sessionStorage.setItem(receiptKey,JSON.stringify(receipt));
       confirmationTab.location.replace(confirmationUrl.href+'#recibida');
       confirmationTab.focus();
       opened=true;
     }catch(error){console.warn('No se pudo actualizar la pestaña de confirmación:',error);}
   }
   status.classList.add('is-success');
   status.textContent='¡Tu cotización ha sido recibida! '+(opened?'Se abrió la pestaña de confirmación.':'Tu navegador bloqueó la nueva pestaña; puedes abrir la confirmación aquí mismo.');
   quote.reset();
   if(!opened){
     try{
       sessionStorage.setItem(receiptKey,JSON.stringify(receipt));
       location.assign(confirmationUrl.href+'#recibida');
     }catch(error){
       status.textContent='¡Tu cotización ha sido recibida! Número de solicitud: '+(receipt.reference||'confirmado')+'. No se pudo abrir la pantalla independiente.';
     }
   }
 }catch(err){
   // Ante un error no mostrar jamás la pantalla de cotización recibida.
   if(confirmationTab && !confirmationTab.closed){try{confirmationTab.close()}catch{}}
   status.classList.add('is-error');
   const msg=err.name==='AbortError'?'Se agotó el tiempo de conexión. Antes de reintentar, comprueba si recibimos la solicitud.':err instanceof TypeError?'No se pudo conectar con el servidor de cotizaciones. Es posible que la función no esté desplegada, tenga un error CORS o que el navegador bloquee la conexión.':'No se pudo enviar: '+(err.message||'Error desconocido');
   status.textContent=msg+' No hemos confirmado el envío. Puedes comunicarte con contacto@solucarmas.cl.';
 }finally{clearTimeout(timer);submit.disabled=false;}
});
const contact=$('#contactForm');if(contact)contact.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(contact);$('#contactStatus').textContent='Se abrirá tu correo: debes confirmar el envío.';makeMail('SOLUCAR MÁS - '+d.get('motivo'),`Nombre: ${d.get('nombre')}\nCorreo: ${d.get('correo')}\nMotivo: ${d.get('motivo')}\n\n${d.get('mensaje')}`)});
}
function setupStore(){
 const grid=$('#productsGrid');if(!grid)return;
 let category='Todos',requestedProduct=new URLSearchParams(location.search).get('producto'),linkOpened=false;
 const search=$('#storeSearch'),dialog=$('#productDetail');
 const pById=id=>productList.find(p=>p.id===id);
 function showDetails(id){
  const p=pById(id);if(!p||!dialog)return;
  $('#productDetailCategory').textContent=p.category;
  $('#productDetailTitle').textContent=p.name;
  $('#productDetailCode').textContent='Código de catálogo: '+p.id+' · No equivale a código OEM';
  $('#productDetailDescription').textContent=p.details||'Consulta las características de este artículo antes de comprar.';
  $('#productDetailPrice').textContent=money(p.price);
  const photo=$('#productDetailPhoto');photo.src=photoForProduct(p);photo.alt='Imagen de '+p.name;
  $('#productDetailQuote').href='index.html?producto='+encodeURIComponent(p.id)+'#cotizar';
  const add=$('#productDetailAdd');add.disabled=!catalogReady;add.onclick=()=>{addToCart(p.id);dialog.close()};
  $('#productDetailShare').onclick=async()=>{
   const url=new URL('tienda.html',location.href);url.searchParams.set('producto',p.id);url.hash='catalogo';
   try{await navigator.clipboard.writeText(url.href);toast('Enlace del producto copiado')}
   catch{window.prompt('Copia el enlace del producto:',url.href)}
  };
  if(!dialog.open)dialog.showModal();
 }
 $('#productDetailClose')?.addEventListener('click',()=>dialog?.close());
 dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 function draw(){
  grid.replaceChildren();
  const count=$('#catalogCount'), empty=$('#noResults');
  if(!catalogReady){if(count)count.textContent='Consultando el catálogo actualizado…';if(empty)empty.hidden=true;return}
  const term=search.value.toLocaleLowerCase('es-CL').trim();
  const found=productList.filter(p=>(category==='Todos'||p.category===category)&&(`${p.name} ${p.category} ${p.details} ${p.id}`).toLocaleLowerCase('es-CL').includes(term));
  if(count)count.textContent=found.length===1?'1 producto encontrado':`${found.length} productos encontrados`;
  for(const p of found){
   const article=document.createElement('article');article.className='product-card reveal in-view';
   const top=document.createElement('div');top.className='product-image';
   const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.width=640;img.height=480;img.src=photoForProduct(p);img.alt='Imagen referencial de '+p.name;
   const label=document.createElement('span');label.className='product-label';label.textContent=p.imagePath?'Imagen de catálogo':'Imagen referencial';top.append(img,label);
   const content=document.createElement('div');content.className='product-content';
   const cat=document.createElement('span');cat.className='product-category';cat.textContent=p.category;
   const name=document.createElement('h3');name.textContent=p.name;
   const desc=document.createElement('p');desc.className='product-sub';desc.textContent=p.details||'Consulta las características y compatibilidad antes de comprar.';
   const bottom=document.createElement('div');bottom.className='product-bottom';
   const price=document.createElement('div');price.className='product-price';price.textContent=money(p.price);
   const small=document.createElement('small');small.textContent='Despacho no incluido · compatibilidad por confirmar';price.append(small);
   const add=document.createElement('button');add.type='button';add.disabled=!catalogReady;add.className='add-product';add.textContent='+';add.setAttribute('aria-label','Agregar al carrito: '+p.name);add.addEventListener('click',()=>addToCart(p.id));
   bottom.append(price,add);
   const detail=document.createElement('button');detail.type='button';detail.className='sm-product-more';detail.textContent='Ver detalles y compatibilidad';detail.addEventListener('click',()=>showDetails(p.id));
   content.append(cat,name,desc,bottom,detail);article.append(top,content);grid.append(article);
  }
  if(empty)empty.hidden=found.length>0;
  if(!linkOpened&&requestedProduct&&catalogReady){linkOpened=true;if(pById(requestedProduct)){showDetails(requestedProduct)}else{toast('El producto compartido ya no está disponible')}}
 }
 $('#productFilters').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-category]');if(!btn)return;
  category=btn.dataset.category;
  $('#productFilters').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
  draw();
 });
 search.addEventListener('input',draw);repaintStore=draw;draw();
}
document.addEventListener('DOMContentLoaded',()=>{setupUI();setupMailForms();setupStore();setupReveals();setupQuoteHelpers();loadEditableCatalog()});
