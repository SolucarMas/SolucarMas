/* SOLUCAR MÁS | Acceso visual al panel administrativo desde Mi cuenta.
   La autorización REAL se realiza con Supabase RPC + políticas RLS.
   No contiene contraseñas ni claves privadas. */
'use strict';
(() => {
  const ADMIN_EMAIL = 'contacto@solucarmas.cl';
  const config = window.SOLUCAR_AUTH_CONFIG || {};
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url || '') ||
      typeof config.publishableKey !== 'string' ||
      !window.supabase?.createClient) return;

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const nav = document.querySelector('#dashboardView .dashboard-menu nav');
  const content = document.querySelector('#dashboardView .dash-content');
  if (!nav || !content) return;
  let generation = 0;

  function hide() {
    document.getElementById('solucarAdminMenu')?.remove();
    document.getElementById('solucarAdminPanel')?.remove();
  }

  function show() {
    if (document.getElementById('solucarAdminMenu')) return;
    const button = document.createElement('button');
    button.id = 'solucarAdminMenu';
    button.type = 'button';
    button.dataset.section = 'administracion';
    const glyph = document.createElement('span');
    glyph.textContent = '⚙';
    button.append(glyph, document.createTextNode(' Administración'));
    button.setAttribute('aria-label', 'Abrir sección de administración');

    const panel = document.createElement('section');
    panel.id = 'solucarAdminPanel';
    panel.className = 'panel-view';
    panel.dataset.panel = 'administracion';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="dash-section-title">
        <div><span class="section-kicker">ACCESO AUTORIZADO</span><h2>Administración</h2></div>
      </div>
      <div class="box-card">
        <h3>Gestión de productos</h3>
        <p class="muted">Administra los precios, fotografías, categorías y visibilidad de los productos de SOLUCAR MÁS.</p>
        <a class="btn btn-primary" href="administracion.html">Abrir panel de productos →</a>
      </div>`;
    nav.append(button);
    content.append(panel);

    // El menú existente registra listeners al cargar, así que el nuevo botón
    // necesita su propio controlador.
    button.addEventListener('click', () => {
      document.querySelectorAll('#dashboardView [data-panel]').forEach(el => {
        el.hidden = el.dataset.panel !== 'administracion';
      });
      document.querySelectorAll('#dashboardView [data-section]').forEach(el => {
        el.classList.toggle('active', el.dataset.section === 'administracion');
      });
      if (window.matchMedia('(max-width:760px)').matches) {
        document.querySelector('.dashboard-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  async function refreshAccess() {
    const requestId = ++generation;
    hide();
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user || !data.user.email_confirmed_at ||
          data.user.email?.trim().toLowerCase() !== ADMIN_EMAIL) return;
      const { data: allowed, error: roleError } = await client.rpc('is_store_admin');
      if (requestId !== generation || roleError || allowed !== true) return;
      show();
    } catch (error) {
      // Fail closed: nunca mostrar opciones de admin si falla la comprobación.
      console.warn('No se pudo comprobar el acceso administrativo.');
    }
  }

  // Evitar consultas de sesión bloqueantes dentro del callback de autenticación.
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      generation++;
      hide();
    } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
      setTimeout(refreshAccess, 0);
    }
  });
  refreshAccess();
})();
