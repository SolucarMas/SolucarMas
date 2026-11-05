/* Panel SOLUCAR MÁS: permisos reales concedidos por RLS en Supabase, nunca por el correo del navegador. */
'use strict';
(async () => {
  const $=s=>document.querySelector(s), conf=window.SOLUCAR_AUTH_CONFIG||{};
  const login=$('#loginBox'),dashboard=$('#dashboard');
  const status=(sel,msg,error=false)=>{const node=$(sel);if(!node)return;node.textContent=msg;node.className='status '+(error?'error':msg?'good':'')};
  if(!window.supabase?.createClient||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(conf.url||'')||!conf.publishableKey){
    status('#loginStatus','No se encontró la configuración pública de Supabase. Comprueba supabase-config.js.',true);return;
  }
  const db=window.supabase.createClient(conf.url,conf.publishableKey,{auth:{autoRefreshToken:true,persistSession:true}});
  let products=[],editing=null,originalImage=null;
  const publicPhoto=path=>path ? conf.url.replace(/\/$/,'')+'/storage/v1/object/public/store-products/'+path.split('/').map(encodeURIComponent).join('/') : '';
  const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
  const cleanId=name=>name.toLocaleLowerCase('es-CL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36);
  const imageTypes=new Set(['image/jpeg','image/png','image/webp']);
  async function checkAccess(){
    const {data:{user},error}=await db.auth.getUser();
    if(error||!user){login.classList.remove('hidden');dashboard.classList.add('hidden');return}
    const {data:allowed,error:permissionError}=await db.rpc('is_store_admin');
    if(permissionError||allowed!==true){login.classList.remove('hidden');dashboard.classList.add('hidden');
      status('#loginStatus','Esta cuenta inició sesión, pero no tiene permisos de administración. Debe autorizarse su usuario en la tabla store_admins de Supabase.',true);return}
    login.classList.add('hidden');dashboard.classList.remove('hidden');$('#loggedUser').textContent=user.email||'Administrador';
    await loadProducts();
  }
  async function loadProducts(){
    status('#listStatus','Cargando catálogo…');
    const {data,error}=await db.from('store_products').select('id,name,category,details,price_clp,image_path,active,sort_order').order('sort_order',{ascending:true}).order('name',{ascending:true});
    if(error){status('#listStatus','No se pudo cargar el catálogo: '+error.message,true);return}
    products=data||[];draw();status('#listStatus','');
  }
  function draw(){
    const root=$('#productList');root.replaceChildren();
    $('#productCount').textContent=`${products.length} productos · ${products.filter(p=>p.active).length} visibles`;
    const search=($('#adminSearch')?.value||'').toLocaleLowerCase('es-CL').trim();
    const activeOnly=!!$('#adminActiveOnly')?.checked;
    const visible=products.filter(p=>(!activeOnly||p.active)&&(`${p.name} ${p.category} ${p.id} ${p.details||''}`).toLocaleLowerCase('es-CL').includes(search));
    if(!visible.length){const msg=document.createElement('p');msg.textContent='No hay productos que coincidan con los filtros.';root.append(msg);}
    for(const p of visible){
      const item=document.createElement('article');item.className='item';
      const image=document.createElement('img');image.alt='Imagen de '+p.name;
      image.src=publicPhoto(p.image_path)||'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150"><rect width="180" height="150" fill="#e9edf2"/><text x="90" y="78" text-anchor="middle" font-family="Arial" font-size="14" fill="#55677b">Foto actual / referencia</text></svg>');
      const details=document.createElement('div');
      const title=document.createElement('div');title.className='item-title';title.textContent=p.name;
      const meta=document.createElement('p');meta.className='item-meta';meta.textContent=`${p.category} · ${money(p.price_clp)} · ${p.active?'Visible':'Oculto'}`;
      details.append(title,meta);
      const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.className='secondary';edit.addEventListener('click',()=>openEditor(p));
      const actions=document.createElement('div');actions.className='item-actions';
      actions.append(edit);
      const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';toggle.textContent=p.active?'Ocultar':'Publicar';
      toggle.setAttribute('aria-label',(p.active?'Ocultar':'Publicar')+' producto '+p.name);
      toggle.addEventListener('click',()=>toggleVisibility(p,toggle));actions.append(toggle);
      const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Eliminar';
      remove.setAttribute('aria-label','Eliminar producto '+p.name);
      remove.addEventListener('click',()=>deleteProduct(p,remove));
      actions.append(remove);
      item.append(image,details,actions);root.append(item);
    }
  }
  // Cambiar visibilidad sin borrar el registro ni las fotos; RLS exige administración autorizada.
  async function toggleVisibility(product,button){
    button.disabled=true;
    const next=!product.active;
    status('#listStatus',(next?'Publicando':'Ocultando')+' «'+product.name+'»…');
    try{
      const {data,error}=await db.from('store_products').update({active:next,updated_at:new Date().toISOString()})
        .eq('id',product.id).select('id,active');
      if(error)throw error;
      if(!data?.length)throw Error('No se modificó el producto. Revisa la política RLS.');
      await loadProducts();
      status('#listStatus','«'+product.name+'» '+(next?'aparece':'ya no aparece')+' en la tienda.');
    }catch(err){status('#listStatus','Error: '+(err.message||'No se pudo actualizar.'),true)}
    finally{button.disabled=false}
  }
  // Borrado real del catálogo, con autorización RLS. Los pedidos anteriores
  // conservan una instantánea de los productos comprados (webpay_orders.items).
  async function deleteProduct(product,button){
    const name=product.name;
    if(!confirm(`¿Eliminar definitivamente «${name}» de la tienda?\n\nDejará de aparecer en el catálogo y no podrá comprarse. Esta acción no se puede deshacer.`))return;
    button.disabled=true;
    status('#listStatus','Eliminando «'+name+'»…');
    try{
      const {data,error}=await db.from('store_products').delete().eq('id',product.id).select('id');
      if(error)throw error;
      if(!data?.length)throw Error('No se pudo eliminar. Verifica que la cuenta tenga permiso de eliminación en Supabase.');
      if(editing===product.id){editing=null;originalImage=null;$('#productEditor').classList.add('hidden');}
      await loadProducts();
      status('#listStatus','«'+name+'» fue eliminado del catálogo. Las compras anteriores permanecen registradas.');
    }catch(err){status('#listStatus','No se pudo eliminar: '+(err.message||'Error desconocido'),true);}
    finally{button.disabled=false;}
  }
  function openEditor(product=null){
    editing=product?.id||null;originalImage=product?.image_path||null;
    $('#editorTitle').textContent=product?'Editar producto':'Nuevo producto';
    $('#productId').value=product?.id||'';$('#productName').value=product?.name||'';
    $('#productCategory').value=product?.category||'Accesorios';$('#productPrice').value=product?.price_clp??'';
    $('#productDetails').value=product?.details||'';$('#productSort').value=product?.sort_order??(products.length+1)*10;
    $('#productActive').checked=product?.active??true;$('#productPhoto').value='';
    const photo=$('#productPreview');photo.src=publicPhoto(originalImage)||'';photo.classList.toggle('hidden',!originalImage);
    status('#editStatus','');$('#productEditor').classList.remove('hidden');$('#productEditor').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function save(event){
    event.preventDefault();
    const name=$('#productName').value.trim(), category=$('#productCategory').value.trim();
    const price=Number($('#productPrice').value), sort=Number($('#productSort').value);
    if(name.length<3||category.length<2||!Number.isInteger(price)||price<1||price>5000000||!Number.isInteger(sort)){
      status('#editStatus','Revisa nombre, categoría, precio y orden.',true);return}
    const id=editing||(`${cleanId(name)||'producto'}-${crypto.randomUUID().slice(0,6)}`);
    if(id.length>50||!/^[a-z0-9-]{3,50}$/.test(id))return status('#editStatus','El identificador generado no es válido.',true);
    const file=$('#productPhoto').files[0];
    if(file&&(!imageTypes.has(file.type)||file.size>5*1024*1024))return status('#editStatus','Solo imágenes JPG, PNG o WebP de hasta 5 MB.',true);
    const button=$('#saveBtn');button.disabled=true;status('#editStatus','Guardando…');
    try{
      let path=originalImage;
      if(file){
        const suffix=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
        const objectKey=`${id}/${crypto.randomUUID()}.${suffix}`;
        const {error:uploadError}=await db.storage.from('store-products').upload(objectKey,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
        if(uploadError)throw Error('No se pudo subir la fotografía: '+uploadError.message);
        path=objectKey;
      }
      const row={id,name,category,details:$('#productDetails').value.trim(),price_clp:price,image_path:path,
        active:$('#productActive').checked,sort_order:sort,updated_at:new Date().toISOString()};
      const {error}=await db.from('store_products').upsert(row,{onConflict:'id'});
      if(error)throw Error(error.message);
      status('#editStatus','Producto guardado. El catálogo público se actualizará cuando los clientes recarguen la tienda.');
      editing=id;originalImage=path;$('#productId').value=id;
      await loadProducts();
    }catch(err){status('#editStatus',err.message||'No se pudo guardar el producto.',true)}
    finally{button.disabled=false}
  }
  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;
    status('#loginStatus','Comprobando credenciales…');
    const {error}=await db.auth.signInWithPassword({email:$('#adminEmail').value.trim(),password:$('#adminPassword').value});
    button.disabled=false;
    if(error)return status('#loginStatus','No se pudo iniciar sesión: '+error.message,true);
    $('#adminPassword').value='';await checkAccess();
  });
  $('#logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();dashboard.classList.add('hidden');login.classList.remove('hidden');status('#loginStatus','Sesión cerrada.');});
  $('#adminSearch')?.addEventListener('input',draw);
  $('#adminActiveOnly')?.addEventListener('change',draw);
  $('#newBtn').addEventListener('click',()=>openEditor());
  $('#cancelBtn').addEventListener('click',()=>$('#productEditor').classList.add('hidden'));
  $('#productForm').addEventListener('submit',save);
  $('#productPhoto').addEventListener('change',()=>{
    const file=$('#productPhoto').files[0],preview=$('#productPreview');
    if(!file){preview.src=publicPhoto(originalImage)||'';preview.classList.toggle('hidden',!originalImage);return}
    if(!imageTypes.has(file.type)||file.size>5*1024*1024){status('#editStatus','Archivo inválido: usa JPG, PNG o WebP hasta 5 MB.',true);$('#productPhoto').value='';return}
    preview.src=URL.createObjectURL(file);preview.classList.remove('hidden');
  });
  $('#resetPhotoBtn').addEventListener('click',()=>{$('#productPhoto').value='';const preview=$('#productPreview');preview.src=publicPhoto(originalImage)||'';preview.classList.toggle('hidden',!originalImage)});
  await checkAccess();
})();
