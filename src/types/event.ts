export type Genre =
  | 'jazz' | 'rock' | 'classique' | 'electro'
  | 'folk' | 'rap' | 'variete' | 'world'
  | 'pop' | 'soul-funk' | 'chorale' | 'reggae'
  | 'fanfare' | 'trad' | 'blues'
  | 'autres'

export type PriceType = 'free' | 'paid' | 'prix_libre' | 'unknown'

export type Event = {
  id: string
  title: string
  venue_name: string
  address: string
  arrondissement: number | null
  commune: string
  lat: number
  lng: number
  start_time: string
  end_time: string
  // Soirée bucket (YYYY-MM-DD). Provided by the ETL; derived on the fly in the frontend until then.
  session_date?: string
  // Data provenance. Absent in legacy mocks; always set by the ETL.
  source?: 'openagenda' | 'qfap' | 'both'
  source_url?: string | null
  // Réservation. Absent in legacy mocks; always set by the ETL.
  // requires_booking = OpenAgenda `conditions-de-participation` 31 ("Réservation obligatoire").
  // booking_url = lien de résa fourni par la source (Billetweb, HelloAsso, site du lieu…), sinon null.
  requires_booking?: boolean
  booking_url?: string | null
  genres: Genre[]
  subgenres: string[]
  is_outdoor: boolean | null
  price_type: PriceType
  price_detail: string | null
  description: string
  image_url: string | null
}
