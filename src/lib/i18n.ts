export type Lang = 'fr' | 'en' | 'zh'

interface T {
  // carte — barre de recherche + chips
  searchPlaceholder: string
  genreAll: string
  // carte — état vide
  noConcerts: string
  clear: string
  // carte — scrubber
  allEvening: string
  concerts: string
  // carte — peek sheet
  nearYou: string
  onStage: string
  collapse: string
  list: string
  // carte — badge RÉSA mini-cards
  bookingRequired: string
  // slots (keyed by SlotId)
  slots: Record<string, string>
  // genres (keyed by Genre)
  genres: Record<string, string>
  // event content — prix
  priceFree: string
  priceLibre: string
  priceUnknown: string
  // event content — badges
  outdoor: string
  indoor: string
  bookingBadge: string
  // event content — like
  likeAdd: string
  likeAdded: string
  likeToastAdd: string
  likeToastRemove: string
  likeSee: string
  // event content — CTAs
  openMaps: string
  openCitymapper: string
  reserveLink: string
  reserveNoLink: string
  // event content — source
  source: string
  licenseLabel: string
  // status
  statusOngoing: string
  statusLater: string
  statusEnded: string
  soonLabel: (diffMin: number) => string
  // sélecteur de langue
  langPickerTitle: string
}

