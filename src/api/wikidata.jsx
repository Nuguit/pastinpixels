const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const HEADERS = {
  Accept: "application/sparql-results+json",
  "User-Agent": "PastinPixels/1.0 (contacto@ejemplo.com)",
};

// ─── CACHÉ ───────────────────────────────────────────────────────────────────
const CACHE_TTL = 1000 * 60 * 30; // media hora

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("pip_")) localStorage.removeItem(k);
    }
  }
}

async function sparql(query) {
  const key = "pip_" + hashStr(query);
  const cached = cacheGet(key);
  if (cached) return cached;
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cacheSet(key, data);
  return data;
}

// ─── BÚSQUEDA GLOBAL ─────────────────────────────────────────────────────────
export async function fetchBusquedaGlobal(texto) {
  if (!texto || texto.trim().length < 2) return { obras: [], eventos: [] };
  const termino = texto.trim();

  const PALABRAS_ARTISTA = [
    "pintor", "painter", "artist", "artista", "sculptor", "escultor",
    "grabador", "dibujante", "draughtsman", "miniaturist", "miniaturista",
    "pintora", "sculpt", "engraver",
  ];

  const esArtista = (e) => {
    const desc = (e.description || "").toLowerCase();
    return PALABRAS_ARTISTA.some((p) => desc.includes(p));
  };

  const fetchSearch = async (q) => {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=es&limit=10&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    return data.search || [];
  };

  const buscarArtista = async (search) => {
    // Búsqueda principal
    let resultados = await fetchSearch(search);
    let artistas = resultados.filter(esArtista);

    // Si no encontramos artistas, probamos con prefijos de nombre de pila
    if (artistas.length === 0) {
      const prefijos = [
        "Diego", "Francisco", "Pablo", "Juan", "Pedro", "José",
        "El", "Leonardo", "Miguel", "Rafael", "Rembrandt", "Claude",
        "Pierre", "Johannes", "Jan", "Frida", "Salvador", "Henri",
        "Edgar", "Paul", "Vincent", "Georges", "Édouard",
      ];
      const busquedasExtra = await Promise.all(
        prefijos.map((p) => fetchSearch(`${p} ${search}`))
      );
      const vistos = new Set(resultados.map((r) => r.id));
      for (const extra of busquedasExtra) {
        for (const e of extra) {
          if (!vistos.has(e.id)) {
            vistos.add(e.id);
            resultados.push(e);
          }
        }
      }
      artistas = resultados.filter(esArtista);
    }

    return artistas;
  };

  // Query de obras por QID de artista
  const queryObrasPorArtista = (artistaQIDs) => `
    SELECT DISTINCT ?obra ?obraLabel ?artistaLabel ?imagen ?coord ?fecha ?modoGeo WHERE {
      VALUES ?artista { ${artistaQIDs} }
      ?obra wdt:P170 ?artista .
      ?obra wdt:P31/wdt:P279* wd:Q3305213 .
      ?obra wdt:P18 ?imagen .
      {
        ?obra wdt:P276 ?lugar . ?lugar wdt:P625 ?coord .
        BIND("museo" AS ?modoGeo)
      } UNION {
        ?obra wdt:P921 ?lugar . ?lugar wdt:P625 ?coord .
        BIND("tema" AS ?modoGeo)
        FILTER NOT EXISTS { ?obra wdt:P276 ?lm . ?lm wdt:P625 [] . }
      } UNION {
        ?obra wdt:P1071 ?lugar . ?lugar wdt:P625 ?coord .
        BIND("creacion" AS ?modoGeo)
        FILTER NOT EXISTS { ?obra wdt:P276 ?lm . ?lm wdt:P625 [] . }
        FILTER NOT EXISTS { ?obra wdt:P921 ?tc . ?tc wdt:P625 [] . }
      }
      OPTIONAL { ?obra wdt:P571|wdt:P585 ?fecha . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    ORDER BY DESC(?fecha)
    LIMIT 12
  `;

  const queryObrasTitulo = `
    SELECT DISTINCT ?obra ?obraLabel ?artistaLabel ?imagen ?coord ?fecha WHERE {
      ?obra wdt:P31/wdt:P279* wd:Q3305213 .
      ?obra wdt:P18 ?imagen .
      ?obra rdfs:label ?lbl .
      FILTER(LANG(?lbl) = "es" || LANG(?lbl) = "en")
      FILTER(CONTAINS(LCASE(?lbl), LCASE("${termino}")))
      {
        ?obra wdt:P276 ?lugar . ?lugar wdt:P625 ?coord .
      } UNION {
        ?obra wdt:P921 ?lugar . ?lugar wdt:P625 ?coord .
        FILTER NOT EXISTS { ?obra wdt:P276 ?lm . ?lm wdt:P625 [] . }
      } UNION {
        ?obra wdt:P1071 ?lugar . ?lugar wdt:P625 ?coord .
        FILTER NOT EXISTS { ?obra wdt:P276 ?lm . ?lm wdt:P625 [] . }
        FILTER NOT EXISTS { ?obra wdt:P921 ?tc . ?tc wdt:P625 [] . }
      }
      OPTIONAL { ?obra wdt:P170 ?artista . }
      OPTIONAL { ?obra wdt:P571|wdt:P585 ?fecha . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 8
  `;

  const queryEventos = `
    SELECT DISTINCT ?evento ?eventoLabel ?coord ?fechaInicio ?descripcion WHERE {
      ?evento wdt:P31/wdt:P279* wd:Q13418847 .
      ?evento wdt:P625 ?coord .
      ?evento rdfs:label ?lbl .
      FILTER(LANG(?lbl) = "es" || LANG(?lbl) = "en")
      FILTER(CONTAINS(LCASE(?lbl), LCASE("${termino}")))
      OPTIONAL { ?evento wdt:P585|wdt:P580 ?fechaInicio . }
      OPTIONAL { ?evento schema:description ?descripcion . FILTER(LANG(?descripcion) = "es") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 8
  `;

  const queryConflictos = `
    SELECT DISTINCT ?conflicto ?conflictoLabel ?fechaInicio WHERE {
      VALUES ?tipo { wd:Q198 wd:Q178561 wd:Q188686 wd:Q7463 wd:Q1261499 wd:Q831663 }
      ?conflicto wdt:P31 ?tipo .
      ?conflicto rdfs:label ?lbl .
      FILTER(LANG(?lbl) = "es" || LANG(?lbl) = "en")
      FILTER(CONTAINS(LCASE(?lbl), LCASE("${termino}")))
      OPTIONAL { ?conflicto wdt:P580|wdt:P585 ?fechaInicio . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 5
  `;

  try {
    const [artistasEncontrados, dataObrasTitulo, dataEventos, dataConflictos] = await Promise.all([
      buscarArtista(termino).catch(() => []),
      sparql(queryObrasTitulo).catch(() => ({ results: { bindings: [] } })),
      sparql(queryEventos).catch(() => ({ results: { bindings: [] } })),
      sparql(queryConflictos).catch(() => ({ results: { bindings: [] } })),
    ]);

    // Obras por artista
    let obrasArtista = [];
    if (artistasEncontrados.length > 0) {
      const artistaQIDs = artistasEncontrados
        .slice(0, 3)
        .map((a) => `wd:${a.id}`)
        .join(" ");

      const dataObrasArtista = await sparql(queryObrasPorArtista(artistaQIDs))
        .catch(() => ({ results: { bindings: [] } }));

      const vistosPorArtista = new Set();
      obrasArtista = dataObrasArtista.results.bindings
        .map((item) => {
          const qid = item.obra.value.split("/").pop();
          if (vistosPorArtista.has(qid)) return null;
          vistosPorArtista.add(qid);
          const match = item.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
          if (!match) return null;
          const lng = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          if (isNaN(lat) || isNaN(lng)) return null;
          return {
            qid,
            name: item.obraLabel?.value || "Sin título",
            artista: item.artistaLabel?.value || "Desconocido",
            lat, lng, tipo: "obra",
            year: item.fecha?.value ? new Date(item.fecha.value).getFullYear() : null,
            image: item.imagen?.value || null,
            url: item.obra.value,
            modoGeo: item.modoGeo?.value || "museo",
            tieneCoord: true,
          };
        })
        .filter(Boolean);
    }

    // Obras por título
    const obrasTitulo = dataObrasTitulo.results.bindings
      .map((item) => {
        const match = item.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
        if (!match) return null;
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (isNaN(lat) || isNaN(lng)) return null;
        return {
          qid: item.obra.value.split("/").pop(),
          name: item.obraLabel?.value || "Sin título",
          artista: item.artistaLabel?.value || "Desconocido",
          lat, lng, tipo: "obra",
          year: item.fecha?.value ? new Date(item.fecha.value).getFullYear() : null,
          image: item.imagen?.value || null,
          url: item.obra.value,
          modoGeo: "museo",
          tieneCoord: true,
        };
      })
      .filter(Boolean);

    // Merge sin duplicados
    const vistos = new Set();
    const obras = [...obrasArtista, ...obrasTitulo].filter((o) => {
      if (vistos.has(o.qid)) return false;
      vistos.add(o.qid);
      return true;
    });

    const eventos = [
      ...dataEventos.results.bindings.map((item) => {
        const match = item.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
        if (!match) return null;
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (isNaN(lat) || isNaN(lng)) return null;
        return {
          qid: item.evento.value.split("/").pop(),
          name: item.eventoLabel?.value || "Evento desconocido",
          lat, lng, tipo: "evento",
          yearInicio: item.fechaInicio?.value ? new Date(item.fechaInicio.value).getFullYear() : null,
          yearFin: null,
          descripcion: item.descripcion?.value || "",
        };
      }).filter(Boolean),
      ...dataConflictos.results.bindings
        .map((item) => ({
          qid: item.conflicto.value.split("/").pop(),
          name: item.conflictoLabel?.value || "Conflicto desconocido",
          lat: null, lng: null, tipo: "conflicto",
          yearInicio: item.fechaInicio?.value ? new Date(item.fechaInicio.value).getFullYear() : null,
        }))
        .filter((c) => !c.name.startsWith("Q")),
    ];

    return { obras, eventos };
  } catch (err) {
    console.error("Error fetchBusquedaGlobal:", err);
    return { obras: [], eventos: [] };
  }
}

