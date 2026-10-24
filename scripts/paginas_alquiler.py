"""Arma las páginas de alquiler, inflación, cuotas y aumentos, y el menú de todas las páginas.
Se corre a mano cuando cambia el diseño: python3 scripts/paginas_alquiler.py"""
import os, re, glob

DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs")
os.chdir(DOCS)
BASE = "https://ignaciopelliza.github.io/utilidades-argentina/"
NAV = [("alquiler.html", "Alquiler"), ("aumentos.html", "Aumentos del mes"), ("inflacion.html", "Inflación"), ("cuotas.html", "Cuotas o contado"),
       ("aguinaldo.html", "Aguinaldo"), ("vacaciones.html", "Vacaciones"), ("sueldo-neto.html", "Sueldo neto"),
       ("indemnizacion.html", "Indemnización"), ("index.html", "CUIT, CBU y feriados")]

def nav(activo):
    return "<nav>" + "".join('<a href="%s"%s>%s</a>' % (h, ' class="activo"' if h == activo else "", t) for h, t in NAV) + "</nav>"

PIE = '''<div class="cafe" id="cafe">Este sitio es gratis y no tiene publicidad. Mantenerlo al día lleva horas cada mes, cuando sale el IPC.<br>Si te sirvió y querés colaborar, mi alias es<br><b style="font-size:1.2em">igna.pelliza</b><br><button type="button" class="boton-claro" data-copiar="igna.pelliza">Copiar alias</button> <a class="boton-claro boton-link" href="https://mpago.la/1ZRrR5b" target="_blank" rel="noopener">Aportar todos los meses</a></div>
<footer>El código está en <a href="https://github.com/IgnacioPelliza/utilidades-argentina">GitHub</a>. Lo hice yo, Ignacio Pelliza, desde San Juan.<br>Tus números no salen de tu navegador. Solo cuento visitas, sin cookies. <a href="privacidad.html">Privacidad</a>.</footer>'''

AVISO = '''<p class="aviso">Cálculo orientativo con datos del INDEC y del Banco Central. Lo que vale es lo que dice tu contrato: qué índice, qué meses y cada cuánto. No es asesoramiento legal. Si encontrás un error, <a href="https://github.com/IgnacioPelliza/utilidades-argentina/issues">avisame</a> y lo corrijo.</p>'''

def cabeza(arch, titulo, desc):
    url = BASE + arch
    return f'''<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}compartir-alquiler.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="estilo.css">
</head>
<body><main>
{nav(arch)}
'''

def cola(scripts, js):
    tags = "".join(f'<script src="{s}"></script>\n' for s in scripts)
    return f'''{PIE}
</main>
{tags}<script>
{js}
</script>
</body></html>
'''

COMUNES = ["argentina.js", "alquiler.js", "datos.js"]

