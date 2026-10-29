// SOLUCAR MÁS · Supabase Edge Function: enviar-cotizacion
// Secretos REQUERIDOS: RESEND_API_KEY y QUOTE_FROM_EMAIL.
// Opcional: GETAPI_API_KEY (proveedor GetAPI para enriquecer cotizaciones por patente).
// La clave de consulta permanece solo en Supabase; nunca publicarla en GitHub.
// El dominio del remitente debe estar verificado en Resend.
const allowedOrigins = new Set(['https://solucarmas.cl','https://www.solucarmas.cl']);
const labels = ['nombre','correo','telefono','patente','comuna','necesidad'] as const;
const titles = ['Nombre y apellido','Correo electrónico','Teléfono','Patente','Comuna','Necesidad / descripción'];
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
// SOLO datos técnicos útiles para cotizar repuestos. No pedir ni guardar datos del propietario.
type VehicleResult={ estado:string; datos:Record<string,string> };
const cleanField=(value:unknown,max=100):string=>typeof value==='string'||typeof value==='number'
  ? String(value).trim().slice(0,max):'';
async function lookupVehicle(plate:string):Promise<VehicleResult>{
  const key=Deno.env.get('GETAPI_API_KEY');
  if(!key)return {estado:'Sin consulta automática (clave GETAPI_API_KEY no configurada)',datos:{}};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8500);
  try{
    const response=await fetch('https://chile.getapi.cl/v1/vehicles/plate/'+encodeURIComponent(plate),{
      method:'GET',headers:{'x-api-key':key,'Accept':'application/json'},signal:controller.signal
    });
    if(response.status===404)return {estado:'Patente no encontrada por el proveedor',datos:{}};
    if(response.status===429)return {estado:'Proveedor temporalmente limitado; pendiente de verificación',datos:{}};
    if(!response.ok){console.error('GetAPI status',response.status);return {estado:'Proveedor no disponible; pendiente de verificación',datos:{}};}
    const jsonBody=await response.json();
    const v=jsonBody?.data;
    if(!v||typeof v!=='object'||Array.isArray(v))return {estado:'El proveedor no devolvió datos del vehículo',datos:{}};
    // Esquema según documentación GetAPI: data.model.brand.name, data.model.name, data.year, etc.
    const pairs:[string,unknown][]=[
      ['Marca',v.model?.brand?.name],['Modelo',v.model?.name],['Año',v.year],
      ['Tipo de vehículo',v.model?.typeVehicle?.name],['Versión',v.version],
      ['Combustible',v.fuel],['Motor',v.engine],['Color',v.color],
      ['Transmisión',v.transmission],['VIN/chasis',v.vinNumber]
    ];
    const datos=Object.fromEntries(pairs.map(([k,val])=>[k,cleanField(val)]).filter(([,val])=>Boolean(val)));
    return Object.keys(datos).length?{estado:'Consultado con GetAPI (datos referenciales)',datos}
      :{estado:'Sin características disponibles en GetAPI',datos:{}};
  }catch(error){console.error('GetAPI consulta falló',String(error));return {estado:'Consulta no disponible; pendiente de verificación',datos:{}};}
  finally{clearTimeout(timeout)}
}
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
  if(input.website)return json({ok:true,reference:'RECIBIDA'},200,cors); // Honeypot: bots, no envía correo.
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
  // Consultamos únicamente la patente; la información retornada NO identifica al propietario.
  // Si la API no responde, la cotización se envía de todos modos con la patente.
  const vehicle=await lookupVehicle(data.patente);
  const rows=[['Referencia',reference],['Fecha y hora (UTC)',now.toISOString()],
    ...labels.map((k,i)=>[titles[i],data[k]]),
    ['Consulta de datos del vehículo',vehicle.estado],
    ...Object.entries(vehicle.datos).map(([key,value])=>['Vehículo · '+key,value])
  ];
  const csv='\uFEFF' + rows.map(r=>r.map(safeCSV).join(';')).join('\r\n')+'\r\n';
  const attachment=toBase64(new TextEncoder().encode(csv));
  const tr=rows.map(([label,value])=>`<tr><td style="padding:10px;border-bottom:1px solid #e0e7f0"><strong>${htmlEscape(label)}</strong></td><td style="padding:10px;border-bottom:1px solid #e0e7f0;white-space:pre-wrap">${htmlEscape(value)}</td></tr>`).join('');
  const mail={
    from, to:['contacto@solucarmas.cl'],reply_to:data.correo,
    subject:`Nueva cotización SOLUCAR MÁS · ${reference}`,
    html:`<div style="font-family:Arial,sans-serif;color:#10223a"><h1 style="color:#153c70">SOLUCAR <span style="color:#dc2436">MÁS</span></h1><h2>Nueva solicitud de cotización</h2><p>Un cliente solicitó una cotización indicando su patente. Se adjunta la planilla CSV para abrir en Excel. Los datos técnicos del vehículo, si aparecen, provienen de GetAPI y son referenciales; verifica compatibilidad antes de cotizar. Si la consulta no está disponible, confirma los datos con el cliente. Puedes consultar manualmente la patente en https://patenteschile.cl/.</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:750px">${tr}</table><p>Responde a este correo para contactar al cliente.</p></div>`,
    text:rows.map(([k,v])=>k+': '+v).join('\n')+'\n\nConsulta manual referencial: https://patenteschile.cl/',
    attachments:[{filename:`cotizacion-${reference}.csv`,content:attachment}]
  };
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(mail)});
    if(!response.ok){console.error('Resend error:',response.status,await response.text());return json({ok:false,error:'El servicio de correo rechazó la solicitud. Inténtalo más tarde.'},502,cors)}
    // Confirmación independiente al cliente: solo después de que Resend acepte el correo interno.
    // Si el mensaje al cliente falla, la cotización sigue recibida y se registra el fallo.
    let customer_email_sent=false;
    try {
      const firstName=htmlEscape(data.nombre.split(/\s+/)[0]||'');
      const confirmation={
        from,
        to:[data.correo],
        reply_to:'contacto@solucarmas.cl',
        subject:`SOLUCAR MÁS | Tu solicitud ha sido confirmada · ${reference}`,
        html:`<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="margin:0;background:#f1f4f8;font-family:Arial,Helvetica,sans-serif;color:#0d2036"><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f4f8;padding:30px 12px"><tr><td align="center"><table width="580" role="presentation" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#091b30;padding:26px 30px;color:#fff;font-size:24px;font-weight:800">SOLUCAR <span style="color:#ec283b">MÁS</span><div style="font-size:11px;letter-spacing:1.4px;color:#c9d6e5;padding-top:6px">SOLUCIONES AUTOMOTRICES</div></td></tr><tr><td style="padding:34px 30px"><div style="color:#1671d1;font-size:12px;font-weight:800;letter-spacing:1px">SOLICITUD RECIBIDA</div><h1 style="font-size:28px;line-height:1.2;color:#10233c;margin:14px 0 16px">Tu solicitud ha sido confirmada.</h1><p style="font-size:16px;line-height:1.7">Hola ${firstName},</p><p style="line-height:1.7;color:#4b5c70">Recibimos correctamente tu solicitud de cotización. Nuestro equipo revisará la información de tu vehículo y los repuestos o insumos que necesitas para responderte a la brevedad.</p><table width="100%" cellpadding="12" cellspacing="0" role="presentation" style="background:#f3f6fa;border-radius:10px;margin:24px 0"><tr><td style="font-size:13px;color:#52657a">Número de solicitud</td><td style="font-size:14px;font-weight:bold;text-align:right;color:#142b48">${htmlEscape(reference)}</td></tr><tr><td style="font-size:13px;color:#52657a">Patente</td><td style="font-size:14px;font-weight:bold;text-align:right;color:#142b48">${htmlEscape(data.patente)}</td></tr></table><p style="line-height:1.7;color:#4b5c70">Esta confirmación acredita la recepción de la solicitud, <strong>no la disponibilidad ni el precio final</strong> de los productos.</p><p style="line-height:1.7;color:#4b5c70">¿Necesitas complementar tu solicitud? Escríbenos a <a href="mailto:contacto@solucarmas.cl" style="color:#145fb5">contacto@solucarmas.cl</a> e indica tu número de solicitud.</p></td></tr><tr><td style="background:#091b30;color:#d6e2ef;text-align:center;font-size:12px;padding:20px">SOLUCAR MÁS · Soluciones automotrices · <a href="https://solucarmas.cl" style="color:#fff">solucarmas.cl</a></td></tr></table></td></tr></table></body></html>`,
        text:`Tu solicitud ha sido confirmada.\n\nHola ${data.nombre},\nRecibimos correctamente tu solicitud de cotización. Nuestro equipo revisará los datos y te responderá a la brevedad.\n\nN° de solicitud: ${reference}\nPatente: ${data.patente}\n\nLa recepción no implica confirmación de precios o disponibilidad.\nContacto: contacto@solucarmas.cl`
      };
      const clientResponse=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(confirmation)
      });
      customer_email_sent=clientResponse.ok;
      if(!customer_email_sent)console.error('Confirmación cliente rechazada:',clientResponse.status,await clientResponse.text());
    }catch(customerError){console.error('No se pudo enviar confirmación al cliente:',customerError)}
    return json({ok:true,reference,customer_email_sent,vehicle_lookup:vehicle.estado},200,cors);
  }catch(error){console.error('Error de envío:',error);return json({ok:false,error:'No fue posible conectar con el servicio de correo.'},502,cors)}
});
