// node pruebas/test-alquiler.js — cálculos de alquiler, inflación y cuotas contra casos publicados
const A = require('../src/alquiler.js');
const datos = require('../docs/datos/indices.json');
let fallas = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallas++; console.log('✗', msg); } };
const cerca = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b}`);
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

// Datos de base que publicó el INDEC (informe del 13/10/2026) y el BCRA
eq([datos.ipc['2026-07'], datos.ipc['2026-08'], datos.ipc['2026-09']], [2.1, 1.7, 1.9], 'IPC jul-sep 2026');
eq([datos.ipc['2026-01'], datos.ipc['2026-02'], datos.ipc['2026-03'], datos.ipc['2026-04'], datos.ipc['2026-05'], datos.ipc['2026-06']], [2.9, 2.9, 3.4, 2.6, 2.1, 1.9], 'IPC ene-jun 2026');
eq([datos.icl['2022-07-01'], datos.icl['2023-07-01'], datos.icl['2023-01-01'], datos.icl['2024-01-01']], [2.23, 4.55, 3.12, 7.41], 'ICL de los ejemplos');

// Qué meses se toman (aumento del 1/11/2026)
eq(A.mesesIPC('2026-11-01', 3, 'publicado', datos), ['2026-07', '2026-08', '2026-09'], 'trimestral, últimos publicados');
eq(A.mesesIPC('2026-11-01', 3, 'calendario', datos), ['2026-08', '2026-09', '2026-10'], 'trimestral, meses calendario');
eq(A.mesesIPC('2026-11-13', 3, 'publicado', datos), ['2026-08', '2026-09', '2026-10'], 'después del 12/11 ya está octubre');
eq(A.mesesIPC('2026-11-12', 3, 'publicado', datos), ['2026-08', '2026-09', '2026-10'], 'el mismo día de publicación cuenta');

// Casos de El Cronista (14/10/2026): aumentos de noviembre 2026 por IPC
const caso = (frec) => A.ajustesContrato({ inicio: A.sumarMeses('2026-11-01', -frec), monto: 100000, frecuencia: frec, indice: 'ipc', criterio: 'publicado', hoy: '2026-11-01' }, datos).ajustes[0];
cerca(caso(3).porcentaje, 5.81, 0.005, 'trimestral nov-2026 = 5,81% (El Cronista)');
cerca(caso(4).porcentaje, 7.82, 0.005, 'cuatrimestral nov-2026 = 7,82% (El Cronista)');
cerca(caso(6).porcentaje, 12.95, 0.005, 'semestral nov-2026 = 12,95% (El Cronista)');
// 2,1 / 1,9 / 2,1 multiplicados = 6,22% (hormi.app publica 6,21%: redondeo suyo)
cerca((A.acumulado([2.1, 1.9, 2.1]) - 1) * 100, 6.2247379, 1e-6, 'acumulado 2,1-1,9-2,1 = 6,22%');
cerca((A.acumulado([2, 2, 2]) - 1) * 100, 6.12, 0.005, 'tres meses de 2% = 6,12%, no 6%');

// ICL: Mudafy ($100.000 de jul-2022 a jul-2023 = $204.036) e Inquilinos Agrupados (ene-2023 a ene-2024 = +137,5%)
const i1 = A.ajustesContrato({ inicio: '2022-07-01', monto: 100000, frecuencia: 12, indice: 'icl', duracion: 36, hoy: '2026-10-24' }, datos);
cerca(i1.ajustes[0].monto, 204035.87, 0.01, 'ICL jul-2022 → jul-2023 (Mudafy)');
eq(i1.ajustes.length, 2, 'contrato de 3 años con ICL: 2 ajustes');
const i2 = A.ajustesContrato({ inicio: '2023-01-01', monto: 100000, frecuencia: 12, indice: 'icl', hoy: '2024-06-01' }, datos);
cerca(i2.ajustes[0].porcentaje, 137.5, 0.005, 'ICL ene-2023 → ene-2024 = 137,5% (Inquilinos Agrupados)');
const i3 = A.ajustesContrato({ inicio: '2025-10-01', monto: 100000, frecuencia: 12, indice: 'icl', hoy: '2026-10-24' }, datos);
cerca(i3.ajustes[0].porcentaje, 31.68, 0.005, 'ICL oct-2025 → oct-2026 = 31,68% (ikiwi)');
// ICL de un día que no está: usa el último anterior
eq(A.icl('2099-01-01', datos), null, 'ICL futuro = no publicado');

// Contrato con varios ajustes: se encadenan
const c = A.ajustesContrato({ inicio: '2025-11-01', monto: 500000, frecuencia: 3, indice: 'ipc', criterio: 'publicado', hoy: '2026-10-24' }, datos);
eq(c.ajustes.map((a) => a.fecha), ['2026-02-01', '2026-05-01', '2026-08-01', '2026-11-01'], 'fechas de ajuste trimestral');
eq(c.ajustes.map((a) => a.estado), ['hecho', 'hecho', 'hecho', 'proximo'], 'estados');
eq(c.ajustes[0].meses.map((m) => m.mes), ['2025-10', '2025-11', '2025-12'], 'primer ajuste feb-2026 usa oct-dic 2025');
cerca(c.ajustes[0].porcentaje, (1.023 * 1.025 * 1.028 - 1) * 100, 1e-9, 'feb-2026: 2,3 · 2,5 · 2,8');
cerca(c.montoVigente, 500000 * A.acumulado([2.3, 2.5, 2.8, 2.9, 2.9, 3.4, 2.6, 2.1, 1.9]), 1e-6, 'monto vigente encadenado');
cerca(c.proximo.porcentaje, 5.81, 0.005, 'próximo aumento 1/11 = 5,81%');
// Aumento futuro que espera un IPC sin publicar
const p = A.ajustesContrato({ inicio: '2025-12-01', monto: 500000, frecuencia: 3, indice: 'ipc', criterio: 'publicado', hoy: '2026-10-24' }, datos);
const prox = p.ajustes[p.ajustes.length - 1];
eq([prox.fecha, prox.estado, prox.publicaEl], ['2026-12-01', 'pendiente', '2026-11-12'], 'aumento de diciembre espera el IPC de octubre (12/11)');
eq(p.proximo.fecha, '2026-12-01', 'próximo = diciembre');

// Régimen según fecha de firma
eq(A.regimen('2021-03-10').ley, '27.551', 'ley 27.551'); eq(A.regimen('2023-10-17').ley, '27.551', 'borde 17/10/2023');
eq(A.regimen('2023-10-18').ley, '27.737', 'ley 27.737'); eq(A.regimen('2023-12-22').ley, 'dudoso', 'transición');
eq(A.regimen('2023-12-29').ley, 'DNU 70/2023', 'DNU'); eq(A.regimen('2019-05-01').ley, 'anterior', 'anterior');

// Inflación: $100.000 de diciembre 2025 a septiembre 2026 = ene..sep
const inf = A.actualizarPorInflacion(100000, '2025-12', '2026-09', datos);
cerca(inf.resultado, 100000 * A.acumulado([2.9, 2.9, 3.4, 2.6, 2.1, 1.9, 2.1, 1.7, 1.9]), 1e-6, 'actualizar dic-2025 → sep-2026');
eq(inf.meses, 9, '9 meses');
cerca(A.actualizarPorInflacion(inf.resultado, '2026-09', '2025-12', datos).resultado, 100000, 1e-6, 'para atrás vuelve al original');
ok(!!A.actualizarPorInflacion(1, '2026-01', '2027-01', datos).error, 'mes sin IPC da error');
eq(A.actualizarPorInflacion(5, '2026-03', '2026-03', datos).resultado, 5, 'mismo mes = mismo monto');

// Cuotas o contado
const q1 = A.cuotasVsContado({ contado: 100000, cuotas: 6, valorCuota: 100000 / 6, inflacionMensual: 2 });
eq(q1.conviene, 'cuotas', 'cuotas sin interés con inflación: conviene cuotas');
cerca(q1.valorHoy, (100000 / 6) * ((1 - Math.pow(1.02, -6)) / 0.02), 1e-6, 'valor presente de 6 cuotas al 2%');
const q2 = A.cuotasVsContado({ contado: 100000, cuotas: 12, valorCuota: 12000, inflacionMensual: 1 });
eq(q2.conviene, 'contado', '44% de recargo con 1% de inflación: conviene contado');
cerca(q2.recargo, 44, 1e-9, 'recargo 44%');
eq(A.cuotasVsContado({ contado: 120, cuotas: 12, valorCuota: 10, inflacionMensual: 0, primeraHoy: true }).conviene, 'igual', 'sin inflación ni recargo = igual');

console.log(fallas ? `${fallas} de ${total} pruebas fallaron` : `${total} pruebas, 0 fallas`);
process.exit(fallas ? 1 : 0);
