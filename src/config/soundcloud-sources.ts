/**
 * Playlists públicas do SoundCloud usadas pelos jogos de música. Foram encontradas por busca na web
 * (playlists de usuários, não oficiais) e são carregadas pelo widget oficial no navegador de quem joga.
 * Para trocar ou acrescentar, cole a URL da playlist (soundcloud.com/<usuário>/sets/<nome>) e confira
 * em /verificar-audio se ela carrega e quais faixas traz.
 */
export interface AudioCategory {
  id: string
  name: string
  playlists: { url: string; curator: string }[]
}

export const AUDIO_CATEGORIES: AudioCategory[] = [
  {
    id: 'sertanejo',
    name: 'Sertanejo',
    playlists: [
      { url: 'https://soundcloud.com/sertanejo-universitario-389319142/sets/top-sertanejo-universit-rio', curator: 'Sertanejo Universitário' },
      { url: 'https://soundcloud.com/sertanejo-universitario-389319142/sets/sertanejo-universitario', curator: 'Sertanejo Universitário' },
      { url: 'https://soundcloud.com/manodelima/sets/top-sertanejo-universitario', curator: 'Luís Otávio de Lima' },
      { url: 'https://soundcloud.com/contato-principal/sets/sertanejo-2021-melhor-da', curator: 'GMusic' },
    ],
  },
  {
    id: 'funk',
    name: 'Funk',
    playlists: [
      { url: 'https://soundcloud.com/gordaotrembala/sets/playlist-melhores-funk-2025', curator: 'MUSICAS DO TIKTOK OFICIAL' },
      { url: 'https://soundcloud.com/ferxxo-lgs/sets/funk-2025-brazilian-funk-music', curator: 'Ferxxoo' },
      { url: 'https://soundcloud.com/daermhon/sets/anitta-queen-of-brazilian-funk', curator: 'Daermhon' },
    ],
  },
  {
    id: 'rock',
    name: 'Rock nacional',
    playlists: [
      { url: 'https://soundcloud.com/patrick-luiz-146721434/sets/rock-nacional-brasileiro-1', curator: 'Patrick Luiz' },
      { url: 'https://soundcloud.com/storemusic-974485696/sets/o-melhor-do-pop-rock-nacional', curator: 'Storemusic' },
      { url: 'https://soundcloud.com/alan-wiliam-fragoso-boiago/sets/pop-rock-nacional', curator: 'ⒶⓌⒻⒷ' },
    ],
  },
  {
    id: 'mpb',
    name: 'MPB',
    playlists: [
      { url: 'https://soundcloud.com/pietro-llima/sets/o-melhor-da-mpb', curator: 'Pietro Llima' },
      { url: 'https://soundcloud.com/raissa-valente-staffuzza/sets/mpb-cl-ssicos', curator: 'Raissa Valente Staffuzza' },
      { url: 'https://soundcloud.com/gustavonascimento/sets/mpb-as-melhores-mpb-antigas-1', curator: 'gustavonascimento' },
    ],
  },
]