# ---------------- Calculadora de alquiler ----------------
ALQ_FORM = '''<h1>Calculadora de aumento de alquiler</h1>
<p class="sub">Por IPC o ICL. Te dice cuánto pagás hoy, cuándo es el próximo aumento y te arma el mensaje para mandar.</p>
<section class="tarjeta">
<div class="fila"><div><label for="ini">Fecha de inicio del contrato</label><input id="ini" type="date"></div>
<div><label for="monto">Alquiler del primer mes</label><input id="monto" inputmode="decimal" placeholder="500.000"></div></div>
<div class="fila"><div><label for="indice">Índice de ajuste</label><select id="indice"><option value="ipc">IPC (inflación del INDEC)</option><option value="icl">ICL (Banco Central)</option></select></div>
<div><label for="frec">Cada cuánto aumenta</label><select id="frec"><option value="3">Cada 3 meses</option><option value="4">Cada 4 meses</option><option value="6">Cada 6 meses</option><option value="12">Cada 12 meses</option></select></div>
<div><label for="dur">Duración</label><select id="dur"><option value="">No sé / no importa</option><option value="12">1 año</option><option value="24">2 años</option><option value="36">3 años</option></select></div></div>
<div id="bloque-crit">
<label>Qué meses de inflación se toman</label>
<label class="opcion"><input type="radio" name="crit" value="publicado" checked> Los últimos publicados al día del aumento <span class="suave">(lo más común)</span></label>
<label class="opcion"><input type="radio" name="crit" value="calendario"> Los meses completos anteriores al aumento</label>
<p class="suave chico" id="ejemplo-crit"></p>
</div>
<p class="suave chico">Si no tenés el monto del primer mes, poné la fecha y el monto de tu último aumento.</p>
<div id="res" class="res">Completá la fecha y el monto.</div>
<div id="acciones" class="acciones" hidden>
<button type="button" id="b-wa" class="boton-wa">Mandar por WhatsApp</button>
<button type="button" id="b-link">Copiar link</button>
<button type="button" id="b-ics">Agendar los aumentos</button>
<button type="button" id="b-print">Imprimir</button>
</div>
<div id="historial"></div>
<p class="suave chico" id="fuentes"></p>
''' + AVISO + '''
</section>
<section class="tarjeta">
<h2>¿Qué ley rige mi contrato?</h2>
<label for="firma">Fecha en que se firmó</label><input id="firma" type="date">
<div id="ley" class="res">Poné la fecha de firma.</div>
</section>
<section class="tarjeta explica">
<h2>¿Cómo se calcula el aumento por IPC?</h2>
<p>Se multiplican las variaciones mensuales de la inflación del período. Por ejemplo, con 2,1%, 1,7% y 1,9% el aumento es 1,021 × 1,017 × 1,019 = <b>5,81%</b> (no 5,7%, que sería sumarlas).</p>
<p>Lo que cambia entre contratos es <b>qué meses se toman</b>. Como el INDEC publica la inflación de un mes recién a mitad del mes siguiente, la mayoría de las inmobiliarias usa los últimos publicados: para un aumento del 1 de noviembre, julio, agosto y septiembre. Otros contratos dicen "los meses anteriores al ajuste" y hay que esperar a que salga el dato. Revisá la cláusula de tu contrato.</p>
<h2>¿Y por ICL?</h2>
<p>Es el índice del Banco Central que usaba la Ley 27.551. Se divide el ICL del día del aumento por el del día de inicio (o del aumento anterior) y se multiplica por el alquiler. El Banco Central lo publica todos los días.</p>
<h2>¿Qué ley aplica?</h2>
<p>Contratos firmados del 1/7/2020 al 17/10/2023: Ley 27.551 (ICL, una vez por año, 3 años). Del 18/10/2023 a fines de diciembre de 2023: Ley 27.737 (Casa Propia, cada 6 meses). Desde el 29/12/2023: DNU 70/2023, donde el índice, la frecuencia y la duración son los que pactaron.</p>
</section>
'''

