import { GoogleMap, useLoadScript, OverlayView } from "@react-google-maps/api";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchConflictos, fetchEventosPorConflicto,
  fetchObrasGeolocalizadas, CONTINENTES, CATEGORIAS_ARTE, MODOS_GEO
} from "../api/wikidata";
import { fetchObrasParaEvento } from "../api/obras";
import BuscadorGlobal from "./BuscadorGlobal.jsx";
import PanelContexto from "./PanelContexto.jsx";
import { fetchBusquedaGlobal } from "../api/wikidata";
const favicon = "/favicon.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function apiAddObra(recorridoId, obra) {
  const token = localStorage.getItem("pip_token");
  const res = await fetch(`${API}/recorridos/${recorridoId}/obras`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id_obra_api:  obra.qid || obra.id || "",
      fuente_api:   obra.fuente || "wikidata",
      titulo:       obra.name || obra.title || "",
      artista:      obra.artista || obra.artist || "",
      anio:         obra.year || obra.date || "",
      imagen_url:   obra.image || "",
      url_externo:  obra.url || "",
      orden:        0,
      lat:          obra.lat || null,
      lng:          obra.lng || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al guardar");
  return data;
}

const center = { lat: 20, lng: 0 };
const zoom = 2;
const CLUSTER_RADIO = 0.015;
const ABANICO_RADIO = 0.04;

const EPOCAS = [
  { label: "Selecciona una época", min: null, max: null },
  { label: "Antigüedad (antes del 500)", min: -500, max: 500 },
  { label: "Edad Media (500–1400)",      min: 500,  max: 1400 },
  { label: "Renacimiento (1400–1600)",   min: 1400, max: 1600 },
  { label: "Barroco (1600–1750)",        min: 1600, max: 1750 },
  { label: "Neoclasicismo (1750–1850)",  min: 1750, max: 1850 },
  { label: "Modernismo (1850–1950)",     min: 1850, max: 1945 },
  { label: "Arte contemporáneo (1950 en adelante)", min: 1945, max: 2100 },
];

function getTipo(lugar) {
  if (lugar.tipo === "obra")   return { emoji: "🎨", label: "Obra de arte" };
  if (lugar.tipo === "evento") return { emoji: "⚡", label: "Evento histórico" };
  return { emoji: "📍", label: "Lugar" };
}

function agruparMarkers(markers, radio) {
  const grupos = [];
  const asignados = new Set();
  markers.forEach((marker, i) => {
    if (asignados.has(i)) return;
    const grupo = [marker];
    asignados.add(i);
    markers.forEach((otro, j) => {
      if (asignados.has(j)) return;
      const dLat = Math.abs(marker.lat - otro.lat);
      const dLng = Math.abs(marker.lng - otro.lng);
      if (dLat < radio && dLng < radio) { grupo.push(otro); asignados.add(j); }
    });
    grupos.push({ id: marker.qid || i, lat: marker.lat, lng: marker.lng, items: grupo });
  });
  return grupos;
}

