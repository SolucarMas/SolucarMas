/* SOLUCAR MÁS · estado de sesión sin añadir texto visible a la cabecera. */
'use strict';
(()=>{
 const cfg=window.SOLUCAR_AUTH_CONFIG||{};
 const button=document.getElementById('accountOpen');
 if(!button || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||'') || !cfg.publishableKey || !window.supabase?.createClient)return;
 const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 function paint(user){
   const verified=!!user?.email_confirmed_at;
   const first=verified?String(user.user_metadata?.full_name||user.email?.split('@')[0]||'cliente').trim().split(/\s+/)[0]:'';
   const label=verified?`Ver el perfil de ${first}`:'Iniciar sesión o crear cuenta';
   button.title=label;
   button.setAttribute('aria-label',label);
   button.classList.toggle('has-session',verified);
 }
 async function prefill(user){
   if(!user?.email_confirmed_at)return;
   try{
     const {data}=await client.from('customer_profiles').select('full_name,phone,comuna').eq('id',user.id).maybeSingle();
     if(!data)return;
     const fields=[['orderName',data.full_name],['orderEmail',user.email],['orderPhone',data.phone],['orderTown',data.comuna],['quoteName',data.full_name],['quoteEmail',user.email],['quotePhone',data.phone],['quoteTown',data.comuna]];
     for(const [id,value] of fields){const node=document.getElementById(id);if(node&&!node.value&&value)node.value=value}
   }catch(e){} // Una tabla no disponible no impide abrir la tienda.
 }
 client.auth.getSession().then(({data})=>{const user=data.session?.user;paint(user);prefill(user)}).catch(()=>paint(null));
 client.auth.onAuthStateChange((_event,session)=>{paint(session?.user)});
})();
