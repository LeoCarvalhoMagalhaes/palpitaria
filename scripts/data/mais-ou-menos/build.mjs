// Gera public/data/mais-ou-menos/categories.json (pt) e categories-en.json (en) com as 5 categorias do
// outro jogo (outro jogo). Cada item tem nome em português e inglês e, quando existe, uma imagem livre do
// Wikimedia Commons (via Wikidata P18/P41). Fontes:
//  1. Popularidade na internet — visualizações na Wikipédia (pt para a versão pt, en para a versão en)
//  2. Streams no Spotify — Kworb, com a capa do álbum (Apple, /lookup em lote)
//  3. Nota dos filmes — nota do IMDb (conjunto de dados oficial, uso não comercial), ligada ao filme pelo
//     Wikidata (P345); pôster oficial da Apple (Wikidata P6398 + /lookup em lote)
//  4. Preços — mistura de tipos: produtos de mercado (outro jogo, MIT, com foto do Open Food Facts) e custos
//     históricos (foguetes, obras, roubos, obras de arte...) escritos em facts.mjs a partir da Wikipédia
//  5. Curiosidades — mistura de tipos: Natural Earth (população/área + bandeiras), IBGE (cidades), Wikidata
//     (montanhas, rios) e os fatos de facts.mjs (alturas, distâncias, recordes, números do dia a dia)
import fs from "node:fs/promises";
import path from "node:path";
import * as turf from "@turf/turf";
import zlib from "node:zlib";
import {
  ROOT,
  cachedFetchJson,
  chunk,
  fileFromCommonsUrl,
  imageRef,
  sparql,
} from "../lib/wikimedia.mjs";
import { appleLookup, artwork } from "../lib/apple.mjs";
import { PRICE_FACTS, TRIVIA_FACTS } from "./facts.mjs";

const today = new Date().toISOString().slice(0, 10);
const img = (r, key = "img") =>
  r[key] ? imageRef(fileFromCommonsUrl(r[key].value)) : null;

function dedupe(items) {
  const seen = new Set();
  return items.filter((i) => {
    if (/^Q\d+$/.test(i.name) || seen.has(i.name) || !(i.value > 0))
      return false;
    seen.add(i.name);
    return true;
  });
}

async function topPages(lang) {
  const totals = new Map();
  const now = new Date();
  for (let k = 1; k <= 12; k++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1),
    );
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const json = await cachedFetchJson(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia/all-access/${y}/${m}/all-days`,
      `pageviews-${lang}-${y}-${m}`,
    );
    for (const a of json.items[0].articles) {
      const t = a.article;
      if (
        t.includes(":") ||
        t === "-" ||
        t.startsWith(".") ||
        /\.(php|phtml|html?)$/i.test(t) ||
        /^(Main_Page|Lista_de|List_of|Pesquisas_de_opinião|Mortes_em|Deaths_in|\d{4}(_in_.*)?$)/.test(
          t,
        )
      )
        continue;
      const entry = totals.get(t) ?? { views: 0, months: 0 };
      entry.views += a.views;
      entry.months += 1;
      totals.set(t, entry);
    }
  }
  const top = [...totals.entries()]
    .filter(([, v]) => v.months >= 3)
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 300);
  // Imagem e nome no outro idioma pelo Wikidata (ligação pelo título do artigo).
  const other = lang === "pt" ? "en" : "pt";
  const meta = new Map();
  for (const [i, batch] of chunk(
    top.map(([t]) => t.replace(/_/g, " ")),
    80,
  ).entries()) {
    const values = batch
      .map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"@${lang}`)
      .join(" ");
    const rows = await sparql(
      `SELECT ?title ?img ?otherLabel WHERE {
        VALUES ?title { ${values} }
        ?art schema:name ?title; schema:isPartOf <https://${lang}.wikipedia.org/>; schema:about ?item.
        OPTIONAL { ?item wdt:P18 ?img. }
        OPTIONAL { ?item rdfs:label ?otherLabel. FILTER(LANG(?otherLabel) = "${other}") }
      }`,
      `wiki-${lang}-meta-${i}`,
    );
    for (const r of rows)
      if (!meta.has(r.title.value)) meta.set(r.title.value, r);
  }
  return dedupe(
    top.map(([t, v]) => {
      const title = t.replace(/_/g, " ");
      const r = meta.get(title);
      const otherName = r?.otherLabel?.value ?? title;
      return {
        name: lang === "pt" ? title : otherName,
        nameEn: lang === "en" ? title : otherName,
        value: v.views,
        emoji: "🔎",
        image: r ? img(r) : null,
      };
    }),
  );
}