ALQ_JS = r'''const A = window.Alquiler, D = window.Datos, $ = (id) => document.getElementById(id);
let datos = null, ultimo = null;
const crit = () => document.querySelector('input[name=crit]:checked').value;
// Cargar lo que venga en el link
const L = D.leerLink();
if (L.i) $('ini').value = L.i; if (L.m) $('monto').value = L.m; if (L.x) $('indice').value = L.x; if (L.f) $('frec').value = L.f; if (L.d) $('dur').value = L.d;
if (L.c) { const r = document.querySelector(`input[name=crit][value="${L.c}"]`); if (r) r.checked = true; }
const fmt = (n) => D.fmt(n, 0), mesCorto = (m) => A.nombreMes(m).slice(0, 3);
function detalleIndice(a, ind) {
  if (ind === 'icl') return a.desde ? `ICL ${String(a.desde.valor).replace('.', ',')} → ${String(a.hasta.valor).replace('.', ',')}` : '';
  return a.meses.map((m) => m.valor == null ? `${mesCorto(m.mes)} (sale el ${D.fechaAR(m.publica).slice(0, 5)})` : `${mesCorto(m.mes)} ${String(m.valor).replace('.', ',')}%`).join(' · ');
}
function calcular() {
  if (!datos) return;
  const ini = $('ini').value, monto = D.numero($('monto').value), ind = $('indice').value, frec = +$('frec').value, dur = $('dur').value;
  $('bloque-crit').hidden = ind !== 'ipc';
  if (ind === 'icl' && frec !== 12 && !L._frecTocada) { /* el ICL suele ser anual, pero respetamos lo que elija */ }
  D.escribirLink({ i: ini, m: $('monto').value.trim(), x: ind, f: frec, d: dur, c: ind === 'ipc' ? crit() : '' });
  const hoy = A.hoyAR();
  // Ejemplo de meses según el criterio, para el próximo 1 de mes
  const prox1 = A.sumarMeses(hoy.slice(0, 7), 1) + '-01';
  const ms = A.mesesIPC(prox1, frec, crit(), datos);
  $('ejemplo-crit').textContent = `Ejemplo: para un aumento el 1 de ${A.nombreMes(prox1.slice(0, 7))}, se toman ${ms.map((m) => A.nombreMes(m)).join(', ')}.`;
  $('fuentes').textContent = D.fuentes(datos);
  if (!ini || !(monto > 0)) { $('res').className = 'res'; $('res').textContent = 'Completá la fecha y el monto.'; $('acciones').hidden = true; $('historial').innerHTML = ''; ultimo = null; return; }
  let r;
  try { r = A.ajustesContrato({ inicio: ini, monto, frecuencia: frec, indice: ind, criterio: crit(), duracion: dur ? +dur : null, hoy }, datos); }
  catch (e) { $('res').className = 'res mal'; $('res').textContent = e.message; return; }
  ultimo = { r, ini, monto, ind, frec, dur, hoy };
  const p = r.proximo;
  let h = '';
  if (p && p.monto) h += `<div class="total">Desde el ${D.fechaAR(p.fecha)} pagás ${fmt(p.monto)}</div>Aumenta ${D.pct(p.porcentaje)} (${fmt(p.monto - p.montoAnterior)} más).<br><small>${detalleIndice(p, ind)}</small>`;
  else if (p) h += `<div class="total">Próximo aumento: ${D.fechaAR(p.fecha)}</div>${p.publicaEl ? `Se va a saber el <b>${D.fechaAR(p.publicaEl)}</b>, cuando el INDEC publique la inflación que falta.` : p.motivo || ''}<br><small>${detalleIndice(p, ind)}</small>`;
  else if (r.fin) h += `<div class="total">El contrato ${r.fin <= hoy ? 'terminó' : 'termina'} el ${D.fechaAR(r.fin)}</div>No quedan aumentos.`;
  h += `<p style="margin:.6em 0 0">Hoy pagás <b>${fmt(r.montoVigente)}</b>` + (r.totalPorcentaje > 0.001 ? ` (${D.pct(r.totalPorcentaje, 1)} más que al inicio).` : '.') + '</p>';
  $('res').className = 'res ok'; $('res').innerHTML = h; $('acciones').hidden = false;
  const filas = r.ajustes.map((a) => `<tr class="${a.fecha > hoy ? 'prox' : ''}"><td>${D.fechaAR(a.fecha)}<small>${detalleIndice(a, ind)}</small></td><td>${a.monto ? `${D.pct(a.porcentaje)}<small>${fmt(a.monto)}</small>` : 'Pendiente'}</td></tr>`);
  $('historial').innerHTML = r.ajustes.length ? `<h2 style="margin-top:1em">Todos los aumentos</h2><table class="detalle"><tr><td>Inicio ${D.fechaAR(ini)}</td><td>${fmt(monto)}</td></tr>${filas.join('')}</table>` : '';
}
function mensaje() {
  const { r, ind } = ultimo, link = location.href, p = r.proximo;
  const fuente = ind === 'icl' ? 'el ICL del Banco Central' : 'la inflación del INDEC';
  if (p && p.monto) return `Hola. Hice la cuenta del aumento del alquiler con ${fuente} (${detalleIndice(p, ind)}): desde el ${D.fechaAR(p.fecha)} pasa de ${fmt(p.montoAnterior)} a ${fmt(p.monto)} (${D.pct(p.porcentaje)}). Te dejo el cálculo para que lo veas: ${link}`;
  const v = [...r.ajustes].reverse().find((a) => a.monto && a.fecha <= ultimo.hoy);
  if (v) return `Hola. Hice la cuenta del alquiler con ${fuente}: desde el ${D.fechaAR(v.fecha)} queda en ${fmt(v.monto)} (${D.pct(v.porcentaje)}). Te dejo el cálculo: ${link}`;
  return `Te paso la calculadora del alquiler con nuestro contrato: ${link}`;
}
function calendario() {
  const { ini, frec, dur, ind } = ultimo, hoy = A.hoyAR(), fin = dur ? A.sumarMeses(ini, +dur) : A.sumarMeses(hoy, 24);
  const z = (f) => f.replace(/-/g, ''), ahora = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ev = [];
  const add = (fecha, titulo, desc) => ev.push(['BEGIN:VEVENT', `UID:${z(fecha)}-${ev.length}-${Math.random().toString(36).slice(2)}@utilidades-argentina`, `DTSTAMP:${ahora}`,
    `DTSTART;VALUE=DATE:${z(fecha)}`, `SUMMARY:${titulo}`, `DESCRIPTION:${desc.replace(/[,;\\]/g, (c) => '\\' + c)}`, 'END:VEVENT'].join('\r\n'));
  for (let k = 1; k < 200; k++) {
    const f = A.sumarMeses(ini, frec * k); if (f >= fin) break; if (f <= hoy) continue;
    add(f, 'Aumento del alquiler', 'Calculalo acá: ' + location.href);
    if (ind === 'ipc') { const ms = A.mesesIPC(f, frec, crit(), datos), pub = A.publicacion(ms[ms.length - 1], datos);
      if (pub > hoy) add(pub, 'Sale el IPC: ya se sabe el aumento del alquiler', 'Calculalo acá: ' + location.href); }
  }
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//utilidades-argentina//alquiler//ES', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'aumentos-alquiler.ics'; a.click();
}
$('b-wa').addEventListener('click', () => window.open('https://wa.me/?text=' + encodeURIComponent(mensaje()), '_blank'));
$('b-link').addEventListener('click', (e) => D.copiar(location.href, e.target, 'Link copiado'));
$('b-ics').addEventListener('click', calendario);
$('b-print').addEventListener('click', () => window.print());
document.querySelectorAll('#ini,#monto,#indice,#frec,#dur,input[name=crit]').forEach((el) => el.addEventListener('input', calcular));
$('indice').addEventListener('change', () => { if ($('indice').value === 'icl') $('frec').value = '12'; calcular(); });
$('firma').addEventListener('input', () => { const f = $('firma').value; if (!f) return; const g = A.regimen(f); $('ley').className = 'res ' + (g.dudoso ? 'mal' : 'ok'); $('ley').innerHTML = `<b>${g.titulo}</b><br>${g.texto}`; });
D.cargar((d) => { datos = d; calcular(); }).then((d) => { datos = d; calcular(); }).catch(() => { $('res').className = 'res mal'; $('res').textContent = 'No pude cargar los índices. Probá recargar la página.'; });
'''

