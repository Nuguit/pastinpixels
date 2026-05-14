import { useEffect, useState } from "react";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const HEADERS = { Accept: "application/sparql-results+json" };

async function fetchDetalleEvento(qid) {
  const query = `
    SELECT DISTINCT ?descripcion ?fechaInicio ?fechaFin ?pais ?paisLabel ?tipo ?tipoLabel WHERE {
      OPTIONAL { wd:${qid} schema:description ?descripcion . FILTER(LANG(?descripcion) = "es") }
      OPTIONAL { wd:${qid} wdt:P580 ?fechaInicio . }
      OPTIONAL { wd:${qid} wdt:P582 ?fechaFin . }
      OPTIONAL { wd:${qid} wdt:P710|wdt:P17 ?pais . ?pais wdt:P31 wd:Q6256 . }
      OPTIONAL { wd:${qid} wdt:P31 ?tipo . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 20
  `;
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();
    const bindings = data.results.bindings;
    if (!bindings.length) return null;

    const descripcion = bindings[0]?.descripcion?.value || "";
    const fechaInicio = bindings[0]?.fechaInicio?.value
      ? new Date(bindings[0].fechaInicio.value).getFullYear() : null;
    const fechaFin = bindings[0]?.fechaFin?.value
      ? new Date(bindings[0].fechaFin.value).getFullYear() : null;

    const paises = [...new Set(
      bindings.map((b) => b.paisLabel?.value).filter((v) => v && !v.startsWith("Q"))
    )];
    const tipos = [...new Set(
      bindings.map((b) => b.tipoLabel?.value).filter((v) => v && !v.startsWith("Q"))
    )];

    return { descripcion, fechaInicio, fechaFin, paises, tipos };
  } catch {
    return null;
  }
}

async function fetchWikipediaResumen(nombre) {
  try {
    const res = await fetch(
      "https://es.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(nombre)
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.extract || null;
  } catch {
    return null;
  }
}

export default function PanelContexto({ evento, onCerrar }) {
  const [detalle, setDetalle] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!evento) return;
    setCargando(true);
    setDetalle(null);
    setResumen(null);

    Promise.all([
      fetchDetalleEvento(evento.qid),
      fetchWikipediaResumen(evento.name),
    ]).then(([det, res]) => {
      setDetalle(det);
      setResumen(res);
    }).finally(() => setCargando(false));
  }, [evento?.qid]);

  if (!evento) return null;

  const descripcionFinal = resumen || detalle?.descripcion || evento.descripcion || "";
  const wikiUrl = "https://es.wikipedia.org/wiki/" + encodeURIComponent(evento.name);
  const wikidataUrl = "https://www.wikidata.org/wiki/" + evento.qid;

  return (
    <div className="panel-contexto">

    
      <div className="panel-contexto-header">
        <div className="panel-contexto-header-row">
          <div className="panel-contexto-header-body">
            <div className="panel-contexto-header-meta">
              <span className="panel-contexto-header-icon">⚡</span>
              <span className="panel-contexto-header-badge">Evento histórico</span>
            </div>
            <div className="panel-contexto-title">{evento.name}</div>
            {(evento.yearInicio || detalle?.fechaInicio) && (
              <div className="panel-contexto-dates">
                {detalle?.fechaInicio || evento.yearInicio}
                {(detalle?.fechaFin || evento.yearFin) &&
                  (detalle?.fechaFin || evento.yearFin) !== (detalle?.fechaInicio || evento.yearInicio)
                  ? " – " + (detalle?.fechaFin || evento.yearFin) : ""}
              </div>
            )}
          </div>
          <button className="panel-contexto-close" onClick={onCerrar}>✕</button>
        </div>
      </div>


      <div className="panel-contexto-body">
        {cargando ? (
          <div className="panel-contexto-loading">⏳ Cargando contexto histórico...</div>
        ) : (
          <>
            {descripcionFinal && (
              <div className="panel-contexto-section">
                <div className="panel-contexto-section-label">📖 Contexto</div>
                <p className="panel-contexto-desc">
                  {descripcionFinal.length > 600
                    ? descripcionFinal.slice(0, 600) + "…"
                    : descripcionFinal}
                </p>
                {descripcionFinal.length > 600 && (
                  <a href={wikiUrl} target="_blank" rel="noreferrer" className="panel-contexto-wiki-link">
                    Leer más en Wikipedia →
                  </a>
                )}
              </div>
            )}

            {detalle?.tipos?.length > 0 && (
              <div className="panel-contexto-section">
                <div className="panel-contexto-section-label">🏷 Tipo</div>
                <div className="panel-contexto-tags">
                  {detalle.tipos.slice(0, 4).map((t, i) => (
                    <span key={i} className="panel-contexto-tag-tipo">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {detalle?.paises?.length > 0 && (
              <div className="panel-contexto-section">
                <div className="panel-contexto-section-label">🌍 Países implicados</div>
                <div className="panel-contexto-tags">
                  {detalle.paises.map((p, i) => (
                    <span key={i} className="panel-contexto-tag-pais">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="panel-contexto-section">
              <a href={wikidataUrl} target="_blank" rel="noreferrer" className="panel-contexto-wikidata-link">
                Ver en Wikidata →
              </a>
            </div>

            {!descripcionFinal && !detalle?.tipos?.length && !detalle?.paises?.length && (
              <div className="panel-contexto-empty">
                No se encontró información adicional sobre este evento.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
