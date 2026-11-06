/* SOLUCAR MÁS · WhatsApp flotante: arrastrable, minimizable, sin librerías externas. */
(function(){
  'use strict';
  if(document.getElementById('sm-wa-widget'))return;
  const phone='56922524480';
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.04 0C5.45 0 .08 5.36.08 11.95c0 2.11.55 4.16 1.6 5.98L0 24l6.22-1.63a11.9 11.9 0 0 0 5.82 1.48h.01C18.63 23.85 24 18.49 24 11.9a11.84 11.84 0 0 0-3.48-8.42ZM12.04 21.83a9.91 9.91 0 0 1-5.06-1.38l-.37-.22-3.76.99 1-3.67-.25-.38a9.93 9.93 0 0 1-1.52-5.22c0-5.48 4.47-9.94 9.97-9.94a9.9 9.9 0 0 1 7.03 2.92 9.9 9.9 0 0 1 2.92 7.02c0 5.48-4.47 9.94-9.96 9.94Zm5.45-7.45c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17-.35.22-.64.08a8.17 8.17 0 0 1-2.4-1.49 8.99 8.99 0 0 1-1.67-2.08c-.18-.3-.02-.46.13-.61.13-.13.29-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.66-1.6-.9-2.19-.24-.57-.48-.49-.67-.5h-.57c-.2 0-.52.07-.8.37s-1.05 1.03-1.05 2.5 1.08 2.9 1.23 3.1a11.44 11.44 0 0 0 4.4 3.99 3.99 0 0 0 2.68.58c.82-.12 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35Z"/></svg>';
  const el=document.createElement('aside');
  el.id='sm-wa-widget';
  el.setAttribute('aria-label','Ayuda por WhatsApp');
  el.innerHTML='<div class="sm-wa-card"><a class="sm-wa-icon" href="https://wa.me/'+phone+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp de Solucar Más">'+icon+'</a><div class="sm-wa-copy"><strong>¿Necesitas ayuda?</strong><span>Escríbenos por WhatsApp.</span><a href="https://wa.me/'+phone+'" target="_blank" rel="noopener noreferrer">Iniciar conversación</a><div class="sm-wa-hint">Arrastra para mover</div></div><button class="sm-wa-close" type="button" aria-label="Minimizar WhatsApp" title="Minimizar">×</button></div><button class="sm-wa-mini" type="button" aria-label="Mostrar ayuda por WhatsApp">'+icon+' <span>WhatsApp</span></button>';
  document.body.appendChild(el);
  const close=el.querySelector('.sm-wa-close'), mini=el.querySelector('.sm-wa-mini');
  const stateKey='solucarmas-whatsapp-minimizado';
  function collapsed(value){el.classList.toggle('sm-wa-collapsed',value);try{sessionStorage.setItem(stateKey,value?'1':'0')}catch(_){}}
  try{if(sessionStorage.getItem(stateKey)==='1')el.classList.add('sm-wa-collapsed')}catch(_){}
  close.addEventListener('click',function(e){e.stopPropagation();collapsed(true);clamp()});
  mini.addEventListener('click',function(e){e.stopPropagation();if(dragMoved){dragMoved=false;return}collapsed(false);clamp()});
  let dragging=false,dragMoved=false,pid=null,startX=0,startY=0,left0=0,top0=0;
  function clamp(){
    const r=el.getBoundingClientRect();
    const x=Math.max(8,Math.min(window.innerWidth-r.width-8,r.left));
    const y=Math.max(8,Math.min(window.innerHeight-r.height-8,r.top));
    if(el.style.left){el.style.left=x+'px';el.style.top=y+'px';el.style.right='auto';el.style.bottom='auto'}
  }
  el.addEventListener('pointerdown',function(e){
    if(e.button!==0||e.target.closest('a, .sm-wa-close'))return;
    if(e.target.closest('.sm-wa-mini'))return; // Tap the minimized pill to reopen.
    const r=el.getBoundingClientRect();dragging=true;dragMoved=false;pid=e.pointerId;
    startX=e.clientX;startY=e.clientY;left0=r.left;top0=r.top;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove',function(e){
    if(!dragging||e.pointerId!==pid)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(!dragMoved&&Math.hypot(dx,dy)<6)return;
    dragMoved=true;el.classList.add('sm-wa-dragging');
    el.style.left=Math.max(8,Math.min(window.innerWidth-el.offsetWidth-8,left0+dx))+'px';
    el.style.top=Math.max(8,Math.min(window.innerHeight-el.offsetHeight-8,top0+dy))+'px';
    el.style.right='auto';el.style.bottom='auto';
  });
  function finish(e){if(!dragging||e.pointerId!==pid)return;dragging=false;pid=null;el.classList.remove('sm-wa-dragging')}
  el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
  window.addEventListener('resize',clamp,{passive:true});
})();
