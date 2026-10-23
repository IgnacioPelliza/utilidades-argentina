# Utilidades para Argentina 🇦🇷

Funciones chicas, sin dependencias y probadas, para lo que todo programador argentino termina necesitando:

| Función | Qué hace |
|---|---|
| **Validar CUIT / CUIL** | Revisa el dígito verificador y el prefijo |
| **CUIL desde el DNI** | Calcula el CUIL/CUIT (masculino, femenino o empresa), con el caso especial del prefijo 23/33 |
| **Validar CBU / CVU** | Revisa los dos dígitos verificadores, dice si es CBU o CVU y el banco (los principales) |
| **Número a letras** | `1234,56` → "mil doscientos treinta y cuatro pesos con 56/100" (recibos, cheques, facturas) |
| **Pesos** | `1234567.5` → `$ 1.234.567,50`, y al revés |
| **Feriados nacionales** | Cualquier año (Ley 27.399): Carnaval y Semana Santa calculados, traslados de los trasladables |
| **Días hábiles** | ¿Es día hábil? Sumar o restar días hábiles salteando fines de semana y feriados |

**¿No programás?** Usalo directo en la web: **https://ignaciopelliza.github.io/utilidades-argentina/**

Está en **JavaScript** (navegador y Node) y en **Python**, y las dos versiones dan exactamente el mismo resultado (hay más de 9.000 pruebas que lo comparan).

## JavaScript

Copiá [`src/argentina.js`](src/argentina.js) a tu proyecto.

```js
const A = require('./argentina.js');      // en Node
// o en el navegador: <script src="argentina.js"></script> y usás window.Argentina

A.validarCuit('20-20123456-6');            // true
A.cuitDesdeDni('30111222', 'femenino');    // '27-30111222-5'
A.analizarCbu('0110599540000001234563');   // { valido: true, tipo: 'CBU', banco: 'Banco de la Nación Argentina', motivo: '' }
A.numeroALetras(1234.56, { moneda: 'pesos' });                     // 'mil doscientos treinta y cuatro pesos con 56/100'
A.numeroALetras(21, { moneda: 'pesos', centavos: 'letras' });      // 'veintiún pesos'
A.numeroALetras('3.000.000', { moneda: 'pesos', mayusculas: true }); // 'TRES MILLONES DE PESOS CON 00/100'
A.formatearPesos(1234567.5);               // '$ 1.234.567,50'
A.leerPesos('$ 1.234,56');                 // 1234.56
A.feriados(2026);                          // [{ fecha: '2026-01-01', nombre: 'Año Nuevo', tipo: 'inamovible' }, ...]
A.esFeriado('2026-11-23');                 // { fecha: '2026-11-23', nombre: 'Día de la Soberanía Nacional', ... }
A.esDiaHabil('2026-10-24');                // false (sábado)
A.sumarDiasHabiles('2026-12-23', 2);       // '2026-12-28'
```

## Python

Copiá [`python/argentina.py`](python/argentina.py) a tu proyecto (Python 3.8 o más, sin instalar nada).

```python
import argentina as A

A.validar_cuit("20-20123456-6")             # True
A.cuit_desde_dni("30111222", "femenino")    # '27-30111222-5'
A.analizar_cbu("0110599540000001234563")    # {'valido': True, 'tipo': 'CBU', 'banco': 'Banco de la Nación Argentina', 'motivo': ''}
A.numero_a_letras(1234.56, moneda="pesos")  # 'mil doscientos treinta y cuatro pesos con 56/100'
A.formatear_pesos(1234567.5)                # '$ 1.234.567,50'
A.feriados(2026)
A.sumar_dias_habiles("2026-12-23", 2)       # '2026-12-28'
```

## Ojo con esto

- **CUIL desde el DNI**: es el cálculo estándar; el número oficial lo asigna ANSES/ARCA. Para un trámite, confirmalo ahí.
- **CBU**: revisar los dígitos sirve para atrapar errores de tipeo, pero no confirma que la cuenta exista ni quién es el titular. La lista de bancos tiene solo los principales.
- **Feriados**: siguen la Ley 27.399. No incluyen los días no laborables "con fines turísticos" ni los feriados provinciales. Algunos años el Gobierno mueve un feriado trasladable por decreto (pasó en 2025 con el del 20 de noviembre). Si la fecha exacta importa, confirmala en argentina.gob.ar.

## Pruebas

```
node pruebas/test.js
```

Prueba cada función y compara las versiones de JavaScript y Python con los mismos casos.

## ¿Te sirvió?

Si te ahorró tiempo, invitame un café ☕ **Alias: `igna.pelliza`** (Mercado Pago o cualquier banco).
Y una ⭐ al repositorio ayuda a que lo encuentre más gente.

También hice [plantillas de Excel gratis](https://github.com/IgnacioPelliza/plantillas-excel-gratis) para finanzas, stock, presupuestos y más.

Hecho en San Juan por Ignacio Pelliza · también hago [AptaDoc](https://aptadoc.com.ar).

Licencia MIT: usalo como quieras, también en proyectos comerciales.
