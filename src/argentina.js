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

  return { validarCuit, formatearCuit, cuitDesdeDni, digitoCuit, analizarCbu, validarCbu, numeroALetras, formatearPesos, leerPesos,
    feriados, esFeriado, esDiaHabil, sumarDiasHabiles, pascua: (a) => iso(pascua(a)) };
});
