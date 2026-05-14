import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import bannerImg from "../assets/bannerImg.png";
const favicon = "/favicon.png";

const OBRAS_DESTACADAS = [
  {
    title: "El Guernica",
    artista: "Pablo Picasso",
    year: "1937",
    evento: "Guerra Civil Española",
    image: "/guernica.jpg",
    url: "https://es.wikipedia.org/wiki/Guernica_(cuadro)",
  },
  {
    title: "El jardín de las delicias",
    artista: "El Bosco",
    year: "1490-1510",
    evento: "Renacimiento flamenco",
    image: "/jardin-delicias.jpg",
    url: "https://es.wikipedia.org/wiki/El_jard%C3%ADn_de_las_delicias",
  },
  {
    title: "Las Meninas",
    artista: "Diego Velázquez",
    year: "1656",
    evento: "Siglo de Oro español",
    image: "/meninas.jpg",
    url: "https://es.wikipedia.org/wiki/Las_meninas",
  },
];

const FEATURES = [
  { emoji: "🗺️", titulo: "Mapa interactivo", desc: "Explora eventos históricos y obras de arte geolocalizadas en un mapa mundial." },
  { emoji: "🔍", titulo: "Búsqueda por artista", desc: "Encuentra todas las obras de un artista y descubre dónde están ubicadas en el mundo." },
  { emoji: "⚡", titulo: "Contexto histórico", desc: "Cada evento incluye descripción, países implicados y obras relacionadas de la época." },
  { emoji: "✨", titulo: "Recorridos narrativos", desc: "Crea tu propia curaduría digital combinando obras, mapas y notas personales." },
];

const PASOS = [
  { num: "01", titulo: "Elige un evento o artista", desc: "Selecciona una época histórica, un conflicto o busca directamente por nombre de artista." },
  { num: "02", titulo: "Explora el mapa", desc: "Las obras aparecen geolocalizadas en el mapa. Haz clic para ver el contexto histórico." },
  { num: "03", titulo: "Crea tu recorrido", desc: "Guarda las obras que más te interesen y construye tu narrativa histórico-artística." },
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const y = window.scrollY;
        heroRef.current.style.transform = `translateY(${y * 0.4}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-wrapper">

      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <img src={favicon} alt="Past in Pixels" />
          <span>Past in Pixels</span>
        </div>
        <div className="landing-nav-btns">
          <button className="landing-nav-btn-outline" onClick={() => navigate("/map")}>Explorar</button>
          <button className="landing-nav-btn-solid" onClick={() => navigate("/login")}>Acceder</button>
        </div>
      </nav>

      <div className="landing-hero">
        <div ref={heroRef} className="landing-hero-bg" />
        <div className="landing-hero-grid" />
        <div className="landing-hero-line-left" />
        <div className="landing-hero-line-right" />
        <div className="landing-hero-banner" style={{ backgroundImage: `url(${bannerImg})` }} />

        <div className="landing-hero-content">
          <div className="landing-hero-label">European Art Journey</div>
          <p className="landing-hero-subtitle">
            Explora la historia a través del arte. Cada obra, un testimonio. Cada evento, una historia que ver.
          </p>
          <div className="landing-hero-btns">
            <button className="landing-hero-btn-primary" onClick={() => navigate("/map")}>
              Explorar el mapa →
            </button>
            <button
              className="landing-hero-btn-secondary"
              onClick={() => document.getElementById("como-funciona").scrollIntoView({ behavior: "smooth" })}
            >
              Cómo funciona
            </button>
          </div>
        </div>

      </div>

      <div className="landing-section">
        <div className="landing-section-divider">
          <div className="landing-section-divider-line" />
          <span className="landing-section-divider-label">Arte como testimonio</span>
          <div className="landing-section-divider-line" />
        </div>
        <div className="landing-obras-grid">
          {OBRAS_DESTACADAS.map((obra, i) => (
            <div key={i} className="landing-obra-card" onClick={() => obra.url && window.open(obra.url, "_blank")}>
              <img src={obra.image} alt={obra.title} onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <div className="landing-obra-overlay" />
              <div className="landing-obra-info">
                <div className="landing-obra-evento">{obra.evento}</div>
                <div className="landing-obra-title">{obra.title}</div>
                <div className="landing-obra-meta">{obra.artista} · {obra.year}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="como-funciona" className="landing-como-funciona">
        <div className="landing-section-header" style={{ maxWidth: 1000, margin: "0 auto 80px" }}>
          <div className="landing-section-label">El proceso</div>
          <h2 className="landing-section-title">Cómo funciona</h2>
        </div>
        <div className="landing-pasos-grid">
          {PASOS.map((paso, i) => (
            <div key={i}>
              <div className="landing-paso-num">{paso.num}</div>
              <div className="landing-paso-line" />
              <h3 className="landing-paso-title">{paso.titulo}</h3>
              <p className="landing-paso-desc">{paso.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-section" style={{ maxWidth: 1100 }}>
        <div className="landing-section-header">
          <div className="landing-section-label">Qué puedes hacer</div>
          <h2 className="landing-section-title">Una experiencia completa</h2>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="landing-feature-card">
              <div className="landing-feature-emoji">{f.emoji}</div>
              <h3 className="landing-feature-title">{f.titulo}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-cta">
        <div className="landing-cta-glow" />
        <div className="landing-cta-circle-lg" />
        <div className="landing-cta-circle-sm" />
        <div className="landing-cta-content">
          <div className="landing-cta-label">Empieza ahora</div>
          <h2 className="landing-cta-title">La historia te espera</h2>
          <p className="landing-cta-subtitle">Miles de obras. Siglos de historia. Un mapa para recorrerlos.</p>
          <button className="landing-cta-btn" onClick={() => navigate("/map")}>Abrir el mapa →</button>
        </div>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-logo">
          <span>🗺</span>
          <span>Past in Pixels</span>
        </div>
        <div className="landing-footer-credits">
          Datos de Wikidata · Europeana · The Met · Art Institute of Chicago
        </div>
      </footer>
    </div>
  );
}
