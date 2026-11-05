# SOLUCAR MÁS · Actualización comercial y técnica (05-11-2026)

## Entrega

Los archivos del directorio `SolucarMas-main` son el proyecto actualizado. Conserva el respaldo de la versión anterior antes de publicar.

## Cambios efectivamente implementados

- **Inicio:** nueva franja de beneficios concretos; información de compras, preguntas y cotizaciones sin contradicciones de pago; privacidad visible; favicon y metadatos sociales coherentes.
- **Tienda Esencial:** recorrido de compra reorganizado, productos cargados **solo** desde Supabase (se evita el parpadeo de productos de ejemplo); buscador por nombre, categoría, descripción e identificador; contador de resultados; ficha detallada por producto con código interno, imagen, precio, características, consulta de compatibilidad y enlace para compartir; carrito conservado.
- **Webpay:** backend `index.ts` cambia los precios fijos por consulta a `store_products` con clave de servicio, rechaza ítems borrados/ocultos y diferencias de precio con HTTP 409. Mantiene el bloqueo de producción si `WEBPAY_CATALOG_READY` no está configurado como `true` y no cambia las credenciales.
- **Checkout:** aceptación expresa de condiciones sobre compatibilidad, despacho aparte y datos personales, antes de iniciar Webpay. No se confirma ninguna transacción por el navegador; el servidor debe verificarla.
- **Administración:** buscar/filtrar, publicar/ocultar sin borrar, editar y eliminar con confirmación; autorización RLS existente intacta. Para DELETE se conserva `habilitar_eliminar_productos.sql`.
- **Privacidad y condiciones:** nueva página `informacion-comercial.html`. NO se han inventado RUT, dirección, stock ni tiempos de despacho.
- **Identidad y SEO:** favicon común, etiquetas canonical/Open Graph en Inicio y Tienda, schema Organization con datos públicos, `robots.txt` y `sitemap.xml`.
- **Rendimiento:** imágenes y logos base64 extraídos del HTML/JS hacia sus archivos locales idénticos (comparación SHA-256). Inicio, Tienda y Cuenta cargan muchos menos kilobytes de documento antes de solicitar imágenes por separado.
- **Estilo:** CSS adicional `mejoras-20261105.css`, conservando la identidad azul en claro / rojo en oscuro del proyecto.

## Cómo publicar — GitHub Pages

1. Guarda una copia de tu repositorio y configuración actual.
2. Sube a la raíz del repositorio el contenido actualizado de esta carpeta (los HTML, JS, CSS, imágenes, sitemap y favicon). La carpeta incluida es una copia completa, pero los SQL y `index.ts` **no son archivos que GitHub Pages ejecute**.
3. Verifica que `CNAME` siga conteniendo `solucarmas.cl`, y no modifiques las DNS ni certificados si ya funcionan.
4. Publica con el flujo habitual de GitHub Pages y recarga con Ctrl+F5.
5. Confirma apertura de Inicio, Tienda, Cuenta, Checkout, Administración, Información comercial y página de resultado.

## Cómo actualizar la función de pago (paso separado y obligatorio)

1. En Supabase → **Edge Functions** → función `webpay` → Editar / desplegar, reemplaza el código por `index.ts`. El archivo `index.ts` es código **servidor**, no código de la página y no se actualiza automáticamente por GitHub Pages.
2. Conserva las variables de entorno existentes: `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY`, `WEBPAY_ENV`, `WEBPAY_SITE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **No actives** `WEBPAY_CATALOG_READY=true` en producción hasta confirmar precios, existencias, impuestos y condiciones de despacho, y realizar las pruebas de integración correspondientes.
4. El backend debe contar con la tabla `webpay_orders` y `store_products` (no ejecutes indiscriminadamente SQL inicial que recree productos de prueba).
5. Si no está desplegada la función `webpay` con el cambio de precios, el catálogo del administrador y el servidor pueden seguir desincronizados. **No utilices cobros reales** mientras persista esa diferencia.
6. La tabla actual de productos no gestiona automáticamente stock. La disponibilidad debe validarse comercialmente; la protección `WEBPAY_CATALOG_READY` es una salvaguarda de habilitación y no reemplaza un sistema real de inventario.

## Antes de habilitar compras reales

- Completa y revisa en `informacion-comercial.html` la identificación obligatoria del proveedor: **razón social, RUT, domicilio y condiciones comerciales precisas**. No se inventaron esos datos.
- Verifica el alcance exacto de despacho, costos y entregas. Hoy el pago excluye envío: el cliente lo acepta en el checkout, pero el costo final puede requerir coordinación previa.
- Confirma existencia y compatibilidad de cada producto ofrecido y actualiza descripciones / fotos / precios / estado desde Administración.
- Ejecuta una compra de prueba **en el entorno de integración de Webpay**, no con dinero real, y verifica resultado autorizado, rechazo y retorno interrumpido, email/pedido, cancelación y carrito.
- Prueba cotizaciones en un navegador real, correos de confirmación, login, historial de pedidos, móviles y accesibilidad. Los archivos `contacto` / `enviar-cotizacion` de Supabase siguen desplegados por separado.
- El catálogo es dinámico. Todavía no existen páginas estáticas indexables por producto, inventario automatizado, cálculo de despacho ni seguimiento integral de pedidos; requieren diseño y backend adicionales.

## Comprobaciones realizadas

- Se revisaron nombres de archivo y referencias locales en HTML: sin referencias faltantes en las páginas principales.
- Se verificó la sintaxis de `app.js`, `administracion.js`, `pago.js` con Node, y la sintaxis TypeScript del backend de Webpay.
- Se comprobaron IDs repetidos y enlaces internos estáticos.
- La política del navegador del entorno bloqueó la ejecución de páginas locales; no se pudo validar visualmente el sitio ni efectuar pruebas reales contra Transbank, Supabase, AutoRiesgo o Resend. No se reclama que una transacción esté funcionando en producción.
