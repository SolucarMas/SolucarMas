# SOLUCAR MÁS — actualización visual limpia

## Archivos para subir a la raíz de GitHub Pages
- `index.html`: inicio más breve, se retiró la sección redundante «Tú nos cuentas. Nosotros buscamos» y el enlace a esa sección.
- `cuenta.html`: conserva su lógica de acceso y el panel del administrador. Añade prefijos internacionales, sugerencias de comuna y visibilidad de contraseñas mediante los recursos comunes.
- `pago.html`: conserva la integración con Webpay y la configuración pública actual.
- `administracion.html`: se incluye para tener acceso a la hoja de estilos común, sin cambiar su lógica de permisos.
- `solucar-ui.css`: estilos consistentes de logo, barra superior, alternancia de tema y campos.
- `solucar-ui.js`: visibilidad de contraseñas, prefijos telefónicos y comunas en Mi cuenta.

## Publicación
1. Guarda una copia de los archivos que están actualmente en GitHub.
2. Sube **estos seis archivos** a la misma carpeta donde existe `index.html` del repositorio principal. Sobrescribe los cuatro HTML.
3. Conserva `app.js`, `cuenta.js`, `pago.js`, `administracion.js`, `supabase-config.js`, `auth-nav.js`, hojas CSS previas y todas las imágenes; estos archivos NO se reemplazan.
4. Confirma el commit y abre el sitio con Ctrl+F5 (para evitar caché).
5. Comprueba desde computadora y móvil: cambio claro/oscuro, menú, inicio de sesión, administración, datos de cuenta, cotización, carrito y Webpay en ambiente de pruebas.

## Notas
- Los botones Mostrar/Ocultar operan en el navegador y no guardan contraseñas.
- El teléfono de Mi cuenta guarda el prefijo cuando el usuario escribe número nacional. Si ya existe un número internacional, no lo modifica.
- Las comunas son sugerencias editables, no validación geográfica exhaustiva.
- Las páginas adicionales (`tienda.html`, `auth` u otras) no se incluyeron porque no se disponía de su versión actual; se recomienda añadir las referencias a `solucar-ui.css` y `solucar-ui.js` si se desea uniformidad total.
- No se modificaron la función segura de pagos ni permisos de Supabase.
