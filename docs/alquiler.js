/*! alquiler.js · aumentos de alquiler, inflación y cuotas · MIT · Ignacio Pelliza */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Alquiler = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Todas las fechas son texto 'AAAA-MM-DD' y los meses 'AAAA-MM'.
  // `datos` es el contenido de datos/indices.json: { ipc: {'2026-09': 1.9, ...}, icl: {'2026-10-01': 36.54, ...}, publicacionIPC: {...} }

  const pad = (n) => String(n).padStart(2, '0');
  const mesDe = (f) => String(f).slice(0, 7);
  function sumarMeses(f, n) { // f puede ser fecha o mes
    const a = +f.slice(0, 4), m = +f.slice(5, 7) - 1 + n;
    const y = a + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    if (f.length === 7) return `${y}-${pad(mm + 1)}`;
    const ult = new Date(Date.UTC(y, mm + 1, 0)).getUTCDate();
    return `${y}-${pad(mm + 1)}-${pad(Math.min(+f.slice(8, 10), ult))}`;
  }
  const hoyAR = () => { const d = new Date(Date.now() - 3 * 3600e3); return d.toISOString().slice(0, 10); };

  // ---------- Qué ley rige el contrato ----------
  function regimen(fechaFirma) {
    const f = String(fechaFirma).slice(0, 10);
    if (f < '2020-07-01') return { ley: 'anterior', titulo: 'Contrato anterior a la Ley 27.551', indice: 'pactado', frecuencia: null,
      texto: 'Se rige por lo que diga el contrato (antes de julio de 2020 no había un índice obligatorio).' };
    if (f <= '2023-10-17') return { ley: '27.551', titulo: 'Ley 27.551', indice: 'icl', frecuencia: 12, duracion: 36,
      texto: 'Ajuste una vez por año con el ICL del Banco Central. Contrato de 3 años.' };
    if (f < '2023-12-21') return { ley: '27.737', titulo: 'Ley 27.737', indice: 'casa-propia', frecuencia: 6, duracion: 36,
      texto: 'Ajuste cada 6 meses con el coeficiente Casa Propia. Contrato de 3 años.' };
    if (f < '2023-12-29') return { ley: 'dudoso', titulo: 'Fecha de transición', indice: 'pactado', frecuencia: null, dudoso: true,
      texto: 'Firmado entre el 21 y el 28 de diciembre de 2023: el DNU 70/2023 ya estaba publicado pero no regía. Lo que aplica no está claro; conviene consultarlo con un abogado.' };
    return { ley: 'DNU 70/2023', titulo: 'DNU 70/2023', indice: 'pactado', frecuencia: null,
      texto: 'Libre: el índice (IPC, ICL u otro), cada cuánto aumenta y la duración son los que figuran en tu contrato.' };
  }

  // ---------- IPC ----------
  // Día en que el INDEC publica el IPC de un mes (si no está en el calendario, el 15 del mes siguiente).
  const publicacion = (mes, datos) => (datos.publicacionIPC && datos.publicacionIPC[mes]) || sumarMeses(mes, 1) + '-15';
  const ultimoIPC = (datos) => Object.keys(datos.ipc).sort().pop();
  // Meses de IPC que se toman para un ajuste.
  //  'publicado': los últimos n IPC ya publicados el día del ajuste (lo más común: aumento de noviembre = jul, ago, sep).
  //  'calendario': los n meses completos anteriores al ajuste (aumento de noviembre = ago, sep, oct).
  function mesesIPC(fechaAjuste, n, criterio, datos) {
    let fin;
    if (criterio === 'calendario') fin = sumarMeses(mesDe(fechaAjuste), -1);
    else { fin = sumarMeses(mesDe(fechaAjuste), -1); while (publicacion(fin, datos) > fechaAjuste) fin = sumarMeses(fin, -1); }
    const meses = []; for (let i = n - 1; i >= 0; i--) meses.push(sumarMeses(fin, -i));
    return meses;
  }
  function acumulado(variaciones) { return variaciones.reduce((f, v) => f * (1 + v / 100), 1); }

  // ---------- ICL ----------
  // Valor del ICL de un día; si ese día no está, el último anterior. null si todavía no se publicó.
  function icl(fecha, datos) {
    if (datos.icl[fecha] != null) return { fecha, valor: datos.icl[fecha] };
    const dias = Object.keys(datos.icl).sort();
    if (!dias.length || fecha > dias[dias.length - 1]) return null;
    let i = dias.length - 1; while (i >= 0 && dias[i] > fecha) i--;
    return i >= 0 ? { fecha: dias[i], valor: datos.icl[dias[i]] } : null;
  }

  // ---------- Contrato completo ----------
  // o = { inicio, monto, frecuencia (meses), indice: 'ipc' | 'icl', criterio, duracion (meses, opcional), hoy (opcional) }
  function ajustesContrato(o, datos) {
    const frec = Math.max(1, Math.round(o.frecuencia || 12)), hoy = o.hoy || hoyAR();
    const fin = o.duracion ? sumarMeses(o.inicio, o.duracion) : null;
    if (!(o.monto > 0)) throw new Error('El monto tiene que ser mayor a cero');
    const ajustes = []; let monto = o.monto, anterior = o.inicio, siguientes = 0;
    for (let k = 1; k <= 240; k++) {
      const fecha = sumarMeses(o.inicio, frec * k);
      if (fin && fecha >= fin) break;
      const a = { numero: k, fecha, montoAnterior: monto };
      if (o.indice === 'icl') {
        const desde = icl(anterior, datos), hasta = icl(fecha, datos);
        if (!desde || !hasta) { a.estado = 'pendiente'; a.motivo = 'Todavía no está publicado el ICL de esa fecha.'; }
        else { a.desde = desde; a.hasta = hasta; a.factor = hasta.valor / desde.valor; }
      } else {
        const meses = mesesIPC(fecha, frec, o.criterio || 'publicado', datos);
        a.meses = meses.map((m) => ({ mes: m, valor: datos.ipc[m] != null ? datos.ipc[m] : null, publica: publicacion(m, datos) }));
        const falta = a.meses.filter((x) => x.valor == null);
        if (falta.length) { a.estado = 'pendiente'; a.motivo = `Falta el IPC de ${falta.map((x) => nombreMes(x.mes)).join(', ')}.`; a.publicaEl = falta[falta.length - 1].publica; }
        else a.factor = acumulado(a.meses.map((x) => x.valor));
      }
      if (a.factor) { a.porcentaje = (a.factor - 1) * 100; a.monto = monto * a.factor; monto = a.monto; a.estado = fecha <= hoy ? 'hecho' : 'proximo'; }
      ajustes.push(a); anterior = fecha;
      if (fecha > hoy) { siguientes++; if (siguientes >= 1) break; }
      if (a.estado === 'pendiente') break;
    }
    const vigente = [...ajustes].reverse().find((a) => a.monto && a.fecha <= hoy);
    const proximo = ajustes.find((a) => a.fecha > hoy);
    return { ajustes, montoVigente: vigente ? vigente.monto : o.monto, proximo: proximo || null,
      totalPorcentaje: ((vigente ? vigente.monto : o.monto) / o.monto - 1) * 100, fin };
  }

  // ---------- Inflación ----------
  // Cuánto equivale hoy un monto de otro mes: se multiplican los IPC de los meses posteriores, hasta el mes destino inclusive.
  function actualizarPorInflacion(monto, desdeMes, hastaMes, datos) {
    if (hastaMes < desdeMes) { const r = actualizarPorInflacion(1, hastaMes, desdeMes, datos); return Object.assign(r, { resultado: monto / r.factor, factor: 1 / r.factor, porcentaje: (1 / r.factor - 1) * 100 }); }
    const meses = []; for (let m = sumarMeses(desdeMes, 1); m <= hastaMes; m = sumarMeses(m, 1)) meses.push(m);
    const falta = meses.filter((m) => datos.ipc[m] == null);
    if (falta.length) return { error: `Todavía no hay IPC de ${falta.map(nombreMes).join(', ')}.`, falta };
    const factor = acumulado(meses.map((m) => datos.ipc[m]));
    return { resultado: monto * factor, factor, porcentaje: (factor - 1) * 100, meses: meses.length };
  }

  // ---------- Cuotas o contado ----------
  // Trae las cuotas a valor de hoy descontando la inflación mensual que esperás.
  function cuotasVsContado(o) {
    const n = Math.round(o.cuotas), i = (o.inflacionMensual || 0) / 100;
    if (!(o.contado > 0) || !(n >= 1) || !(o.valorCuota > 0)) throw new Error('Faltan datos');
    let vp = 0; for (let k = 0; k < n; k++) vp += o.valorCuota / Math.pow(1 + i, k + (o.primeraHoy ? 0 : 1));
    const total = o.valorCuota * n;
    return { totalCuotas: total, recargo: (total / o.contado - 1) * 100, valorHoy: vp,
      diferencia: o.contado - vp, conviene: vp < o.contado - 0.005 ? 'cuotas' : vp > o.contado + 0.005 ? 'contado' : 'igual' };
  }

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function nombreMes(m, conAnio) { const s = MESES[+m.slice(5, 7) - 1]; return conAnio ? `${s} ${m.slice(0, 4)}` : s; }

  return { regimen, mesesIPC, acumulado, icl, ajustesContrato, actualizarPorInflacion, cuotasVsContado, publicacion, ultimoIPC,
    sumarMeses, nombreMes, hoyAR };
});
