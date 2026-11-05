# SOLUCAR MÁS · Formulario de contacto directo

## Resultado
El formulario «Envíanos una consulta» de la portada envía mensajes automáticamente a **contacto@solucarmas.cl** mediante **Supabase Edge Function + Resend**. Ya no abre la app de correo del visitante. El correo remitente lleva el mensaje; `reply_to` se ajusta al email que dejó el visitante. El resultado solo marca «enviado» si Resend acepta la solicitud.

## Orden de instalación

1. **Supabase → SQL Editor → New query**: pega y ejecuta `supabase/migrations/contacto_limites.sql`. Crea una tabla restringida para frenar envíos excesivos y una función SQL accesible solo por la clave de servicio.
2. **Supabase → Edge Functions → Deploy a new function → Via Editor**: usa el nombre exacto **`contacto`** y pega `supabase/functions/contacto/index.ts`; publica la función.
3. En **Edge Functions → contacto → Settings**, configura **Verify JWT with legacy secret = OFF**. La función permite solo POST desde `https://solucarmas.cl` y `https://www.solucarmas.cl`, valida los campos y limita solicitudes. Una comprobación de `Origin` ayuda con navegadores, pero no garantiza detener a todos los bots: vigila el consumo de Resend y añade CAPTCHA/Turnstile si recibes spam.
4. En **Edge Functions → Secrets** verifica que exista `RESEND_API_KEY` (de tu integración de cotizaciones). Confirma también que `QUOTE_FROM_EMAIL` sea un remitente válido autorizado en Resend. Si prefieres un remitente distinto, agrega `CONTACT_FROM_EMAIL` con un correo de dominio verificado. El destinatario ya está fijado como `contacto@solucarmas.cl`; no pongas llaves privadas en HTML o JavaScript del navegador.
5. **GitHub → repositorio de SOLUCAR MÁS**: haz copia de seguridad y sube **solo** `index.html` y `contacto-directo.js` a la raíz; confirma con **Commit changes**. No subas la carpeta `supabase` al sitio público.
6. Abre `https://solucarmas.cl/#contacto` y actualiza con Ctrl+F5. Completa una consulta de prueba y pulsa **Enviar consulta**. Comprueba que el mensaje llegue a la bandeja de entrada (y revisa Spam). Si falla, mira **Edge Functions → contacto → Logs**.

## Nota
No se alteran la función `enviar-cotizacion`, el carrito, Webpay o la administración. Los mensajes no se guardan en una base de datos: se transmiten al correo de destino por Resend. El control de frecuencia solo guarda identificadores irreversibles temporalmente. Si no tienes dominio de envío verificado en Resend, debes configurarlo antes de que el envío funcione.
