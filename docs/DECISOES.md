# Decisões de regra

Origem: **observada** = extraída do código público do jogo original em 27/10/2026; **proposta** = escolha nossa, revisável.

| Jogo | Ponto | Regra adotada | Origem |
|---|---|---|---|
| Todos | Virada do dia | Meia-noite local do aparelho; nº do desafio = dias desde 20/10/2026 + 1 | Observada (outro jogo FAQ; outro jogo, outro jogo e outro jogo usam o relógio local) |
| Todos | Sequência | Vitórias em dias seguidos; arquivo não conta | Proposta |
| Mundaréu | Escala de cor | Domínio 15.000 km → 0 km; OrRd (padrão), Blues (daltônico), Arco-íris, Cinza | Observada |
| Mundaréu | Compartilhar | Linhas de 8; 🟥 <10%, 🟧 <25%, 🟨 <50%, ⬜ resto, 🟩 acerto | Observada |
| Mundaréu | "Quase faz fronteira" | Distância ≤ 100 km | Proposta (valor não encontrado no original) |
| Mundaréu | Países jogáveis | Soberanos do Natural Earth + Israel, Kosovo, Palestina, Taiwan; sem Somalilândia, Chipre do Norte, Saara Ocidental, Antártida | Proposta (o "framework" do original não foi capturado) |
| Mundaréu | França–Brasil | Distância 0 (a Guiana Francesa faz parte do polígono da França no Natural Earth) | Consequência dos dados, igual ao original |
| Na Etiqueta | Regras | 6 chutes; vitória ≤5%; 🟨 ≤25%; 🟥 >25%; seta = direção do preço | Observada |
| Na Etiqueta | Moeda | US$ (base original), com aviso "atacado dos EUA, 2022–2023" | Pedido do usuário |
| Grauzinho | Regras | 4 palpites, inteiro exato de 0 a 360, rótulos de temperatura <10/<20/<35/<60/<100 | Observada |
| Grauzinho | Bônus | Construir o ângulo: 3 tentativas, ±5° | Observada |
| Juntô | Dicas | 2 palavras do grupo mais fácil, depois 3; sem dica com 3 grupos resolvidos | Observada |
| Juntô | Aviso "quase" | Não existe | Observada (ausente no código) |
| Palavreta | Tamanho | Só 5 letras, 6 palpites, modos Difícil e Às cegas, desafio personalizado por link | Proposta (o original tem seletor; simplificamos) |
| Toca Aí | Trechos | 0,13 / 0,53 / 2 / 8 / 15 s, 5 tentativas, Pular | Observada |
| Toca Aí | Base | Top 1.000 do Spotify (Kworb); só músicas com prévia da Apple podem ser a resposta (934); todas valem como palpite | Pedido do usuário |
| Toca Aí | Áudio | Prévia oficial da Apple tocada por Web Audio com início e duração exatos; barra enche em tempo real; no fim, capa e links Apple Music/Spotify | Observada (outro jogo/outro jogo) |
| Toca Aí | Categorias | Todas, Pop, Hip Hop e Rock (gênero da Apple); categoria com menos de 30 músicas não aparece; vitória com metade ou mais | Proposta |
| Toca Aí | Início do trecho | Começo da faixa (0 s) | Proposta |
| Letra por Letra | Voz | Web Speech API pt-BR do aparelho | Proposta (gratuita; o original usa áudio gravado) |
| Letra por Letra | Grafia | Acentos, cedilha e hífen contam; 1 tentativa por rodada; vitória com 3+ | Proposta (1 tentativa observada) |
| Mais ou Menos | Categorias | As 5 do original, na mesma ordem: Google Searches → visualizações na Wikipédia (12 meses), Spotify Streams → Kworb, Movie Ratings → Metacritic (Wikidata), Prices → outro jogo (US$), Trivia → curiosidades (população, área, cidades, montanhas, rios); pares com diferença ≥15% | Observada (categorias); fontes substitutas propostas |
| Rastro | Vocabulário | 36,5 mil palavras mais frequentes do português (FrequencyWords, CC BY-SA) que existem no VERO; aceita plurais e conjugações; digitar sem acento vale | Proposta |
| Rastro | Dica | Custo 7/5/3 por faixas de distância ≥1000/≥160/≥2 | Observada |
| Rastro | Palavra revelada pela dica | Metade da posição do melhor palpite (ou posição 1000 sem palpites) | Proposta |
| Holofote | Amarelo | Estreia até 5 anos; popularidade até 50 posições; mesmo continente | Observada |
| Holofote | Integrantes | Formação ativa no fim da banda (ou atual); correções manuais para as bandas mais famosas | Proposta (o original usa a "formação mais icônica", curada à mão) |
| Holofote | Gêneros | Lista fechada de 13 + MPB, Sertanejo e Funk (nenhum artista brasileiro desses estilos está no top 1.000 global) | Proposta |
| Holofote | Dica | Após o 6º palpite: primeira letra e número de palavras do nome | Proposta (o original dá um subgênero) |
| Holofote | Áudio | No fim, prévia da música mais ouvida do artista, se ele estiver no top 1.000 (como o outro jogo) | Observada |
| Refrão Cruzado | Grade | 12×10, 5 a 8 palavras, geradas de 60 músicas do top 1.000 sorteadas pela data | Observado (12×10); geração automática é proposta |
| Refrão Cruzado | Trecho | 8 s do início da prévia da Apple (o original usa 6 s por padrão, com início por palavra); ouvir de novo à vontade | Observada/adaptada |
