"""Gera public/data/palavreta/words.json.

- respostas: answers.txt (curadoria própria), validadas contra o dicionário VERO expandido
- palpites válidos: todas as formas de 5 letras do VERO (LGPLv3/MPL)
Palavras são comparadas sem acento; a forma com acento é usada para mostrar a resposta.
Uso: python -I build.py <raiz-do-projeto>
"""
import json
import os
import sys
import unicodedata


def fold(w):
    return unicodedata.normalize("NFD", w).encode("ascii", "ignore").decode().lower()


def main():
    root = sys.argv[1]
    cache = os.path.join(root, "scripts", ".cache", "words")
    forms = open(os.path.join(cache, "forms.txt"), encoding="utf-8").read().split()
    five = {}
    for w in forms:
        k = fold(w)
        if len(k) == 5 and k.isalpha():
            # Prefere a grafia com acento quando há as duas (ex.: "cafe" x "café").
            if k not in five or (five[k] == k and w != k):
                five[k] = w
    raw = open(os.path.join(root, "scripts", "data", "palavreta", "answers.txt"), encoding="utf-8").read().splitlines()
    answers, rejected = [], []
    seen = set()
    for line in raw:
        w = line.strip().lower()
        if not w or w.startswith("#"):
            continue
        k = fold(w)
        if len(k) != 5 or k not in five or k in seen:
            rejected.append(w)
            continue
        seen.add(k)
        answers.append(w)
    out = os.path.join(root, "public", "data", "palavreta")
    os.makedirs(out, exist_ok=True)
    payload = {
        "fonte": "Respostas: curadoria própria. Palpites: dicionário VERO pt_BR (LibreOffice)",
        "licenca": "VERO: LGPLv3 / MPL (dupla); lista derivada redistribuída sob MPL",
        "url": "https://github.com/LibreOffice/dictionaries/tree/master/pt_BR",
        "answers": answers,
        "valid": sorted(five.keys()),
        "display": {k: v for k, v in five.items() if k != v},
    }
    with open(os.path.join(out, "words.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(answers)} respostas, {len(five)} palpites válidos. Rejeitadas: {rejected}")


if __name__ == "__main__":
    main()
