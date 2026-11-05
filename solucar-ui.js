/* SOLUCAR MÁS · Accesibilidad y campos de perfil, sin reemplazar la autenticación existente. */
(() => {
  'use strict';
  const countries = [ ['CL','🇨🇱','+56'],['AR','🇦🇷','+54'],['BO','🇧🇴','+591'],['BR','🇧🇷','+55'],['CO','🇨🇴','+57'],['EC','🇪🇨','+593'],['PY','🇵🇾','+595'],['PE','🇵🇪','+51'],['UY','🇺🇾','+598'],['VE','🇻🇪','+58'],['US','🇺🇸','+1'],['ES','🇪🇸','+34'] ];
  function addVisibilityButtons(){
    for(const input of document.querySelectorAll('input[type="password"]')){
      if(input.closest('.sm-password-wrap'))continue;
      const wrap=document.createElement('div');wrap.className='sm-password-wrap';
      input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
      const btn=document.createElement('button');btn.type='button';btn.className='sm-password-toggle';
      btn.textContent='Mostrar';btn.setAttribute('aria-label','Mostrar contraseña');btn.setAttribute('aria-pressed','false');
      btn.addEventListener('click',()=>{
        const show=input.type==='password';input.type=show?'text':'password';
        btn.textContent=show?'Ocultar':'Mostrar';btn.setAttribute('aria-pressed',String(show));
        btn.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');
      });wrap.appendChild(btn);
    }
  }
  function enhanceProfilePhone(){
    const input=document.querySelector('#profilePhone'); if(!input || document.querySelector('#profilePhoneCountry'))return;
    const container=document.createElement('div');container.className='sm-phone-field';
    const select=document.createElement('select');select.id='profilePhoneCountry';select.setAttribute('aria-label','Código de país');
    for(const [code,flag,prefix] of countries){const op=document.createElement('option');op.value=prefix;op.textContent=flag+' '+prefix;op.dataset.country=code;select.appendChild(op);}
    input.parentNode.insertBefore(container,input);container.append(select,input);
    input.placeholder='9 1234 5678';input.autocomplete='tel-national';
    const hint=document.createElement('small');hint.className='sm-field-hint';hint.textContent='Selecciona el prefijo y escribe tu número. Se guardará completo con código internacional.';container.after(hint);
    // Cuando se carga un teléfono guardado, seleccionar prefijo sin alterar el dato almacenado.
    let touched=false;
    const matchPrefix=()=>{
      if(touched)return;
      const value=(input.value||'').trim();
      const match=[...countries].sort((a,b)=>b[2].length-a[2].length).find(c=>value.startsWith(c[2]));
      if(match)select.value=match[2];
    };
    input.addEventListener('focus',matchPrefix);select.addEventListener('change',()=>{touched=true;});
    const form=input.closest('form');
    if(form)form.addEventListener('submit',()=>{
      let raw=(input.value||'').trim();if(!raw)return;
      // El formulario original utiliza input.value; lo convertimos ANTES de su manejador de submit.
      const prefix=select.value;
      if(!raw.startsWith('+')){
        raw=raw.replace(/[^\d]/g,''); if(raw.startsWith('0'))raw=raw.replace(/^0+/,'');
        input.value=prefix+' '+raw;
      }else if(raw.startsWith(prefix)){
        // Mantener lo ingresado explícitamente sin duplicar el prefijo.
        input.value=raw;
      }
    },true);
  }
  function addTownSuggestions(){
    const input=document.querySelector('#profileTown');if(!input || input.hasAttribute('list'))return;
    const dl=document.createElement('datalist');dl.id='smComunas';
    const towns=['Alhué','Buin','Calera de Tango','Cerrillos','Cerro Navia','Colina','Conchalí','El Bosque','Estación Central','Huechuraba','Independencia','Isla de Maipo','La Cisterna','La Florida','La Granja','La Pintana','La Reina','Lampa','Las Condes','Lo Barnechea','Lo Espejo','Lo Prado','Macul','Maipú','Melipilla','Ñuñoa','Padre Hurtado','Paine','Pedro Aguirre Cerda','Peñalolén','Pirque','Providencia','Pudahuel','Puente Alto','Quilicura','Quinta Normal','Recoleta','Renca','San Bernardo','San Joaquín','San José de Maipo','San Miguel','San Ramón','Santiago','Talagante','Vitacura','Valparaíso','Viña del Mar','Concepción','Antofagasta','Temuco','Rancagua','La Serena','Coquimbo','Arica','Iquique','Puerto Montt','Valdivia'];
    for(const town of towns){const o=document.createElement('option');o.value=town;dl.append(o)}
    input.setAttribute('list',dl.id);input.parentNode.append(dl);
  }
  function init(){addVisibilityButtons();enhanceProfilePhone();addTownSuggestions()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
