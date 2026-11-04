# SOLUCAR MÁS — Integración Webpay Plus

## Qué incluye

- `index.html`: el archivo original, con referencia a la versión actualizada de `app.js`.
- `app.js`: carrito de la tienda (máximo 20 unidades por producto) y acceso a `pago.html`.
- `pago.html`: elección de Webpay Plus / consulta por transferencia y formulario de comprador.
- `pago.js`: resumen de compra, enlace al backend de pago y redirección POST `token_ws` a Transbank.
- `pago-resultado.html`: consulta el estado **en el servidor** y solo confirma compras aprobadas.
- `supabase/functions/webpay/index.ts`: servidor para crear, confirmar y consultar transacciones (no publica credenciales).
- `supabase/migrations/20261104_webpay_orders.sql`: tabla privada de pedidos, con RLS.

## Lo que está listo y lo que falta

La interfaz y el servidor están programados, pero **NO están desplegados, probados de extremo a extremo ni habilitados para cobrar en producción**. El código de comercio `53109637` aparece en la captura del panel de Transbank; ese código **no sustituye la llave secreta de API**. Se requiere integrar y validar el comercio para empezar a cobrar.

**Importante:** los productos y precios que había en `app.js` estaban marcados como *ilustrativos y sujetos a cotización*. El sistema exige `WEBPAY_CATALOG_READY=true` para permitir cobros de producción. **No habilitar esta opción sin confirmar precios, stock, compatibilidad, términos del despacho e impuestos aplicables.** El despacho no está incluido en el importe del carrito y debe acordarse por separado.

## Instalación

1. Haz una copia de seguridad de tus archivos actuales. En el hosting del dominio `solucarmas.cl`, sube `index.html`, `app.js`, `pago.html`, `pago.js` y `pago-resultado.html` a la carpeta donde está tu tienda (normalmente `public_html`). Mantén todos los demás archivos del sitio intactos, especialmente `tienda.html`, `styles.css`, `pago.css` y `supabase-config.js`.
2. En Supabase abre **SQL Editor**, ejecuta todo el archivo `supabase/migrations/20261104_webpay_orders.sql` y comprueba que existe la tabla `public.webpay_orders`.
3. En tu proyecto Supabase despliega la función `webpay` con su contenido desde `supabase/functions/webpay/index.ts`. Con la CLI sería: `supabase functions deploy webpay --no-verify-jwt`. El modo sin JWT es necesario para que Transbank llegue a la URL de retorno. La tabla no está disponible al público gracias al uso de permisos `service_role` únicamente en el servidor.
4. En **Edge Functions → Secrets** configura `WEBPAY_ENV=integration`, `WEBPAY_SITE_URL=https://solucarmas.cl`, `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY`. Para integración utiliza exclusivamente las credenciales **de prueba** que indica oficialmente Transbank para Webpay Plus Normal. **No uses el código de producción con la clave de integración.** `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` deben estar disponibles del lado de las funciones (normalmente son variables automáticas de Supabase).
5. Verifica que `supabase-config.js` defina `window.SOLUCAR_AUTH_CONFIG` con `url` y `publishableKey` correctos. Esa `publishableKey` sí puede ser pública, a diferencia de `WEBPAY_API_KEY` y de `SUPABASE_SERVICE_ROLE_KEY`.
6. Prueba el proceso completo **en ambiente de integración**: añadir producto, revisar resumen, pagar en entorno de pruebas, retornar a `pago-resultado.html`, comprobar en base de datos el estado `authorized`. Prueba también rechazo, cancelación, doble retorno y recarga de la página. Revisa importes y que no se borre el carrito ante errores.
7. **Solo después de validar la integración con Transbank y el catálogo real:** cambia los secretos a `WEBPAY_ENV=production`, `WEBPAY_COMMERCE_CODE=53109637`, `WEBPAY_API_KEY=<tu llave secreta REAL de producción>` y `WEBPAY_CATALOG_READY=true`. Este último control bloquea cobros reales mientras falte confirmación. Solicita la validación de puesta en producción de Transbank antes de vender.

## Consideraciones de operación

- El navegador nunca puede decir qué monto cobrar: el servidor calcula el total desde los identificadores y cantidades, con una lista cerrada de productos.
- Los datos de tarjeta se introducen únicamente en el formulario de Transbank. No coloques tu clave de API de Transbank en HTML, `app.js`, `pago.js`, `supabase-config.js` ni en GitHub.
- La confirmación ocurre en la función Edge al recibir el retorno de Webpay, no por un parámetro de URL editable.
- Los datos del cliente se guardan en una tabla privada. Configura políticas de retención, acceso interno a pedidos, protección contra abusos y el proceso de cumplimiento de órdenes antes de operar ventas reales.
- Este ejemplo no consulta inventario en tiempo real ni calcula despacho automáticamente, no incluye panel de administración, avisos por correo ni emisión de documentos tributarios. Para ventas activas, integra esos procesos y verifica las condiciones legales y tributarias aplicables.
- Si la verificación responde `review` o `processing`, **no** autorices un segundo pago hasta comprobar el estado con Transbank.

Documentación oficial: https://transbankdevelopers.com/documentacion/webpay-plus y https://transbankdevelopers.com/referencia/webpay
