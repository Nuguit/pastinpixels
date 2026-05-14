export async function fetchObrasPorKeywords(termino, yearInicio, yearFin) {
  const results = await Promise.allSettled([
    buscarMet(termino, yearInicio, yearFin),
    buscarEuropeana(termino, yearInicio, yearFin),
    buscarArtChicago(termino, yearInicio, yearFin),
  ]);
  return results.flatMap((r) =>
    r.status === "fulfilled"
      ? r.value.map((obra) => ({ ...obra, terminoBusqueda: termino }))
      : []
  );
}

async function buscarMet(query, yearInicio, yearFin) {
  const params = new URLSearchParams({
    q: query,
    hasImages: "true",
    ...(yearInicio && { dateBegin: yearInicio }),
    ...(yearFin && { dateEnd: yearFin ?? yearInicio + 20 }),
  });
  const search = await fetch(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?${params}`
  );
  const { objectIDs } = await search.json();
  if (!objectIDs) return [];
  const detalles = await Promise.allSettled(
    objectIDs.slice(0, 6).map((id) =>
      fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).then((r) => r.json())
    )
  );
  return detalles
    .filter((r) => r.status === "fulfilled" && r.value.primaryImageSmall)
    .map((r) => ({
      title: r.value.title,
      artist: r.value.artistDisplayName || "Desconocido",
      date: r.value.objectDate || "",
      year: parseInt(r.value.objectBeginDate) || null,
      museum: "The Met",
      image: r.value.primaryImageSmall,
      url: r.value.objectURL,
      fuente: "met",
    }));
}

async function buscarEuropeana(query, yearInicio, yearFin) {
  const apiKey = import.meta.env.VITE_EUROPEANA_API_KEY;
  const filtroFecha =
    yearInicio && yearFin
      ? `&qf=YEAR:[${yearInicio} TO ${yearFin ?? yearInicio + 20}]`
      : "";
  const res = await fetch(
    `https://api.europeana.eu/record/v2/search.json?wskey=${apiKey}&query=${encodeURIComponent(query)}&qf=TYPE:IMAGE&rows=6&profile=rich${filtroFecha}`
  );
  const data = await res.json();
  if (!data.items) return [];
  return data.items
    .filter((item) => item.edmPreview?.length)
    .map((item) => ({
      title: Array.isArray(item.title) ? item.title[0] : item.title || "Sin título",
      artist: item.dcCreator?.[0] || "Desconocido",
      date: item.year?.[0] || "",
      year: item.year?.[0] ? parseInt(item.year[0]) : null,
      museum: item.dataProvider?.[0] || "Europeana",
      image: item.edmPreview[0],
      url: item.guid,
      fuente: "europeana",
    }));
}

async function buscarArtChicago(query, yearInicio, yearFin) {
  const res = await fetch(
    `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&fields=id,title,artist_display,date_display,date_start,image_id&limit=6`
  );
  const data = await res.json();
  if (!data.data) return [];
  return data.data
    .filter((item) => {
      if (!item.image_id) return false;
      if (yearInicio && yearFin && item.date_start) {
        return item.date_start >= yearInicio && item.date_start <= (yearFin ?? yearInicio + 20);
      }
      return true;
    })
    .map((item) => ({
      title: item.title,
      artist: item.artist_display || "Desconocido",
      date: item.date_display || "",
      year: item.date_start || null,
      museum: "Art Institute of Chicago",
      image: `https://www.artic.edu/iiif/2/${item.image_id}/full/200,/0/default.jpg`,
      url: `https://www.artic.edu/artworks/${item.id}`,
      fuente: "chicago",
    }));
}