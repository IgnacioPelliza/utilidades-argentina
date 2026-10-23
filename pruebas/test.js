// node pruebas/test.js — compara JS y Python con los mismos casos
const A = require('../src/argentina.js');
const { execFileSync } = require('child_process');
let fallas = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallas++; console.log('✗', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

// CUIT
eq(A.validarCuit('20-12345678-0'), false, 'cuit con dígito mal');
eq(A.cuitDesdeDni('20123456'), '20-20123456-6', 'cuit desde dni');
eq(A.validarCuit('20201234566'), true, 'cuit sin guiones');
eq(A.validarCuit('99-20123456-6'), false, 'prefijo inexistente');
eq(A.validarCuit('abc'), false, 'texto');
for (let i = 0; i < 3000; i++) { const dni = String(1000000 + i * 31337); for (const t of ['masculino', 'femenino', 'empresa']) ok(A.validarCuit(A.cuitDesdeDni(dni, t)), `generado válido ${dni} ${t}`); }
// CBU: armamos uno con el algoritmo y lo rompemos
const bloque = (d, p) => (10 - (p.reduce((s, x, i) => s + x * +d[i], 0) % 10)) % 10;
const armar = (banco, suc, cuenta) => { const b1 = banco + suc; const b2 = cuenta; return b1 + bloque(b1, [7, 1, 3, 9, 7, 1, 3]) + b2 + bloque(b2, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]); };
const cbu = armar('0110', '599', '4000000123456'.slice(0, 13));
eq(A.analizarCbu(cbu).valido, true, 'cbu armado válido');
eq(A.analizarCbu(cbu).banco, 'Banco de la Nación Argentina', 'banco del cbu');
eq(A.validarCbu(cbu.slice(0, 21) + ((+cbu[21] + 1) % 10)), false, 'cbu con último dígito mal');
eq(A.validarCbu(cbu.slice(0, 7) + ((+cbu[7] + 1) % 10) + cbu.slice(8)), false, 'cbu con primer bloque mal');
eq(A.analizarCbu('123').motivo, 'Tiene que tener 22 dígitos', 'largo');
const cvu = armar('0000', '003', '1000012345678');
eq(A.analizarCbu(cvu).tipo, 'CVU', 'cvu');
// letras
const L = { 0: 'cero', 1: 'uno', 16: 'dieciséis', 21: 'veintiuno', 30: 'treinta', 31: 'treinta y uno', 100: 'cien', 101: 'ciento uno',
  555: 'quinientos cincuenta y cinco', 1000: 'mil', 1001: 'mil uno', 2021: 'dos mil veintiuno', 21000: 'veintiún mil',
  31000: 'treinta y un mil', 100000: 'cien mil', 101000: 'ciento un mil', 1000000: 'un millón', 2500000: 'dos millones quinientos mil',
  1000000000: 'mil millones', 21000000: 'veintiún millones', 1000000000000: 'un billón' };
