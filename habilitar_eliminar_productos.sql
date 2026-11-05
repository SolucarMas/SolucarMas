-- SOLUCAR MÁS | Permitir eliminar productos SOLO a administradores autorizados.
-- Ejecutar UNA vez en Supabase > SQL Editor. No ejecuta borrados por sí solo.
BEGIN;
GRANT DELETE ON TABLE public.store_products TO authenticated;
DROP POLICY IF EXISTS store_admin_delete ON public.store_products;
CREATE POLICY store_admin_delete ON public.store_products
FOR DELETE TO authenticated
USING ((SELECT public.is_store_admin()));
COMMIT;