// ─── RESTO DE FUNCIONES ───────────────────────────────────────────────────────
export async function fetchEventos(epocaMin, epocaMax, paisQID) {
  const query = `
    SELECT DISTINCT ?evento ?eventoLabel ?coord ?fechaInicio ?fechaFin ?descripcion WHERE {
      ?evento wdt:P31/wdt:P279* wd:Q13418847 .
      ?evento wdt:P625 ?coord .
      ?evento wdt:P585|wdt:P580 ?fechaInicio .
      OPTIONAL { ?evento wdt:P582 ?fechaFin . }
      OPTIONAL { ?evento schema:description ?descripcion . FILTER(LANG(?descripcion) = "es") }
      ${paisQID ? `?evento wdt:P17 wd:${paisQID} .` : ""}
      FILTER(YEAR(?fechaInicio) >= ${epocaMin} && YEAR(?fechaInicio) <= ${epocaMax})
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 200
  `;
  const data = await sparql(query);
  return data.results.bindings
    .map((item) => {
      const match = item.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
      if (!match) return null;
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (isNaN(lat) || isNaN(lng)) return null;
      if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return null;
      const qid = item.evento.value.split("/").pop();
      const yearInicio = item.fechaInicio?.value ? new Date(item.fechaInicio.value).getFullYear() : null;
      const yearFin = item.fechaFin?.value ? new Date(item.fechaFin.value).getFullYear() : yearInicio;
      return {
        qid, name: item.eventoLabel?.value || "Evento desconocido",
        lat, lng, tipo: "evento", yearInicio, yearFin,
        descripcion: item.descripcion?.value || "",
        keywords: item.eventoLabel?.value ? item.eventoLabel.value.split(" ") : [],
      };
    })
    .filter(Boolean);
}

