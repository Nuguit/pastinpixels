import { useState, useEffect, useRef, useCallback } from "react";
import { fetchBusquedaGlobal } from "../api/wikidata";

export default function BuscadorGlobal({ onSeleccionar }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState({ obras: [], eventos: [] });
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const buscar = useCallback(async (t) => {
    if (t.trim().length < 2) { setResultados({ obras: [], eventos: [] }); return; }
    setBuscando(true);
    try {
      const res = await fetchBusquedaGlobal(t);
      setResultados(res);
      setAbierto(true);
    } catch (err) {
      console.error(err);
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (texto.trim().length < 2) {
      setResultados({ obras: [], eventos: [] });
      setAbierto(false);
      return;
    }
    timerRef.current = setTimeout(() => buscar(texto), 500);
    return () => clearTimeout(timerRef.current);
  }, [texto, buscar]);

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (inputRef.current && !inputRef.current.closest(".buscador-global").contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const handleSeleccionar = (item) => {
    setTexto("");
    setAbierto(false);
    setResultados({ obras: [], eventos: [] });
    onSeleccionar(item);
  };

  const totalResultados = resultados.obras.length + resultados.eventos.length;

  return (
    <div className="buscador-global">
      <div className={`buscador-input-wrapper${abierto ? " abierto" : ""}`}
        style={{ border: `1px solid ${abierto ? "#f07e27" : "#555"}` }}
      >
        <span className="buscador-icon">🔍</span>
        <input
          ref={inputRef}
          className="buscador-input"
          type="text"
          placeholder="Obra, artista, evento..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => totalResultados > 0 && setAbierto(true)}
        />
        {buscando && <span className="buscador-spinner">⏳</span>}
        {texto && !buscando && (
          <button
            className="buscador-clear-btn"
            onClick={() => { setTexto(""); setAbierto(false); setResultados({ obras: [], eventos: [] }); }}
          >✕</button>
        )}
      </div>

      {abierto && (totalResultados > 0 || (!buscando && texto.trim().length >= 2)) && (
        <div className="buscador-dropdown">

          {totalResultados === 0 && !buscando && (
            <div className="buscador-no-results">
              No se encontraron resultados para "{texto}"
            </div>
          )}

          {resultados.obras.length > 0 && (
            <div>
              <div className="buscador-section-header">
                🎨 Obras ({resultados.obras.length})
              </div>
              {resultados.obras.map((obra, i) => (
                <div
                  key={`obra-${obra.qid}-${i}`}
                  className="buscador-item"
                  onClick={() => handleSeleccionar(obra)}
                >
                  {obra.image ? (
                    <img
                      className="buscador-item-thumb"
                      src={obra.image}
                      alt={obra.name}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="buscador-item-thumb-empty">🎨</div>
                  )}
                  <div className="buscador-item-info">
                    <div className="buscador-item-name">{obra.name}</div>
                    <div className="buscador-item-meta">
                      <span>{obra.artista}{obra.year ? ` · ${obra.year}` : ""}</span>
                      {obra.tieneCoord
                        ? <span className="buscador-item-coord">📍 en mapa</span>
                        : <span className="buscador-item-no-coord">solo info</span>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resultados.eventos.length > 0 && (
            <div>
              <div className="buscador-section-header">
                ⚡ Eventos y conflictos ({resultados.eventos.length})
              </div>
              {resultados.eventos.map((evento, i) => (
                <div
                  key={`evento-${evento.qid}-${i}`}
                  className="buscador-item-evento"
                  onClick={() => handleSeleccionar(evento)}
                >
                  <div className="buscador-item-evento-icon">
                    {evento.tipo === "conflicto" ? "⚔️" : "⚡"}
                  </div>
                  <div className="buscador-item-info">
                    <div className="buscador-item-name">{evento.name}</div>
                    <div className="buscador-item-meta">
                      <span>{evento.tipo === "conflicto" ? "Conflicto" : "Evento histórico"}</span>
                      {evento.yearInicio && <span>· {evento.yearInicio}</span>}
                      {evento.lat && <span className="buscador-item-evento-coord">📍 en mapa</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