# ---------------- Aumentos del mes ----------------
AUM = '''<h1 id="h1">{h1}</h1>
<p class="sub">Se actualiza solo cada vez que el INDEC publica la inflación y el Banco Central el ICL.</p>
<section class="tarjeta">
<div id="tabla"><!--TABLA-->{tabla}<!--/TABLA--></div>
<p class="suave chico" id="fuentes"></p>
<p><a href="alquiler.html">Calculá tu caso con tu monto y tus fechas →</a></p>
''' + AVISO + '''
</section>
<section class="tarjeta explica">
<h2>¿Cómo se lee esta tabla?</h2>
<p>Cada fila es el aumento que corresponde a un contrato que ajusta ese día, según cada cuánto aumenta. Para el IPC se toman los últimos meses publicados por el INDEC al día del aumento, que es lo que usa la mayoría de los contratos. Si tu contrato dice otra cosa, usá la <a href="alquiler.html">calculadora</a>.</p>
<p>El INDEC publica la inflación a mitad de mes, a las 16 h. Ese día esta página se completa con el mes que faltaba.</p>
</section>
'''
AUM_JS = r'''const A = window.Alquiler, D = window.Datos;
function pintar(datos) { const t = window.TablaAumentos(A, datos, A.hoyAR()); document.getElementById('tabla').innerHTML = t.html; document.getElementById('h1').textContent = t.h1; document.getElementById('fuentes').textContent = D.fuentes(datos); }
D.cargar(pintar).then(pintar);
'''