export async function fetchObrasWikidata(eventoQID) {
  const query = `
    SELECT DISTINCT ?obra ?obraLabel ?imagen ?artista ?artistaLabel ?fecha WHERE {
      {
        ?obra wdt:P921 wd:${eventoQID} .
      } UNION {
        ?obra wdt:P180 wd:${eventoQID} .
      } UNION {
        ?obra wdt:P921 ?temaRelacionado .
        ?temaRelacionado wdt:P361 wd:${eventoQID} .
      }
      OPTIONAL { ?obra wdt:P18 ?imagen . }
      OPTIONAL { ?obra wdt:P170 ?artista . }
      OPTIONAL { ?obra wdt:P571|wdt:P585 ?fecha . }
      FILTER NOT EXISTS { ?obra wdt:P31 wd:Q5 }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 20
  `;
  try {
    const data = await sparql(query);
    return data.results.bindings
      .filter((item) => item.imagen?.value)
      .map((item) => ({
        title: item.obraLabel?.value || "Sin título",
        artist: item.artistaLabel?.value || "Desconocido",
        date: item.fecha?.value ? new Date(item.fecha.value).getFullYear().toString() : "",
        year: item.fecha?.value ? new Date(item.fecha.value).getFullYear() : null,
        museum: "Wikidata",
        image: item.imagen.value,
        url: item.obra.value,
        fuente: "wikidata",
        terminoBusqueda: null,
        razon: "Relación directa en Wikidata",
      }));
  } catch (err) {
    console.error("Error fetchObrasWikidata:", err);
    return [];
  }
}

