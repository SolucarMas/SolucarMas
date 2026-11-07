/* SOLUCAR MÁS · WhatsApp flotante V4 (2026-11-07).
   Una sola burbuja en estado minimizado: logo nítido, centrado y arrastrable. */
(function () {
  'use strict';
  if (document.getElementById('sm-wa-widget')) return;

  const phone = '56922524480';
  const link = 'https://wa.me/' + phone;
  const key = 'solucarmas-whatsapp-minimizado';

  // PNG transparente generado de un ícono vectorial estándar: el teléfono
  // conserva su forma y no depende de fuentes ni de CSS externo.
  const whatsappLogo = 'data:image/png;base64,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';
  const logo = '<img class="sm-wa-mark" src="' + whatsappLogo + '" alt="" aria-hidden="true" draggable="false">';

  const widget = document.createElement('aside');
  widget.id = 'sm-wa-widget';
  widget.setAttribute('aria-label', 'Ayuda por WhatsApp');
  widget.innerHTML =
    '<div class="sm-wa-card">' +
      '<a class="sm-wa-icon" href="' + link + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp de Solucar Más">' + logo + '</a>' +
      '<div class="sm-wa-copy"><strong>¿Necesitas ayuda?</strong><span>Escríbenos por WhatsApp.</span>' +
        '<a href="' + link + '" target="_blank" rel="noopener noreferrer">Iniciar conversación</a>' +
        '<div class="sm-wa-hint">Arrastra para mover</div></div>' +
      '<button class="sm-wa-close" type="button" aria-label="Minimizar WhatsApp" title="Minimizar">×</button>' +
    '</div>' +
    '<button class="sm-wa-mini" type="button" aria-label="Mostrar ayuda por WhatsApp" title="WhatsApp · toca para abrir o arrastra para mover">' + logo + '</button>';
  document.body.appendChild(widget);

  const mini = widget.querySelector('.sm-wa-mini');
  const close = widget.querySelector('.sm-wa-close');
  const padding = 10;
  let pointer = null;
  let movedDuringGesture = false;
  let ignoreClickAfterDrag = false;

  function limit(value, max) {
    return Math.max(padding, Math.min(value, Math.max(padding, max - padding)));
  }

  function putAt(x, y) {
    widget.style.left = limit(x, innerWidth - widget.offsetWidth) + 'px';
    widget.style.top = limit(y, innerHeight - widget.offsetHeight) + 'px';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
  }

  function keepOnScreen() {
    if (!widget.style.left) return; // Cuando no se ha movido, sigue anclado por CSS.
    const r = widget.getBoundingClientRect();
    putAt(r.left, r.top);
  }

  function setCollapsed(shouldCollapse) {
    const wasPlaced = Boolean(widget.style.left);
    const before = widget.getBoundingClientRect();
    const middleX = before.left + before.width / 2;
    const middleY = before.top + before.height / 2;

    widget.classList.add('sm-wa-entered');
    widget.classList.toggle('sm-wa-collapsed', shouldCollapse);
    close.setAttribute('aria-expanded', String(!shouldCollapse));
    mini.setAttribute('aria-expanded', String(!shouldCollapse));
    try { sessionStorage.setItem(key, shouldCollapse ? '1' : '0'); } catch (_) { /* privacidad */ }

    if (wasPlaced) putAt(middleX - widget.offsetWidth / 2, middleY - widget.offsetHeight / 2);
  }

  try {
    if (sessionStorage.getItem(key) === '1') widget.classList.add('sm-wa-collapsed');
  } catch (_) { /* almacenamiento deshabilitado */ }
  widget.addEventListener('animationend', (event) => {
    if (event.animationName === 'smWaEnter') widget.classList.add('sm-wa-entered');
  });
  mini.setAttribute('aria-expanded', String(!widget.classList.contains('sm-wa-collapsed')));
  close.setAttribute('aria-expanded', String(!widget.classList.contains('sm-wa-collapsed')));

  close.addEventListener('click', (event) => {
    event.stopPropagation();
    setCollapsed(true);
  });

  mini.addEventListener('click', (event) => {
    if (ignoreClickAfterDrag || movedDuringGesture) {
      event.preventDefault();
      event.stopPropagation();
      ignoreClickAfterDrag = false;
      return;
    }
    setCollapsed(false);
  });

  widget.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    if (event.target.closest('a, .sm-wa-close')) return;

    // Un toque posterior a un arrastre siempre debe poder abrir la nubecita.
    ignoreClickAfterDrag = false;
    movedDuringGesture = false;
    const box = widget.getBoundingClientRect();
    const handle = event.target.closest('.sm-wa-mini') || widget;
    pointer = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: box.left,
      top: box.top,
      handle
    };
    try { handle.setPointerCapture(event.pointerId); } catch (_) { /* navegador antiguo */ }
  });

  widget.addEventListener('pointermove', (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    if (!movedDuringGesture && Math.hypot(dx, dy) < 8) return;

    movedDuringGesture = true;
    widget.classList.add('sm-wa-entered', 'sm-wa-dragging');
    putAt(pointer.left + dx, pointer.top + dy);
  });

  function finish(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (movedDuringGesture && widget.classList.contains('sm-wa-collapsed')) {
      ignoreClickAfterDrag = true;
    }
    widget.classList.remove('sm-wa-dragging');
    pointer = null;
    keepOnScreen();
  }
  widget.addEventListener('pointerup', finish);
  widget.addEventListener('pointercancel', finish);
  window.addEventListener('resize', keepOnScreen, { passive: true });
})();