export const translations: Record<Lang, T> = {
  fr: {
    searchPlaceholder: 'Artiste, lieu, style…',
    genreAll: 'Tous',
    noConcerts: 'Aucun concert ne correspond.',
    clear: 'Effacer',
    allEvening: 'Toute la soirée',
    concerts: 'concerts',
    nearYou: 'Autour de toi',
    onStage: 'À l\'affiche',
    collapse: 'Réduire',
    list: 'Liste',
    bookingRequired: 'RÉSA',
    slots: {
      matin: 'Matin',
      'debut-aprem': 'Début aprem',
      'fin-aprem': 'Fin aprem',
      soiree: 'Soirée',
      nuit: 'Nuit',
    },
    genres: {
      rock: 'Rock', rap: 'Rap', jazz: 'Jazz', fanfare: 'Fanfare', trad: 'Trad',
      'soul-funk': 'Soul/Funk', reggae: 'Reggae', folk: 'Folk', world: 'World',
      electro: 'Électro', blues: 'Blues', classique: 'Classique', chorale: 'Chorale',
      pop: 'Pop', variete: 'Variété', autres: 'Autres',
    },
    priceFree: 'Gratuit',
    priceLibre: 'Prix libre',
    priceUnknown: 'Prix non précisé',
    outdoor: '🌳 Plein air',
    indoor: '🏠 En salle',
    bookingBadge: '🎟️ Sur réservation',
    likeAdd: 'Ajouter à ma soirée',
    likeAdded: 'Dans ma soirée ✓',
    likeToastAdd: 'Ajouté à Ma soirée',
    likeToastRemove: 'Retiré de Ma soirée',
    likeSee: 'Voir',
    openMaps: 'Ouvrir dans Google Maps',
    openCitymapper: 'Ouvrir dans Citymapper',
    reserveLink: 'Réserver',
    reserveNoLink: 'Réservation conseillée — voir la source ci-dessus.',
    source: 'Source',
    licenseLabel: 'données sous licence',
    statusOngoing: '🟢 En cours',
    statusLater: '⏰ Plus tard',
    statusEnded: '✅ Terminé',
    soonLabel: (diffMin) => {
      if (diffMin < 60) return `🔜 Dans ${diffMin} min`
      const h = Math.floor(diffMin / 60), m = diffMin % 60
      return m > 0 ? `🔜 Dans ${h}h${String(m).padStart(2, '0')}` : `🔜 Dans ${h}h`
    },
    langPickerTitle: 'Langue',
  },

  en: {
    searchPlaceholder: 'Artist, venue, style…',
    genreAll: 'All',
    noConcerts: 'No concerts match.',
    clear: 'Clear',
    allEvening: 'All evening',
    concerts: 'shows',
    nearYou: 'Near you',
    onStage: 'On stage',
    collapse: 'Collapse',
    list: 'List',
    bookingRequired: 'BOOK',
    slots: {
      matin: 'Morning',
      'debut-aprem': 'Early afternoon',
      'fin-aprem': 'Late afternoon',
      soiree: 'Evening',
      nuit: 'Night',
    },
    genres: {
      rock: 'Rock', rap: 'Rap', jazz: 'Jazz', fanfare: 'Brass band', trad: 'Traditional',
      'soul-funk': 'Soul/Funk', reggae: 'Reggae', folk: 'Folk', world: 'World',
      electro: 'Electro', blues: 'Blues', classique: 'Classical', chorale: 'Choir',
      pop: 'Pop', variete: 'Variety', autres: 'Other',
    },
    priceFree: 'Free',
    priceLibre: 'Pay what you want',
    priceUnknown: 'Price not specified',
    outdoor: '🌳 Outdoor',
    indoor: '🏠 Indoor',
    bookingBadge: '🎟️ Booking required',
    likeAdd: 'Add to my evening',
    likeAdded: 'In my evening ✓',
    likeToastAdd: 'Added to My Evening',
    likeToastRemove: 'Removed from My Evening',
    likeSee: 'View',
    openMaps: 'Open in Google Maps',
    openCitymapper: 'Open in Citymapper',
    reserveLink: 'Book',
    reserveNoLink: 'Booking recommended — see the source above.',
    source: 'Source',
    licenseLabel: 'data under licence',
    statusOngoing: '🟢 Ongoing',
    statusLater: '⏰ Later',
    statusEnded: '✅ Ended',
    soonLabel: (diffMin) => {
      if (diffMin < 60) return `🔜 In ${diffMin} min`
      const h = Math.floor(diffMin / 60), m = diffMin % 60
      return m > 0 ? `🔜 In ${h}h${m}` : `🔜 In ${h}h`
    },
    langPickerTitle: 'Language',
  },

  zh: {
    searchPlaceholder: '艺术家、场地、风格…',
    genreAll: '全部',
    noConcerts: '没有符合条件的演出。',
    clear: '清除',
    allEvening: '全天',
    concerts: '场演出',
    nearYou: '附近',
    onStage: '演出',
    collapse: '收起',
    list: '列表',
    bookingRequired: '预约',
    slots: {
      matin: '上午',
      'debut-aprem': '早下午',
      'fin-aprem': '晚下午',
      soiree: '傍晚',
      nuit: '夜晚',
    },
    genres: {
      rock: '摇滚', rap: '说唱', jazz: '爵士', fanfare: '管乐', trad: '传统',
      'soul-funk': '灵魂/放克', reggae: '雷鬼', folk: '民谣', world: '世界音乐',
      electro: '电子', blues: '布鲁斯', classique: '古典', chorale: '合唱',
      pop: '流行', variete: '流行歌曲', autres: '其他',
    },
    priceFree: '免费',
    priceLibre: '随意付费',
    priceUnknown: '价格未知',
    outdoor: '🌳 室外',
    indoor: '🏠 室内',
    bookingBadge: '🎟️ 需预约',
    likeAdd: '加入我的夜晚',
    likeAdded: '已加入夜晚 ✓',
    likeToastAdd: '已加入我的夜晚',
    likeToastRemove: '已从我的夜晚移除',
    likeSee: '查看',
    openMaps: '在谷歌地图中打开',
    openCitymapper: '在Citymapper中打开',
    reserveLink: '预约',
    reserveNoLink: '建议预约 — 请查看上方来源。',
    source: '来源',
    licenseLabel: '数据遵循许可证',
    statusOngoing: '🟢 进行中',
    statusLater: '⏰ 稍后',
    statusEnded: '✅ 已结束',
    soonLabel: (diffMin) => {
      if (diffMin < 60) return `🔜 ${diffMin}分钟后`
      const h = Math.floor(diffMin / 60), m = diffMin % 60
      return m > 0 ? `🔜 ${h}小时${m}分后` : `🔜 ${h}小时后`
    },
    langPickerTitle: '语言',
  },
}