export async function fetchTerminosRelacionados(eventoQID) {
  const query = `
    SELECT DISTINCT ?termino ?terminoLabel WHERE {
      {
        wd:${eventoQID} wdt:P361 ?termino .
      } UNION {
        wd:${eventoQID} wdt:P31 ?termino .
      } UNION {
        wd:${eventoQID} wdt:P276 ?termino .
      } UNION {
        wd:${eventoQID} wdt:P710 ?termino .
        ?termino wdt:P31 wd:Q6256 .
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 10
  `;
  try {
    const data = await sparql(query);
    return data.results.bindings
      .map((item) => item.terminoLabel?.value)
      .filter((v) => v && !v.startsWith("Q"));
  } catch {
    return [];
  }
}

export async function fetchConflictos(epocaMin, epocaMax, paisQID) {
  const ENTIDADES_HISTORICAS = {
    Q29:  ["Q29", "Q3399982", "Q189150", "Q174193", "Q8698", "Q756617", "Q170603", "Q160743", "Q458356"],
    Q142: ["Q142", "Q70972", "Q189445"],
    Q183: ["Q183", "Q43287", "Q152778"],
    Q145: ["Q145", "Q161885"],
    Q159: ["Q159", "Q34266", "Q15180"],
    Q30:  ["Q30", "Q170065"],
    Q38:  ["Q38", "Q172579"],
    Q17:  ["Q17", "Q128645"],
    Q148: ["Q148", "Q29520"],
  };

  const entidades = paisQID && ENTIDADES_HISTORICAS[paisQID]
    ? ENTIDADES_HISTORICAS[paisQID]
    : paisQID ? [paisQID] : null;

  const filtroPais = entidades
    ? `?conflicto wdt:P710|wdt:P17 ?entidad .
       VALUES ?entidad { ${entidades.map((q) => `wd:${q}`).join(" ")} }`
    : "";

  const query = `
    SELECT DISTINCT ?conflicto ?conflictoLabel ?fechaInicio WHERE {
      VALUES ?tipo { wd:Q198 wd:Q178561 wd:Q188686 wd:Q7463 wd:Q1261499 wd:Q831663 }
      ?conflicto wdt:P31 ?tipo .
      ?conflicto wdt:P580|wdt:P585 ?fechaInicio .
      ${filtroPais}
      FILTER(YEAR(?fechaInicio) >= ${epocaMin} && YEAR(?fechaInicio) <= ${epocaMax})
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    ORDER BY ?fechaInicio
    LIMIT 200
  `;

  const CONFLICTOS_GLOBALES = [
    { qid: "Q361",   name: "Primera Guerra Mundial", year: 1914 },
    { qid: "Q362",   name: "Segunda Guerra Mundial", year: 1939 },
    { qid: "Q8683",  name: "Guerra Fría",             year: 1947 },
    { qid: "Q8663",  name: "Guerra de Corea",         year: 1950 },
    { qid: "Q8740",  name: "Guerra de Vietnam",       year: 1955 },
    { qid: "Q46083", name: "Guerra Franco-Prusiana",  year: 1870 },
    { qid: "Q8729", name: "Revolución Rusa",         year: 1917 },
    { qid: "Q10859",name: "Guerra Civil Española",   year: 1936 },
    { qid: "Q6534",  name: "Revolución Francesa",     year: 1789 },
    { qid: "Q78994",   name: "Guerras Napoleónicas",    year: 1803 },
    { qid: "Q182192", name: "Guerra de las Malvinas",    year: 1982 },
  { qid: "Q41397",  name: "Guerra del Golfo",          year: 1990 },
  { qid: "Q181533",  name: "Guerra de Bosnia",          year: 1992 },
  { qid: "Q182865", name: "Guerra de Afganistán",      year: 2001 },
  { qid: "Q545449", name: "Invasión de Irak",          year: 2003 },
  { qid: "Q33761", name: "Primavera Árabe",           year: 2010 },
  { qid: "Q178810", name: "Guerra Civil Siria",        year: 2011 },
  ];

  try {
    const data = await sparql(query);
    console.log("conflictos SPARQL:", data.results.bindings.length, "min:", epocaMin, "max:", epocaMax);
    const vistos = new Set();
    const conflictosPais = data.results.bindings
      .map((item) => ({
        qid: item.conflicto.value.split("/").pop(),
        name: item.conflictoLabel?.value || "Conflicto desconocido",
        year: item.fechaInicio?.value ? new Date(item.fechaInicio.value).getFullYear() : null,
      }))
      .filter((c) => {
        if (c.name.startsWith("Q")) return false;
        if (vistos.has(c.qid)) return false;
        vistos.add(c.qid);
        return true;
      });

    // Añadir conflictos globales del rango que no estén ya
    const globalesEnRango = CONFLICTOS_GLOBALES.filter(
      (c) => c.year >= epocaMin && c.year <= epocaMax && !vistos.has(c.qid)
    );

    // Globales primero, luego los específicos del país
    return [...globalesEnRango, ...conflictosPais].sort((a, b) => (a.year || 0) - (b.year || 0));

  } catch (err) {
    console.error("Error fetchConflictos:", err);
    return [];
  }};