for (const [n, s] of Object.entries(L)) eq(A.numeroALetras(+n), s, 'letras ' + n);
eq(A.numeroALetras(1, { moneda: 'pesos' }), 'un peso con 00/100', 'un peso');
eq(A.numeroALetras(21, { moneda: 'pesos' }), 'veintiún pesos con 00/100', 'veintiún pesos');
eq(A.numeroALetras(3000000, { moneda: 'pesos' }), 'tres millones de pesos con 00/100', 'millones de pesos');
eq(A.numeroALetras(1234.5, { moneda: 'pesos', centavos: 'letras' }), 'mil doscientos treinta y cuatro pesos con cincuenta centavos', 'centavos en letras');
eq(A.numeroALetras('1.234,56', { moneda: 'pesos', mayusculas: true }), 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS CON 56/100', 'texto y mayúsculas');
// pesos
eq(A.formatearPesos(1234567.5), '$ 1.234.567,50', 'formato');
eq(A.formatearPesos(-50, 0), '-$ 50', 'negativo');
eq(A.leerPesos('$ 1.234,56'), 1234.56, 'leer');
// feriados
eq(A.pascua(2024), '2024-03-31', 'pascua 2024'); eq(A.pascua(2026), '2026-04-05', 'pascua 2026'); eq(A.pascua(2027), '2027-03-28', 'pascua 2027');
const f26 = A.feriados(2026).map((x) => x.fecha);
for (const d of ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-15', '2026-08-17', '2026-10-12', '2026-11-23']) ok(f26.includes(d), 'feriado 2026 ' + d);
eq(A.esDiaHabil('2026-10-23'), true, 'viernes hábil'); eq(A.esDiaHabil('2026-10-24'), false, 'sábado');
eq(A.sumarDiasHabiles('2026-12-23', 2), '2026-12-28', 'hábiles con navidad');
eq(A.sumarDiasHabiles('2026-12-28', -2), '2026-12-23', 'hábiles hacia atrás');

// Python tiene que dar lo mismo
const py = `
import sys, json; sys.path.insert(0, 'python'); import argentina as A
casos = json.loads(sys.stdin.read())
out = {
 'cuit': [A.cuit_desde_dni(d, t) for d, t in casos['dni']],
 'letras': [A.numero_a_letras(n) for n in casos['nums']],
 'pesos': [A.numero_a_letras(n, moneda='pesos', centavos='letras') for n in casos['nums']],
 'fmt': [A.formatear_pesos(n) for n in casos['nums']],
 'feriados': [A.feriados(a) for a in casos['anios']],
 'cbu': [A.analizar_cbu(c) for c in casos['cbus']],
 'habiles': [A.sumar_dias_habiles(f, n) for f, n in casos['habiles']],
}
print(json.dumps(out, ensure_ascii=False))`;
const nums = [0, 1, 7.25, 21, 99, 100, 101, 999, 1000, 1001, 21000, 21001, 99999, 100000, 999999.99, 1000000, 1000001, 21000000, 123456789.07, 1000000000, 999999999999.99];
for (let i = 0; i < 300; i++) nums.push(Math.round(((i * 7919) % 100000) * 1013.37) / 100);
const casos = { dni: [], nums, anios: [], cbus: [cbu, cvu, '123', cbu.slice(0, 21) + '0'], habiles: [] };
for (let i = 0; i < 200; i++) casos.dni.push([String(1000000 + i * 4999), ['masculino', 'femenino', 'empresa'][i % 3]]);
for (let a = 2000; a <= 2060; a++) casos.anios.push(a);
for (let i = 0; i < 60; i++) casos.habiles.push([`2026-${String(1 + (i % 12)).padStart(2, '0')}-1${i % 9}`, (i % 15) - 5]);
const r = JSON.parse(execFileSync('python3', ['-c', py], { input: JSON.stringify(casos), encoding: 'utf8' }));
eq(r.cuit, casos.dni.map(([d, t]) => A.cuitDesdeDni(d, t)), 'python = js (cuit)');
eq(r.letras, nums.map((n) => A.numeroALetras(n)), 'python = js (letras)');
eq(r.pesos, nums.map((n) => A.numeroALetras(n, { moneda: 'pesos', centavos: 'letras' })), 'python = js (pesos en letras)');
eq(r.fmt, nums.map((n) => A.formatearPesos(n)), 'python = js (formato)');
eq(r.feriados, casos.anios.map((a) => A.feriados(a)), 'python = js (feriados 2000-2060)');
eq(r.cbu, casos.cbus.map((c) => A.analizarCbu(c)), 'python = js (cbu)');
eq(r.habiles, casos.habiles.map(([f, n]) => A.sumarDiasHabiles(f, n)), 'python = js (hábiles)');
console.log(fallas ? `${fallas} de ${total} pruebas fallaron` : `${total} pruebas, 0 fallas`);
process.exit(fallas ? 1 : 0);
