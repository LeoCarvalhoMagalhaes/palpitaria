"""Expande o dicionário Hunspell pt_BR (VERO, LGPLv3/MPL) em formas flexionadas.

Gera em scripts/.cache/words/:
  - forms.txt   : todas as formas em minúsculas (uma por linha), apenas letras
  - lemmas.txt  : palavras-base do .dic em minúsculas
  - thes.txt    : verbetes do tesauro com o número de sentidos (indicador de uso comum)

Uso: python -I expand_vero.py <pasta-do-vero> <pasta-de-saida>
"""
import os
import re
import sys

LETTERS = re.compile(r"^[a-záàâãéêíóôõúüç]+$")


def parse_aff(path):
    rules = {}
    with open(path, encoding="utf-8-sig") as fh:
        lines = fh.read().splitlines()
    i = 0
    while i < len(lines):
        parts = lines[i].split()
        if len(parts) >= 4 and parts[0] in ("PFX", "SFX") and parts[2] in ("Y", "N"):
            kind, flag, cross, count = parts[0], parts[1], parts[2] == "Y", int(parts[3])
            entries = []
            for line in lines[i + 1 : i + 1 + count]:
                p = line.split()
                if len(p) < 4:
                    continue
                strip = "" if p[2] == "0" else p[2]
                add, _, cont = p[3].partition("/")
                add = "" if add == "0" else add
                cond = p[4] if len(p) > 4 else "."
                rx = re.compile(("^" + cond) if kind == "PFX" else (cond + "$"))
                entries.append((strip, add, cont, rx))
            rules[(kind, flag)] = (cross, entries)
            i += 1 + count
        else:
            i += 1
    return rules


def apply_sfx(word, flag, rules):
    out = []
    rule = rules.get(("SFX", flag))
    if not rule:
        return out
    for strip, add, cont, rx in rule[1]:
        if strip and not word.endswith(strip):
            continue
        if not rx.search(word):
            continue
        base = word[: len(word) - len(strip)] if strip else word
        out.append((base + add, cont, rule[0]))
    return out


def apply_pfx(word, flag, rules):
    out = []
    rule = rules.get(("PFX", flag))
    if not rule:
        return out
    for strip, add, cont, rx in rule[1]:
        if strip and not word.startswith(strip):
            continue
        if not rx.search(word):
            continue
        out.append(add + (word[len(strip) :] if strip else word))
    return out


def expand(word, flags, rules):
    forms = {word}
    sfx_forms = []
    for f in flags:
        for form, cont, cross in apply_sfx(word, f, rules):
            forms.add(form)
            sfx_forms.append((form, cross))
            for c in cont:  # sufixo duplo (continuação)
                for form2, _, cross2 in apply_sfx(form, c, rules):
                    forms.add(form2)
    for f in flags:
        rule = rules.get(("PFX", f))
        if not rule:
            continue
        for pform in apply_pfx(word, f, rules):
            forms.add(pform)
        if rule[0]:
            for sform, cross in sfx_forms:
                if cross:
                    for pform in apply_pfx(sform, f, rules):
                        forms.add(pform)
    return forms


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    rules = parse_aff(os.path.join(src, "pt_BR.aff"))
    forms, lemmas = set(), set()
    with open(os.path.join(src, "pt_BR.dic"), encoding="utf-8-sig") as fh:
        next(fh)
        for line in fh:
            line = line.strip()
            if not line:
                continue
            word, _, flags = line.partition("/")
            flags = flags.split()[0] if flags else ""
            if not word or word[0].isupper():
                continue  # nomes próprios e siglas ficam de fora
            if LETTERS.match(word):
                lemmas.add(word)
            for form in expand(word, flags, rules):
                if LETTERS.match(form):
                    forms.add(form)
    with open(os.path.join(out_dir, "forms.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(sorted(forms)))
    with open(os.path.join(out_dir, "lemmas.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(sorted(lemmas)))

    thes = {}
    with open(os.path.join(src, "th_pt_BR.dat"), encoding="utf-8", errors="ignore") as fh:
        next(fh)
        for line in fh:
            if line.startswith("("):
                continue
            head, _, n = line.strip().partition("|")
            if n.isdigit() and LETTERS.match(head):
                thes[head] = max(thes.get(head, 0), int(n))
    with open(os.path.join(out_dir, "thes.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(f"{w}\t{n}" for w, n in sorted(thes.items())))
    print(f"{len(forms)} formas, {len(lemmas)} lemas, {len(thes)} verbetes no tesauro")


if __name__ == "__main__":
    main()
