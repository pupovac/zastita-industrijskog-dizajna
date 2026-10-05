#!/usr/bin/env python3
"""Render the ZIS requirements matrix (JSON source of truth) to Markdown and CSV.

Usage (from repo root):
    python3 docs/faza-2/render_matrix.py
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "matrica-zahteva-zis.json"
MD = HERE / "matrica-zahteva-zis.md"
CSV = HERE / "matrica-zahteva-zis.csv"


def cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def sources_md(row) -> str:
    return "<br>".join(
        f"**{s['id']}** · {s['document']} · {s['url']} · {s['location']}" for s in row["sources"]
    )


def sources_flat(row) -> str:
    return " || ".join(f"{s['id']} | {s['document']} | {s['url']} | {s['location']}" for s in row["sources"])


def phases_text(row) -> str:
    return "; ".join(p["name"] for p in row["phases"])


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    rows = data["requirements"]

    header = ["ID", "Oblast", "Zahtev", "Klasifikacija", "source_type", "Izvor",
              "Datum pristupa", "Status", "Uticaj na prijavu panela", "Faza koja ga koristi"]

    out = []
    out.append(f"Verzija {data['version']} · faza {data['phase']} · generisano {data['generated']} iz "
               "`matrica-zahteva-zis.json` skriptom `render_matrix.py`. Ne uređivati ručno — menjati JSON i ponovo pokrenuti skriptu.\n")
    out.append("Projekat: prijava za priznanje prava na industrijski dizajn — EPS fasadni termoizolacioni panel sa unapred nanetim završnim slojem. "
               "Ovo je evidencija zahteva iz zvaničnih izvora, ne pravni savet.\n")
    out.append("## Kako čitati matricu\n")
    out.append("- **ID**: `MZ-xxx` je zahtev; `NS-xx` je neusklađenost između izvora (navedena su oba izvora i koji ima prednost).")
    out.append("- **Klasifikacija**: `PRAVNI ZAHTEV` (iz zakona ili uredbe, sa članom), `ČINJENICA` (šta zvanični dokument ili stranica kaže), "
               "`AI ZAKLJUČAK` (tumačenje agenta), `PREPORUKA`.")
    out.append("- **source_type**: `ZIS` (dokument ili stranica ZIS-a), `DOCUMENT` (zakon, uredba, službeni glasnik), `WIPO`, `AGENT_INFERENCE`.")
    out.append("- **Izvor**: oznaka iz `docs/izvori/zapisi-izvora.md` (Z-xx), naziv dokumenta, URL i član ili strana. Lokalne kopije su u `docs/izvori/`.")
    out.append("- **Status**: `POTVRĐENO` znači da zahtev stoji u navedenom izvoru i da je izvor aktuelan na dan pristupa; "
               "`NEPROVERENO – …` znači da ga treba potvrditi (oznake P-xx / N-xx vode na sekciju N Rezultata).")
    out.append("- U koloni „Uticaj\" tekst sa oznakom `AI ZAKLJUČAK` ili `PREPORUKA` je tumačenje agenta, ne zahtev izvora.\n")

    counts = {}
    for r in rows:
        counts.setdefault(r["area"], [0, 0, 0])
        counts[r["area"]][0] += 1
        counts[r["area"]][1] += r["status"] != "POTVRĐENO"
        counts[r["area"]][2] += r["is_discrepancy"]
    out.append("## Pregled po oblastima\n")
    out.append("| Oblast | Redova | NEPROVERENO | Neusklađenosti |")
    out.append("|---|---|---|---|")
    for a in data["areas"]:
        c = counts.get(a["label"], [0, 0, 0])
        out.append(f"| {a['label']} | {c[0]} | {c[1]} | {c[2]} |")
    out.append(f"| **Ukupno** | **{len(rows)}** | **{sum(c[1] for c in counts.values())}** | **{sum(c[2] for c in counts.values())}** |\n")

    for a in data["areas"]:
        area_rows = [r for r in rows if r["area"] == a["label"]]
        if not area_rows:
            continue
        out.append(f"## {a['label'][0].upper() + a['label'][1:]}\n")
        out.append("| " + " | ".join(header) + " |")
        out.append("|" + "---|" * len(header))
        for r in area_rows:
            req = r["requirement"]
            if r.get("precedence"):
                req += f" **Prednost:** {r['precedence']}"
            status = r["status"]
            if r["open_items"]:
                status += " (" + ", ".join(r["open_items"]) + ")"
            vals = [r["id"], r["area"], req, r["classification"], r["source_type"], sources_md(r),
                    r["access_date"], status, r["impact"], phases_text(r)]
            out.append("| " + " | ".join(cell(v) for v in vals) + " |")
        out.append("")

    out.append("## Izvori korišćeni u matrici\n")
    out.append("| Oznaka | Dokument | URL |")
    out.append("|---|---|---|")
    for s in data["sources"]:
        out.append(f"| {s['id']} | {cell(s['document'])} | {s['url']} |")
    out.append("\nPuni zapisi (institucija, vrsta, verzija, lokalna kopija) su u `docs/izvori/zapisi-izvora.md`. "
               "U fazi 2 nije uveden nijedan novi izvor: svaki zahtev ima pokriće u Z-01 do Z-15.")

    MD.write_text("# Matrica zahteva ZIS-a\n\n" + "\n".join(out) + "\n", encoding="utf-8")

    with CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "area", "area_code", "requirement", "classification", "source_type", "sources",
                    "access_date", "status", "open_items", "impact", "phases", "is_discrepancy", "precedence"])
        for r in rows:
            w.writerow([r["id"], r["area"], r["area_code"], r["requirement"], r["classification"], r["source_type"],
                        sources_flat(r), r["access_date"], r["status"], ";".join(r["open_items"]), r["impact"],
                        ";".join(str(p["number"]) for p in r["phases"]), str(r["is_discrepancy"]).lower(),
                        r.get("precedence", "")])


if __name__ == "__main__":
    main()
