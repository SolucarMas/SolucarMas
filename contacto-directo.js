/* SOLUCAR MÁS | Envío directo del formulario de contacto mediante Supabase + Resend. */
(() => {
  'use strict';
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  if (!form || !status) return;
  const submit = form.querySelector('button[type="submit"]');
  const hint = form.querySelector('.form-help');
  if (submit) submit.innerHTML = 'Enviar consulta <span aria-hidden="true">→</span>';
  if (hint) hint.textContent = 'Enviaremos tu consulta directamente al correo de atención de SOLUCAR MÁS.';
  status.setAttribute('aria-live', 'polite');
  const message = (text, error = false) => {
    status.textContent = text;
    status.style.color = error ? '#e3485b' : '#18855d';
  };
  // Captura antes del manejador heredado de app.js (que abría mailto).
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    const config = window.SOLUCAR_AUTH_CONFIG || {};
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url || '')) {
      message('El formulario aún no está conectado al servidor de contacto.', true);
      return;
    }
    const fields = new FormData(form);
    if (String(fields.get('empresa_web') || '').trim()) return; // Honeypot contra robots.
    const payload = {
      nombre: String(fields.get('nombre') || '').trim(),
      correo: String(fields.get('correo') || '').trim(),
      motivo: String(fields.get('motivo') || '').trim(),
      telefono: String(fields.get('telefono') || '').trim(),
      empresa: String(fields.get('empresa') || '').trim(),
      mensaje: String(fields.get('mensaje') || '').trim(),
      empresa_web: ''
    };
    if (submit) submit.disabled = true;
    message('Enviando consulta…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(config.url.replace(/\/$/, '') + '/functions/v1/contacto', {
        method: 'POST', mode: 'cors', signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(config.publishableKey ? { apikey: config.publishableKey } : {})
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.error || `No se pudo enviar (HTTP ${response.status}).`);
      message('¡Consulta enviada! Recibimos tu mensaje y te contactaremos por correo.');
      form.reset();
    } catch (error) {
      message(error.name === 'AbortError'
        ? 'La conexión tardó demasiado. No podemos confirmar el envío; consulta antes de reenviarlo.'
        : 'No pudimos confirmar el envío: ' + (error.message || 'error desconocido') + '. También puedes escribir a contacto@solucarmas.cl.', true);
    } finally {
      clearTimeout(timeout);
      if (submit) submit.disabled = false;
    }
  }, { capture: true });
})();
