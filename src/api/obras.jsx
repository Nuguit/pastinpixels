import { fetchObrasWikidata, fetchTerminosRelacionados } from "./wikidata";
import { fetchObrasPorKeywords } from "./arte";

async function traducirNombre(nombreEs) {
  try {
    const res = await fetch(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nombreEs)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.titles?.normalized) return null;
    const enRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(data.titles.normalized)}`
    );
    if (!enRes.ok) return null;
    const enData = await enRes.json();
    return enData.title || null;
  } catch {
    return null;
  }
}

function deduplicar(obras) {
  const vistos = new Set();
  return obras.filter((o) => {
    const key = o.title.toLowerCase().trim();
    if (vistos.has(key)) return false;
    vistos.add(key);
    return true;
  });
}

export async function fetchObrasParaEvento(evento) {
  let obras = [];

  // 1. Wikidata directo (relación semántica)
  const wikidataObras = await fetchObrasWikidata(evento.qid);
  obras = [...wikidataObras];

  // 2. Términos relacionados desde Wikidata
  const terminos = await fetchTerminosRelacionados(evento.qid);

  // 3. Traducción al inglés
  const nombreEn = await traducirNombre(evento.name);

  // 4. Lista de términos en inglés
  const terminosBusqueda = [
    ...(nombreEn ? [nombreEn] : []),
    ...terminos,
  ].filter(Boolean);

  // 5. Buscar en paralelo en inglés y español (algunas obras se traducen y eso ha supuesto problemas a la hora de encontrarlas)
  const [resultadosEn, resultadosEs] = await Promise.all([
    Promise.allSettled(
      terminosBusqueda.map((t) =>
        fetchObrasPorKeywords(t, evento.yearInicio, evento.yearFin)
      )
    ),
    Promise.allSettled(
      [evento.name].map((t) =>
        fetchObrasPorKeywords(t, evento.yearInicio, evento.yearFin)
      )
    ),
  ]);

  const nuevasEn = resultadosEn.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  const nuevasEs = resultadosEs.flatMap((r) => r.status === "fulfilled" ? r.value : []);

  obras = deduplicar([...obras, ...nuevasEn, ...nuevasEs]);
  return obras;
}