export async function fetchEventosPorConflicto(conflictoQID) {
  const query = `
  SELECT DISTINCT ?evento ?eventoLabel ?coord ?fechaInicio ?fechaFin ?descripcion WHERE {
    {
      ?evento wdt:P361 wd:${conflictoQID} .
    } UNION {
      wd:${conflictoQID} wdt:P527 ?evento .
    }
    ?evento wdt:P625 ?coord .
    OPTIONAL { ?evento wdt:P580|wdt:P585 ?fechaInicio . }
    OPTIONAL { ?evento wdt:P582 ?fechaFin . }
    OPTIONAL { ?evento schema:description ?descripcion . FILTER(LANG(?descripcion) = "es") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  LIMIT 500
`;
  try {
    const data = await sparql(query);
    const eventos = data.results.bindings
      .map((item) => {
        const match = item.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
        if (!match) return null;
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (isNaN(lat) || isNaN(lng)) return null;
        if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return null;
        const qid = item.evento.value.split("/").pop();
        const yearInicio = item.fechaInicio?.value ? new Date(item.fechaInicio.value).getFullYear() : null;
        const yearFin = item.fechaFin?.value ? new Date(item.fechaFin.value).getFullYear() : yearInicio;
        return {
          qid, name: item.eventoLabel?.value || "Evento desconocido",
          lat, lng, tipo: "evento", yearInicio, yearFin,
          descripcion: item.descripcion?.value || "",
        };
      })
      .filter(Boolean);

    // Deduplicar por qid
    const vistos = new Set();
    return eventos.filter(e => {
      if (vistos.has(e.qid)) return false;
      vistos.add(e.qid);
      return true;
    });
  } catch (err) {
    console.error("Error fetchEventosPorConflicto:", err);
    return [];
  }
}

