import confetti from 'canvas-confetti'

/** Confete discreto na vitória. Não roda para quem prefere menos movimento. */
export function celebrate(): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  void confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.65 },
    colors: ['#ff7a3d', '#7b5cff', '#ffc93c', '#2bc9a1'],
    disableForReducedMotion: true,
  })
}
