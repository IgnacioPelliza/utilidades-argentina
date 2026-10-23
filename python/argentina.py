"""utilidades-argentina (Python) · MIT · Ignacio Pelliza
Validar CUIT/CUIL, CBU/CVU, números a letras, pesos y feriados nacionales. Sin dependencias."""
import re
from datetime import date, timedelta

def _digitos(v):
    return re.sub(r"\D", "", "" if v is None else str(v))

# ---------- CUIT / CUIL ----------
_PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
_PREFIJOS = {"20", "23", "24", "25", "26", "27", "30", "33", "34"}

def digito_cuit(diez):
    d = _digitos(diez)
    if len(d) != 10:
        raise ValueError("Se necesitan los 10 primeros dígitos")
    r = 11 - sum(p * int(c) for p, c in zip(_PESOS_CUIT, d)) % 11
    return 0 if r == 11 else r

def validar_cuit(cuit):
    d = _digitos(cuit)
    if len(d) != 11 or d[:2] not in _PREFIJOS:
        return False
    dv = digito_cuit(d[:10])
    return dv != 10 and dv == int(d[10])

def formatear_cuit(cuit):
    d = _digitos(cuit)
    return f"{d[:2]}-{d[2:10]}-{d[10]}" if len(d) == 11 else str(cuit)

def cuit_desde_dni(dni, tipo="masculino"):
    d = _digitos(dni)
    if not d or len(d) > 8:
        raise ValueError("DNI no válido")
    d = d.zfill(8)
    pre = {"masculino": "20", "femenino": "27", "empresa": "30"}.get(tipo)
    if not pre:
        raise ValueError("tipo debe ser 'masculino', 'femenino' o 'empresa'")
    dv = digito_cuit(pre + d)
    if dv == 10:
        if tipo == "empresa":
            pre = "33"; dv = digito_cuit(pre + d)
        else:
            pre = "23"; dv = 9 if tipo == "masculino" else 4
    return formatear_cuit(pre + d + str(dv))

# ---------- CBU / CVU ----------
BANCOS = {"007": "Banco de Galicia", "011": "Banco de la Nación Argentina", "014": "Banco de la Provincia de Buenos Aires",
          "015": "ICBC", "017": "BBVA", "027": "Banco Supervielle", "029": "Banco Ciudad", "034": "Banco Patagonia",
          "044": "Banco Hipotecario", "045": "Banco de San Juan", "072": "Banco Santander", "143": "Brubank", "150": "HSBC",
          "191": "Banco Credicoop", "285": "Banco Macro"}

def _dv_bloque(digs, pesos):
    return (10 - sum(p * int(c) for p, c in zip(pesos, digs)) % 10) % 10

def analizar_cbu(valor):
    d = _digitos(valor)
    r = {"valido": False, "tipo": None, "banco": None, "motivo": ""}
    if len(d) != 22:
        r["motivo"] = "Tiene que tener 22 dígitos"; return r
    b1, b2 = d[:8], d[8:]
    if _dv_bloque(b1, [7, 1, 3, 9, 7, 1, 3]) != int(b1[7]):
        r["motivo"] = "Falla el dígito verificador del primer bloque"; return r
    if _dv_bloque(b2, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) != int(b2[13]):
        r["motivo"] = "Falla el dígito verificador del segundo bloque"; return r
    r["valido"] = True
    r["tipo"] = "CVU" if d.startswith("000") else "CBU"
    r["banco"] = "Billetera virtual (CVU)" if r["tipo"] == "CVU" else BANCOS.get(d[:3])
    return r

def validar_cbu(valor):
    return analizar_cbu(valor)["valido"]

# ---------- Números a letras ----------
_U = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece",
      "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós",
      "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"]
_D = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
_C = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos",
      "ochocientos", "novecientos"]

