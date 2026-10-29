# Fontes de dados

Verificação inicial: 27/10/2026. Reconfirme as licenças antes de qualquer uso comercial.

| Jogo | Fonte original identificada | Evidência | Licença | Atribuição exigida | Restrições | Decisão |
|---|---|---|---|---|---|---|
| Mundaréu (outro jogo) | Arquivos próprios do outro jogo (`country_data.json` etc.) | Bundles `/assets/Game-*.js`; repositório `(repositório de terceiros)` | **CC BY-NC-SA 4.0** | — | Não comercial e "compartilha igual" | **Substituir** pelo Natural Earth |
| Mundaréu | Natural Earth Admin 0 Countries 1:50m | naturalearthdata.com | Domínio público | Não | — | **Usar** (geometria, nomes PT, distâncias pré-calculadas) |
| Na Etiqueta (outro jogo) | `games.json` do repositório `KermWasTaken` (3.399 itens: nome, preço em US$, URL de imagem) | `scripts/main.js` → `fetch("./games.json")`; licença via API do GitHub | **MIT** (Copyright (c) 2023 KermWasTaken) | Manter aviso MIT | Dados compilados com apoio do Costco Food Database; não usar nome/logo da Costco | **Usar** nome e preço; imagens descartadas; categorias geradas por palavras-chave |
| Grauzinho (outro jogo) | Sem base: gerado por semente da data | Bundle `/static/js/main.*.js` | — | — | Código do outro jogo sem licença: nada copiado | Gerador próprio |
| Juntô (outro jogo) | Quebra-cabeças editoriais da outro jogo | Bundle `/assets/index-*.js` | Proprietário | — | Não copiar | **Substituir** por 40 quebra-cabeças autorais (rascunhos para revisão humana em `/revisao-junto`) |
| Palavreta (outro jogo) | API própria `(API de terceiros)` | Bundles Next.js | Proprietário | — | — | **Substituir**: respostas curadas + VERO |
| Palavreta, Rastro, Letra por Letra | Dicionário e tesauro VERO pt_BR (LibreOffice) | github.com/LibreOffice/dictionaries | LGPLv3 / MPL (dupla) | Créditos aos autores | Lista derivada redistribuída sob MPL | **Usar** para validar palavras |
| Toca Aí (outro jogo) | Base própria do outro jogo (API `/songless/search` e `/songless/guess`) + widget do SoundCloud | Bundles do outro jogo | Termos do outro jogo proíbem copiar material e acesso automatizado | — | Não copiar | **Substituir** (o usuário pediu a mesma base; recusado pelos termos) |
| Toca Aí e Refrão Cruzado | Ranking das músicas mais tocadas do Spotify | kworb.net/spotify/songs.html e páginas de artista (robots: Allow /) | Sem licença declarada; usamos só artista, título, streams e ID (fatos) | Citar o Kworb | — | **Usar** (top 1.000, como no projeto outro projeto) |
| Toca Aí, Refrão Cruzado e Holofote | Prévias oficiais de 30 s da Apple Music (iTunes `/lookup` + arquivo de prévia, tocados com Web Audio) | Mesmo provedor do outro jogo e do outro jogo; técnica de trecho exato do outro jogo (Howler/Web Audio) | Documentação arquivada da Apple restringe prévias a uso promocional | "Prévia cedida pela Apple Music" + link para a faixa | Risco aceito pelo dono do projeto | **Usar** (o embed do Spotify não permitia controlar o tempo do trecho) |
| Toca Aí | Gênero, ano e ID da Apple | iTunes Search API, coleta única (cache) | O robots.txt de itunes.apple.com bloqueia `/search*` para robôs: a coleta já feita não será repetida; o site usa só `/lookup?id=` no navegador do jogador | — | — | Usar o cache existente |
| Letra por Letra (outro jogo) | Áudio gravado próprio | Bundles do outro jogo | Proprietário | — | — | **Substituir** pela voz do aparelho (Web Speech API) + banco autoral |
| Mais ou Menos (outro jogo) | Compilação própria (Google, Spotify, filmes) | Bundles do outro jogo | Proprietário | — | Dependem de Google/Spotify | **Substituir** por Natural Earth, IBGE e Wikidata |
| Mais ou Menos | IBGE: estimativas da população (agregado 6579) | servicodados.ibge.gov.br | Dados públicos | Citar IBGE | — | Usar |
| Mais ou Menos | Wikidata: altitude (P2044) e comprimento (P2043) | query.wikidata.org | CC0 | Não | — | Usar |
| Rastro | FrequencyWords pt_BR (OpenSubtitles 2018) | github.com/hermitdave/FrequencyWords | CC BY-SA 4.0 | Sim | Lista derivada sob a mesma licença | **Usar** como vocabulário |
| Mais ou Menos | Wikimedia Pageviews (top mensal da pt.wikipedia, 12 meses) | wikimedia.org/api/rest_v1 | CC0 | Não | — | **Usar** no lugar das buscas do Google |
| Mais ou Menos | Notas do Metacritic no Wikidata (P444/P447) | query.wikidata.org | CC0 | Não | — | **Usar** |
| Rastro (outro jogo) | API própria | Bundles do outro jogo | Proprietário | — | — | **Substituir** por modelo LaBSE (Apache-2.0) rodado localmente |
| Holofote (outro jogo) | Lista própria do outro jogo; prévia Apple Music no fim | Bundles `/_app/immutable/chunks/*.js` | Proprietário | — | Spotify proíbe jogos | **Substituir** por MusicBrainz + ListenBrainz |
| Holofote | MusicBrainz (dados centrais) | musicbrainz.org/doc/About/Data_License | CC0 | Não | Limite de 1 req/s | Usar |
| Holofote | ListenBrainz (estatística sitewide all_time) | api.listenbrainz.org | CC0 (confirmar) | Não | Ranking retorna no máximo ~1.000 artistas | Usar |
| Refrão Cruzado (outro jogo) | Grades editoriais no bundle; áudio por prévias da Apple Music | Bundles `/_app/immutable/chunks/*.js` | Proprietário | — | Não copiar grades | **Substituir**: grade gerada a partir de 60 músicas do top 1.000 sorteadas por dia |
| Holofote, Mais ou Menos | Fotos do Wikimedia Commons ligadas no Wikidata (P18; bandeiras P41; cidades via P1585) | query.wikidata.org + upload.wikimedia.org | Licença de cada arquivo (CC0, PD, CC BY, CC BY-SA…) | Link para a página do arquivo em cada foto | Miniaturas de 330 px (tamanho padrão do Commons) | **Usar** |
| ~~Na Etiqueta, Mais ou Menos (Preços)~~ (substituído pelo Open Food Facts) | Fotos ilustrativas do Commons achadas por busca de texto (`filetype:bitmap`), só licenças CC0/PD/CC BY/CC BY-SA, título com todas as palavras do termo, sem "price", "logo" ou lojas | commons.wikimedia.org/w/api.php | Licença de cada arquivo | Link e licença abaixo da foto | Segunda etapa (`filter-images.cjs`) descarta homônimos e paisagens: 214 de 400 produtos ficam com foto, o resto mostra o emoji | **Usar** |
| Palavreta, Letra por Letra, Rastro (inglês) | Lista dwyl/english-words (`words_alpha.txt`) | github.com/dwyl/english-words | Unlicense | Não | — | **Usar** para validar palpites e grafias |
| Rastro (inglês), Refrão Cruzado | FrequencyWords en (OpenSubtitles 2018) | github.com/hermitdave/FrequencyWords | CC BY-SA 4.0 | Sim | Lista derivada sob a mesma licença | **Usar** (vocabulário do Rastro em inglês; detectar títulos em inglês) |
| Juntô, Letra por Letra, Palavreta (inglês) | Conteúdo autoral em inglês: 40 quebra-cabeças, 150 palavras com definição e frase, 509 respostas | — | Próprio | — | Conferido no dicionário dwyl; quebra-cabeças com solução única | **Usar** |

