"""Página de privacidad (la pide Google Play)."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs"))
html = '''<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacidad · Calculadoras Argentina</title>
<meta name="description" content="Qué datos usan las calculadoras: ninguno personal. Tus números no salen de tu dispositivo.">
<link rel="canonical" href="https://ignaciopelliza.github.io/utilidades-argentina/privacidad.html">
<link rel="stylesheet" href="estilo.css?v=3">
</head>
<body><main>
<nav><a href="alquiler.html">Volver a las calculadoras</a></nav>
<h1>Privacidad</h1>
<p class="sub">Última actualización: 24 de octubre de 2026.</p>
<section class="tarjeta">
<h2>Lo que cargás no sale de tu dispositivo</h2>
<p>Los montos, fechas y demás datos que escribís en las calculadoras se procesan en tu navegador o en la app, en tu propio celular o computadora. No se envían a ningún servidor mío ni se guardan en ningún lado. Cuando usás el botón para compartir, los datos van dentro del link que vos mismo mandás.</p>
<h2>No hay cuentas, cookies ni publicidad</h2>
<p>No hace falta registrarse. No uso cookies ni publicidad, y no vendo ni comparto datos con nadie.</p>
<h2>Conteo de visitas</h2>
<p>Para saber cuánta gente usa cada calculadora uso GoatCounter, que cuenta visitas sin cookies y sin identificar a las personas: registra qué página se abrió, desde qué sitio se llegó, el tipo de navegador, el tamaño de pantalla y el país aproximado. No registra lo que escribís en las calculadoras.</p>
<h2>Datos públicos que se descargan</h2>
<p>Para hacer las cuentas, tu dispositivo descarga los índices públicos del INDEC (inflación) y del Banco Central (ICL) desde este sitio y desde las fuentes oficiales o de datos abiertos (api.bcra.gob.ar, apis.datos.gob.ar y api.argentinadatos.com). Esas descargas no llevan tus datos.</p>
<h2>Contacto</h2>
<p>Si tenés una consulta, escribime abriendo un tema en <a href="https://github.com/IgnacioPelliza/utilidades-argentina/issues">GitHub</a>. Responsable: Ignacio Pelliza, San Juan, Argentina.</p>
</section>
</main></body></html>
'''
open("privacidad.html", "w", encoding="utf-8").write(html)
print("ok")
