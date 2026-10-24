/* Tabla "cuánto aumentan los alquileres" para los próximos meses. La usan la página (en el navegador)
   y scripts/generar-aumentos.js (para dejarla escrita en el HTML y que Google la lea). */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica;
  else raiz.TablaAumentos = fabrica;
})(typeof self !== 'undefined' ? self : this, function (A, datos, hoy) {
  'use strict';
  const pct = (n) => '+' + n.toFixed(2).replace('.', ',') + '%';
  const fAR = (f) => f.slice(8, 10) + '/' + f.slice(5, 7);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mesHoy = +hoy.slice(8, 10) >= 16 ? A.sumarMeses(hoy.slice(0, 7), 1) : hoy.slice(0, 7); // pasada la mitad de mes, interesa el que viene
  const meses = [mesHoy, A.sumarMeses(mesHoy, 1), A.sumarMeses(mesHoy, 2)];
  const filas = [['Trimestral', 3], ['Cuatrimestral', 4], ['Semestral', 6], ['Anual', 12]];
  const bloques = meses.map((mes) => {
    const fecha = mes + '-01';
    const celdas = filas.map(([nombre, n]) => {
      const ms = A.mesesIPC(fecha, n, 'publicado', datos);
      const falta = ms.filter((m) => datos.ipc[m] == null);
      if (falta.length) {
        const ult = falta[falta.length - 1];
        return `<tr><td>${nombre} (IPC)</td><td>Se sabe el ${fAR(A.publicacion(ult, datos))}<small>falta el IPC de ${A.nombreMes(ult)}</small></td></tr>`;
      }
      const p = (A.acumulado(ms.map((m) => datos.ipc[m])) - 1) * 100;
      const det = ms.length <= 4 ? ms.map((m) => `${A.nombreMes(m).slice(0, 3)} ${String(datos.ipc[m]).replace('.', ',')}%`).join(' · ') : `${A.nombreMes(ms[0])} a ${A.nombreMes(ms[ms.length - 1], true)}`;
      return `<tr><td>${nombre} (IPC)</td><td><b>${pct(p)}</b><small>${esc(det)}</small></td></tr>`;
    });
    const i1 = A.icl(fecha, datos), i0 = A.icl(A.sumarMeses(fecha, -12), datos);
    celdas.push(i1 && i1.fecha === fecha && i0
      ? `<tr><td>Anual (ICL)</td><td><b>${pct((i1.valor / i0.valor - 1) * 100)}</b><small>ICL ${String(i0.valor).replace('.', ',')} → ${String(i1.valor).replace('.', ',')}</small></td></tr>`
      : `<tr><td>Anual (ICL)</td><td>Todavía no publicado</td></tr>`);
    return `<h2>Si tu alquiler aumenta el 1 de ${A.nombreMes(mes, true)}</h2><table class="detalle">${celdas.join('')}</table>`;
  });
  const titulo = `Aumento de alquileres en ${A.nombreMes(meses[0])} y ${A.nombreMes(meses[1], true)}: cuánto sube por IPC e ICL`;
  return { titulo, h1: `Cuánto aumentan los alquileres en ${A.nombreMes(meses[0])} y ${A.nombreMes(meses[1], true)}`, html: bloques.join('') };
});