async function spotifyStreams() {
  const { songs } = JSON.parse(
    await fs.readFile(
      path.join(ROOT, "public/data/musicas/songs.json"),
      "utf8",
    ),
  );
  const withId = songs.filter((s) => s.appleId);
  const found = await appleLookup(
    withId.map((s) => s.appleId),
    "songs",
  );
  return withId.map((s) => {
    const r = found.get(String(s.appleId));
    const src = artwork(r?.artworkUrl100, "400x400");
    return {
      name: `${s.title} — ${s.artist}`,
      nameEn: `${s.title} — ${s.artist}`,
      value: s.streams,
      emoji: "🎧",
      image: src ? { src, page: r.trackViewUrl } : null,
    };
  });
}

async function movieScores() {
  // Filmes com ID do IMDb (P345) e ID de filme da Apple (P6398) no Wikidata.
  const rows = await sparql(
    `SELECT ?f ?imdb ?it WHERE { ?f wdt:P6398 ?it; wdt:P345 ?imdb; wdt:P31 wd:Q11424. }`,
    "films-imdb-itunes",
  );
  const films = new Map();
  for (const r of rows) {
    const f = films.get(r.f.value) ?? {
      qid: r.f.value.split("/").pop(),
      imdb: r.imdb.value,
      apple: [],
    };
    f.apple.push(r.it.value);
    films.set(r.f.value, f);
  }
  // Nota e número de votos: title.ratings.tsv.gz (https://datasets.imdbws.com/, uso pessoal e não comercial).
  const tsv = zlib
    .gunzipSync(
      await fs.readFile(
        path.join(ROOT, "scripts/.cache/imdb/title.ratings.tsv.gz"),
      ),
    )
    .toString();
  const ratings = new Map(
    tsv
      .split("\n")
      .slice(1)
      .map((l) => l.split("\t"))
      .map(([id, avg, votes]) => [
        id,
        { avg: Number(avg), votes: Number(votes) },
      ]),
  );
  const popular = [...films.values()]
    .map((f) => ({ ...f, rating: ratings.get(f.imdb) }))
    .filter((f) => f.rating && f.rating.votes >= 200000)
    .sort((a, b) => b.rating.votes - a.rating.votes);
  // Só entram filmes cujo pôster existe na loja da Apple.
  const found = await appleLookup(
    popular.flatMap((f) => f.apple),
    "films",
  );
  const withPoster = popular
    .map((f) => ({
      ...f,
      poster: f.apple.map((id) => found.get(id)).find((r) => r?.artworkUrl100),
    }))
    .filter((f) => f.poster)
    .slice(0, 400);
  // Títulos: artigo da Wikipédia em português (ou rótulo pt) e rótulo em inglês.
  const names = new Map();
  for (const [i, batch] of chunk(
    withPoster.map((f) => f.qid),
    150,
  ).entries()) {
    const res = await sparql(
      `SELECT ?f ?ptTitle ?pt ?en WHERE {
        VALUES ?f { ${batch.map((q) => `wd:${q}`).join(" ")} }
        OPTIONAL { ?ptw schema:about ?f; schema:isPartOf <https://pt.wikipedia.org/>; schema:name ?ptTitle. }
        OPTIONAL { ?f rdfs:label ?pt. FILTER(LANG(?pt) = "pt-br" || LANG(?pt) = "pt") }
        OPTIONAL { ?f rdfs:label ?en. FILTER(LANG(?en) = "en") }
      }`,
      `films-names-${i}-${batch.length}`,
    );
    for (const r of res) {
      const q = r.f.value.split("/").pop();
      if (names.has(q)) continue;
      const pt =
        r.ptTitle?.value.replace(/\s*\((filme|filme de \d{4}|\d{4})\)$/, "") ??
        r.pt?.value ??
        r.en?.value;
      names.set(q, { pt, en: r.en?.value ?? pt });
    }
  }
  return dedupe(
    withPoster
      .filter((f) => names.get(f.qid)?.pt)
      .map((f) => ({
        name: names.get(f.qid).pt,
        nameEn: names.get(f.qid).en,
        value: f.rating.avg,
        emoji: "🎬",
        image: {
          src: artwork(f.poster.artworkUrl100, "400x600"),
          page: `https://www.imdb.com/title/${f.imdb}/`,
        },
      })),
  );
}

/**
 * Imagem de cada fato: P18 do item do Wikidata ligado ao artigo da Wikipédia em inglês. Sem P18 (ou com
 * "Artigo|Outro"), usa a imagem livre principal (page_image_free) do outro artigo, como o museu de um roubo.
 */