# ---------------- Inflación ----------------
INF = '''<h1>Actualizar un monto por inflación</h1>
<p class="sub">Cuánto valen hoy unos pesos de otra fecha, con el IPC del INDEC.</p>
<section class="tarjeta">
<label for="monto">Monto</label><input id="monto" inputmode="decimal" placeholder="100.000">
<div class="fila"><div><label for="dm">De</label><div class="fila"><select id="dm"></select><select id="da"></select></div></div>
<div><label for="hm">A</label><div class="fila"><select id="hm"></select><select id="ha"></select></div></div></div>
<div id="res" class="res">Poné un monto.</div>
<div class="acciones"><button type="button" id="b-copiar">Copiar resultado</button></div>
<p class="suave chico" id="fuentes"></p>
</section>
<section class="tarjeta explica">
<h2>¿Cómo se calcula?</h2>
<p>Se multiplican las inflaciones mensuales desde el mes siguiente al de origen hasta el mes de destino. Por ejemplo, $100.000 de diciembre de 2025 llevados a septiembre de 2026 se multiplican por la inflación de enero a septiembre de 2026.</p>
<p>Sirve para saber cuánto perdió tu sueldo, si un aumento le ganó a la inflación o cuánto vale hoy una deuda vieja. No es una tasa de interés ni una actualización judicial.</p>
</section>
'''
INF_JS = r'''const A = window.Alquiler, D = window.Datos, $ = (id) => document.getElementById(id);
let datos;
const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
function opciones(datos) {
  const ult = A.ultimoIPC(datos), L = D.leerLink();
  for (const id of ['dm', 'hm']) { $(id).innerHTML = MES.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join(''); }
  for (const id of ['da', 'ha']) { let s = ''; for (let a = +ult.slice(0, 4); a >= 2000; a--) s += `<option>${a}</option>`; $(id).innerHTML = s; }
  const de = L.de || A.sumarMeses(ult, -12), a = L.a || ult;
  $('dm').value = de.slice(5, 7); $('da').value = de.slice(0, 4); $('hm').value = a.slice(5, 7); $('ha').value = a.slice(0, 4); if (L.m) $('monto').value = L.m;
}
function calcular() {
  const m = D.numero($('monto').value), de = $('da').value + '-' + $('dm').value, a = $('ha').value + '-' + $('hm').value;
  D.escribirLink({ m: $('monto').value.trim(), de, a }); $('fuentes').textContent = D.fuentes(datos);
  if (!(m > 0)) { $('res').className = 'res'; $('res').textContent = 'Poné un monto.'; return; }
  const r = A.actualizarPorInflacion(m, de, a, datos);
  if (r.error) { $('res').className = 'res mal'; $('res').textContent = r.error; return; }
  $('res').className = 'res ok';
  $('res').innerHTML = `<div class="total">${D.fmt(r.resultado, 2)}</div>${D.fmt(m, 2)} de ${A.nombreMes(de, true)} equivalen a ${D.fmt(r.resultado, 2)} en ${A.nombreMes(a, true)}.<br>Inflación del período: <b>${D.pct(r.porcentaje, 1)}</b>.`;
}
$('b-copiar').addEventListener('click', (e) => D.copiar($('res').textContent + ' ' + location.href, e.target));
D.cargar().then((d) => { datos = d; opciones(d); calcular(); document.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', calcular)); });
'''

