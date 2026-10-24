"""Baja el IPC (INDEC) y el ICL (BCRA), los cruza entre fuentes y guarda docs/datos/indices.json.

Lo corre una GitHub Action todos los días. Si algo no cierra (fuentes que no coinciden,
un dato viejo que cambió), NO escribe nada y termina con error para que llegue el aviso.
Solo usa la biblioteca estándar de Python.
"""
import json, os, sys, urllib.request
from datetime import datetime, timezone, timedelta

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "..", "docs", "datos", "indices.json")
TOLERANCIA = 0.11  # puntos porcentuales

# Fechas en que el INDEC publica el IPC (calendario oficial). Las que no estén acá se
# suponen el día 15 del mes siguiente. Clave: mes del IPC; valor: día de publicación.
PUBLICACION_IPC = {
    "2026-08": "2026-09-14",
    "2026-09": "2026-10-13",
    "2026-10": "2026-11-12",
    "2026-11": "2026-12-15",
}

def bajar(url):
    pedido = urllib.request.Request(url, headers={"User-Agent": "utilidades-argentina (github.com/IgnacioPelliza)"})
    with urllib.request.urlopen(pedido, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))

def problema(msg):
    print("PROBLEMA:", msg)
    sys.exit(1)

def main():
    # IPC mensual (% de variación) de ArgentinaDatos: fecha = último día del mes
    ad = bajar("https://api.argentinadatos.com/v1/finanzas/indices/inflacion")
    ipc = {x["fecha"][:7]: round(float(x["valor"]), 1) for x in ad if x["fecha"] >= "2000-01-01"}
    # IPC oficial de datos.gob.ar (INDEC) para cruzar
    dg = bajar("https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&format=json&sort=desc&limit=60&representation_mode=percent_change")
    oficial = {f[:7]: round(v * 100, 1) for f, v in dg["data"] if v is not None}
    for mes, v in oficial.items():
        if mes in ipc and abs(ipc[mes] - v) > TOLERANCIA:
            problema(f"IPC {mes}: ArgentinaDatos dice {ipc[mes]} y datos.gob.ar dice {v}")
        ipc.setdefault(mes, v)
    for mes, v in ipc.items():
        if not (-5 < v < 30):
            problema(f"IPC {mes} fuera de rango: {v}")

    # ICL diario del BCRA (variable 40)
    b = bajar("https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40?desde=2020-06-30&hasta=2030-12-31&limit=3000")
    det = b["results"][0]["detalle"]
    icl = {x["fecha"]: float(x["valor"]) for x in det}
    if len(icl) < 2000 or icl.get("2020-07-01") != 1.0:
        problema(f"ICL incompleto ({len(icl)} valores)")

    # No aceptar que cambien datos que ya teníamos
    if os.path.exists(SALIDA):
        viejo = json.load(open(SALIDA, encoding="utf-8"))
        for mes, v in viejo.get("ipc", {}).items():
            if mes in ipc and abs(ipc[mes] - v) > TOLERANCIA:
                problema(f"El IPC de {mes} cambió de {v} a {ipc[mes]}")
            ipc.setdefault(mes, v)
        for f, v in viejo.get("icl", {}).items():
            if f in icl and abs(icl[f] - v) > 0.011:
                problema(f"El ICL del {f} cambió de {v} a {icl[f]}")
            icl.setdefault(f, v)

    datos = {
        "actualizado": datetime.now(timezone(timedelta(hours=-3))).strftime("%Y-%m-%d %H:%M"),
        "fuentes": {
            "ipc": "INDEC, vía ArgentinaDatos y datos.gob.ar (variación mensual, nivel general nacional)",
            "icl": "BCRA, API de Estadísticas v4.0, variable 40 (Índice para Contratos de Locación)",
        },
        "publicacionIPC": PUBLICACION_IPC,
        "ipc": dict(sorted(ipc.items())),
        "icl": dict(sorted(icl.items())),
    }
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, separators=(",", ":"))
    print(f"OK: IPC hasta {max(ipc)}, ICL hasta {max(icl)}, {len(ipc)} meses y {len(icl)} días")

if __name__ == "__main__":
    main()
