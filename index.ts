// SOLUCAR MÁS · Supabase Edge Function: enviar-cotizacion
// Secretos REQUERIDOS en Supabase: RESEND_API_KEY y QUOTE_FROM_EMAIL.
// El dominio del remitente debe estar verificado en Resend.
const allowedOrigins = new Set(['https://solucarmas.cl','https://www.solucarmas.cl']);
const labels = ['nombre','correo','telefono','tipo','marca','modelo','patente','anio','comuna','necesidad'] as const;
const titles = ['Nombre y apellido','Correo electrónico','Teléfono','Tipo de vehículo','Marca','Modelo','Patente','Año','Comuna','Necesidad / descripción'];
const json=(data:unknown,status=200,origin='https://solucarmas.cl')=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'Access-Control-Allow-Origin':origin,'Vary':'Origin',
  'Access-Control-Allow-Headers':'content-type, apikey, authorization, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods':'POST, OPTIONS'}});
const htmlEscape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const safeCSV=(v:string)=>{
  // Evita inyección de fórmulas al abrir CSV en Excel/LibreOffice.
  const normalized=v.replace(/\r\n?/g,'\n');
  const val=/^\s*[=+@\-\t\r]/.test(normalized)?"'"+normalized:normalized;
  return '"'+val.replace(/"/g,'""')+'"';
};
const toBase64=(bytes:Uint8Array)=>{
  let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(out);
};
Deno.serve(async(req)=>{
  const origin=req.headers.get('origin')||'';
  if(origin&&!allowedOrigins.has(origin))return json({ok:false,error:'Origen no autorizado.'},403,'https://solucarmas.cl');
  const cors=origin||'https://solucarmas.cl';
  if(req.method==='OPTIONS')return json({},200,cors);
  if(req.method==='GET')return json({ok:true,service:'enviar-cotizacion',configured:Boolean(Deno.env.get('RESEND_API_KEY')&&Deno.env.get('QUOTE_FROM_EMAIL'))},200,cors);
  if(req.method!=='POST')return json({ok:false,error:'Método no permitido.'},405,cors);
  if(Number(req.headers.get('content-length')||0)>16000)return json({ok:false,error:'Solicitud demasiado grande.'},413,cors);
  let input:Record<string,unknown>;
  try{input=await req.json();if(!input||typeof input!=='object'||Array.isArray(input))throw Error()}catch{return json({ok:false,error:'Solicitud inválida.'},400,cors)}
  if(input.website)return json({ok:true,reference:'RECIBIDA'},200,cors); // Campo trampa para bots.
  const data:Record<string,string>={};
  for(const key of labels){if(typeof input[key]!=='string')return json({ok:false,error:'Los datos de la cotización están incompletos.'},400,cors);data[key]=(input[key] as string).trim()}
  if(!data.nombre||!data.correo||!data.telefono||!data.patente||!data.necesidad)return json({ok:false,error:'Completa nombre, correo, teléfono, patente y descripción.'},400,cors);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)||data.correo.length>254)return json({ok:false,error:'Correo inválido.'},400,cors);
  if(!/^[\d +()\-.]{7,25}$/.test(data.telefono))return json({ok:false,error:'Teléfono inválido.'},400,cors);
  data.patente=data.patente.toUpperCase().replace(/\s+/g,'');
  if(!/^[A-Z0-9-]{5,12}$/.test(data.patente))return json({ok:false,error:'La patente indicada no tiene un formato válido.'},400,cors);
  for(const key of labels){if(data[key].length>(key==='necesidad'?2000:160))return json({ok:false,error:'Uno de los campos supera el límite permitido.'},400,cors)}
  // Protección opcional recomendada para producción: Cloudflare Turnstile (si se configura, es obligatoria).
  const turnstileSecret=Deno.env.get('TURNSTILE_SECRET_KEY');
  if(turnstileSecret){
    if(typeof input.turnstileToken!=='string'||!input.turnstileToken)return json({ok:false,error:'Completa la verificación antispam.'},400,cors);
    const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:turnstileSecret,response:input.turnstileToken})});
    const result=await check.json();if(!result.success)return json({ok:false,error:'No se pudo validar la verificación antispam.'},403,cors);
  }
  const apiKey=Deno.env.get('RESEND_API_KEY');const from=Deno.env.get('QUOTE_FROM_EMAIL');
  if(!apiKey||!from)return json({ok:false,error:'Falta configurar el servicio de correo en Supabase.'},503,cors);
  const now=new Date();const reference='COT-'+now.toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'-'+crypto.randomUUID().slice(0,6).toUpperCase();
  const rows=[['Referencia',reference],['Fecha y hora (UTC)',now.toISOString()],...labels.map((k,i)=>[titles[i],data[k]])];
  const csv='\uFEFF' + rows.map(r=>r.map(safeCSV).join(';')).join('\r\n')+'\r\n';
  const attachment=toBase64(new TextEncoder().encode(csv));
  const tr=rows.map(([label,value])=>`<tr><td style="padding:10px;border-bottom:1px solid #e0e7f0"><strong>${htmlEscape(label)}</strong></td><td style="padding:10px;border-bottom:1px solid #e0e7f0;white-space:pre-wrap">${htmlEscape(value)}</td></tr>`).join('');
  const mail={
    from, to:['contacto@solucarmas.cl'],reply_to:data.correo,
    subject:`Nueva cotización SOLUCAR MÁS · ${reference}`,
    html:`<div style="font-family:Arial,sans-serif;color:#10223a"><h1 style="color:#153c70">SOLUCAR <span style="color:#dc2436">MÁS</span></h1><h2>Nueva solicitud de cotización</h2><p>Un cliente completó el formulario de tu sitio web. Se adjunta la planilla CSV para abrir en Excel.</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:750px">${tr}</table><p>Responde a este correo para contactar al cliente.</p></div>`,
    text:rows.map(([k,v])=>k+': '+v).join('\n'),
    attachments:[{filename:`cotizacion-${reference}.csv`,content:attachment}]
  };
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(mail)});
    if(!response.ok){console.error('Resend error:',response.status,await response.text());return json({ok:false,error:'El servicio de correo rechazó la solicitud. Inténtalo más tarde.'},502,cors)}
    return json({ok:true,reference},200,cors);
  }catch(error){console.error('Error de envío:',error);return json({ok:false,error:'No fue posible conectar con el servicio de correo.'},502,cors)}
});
