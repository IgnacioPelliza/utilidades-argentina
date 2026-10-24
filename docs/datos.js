/* Carga los índices: primero el archivo del sitio (siempre disponible) y después, en segundo plano,
   pregunta a las fuentes oficiales por si salió un dato nuevo hoy. Solo agrega datos nuevos; nunca cambia los viejos. */
(function () {
  'use strict';
  const fmt = (n, dec = 0) => window.Argentina.formatearPesos(n, dec);
  const pct = (n, dec = 2) => n.toFixed(dec).replace('.', ',') + '%';
  const fechaAR = (f) => f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4);

  async function frescos(datos) {
    const nuevos = { ipc: 0, icl: 0 };
    try {
      const r = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion', { cache: 'no-store' });
      if (r.ok) for (const x of (await r.json()).slice(-6)) { const m = x.fecha.slice(0, 7); const v = Math.round(x.valor * 10) / 10;
        if (datos.ipc[m] == null && v > -5 && v < 30 && m > Object.keys(datos.ipc).sort().pop()) { datos.ipc[m] = v; nuevos.ipc++; } }
    } catch (e) { /* sin conexión o fuente caída: seguimos con el archivo */ }
    try {
      const ult = Object.keys(datos.icl).sort().pop(), hoy = window.Alquiler.hoyAR();
      const desde = ult < hoy ? ult : hoy; // el Banco Central no acepta una fecha "desde" futura
      const r = await fetch(`https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40?desde=${desde}&hasta=2035-12-31&limit=3000`, { cache: 'no-store' });
      if (r.ok) for (const x of (await r.json()).results[0].detalle) if (datos.icl[x.fecha] == null && x.valor > 0) { datos.icl[x.fecha] = x.valor; nuevos.icl++; }
    } catch (e) { /* idem */ }
    return nuevos;
  }

  async function cargar(alActualizar) {
    const datos = await (await fetch('datos/indices.json')).json();
    frescos(datos).then((n) => { if ((n.ipc || n.icl) && alActualizar) alActualizar(datos); });
    return datos;
  }

  function fuentes(datos) {
    const A = window.Alquiler, ui = A.ultimoIPC(datos), ul = Object.keys(datos.icl).sort().pop();
    return `Datos: IPC del INDEC hasta ${A.nombreMes(ui, true)} · ICL del Banco Central hasta el ${fechaAR(ul)}.`;
  }

  // Copia al portapapeles con aviso en el botón
  function copiar(texto, boton, ok = 'Copiado') {
    const listo = () => { const t = boton.textContent; boton.textContent = ok; setTimeout(() => (boton.textContent = t), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(listo, () => prompt('Copiá esto:', texto));
    else prompt('Copiá esto:', texto);
  }
  // Lee y escribe el estado en el link (después del #, no viaja a ningún servidor)
  const leerLink = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  const escribirLink = (o) => history.replaceState(null, '', '#' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString());
  const numero = (v) => { v = String(v || '').trim(); if (!v) return NaN; return v.includes(',') || /\.\d{3}/.test(v) ? window.Argentina.leerPesos(v) : Number(v); };

  window.Datos = { cargar, fuentes, fmt, pct, fechaAR, copiar, leerLink, escribirLink, numero };

  // Botón "copiar alias" del pie
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-copiar]'); if (b) copiar(b.getAttribute('data-copiar'), b, 'Alias copiado'); });
})();
