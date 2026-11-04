# SOLUCAR MÁS — Administración desde Mi cuenta

## Qué cambia

En `cuenta.html`, solo una sesión cuyo correo confirmado sea `contacto@solucarmas.cl` **y** cuyo ID esté autorizado en `public.store_admins` verá **Administración** en el menú lateral. Al entrar, encontrará el botón **Abrir panel de productos** que dirige a `administracion.html`. Los clientes restantes conservarán su vista normal.

## Publicar (GitHub, rama main)

1. Haz una copia de seguridad de `cuenta.html`.
2. Sube el archivo **`cuenta-admin.js`** a la raíz del repositorio (junto a `cuenta.js`).
3. Abre `cuenta.html` en GitHub, pulsa el lápiz (Edit) y, inmediatamente **antes de `</body>`**, agrega esta línea:

   ```html
   <script defer src="cuenta-admin.js?v=1"></script>
   ```

4. Haz clic en **Commit changes**.
5. Confirma que `supabase-config.js`, `administracion.html` y `administracion.js` sigan en la raíz.
6. Ingresa con `contacto@solucarmas.cl` a `https://solucarmas.cl/cuenta.html`, recarga con Ctrl+F5 y busca la opción **Administración**.
7. Abre el panel y confirma que puedas ver el catálogo; haz pruebas de edición solo en un entorno donde tengas autorizada la modificación de los productos.

## Si no aparece Administración

En Supabase → SQL Editor (tras confirmar la cuenta en Authentication → Users), ejecuta:

```sql
insert into public.store_admins (user_id)
select id from auth.users
where lower(email) = 'contacto@solucarmas.cl'
  and email_confirmed_at is not null
on conflict (user_id) do nothing;

select u.email, a.granted_at
from public.store_admins a
join auth.users u on u.id = a.user_id
where lower(u.email) = 'contacto@solucarmas.cl';
```

Si `is_store_admin` no existe, ejecuta primero la migración de catálogo administrativo proporcionada previamente. Nunca añadas `service_role` ni secretos de Transbank a los archivos públicos.

## Seguridad

El correo sirve únicamente para determinar qué opción mostrar. La función RPC `is_store_admin()` y las políticas RLS de Supabase son las que conceden acceso real. Si el usuario no inicia sesión o falla la consulta, la opción no aparece. La página `administracion.html` debe mantener su propio control de autorización.