function ClusterMarker({ grupo, desplegado, onClickCluster, onClickItem }) {
  const { items, lat, lng } = grupo;
  const single = items.length === 1;

  if (single) {
    const item = items[0];
    const { emoji } = getTipo(item);
    const esObra = item.tipo === "obra";

    return (
      <OverlayView position={{ lat, lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        <div
          className="marker-single"
          onClick={() => onClickItem(item)}
          title={item.name}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)")}
        >
          {esObra && item.image ? (
            <div className="marker-thumbnail">
              <img
                src={item.image}
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.innerHTML = "🎨";
                  e.currentTarget.parentElement.style.cssText += "display:flex;align-items:center;justify-content:center;font-size:22px";
                }}
              />
            </div>
          ) : (
            <div className="marker-emoji">{emoji}</div>
          )}
        </div>
      </OverlayView>
    );
  }

  return (
    <>
      <OverlayView position={{ lat, lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        <div
          className={`marker-cluster${desplegado ? " desplegado" : ""}`}
          onClick={() => onClickCluster(grupo.id)}
          title={`${items.length} elementos — clic para desplegar`}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)")}
        >
          {items.length}
        </div>
      </OverlayView>

      {desplegado && items.map((item, i) => {
        const total = items.length;
        const anguloInicio = -150;
        const anguloFin = -30;
        const angulo = (anguloInicio + (anguloFin - anguloInicio) * (i / (total - 1 || 1))) * (Math.PI / 180);
        const itemLat = lat + ABANICO_RADIO * Math.sin(angulo);
        const itemLng = lng + ABANICO_RADIO * Math.cos(angulo);
        const { emoji } = getTipo(item);

        return (
          <OverlayView
            key={item.qid || i}
            position={{ lat: itemLat, lng: itemLng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              className="marker-abanico"
              onClick={() => onClickItem(item)}
              title={item.name}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)")}
            >
              {item.tipo === "obra" && item.image ? (
                <div className="marker-abanico-thumbnail">
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement.innerHTML = "🎨";
                      e.currentTarget.parentElement.style.cssText += "display:flex;align-items:center;justify-content:center;font-size:20px";
                    }}
                  />
                </div>
              ) : (
                <div className="marker-abanico-emoji">{emoji}</div>
              )}
            </div>
          </OverlayView>
        );
      })}
    </>
  );
}

function InfoPopupObra({ obra, onCerrar, onVerArtista, recorridoId, onObraGuardada }) {
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada]   = useState(false);

  const modoInfo = MODOS_GEO.find((m) => m.value === obra.modoGeo);
  const modoTexto = {
    tema:     `Representa: ${obra.lugarNombre}`,
    museo:    `Ubicada en: ${obra.lugarNombre}`,
    creacion: `Creada en: ${obra.lugarNombre}`,
    artista:  `Artista originario de: ${obra.lugarNombre}`,
  }[obra.modoGeo];

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await apiAddObra(recorridoId, obra);
      setGuardada(true);
      onObraGuardada(obra.name);
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="popup-obra">
      <button className="popup-obra-close" onClick={onCerrar}>✕</button>

      {obra.image && (
        <div className="popup-obra-image">
          <img
            src={obra.image}
            alt={obra.name}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}

      <div className="popup-obra-title">{obra.name}</div>

      {obra.artista && obra.artista !== "Desconocido" && (
        <button
          className="popup-obra-artista-btn"
          onClick={() => { onCerrar(); onVerArtista(obra.artista); }}
        >
          🎨 {obra.artista}
        </button>
      )}

      {obra.year && <div className="popup-obra-year">{obra.year}</div>}

      {modoTexto && obra.lugarNombre && (
        <div className="popup-obra-location">
          <span>{modoInfo?.emoji || "📍"}</span>
          <span>{modoTexto}</span>
        </div>
      )}

      {recorridoId && (
        <button
          className={`popup-obra-btn-guardar${guardada ? " guardada" : ""}`}
          onClick={handleGuardar}
          disabled={guardando || guardada}
        >
          {guardada ? "✓ Guardada en el recorrido" : guardando ? "⏳ Guardando..." : "➕ Guardar en recorrido"}
        </button>
      )}

      <div className="popup-obra-actions">
        {obra.artista && obra.artista !== "Desconocido" && (
          <button
            className="popup-obra-btn-artista"
            onClick={() => { onVerArtista(obra.artista); onCerrar(); }}
          >
            🎨 Más obras de {obra.artista.split(" ").slice(-1)[0]}
          </button>
        )}
        <a
          href={obra.url}
          target="_blank"
          rel="noreferrer"
          className="popup-obra-btn-wikidata"
        >
          Ver en Wikidata →
        </a>
      </div>
    </div>
  );
}