# ---------------- Cuotas ----------------
CUO = '''<h1>¿Me conviene pagar en cuotas o de contado?</h1>
<p class="sub">Compara el precio de contado con lo que valen hoy las cuotas, descontando la inflación.</p>
<section class="tarjeta">
<div class="fila"><div><label for="contado">Precio de contado</label><input id="contado" inputmode="decimal" placeholder="300.000"></div>
<div><label for="n">Cantidad de cuotas</label><input id="n" inputmode="numeric" placeholder="6"></div>
<div><label for="cuota">Valor de cada cuota</label><input id="cuota" inputmode="decimal" placeholder="55.000"></div></div>
<div class="fila"><div><label for="inf">Inflación que esperás por mes (%)</label><input id="inf" inputmode="decimal"></div>
<div><label for="primera">La primera cuota se paga</label><select id="primera"><option value="no">El mes que viene</option><option value="si">Hoy</option></select></div></div>
<div id="res" class="res">Completá los datos.</div>
<div class="acciones"><button type="button" id="b-copiar">Copiar resultado</button></div>
<p class="suave chico" id="fuentes"></p>
</section>
<section class="tarjeta explica">
<h2>¿Cómo se calcula?</h2>
<p>Con inflación, una cuota que pagás dentro de unos meses vale menos que la misma plata hoy. Por eso cada cuota se "trae a hoy" dividiéndola por la inflación acumulada hasta el mes en que la pagás, y la suma se compara con el precio de contado.</p>
<p>Si la suma da menos que el contado, conviene pagar en cuotas (y mientras tanto la plata la podés tener en algo que rinda). Si da más, conviene el contado o pedir descuento. La inflación que se viene nadie la sabe: por defecto ponemos la última publicada, y la podés cambiar.</p>
</section>
'''
CUO_JS = r'''const A = window.Alquiler, D = window.Datos, $ = (id) => document.getElementById(id);
let datos;
function calcular() {
  const c = D.numero($('contado').value), n = Math.round(D.numero($('n').value)), q = D.numero($('cuota').value), i = Number(String($('inf').value).replace(',', '.'));
  D.escribirLink({ c: $('contado').value.trim(), n: $('n').value.trim(), q: $('cuota').value.trim(), i: $('inf').value.trim(), p: $('primera').value });
  if (!(c > 0) || !(n >= 1) || !(q > 0) || !(i >= 0)) { $('res').className = 'res'; $('res').textContent = 'Completá los datos.'; return; }
  const r = A.cuotasVsContado({ contado: c, cuotas: n, valorCuota: q, inflacionMensual: i, primeraHoy: $('primera').value === 'si' });
  const titulo = r.conviene === 'cuotas' ? 'Conviene pagar en cuotas' : r.conviene === 'contado' ? 'Conviene pagar de contado' : 'Da lo mismo';
  $('res').className = 'res ' + (r.conviene === 'contado' ? 'mal' : 'ok');
  $('res').innerHTML = `<div class="total">${titulo}</div>En cuotas pagás ${D.fmt(r.totalCuotas, 0)} en total (${Math.abs(r.recargo) < 0.05 ? 'lo mismo que de contado, sin recargo' : r.recargo > 0 ? D.pct(r.recargo, 1) + ' más que de contado' : D.pct(-r.recargo, 1) + ' menos que de contado'}).<br>Descontando ${String(i).replace('.', ',')}% de inflación por mes, esas cuotas valen hoy <b>${D.fmt(r.valorHoy, 0)}</b>, ${r.diferencia >= 0 ? D.fmt(r.diferencia, 0) + ' menos' : D.fmt(-r.diferencia, 0) + ' más'} que el contado.`;
}
$('b-copiar').addEventListener('click', (e) => D.copiar($('res').textContent + ' ' + location.href, e.target));
D.cargar().then((d) => {
  datos = d; const L = D.leerLink(), u = A.ultimoIPC(d);
  $('contado').value = L.c || ''; $('n').value = L.n || ''; $('cuota').value = L.q || ''; $('primera').value = L.p || 'no';
  $('inf').value = L.i || String(d.ipc[u]).replace('.', ',');
  $('fuentes').textContent = `Inflación por defecto: la última publicada por el INDEC (${A.nombreMes(u, true)}).`;
  document.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', calcular)); calcular();
});
'''

