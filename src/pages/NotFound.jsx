import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-wrapper">
      <div className="notfound-content">
        <div className="notfound-code">404</div>
        <div className="notfound-deco-line" />
        <h1 className="notfound-title">Página no encontrada</h1>
        <p className="notfound-desc">
          La ruta que buscas no existe o ha sido movida.
        </p>
        <div className="notfound-btns">
          <button className="notfound-btn-primary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
          <button className="notfound-btn-secondary" onClick={() => navigate("/map")}>
            Ir al mapa
          </button>
        </div>
      </div>
    </div>
  );
}
