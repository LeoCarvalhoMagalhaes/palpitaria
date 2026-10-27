# Palpitaria

Portal de **11 jogos diários** em português. Um desafio novo por jogo, todo dia à meia-noite (horário do aparelho), com estatísticas, sequência, arquivo de dias anteriores e compartilhamento por emojis.

Publicado em: https://leocarvalhomagalhaes.github.io/palpitaria/

| Jogo | Inspirado em | O que é |
|---|---|---|
| Mundaréu | outro jogo | Descubra o país pelo "quente/frio" no globo |
| Na Etiqueta | outro jogo | Chute o preço de um produto (base MIT do outro jogo) |
| Grauzinho | outro jogo | Quantos graus tem o ângulo? |
| Juntô | outro jogo | 4 grupos de 4 palavras |
| Palavreta | outro jogo (outro jogo) | Palavra secreta de 5 letras |
| Toca Aí | outro jogo (outro jogo) | Reconheça a música pelo trechinho (top 1.000 do Spotify) |
| Letra por Letra | outro jogo (outro jogo) | Ouça e soletre |
| Mais ou Menos | outro jogo (outro jogo) | Qual dos dois tem mais? |
| Rastro | outro jogo (outro jogo) | Palavra secreta por proximidade de sentido |
| Holofote | outro jogo | Adivinhe o artista pelos atributos |
| Refrão Cruzado | outro jogo | Cruzadinha com pistas em áudio |

As regras foram reimplementadas a partir da observação dos jogos originais. Nomes, textos, visual e conteúdo editorial são próprios. Veja [docs/DECISOES.md](docs/DECISOES.md), [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) e [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Rodar

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # testes unitários (Vitest)
npm run test:e2e     # testes de ponta a ponta (Playwright, usa o Chrome instalado)
npm run typecheck
npm run lint
npm run build        # build de produção em dist/
```

## Publicação

Cada push no `main` roda `.github/workflows/pages.yml`: testes unitários, `npm run build:pages` (base `/palpitaria/`) e deploy no GitHub Pages. O `404.html` é uma cópia do `index.html` para as rotas funcionarem ao abrir um link direto.

## Páginas internas

- `/verificar-audio`: sorteia músicas da base e mede a duração real de cada trecho.

Teste com áudio real (faz poucas requisições à Apple): `AUDIO_REAL=1 npx playwright test e2e/audio-real.spec.ts --project=desktop`.
- `/revisao-junto`: aprovar ou rejeitar os quebra-cabeças do Juntô e exportar o JSON revisado para `public/data/junto/puzzles.json`.

## Dados

Os dados prontos ficam em `public/data/`. Para regerar, os scripts em `scripts/data/` baixam as fontes para `scripts/.cache/` (fora do git):

```bash
npm run data:mundareu       # Natural Earth → países, nomes pt-BR e matriz de distâncias
npm run data:na-etiqueta    # requer scripts/.cache/precos/games.json (repositório KermWasTaken)
npm run data:palavreta      # requer o VERO em scripts/.cache/vero (pt_BR.dic, pt_BR.aff, th_pt_BR.dat)
npm run data:mais-ou-menos  # Natural Earth + IBGE + Wikidata
npm run data:holofote       # ListenBrainz + MusicBrainz (~40 min, respeita 1 req/s; tem cache)
npm run data:rastro         # modelo LaBSE local (~10 min na CPU)
npm run data:musicas        # top 1.000 do Spotify (Kworb) + IDs + gênero/ano da Apple (~1 h, com cache)
```

## Estrutura

```
src/config/        nomes, descrições, cores e datas dos jogos; categorias de música
src/core/          dia/semente, armazenamento, estatísticas, compartilhar, áudio (prévias via Web Audio), voz
src/components/    GameShell, teclado virtual, autocomplete, painéis
src/games/<jogo>/  logic.ts (regras puras + testes) e Game.tsx (interface)
public/data/       conteúdo de cada jogo
scripts/data/      geração reproduzível dos dados
e2e/               testes Playwright
```