export async function fetchObrasGeolocalizadas(generoQID, epocaMin, epocaMax, paisQID) {
  const filtroGenero = generoQID ? `
    {
      ?obra wdt:P136/wdt:P279* wd:${generoQID} .
    } UNION {
      ?obra wdt:P180/wdt:P279* wd:${generoQID} .
    }` : "";

  const query = `
    SELECT DISTINCT ?obra ?obraLabel ?artista ?artistaLabel ?imagen ?coord ?fecha ?modoGeo ?lugar ?lugarLabel WHERE {
      ?obra wdt:P31/wdt:P279* wd:Q3305213 .
      ?obra wdt:P18 ?imagen .
      ${filtroGenero}
      {
        ?obra wdt:P276 ?lugar .
        ?lugar wdt:P625 ?coord .
        BIND("museo" AS ?modoGeo)
      } UNION {
        ?obra wdt:P921 ?lugar .
        ?lugar wdt:P625 ?coord .
        BIND("tema" AS ?modoGeo)
        FILTER NOT EXISTS { ?obra wdt:P276 ?lugarMuseo . ?lugarMuseo wdt:P625 [] . }
      } UNION {
        ?obra wdt:P1071 ?lugar .
        ?lugar wdt:P625 ?coord .
        BIND("creacion" AS ?modoGeo)
        FILTER NOT EXISTS { ?obra wdt:P276 ?lugarMuseo . ?lugarMuseo wdt:P625 [] . }
        FILTER NOT EXISTS { ?obra wdt:P921 ?temaCoord . ?temaCoord wdt:P625 [] . }
      }
      OPTIONAL { ?obra wdt:P170 ?artista . }
      OPTIONAL { ?obra wdt:P571|wdt:P585 ?fecha . }
      ${epocaMin ? `FILTER(!BOUND(?fecha) || (YEAR(?fecha) >= ${epocaMin} && YEAR(?fecha) <= ${epocaMax}))` : ""}
      ${paisQID ? `{
        ?obra wdt:P495 wd:${paisQID} .
      } UNION {
        ?obra wdt:P170 ?art2 .
        ?art2 wdt:P27 wd:${paisQID} .
      }` : ""}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 80
  `;

  try {
    const data = await sparql(query);
    const vistos = new Set();
    return data.results.bindings
      .map((item) => {
        const match = item.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
        if (!match) return null;
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (isNaN(lat) || isNaN(lng)) return null;
        if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return null;
        const qid = item.obra.value.split("/").pop();
        if (vistos.has(qid)) return null;
        vistos.add(qid);
        return {
          qid,
          name: item.obraLabel?.value || "Obra desconocida",
          artista: item.artistaLabel?.value || "Desconocido",
          lat, lng, tipo: "obra",
          year: item.fecha?.value ? new Date(item.fecha.value).getFullYear() : null,
          image: item.imagen?.value || null,
          url: item.obra.value,
          modoGeo: item.modoGeo?.value || "museo",
          lugarNombre: (item.lugarLabel?.value && !item.lugarLabel.value.startsWith("Q"))
            ? item.lugarLabel.value
            : null,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error("Error fetchObrasGeolocalizadas:", err);
    return [];
  }
}

export const CATEGORIAS_ARTE = [
  { label: "🎨 Todas las obras (sin filtro)", genero: null      },
  { label: "👑 Retratos",                     genero: "Q134307" },
  { label: "⚡ Cuadros mitológicos",           genero: "Q3374376"},
  { label: "✝️ Arte religioso",               genero: "Q2864737"},
  { label: "🌄 Paisajes",                      genero: "Q191163" },
  { label: "🏘️ Escenas costumbristas",         genero: "Q1047337"},
  { label: "🪞 Autorretratos",                 genero: "Q192110" },
  { label: "⚔️ Pintura histórica",             genero: "Q742333" },
  { label: "🌸 Naturaleza muerta",             genero: "Q170571" },
];

export const MODOS_GEO = [
  { label: "📍 Donde está actualmente", value: "museo",    emoji: "📍" },
  { label: "🎨 Donde fue creada",        value: "creacion", emoji: "🎨" },
  { label: "👤 Procedencia del artista", value: "artista",  emoji: "👤" },
];

export const CONTINENTES = [
  { label: "🌍 Todo el mundo", qid: null, paises: [] },
  {
    label: "🌍 Europa", qid: null,
    paises: [
      { label: "España",                qid: "Q29"    },
      { label: "Francia",               qid: "Q142"   },
      { label: "Italia",                qid: "Q38"    },
      { label: "Alemania",              qid: "Q183"   },
      { label: "Reino Unido",           qid: "Q145"   },
      { label: "Rusia",                 qid: "Q159"   },
      { label: "Portugal",              qid: "Q45"    },
      { label: "Países Bajos",          qid: "Q55"    },
      { label: "Bélgica",               qid: "Q31"    },
      { label: "Austria",               qid: "Q40"    },
      { label: "Polonia",               qid: "Q36"    },
      { label: "Suecia",                qid: "Q34"    },
      { label: "Grecia",                qid: "Q41"    },
      { label: "Imperio Otomano",       qid: "Q12560" },
      { label: "Imperio Austro-Húngaro",qid: "Q28513" },
    ]
  },
  {
    label: "🌎 América", qid: null,
    paises: [
      { label: "Estados Unidos", qid: "Q30"    },
      { label: "México",         qid: "Q96"    },
      { label: "Argentina",      qid: "Q414"   },
      { label: "Brasil",         qid: "Q155"   },
      { label: "Colombia",       qid: "Q739"   },
      { label: "Perú",           qid: "Q419"   },
      { label: "Chile",          qid: "Q298"   },
      { label: "Cuba",           qid: "Q241"   },
      { label: "Imperio Inca",   qid: "Q28573" },
      { label: "Imperio Azteca", qid: "Q12542" },
    ]
  },
  {
    label: "🌏 Asia", qid: null,
    paises: [
      { label: "China",          qid: "Q148"   },
      { label: "Japón",          qid: "Q17"    },
      { label: "India",          qid: "Q668"   },
      { label: "Persia / Irán",  qid: "Q794"   },
      { label: "Imperio Mongol", qid: "Q12557" },
      { label: "Imperio Otomano",qid: "Q12560" },
      { label: "Corea",          qid: "Q18097" },
      { label: "Vietnam",        qid: "Q881"   },
    ]
  },
  {
    label: "🌍 África", qid: null,
    paises: [
      { label: "Egipto",           qid: "Q79"     },
      { label: "Etiopía",          qid: "Q115"    },
      { label: "Marruecos",        qid: "Q1028"   },
      { label: "Imperio Mali",     qid: "Q40357"  },
      { label: "Imperio Songhai",  qid: "Q133765" },
    ]
  },
  {
    label: "🌏 Oriente Medio", qid: null,
    paises: [
      { label: "Mesopotamia / Iraq",  qid: "Q796" },
      { label: "Siria",               qid: "Q858" },
      { label: "Israel / Palestina",  qid: "Q801" },
      { label: "Arabia Saudí",        qid: "Q851" },
    ]
  },
  {
    label: "🌏 Oceanía", qid: null,
    paises: [
      { label: "Australia",     qid: "Q408" },
      { label: "Nueva Zelanda", qid: "Q664" },
    ]
  },
];

export const PAISES = CONTINENTES.flatMap((c) => c.paises);