function InfoPopupEvento({ evento, obras, cargando, onCerrar, onVerMas }) {
  const { emoji, label } = getTipo(evento);
  const badgeColor = { wikidata: "#7b5ea7", met: "#c0392b", europeana: "#2980b9", chicago: "#27ae60" };
  const badgeLabel = { wikidata: "Wikidata", met: "Met", europeana: "Europeana", chicago: "Chicago" };

  return (
    <div className="popup-evento">
      <button className="popup-evento-close" onClick={onCerrar}>✕</button>

      <div className="popup-evento-header">
        <span className="popup-evento-icon">{emoji}</span>
        <div>
          <div className="popup-evento-title">{evento.name}</div>
          <div className="popup-evento-meta">
            {label} · {evento.yearInicio}
            {evento.yearFin && evento.yearFin !== evento.yearInicio ? `–${evento.yearFin}` : ""}
          </div>
          {evento.descripcion && (
            <div className="popup-evento-desc">
              {evento.descripcion.slice(0, 120)}{evento.descripcion.length > 120 ? "…" : ""}
            </div>
          )}
        </div>
      </div>

      <hr className="popup-evento-divider" />

      {cargando && <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Buscando obras relacionadas...</p>}
      {!cargando && obras.length === 0 && (
        <p style={{ color: "#888", fontSize: 13, margin: 0 }}>No se encontraron obras asociadas.</p>
      )}
      {!cargando && obras.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
            {obras.length} obra{obras.length !== 1 ? "s" : ""} relacionada{obras.length !== 1 ? "s" : ""}
          </div>
          <div className="popup-evento-obras-grid">
            {obras.slice(0, 6).map((obra, i) => (
              <div key={i} className="popup-evento-obra-thumb">
                <a href={obra.url} target="_blank" rel="noreferrer">
                  <img
                    src={obra.image}
                    alt={obra.title}
                    title={`${obra.title} — ${obra.artist} (${obra.date})`}
                  />
                </a>
                <span
                  className="popup-evento-obra-badge"
                  style={{ background: badgeColor[obra.fuente] || "#555" }}
                >
                  {badgeLabel[obra.fuente] || obra.fuente}
                </span>
                {obra.terminoBusqueda && (
                  <div style={{ fontSize: 9, color: "#888", marginTop: 2, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🔍 {obra.terminoBusqueda}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="popup-evento-ver-mas" onClick={(e) => { e.stopPropagation(); onVerMas(evento); }}>
            Ver todas las obras →
          </button>
        </div>
      )}
    </div>
  );
}

export default function Map() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recorridoId = searchParams.get("recorrido"); 

  const ultimoClickMarker = useRef(0);
  const mapRef = useRef(null);

  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [eventoPanel, setEventoPanel] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [obrasGeo, setObrasGeo] = useState([]);
  const [conflictos, setConflictos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [obras, setObras] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoEventos, setCargandoEventos] = useState(false);
  const [cargandoConflictos, setCargandoConflictos] = useState(false);
  const [cargandoObrasGeo, setCargandoObrasGeo] = useState(false);
  const [gruposDesplegados, setGruposDesplegados] = useState(new Set());
  const [marcadoresBuscador, setMarcadoresBuscador] = useState([]);
  const [busquedaActiva, setBusquedaActiva] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [epocaIdx, setEpocaIdx] = useState(0);
  const [continenteIdx, setContinenteIdx] = useState(0);
  const [paisQID, setPaisQID] = useState(null);
  const [conflictoQID, setConflictoQID] = useState("");
  const [categoriaIdx, setCategoriaIdx] = useState(0);

  // Toast temporal
  const mostrarToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  }, []);

  useEffect(() => {
    const epoca = EPOCAS[epocaIdx];
    if (!epoca.min) { setConflictos([]); setEventos([]); setObrasGeo([]); return; }
    setCargandoConflictos(true);
    setConflictoQID("");
    setEventos([]);
    setSeleccionado(null);
    fetchConflictos(epoca.min, epoca.max, paisQID)
      .then(setConflictos)
      .catch(console.error)
      .finally(() => setCargandoConflictos(false));
  }, [epocaIdx, paisQID]);

  useEffect(() => {
    if (!conflictoQID) { setEventos([]); return; }
    setCargandoEventos(true);
    setSeleccionado(null);
    fetchEventosPorConflicto(conflictoQID)
      .then(setEventos)
      .catch(console.error)
      .finally(() => setCargandoEventos(false));
  }, [conflictoQID]);

  useEffect(() => {
    const categoria = CATEGORIAS_ARTE[categoriaIdx];
    if (!categoria.genero) { setObrasGeo([]); return; }
    const epoca = EPOCAS[epocaIdx];
    if (!epoca.min) return;
    setCargandoObrasGeo(true);
    fetchObrasGeolocalizadas(categoria.genero, epoca.min, epoca.max, paisQID)
      .then(setObrasGeo)
      .catch(console.error)
      .finally(() => setCargandoObrasGeo(false));
  }, [categoriaIdx, epocaIdx, paisQID]);

  const todosLosMarkers = useMemo(() => {
    return [...eventos, ...obrasGeo, ...marcadoresBuscador];
  }, [eventos, obrasGeo, marcadoresBuscador]);

  const grupos = useMemo(() => agruparMarkers(todosLosMarkers, CLUSTER_RADIO), [todosLosMarkers]);

  const limpiarBusqueda = useCallback(() => {
    setMarcadoresBuscador([]);
    setBusquedaActiva(null);
    setSeleccionado(null);
  }, []);

  const handleClickCluster = useCallback((grupoId) => {
    ultimoClickMarker.current = Date.now();
    setGruposDesplegados((prev) => {
      const next = new Set(prev);
      if (next.has(grupoId)) { next.delete(grupoId); } else { next.add(grupoId); }
      return next;
    });
  }, []);

  const handleMarkerClick = useCallback(async (item) => {
    ultimoClickMarker.current = Date.now();
    setSeleccionado(item);
    if (item.tipo === "obra") return;
    setEventoPanel(item);
    setObras([]);
    setCargando(true);
    try {
      const resultados = await fetchObrasParaEvento(item);
      setObras(resultados);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  const handleVerMas = useCallback((evento) => {
    navigate(`/results?lat=${evento.lat}&lng=${evento.lng}&place=${encodeURIComponent(evento.name)}&yearMin=${evento.yearInicio}&yearMax=${evento.yearFin}`);
  }, [navigate]);

  const handleVerArtista = useCallback(async (nombreArtista) => {
    try {
      setMarcadoresBuscador([]);
      setBusquedaActiva({ texto: nombreArtista, tipo: "artista", cantidad: null });
      await new Promise((r) => setTimeout(r, 300));
      const { obras: obrasBuscadas } = await fetchBusquedaGlobal(nombreArtista);
      const conCoord = obrasBuscadas.filter((o) => o.tieneCoord);
      setMarcadoresBuscador(conCoord);
      setBusquedaActiva({ texto: nombreArtista, tipo: "artista", cantidad: conCoord.length });
      if (conCoord.length > 0 && mapRef.current) {
        mapRef.current.panTo({ lat: conCoord[0].lat, lng: conCoord[0].lng });
        mapRef.current.setZoom(5);
      }
    } catch (err) {
      console.error("error en handleVerArtista:", err);
      setTimeout(() => handleVerArtista(nombreArtista), 1000);
    }
  }, []);

  const handleSeleccionBuscador = useCallback(async (item) => {
    setMarcadoresBuscador([]);
    setBusquedaActiva(null);

    if (item.tipo === "obra") {
      if (item.tieneCoord && mapRef.current) {
        mapRef.current.panTo({ lat: item.lat, lng: item.lng });
        mapRef.current.setZoom(12);
        setMarcadoresBuscador([item]);
        setBusquedaActiva({ texto: item.name, tipo: "obra", cantidad: 1 });
      }
      setSeleccionado(item);
    } else if (item.tipo === "conflicto") {
      setCargandoEventos(true);
      setConflictoQID(item.qid);
      setSeleccionado(null);
      setBusquedaActiva({ texto: item.name, tipo: "conflicto", cantidad: null });
      try {
        const evts = await fetchEventosPorConflicto(item.qid);
        setEventos(evts);
        setBusquedaActiva({ texto: item.name, tipo: "conflicto", cantidad: evts.length });
        if (evts.length > 0 && mapRef.current) {
          mapRef.current.panTo({ lat: evts[0].lat, lng: evts[0].lng });
          mapRef.current.setZoom(6);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCargandoEventos(false);
      }
    } else if (item.tipo === "evento" && item.lat && item.lng) {
      if (mapRef.current) {
        mapRef.current.panTo({ lat: item.lat, lng: item.lng });
        mapRef.current.setZoom(10);
      }
      setMarcadoresBuscador([item]);
      setSeleccionado(item);
      setEventoPanel(item);
      setBusquedaActiva({ texto: item.name, tipo: "evento", cantidad: 1 });
      setObras([]);
      setCargando(true);
      try {
        const resultados = await fetchObrasParaEvento(item);
        setObras(resultados);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    if (marcadoresBuscador.length > 1) {
      const artista = marcadoresBuscador[0]?.artista;
      setBusquedaActiva({
        texto: artista || "búsqueda",
        tipo: "artista",
        cantidad: marcadoresBuscador.length,
      });
    }
  }, [marcadoresBuscador]);

  const conflictoActual = conflictos.find((c) => c.qid === conflictoQID);

  if (!isLoaded) return <div>Cargando mapa...</div>;

  const filtrosActivos = [epocaIdx > 0, !!conflictoQID, categoriaIdx > 0, !!paisQID].filter(Boolean).length;

  return (
    <div className="map-wrapper">


      <div className="map-navbar">
        <div className="map-navbar-top">
          <img src={favicon} alt="Past in Pixels" className="map-logo-img" />
          <span className="map-logo-text" onClick={() => navigate("/")}>Past in Pixels</span>

          <div className="map-search-wrapper">
            <BuscadorGlobal onSeleccionar={handleSeleccionBuscador} />
          </div>

          <button
            className={`map-filtros-btn${filtrosAbiertos ? " activo" : ""}`}
            onClick={() => setFiltrosAbiertos((v) => !v)}
          >
            ⚙️ Filtros
            {filtrosActivos > 0 && <span className="map-filtros-badge">{filtrosActivos}</span>}
            <span style={{ fontSize: 10, opacity: 0.7 }}>{filtrosAbiertos ? "▲" : "▼"}</span>
          </button>

          <span className="map-marker-count">
            {(cargandoEventos || cargandoObrasGeo) ? "⏳" : `${todosLosMarkers.length} 📍`}
          </span>
        </div>

        {filtrosAbiertos && (
          <div className="map-filtros-panel">
            <select className="map-filtros-select" value={continenteIdx}
              onChange={(e) => { setContinenteIdx(Number(e.target.value)); setPaisQID(null); }}>
              {CONTINENTES.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
            </select>

            {CONTINENTES[continenteIdx].paises.length > 0 && (
              <select className="map-filtros-select" value={paisQID || ""}
                onChange={(e) => setPaisQID(e.target.value || null)}>
                <option value="">— Todo el continente —</option>
                {CONTINENTES[continenteIdx].paises.map((p) => (
                  <option key={p.qid} value={p.qid}>{p.label}</option>
                ))}
              </select>
            )}

            <select className="map-filtros-select" value={epocaIdx}
              onChange={(e) => { setEpocaIdx(Number(e.target.value)); setConflictoQID(""); }}>
              {EPOCAS.map((ep, i) => <option key={i} value={i}>{ep.label}</option>)}
            </select>

            {epocaIdx > 0 && (
              <select className="map-filtros-select" value={categoriaIdx}
                onChange={(e) => setCategoriaIdx(Number(e.target.value))}>
                {CATEGORIAS_ARTE.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
              </select>
            )}

            {epocaIdx > 0 && (
              <select className="map-filtros-select" value={conflictoQID}
                onChange={(e) => setConflictoQID(e.target.value)} disabled={cargandoConflictos}>
                <option value="">
                  {cargandoConflictos ? "⏳ Cargando..." : `⚔️ Conflicto (${conflictos.length})`}
                </option>
                {conflictos.map((c) => (
                  <option key={c.qid} value={c.qid}>{c.name}{c.year ? ` (${c.year})` : ""}</option>
                ))}
              </select>
            )}

            <div className="map-filtros-legend">
              <span>⚡ Evento</span>
              <span>🎨 Obra</span>
              {filtrosActivos > 0 && (
                <button className="map-filtros-reset" onClick={() => {
                  setEpocaIdx(0); setConflictoQID("");
                  setCategoriaIdx(0); setPaisQID(null); setContinenteIdx(0);
                }}>
                  ✕ Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    
      {recorridoId && (
        <div className="map-banner map-banner-recorrido">
          <span className="map-banner-icon">➕</span>
          <span className="map-banner-texto">
            Modo recorrido — haz clic en una obra para añadirla
          </span>
          <button
            className="map-banner-clear"
            onClick={() => navigate(`/recorrido/${recorridoId}`)}
          >
            ← Volver al recorrido
          </button>
        </div>
      )}

  
      {busquedaActiva && (
        <div className="map-banner map-banner-busqueda">
          <span className="map-banner-icon">
            {busquedaActiva.tipo === "artista" ? "🎨" :
             busquedaActiva.tipo === "conflicto" ? "⚔️" : "🔍"}
          </span>
          <span className="map-banner-texto">
            {busquedaActiva.tipo === "artista" && <>Mostrando obras de <strong>{busquedaActiva.texto}</strong></>}
            {busquedaActiva.tipo === "conflicto" && <>Conflicto: <strong>{busquedaActiva.texto}</strong></>}
            {busquedaActiva.tipo === "evento" && <>Evento: <strong>{busquedaActiva.texto}</strong></>}
            {busquedaActiva.tipo === "obra" && <>Obra: <strong>{busquedaActiva.texto}</strong></>}
          </span>
          {busquedaActiva.cantidad !== null && (
            <span className="map-banner-count">
              · {busquedaActiva.cantidad} resultado{busquedaActiva.cantidad !== 1 ? "s" : ""}
            </span>
          )}
          <button className="map-banner-clear" onClick={limpiarBusqueda}>✕ Limpiar búsqueda</button>
        </div>
      )}


      {conflictoActual && !busquedaActiva && (
        <div className="map-banner map-banner-conflicto">
          <span style={{ color: "#7b9fff" }}>⚔️ {conflictoActual.name}</span>
          {conflictoActual.year && <span>· {conflictoActual.year}</span>}
          <span>· {eventos.length} evento{eventos.length !== 1 ? "s" : ""}</span>
          {obrasGeo.length > 0 && <span>· {obrasGeo.length} obra{obrasGeo.length !== 1 ? "s" : ""} 🎨</span>}
        </div>
      )}


      <div className="map-container">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center} zoom={zoom}
          onLoad={(map) => { mapRef.current = map; }}
          onClick={() => {
            const ahora = Date.now();
            if (ahora - ultimoClickMarker.current < 300) return;
            setSeleccionado(null);
            setGruposDesplegados(new Set());
          }}
        >
          {grupos.map((grupo) => (
            <ClusterMarker
              key={grupo.id}
              grupo={grupo}
              desplegado={gruposDesplegados.has(grupo.id)}
              onClickCluster={handleClickCluster}
              onClickItem={handleMarkerClick}
            />
          ))}
        </GoogleMap>
      </div>


      {seleccionado && seleccionado.tipo === "obra" && (
        <InfoPopupObra
          obra={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          onVerArtista={handleVerArtista}
          recorridoId={recorridoId}
          onObraGuardada={(nombre) => mostrarToast(`✓ "${nombre}" añadida al recorrido`)}
        />
      )}
      {seleccionado && seleccionado.tipo !== "obra" && (
        <InfoPopupEvento
          evento={seleccionado}
          obras={obras}
          cargando={cargando}
          onCerrar={() => { setSeleccionado(null); setEventoPanel(null); }}
          onVerMas={handleVerMas}
        />
      )}

      <PanelContexto evento={eventoPanel} onCerrar={() => setEventoPanel(null)} />


      {toastMsg && <div className="map-toast">{toastMsg}</div>}
    </div>
  );
}
