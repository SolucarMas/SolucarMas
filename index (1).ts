// SOLUCAR MÁS - Edge Function contacto (Supabase + Resend)
// Destino: contacto@solucarmas.cl
// Asunto identificador para filtro Gmail: tuntuncatapumbalachi
// Secrets: RESEND_API_KEY y CONTACT_FROM_EMAIL (o QUOTE_FROM_EMAIL).
const allowedOrigins = new Set(['https://solucarmas.cl', 'https://www.solucarmas.cl']);
const destination = 'contacto@solucarmas.cl';
const marker = 'tuntuncatapumbalachi';
function respond(data: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
      'Vary': 'Origin',
    },
  });
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch] || ch));
}
function field(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
}
Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.has(origin)) return new Response('Forbidden', { status: 403 });
  if (req.method === 'OPTIONS') return respond({ ok: true }, 200, origin);
  if (req.method !== 'POST') return respond({ok:false,error:'Método no permitido'},405,origin);
  if (Number(req.headers.get('content-length') || 0) > 16000) return respond({ok:false,error:'Solicitud demasiado extensa'},413,origin);
  let input: Record<string,unknown>;
  try {
    input = await req.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Formato inválido');
  } catch { return respond({ok:false,error:'Datos inválidos'},400,origin); }
  if (field(input.empresa_web, 100)) return respond({ok:true},200,origin);
  const nombre=field(input.nombre,100), correo=field(input.correo,254);
  const telefono=field(input.telefono,30), empresa=field(input.empresa,120);
  const motivo=field(input.motivo,80) || 'Consulta general';
  const mensaje=field(input.mensaje,3000);
  if (!nombre || nombre.length>100 || !correo || correo.length>254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    !mensaje || mensaje.length>3000 || telefono.length>30 || empresa.length>120 || motivo.length>80) {
    return respond({ok:false,error:'Revisa los campos del formulario'},400,origin);
  }
  const apiKey=Deno.env.get('RESEND_API_KEY');
  const from=Deno.env.get('CONTACT_FROM_EMAIL') || Deno.env.get('QUOTE_FROM_EMAIL');
  if (!apiKey || !from) return respond({ok:false,error:'Servicio de correo no configurado'},503,origin);
  const safeMotivo = motivo.replace(/[\r\n]/g,' ').slice(0,80);
  const subject=`[SOLUCAR MÁS] ${marker} | ${safeMotivo} | ${nombre.replace(/[\r\n]/g,' ')}`;
  const when = new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'full',timeStyle:'short'}).format(new Date());
  const items=[['Nombre',nombre],['Correo',correo],['Teléfono',telefono||'No indicado'],['Empresa',empresa||'No indicada'],['Motivo',motivo],['Fecha de recepción',when]];
  const details=items.map(([k,v])=>`<tr><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%">${escapeHtml(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a">${escapeHtml(v)}</td></tr>`).join('');
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="margin:0;padding:32px 12px;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><main style="max-width:640px;margin:auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0"><header style="background:#102a47;padding:28px;color:white"><div style="font-size:13px;font-weight:bold;letter-spacing:1.6px;color:#b9d8fa">SOLUCAR MÁS</div><h1 style="font-size:24px;margin:12px 0 0">Nueva consulta desde el sitio web</h1><p style="color:#dbeafe;margin:10px 0 0">${escapeHtml(safeMotivo)}</p></header><section style="padding:26px"><h2 style="font-size:16px;margin:0 0 12px">Datos del cliente</h2><table role="presentation" style="border-collapse:collapse;width:100%;font-size:14px">${details}</table><h2 style="font-size:16px;margin:27px 0 12px">Mensaje recibido</h2><div style="background:#f4f7fb;border-left:4px solid #2563eb;padding:18px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;font-size:14px">${escapeHtml(mensaje)}</div><p style="margin:22px 0 0;font-size:13px;color:#475569">Puedes responder directamente a este correo: la respuesta se dirigirá al correo proporcionado por el cliente.</p></section><footer style="padding:15px 26px;background:#eaf0f7;color:#475569;font-size:12px">Identificador de clasificación: ${marker}</footer></main></body></html>`;
  const plain=`SOLUCAR MÁS - NUEVA CONSULTA\nIdentificador: ${marker}\n\n${items.map(([k,v])=>`${k}: ${v}`).join('\n')}\n\nMENSAJE\n${mensaje}\n\nResponder a: ${correo}`;
  try {
    const r=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({from,to:[destination],reply_to:correo,subject,html,text:plain}),
    });
    if (!r.ok) {
      console.error('Resend contacto error',r.status,(await r.text()).slice(0,500));
      return respond({ok:false,error:'El servicio de correo no aceptó el envío'},502,origin);
    }
    return respond({ok:true},200,origin);
  } catch(e) {
    console.error('Error de red Resend',String(e));
    return respond({ok:false,error:'No fue posible confirmar el envío'},502,origin);
  }
});