def _menor_mil(n):
    if n == 100:
        return "cien"
    c, r = divmod(n, 100)
    s = _C[c]
    if r:
        t = _U[r] if r < 30 else _D[r // 10] + (" y " + _U[r % 10] if r % 10 else "")
        s = (s + " " if s else "") + t
    return s

def _apocope(s):
    s = re.sub(r"veintiuno$", "veintiún", s)
    return re.sub(r"uno$", "un", s)

def _entero(n):
    if n == 0:
        return "cero"
    partes = []
    billones, n2 = divmod(n, 10**12)
    millones, n3 = divmod(n2, 10**6)
    miles, resto = divmod(n3, 1000)
    if billones:
        partes.append("un billón" if billones == 1 else _apocope(_entero(billones)) + " billones")
    if millones:
        partes.append("un millón" if millones == 1 else _apocope(_entero(millones)) + " millones")
    if miles:
        partes.append("mil" if miles == 1 else _apocope(_menor_mil(miles)) + " mil")
    if resto:
        partes.append(_menor_mil(resto))
    return " ".join(partes)

def numero_a_letras(valor, moneda="", centavos="fraccion", mayusculas=False):
    if isinstance(valor, str):
        valor = float(valor.replace(".", "").replace(",", "."))
    if valor < 0 or valor >= 1e15:
        raise ValueError("Número fuera de rango (0 a 999.999.999.999.999)")
    cent = int(round(valor * 100))
    ent, dec = divmod(cent, 100)
    s = _entero(ent)
    if moneda:
        if ent == 1:
            s = "un " + re.sub(r"s$", "", moneda)
        else:
            s = _apocope(s) + (" de " if ent >= 10**6 and ent % 10**6 == 0 else " ") + moneda
    if dec or moneda:
        if centavos == "letras":
            if dec:
                s += " con " + ("un centavo" if dec == 1 else _apocope(_entero(dec)) + " centavos")
        else:
            s += f" con {dec:02d}/100"
    return s.upper() if mayusculas else s

# ---------- Pesos ----------
def formatear_pesos(valor, decimales=2):
    n = float(valor)
    signo = "-" if n < 0 else ""
    txt = f"{abs(n):,.{decimales}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{signo}$ {txt}"

def leer_pesos(texto):
    s = re.sub(r"[^\d,.-]", "", str(texto))
    return float(s.replace(".", "").replace(",", "."))

# ---------- Feriados nacionales (Ley 27.399) ----------
def pascua(anio):
    a, b, c = anio % 19, anio // 100, anio % 100
    d, e, f = b // 4, b % 4, (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes, dia = divmod(h + l - 7 * m + 114, 31)
    return date(anio, mes, dia + 1)

def _trasladar(f):
    w = f.isoweekday()  # 1 = lunes
    if w in (2, 3):
        return f - timedelta(days=w - 1)
    if w in (4, 5):
        return f + timedelta(days=8 - w)
    return f

def feriados(anio):
    p = pascua(anio)
    lista = [
        (date(anio, 1, 1), "Año Nuevo", "inamovible"),
        (p - timedelta(48), "Carnaval", "inamovible"),
        (p - timedelta(47), "Carnaval", "inamovible"),
        (date(anio, 3, 24), "Día Nacional de la Memoria por la Verdad y la Justicia", "inamovible"),
        (date(anio, 4, 2), "Día del Veterano y de los Caídos en la Guerra de Malvinas", "inamovible"),
        (p - timedelta(2), "Viernes Santo", "inamovible"),
        (date(anio, 5, 1), "Día del Trabajador", "inamovible"),
        (date(anio, 5, 25), "Día de la Revolución de Mayo", "inamovible"),
        (_trasladar(date(anio, 6, 17)), "Paso a la Inmortalidad del Gral. Martín Miguel de Güemes", "trasladable"),
        (date(anio, 6, 20), "Paso a la Inmortalidad del Gral. Manuel Belgrano", "inamovible"),
        (date(anio, 7, 9), "Día de la Independencia", "inamovible"),
        (_trasladar(date(anio, 8, 17)), "Paso a la Inmortalidad del Gral. José de San Martín", "trasladable"),
        (_trasladar(date(anio, 10, 12)), "Día del Respeto a la Diversidad Cultural", "trasladable"),
        (_trasladar(date(anio, 11, 20)), "Día de la Soberanía Nacional", "trasladable"),
        (date(anio, 12, 8), "Inmaculada Concepción de María", "inamovible"),
        (date(anio, 12, 25), "Navidad", "inamovible"),
    ]
    return sorted(({"fecha": f.isoformat(), "nombre": n, "tipo": t} for f, n, t in lista), key=lambda x: x["fecha"])

def _a_fecha(f):
    return f if isinstance(f, date) else date.fromisoformat(str(f)[:10])

def es_feriado(f):
    f = _a_fecha(f)
    return next((x for x in feriados(f.year) if x["fecha"] == f.isoformat()), None)

def es_dia_habil(f):
    f = _a_fecha(f)
    return f.isoweekday() < 6 and not es_feriado(f)

def sumar_dias_habiles(f, n):
    d = _a_fecha(f); paso = -1 if n < 0 else 1; falta = abs(n)
    while falta > 0:
        d += timedelta(days=paso)
        if es_dia_habil(d):
            falta -= 1
    return d.isoformat()


# ---------- Laboral (Ley de Contrato de Trabajo 20.744, con la Ley 27.802 de 2026) ----------
# Todo es una estimación: el convenio colectivo y cada caso pueden cambiar el resultado.
import calendar

def _r2(n):
    # mismo redondeo que Math.round de JavaScript (mitades hacia arriba)
    import math
    return math.floor(n * 100 + 0.5) / 100

def _mas_meses(f, m):
    f = _a_fecha(f)
    total = f.year * 12 + (f.month - 1) + m
    a, mes = divmod(total, 12)
    ult = calendar.monthrange(a, mes + 1)[1]
    return date(a, mes + 1, min(f.day, ult))

def _dias_entre(a, b):
    return (_a_fecha(b) - _a_fecha(a)).days

def _dias_del_mes(f):
    f = _a_fecha(f)
    return calendar.monthrange(f.year, f.month)[1]

def _dias_del_anio(a):
    return 366 if calendar.isleap(a) else 365

def _chequear(n, nombre):
    if n is None or n < 0:
        raise ValueError(nombre + " tiene que ser un número positivo")

def antiguedad(ingreso, egreso):
    ingreso, egreso = _a_fecha(ingreso), _a_fecha(egreso)
    if egreso < ingreso:
        raise ValueError("La fecha de egreso es anterior al ingreso")
    meses = 0
    while _mas_meses(ingreso, meses + 1) <= egreso:
        meses += 1
    return {"anios": meses // 12, "meses": meses % 12, "dias": _dias_entre(_mas_meses(ingreso, meses), egreso)}

def aguinaldo(mejor_sueldo, anio=None, semestre=1, ingreso=None, egreso=None):
    _chequear(mejor_sueldo, "El sueldo")
    if anio is None:
        anio = _a_fecha(egreso).year if egreso else date.today().year
    ini = date(anio, 1, 1) if semestre == 1 else date(anio, 7, 1)
    fin = date(anio, 6, 30) if semestre == 1 else date(anio, 12, 31)
    desde = max(ini, _a_fecha(ingreso)) if ingreso else ini
    hasta = min(fin, _a_fecha(egreso)) if egreso else fin
    total = _dias_entre(ini, fin) + 1
    trabajados = max(0, _dias_entre(desde, hasta) + 1)
    return {"semestre": semestre, "anio": anio, "diasSemestre": total, "diasTrabajados": trabajados,
            "completo": _r2(mejor_sueldo / 2), "monto": _r2(mejor_sueldo / 2 * trabajados / total)}

def _dias_vacaciones(ingreso, anio):
    a = antiguedad(ingreso, date(anio, 12, 31))["anios"]
    dias = 14 if a < 5 else 21 if a < 10 else 28 if a < 20 else 35
    ini = max(_a_fecha(ingreso), date(anio, 1, 1))
    hab_anio = hab_trab = 0
    d = date(anio, 1, 1)
    while d.year == anio:
        if es_dia_habil(d):
            hab_anio += 1
            if d >= ini:
                hab_trab += 1
        d += timedelta(days=1)
    if hab_trab < hab_anio / 2:
        return {"dias": hab_trab // 20, "antiguedadAnios": a, "proporcional": True, "habilesTrabajados": hab_trab}
    return {"dias": dias, "antiguedadAnios": a, "proporcional": False, "habilesTrabajados": hab_trab}

def vacaciones(sueldo, ingreso, anio=None):
    _chequear(sueldo, "El sueldo")
    v = _dias_vacaciones(ingreso, anio or date.today().year)
    v.update({"porDia": _r2(sueldo / 25), "monto": _r2(sueldo / 25 * v["dias"]), "plus": _r2((sueldo / 25 - sueldo / 30) * v["dias"])})
    return v

def sueldo_neto(bruto, tope=None, sindicato=0):
    _chequear(bruto, "El sueldo bruto")
    base = min(bruto, tope) if tope else bruto
    jub, pami, os_, sin = _r2(base * 0.11), _r2(base * 0.03), _r2(base * 0.03), _r2(bruto * sindicato / 100)
    desc = _r2(jub + pami + os_ + sin)
    return {"bruto": _r2(bruto), "base": _r2(base), "jubilacion": jub, "pami": pami, "obraSocial": os_,
            "sindicato": sin, "descuentos": desc, "neto": _r2(bruto - desc)}

def liquidacion_despido(ingreso, egreso, sueldo, tope_convenio=None, con_preaviso=False, sin_vacaciones=False):
    _chequear(sueldo, "El sueldo")
    ingreso, egreso = _a_fecha(ingreso), _a_fecha(egreso)
    ant = antiguedad(ingreso, egreso)
    prueba = _mas_meses(ingreso, 6) > egreso
    rubros = []
    def add(concepto, monto, nota=""):
        rubros.append({"concepto": concepto, "monto": _r2(monto), "nota": nota})
    dm = _dias_del_mes(egreso)
    dias_mes = min(egreso.day, _dias_entre(max(ingreso, egreso.replace(day=1)), egreso) + 1)
    add("Días trabajados del mes", sueldo / dm * dias_mes, f"{dias_mes} de {dm} días")
    if not prueba:
        periodos = ant["anios"] + (1 if _mas_meses(ingreso, ant["anios"] * 12 + 3) < egreso else 0)
        periodos = max(1, periodos)
        base, nota_base = sueldo, ""
        if tope_convenio and sueldo > tope_convenio:
            base = max(tope_convenio, sueldo * 0.67)
            nota_base = " (con el tope del convenio)" if base == tope_convenio else " (tope del convenio, con el piso del 67%)"
        add("Indemnización por antigüedad (art. 245)", base * periodos, f"{periodos} × $ {_fmt_js(_r2(base))}{nota_base}")
    preaviso = integracion = 0
    if not prueba and not con_preaviso:
        meses = 2 if _mas_meses(ingreso, 60) < egreso else 1
        preaviso = sueldo * meses
        add("Preaviso no dado", preaviso, f"{meses} {'mes' if meses == 1 else 'meses'} de sueldo")
        faltan = dm - egreso.day
        if faltan > 0:
            integracion = sueldo / dm * faltan
            add("Integración del mes de despido", integracion, f"{faltan} días que faltaban del mes")
    sem = 1 if egreso.month <= 6 else 2
    sac = aguinaldo(sueldo, anio=egreso.year, semestre=sem, ingreso=ingreso, egreso=egreso)
    add("Aguinaldo proporcional", sac["monto"], f"{sac['diasTrabajados']} de {sac['diasSemestre']} días del semestre")
    dv = _dias_vacaciones(ingreso, egreso.year)
    inicio = max(ingreso, date(egreso.year, 1, 1))
    dias_anio = _dias_entre(inicio, egreso) + 1
    dias_vac = dv["dias"] if dv["proporcional"] else dv["dias"] * dias_anio / _dias_del_anio(egreso.year)
    vac = sueldo / 25 * dias_vac
    if not sin_vacaciones:
        add("Vacaciones no gozadas", vac, f"{_fmt_js(_r2(dias_vac))} días (sueldo / 25)")
    sac_extra = (preaviso + integracion + (0 if sin_vacaciones else vac)) / 12
    if sac_extra > 0:
        add("Aguinaldo sobre preaviso, integración y vacaciones", sac_extra, "Criterio habitual; confirmalo")
    return {"antiguedad": ant, "periodoPrueba": prueba, "rubros": rubros, "total": _r2(sum(x["monto"] for x in rubros))}

def _fmt_js(n):
    # número como lo escribe JavaScript (sin ".0" en los enteros)
    return str(int(n)) if float(n).is_integer() else repr(n)
