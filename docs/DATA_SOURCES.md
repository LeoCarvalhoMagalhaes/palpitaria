# Fontes de dados

Verificação inicial: 27/10/2026. Reconfirme as licenças antes de qualquer uso comercial.

| Jogo | Fonte | Acesso | Licença | Atribuição | Observações |
|---|---|---|---|---|---|
| Mundaréu, Mais ou Menos | Natural Earth Admin 0 Countries 1:50m | naturalearthdata.com | Domínio público | Não | Geometria, nomes em português, distâncias pré-calculadas, população e área |
| Na Etiqueta, Mais ou Menos (Preços) | Base de produtos e preços em US$ (3.399 itens), Copyright (c) 2023 KermWasTaken | Arquivo `games.json` publicado pelo autor no GitHub | **MIT** | Manter o aviso MIT (ver THIRD_PARTY_LICENSES.md) | Preços de um atacado dos EUA, compilados em 2022–2023 com apoio do Costco Food Database; não usar nome ou logo da loja. Usamos nome e preço; as imagens da base foram descartadas |
| Na Etiqueta, Mais ou Menos (Preços) | Open Food Facts: despejo CSV oficial (en.openfoodfacts.org.products.csv.gz), lido em fluxo; fotos da frente da embalagem | static.openfoodfacts.org (redireciona para o S3 do projeto); o robots.txt só bloqueia /api, /cgi e /facets | Base ODbL; fotos CC BY-SA 3.0 | Link para a página do produto em cada foto | Casamento por marca + palavras do nome (`off-match.mjs`): 1.652 de 3.385 produtos; o produto do dia sai só entre os que têm foto |
| Grauzinho | Sem base: ângulo gerado pela semente da data | — | — | — | Gerador próprio |
| Juntô | 40 quebra-cabeças autorais em português e 40 em inglês (rascunhos para revisão humana em `/revisao-junto`) | — | Próprio | — | Solução única conferida |
| Palavreta, Rastro, Letra por Letra | Dicionário e tesauro VERO pt_BR (LibreOffice) | github.com/LibreOffice/dictionaries | LGPLv3 / MPL (dupla) | Créditos aos autores | Lista derivada redistribuída sob MPL; respostas da Palavreta curadas por nós |
| Palavreta, Letra por Letra, Rastro (inglês) | Lista dwyl/english-words (`words_alpha.txt`) | github.com/dwyl/english-words | Unlicense | Não | Validar palpites e grafias |
| Juntô, Letra por Letra, Palavreta (inglês) | Conteúdo autoral em inglês: 40 quebra-cabeças, 150 palavras com definição e frase, 509 respostas | — | Próprio | — | Conferido no dicionário dwyl |
| Letra por Letra | Voz do aparelho (Web Speech API) + banco autoral de palavras | — | Próprio | — | Sem áudio gravado |
| Rastro | FrequencyWords pt_BR e en (OpenSubtitles 2018) | github.com/hermitdave/FrequencyWords | CC BY-SA 4.0 | Sim | Lista derivada sob a mesma licença; também detecta títulos em inglês no Refrão Cruzado |
| Rastro | Modelo LaBSE (ONNX Xenova/LaBSE), rodado localmente | huggingface.co | Apache-2.0 | Sim | Proximidade de sentido |
| Toca Aí, Refrão Cruzado | Ranking das músicas mais tocadas do Spotify | kworb.net/spotify/songs.html e páginas de artista (robots: Allow /) | Sem licença declarada; usamos só artista, título, streams e ID (fatos) | Citar o Kworb | Top 2.500 (2.338 com ID; 2.166 com prévia). A resposta do Toca Aí sai só das 1.000 primeiras |
| Toca Aí, Refrão Cruzado, Holofote | Prévias oficiais de 30 s da Apple Music (iTunes `/lookup` + arquivo de prévia, tocados com Web Audio) | itunes.apple.com/lookup | Documentação arquivada da Apple restringe prévias a uso promocional | "Prévia cedida pela Apple Music" + link para a faixa | Risco aceito pelo dono do projeto |
| Toca Aí, Refrão Cruzado | Faixas além das 1.000 primeiras: ID do artista na Apple (pelas faixas já casadas ou Wikidata P1902 → P2850) e lista de músicas dele por `/lookup?id=<artista>&entity=song` (`scripts/data/musicas/apple-artists.mjs`) | itunes.apple.com/lookup + query.wikidata.org | — | — | Só `/lookup`, ~20 consultas por minuto |
| Toca Aí | Gênero, ano e ID da Apple | iTunes Search API, coleta única (cache) | — | — | O robots.txt de itunes.apple.com bloqueia `/search*` para robôs: a coleta já feita não será repetida; o site usa só `/lookup?id=` |
| Holofote | MusicBrainz (dados centrais) | musicbrainz.org/doc/About/Data_License | CC0 | Não | Limite de 1 req/s |
| Holofote | ListenBrainz (estatística sitewide all_time) | api.listenbrainz.org | CC0 | Não | Ranking retorna no máximo ~1.000 artistas |
| Holofote | Lista de artistas mais ouvidos do Kworb, ligada ao MusicBrainz pelo Wikidata (P1902 → P434); popularidade pelo total de audições de cada artista no ListenBrainz | kworb.net/spotify/artists.html + query.wikidata.org + api.listenbrainz.org | Fatos (nome e ID); CC0 | Citar o Kworb | Amplia os palpites para ~2.350 artistas; a resposta do dia continua saindo dos 500 primeiros do ranking do ListenBrainz |
| Mais ou Menos | Wikimedia Pageviews (top mensal da Wikipédia em pt e en, 12 meses) | wikimedia.org/api/rest_v1 | CC0 | Não | — |
| Mais ou Menos | IBGE: estimativas da população (agregado 6579) | servicodados.ibge.gov.br | Dados públicos | Citar IBGE | — |
| Mais ou Menos | Wikidata: altitude (P2044), comprimento (P2043), ligação dos filmes ao IMDb (P345) e à Apple (P6398) | query.wikidata.org | CC0 | Não | — |
| Mais ou Menos (Nota dos filmes) | IMDb Non-Commercial Datasets (`title.ratings.tsv.gz`): nota média e votos | datasets.imdbws.com | Uso pessoal e não comercial; "Information courtesy of IMDb (https://www.imdb.com). Used with permission." | Sim | O site do IMDb proíbe coleta automática: nada é coletado de imdb.com, e as imagens do IMDb não são usadas |
| Mais ou Menos (pôsteres e capas) | Apple: pôster do filme (Wikidata P6398 → /lookup) e capa do álbum das músicas | itunes.apple.com/lookup, em lote (150 IDs por pedido, com pausa) | Arte promocional da Apple | Link para a página do IMDb (filmes) ou da faixa (músicas) | Só entram filmes com pôster confirmado (400) |
| Mais ou Menos (Preços e Curiosidades) | Fatos escritos por nós (`scripts/data/mais-ou-menos/facts.mjs`), com valores conferidos nos artigos da Wikipédia em inglês | en.wikipedia.org | Conteúdo próprio | Link para o artigo em cada fato (`wiki`) | Preços em dólares da época |
| Holofote, Mais ou Menos | Fotos do Wikimedia Commons ligadas no Wikidata (P18; bandeiras P41; cidades via P1585) ou imagem livre principal de um artigo relacionado | query.wikidata.org + upload.wikimedia.org | Licença de cada arquivo (CC0, PD, CC BY, CC BY-SA…) | Link para a página do arquivo em cada foto | Cópias redimensionadas servidas pelo site (`public/img/c/`, WebP), feitas por `scripts/data/lib/localize-images.mjs`, porque o upload.wikimedia.org respondia 429 quando o jogo pedia muitas imagens de uma vez |

## Uso das APIs da Wikimedia

As coletas (Wikidata SPARQL, API do Commons, Pageviews e miniaturas) rodam só no build, com `User-Agent` identificado (projeto + contato), cache em
`scripts/.cache/wikimedia/` e novas tentativas com espera em respostas 429/5xx, seguindo a política de User-Agent e as diretrizes de uso da API.

## Áudio (histórico)

1. Primeira versão: playlists públicas do SoundCloud. Descartada: eram listas de usuários, e o `robots.txt` do SoundCloud bloqueia agentes Claude, então não dava para coletar faixas oficiais automaticamente.
2. Top 1.000 do Spotify (Kworb) com o player embed do Spotify. Descartado: o embed não permite controlar o trecho com precisão e a política do Spotify proíbe quizzes.
3. Versão atual: mesma base, com as prévias oficiais da Apple Music tocadas via Web Audio. Medido em Chrome: trechos de 130 ms, 530 ms, 2 s e 8 s duraram 155, 552, 2019 e 8023 ms.