def escribir(arch, titulo, desc, cuerpo, scripts, js):
    open(arch, "w", encoding="utf-8").write(cabeza(arch, titulo, desc) + cuerpo + cola(scripts, js))

escribir("alquiler.html", "Calculadora de aumento de alquiler por IPC e ICL (2026)",
         "Calculá el aumento de tu alquiler por IPC o ICL: cuánto pagás hoy, cuándo es el próximo aumento y qué meses se toman. Mandá el cálculo por WhatsApp. Gratis y sin publicidad.",
         ALQ_FORM, COMUNES, ALQ_JS)
escribir("aumentos.html", "Aumento de alquileres este mes por IPC e ICL",
         "Cuánto aumentan los alquileres este mes y el que viene según cada cuánto ajusta tu contrato: trimestral, cuatrimestral, semestral o anual, por IPC o ICL. Se actualiza solo.",
         AUM.replace("{h1}", "Cuánto aumentan los alquileres").replace("{tabla}", ""), COMUNES + ["aumentos-tabla.js"], AUM_JS)
escribir("inflacion.html", "Calculadora de inflación: actualizar un monto por IPC (Argentina)",
         "Actualizá cualquier monto por inflación con el IPC del INDEC: cuánto valen hoy unos pesos de otra fecha. Gratis y sin publicidad.",
         INF, COMUNES, INF_JS)
escribir("cuotas.html", "¿Cuotas o contado? Calculadora con inflación (Argentina)",
         "Calculá si te conviene pagar en cuotas o de contado descontando la inflación. Gratis y sin publicidad.",
         CUO, COMUNES, CUO_JS)

# Menú y pie en las páginas que ya existían
for f in ["index.html", "aguinaldo.html", "vacaciones.html", "sueldo-neto.html", "indemnizacion.html"]:
    s = open(f, encoding="utf-8").read()
    s = re.sub(r"<nav>.*?</nav>", nav(f), s, flags=re.S)
    open(f, "w", encoding="utf-8").write(s)
# Franja de apoyo arriba de todas las páginas y estilos sin caché vieja
import glob as _g
GC = '<script data-goatcounter="https://utilidades-argentina.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>'
APOYO = '<div class="apoyo"><span>Gratis y sin publicidad. Si te sirve, podés bancarlo.</span><div class="botones"><a href="https://mpago.la/1ZRrR5b" target="_blank" rel="noopener">Aportar todos los meses</a><button type="button" data-copiar="igna.pelliza">Copiar alias igna.pelliza</button></div></div>'
for f in _g.glob("*.html"):
    if f.startswith("google"): continue
    t = open(f, encoding="utf-8").read()
    t = re.sub(r'<div class="apoyo">.*?</div></div>', "", t, flags=re.S)
    t = re.sub(r'(<p class="sub">.*?</p>)', lambda m: m.group(1) + "\n" + APOYO, t, count=1, flags=re.S)
    t = re.sub(r'href="estilo\.css(\?v=\d+)?"', 'href="estilo.css?v=3"', t)
    if "datos.js" not in t: t = t.replace("</body>", '<script src="datos.js"></script>\n</body>')
    if "goatcounter" not in t: t = t.replace("</body>", GC + "\n</body>")
    if 'rel="manifest"' not in t:
        t = t.replace('<link rel="stylesheet"', '<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#1F3A3D">\n<link rel="icon" href="favicon.png">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="stylesheet"', 1)
    open(f, "w", encoding="utf-8").write(t)
print("ok")
