// SOLUCAR MÁS | Webpay Plus (Transbank API v1.2)
// Supabase Edge Function pública: desplegar con --no-verify-jwt para aceptar el retorno de Transbank.
// La llave de producción y la service_role nunca se envían al navegador.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Item = { id: string; nombre: string; cantidad: number; precio: number; subtotal: number };
type Order = {
  id: string; buy_order: string; session_id: string; token_ws: string | null;
  amount_clp: number; status: string; items: Item[];
};
const CATALOG: Record<string, { name: string; price: number }> = {
  'filter-oil': { name: 'Filtro de aceite universal', price: 8900 },
  'filter-air': { name: 'Filtro de aire para motor', price: 12900 },
  'oil-5w30': { name: 'Aceite de motor sintético 5W-30 · 4 L', price: 29900 },
  'oil-15w40': { name: 'Aceite multigrado 15W-40 · 4 L', price: 25900 },
  pads: { name: 'Pastillas de freno delanteras', price: 27900 },
  bulb: { name: 'Ampolleta halógena H7', price: 6900 },
  wipers: { name: 'Limpiaparabrisas · unidad', price: 9900 },
  coolant: { name: 'Refrigerante de motor · 1 L', price: 7500 },
};
const env = (name: string) => Deno.env.get(name)?.trim() || '';
const site = env('WEBPAY_SITE_URL') || 'https://solucarmas.cl';
const siteOrigin = new URL(site).origin;
const supabaseUrl = env('SUPABASE_URL');
const supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY');
const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
const environment = env('WEBPAY_ENV') === 'production' ? 'production' : 'integration';
const host = environment === 'production'
  ? 'https://webpay3g.transbank.cl'
  : 'https://webpay3gint.transbank.cl';
const transactionUrl = `${host}/rswebpaytransaction/api/webpay/v1.2/transactions`;
const commerceCode = env('WEBPAY_COMMERCE_CODE');
const apiKey = env('WEBPAY_API_KEY');
const headersTBK = {
  'Tbk-Api-Key-Id': commerceCode,
  'Tbk-Api-Key-Secret': apiKey,
  'Content-Type': 'application/json',
};
const json = (data: unknown, status = 200, extra: HeadersInit = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
});
const allowedOrigins = new Set([siteOrigin, 'https://www.solucarmas.cl']);
if (environment !== 'production') { allowedOrigins.add('http://localhost:5500'); allowedOrigins.add('http://127.0.0.1:5500'); }
const cors = (request: Request): HeadersInit => {
  const origin = request.headers.get('origin') || '';
  return allowedOrigins.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info', Vary: 'Origin' }
    : { Vary: 'Origin' };
};
const uuidOk = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const tokenOk = (s: string) => /^[a-zA-Z0-9._-]{20,256}$/.test(s);
const orderOk = (s: string) => /^[a-zA-Z0-9-]{5,26}$/.test(s);
const plain = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const approved = (result: Record<string, unknown>, row: Order) =>
  result.status === 'AUTHORIZED' && result.response_code === 0 &&
  result.buy_order === row.buy_order && result.session_id === row.session_id &&
  Number(result.amount) === row.amount_clp;
