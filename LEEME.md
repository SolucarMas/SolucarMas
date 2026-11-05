# SOLUCAR MÁS — Eliminar productos y patente sin recuadro

## Qué cambia
- `administracion.html` + `administracion.js`: botón «Eliminar» junto a «Editar» en cada producto, con confirmación antes del borrado definitivo. Solo funciona si la sesión está autorizada en `store_admins` y la política RLS permite DELETE.
- `index.html`: elimina el recuadro y fondo coloreado alrededor de «Patente del vehículo» en claro y oscuro, manteniendo el campo obligatorio y el texto de ayuda.
- `habilitar_eliminar_productos.sql`: concede DELETE únicamente a usuarios autenticados con `is_store_admin()`; no elimina productos por sí mismo.

## Instalar en este orden
1. En Supabase > SQL Editor > New query, ejecuta el contenido de `habilitar_eliminar_productos.sql` y verifica que aparezca Success.
2. En GitHub > SolucarMas/SolucarMas, guarda una copia de seguridad y reemplaza en la raíz `administracion.html`, `administracion.js` e `index.html` por estos archivos.
3. Espera a que termine la publicación en GitHub Pages y recarga usando Ctrl+F5.
4. Entra a `https://solucarmas.cl/administracion.html` con la cuenta autorizada. Haz una prueba con un producto creado expresamente para probar y confirma que desaparece de la tienda.
5. Abre la cotización en ambos modos para comprobar el nuevo diseño del campo patente.

## Notas
- La eliminación borra la fila del catálogo y no se puede deshacer desde el panel. Para solo retirar temporalmente un producto, usa «Editar» y desactiva «Visible».
- Se conservan los datos históricos de pedidos en `webpay_orders`, puesto que Webpay guarda detalles del producto en cada orden. La fotografía subida a Storage no se elimina automáticamente; así se evita borrar archivos que podrían seguir utilizándose.
- Si un cliente mantiene un producto eliminado en su carrito, deberá actualizar su carrito: el servidor no aceptará cobrar artículos que ya no existan.
- No vuelvas a ejecutar el SQL de creación inicial del catálogo indiscriminadamente: ese script contiene productos de muestra con ON CONFLICT DO NOTHING y podría recrear alguno que hayas borrado.
- No se modifican las funciones Webpay, las claves ni el sistema de autenticación.
