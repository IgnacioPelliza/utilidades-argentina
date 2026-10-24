// Escribe en docs/aumentos.html la tabla del mes con los datos de docs/datos/indices.json
// (así Google la lee sin ejecutar nada). Lo corre la GitHub Action todos los días.
const fs = require('fs'), path = require('path');
const DOCS = path.join(__dirname, '..', 'docs');
const A = require(path.join(DOCS, 'alquiler.js'));
const tabla = require(path.join(DOCS, 'aumentos-tabla.js'));
const datos = JSON.parse(fs.readFileSync(path.join(DOCS, 'datos', 'indices.json'), 'utf8'));
const hoy = process.argv[2] || A.hoyAR();
const t = tabla(A, datos, hoy);
const arch = path.join(DOCS, 'aumentos.html');
let s = fs.readFileSync(arch, 'utf8');
s = s.replace(/<!--TABLA-->[\s\S]*?<!--\/TABLA-->/, `<!--TABLA-->${t.html}<!--/TABLA-->`)
  .replace(/<title>.*?<\/title>/, `<title>${t.titulo}</title>`)
  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${t.titulo}">`)
  .replace(/<h1 id="h1">.*?<\/h1>/, `<h1 id="h1">${t.h1}</h1>`);
fs.writeFileSync(arch, s);
// Fecha del mapa del sitio
const sm = path.join(DOCS, 'sitemap.xml');
fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace(/(aumentos\.html<\/loc><lastmod>)[\d-]+/, `$1${hoy}`));
console.log('aumentos.html:', t.h1);
