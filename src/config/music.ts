/** Categorias do Toca Aí. "Todas" usa o top 1.000 inteiro; as outras dependem do gênero informado pela Apple. */
export interface MusicCategory {
  id: string
  name: string
  /** null = todas as músicas */
  cat: string | null
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  { id: 'todas', name: 'Todas', cat: null },
  { id: 'pop', name: 'Pop', cat: 'pop' },
  { id: 'hiphop', name: 'Hip Hop', cat: 'hiphop' },
  { id: 'rock', name: 'Rock', cat: 'rock' },
]

/** Uma categoria só aparece se tiver músicas suficientes para um mês sem repetir. */
export const MIN_SONGS_PER_CATEGORY = 30

export interface Song {
  id: string
  rank: number
  artist: string
  title: string
  streams: number
  /** ID da faixa no catálogo da Apple (prévia de áudio). null = sem prévia. */
  appleId: number | null
  genre: string | null
  year: number | null
  cat: string | null
}

export const songLabel = (s: Song) => `${s.artist} – ${s.title}`
