import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchObrasParaEvento } from "../api/obras";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

async function fetchContextoEvento(place) {
  const queryBuscar = `
    SELECT DISTINCT ?evento ?eventoLabel ?descripcion ?fechaInicio ?fechaFin WHERE {
      ?evento wdt:P31/wdt:P279* wd:Q13418847 .
      ?evento rdfs:label ?lbl .
      FILTER(LANG(?lbl) = "es" || LANG(?lbl) = "en")
      FILTER(LCASE(?lbl) = LCASE("${place}"))
      OPTIONAL { ?evento schema:description ?descripcion . FILTER(LANG(?descripcion) = "es") }
      OPTIONAL { ?evento wdt:P580 ?fechaInicio . }
      OPTIONAL { ?evento wdt:P582 ?fechaFin . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 1
  `;
  try {
    const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(queryBuscar)}`;
    const res = await fetch(url, { headers: { Accept: "application/sparql-results+json" } });
    const data = await res.json();
    const item = data.results.bindings[0];
    if (!item) return null;
    return {
      qid: item.evento.value.split("/").pop(),
      descripcion: item.descripcion?.value || "",
      fechaInicio: item.fechaInicio?.value ? new Date(item.fechaInicio.value).getFullYear() : null,
      fechaFin: item.fechaFin?.value ? new Date(item.fechaFin.value).getFullYear() : null,
    };
  } catch {
    return null;
  }
}

const badgeColor = { wikidata: "#7b5ea7", met: "#c0392b", europeana: "#2980b9", chicago: "#27ae60" };
const badgeLabel = { wikidata: "Wikidata", met: "Met", europeana: "Europeana", chicago: "Chicago" };

export default function Results() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const place   = params.get("place") || "Evento histórico";
  const lat     = parseFloat(params.get("lat"));
  const lng     = parseFloat(params.get("lng"));
  const yearMin = params.get("yearMin");
  const yearMax = params.get("yearMax");

  const [obras, setObras]       = useState([]);
  const [contexto, setContexto] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [filtroFuente, setFiltroFuente]   = useState("todas");
  const [filtroArtista, setFiltroArtista] = useState("");
  const [ordenar, setOrdenar]             = useState("defecto");
  const [vista, setVista]                 = useState("grid");

  useEffect(() => {
    window.scrollTo(0, 0);
    setCargando(true);
    const eventoFake = {
      qid: null, name: place, lat, lng,
      yearInicio: yearMin ? parseInt(yearMin) : null,
      yearFin:    yearMax ? parseInt(yearMax) : null,
    };
    Promise.all([
      fetchContextoEvento(place).then(setContexto).catch(() => null),
      fetchObrasParaEvento(eventoFake).then(setObras).catch(() => []),
    ]).finally(() => setCargando(false));
  }, [place, lat, lng, yearMin, yearMax]);

  const fuentesDisponibles = ["todas", ...new Set(obras.map((o) => o.fuente).filter(Boolean))];

  const obrasFiltradas = useMemo(() => {
    let resultado = [...obras];
    if (filtroFuente !== "todas") resultado = resultado.filter((o) => o.fuente === filtroFuente);
    if (filtroArtista.trim()) {
      const term = filtroArtista.toLowerCase();
      resultado = resultado.filter((o) => (o.artist || o.artista || "").toLowerCase().includes(term));
    }
    if (ordenar === "fecha_asc")  resultado.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    else if (ordenar === "fecha_desc") resultado.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (ordenar === "artista") resultado.sort((a, b) => (a.artist || a.artista || "").localeCompare(b.artist || b.artista || ""));
    return resultado;
  }, [obras, filtroFuente, filtroArtista, ordenar]);

  return (
    <div className="results-wrapper">

      {/* Header */}
      <div className="results-header">
        <div className="results-header-nav">
          <button className="results-back-btn" onClick={() => navigate(-1)}>← Volver al mapa</button>
          <span className="results-header-brand">Past in Pixels</span>
        </div>

        <div className="results-header-body">
          <div className="results-header-meta">
            <span className="results-header-icon">⚡</span>
            <span className="results-header-badge">Evento histórico</span>
            {(yearMin || yearMax) && (
              <span className="results-header-years">
                {yearMin}{yearMax && yearMax !== yearMin ? ` – ${yearMax}` : ""}
              </span>
            )}
          </div>
          <h1 className="results-header-title">{place}</h1>
          {contexto?.descripcion && (
            <p className="results-header-desc">{contexto.descripcion}</p>
          )}
          {!contexto?.descripcion && !cargando && (
            <p className="results-header-desc-empty">
              Explora las obras de arte relacionadas con este evento histórico.
            </p>
          )}
        </div>
      </div>


      <div className="results-content">


        <div className="results-filtros">

          {!cargando && fuentesDisponibles.length > 1 && (
            <div className="results-filtros-fuentes">
              {fuentesDisponibles.map((f) => (
                <button
                  key={f}
                  className={`results-fuente-btn${filtroFuente === f ? " activo" : ""}`}
                  onClick={() => setFiltroFuente(f)}
                  style={{
                    background: filtroFuente === f
                      ? (f === "todas" ? "#f07e27" : badgeColor[f] || "#555")
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  {f === "todas" ? "Todas" : badgeLabel[f] || f}
                  <span style={{ marginLeft: 5, opacity: 0.7 }}>
                    {f === "todas" ? obras.length : obras.filter((o) => o.fuente === f).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="results-filtros-sep" />

          <input
            className="results-filtro-input"
            type="text"
            placeholder="🔍 Filtrar por artista..."
            value={filtroArtista}
            onChange={(e) => setFiltroArtista(e.target.value)}
          />

          <select
            className="results-filtro-select"
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value)}
          >
            <option value="defecto">Ordenar: relevancia</option>
            <option value="fecha_asc">Fecha: más antigua</option>
            <option value="fecha_desc">Fecha: más reciente</option>
            <option value="artista">Artista: A-Z</option>
          </select>

          <div className="results-vista-btns">
            <button
              className={`results-vista-btn${vista === "grid" ? " activo" : ""}`}
              onClick={() => setVista("grid")}
            >⊞</button>
            <button
              className={`results-vista-btn${vista === "lista" ? " activo" : ""}`}
              onClick={() => setVista("lista")}
            >☰</button>
          </div>

          <div className="results-stats">
            {cargando ? "⏳ Buscando..." : (
              <span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{obrasFiltradas.length}</span>
                {obras.length !== obrasFiltradas.length && <span> de {obras.length}</span>}
                {" "}obras
              </span>
            )}
          </div>
        </div>


        {!cargando && obrasFiltradas.length === 0 && (
          <div className="results-empty">
            <div className="results-empty-icon">🎨</div>
            <p>No se encontraron obras{filtroArtista ? ` de "${filtroArtista}"` : ""} para este evento.</p>
            {(filtroArtista || filtroFuente !== "todas") && (
              <button
                className="results-empty-clear"
                onClick={() => { setFiltroArtista(""); setFiltroFuente("todas"); }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}


        {cargando && (
          <div className="results-skeleton-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="results-skeleton-card" />
            ))}
          </div>
        )}


        {!cargando && vista === "grid" && (
          <div className="results-grid">
            {obrasFiltradas.map((obra, i) => (
              <div
                key={i}
                className="results-card"
                onClick={() => obra.url && window.open(obra.url, "_blank")}
              >
                <div className="results-card-img">
                  {obra.image ? (
                    <img src={obra.image} alt={obra.title}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="results-card-img-empty">🎨</div>
                  )}
                  {obra.fuente && (
                    <span
                      className="results-card-badge"
                      style={{ background: badgeColor[obra.fuente] || "#555" }}
                    >
                      {badgeLabel[obra.fuente] || obra.fuente}
                    </span>
                  )}
                </div>
                <div className="results-card-info">
                  <div className="results-card-title">{obra.title || "Sin título"}</div>
                  <div className="results-card-artist">{obra.artist || obra.artista || "Artista desconocido"}</div>
                  {(obra.date || obra.year) && (
                    <div className="results-card-date">{obra.date || obra.year}</div>
                  )}
                  {obra.museum && obra.museum !== "Wikidata" && (
                    <div className="results-card-museum">📍 {obra.museum}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}


        {!cargando && vista === "lista" && (
          <div className="results-list">
            {obrasFiltradas.map((obra, i) => (
              <div
                key={i}
                className="results-list-item"
                onClick={() => obra.url && window.open(obra.url, "_blank")}
              >
                <div className="results-list-thumb">
                  {obra.image ? (
                    <img src={obra.image} alt={obra.title}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="results-list-thumb-empty">🎨</div>
                  )}
                </div>
                <div className="results-list-info">
                  <div className="results-list-text">
                    <div className="results-list-title">{obra.title || "Sin título"}</div>
                    <div className="results-list-meta">
                      {obra.artist || obra.artista || "Artista desconocido"}
                      {(obra.date || obra.year) ? ` · ${obra.date || obra.year}` : ""}
                    </div>
                    {obra.museum && obra.museum !== "Wikidata" && (
                      <div className="results-list-museum">📍 {obra.museum}</div>
                    )}
                  </div>
                  {obra.fuente && (
                    <span
                      className="results-list-badge"
                      style={{ background: badgeColor[obra.fuente] || "#555" }}
                    >
                      {badgeLabel[obra.fuente] || obra.fuente}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}


        {!cargando && obrasFiltradas.length > 0 && (
          <div className="results-cta">
            <p>¿Te interesa este evento? Crea un recorrido con las obras que más te gusten.</p>
            <button className="results-cta-btn" onClick={() => navigate("/login")}>
              ✨ Crear recorrido con estas obras
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
