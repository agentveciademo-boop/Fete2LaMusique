export type Genre =
  | 'jazz' | 'rock' | 'classique' | 'electro'
  | 'folk' | 'rap' | 'variete' | 'world' | 'autres'

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
  genres: Genre[]
  is_outdoor: boolean | null
  price_type: PriceType
  price_detail: string | null
  description: string
  image_url: string | null
}
