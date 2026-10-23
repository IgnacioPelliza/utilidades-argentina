/*! utilidades-argentina · MIT · Ignacio Pelliza · https://github.com/IgnacioPelliza/utilidades-argentina */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Argentina = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const soloDigitos = (v) => String(v == null ? '' : v).replace(/\D/g, '');

  // ---------- CUIT / CUIL ----------
  const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const PREFIJOS = ['20', '23', '24', '25', '26', '27', '30', '33', '34'];
  function digitoCuit(diez) {
    const d = soloDigitos(diez);
    if (d.length !== 10) throw new Error('Se necesitan los 10 primeros dígitos');
    const suma = PESOS_CUIT.reduce((s, p, i) => s + p * +d[i], 0);
    const r = 11 - (suma % 11);
    return r === 11 ? 0 : r; // 10 = no válido con ese prefijo
  }
  function validarCuit(cuit) {
    const d = soloDigitos(cuit);
    if (d.length !== 11 || !PREFIJOS.includes(d.slice(0, 2))) return false;
    const dv = digitoCuit(d.slice(0, 10));
    return dv !== 10 && dv === +d[10];
  }
  function formatearCuit(cuit) {
    const d = soloDigitos(cuit);
    return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : String(cuit);
  }
  // tipo: 'masculino' | 'femenino' | 'empresa'
  function cuitDesdeDni(dni, tipo = 'masculino') {
    let d = soloDigitos(dni);
    if (!d || d.length > 8) throw new Error('DNI no válido');
    d = d.padStart(8, '0');
    let pre = { masculino: '20', femenino: '27', empresa: '30' }[tipo];
    if (!pre) throw new Error("tipo debe ser 'masculino', 'femenino' o 'empresa'");
    let dv = digitoCuit(pre + d);
    if (dv === 10) {
      if (tipo === 'empresa') { pre = '33'; dv = digitoCuit(pre + d); }
      else { pre = '23'; dv = tipo === 'masculino' ? 9 : 4; }
    }
    return formatearCuit(pre + d + dv);
  }

  // ---------- CBU / CVU ----------
  const BANCOS = { '007': 'Banco de Galicia', '011': 'Banco de la Nación Argentina', '014': 'Banco de la Provincia de Buenos Aires',
    '015': 'ICBC', '017': 'BBVA', '027': 'Banco Supervielle', '029': 'Banco Ciudad', '034': 'Banco Patagonia',
    '044': 'Banco Hipotecario', '045': 'Banco de San Juan', '072': 'Banco Santander', '143': 'Brubank', '150': 'HSBC',
    '191': 'Banco Credicoop', '285': 'Banco Macro' };
  const dvBloque = (digs, pesos) => (10 - (pesos.reduce((s, p, i) => s + p * +digs[i], 0) % 10)) % 10;
  function analizarCbu(valor) {
    const d = soloDigitos(valor);
    const r = { valido: false, tipo: null, banco: null, motivo: '' };
    if (d.length !== 22) { r.motivo = 'Tiene que tener 22 dígitos'; return r; }
    const b1 = d.slice(0, 8), b2 = d.slice(8);
    if (dvBloque(b1, [7, 1, 3, 9, 7, 1, 3]) !== +b1[7]) { r.motivo = 'Falla el dígito verificador del primer bloque'; return r; }
    if (dvBloque(b2, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) !== +b2[13]) { r.motivo = 'Falla el dígito verificador del segundo bloque'; return r; }
    r.valido = true;
    r.tipo = d.startsWith('000') ? 'CVU' : 'CBU';
    r.banco = r.tipo === 'CVU' ? 'Billetera virtual (CVU)' : (BANCOS[d.slice(0, 3)] || null);
    return r;
  }
  const validarCbu = (v) => analizarCbu(v).valido;

  // ---------- Números a letras ----------
  const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece',
    'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
    'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  function menorMil(n) {
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100), r = n % 100;
    let s = C[c];
    if (r) s += (s ? ' ' : '') + (r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : ''));
    return s;
  }
  // 'uno' -> 'un' delante de un sustantivo ("veintiún mil", "un millón")
  const apocope = (s) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
  function enteroALetras(n) {
    if (n === 0) return 'cero';
    const partes = [];
    const billones = Math.floor(n / 1e12), millones = Math.floor((n % 1e12) / 1e6), miles = Math.floor((n % 1e6) / 1e3), resto = n % 1e3;
    if (billones) partes.push(billones === 1 ? 'un billón' : apocope(enteroALetras(billones)) + ' billones');
    if (millones) {
      // millones puede ser hasta 999.999 (p. ej. "mil millones")
      partes.push(millones === 1 ? 'un millón' : apocope(enteroALetras(millones)) + ' millones');
    }
    if (miles) partes.push(miles === 1 ? 'mil' : apocope(menorMil(miles)) + ' mil');
    if (resto) partes.push(menorMil(resto));
    return partes.join(' ');
  }
  // opciones: { moneda: 'pesos', centavos: 'fraccion' | 'letras', mayusculas: false }
  function numeroALetras(valor, opciones = {}) {
    const o = Object.assign({ moneda: '', centavos: 'fraccion', mayusculas: false }, opciones);
    const num = typeof valor === 'string' ? Number(valor.replace(/\./g, '').replace(',', '.')) : Number(valor);
    if (!Number.isFinite(num) || num < 0 || num >= 1e15) throw new Error('Número fuera de rango (0 a 999.999.999.999.999)');
    const cent = Math.round(num * 100);
    const ent = Math.floor(cent / 100), dec = cent % 100;
    let s = enteroALetras(ent);
    if (o.moneda) {
      if (ent === 1) s = 'un ' + o.moneda.replace(/s$/, '');
      else s = apocope(s) + ((ent % 1e6 === 0 && ent >= 1e6) ? ' de ' : ' ') + o.moneda;
    }
    if (dec || o.moneda) {
      if (o.centavos === 'letras') { if (dec) s += ' con ' + (dec === 1 ? 'un centavo' : apocope(enteroALetras(dec)) + ' centavos'); }
      else s += ' con ' + String(dec).padStart(2, '0') + '/100';
    }
    return o.mayusculas ? s.toUpperCase() : s;
  }

  // ---------- Pesos ----------
  function formatearPesos(valor, decimales = 2) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return '';
    const signo = n < 0 ? '-' : '';
    const [e, d] = Math.abs(n).toFixed(decimales).split('.');
    return `${signo}$ ${e.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${d ? ',' + d : ''}`;
  }
  function leerPesos(texto) {
    const s = String(texto).replace(/[^\d,.-]/g, '');
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  // ---------- Feriados nacionales (Ley 27.399) ----------
  function pascua(anio) { // algoritmo de Meeus/Jones/Butcher
    const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(anio, mes - 1, dia));
  }
  const iso = (f) => f.toISOString().slice(0, 10);
  const mas = (f, dias) => new Date(f.getTime() + dias * 864e5);
  const fecha = (a, m, d) => new Date(Date.UTC(a, m - 1, d));
  function trasladar(f) { // martes/miércoles -> lunes anterior; jueves/viernes -> lunes siguiente
    const w = f.getUTCDay();
    if (w === 2 || w === 3) return mas(f, -(w - 1));
    if (w === 4 || w === 5) return mas(f, 8 - w);
    return f;
  }
  function feriados(anio) {
    const p = pascua(anio);
    const lista = [
      [fecha(anio, 1, 1), 'Año Nuevo', 'inamovible'],
      [mas(p, -48), 'Carnaval', 'inamovible'],
      [mas(p, -47), 'Carnaval', 'inamovible'],
      [fecha(anio, 3, 24), 'Día Nacional de la Memoria por la Verdad y la Justicia', 'inamovible'],
      [fecha(anio, 4, 2), 'Día del Veterano y de los Caídos en la Guerra de Malvinas', 'inamovible'],
      [mas(p, -2), 'Viernes Santo', 'inamovible'],
      [fecha(anio, 5, 1), 'Día del Trabajador', 'inamovible'],
      [fecha(anio, 5, 25), 'Día de la Revolución de Mayo', 'inamovible'],
      [trasladar(fecha(anio, 6, 17)), 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes', 'trasladable'],
      [fecha(anio, 6, 20), 'Paso a la Inmortalidad del Gral. Manuel Belgrano', 'inamovible'],
      [fecha(anio, 7, 9), 'Día de la Independencia', 'inamovible'],
      [trasladar(fecha(anio, 8, 17)), 'Paso a la Inmortalidad del Gral. José de San Martín', 'trasladable'],
      [trasladar(fecha(anio, 10, 12)), 'Día del Respeto a la Diversidad Cultural', 'trasladable'],
      [trasladar(fecha(anio, 11, 20)), 'Día de la Soberanía Nacional', 'trasladable'],
      [fecha(anio, 12, 8), 'Inmaculada Concepción de María', 'inamovible'],
      [fecha(anio, 12, 25), 'Navidad', 'inamovible'],
    ];
    return lista.map(([f, nombre, tipo]) => ({ fecha: iso(f), nombre, tipo })).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
  const aIso = (f) => (f instanceof Date ? iso(new Date(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()))) : String(f).slice(0, 10));
  function esFeriado(f) { const s = aIso(f); return feriados(+s.slice(0, 4)).find((x) => x.fecha === s) || null; }
  function esDiaHabil(f) { const s = aIso(f); const w = new Date(s + 'T00:00:00Z').getUTCDay(); return w !== 0 && w !== 6 && !esFeriado(s); }
  function sumarDiasHabiles(f, n) {
    let d = new Date(aIso(f) + 'T00:00:00Z'); const paso = n < 0 ? -1 : 1; let falta = Math.abs(n);
    while (falta > 0) { d = mas(d, paso); if (esDiaHabil(iso(d))) falta--; }
    return iso(d);
  }

  // ---------- Laboral (Ley de Contrato de Trabajo 20.744, con la Ley 27.802 de 2026) ----------
  // Todo es una estimación: el convenio colectivo y cada caso pueden cambiar el resultado.
  const r2 = (n) => Math.round(n * 100) / 100;
  const D0 = (s) => new Date(aIso(s) + 'T00:00:00Z');
  const diasEntre = (a, b) => Math.round((D0(b) - D0(a)) / 864e5); // b - a
  const masMeses = (f, m) => { const d = D0(f); const dia = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + m);
    const ult = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(dia, ult)); return iso(d); };
  const diasDelMes = (f) => { const d = D0(f); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); };
  const diasDelAnio = (a) => (a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0) ? 366 : 365);
  function chequear(n, nombre) { if (!Number.isFinite(n) || n < 0) throw new Error(nombre + ' tiene que ser un número positivo'); }
  function antiguedad(ingreso, egreso) { // años, meses y días completos
    if (aIso(egreso) < aIso(ingreso)) throw new Error('La fecha de egreso es anterior al ingreso');
    let meses = 0; while (masMeses(ingreso, meses + 1) <= aIso(egreso)) meses++;
    return { anios: Math.floor(meses / 12), meses: meses % 12, dias: diasEntre(masMeses(ingreso, meses), egreso) };
  }
  // Aguinaldo (SAC): la mitad del mejor sueldo del semestre, proporcional a los días trabajados.
  function aguinaldo(mejorSueldo, o = {}) {
    chequear(mejorSueldo, 'El sueldo');
    const anio = o.anio || +(o.egreso || aIso(new Date())).slice(0, 4), sem = o.semestre || 1;
    const ini = sem === 1 ? `${anio}-01-01` : `${anio}-07-01`, fin = sem === 1 ? `${anio}-06-30` : `${anio}-12-31`;
    const desde = o.ingreso && aIso(o.ingreso) > ini ? aIso(o.ingreso) : ini, hasta = o.egreso && aIso(o.egreso) < fin ? aIso(o.egreso) : fin;
    const total = diasEntre(ini, fin) + 1, trabajados = Math.max(0, diasEntre(desde, hasta) + 1);
    return { semestre: sem, anio, diasSemestre: total, diasTrabajados: trabajados, completo: r2(mejorSueldo / 2), monto: r2(mejorSueldo / 2 * trabajados / total) };
  }
  // Vacaciones (arts. 150, 153 y 155): días por antigüedad al 31/12 y pago = sueldo / 25 por día.
  function diasVacaciones(ingreso, anio) {
    const a = antiguedad(ingreso, `${anio}-12-31`).anios;
    const dias = a < 5 ? 14 : a < 10 ? 21 : a < 20 ? 28 : 35;
    // si entró ese año y no llegó a trabajar la mitad de los días hábiles: 1 día cada 20 trabajados
    const ini = aIso(ingreso) > `${anio}-01-01` ? aIso(ingreso) : `${anio}-01-01`;
    let habAnio = 0, habTrab = 0;
    for (let d = D0(`${anio}-01-01`); iso(d) <= `${anio}-12-31`; d = mas(d, 1)) if (esDiaHabil(iso(d))) { habAnio++; if (iso(d) >= ini) habTrab++; }
    if (habTrab < habAnio / 2) return { dias: Math.floor(habTrab / 20), antiguedadAnios: a, proporcional: true, habilesTrabajados: habTrab };
    return { dias, antiguedadAnios: a, proporcional: false, habilesTrabajados: habTrab };
  }
  function vacaciones(sueldo, ingreso, anio) {
    chequear(sueldo, 'El sueldo');
    const v = diasVacaciones(ingreso, anio || new Date().getFullYear());
    return Object.assign(v, { porDia: r2(sueldo / 25), monto: r2(sueldo / 25 * v.dias), plus: r2((sueldo / 25 - sueldo / 30) * v.dias) });
  }
  // Sueldo neto: aportes del trabajador 11% jubilación + 3% PAMI (Ley 19.032) + 3% obra social. No incluye Ganancias.
  function sueldoNeto(bruto, o = {}) {
    chequear(bruto, 'El sueldo bruto');
    const base = o.tope ? Math.min(bruto, o.tope) : bruto, sind = (o.sindicato || 0) / 100;
    const jub = r2(base * 0.11), pami = r2(base * 0.03), os = r2(base * 0.03), sin = r2(bruto * sind);
    const desc = r2(jub + pami + os + sin);
    return { bruto: r2(bruto), base: r2(base), jubilacion: jub, pami, obraSocial: os, sindicato: sin, descuentos: desc, neto: r2(bruto - desc) };
  }
  // Liquidación final por despido sin causa.
  function liquidacionDespido(o) {
    const sueldo = Number(o.sueldo); chequear(sueldo, 'El sueldo');
    const ingreso = aIso(o.ingreso), egreso = aIso(o.egreso), ant = antiguedad(ingreso, egreso);
    const prueba = masMeses(ingreso, 6) > egreso; // período de prueba: 6 meses (art. 92 bis)
    const rubros = [];
    const add = (concepto, monto, nota) => rubros.push({ concepto, monto: r2(monto), nota: nota || '' });
    // días trabajados del mes de egreso
    const diaEgreso = +egreso.slice(8, 10), primeroDelMes = egreso.slice(0, 8) + '01';
    const diasMes = Math.min(diaEgreso, diasEntre(ingreso > primeroDelMes ? ingreso : primeroDelMes, egreso) + 1);
    const dm = diasDelMes(egreso);
    add('Días trabajados del mes', sueldo / dm * diasMes, `${diasMes} de ${dm} días`);
    // antigüedad (art. 245)
    let periodos = 0, base = sueldo, notaBase = '';
    if (!prueba) {
      periodos = ant.anios + (masMeses(ingreso, ant.anios * 12 + 3) < egreso ? 1 : 0);
      periodos = Math.max(1, periodos);
      if (o.topeConvenio) { const tope = Number(o.topeConvenio); if (sueldo > tope) { base = Math.max(tope, sueldo * 0.67); notaBase = base === tope ? ' (con el tope del convenio)' : ' (tope del convenio, con el piso del 67%)'; } }
      add('Indemnización por antigüedad (art. 245)', base * periodos, `${periodos} × $ ${r2(base)}${notaBase}`);
    }
    // preaviso e integración (arts. 231, 232 y 233): solo si no se avisó
    let preaviso = 0, integracion = 0;
    if (!prueba && !o.conPreaviso) {
      const meses = masMeses(ingreso, 60) < egreso ? 2 : 1; preaviso = sueldo * meses;
      add('Preaviso no dado', preaviso, `${meses} ${meses === 1 ? 'mes' : 'meses'} de sueldo`);
      const faltan = diasDelMes(egreso) - diaEgreso;
      if (faltan > 0) { integracion = sueldo / dm * faltan; add('Integración del mes de despido', integracion, `${faltan} días que faltaban del mes`); }
    }
    // aguinaldo proporcional
    const sem = +egreso.slice(5, 7) <= 6 ? 1 : 2, anio = +egreso.slice(0, 4);
    const sac = aguinaldo(sueldo, { anio, semestre: sem, ingreso, egreso });
    add('Aguinaldo proporcional', sac.monto, `${sac.diasTrabajados} de ${sac.diasSemestre} días del semestre`);
    // vacaciones no gozadas proporcionales (art. 156)
    const dv = diasVacaciones(ingreso, anio);
    const inicioAnio = ingreso > `${anio}-01-01` ? ingreso : `${anio}-01-01`;
    const diasAnio = diasEntre(inicioAnio, egreso) + 1;
    const diasVac = dv.proporcional ? dv.dias : dv.dias * diasAnio / diasDelAnio(anio);
    const vac = sueldo / 25 * diasVac;
    if (!o.sinVacaciones) add('Vacaciones no gozadas', vac, `${r2(diasVac)} días (sueldo / 25)`);
    // aguinaldo sobre preaviso, integración y vacaciones: criterio habitual de la justicia laboral
    const sacExtra = (preaviso + integracion + (o.sinVacaciones ? 0 : vac)) / 12;
    if (sacExtra > 0) add('Aguinaldo sobre preaviso, integración y vacaciones', sacExtra, 'Criterio habitual; confirmalo');
    return { antiguedad: ant, periodoPrueba: prueba, rubros, total: r2(rubros.reduce((s, x) => s + x.monto, 0)) };
  }

  return { validarCuit, formatearCuit, cuitDesdeDni, digitoCuit, analizarCbu, validarCbu, numeroALetras, formatearPesos, leerPesos,
    feriados, esFeriado, esDiaHabil, sumarDiasHabiles, pascua: (a) => iso(pascua(a)),
    antiguedad, aguinaldo, vacaciones, sueldoNeto, liquidacionDespido };
});
