/* SOLUCAR MÁS · WhatsApp flotante V3 (2026-11-07).
   Una sola burbuja en estado minimizado: logo nítido, centrado y arrastrable. */
(function () {
  'use strict';
  if (document.getElementById('sm-wa-widget')) return;

  const phone = '56922524480';
  const link = 'https://wa.me/' + phone;
  const key = 'solucarmas-whatsapp-minimizado';

  // El logo se carga como imagen SVG aislada: las reglas CSS generales del sitio
  // ya no pueden deformar su trazado, tamaño ni grosor.
  const whatsappLogo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTIwLjUyIDMuNDhBMTEuODUgMTEuODUgMCAwIDAgMTIuMDQgMEM1LjQ1IDAgLjA4IDUuMzYuMDggMTEuOTVjMCAyLjExLjU1IDQuMTYgMS42IDUuOThMMCAyNGw2LjIyLTEuNjNhMTEuOSAxMS45IDAgMCAwIDUuODIgMS40OGguMDFDMTguNjMgMjMuODUgMjQgMTguNDkgMjQgMTEuOWExMS44NCAxMS44NCAwIDAgMC0zLjQ4LTguNDJaTTEyLjA0IDIxLjgzYTkuOTEgOS45MSAwIDAgMS01LjA2LTEuMzhsLS4zNy0uMjItMy43Ni45OSAxLTMuNjctLjI1LS4zOGE5LjkzIDkuOTMgMCAwIDEtMS41Mi01LjIyYzAtNS40OCA0LjQ3LTkuOTQgOS45Ny05Ljk0YTkuOSA5LjkgMCAwIDEgNy4wMyAyLjkyIDkuOSA5LjkgMCAwIDEgMi45MiA3LjAyYzAgNS40OC00LjQ3IDkuOTQtOS45NiA5Ljk0Wm01LjQ1LTcuNDVjLS4zLS4xNS0xLjc3LS44Ny0yLjA0LS45Ny0uMjctLjEtLjQ3LS4xNS0uNjcuMTVzLS43Ny45Ny0uOTQgMS4xNy0uMzUuMjItLjY0LjA4YTguMTcgOC4xNyAwIDAgMS0yLjQtMS40OSA4Ljk5IDguOTkgMCAwIDEtMS42Ny0yLjA4Yy0uMTgtLjMtLjAyLS40Ni4xMy0uNjEuMTMtLjEzLjI5LS4zNS40NC0uNTIuMTUtLjE3LjItLjMuMy0uNS4xLS4yLjA1LS4zOC0uMDMtLjUzLS4wNy0uMTUtLjY2LTEuNi0uOS0yLjE5LS4yNC0uNTctLjQ4LS40OS0uNjctLjVoLS41N2MtLjIgMC0uNTIuMDctLjguMzdzLTEuMDUgMS4wMy0xLjA1IDIuNSAxLjA4IDIuOSAxLjIzIDMuMWExMS40NCAxMS40NCAwIDAgMCA0LjQgMy45OSAzLjk5IDAgMCAwIDIuNjguNThjLjgyLS4xMiAxLjc3LS43MiAyLjAyLTEuNDIuMjUtLjcuMjUtMS4zLjE4LTEuNDItLjA4LS4xMi0uMjgtLjItLjU4LS4zNVoiLz48L3N2Zz4=';
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