async function factItems(facts, name) {
  const split = (spec) => spec.split("|");
  const titles = [...new Set(facts.map((f) => split(f[1])[0]))];
  const images = new Map();
  for (const [i, batch] of chunk(titles, 50).entries()) {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&sites=enwiki&props=claims|sitelinks&sitefilter=enwiki&titles=${encodeURIComponent(batch.join("|"))}`;
    const json = await cachedFetchJson(url, `${name}-${i}`);
    for (const e of Object.values(json.entities)) {
      const title = e.sitelinks?.enwiki?.title;
      const file = e.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (title && file) images.set(title, imageRef(file));
    }
  }
  const norm = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const pageImages = new Map();
  const others = [
    ...new Set(
      facts
        .map((f) => split(f[1]))
        .filter(([t, o]) => o || !images.has(norm(t)))
        .map(([t, o]) => o ?? t),
    ),
  ];
  for (const [i, batch] of chunk(others, 40).entries()) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=page_image_free&titles=${encodeURIComponent(batch.join("|"))}`;
    const json = await cachedFetchJson(url, `${name}-pageimage-${i}`);
    const back = new Map(
      (json.query.redirects ?? []).map((r) => [r.to, r.from]),
    );
    for (const p of Object.values(json.query.pages)) {
      const file = p.pageprops?.page_image_free;
      if (file)
        pageImages.set(
          back.get(p.title) ?? p.title,
          imageRef(file.replace(/_/g, " ")),
        );
    }
  }
  return facts.map(
    ([
      group,
      spec,
      pt,
      en,
      detail,
      detailEn,
      value,
      unit,
      unitEn,
      emoji,
      decimals,
    ]) => {
      const [title, other] = split(spec);
      return {
        name: pt,
        nameEn: en,
        detail,
        detailEn,
        value,
        ...(unit ? { unit, unitEn } : {}),
        decimals: decimals ?? 0,
        emoji,
        group,
        wiki: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
        image:
          (other
            ? pageImages.get(other)
            : (images.get(norm(title)) ?? pageImages.get(title))) ?? null,
      };
    },
  );
}

async function prices() {
  const { products } = JSON.parse(
    await fs.readFile(
      path.join(ROOT, "public/data/na-etiqueta/products.json"),
      "utf8",
    ),
  );
  const market = products
    .filter((p) => p.price >= 1 && p.image)
    .map((p) => {
      const name = p.size ? `${p.name} (${p.size})` : p.name;
      return {
        name,
        nameEn: name,
        detail: "preço no mercado (atacado dos EUA, 2022–2023)",
        detailEn: "grocery price (US warehouse store, 2022–2023)",
        value: p.price,
        decimals: 2,
        emoji: p.emoji,
        group: "mercado",
        image: { src: p.image.src, page: p.image.page },
      };
    });
  return [...market, ...(await factItems(PRICE_FACTS, "facts-prices"))];
}

/** O que cada grupo de dados abertos mede (aparece abaixo do nome, já que o dia mistura tipos). */
const TRIVIA_GROUPS = {
  "pop-paises": ["população", "population", "habitantes", "people"],
  "area-paises": ["área", "area", "km²", "km²"],
  "pop-cidades": ["população", "population", "habitantes", "people"],
  montanhas: ["altitude", "elevation", "metros", "meters"],
  rios: ["comprimento", "length", "km", "km"],
};