const responseSubset = (r: Record<string, unknown>) => ({
  status: r.status, response_code: r.response_code, buy_order: r.buy_order,
  session_id: r.session_id, amount: r.amount, authorization_code: r.authorization_code,
  transaction_date: r.transaction_date, payment_type_code: r.payment_type_code,
  installments_number: r.installments_number, vci: r.vci,
  // Los únicos dígitos de tarjeta admitidos son los últimos que entregue Transbank (dato enmascarado).
  card_detail: { card_number: (r.card_detail as Record<string, unknown> | undefined)?.card_number ?? null },
});
async function tbk(method: string, url: string, payload?: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const res = await fetch(url, {
      method, headers: headersTBK, body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Transbank HTTP ${res.status}`);
    return body as Record<string, unknown>;
  } finally { clearTimeout(timeout); }
}
async function fetchOrder(column: 'id' | 'token_ws' | 'buy_order', value: string): Promise<Order | null> {
  const { data, error } = await admin.from('webpay_orders').select('id,buy_order,session_id,token_ws,amount_clp,status,items').eq(column, value).maybeSingle();
  if (error) throw error;
  return (data as Order | null);
}
async function updateOrder(id: string, values: Record<string, unknown>) {
  const { error } = await admin.from('webpay_orders').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
function landing(orderId?: string, error?: string): Response {
  const url = new URL('pago-resultado.html', siteOrigin + '/');
  if (orderId) url.searchParams.set('pedido', orderId);
  else url.searchParams.set('error', error || 'no-reconocido');
  return new Response(null, { status: 303, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
}
async function start(req: Request): Promise<Response> {
  const responseHeaders = cors(req);
  if (!allowedOrigins.has(req.headers.get('origin') || '')) return json({ ok: false, error: 'Origen no autorizado.' }, 403, responseHeaders);
  if (!commerceCode || !apiKey) return json({ ok: false, error: 'El comercio aún no configuró las credenciales de Webpay.' }, 503, responseHeaders);
  // Protección intencional: los precios actuales son ilustrativos y NO están confirmados como precios comerciales.
  if (environment === 'production' && env('WEBPAY_CATALOG_READY') !== 'true')
    return json({ ok: false, error: 'La tienda aún debe confirmar precios, stock y condiciones de despacho antes de activar cobros reales.' }, 503, responseHeaders);
  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ ok: false, error: 'Solicitud inválida.' }, 400, responseHeaders); }
  const customer = (payload.customer && typeof payload.customer === 'object') ? payload.customer as Record<string, unknown> : {};
  const buyer = {
    nombre: plain(customer.nombre, 100), correo: plain(customer.correo, 160),
    telefono: plain(customer.telefono, 40), comuna: plain(customer.comuna, 110),
    notas: plain(customer.notas, 1200),
  };
  if (buyer.nombre.length < 4 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.correo)
      || buyer.telefono.length < 7 || buyer.comuna.length < 2)
    return json({ ok: false, error: 'Completa tus datos de contacto correctamente.' }, 400, responseHeaders);
  if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 8)
    return json({ ok: false, error: 'Carrito inválido.' }, 400, responseHeaders);
  const ids = new Set<string>();
  const items: Item[] = [];
  for (const raw of payload.items) {
    if (!raw || typeof raw !== 'object') return json({ ok: false, error: 'Producto inválido.' }, 400, responseHeaders);
    const data = raw as Record<string, unknown>;
    const id = typeof data.id === 'string' ? data.id : '';
    const qty = data.qty;
    if (!CATALOG[id] || ids.has(id) || !Number.isInteger(qty) || Number(qty) < 1 || Number(qty) > 20)
      return json({ ok: false, error: 'Revisa los productos y cantidades.' }, 400, responseHeaders);
    ids.add(id);
    items.push({ id, nombre: CATALOG[id].name, cantidad: Number(qty), precio: CATALOG[id].price, subtotal: Number(qty) * CATALOG[id].price });
  }
  const amount = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (amount <= 0 || amount > 5000000) return json({ ok: false, error: 'Monto de compra no permitido.' }, 400, responseHeaders);
  const buyOrder = `SM${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  const sessionId = crypto.randomUUID();
  const { data, error } = await admin.from('webpay_orders')
    .insert({ buy_order: buyOrder, session_id: sessionId, amount_clp: amount,
      customer: buyer, items, status: 'creating', environment })
    .select('id').single();
  if (error || !data?.id) return json({ ok: false, error: 'No se pudo registrar el pedido.' }, 503, responseHeaders);
  try {
    const returnUrl = `${supabaseUrl}/functions/v1/webpay?accion=retorno`;
    const payment = await tbk('POST', transactionUrl, {
      buy_order: buyOrder, session_id: sessionId, amount, return_url: returnUrl,
    });
    const token = String(payment.token ?? '');
    const url = String(payment.url ?? '');
    if (!tokenOk(token) || !url.startsWith(`${host}/`)) throw new Error('Respuesta de Transbank inválida');
    await updateOrder(data.id, { token_ws: token, status: 'pending' });
    return json({ ok: true, url, token, pedido: data.id }, 200, responseHeaders);
  } catch (e) {
    console.error('webpay iniciar:', e);
    await updateOrder(data.id, { status: 'failed' });
    return json({ ok: false, error: 'No se pudo iniciar Webpay. No se realizó ningún cobro.' }, 502, responseHeaders);
  }
}
async function callback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let params = url.searchParams;
  if (request.method === 'POST') {
    const raw = await request.text();
    if (raw.length > 4096) return landing(undefined, 'datos-invalidos');
    const incoming = new URLSearchParams(raw);
    for (const [k, v] of incoming) params.set(k, v);
  }
  const token = params.get('token_ws') || '';
  const abortedToken = params.get('TBK_TOKEN') || '';
  const abortOrder = params.get('TBK_ORDEN_COMPRA') || '';
  const abortSession = params.get('TBK_ID_SESION') || params.get('TBK_ID_SESSION') || '';
  if (!commerceCode || !apiKey) return landing(undefined, 'no-configurado');
  if (token && abortedToken) return landing(undefined, 'retorno-no-validado');
  if (tokenOk(token)) {
    const row = await fetchOrder('token_ws', token);
    if (!row) return landing(undefined, 'pedido-no-reconocido');
    if (['authorized', 'rejected', 'aborted', 'review', 'failed'].includes(row.status)) return landing(row.id);
    // Marcar processing de forma condicional evita confirmar dos veces el mismo token.
    const { data: locked, error } = await admin.from('webpay_orders')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', row.id).eq('status', 'pending').select('id');
    if (error || !locked?.length) return landing(row.id);
    let result: Record<string, unknown>;
    try { result = await tbk('PUT', `${transactionUrl}/${encodeURIComponent(token)}`); }
    catch (e) {
      console.error('Webpay commit incierto; verificando estado:', e);
      try { result = await tbk('GET', `${transactionUrl}/${encodeURIComponent(token)}`); }
      catch {
        await updateOrder(row.id, { status: 'review' });
        return landing(row.id);
      }
    }
    const matches = result.buy_order === row.buy_order && result.session_id === row.session_id && Number(result.amount) === row.amount_clp;
    const status = !matches ? 'review' : approved(result, row) ? 'authorized' : 'rejected';
    await updateOrder(row.id, { status, tbk_response: responseSubset(result), finished_at: new Date().toISOString() });
    return landing(row.id);
  }
  if (tokenOk(abortedToken)) {
    const row = await fetchOrder('token_ws', abortedToken);
    if (!row) return landing(undefined, 'pedido-no-reconocido');
    if (['pending', 'creating'].includes(row.status)) await updateOrder(row.id, { status: 'aborted', finished_at: new Date().toISOString() });
    return landing(row.id);
  }
  if (orderOk(abortOrder) && abortSession) {
    const row = await fetchOrder('buy_order', abortOrder);
    if (!row || row.session_id !== abortSession) return landing(undefined, 'pedido-no-reconocido');
    if (['pending', 'creating'].includes(row.status)) await updateOrder(row.id, { status: 'aborted', finished_at: new Date().toISOString() });
    return landing(row.id);
  }
  return landing(undefined, 'sin-token');
}
async function status(request: Request): Promise<Response> {
  const h = cors(request);
  if (!allowedOrigins.has(request.headers.get('origin') || '')) return json({ ok: false }, 403, h);
  const id = new URL(request.url).searchParams.get('pedido') || '';
  if (!uuidOk(id)) return json({ ok: false, error: 'Referencia inválida.' }, 400, h);
  const row = await fetchOrder('id', id);
  if (!row) return json({ ok: false, error: 'Pedido no encontrado.' }, 404, h);
  // No exponer ni correo, teléfono, dirección ni respuesta financiera completa al consultar públicamente.
  return json({ ok: true, pedido: row.id, orden: row.buy_order, total: row.amount_clp,
    estado: row.status, productos: row.items.map(item => ({ nombre: item.nombre, cantidad: item.cantidad })) }, 200, h);
}
Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) });
  const action = new URL(request.url).searchParams.get('accion');
  try {
    if (action === 'iniciar' && request.method === 'POST') return await start(request);
    if (action === 'retorno' && ['GET', 'POST'].includes(request.method)) return await callback(request);
    if (action === 'estado' && request.method === 'GET') return await status(request);
    return json({ ok: false, error: 'Ruta no encontrada.' }, 404, cors(request));
  } catch (e) {
    console.error('Error Webpay:', e);
    if (action === 'retorno') return landing(undefined, 'no-verificado');
    return json({ ok: false, error: 'No pudimos verificar la operación. Contacta a la tienda antes de reintentar.' }, 500, cors(request));
  }
});
