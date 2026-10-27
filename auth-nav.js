/* Personalización ligera de la cabecera. No se almacenan credenciales aquí. */
'use strict';
(()=>{
  const cfg=window.SOLUCAR_AUTH_CONFIG||{};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||'') || !window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const button=document.getElementById('accountOpen');
  const link=document.querySelector('.main-nav a[href="cuenta.html"]');
  if(!button && !link)return;
  function paint(user){const isVerified=!!user?.email_confirmed_at;const text=isVerified ? `Hola, ${String(user.user_metadata?.full_name||user.email?.split('@')[0]||'cliente').trim().split(/\s+/)[0]}` : 'Mi cuenta';if(link)link.textContent=text;if(button){button.setAttribute('aria-label',isVerified?`Ver la cuenta de ${text}`:'Iniciar sesión o ver mi cuenta');button.title=text;let tag=button.querySelector('.auth-nav-greeting');if(!tag){tag=document.createElement('span');tag.className='auth-nav-greeting';button.append(tag)}tag.textContent=isVerified?text:''}}
  async function prefill(user){if(!user?.email_confirmed_at)return;try{const {data}=await client.from('customer_profiles').select('full_name,phone,comuna').eq('id',user.id).maybeSingle();if(!data)return;const pairs=[['orderName',data.full_name],['orderEmail',user.email],['orderPhone',data.phone],['orderTown',data.comuna],['quoteName',data.full_name],['quoteEmail',user.email],['quotePhone',data.phone],['quoteTown',data.comuna]];for(const [id,value] of pairs){const el=document.getElementById(id);if(el && !el.value && value)el.value=value}}catch{}}
  client.auth.getSession().then(({data})=>{const user=data.session?.user;paint(user);prefill(user)}).catch(()=>{});
  client.auth.onAuthStateChange((event,session)=>{paint(session?.user)});
})();