async function trivia() {
  const ne = JSON.parse(
    await fs.readFile(
      path.join(ROOT, "scripts/.cache/ne/ne_50m_admin_0_countries.geojson"),
      "utf8",
    ),
  );
  const names = JSON.parse(
    await fs.readFile(
      path.join(ROOT, "public/data/mundareu/countries.json"),
      "utf8",
    ),
  ).countries;
  const byId = new Map(names.map((c) => [c.id, c]));
  // Bandeiras pelo código ISO 3166-1 alfa-3 (P298) → P41.
  const flags = new Map();
  const isoList = [
    ...new Set(
      ne.features.map((f) =>
        f.properties.ISO_A3_EH !== "-99"
          ? f.properties.ISO_A3_EH
          : f.properties.ADM0_A3,
      ),
    ),
  ];
  for (const [i, batch] of chunk(isoList, 120).entries()) {
    const rows = await sparql(
      `SELECT ?iso ?flag WHERE { VALUES ?iso { ${batch.map((x) => `"${x}"`).join(" ")} } ?c wdt:P298 ?iso; wdt:P41 ?flag. }`,
      `flags-${i}`,
    );
    for (const r of rows)
      if (!flags.has(r.iso.value)) flags.set(r.iso.value, img(r, "flag"));
  }
  const items = [];
  for (const f of ne.features) {
    const p = f.properties;
    const id = p.ISO_A3_EH !== "-99" ? p.ISO_A3_EH : p.ADM0_A3;
    const c = byId.get(id) ?? byId.get(p.ADM0_A3);
    if (!c?.playable) continue;
    const base = {
      name: c.name,
      nameEn: c.nameEn,
      image: flags.get(id) ?? null,
    };
    if (p.POP_EST > 100000)
      items.push({
        ...base,
        value: Math.round(p.POP_EST),
        emoji: "👥",
        group: "pop-paises",
      });
    const km2 = Math.round(turf.area(f) / 1e6);
    if (km2 > 1000)
      items.push({ ...base, value: km2, emoji: "🗺️", group: "area-paises" });
  }
  const ibge = await cachedFetchJson(
    "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[all]",
    "ibge-populacao",
  );
  const series = ibge[0].resultados[0].series;
  const year = Object.keys(series[0].serie)[0];
  const cities = series
    .map((s) => ({
      code: s.localidade.id,
      name: s.localidade.nome.replace(/ - ([A-Z]{2})$/, " ($1)"),
      value: Number(s.serie[year]),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 150);
  const cityImg = new Map();
  for (const [i, batch] of chunk(cities, 125).entries()) {
    const rows = await sparql(
      `SELECT ?code ?img WHERE { VALUES ?code { ${batch.map((c) => `"${c.code}"`).join(" ")} } ?m wdt:P1585 ?code; wdt:P18 ?img. }`,
      `cities-img-${i}`,
    );
    for (const r of rows)
      if (!cityImg.has(r.code.value)) cityImg.set(r.code.value, img(r));
  }
  for (const c of cities)
    items.push({
      name: c.name,
      nameEn: c.name,
      value: c.value,
      emoji: "🏙️",
      group: "pop-cidades",
      image: cityImg.get(c.code) ?? null,
    });

  const geo = async (cls, prop, group, emoji, minLinks, name) => {
    const rows = await sparql(
      `SELECT ?x ?pt ?en ?v ?img ?links WHERE {
        ?x wdt:P31 wd:${cls}; wdt:${prop} ?v; wikibase:sitelinks ?links. FILTER(?links > ${minLinks})
        ?ptw schema:about ?x; schema:isPartOf <https://pt.wikipedia.org/>.
        OPTIONAL { ?x rdfs:label ?pt. FILTER(LANG(?pt) = "pt") }
        OPTIONAL { ?x rdfs:label ?en. FILTER(LANG(?en) = "en") }
        OPTIONAL { ?x wdt:P18 ?img. }
      } ORDER BY DESC(?links) LIMIT 400`,
      name,
    );
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      if (seen.has(r.x.value) || !r.pt) continue;
      seen.add(r.x.value);
      const value = Math.round(Number(r.v.value));
      if (group === "rios" && (value < 50 || value >= 8000)) continue;
      out.push({
        name: r.pt.value,
        nameEn: r.en?.value ?? r.pt.value,
        value,
        emoji,
        group,
        image: img(r),
      });
    }
    return dedupe(out).slice(0, 180);
  };
  items.push(
    ...(await geo("Q8502", "P2044", "montanhas", "⛰️", 25, "montanhas-v2")),
  );
  items.push(...(await geo("Q4022", "P2043", "rios", "🌊", 30, "rios-v2")));
  for (const i of items) {
    const [detail, detailEn, unit, unitEn] = TRIVIA_GROUPS[i.group];
    Object.assign(i, { detail, detailEn, unit, unitEn });
  }
  items.push(...(await factItems(TRIVIA_FACTS, "facts-trivia")));
  return { items, ibgeYear: year, popYear: ne.features[0].properties.POP_YEAR };
}

function build(lang, wiki, spotify, films, priceItems, t) {
  const L = (pt, en) => (lang === "en" ? en : pt);
  return [
    {
      id: "wikipedia",
      name: L("Popularidade na internet", "Internet popularity"),
      icon: "search",
      question: L(
        "Qual foi mais visto na Wikipédia nos últimos 12 meses?",
        "Which got more Wikipedia views in the last 12 months?",
      ),
      unit: L("visualizações", "views"),
      items: wiki,
      fonte: L(
        "Wikipédia em português: visualizações somadas dos últimos 12 meses",
        "English Wikipedia: total page views over the last 12 months",
      ),
      licenca: "CC0",
      url: "https://wikimedia.org/api/rest_v1/",
    },
    {
      id: "spotify",
      name: L("Streams no Spotify", "Spotify streams"),
      icon: "music",
      question: L(
        "Qual música tem mais streams no Spotify?",
        "Which song has more Spotify streams?",
      ),
      unit: "streams",
      items: spotify,
      fonte: L(
        "Kworb: músicas mais tocadas da história do Spotify",
        "Kworb: most-streamed songs in Spotify history",
      ),
      licenca: L("Dados públicos do Kworb", "Public Kworb data"),
      url: "https://kworb.net/spotify/songs.html",
    },
    {
      id: "filmes",
      name: L("Nota dos filmes", "Movie ratings"),
      icon: "film",
      question: L(
        "Qual filme tem a nota maior no IMDb?",
        "Which movie has the higher IMDb rating?",
      ),
      unit: "/ 10",
      decimals: 1,
      minDiff: 0.3,
      items: films,
      fonte: L(
        "Notas: IMDb (informação cedida pelo IMDb, https://www.imdb.com, uso não comercial). Pôsteres: Apple TV",
        "Ratings: IMDb (information courtesy of IMDb, https://www.imdb.com, non-commercial use). Posters: Apple TV",
      ),
      licenca: L(
        "Uso pessoal e não comercial (IMDb)",
        "Personal, non-commercial use (IMDb)",
      ),
      url: "https://developer.imdb.com/non-commercial-datasets/",
    },
    {
      id: "precos",
      name: L("Preços", "Prices"),
      icon: "tag",
      question: L("Qual custou mais?", "Which cost more?"),
      unit: "",
      prefix: "US$ ",
      decimals: 2,
      mix: true,
      items: priceItems,
      fonte: L(
        "Produtos de mercado: outro jogo (atacado dos EUA, 2022–2023), fotos do Open Food Facts (CC BY-SA). Custos históricos em dólares da época, conferidos na Wikipédia; imagens do Wikimedia Commons",
        "Grocery items: outro jogo (US warehouse store, 2022–2023), photos from Open Food Facts (CC BY-SA). Historical costs in dollars of the time, checked on Wikipedia; images from Wikimedia Commons",
      ),
      licenca: "MIT",
      url: "https://github.com/KermWasTaken",
    },
    {
      id: "curiosidades",
      name: L("Curiosidades", "Trivia"),
      icon: "lightbulb",
      question: L("Qual número é maior?", "Which number is bigger?"),
      unit: "",
      mix: true,
      items: t.items,
      fonte: L(
        `Natural Earth (população ${t.popYear} e área), IBGE (estimativa ${t.ibgeYear}), Wikidata (montanhas e rios) e fatos conferidos na Wikipédia; imagens do Wikimedia Commons`,
        `Natural Earth (${t.popYear} population and area), IBGE (${t.ibgeYear} estimate), Wikidata (mountains and rivers) and facts checked on Wikipedia; images from Wikimedia Commons`,
      ),
      licenca: L(
        "Domínio público / dados públicos / CC0",
        "Public domain / public data / CC0",
      ),
      url: "https://www.naturalearthdata.com/",
    },
  ].map((c) => ({
    ...c,
    // Toda opção mostra uma imagem: só entram itens com foto (ou capa da Apple, no caso das músicas).
    items: c.items
      .filter((i) => i.image)
      .map(({ nameEn, detailEn, unitEn, ...i }) =>
        lang === "en"
          ? {
              ...i,
              name: nameEn ?? i.name,
              ...(i.detail ? { detail: detailEn } : {}),
              ...(i.unit ? { unit: unitEn } : {}),
            }
          : i,
      ),
  }));
}

async function main() {
  const [wikiPt, wikiEn, spotify, films, priceItems, t] = [
    await topPages("pt"),
    await topPages("en"),
    await spotifyStreams(),
    await movieScores(),
    await prices(),
    await trivia(),
  ];
  const out = path.join(ROOT, "public/data/mais-ou-menos");
  await fs.mkdir(out, { recursive: true });
  for (const lang of ["pt", "en"]) {
    const categories = build(
      lang,
      lang === "pt" ? wikiPt : wikiEn,
      spotify,
      films,
      priceItems,
      t,
    );
    await fs.writeFile(
      path.join(out, lang === "pt" ? "categories.json" : "categories-en.json"),
      JSON.stringify({ obtido_em: today, categories }),
    );
    for (const c of categories) {
      const withImg = c.items.filter((i) => i.image).length;
      console.log(
        `[${lang}] ${c.name}: ${c.items.length} itens, ${withImg} com imagem · ex.: ${c.items
          .slice(0, 2)
          .map((i) => i.name)
          .join(" | ")}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
