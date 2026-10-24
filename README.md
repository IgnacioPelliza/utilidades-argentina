# Utilidades para Argentina

Hola, soy Ignacio, de San Juan. Acá junté cosas que en Argentina se usan seguido y que siempre hay que andar buscando en páginas llenas de publicidad: validar un CUIT o un CBU, pasar un número a letras para un recibo, saber qué feriados hay, calcular el aguinaldo o una indemnización.

Si no programás, usalas directo desde la web:

- [CUIT, CBU, número a letras y feriados](https://ignaciopelliza.github.io/utilidades-argentina/)
- [Aguinaldo](https://ignaciopelliza.github.io/utilidades-argentina/aguinaldo.html)
- [Vacaciones](https://ignaciopelliza.github.io/utilidades-argentina/vacaciones.html)
- [Sueldo bruto a neto](https://ignaciopelliza.github.io/utilidades-argentina/sueldo-neto.html)
- [Indemnización por despido](https://ignaciopelliza.github.io/utilidades-argentina/indemnizacion.html)

Todo se calcula en tu navegador. No se guarda ni se envía nada.

## Para programadores

Hay una versión en JavaScript (`src/argentina.js`, anda en el navegador y en Node) y otra en Python (`python/argentina.py`). No necesitan instalar nada: copiás el archivo y listo. Las dos dan exactamente lo mismo; las pruebas lo comparan con miles de casos (`node pruebas/test.js`).

JavaScript:

```js
const A = require('./argentina.js'); // en el navegador: window.Argentina

A.validarCuit('20-20123456-6');                  // true
A.cuitDesdeDni('30111222', 'femenino');          // '27-30111222-5'
A.analizarCbu('0110599540000001234563');         // { valido: true, tipo: 'CBU', banco: 'Banco de la Nación Argentina', motivo: '' }
A.numeroALetras(1234.56, { moneda: 'pesos' });   // 'mil doscientos treinta y cuatro pesos con 56/100'
A.formatearPesos(1234567.5);                     // '$ 1.234.567,50'
A.feriados(2026);                                // lista de feriados nacionales
A.sumarDiasHabiles('2026-12-23', 2);             // '2026-12-28'
A.aguinaldo(1200000, { anio: 2026, semestre: 2 });
A.vacaciones(1000000, '2019-02-01', 2026);       // 21 días, $ 840.000
A.sueldoNeto(1500000, { sindicato: 2 });
A.liquidacionDespido({ ingreso: '2020-03-15', egreso: '2026-10-23', sueldo: 1200000 });
```

Python:

```python
import argentina as A

A.validar_cuit("20-20123456-6")
A.numero_a_letras(1234.56, moneda="pesos")
A.liquidacion_despido("2020-03-15", "2026-10-23", 1200000)
```

## Lo que conviene saber

- El CUIL que sale del DNI es el cálculo de siempre, pero el número oficial lo da ANSES/ARCA.
- Validar un CBU sirve para detectar errores de tipeo. No dice si la cuenta existe ni de quién es.
- Los feriados salen de la Ley 27.399. No incluyen los días no laborables ni los provinciales, y a veces el Gobierno mueve alguno por decreto.
- Las calculadoras de sueldo usan la Ley de Contrato de Trabajo con los cambios de la Ley 27.802 (2026). Son una estimación: tu convenio puede cambiar el resultado. Para un caso real, consultalo con un contador o un abogado laboral.

Si encontrás un error, avisame abriendo un Issue.

## Si te sirvió

Si sos programador, una estrella al repositorio ayuda a que lo encuentre más gente. Y si te ahorró un rato y querés colaborar, mi alias es:

**igna.pelliza**

También subí unas [plantillas de Excel gratis](https://github.com/IgnacioPelliza/plantillas-excel-gratis) para llevar gastos, stock, presupuestos y más.

Licencia MIT: usalo como quieras, también en proyectos comerciales.
