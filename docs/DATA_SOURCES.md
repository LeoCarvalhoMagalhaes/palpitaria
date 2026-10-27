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
| Toca Aí (outro jogo) | Widget do SoundCloud | Bundles do outro jogo (`w.soundcloud.com/player`) | Termos do SoundCloud | Player oficial visível com o crédito no fim | Não baixar nem hospedar áudio | **Usar o mesmo provedor** (autorizado pelo usuário), com playlists públicas |
| Letra por Letra (outro jogo) | Áudio gravado próprio | Bundles do outro jogo | Proprietário | — | — | **Substituir** pela voz do aparelho (Web Speech API) + banco autoral |
| Mais ou Menos (outro jogo) | Compilação própria (Google, Spotify, filmes) | Bundles do outro jogo | Proprietário | — | Dependem de Google/Spotify | **Substituir** por Natural Earth, IBGE e Wikidata |
| Mais ou Menos | IBGE: estimativas da população (agregado 6579) | servicodados.ibge.gov.br | Dados públicos | Citar IBGE | — | Usar |
| Mais ou Menos | Wikidata: altitude (P2044) e comprimento (P2043) | query.wikidata.org | CC0 | Não | — | Usar |
| Rastro (outro jogo) | API própria | Bundles do outro jogo | Proprietário | — | — | **Substituir** por modelo LaBSE (Apache-2.0) rodado localmente |
| Holofote (outro jogo) | Lista própria do outro jogo; prévia Apple Music no fim | Bundles `/_app/immutable/chunks/*.js` | Proprietário | — | Spotify proíbe jogos | **Substituir** por MusicBrainz + ListenBrainz |
| Holofote | MusicBrainz (dados centrais) | musicbrainz.org/doc/About/Data_License | CC0 | Não | Limite de 1 req/s | Usar |
| Holofote | ListenBrainz (estatística sitewide all_time) | api.listenbrainz.org | CC0 (confirmar) | Não | Ranking retorna no máximo ~1.000 artistas | Usar |
| Refrão Cruzado (outro jogo) | Grades editoriais no bundle; áudio por prévias da Apple Music | Bundles `/_app/immutable/chunks/*.js` | Proprietário | — | Não copiar grades | **Substituir**: grade gerada a partir da playlist do SoundCloud do dia |

## Playlists do SoundCloud

Listadas em `src/config/soundcloud-sources.ts`. Foram encontradas por busca na web. São playlists públicas de usuários, **não oficiais**, e podem ter faixas reenviadas sem autorização dos titulares, ser editadas ou sair do ar. Confira em `/verificar-audio` antes de publicar e troque o que não servir.

O `robots.txt` do SoundCloud bloqueia agentes de IA em páginas de usuários. Por isso nenhuma faixa foi baixada nem lida pelo agente que montou o projeto. O conteúdo é lido só no navegador de quem joga, pelo widget oficial.
