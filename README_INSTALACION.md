# SOLUCAR MÁS — Pago simplificado + catálogo editable + panel de administración

## Cambios realizados

1. **Pago:** únicamente tarjeta de débito, crédito o prepago. Se eliminó la opción de transferencia del checkout. Bajo el botón aparecen el **WhatsApp y teléfono +56 9 2252 4480**.
2. **Datos:** el teléfono usa el mismo selector de prefijos internacionales que el formulario de cotizaciones y la comuna tiene autocompletado por `datalist`, con datos de APIs de comunas de Chile cuando respondan y una lista local de respaldo.
3. **Administrador:** `administracion.html` y `administracion.js` ofrecen acceso con Supabase Auth para el correo **contacto@solucar.cl**. Puede agregar y editar productos, subir fotografías, actualizar precios, categorías y descripciones, ordenar productos y ocultarlos. **No se permiten cambios sin estar autorizado por RLS**.
4. **Precio seguro:** `app.js` y `pago.js` muestran precios de la tabla `public.store_products`; `webpay/index.ts` vuelve a leer la tabla en el servidor, comprueba el precio esperado y **rechaza precios cambiados** (HTTP 409). El monto no proviene del navegador.
5. **Fotos:** se guardan en un bucket público llamado `store-products`, con **subida restringida a administradores**, JPG/PNG/WebP, máx. 5 MB. Las imágenes originales incrustadas siguen funcionando mientras no se reemplazan.

## Instalación en este orden — ¡importante!

### 1. Base de datos de Supabase (primero)

Abre **Supabase → SQL Editor → New query**. Pega y ejecuta el archivo:

`supabase/migrations/20261104_catalogo_admin.sql`

La migración añade `store_products`, `store_admins`, políticas RLS y el bucket `store-products`. Conserva la tabla `webpay_orders` y los pagos antiguos. Sus 8 productos se agregan inicialmente sin reemplazar cambios existentes.

En **Table Editor**, comprueba que `store_products` contiene ocho productos y sus precios iniciales (todavía referenciales). Si el SQL falla, **no publiques todavía los archivos del sitio**: la tienda de esta versión depende del nuevo catálogo.

### 2. Autorizar al propietario de la cuenta administradora

**Correo solicitado:** `contacto@solucar.cl` (no confundir con el correo general `contacto@solucarmas.cl`).

En **Authentication → Users**, comprueba que existe ese usuario, que **controla ese buzón** y que verificó su correo. Si no existe, invita al usuario mediante Supabase Auth o crea la cuenta usando tu flujo de registro y haz que confirme el correo. **No compartas contraseñas.**

Luego ejecuta por separado en SQL Editor el archivo:

`supabase/AUTORIZAR_ADMIN.sql`

El script insertará el ID del usuario verificado en `store_admins`. **Debe devolver una fila** en la consulta final. Si devuelve cero, verifica que el correo esté exactamente escrito y confirmado, antes de reintentarlo.

La seguridad real usa el `user_id` autorizado con Supabase Auth y RLS. **Nunca** hay una contraseña de administrador escrita en GitHub.

### 3. Actualizar función Edge `webpay` (antes que la página)

Supabase → Edge Functions → webpay → **Code** → reemplaza con:

`supabase/functions/webpay/index.ts`

Despliega los cambios. Conserva la configuración existente de **Verify JWT = OFF** por el retorno de Transbank. Esta función ahora consulta `store_products`; si no publicas la nueva versión, el servidor seguirá usando sus ocho precios fijos anteriores y no cobrará bien los productos editados.

**No modifiques los secretos de producción solo por instalar el panel.** Durante las pruebas usa `WEBPAY_ENV=integration`, las credenciales oficiales de pruebas y `WEBPAY_CATALOG_READY=false`.

La función sigue validando origen y datos; no expongas `WEBPAY_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ni claves privadas en ningún archivo de GitHub.

### 4. Actualizar GitHub Pages

En tu repositorio **SolucarMas / SolucarMas** (rama `main`), crea un respaldo y sube **a la raíz** estos seis archivos de la carpeta principal:

- `index.html` — actualizado; enlace de administración en el pie de página
- `app.js` — consulta el catálogo vivo de Supabase y conserva la lógica existente de cotizaciones
- `pago.html` — tarjeta única, nuevo teléfono/comunas y contacto
- `pago.js` — consulta el catálogo y prepara la transacción
- `administracion.html` — página del panel
- `administracion.js` — aplicación del panel

**Mantén sin cambios** `supabase-config.js`, `tienda.html`, `styles.css`, `pago.css`, `pago-resultado.html`, `auth-nav.js`, `tema-v15.css` y las imágenes originales. La carpeta `supabase/` de este ZIP contiene código y migraciones para cargar en Supabase, **no es necesario publicarla en GitHub Pages**.

La tienda existente `tienda.html` debe cargar `app.js`. Si tiene una referencia como `app.js?v=antiguo`, cambia solo el número de versión a `app.js?v=admin-catalogo-20261104` para evitar que el navegador reutilice código viejo (sin tocar el resto de `tienda.html`).

**No** subas el ZIP completo a cPanel: `solucarmas.cl` apunta a GitHub Pages.

### 5. Probar y dar acceso al administrador

Abre `https://solucarmas.cl/administracion.html`.

El titular de `contacto@solucar.cl` inicia sesión con la contraseña de su **cuenta Supabase Auth confirmada**. Debería poder editar un producto, subir una fotografía, guardar y volver a la tienda para comprobar el cambio. Comprueba también que una cuenta normal **no** puede editar ni subir fotografías.

Prueba una compra con un precio editado **en ambiente de integración** y comprueba en `webpay_orders` que el monto corresponde al precio vigente de `store_products`. Prueba también edición de precio con el checkout ya abierto: debe pedir revisar el importe antes de cobrar. Valida pago aprobado, rechazado y cancelado.

## Consideraciones antes de vender realmente

- Los precios iniciales eran **de referencia**, sin despacho. El administrador debe confirmar precios finales, stock, disponibilidad, impuestos, compatibilidad y condiciones del despacho antes de habilitar cobros reales (`WEBPAY_CATALOG_READY=true`).
- No se ha realizado aquí ningún despliegue remoto ni prueba real de Transbank tras esta modificación. Hasta instalar y probar todos los componentes, no asumas que la nueva versión está activa.
- El inventario sigue sin descontarse automáticamente; el panel permite **activar/ocultar** productos, no gestionar reservas de stock. Implementa controles de stock, conciliación de pagos, devoluciones y notificaciones antes de operar un volumen importante.
- Las fotos subidas al bucket público se pueden ver por cualquier persona con la URL; no coloques documentos privados allí.
- Si un archivo de foto se reemplaza, la foto anterior seguirá almacenada en Storage hasta que un administrador la elimine manualmente desde el panel de Supabase; se evita dar permisos de borrado automático en el navegador.