| Na Etiqueta, Mais ou Menos (Preços) | Open Food Facts: despejo CSV oficial (en.openfoodfacts.org.products.csv.gz), lido em fluxo; fotos da frente da embalagem | static.openfoodfacts.org (redireciona para o S3 do projeto); o robots.txt só bloqueia /api, /cgi e /facets | Base ODbL; fotos CC BY-SA 3.0 | Link para a página do produto em cada foto | Casamento por marca + palavras do nome (`off-match.mjs`): 1.652 de 3.385 produtos; o produto do dia sai só entre os que têm foto | **Usar** |
| Mais ou Menos (Nota dos filmes) | IMDb Non-Commercial Datasets (`title.ratings.tsv.gz`): nota média e votos | datasets.imdbws.com | Uso pessoal e não comercial; "Information courtesy of IMDb (https://www.imdb.com). Used with permission." | Sim | O site do IMDb proíbe coleta automática (robots.txt e Conditions of Use): nada é coletado de imdb.com, e as imagens do IMDb não são usadas | **Usar** só as notas, enquanto o projeto não for comercial |
| Mais ou Menos (pôsteres e capas) | Apple: pôster do filme (Wikidata P6398 → /lookup) e capa do álbum das músicas | itunes.apple.com/lookup, em lote (150 IDs por pedido, com pausa) | Arte promocional da Apple | Link para a página do IMDb (filmes) ou da faixa (músicas) | /lookup é permitido pelo robots.txt; /search não é usado | **Usar**; só entram filmes com pôster confirmado (400) |
| Holofote, Mais ou Menos | Cópias das miniaturas do Commons servidas pelo site (`public/img/c/`, WebP até 480 px) | `scripts/data/lib/localize-images.mjs` | Licença de cada arquivo | Link para a página do arquivo | O upload.wikimedia.org respondia 429 quando o jogo pedia muitas imagens de uma vez | **Usar** |

## Uso das APIs da Wikimedia

As coletas (Wikidata SPARQL, API do Commons e Pageviews) rodam só no build, com `User-Agent` identificado (projeto + contato), cache em
`scripts/.cache/wikimedia/` e novas tentativas com espera em respostas 429/5xx, seguindo a política de User-Agent e as diretrizes de uso da API.
O site só carrega as miniaturas publicadas em `upload.wikimedia.org`, como qualquer página que exibe imagens do Commons.

## Áudio (histórico)

1. Primeira versão: playlists públicas do SoundCloud. Descartada: eram listas de usuários, e o `robots.txt` do SoundCloud bloqueia agentes Claude, então não dava para coletar faixas oficiais automaticamente.
2. Pedido de usar a base do outro jogo (outro jogo): recusado, porque os Termos de Serviço do outro jogo proíbem copiar material do serviço e acessá-lo de forma automatizada.
3. Top 1.000 do Spotify (Kworb) com o player embed do Spotify, como no `outro projeto`. Descartado: o embed não permite controlar o trecho com precisão e a política do Spotify proíbe quizzes.
4. Versão atual: mesma base, com as prévias oficiais da Apple Music tocadas via Web Audio, como o outro jogo (provedor) e o outro jogo (técnica). Medido em Chrome: trechos de 130 ms, 530 ms, 2 s e 8 s duraram 155, 552, 2019 e 8023 ms.
