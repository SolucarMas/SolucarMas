# SOLUCAR MÁS — portada simplificada y Mi cuenta uniforme

Esta actualización retira el bloque «Nuestros servicios» de tres tarjetas y el bloque «Tú nos cuentas. Nosotros buscamos» (si estuviera presente). Conserva la sección de soluciones, la tienda, el formulario de cotizaciones, la información legal, las cuentas y Webpay. También retira la tira introductoria repetitiva para acortar la portada.

En Mi cuenta se conservan los formularios y el acceso de administrador, pero se unifican tamaño de logo, encabezado, navegación y botón claro/oscuro con el inicio. El botón conserva su id `themeSwitch` y sus controladores de tema existentes.

## Instalación en GitHub Pages

1. Haz copia de seguridad de tus archivos vigentes.
2. Sube a la raíz del repositorio estos **cinco archivos**: `index.html`, `cuenta.html`, `solucar-consistente.css`, `solucar-ui.css` y `solucar-ui.js`. Reemplaza los dos HTML y conserva el resto de archivos actuales.
3. Confirma los cambios en `main` y comprueba la publicación de GitHub Pages.
4. Verifica tanto modo claro como oscuro en inicio y Mi cuenta, así como acceso del administrador, cotizaciones, carrito y Webpay en modo de pruebas.

**No** subas secretos ni modifiques las funciones de Supabase. **No** sustituyas `pago.html`, `pago.js`, `app.js` ni `cuenta.js` para aplicar este cambio.

Nota: no dispongo de `tienda.html` actual para garantizar uniformidad total de esa página. La modificación es visual/estructural y no ha sido probada con una compra real.
