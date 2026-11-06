# Cambio en los correos de «Envíanos una consulta»

## Qué cambia
El asunto del correo recibido se identifica con **tuntuncatapumbalachi**, por ejemplo:
`[SOLUCAR MÁS] tuntuncatapumbalachi | Consulta general | María Pérez`

El correo muestra nombre, correo, teléfono opcional, empresa opcional, motivo, fecha/hora chilena y el mensaje completo. La respuesta se dirige al correo del cliente.

## Publicación: dos cambios diferentes
1. **Sitio web**: sube `index.html` y `contacto-directo.js` modificados al repositorio web y publica sus cambios. El archivo HTML añade teléfono y empresa opcionales.
2. **Servidor (imprescindible)**: desde el panel de Supabase, entra a Edge Functions → `contacto` → Code / Editor, y actualiza su código para que incluya la palabra en el `subject` y la plantilla ampliada, después haz Deploy. Se incluye una versión lista para desplegar en `supabase/functions/contacto/index.ts`.

**IMPORTANTE:** el ZIP original NO incluía la función `contacto` que ya tienes publicada, así que no es posible conservar sus controles existentes (por ejemplo, límites de frecuencia o funciones SQL) sin ver su código. Antes de sustituir la función publicada, haz copia del código actual; la versión incluida funciona con Resend, valida campos, honeypot y origen web, pero NO incorpora límites persistentes de envío. Es preferible integrar el asunto y plantilla en tu función actual y conservar sus controles anti-spam.

La función necesita los secretos `RESEND_API_KEY` y `CONTACT_FROM_EMAIL` o `QUOTE_FROM_EMAIL` con dominio autorizado por Resend. En Supabase, configura Verify JWT legacy = OFF para mantener el envío desde el formulario público.

## Gmail
Crea un filtro en Gmail con **Asunto contiene**: `tuntuncatapumbalachi`; elige la etiqueta `Consultas generales` o crea una nueva. El filtro capturará consultas enviadas desde este formulario, incluidas las que indiquen motivo Cotización; si deseas dividirlas por motivo, crea filtros más específicos utilizando el asunto completo.

## Prueba
Tras publicar ambos cambios, envía una consulta de prueba desde `https://solucarmas.cl/#contacto`, revisa en Gmail y comprueba el asunto, todos los campos y el botón Responder.
