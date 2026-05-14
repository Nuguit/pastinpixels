import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoogleMap, useLoadScript, OverlayView } from "@react-google-maps/api";
import { apiGetRecorridos, apiDeleteRecorrido } from "../api/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("pip_token");
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

// Modal añadir nota
function ModalNota({ inicial, onGuardar, onCerrar, cargando }) {
  const [texto, setTexto] = useState(inicial || "");
  return (
    <div className="perfil-modal-overlay" onClick={onCerrar}>
      <div className="perfil-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="perfil-modal-title">{inicial ? "Editar nota" : "Nueva nota"}</h3>
        <label className="perfil-field-label">Texto</label>
        <textarea
          className="perfil-field-input perfil-field-textarea"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe tu nota sobre este recorrido..."
          rows={4}
          autoFocus
        />
        <div className="perfil-modal-actions">
          <button className="perfil-btn-cancel" onClick={onCerrar}>Cancelar</button>
          <button
            className="perfil-btn-primary"
            onClick={() => onGuardar(texto)}
            disabled={!texto.trim() || cargando}
          >
            {cargando ? "Guardando..." : "Guardar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

//Marcador simple en el mapa
function ObraMarker({ obra }) {
  return (
    <OverlayView
      position={{ lat: parseFloat(obra.lat) || 0, lng: parseFloat(obra.lng) || 0 }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div className="detalle-marker" title={obra.titulo}>
        {obra.imagen_url ? (
          <img
            src={obra.imagen_url}
            alt={obra.titulo}
            className="detalle-marker-img"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <span className="detalle-marker-emoji">🎨</span>
        )}
      </div>
    </OverlayView>
  );
}

// Componente principal
export default function DetalleRecorrido() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [recorrido, setRecorrido] = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState("");
  const [modalNota, setModalNota] = useState(false);
  const [modalEditNota, setModalEditNota] = useState(null); 
  const [guardando, setGuardando] = useState(false);
  const [obraActiva, setObraActiva] = useState(null);

  const cargarRecorrido = useCallback(async () => {
    try {
      const data = await apiFetch(`/recorridos/${id}`);
      setRecorrido(data);
    } catch (err) {
      if (err.message === "Sesión expirada") navigate("/login");
      else setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargarRecorrido(); }, [cargarRecorrido]);

  const handleEditNota = async (texto) => {
    setGuardando(true);
    try {
      await apiFetch(`/recorridos/${id}/notas/${modalEditNota.id_nota}`, {
        method: "PUT",
        body: JSON.stringify({ texto }),
      });
      setRecorrido((prev) => ({
        ...prev,
        notas: prev.notas.map((n) =>
          n.id_nota === modalEditNota.id_nota ? { ...n, texto } : n
        ),
      }));
      setModalEditNota(null);
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const handleDeleteNota = async (idNota) => {
    try {
      await apiFetch(`/recorridos/${id}/notas/${idNota}`, { method: "DELETE" });
      setRecorrido((prev) => ({
        ...prev,
        notas: prev.notas.filter((n) => n.id_nota !== idNota),
      }));
    } catch (err) { setError(err.message); }
  };

  const handleAddNota = async (texto) => {
    setGuardando(true);
    try {
      const nueva = await apiFetch(`/recorridos/${id}/notas`, {
        method: "POST",
        body: JSON.stringify({ texto }),
      });
      setRecorrido((prev) => ({
        ...prev,
        notas: [{ ...nueva, fecha_creacion: new Date().toISOString() }, ...prev.notas],
      }));
      setModalNota(false);
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const handleRemoveObra = async (idObra) => {
    try {
      await apiFetch(`/recorridos/${id}/obras/${idObra}`, { method: "DELETE" });
      setRecorrido((prev) => ({
        ...prev,
        obras: prev.obras.filter((o) => o.id !== idObra),
      }));
    } catch (err) { setError(err.message); }
  };

  // Centro del mapa: media de coords de las obras
  const mapCenter = recorrido?.obras?.length
    ? {
        lat: recorrido.obras.reduce((acc, o) => acc + (parseFloat(o.lat) || 0), 0) / recorrido.obras.length,
        lng: recorrido.obras.reduce((acc, o) => acc + (parseFloat(o.lng) || 0), 0) / recorrido.obras.length,
      }
    : { lat: 20, lng: 0 };

  if (cargando) return <div className="perfil-loading">⏳ Cargando recorrido...</div>;
  if (!recorrido) return <div className="perfil-loading">Recorrido no encontrado.</div>;

  const FUENTE_COLOR = { wikidata: "#7b5ea7", met: "#c0392b", europeana: "#2980b9", chicago: "#27ae60" };
  const FUENTE_LABEL = { wikidata: "Wikidata", met: "Met", europeana: "Europeana", chicago: "Chicago" };

  return (
    <div className="detalle-wrapper">

 
      <div className="detalle-header">
        <button className="detalle-back-btn" onClick={() => navigate("/perfil")}>
          ← Volver al perfil
        </button>
        <div className="detalle-header-info">
          <h1 className="detalle-title">{recorrido.nombre}</h1>
          {recorrido.descripcion && (
            <p className="detalle-desc">{recorrido.descripcion}</p>
          )}
        </div>
        <div className="detalle-header-actions">
          <button
            className="perfil-btn-primary"
            onClick={() => navigate(`/map?recorrido=${id}`)}
          >
            + Añadir obras desde el mapa
          </button>
        </div>
      </div>

      {error && <div className="perfil-error detalle-error">{error}</div>}


      <div className="detalle-layout">


        <div className="detalle-mapa-col">
          <div className="detalle-mapa-header">
            <span className="detalle-section-label">🗺 Mapa del recorrido</span>
            <span className="detalle-section-count">{recorrido.obras.length} obras</span>
          </div>
          <div className="detalle-mapa">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={recorrido.obras.length > 0 ? 4 : 2}
              >
                {recorrido.obras.map((obra) =>
                  obra.lat && obra.lng ? (
                    <ObraMarker key={obra.id} obra={obra} />
                  ) : null
                )}
              </GoogleMap>
            ) : (
              <div className="detalle-mapa-loading">⏳ Cargando mapa...</div>
            )}
          </div>
        </div>


        <div className="detalle-content-col">


          <div className="detalle-section">
            <div className="detalle-section-header">
              <span className="detalle-section-label">🎨 Obras guardadas</span>
              <span className="detalle-section-count">{recorrido.obras.length}</span>
            </div>

            {recorrido.obras.length === 0 ? (
              <div className="detalle-empty">
                <p>Aún no hay obras en este recorrido.</p>
                <button
                  className="perfil-btn-primary"
                  onClick={() => navigate(`/map?recorrido=${id}`)}
                >
                  Ir al mapa a añadir obras
                </button>
              </div>
            ) : (
              <div className="detalle-obras-grid">
                {recorrido.obras.map((obra) => (
                  <div
                    key={obra.id}
                    className={`detalle-obra-card${obraActiva === obra.id ? " activa" : ""}`}
                    onClick={() => setObraActiva(obraActiva === obra.id ? null : obra.id)}
                  >
                    <div className="detalle-obra-img">
                      {obra.imagen_url ? (
                        <img
                          src={obra.imagen_url}
                          alt={obra.titulo}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <div className="detalle-obra-img-empty">🎨</div>
                      )}
                      {obra.fuente_api && (
                        <span
                          className="detalle-obra-badge"
                          style={{ background: FUENTE_COLOR[obra.fuente_api] || "#555" }}
                        >
                          {FUENTE_LABEL[obra.fuente_api] || obra.fuente_api}
                        </span>
                      )}
                    </div>
                    <div className="detalle-obra-info">
                      <div className="detalle-obra-titulo">{obra.titulo || "Sin título"}</div>
                      <div className="detalle-obra-artista">{obra.artista || "Artista desconocido"}</div>
                      {obra.anio && <div className="detalle-obra-anio">{obra.anio}</div>}
                    </div>
                    <div className="detalle-obra-actions">
                      {obra.url_externo && (
                        <a
                          href={obra.url_externo}
                          target="_blank"
                          rel="noreferrer"
                          className="detalle-obra-btn-ver"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver →
                        </a>
                      )}
                      <button
                        className="detalle-obra-btn-delete"
                        onClick={(e) => { e.stopPropagation(); handleRemoveObra(obra.id); }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="detalle-section">
            <div className="detalle-section-header">
              <span className="detalle-section-label">📝 Notas</span>
              <button className="perfil-btn-secondary" onClick={() => setModalNota(true)}>
                + Añadir nota
              </button>
            </div>

            {recorrido.notas.length === 0 ? (
              <div className="detalle-empty">
                <p>Aún no hay notas en este recorrido.</p>
              </div>
            ) : (
              <div className="detalle-notas-list">
                {recorrido.notas.map((nota) => (
                  <div key={nota.id_nota} className="detalle-nota-card">
                    <p className="detalle-nota-texto">{nota.texto}</p>
                    <div className="detalle-nota-footer">
                      <div className="detalle-nota-fecha">
                        {new Date(nota.fecha_creacion).toLocaleDateString("es-ES", {
                          day: "numeric", month: "long", year: "numeric"
                        })}
                      </div>
                      <div className="detalle-nota-btns">
                        <button
                          className="detalle-nota-btn-edit"
                          onClick={() => setModalEditNota(nota)}
                        >
                          ✏️
                        </button>
                        <button
                          className="detalle-nota-btn-delete"
                          onClick={() => handleDeleteNota(nota.id_nota)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {modalNota && (
        <ModalNota
          onGuardar={handleAddNota}
          onCerrar={() => setModalNota(false)}
          cargando={guardando}
        />
      )}
      {modalEditNota && (
        <ModalNota
          inicial={modalEditNota.texto}
          onGuardar={handleEditNota}
          onCerrar={() => setModalEditNota(null)}
          cargando={guardando}
        />
      )}
    </div>
  );
}
