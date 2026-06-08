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
  // onboarding
  onboarding: {
    skip: string
    next: string
    start: string
    slides: Array<{ tab: string; title: string; desc: string }>
  }
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
    onboarding: {
      skip: 'PASSER',
      next: 'Suivant',
      start: "C'est parti ! 🎵",
      slides: [
        { tab: '📍 CARTE',              title: 'Tous les concerts sur la carte',       desc: '182 concerts à Paris le 21 juin. Filtre par genre ou par heure, touche un point pour le détail.' },
        { tab: '🃏 DÉCOUVRIR',           title: 'Swipe pour explorer',                  desc: "Swipe à droite ❤️ pour garder un concert, à gauche pour passer. Plus tu likes, mieux l'app te cerne." },
        { tab: '⏱ PROGRAMME · 🎯 AUTOUR', title: 'La frise horaire et les concerts proches', desc: 'Programme = tous les concerts heure par heure. Autour = ce qui joue à moins de 15 min à pied.' },
        { tab: '❤️ MA SOIRÉE',           title: 'Tes likes = ton itinéraire',            desc: "Chaque concert gardé s'ajoute à Ma soirée. Ton parcours, trié par heure, avec les temps de marche entre chaque concert." },
      ],
    },
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
    onboarding: {
      skip: 'SKIP',
      next: 'Next',
      start: "Let's go! 🎵",
      slides: [
        { tab: '📍 MAP',                    title: 'All concerts on the map',          desc: '182 concerts in Paris on June 21st. Filter by genre or time, tap a dot for details.' },
        { tab: '🃏 EXPLORE',                 title: 'Swipe to discover',                desc: "Swipe right ❤️ to keep a concert, left to skip. The more you like, the better the app knows you." },
        { tab: '⏱ SCHEDULE · 🎯 NEARBY',    title: 'Timeline & nearby concerts',       desc: 'Schedule = all concerts hour by hour. Nearby = what\'s playing within 15 min walk.' },
        { tab: '❤️ MY EVENING',              title: 'Your likes = your itinerary',      desc: "Every concert you keep goes into My Evening. Your route, sorted by time, with walking time between stops." },
      ],
    },
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
    onboarding: {
      skip: '跳过',
      next: '下一步',
      start: '出发！🎵',
      slides: [
        { tab: '📍 地图',          title: '地图上的所有演出',    desc: '6月21日巴黎共182场演出。按风格或时间筛选，点击标记查看详情。' },
        { tab: '🃏 发现',          title: '滑动探索',            desc: '向右滑动❤️保留演出，向左跳过。越多点赞，推荐越精准。' },
        { tab: '⏱ 节目 · 🎯 附近', title: '时间轴与附近演出',   desc: '节目单 = 按小时列出所有演出。附近 = 步行15分钟内的演出。' },
        { tab: '❤️ 我的夜晚',      title: '你的喜欢 = 你的行程', desc: '每场保存的演出都会加入「我的夜晚」。按时间排序的路线，含各站步行时间。' },
      ],
    },
  },
}
