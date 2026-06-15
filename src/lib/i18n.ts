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
  // carte — boutons calques (métro / toilettes / fontaines)
  layerMetro: string
  layerToilets: string
  layerFountains: string
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
  // nav
  navCarte: string
  navAffluence: string
  navProgramme: string
  navAutour: string
  navMaSoiree: string
  // affluence (heatmap estimée)
  affTitle: string
  affSubtitle: string
  affExplainer: string
  affLegendLow: string
  affLegendHigh: string
  affLoading: string
  // autour
  autourTitle: string
  autourGeoOn: string
  autourGeoOff: string
  autourBientotBadge: (n: number) => string
  autourSectionPreFestival: string
  autourSectionBientot: string
  autourPreFestivalBanner: (days: number) => string
  autourNoGenre: string
  autourNone: string
  autourGeoTitle: string
  autourGeoDesc: string
  autourGeoBtn: string
  autourClearFilters: string
  autourDebutLabel: string
  autourDateLabel: string
  // programme
  progDateline: string
  progTitle: string
  progLoading: string
  progNow: string
  progConflict: (n: number) => string
  progSunsetTitle: string
  progSunsetSub: string
  // decouvrir
  decLoading: string
  decAllSeen: string
  decShortlist: (n: number) => string
  decNoFavs: string
  decRestart: string
  decSeeEvening: string
  decTitle: string
  decRemaining: (n: number) => string
  decToastAdded: string
  decKept: string
  decPassed: string
  decSoonBadge: (n: number) => string
  // ma-soirée
  soireeEmpty: string
  soireeEmptyDesc: string
  soireeDiscoverBtn: string
  soireeDateline: string
  soireeTitle: string
  soireeShareLabel: string
  soireeConcerts: (n: number) => string
  soireeDistance: string
  soireeDuration: string
  soireeRemove: string
  soireeWalk: (n: number) => string
  soireeAdd: string
  soireeLaunch: string
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
    layerMetro: '🚇 Métro / RER',
    layerToilets: '🚻 Toilettes',
    layerFountains: '🚰 Fontaines',
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
    navCarte: 'Carte', navAffluence: 'Affluence', navProgramme: 'Programme', navAutour: 'Autour', navMaSoiree: 'Ma soirée',
    affTitle: 'Affluence estimée',
    affSubtitle: 'Où ça va être chaud',
    affExplainer: 'Estimation d’après la notoriété des artistes programmés — pas une mesure réelle de foule.',
    affLegendLow: 'Calme',
    affLegendHigh: 'Plein à craquer',
    affLoading: 'Chargement de la carte…',
    autourTitle: 'Près de toi', autourGeoOn: 'Position activée', autourGeoOff: 'Position non activée',
    autourBientotBadge: (n) => `${n} bientôt`,
    autourSectionPreFestival: 'DANS LA RUE LE 21 JUIN', autourSectionBientot: 'ÇA COMMENCE BIENTÔT',
    autourPreFestivalBanner: (days) => `Le festival, c'est dans ${days} jour${days > 1 ? 's' : ''} — voici les concerts les plus proches de toi.`,
    autourNoGenre: 'Aucun concert de ce genre dans les 90 prochaines minutes.', autourNone: "Rien d'imminent juste autour.",
    autourGeoTitle: 'Active ta position', autourGeoDesc: 'Pour voir les concerts près de toi et calculer le temps de marche', autourGeoBtn: 'Activer la géolocalisation',
    autourClearFilters: 'Effacer filtres', autourDebutLabel: 'DÉBUT', autourDateLabel: '21 JUIN',
    progDateline: 'DIM. 21 JUIN · SOLSTICE', progTitle: 'La plus longue nuit de musique', progLoading: 'Chargement du programme…',
    progNow: '● MAINTENANT', progConflict: (n) => `${n} concerts en même temps`,
    progSunsetTitle: 'Le soleil se couche à 21h58', progSunsetSub: "La fête bat son plein jusqu'à l'aube",
    decLoading: 'Chargement des concerts…', decAllSeen: 'Tu as tout vu !',
    decShortlist: (n) => `${n} concert${n > 1 ? 's' : ''} dans ta shortlist.`,
    decNoFavs: "Aucun favori pour l'instant — relance pour en garder.",
    decRestart: 'Recommencer', decSeeEvening: 'Voir ma soirée', decTitle: 'À découvrir',
    decRemaining: (n) => `SWIPE · ${n} RESTANT${n > 1 ? 'S' : ''}`,
    decToastAdded: 'Ajouté à Ma soirée', decKept: 'GARDÉ', decPassed: 'PASSÉ',
    decSoonBadge: (n) => `DANS ${n} MIN`,
    soireeEmpty: 'Ta soirée est vide', soireeEmptyDesc: "Garde des concerts depuis l'onglet Découvrir pour composer ton parcours.",
    soireeDiscoverBtn: 'Découvrir des concerts', soireeDateline: 'TON PARCOURS · 21 JUIN', soireeTitle: 'Ma soirée',
    soireeShareLabel: 'Partager', soireeConcerts: (n) => n > 1 ? 'concerts' : 'concert',
    soireeDistance: 'à pied', soireeDuration: 'durée', soireeRemove: 'Retirer',
    soireeWalk: (n) => `${n} min de marche`, soireeAdd: 'Ajouter un concert…', soireeLaunch: "Lancer l'itinéraire",
    onboarding: {
      skip: 'PASSER',
      next: 'Suivant',
      start: "C'est parti ! 🎵",
      slides: [
        { tab: '📍 CARTE',              title: 'Tous les concerts sur la carte',       desc: '182 concerts à Paris le 21 juin. Filtre par genre ou par heure, touche un point pour le détail.' },
        { tab: '🔥 AFFLUENCE',           title: 'Où ça va être chaud',                  desc: "Une carte façon météo de l'affluence estimée : rouge = têtes d'affiche bondées, bleu = tranquille. Suis le curseur horaire pour voir la foule bouger dans la nuit." },
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
    layerMetro: '🚇 Metro / RER',
    layerToilets: '🚻 Toilets',
    layerFountains: '🚰 Water',
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
    navCarte: 'Map', navAffluence: 'Crowds', navProgramme: 'Schedule', navAutour: 'Nearby', navMaSoiree: 'My Evening',
    affTitle: 'Estimated crowds',
    affSubtitle: 'Where it’s going off',
    affExplainer: 'Estimated from the fame of the line-up — not a real crowd measurement.',
    affLegendLow: 'Quiet',
    affLegendHigh: 'Packed',
    affLoading: 'Loading map…',
    autourTitle: 'Near you', autourGeoOn: 'Location enabled', autourGeoOff: 'Location not enabled',
    autourBientotBadge: (n) => `${n} soon`,
    autourSectionPreFestival: 'IN THE STREET JUNE 21', autourSectionBientot: 'STARTING SOON',
    autourPreFestivalBanner: (days) => `The festival is in ${days} day${days > 1 ? 's' : ''} — here are the nearest concerts.`,
    autourNoGenre: 'No concerts of this genre in the next 90 minutes.', autourNone: 'Nothing imminent nearby.',
    autourGeoTitle: 'Enable your location', autourGeoDesc: 'To see concerts near you and calculate walking time', autourGeoBtn: 'Enable location',
    autourClearFilters: 'Clear filters', autourDebutLabel: 'START', autourDateLabel: 'JUNE 21',
    progDateline: 'SUN. JUNE 21 · SOLSTICE', progTitle: 'The longest night of music', progLoading: 'Loading schedule…',
    progNow: '● NOW', progConflict: (n) => `${n} concerts at the same time`,
    progSunsetTitle: 'Sunset at 9:58 PM', progSunsetSub: 'The party goes on until dawn',
    decLoading: 'Loading concerts…', decAllSeen: "You've seen it all!",
    decShortlist: (n) => `${n} concert${n > 1 ? 's' : ''} in your shortlist.`,
    decNoFavs: 'No favourites yet — restart to keep some.',
    decRestart: 'Restart', decSeeEvening: 'See my evening', decTitle: 'Explore',
    decRemaining: (n) => `SWIPE · ${n} LEFT`,
    decToastAdded: 'Added to My Evening', decKept: 'KEPT', decPassed: 'PASSED',
    decSoonBadge: (n) => `IN ${n} MIN`,
    soireeEmpty: 'Your evening is empty', soireeEmptyDesc: 'Keep concerts from the Explore tab to plan your night.',
    soireeDiscoverBtn: 'Explore concerts', soireeDateline: 'YOUR ROUTE · JUNE 21', soireeTitle: 'My Evening',
    soireeShareLabel: 'Share', soireeConcerts: (n) => n > 1 ? 'shows' : 'show',
    soireeDistance: 'on foot', soireeDuration: 'duration', soireeRemove: 'Remove',
    soireeWalk: (n) => `${n} min walk`, soireeAdd: 'Add a concert…', soireeLaunch: 'Start navigation',
    onboarding: {
      skip: 'SKIP',
      next: 'Next',
      start: "Let's go! 🎵",
      slides: [
        { tab: '📍 MAP',                    title: 'All concerts on the map',          desc: '182 concerts in Paris on June 21st. Filter by genre or time, tap a dot for details.' },
        { tab: '🔥 CROWDS',                  title: 'Where it’s going off',             desc: "A weather-map of estimated crowds: red = packed headliners, blue = quiet. Slide the time scrubber to watch the crowd shift through the night." },
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
    layerMetro: '🚇 地铁 / RER',
    layerToilets: '🚻 厕所',
    layerFountains: '🚰 饮水处',
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
    navCarte: '地图', navAffluence: '人流', navProgramme: '节目', navAutour: '附近', navMaSoiree: '我的夜晚',
    affTitle: '预计人流',
    affSubtitle: '哪里最火爆',
    affExplainer: '根据演出阵容的知名度估算，并非真实人流统计。',
    affLegendLow: '冷清',
    affLegendHigh: '爆满',
    affLoading: '地图加载中…',
    autourTitle: '附近', autourGeoOn: '位置已开启', autourGeoOff: '位置未开启',
    autourBientotBadge: (n) => `${n} 即将开始`,
    autourSectionPreFestival: '6月21日上街', autourSectionBientot: '即将开始',
    autourPreFestivalBanner: (days) => `音乐节还有 ${days} 天 — 以下是离你最近的演出。`,
    autourNoGenre: '未来90分钟内没有该风格的演出。', autourNone: '附近暂无即将开始的演出。',
    autourGeoTitle: '开启位置', autourGeoDesc: '查看附近演出并计算步行时间', autourGeoBtn: '开启位置',
    autourClearFilters: '清除筛选', autourDebutLabel: '开始', autourDateLabel: '6月21日',
    progDateline: '周日 6月21日 · 夏至', progTitle: '最长的音乐之夜', progLoading: '加载节目中…',
    progNow: '● 现在', progConflict: (n) => `${n} 场演出同时进行`,
    progSunsetTitle: '日落时间：21:58', progSunsetSub: '派对持续到黎明',
    decLoading: '加载演出中…', decAllSeen: '你已看完所有演出！',
    decShortlist: (n) => `你的候选列表中有 ${n} 场演出。`,
    decNoFavs: '暂无收藏 — 重新开始保存喜欢的演出。',
    decRestart: '重新开始', decSeeEvening: '查看我的夜晚', decTitle: '发现',
    decRemaining: (n) => `滑动 · 剩余 ${n} 场`,
    decToastAdded: '已加入我的夜晚', decKept: '已保留', decPassed: '已跳过',
    decSoonBadge: (n) => `${n} 分钟后开始`,
    soireeEmpty: '你的夜晚还是空的', soireeEmptyDesc: '在发现页面收藏演出，规划你的路线。',
    soireeDiscoverBtn: '发现演出', soireeDateline: '你的路线 · 6月21日', soireeTitle: '我的夜晚',
    soireeShareLabel: '分享', soireeConcerts: () => '场演出',
    soireeDistance: '步行', soireeDuration: '时长', soireeRemove: '移除',
    soireeWalk: (n) => `步行 ${n} 分钟`, soireeAdd: '添加演出…', soireeLaunch: '开始导航',
    onboarding: {
      skip: '跳过',
      next: '下一步',
      start: '出发！🎵',
      slides: [
        { tab: '📍 地图',          title: '地图上的所有演出',    desc: '6月21日巴黎共182场演出。按风格或时间筛选，点击标记查看详情。' },
        { tab: '🔥 人流',          title: '哪里最火爆',          desc: '气象图式的预计人流：红色＝大牌爆满，蓝色＝冷清。拖动时间滑块，观察人流在夜里的移动。' },
        { tab: '⏱ 节目 · 🎯 附近', title: '时间轴与附近演出',   desc: '节目单 = 按小时列出所有演出。附近 = 步行15分钟内的演出。' },
        { tab: '❤️ 我的夜晚',      title: '你的喜欢 = 你的行程', desc: '每场保存的演出都会加入「我的夜晚」。按时间排序的路线，含各站步行时间。' },
      ],
    },
  },
}
