/* SOLUCAR MÁS · Checkout Webpay Plus. Nunca se almacenan datos de tarjetas. */
'use strict';
(() => {
  const CART_KEY = 'solucar-cart-v3';
  const THEME_KEY = 'solucar-theme';
  const PENDING_KEY = 'solucar-webpay-orden-pendiente';
  // Este catálogo de presentación debe coincidir con el catálogo SEGURO de la función Edge.
  const products = [
    { id: 'filter-oil', name: 'Filtro de aceite universal', price: 8900 },
    { id: 'filter-air', name: 'Filtro de aire para motor', price: 12900 },
    { id: 'oil-5w30', name: 'Aceite de motor sintético 5W-30 · 4 L', price: 29900 },
    { id: 'oil-15w40', name: 'Aceite multigrado 15W-40 · 4 L', price: 25900 },
    { id: 'pads', name: 'Pastillas de freno delanteras', price: 27900 },
    { id: 'bulb', name: 'Ampolleta halógena H7', price: 6900 },
    { id: 'wipers', name: 'Limpiaparabrisas · unidad', price: 9900 },
    { id: 'coolant', name: 'Refrigerante de motor · 1 L', price: 7500 }
  ];
  const $ = selector => document.querySelector(selector);
  const money = number => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(number);
  let cart = {};
  let lines = [];
  const form = $('#paymentForm');
  const statusNode = $('#paymentStatus');
  const submit = form?.querySelector('button[type="submit"]');
  function inform(message, kind = '') {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.style.color = kind === 'error' ? '#d62a43' : kind === 'success' ? '#08734d' : '';
  }
  function render() {
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch { cart = {}; }
    if (!cart || typeof cart !== 'object' || Array.isArray(cart)) cart = {};
    lines = products.filter(p => Number.isInteger(cart[p.id]) && cart[p.id] > 0)
      .map(p => ({ ...p, qty: cart[p.id] }));
    $('#emptyPaymentCart').hidden = lines.length > 0;
    $('#paymentContent').hidden = lines.length === 0;
    const badge = $('#cartBadge');
    if (badge) badge.textContent = lines.reduce((sum, p) => sum + p.qty, 0);
    const root = $('#paymentItems');
    root.replaceChildren();
    for (const item of lines) {
      const row = document.createElement('div');
      row.className = 'pay-item';
      row.style.cssText = 'display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--line)';
      const description = document.createElement('span');
      description.textContent = `${item.name} × ${item.qty}`;
      const price = document.createElement('strong');
      price.textContent = money(item.price * item.qty);
      row.append(description, price);
      root.append(row);
    }
    $('#paymentTotal').textContent = money(lines.reduce((total, p) => total + p.qty * p.price, 0));
  }
  function updatePaymentChoice() {
    const isWebpay = form.querySelector('[name="medio_pago"]:checked')?.value === 'Webpay Plus';
    if (submit) submit.textContent = isWebpay ? 'Pagar con Webpay Plus →' : 'Solicitar información de transferencia →';
    inform('');
  }
  function configureNavigation() {
    let theme;
    try { theme = localStorage.getItem(THEME_KEY); } catch {}
    if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
    $('#themeToggle')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(THEME_KEY, next); } catch {}
    });
    $('#accountOpen')?.addEventListener('click', () => { location.href = 'cuenta.html'; });
    $('#cartOpen')?.addEventListener('click', () => { location.href = 'tienda.html'; });
    $('#menuToggle')?.addEventListener('click', () => {
      const menu = $('#mainNav');
      const opened = menu.classList.toggle('open');
      $('#menuToggle').setAttribute('aria-expanded', String(opened));
    });
  }
  function emailTransferencia(customer) {
    const total = lines.reduce((t, p) => t + p.price * p.qty, 0);
    const details = lines.map(p => `• ${p.name} × ${p.qty}: ${money(p.price * p.qty)}`).join('\n');
    const message = `Hola, quiero consultar por un pedido y coordinar pago por transferencia.\n\nNombre: ${customer.nombre}\nCorreo: ${customer.correo}\nTeléfono: ${customer.telefono}\nComuna: ${customer.comuna}\nIndicaciones: ${customer.notas || '-'}\n\n${details}\nSubtotal referencial (sin despacho): ${money(total)}\n\nQuedo atento a disponibilidad, compatibilidad, precio final y datos de transferencia.`;
    const url = 'mailto:contacto@solucarmas.cl?subject=' + encodeURIComponent('Consulta de pedido SOLUCAR MÁS — Transferencia') + '&body=' + encodeURIComponent(message);
    inform('Se abrirá tu correo con el pedido. Debes enviarlo tú; aún no se registró una solicitud ni se efectuó un pago.', 'success');
    location.href = url;
  }
  async function checkout(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!lines.length) return inform('El carrito está vacío.', 'error');
    if (lines.some(p => p.qty > 20)) return inform('El máximo permitido es 20 unidades por producto. Modifica tu carrito.', 'error');
    const customer = Object.fromEntries(new FormData(form).entries());
    const method = String(customer.medio_pago || '');
    delete customer.medio_pago;
    if (method === 'Transferencia bancaria') return emailTransferencia(customer);
    if (method !== 'Webpay Plus') return inform('Selecciona un medio de pago.', 'error');
    const config = window.SOLUCAR_AUTH_CONFIG || {};
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url || '') || !config.publishableKey)
      return inform('Webpay aún no está configurado en esta página. Contacta a la tienda.', 'error');
    const base = config.url.replace(/\/$/, '');
    const checkoutUrl = `${base}/functions/v1/webpay?accion=iniciar`;
    submit.disabled = true;
    inform('Conectando de forma segura con Transbank…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const result = await fetch(checkoutUrl, {
        method: 'POST', mode: 'cors', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', apikey: config.publishableKey },
        body: JSON.stringify({ customer, items: lines.map(p => ({ id: p.id, qty: p.qty })) })
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok || data.ok !== true) throw new Error(data.error || `No se pudo iniciar el pago (HTTP ${result.status}).`);
      const redirect = new URL(data.url);
      const hosts = new Set(['webpay3g.transbank.cl', 'webpay3gint.transbank.cl']);
      if (redirect.protocol !== 'https:' || !hosts.has(redirect.hostname) || !/^[A-Za-z0-9._-]{20,256}$/.test(data.token || ''))
        throw new Error('Transbank devolvió datos de redirección que no pudimos validar.');
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ pedido: data.pedido, cart }));
      } catch {}
      // Redirigir con método POST y token_ws, tal como requiere la API oficial.
      const post = document.createElement('form');
      post.method = 'POST';
      post.action = redirect.href;
      const token = document.createElement('input');
      token.name = 'token_ws';
      token.type = 'hidden';
      token.value = data.token;
      post.append(token);
      document.body.append(post);
      inform('Abriendo la plataforma segura de Transbank…');
      post.submit();
    } catch (e) {
      const message = e.name === 'AbortError' ? 'Tiempo de espera agotado. No se confirmó ningún pago.' : e.message || 'No se pudo conectar.';
      inform(message + ' Si ya autorizaste un pago, consulta con la tienda antes de intentar de nuevo.', 'error');
    } finally { clearTimeout(timeout); submit.disabled = false; }
  }
  render();
  configureNavigation();
  form?.querySelectorAll('[name="medio_pago"]').forEach(el => el.addEventListener('change', updatePaymentChoice));
  form?.addEventListener('submit', checkout);
  updatePaymentChoice();
})();
