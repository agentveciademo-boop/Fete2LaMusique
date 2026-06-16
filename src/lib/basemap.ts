// Épure le fond de carte : masque le « bruit » (icônes POI/commerces, marqueurs de lieux,
// flèches de sens unique, bâtiments 3D) tout en GARDANT les libellés texte (noms de villes,
// de quartiers, de rues). Itère sur les couches réelles du style chargé plutôt que de coder
// en dur des ids de couches — ceux-ci diffèrent d'un style OpenFreeMap à l'autre
// (Liberty/Sombre/Bleu/Clair…), ce qui laissait passer une grille de marqueurs gris quand
// la prod servait un style aux couches POI nommées autrement.
//
// À appeler sur `onStyleData` (au 1er chargement ET à chaque swap de fond de carte).

// Nos propres couches (pins, halos, calques) : à ne JAMAIS masquer.
const OWN_LAYER_IDS = new Set([
  'events-unclustered', 'affluence-points', 'events-glow', 'events-pulse', 'events-booking',
  'transit-casing', 'transit-line', 'transit-stations', 'toilettes', 'fontaines',
  'arr-fill', 'arr-outline', 'affluence-heat', 'affluence-points', 'periph-fill', 'periph-line',
])

export function declutterBasemap(map: any): void {
  const layers = map.getStyle()?.layers ?? []
  for (const l of layers) {
    if (OWN_LAYER_IDS.has(l.id)) continue
    // Bâtiments 3D (extrusion) → carte à plat.
    if (l.type === 'fill-extrusion') {
      try { map.setLayoutProperty(l.id, 'visibility', 'none') } catch {/* style pas prêt */}
      continue
    }
    if (l.type !== 'symbol') continue
    const lay = l.layout ?? {}
    if (!lay['icon-image']) continue // couche texte pure (labels) → on garde
    try {
      if (lay['text-field']) {
        // Couche icône + texte (ex. marqueur de ville) : on garde le label, on vire l'icône.
        map.setPaintProperty(l.id, 'icon-opacity', 0)
      } else {
        // Couche icône seule (POI, flèches de sens) : on masque tout.
        map.setLayoutProperty(l.id, 'visibility', 'none')
      }
    } catch {/* style pas prêt */}
  }
}
