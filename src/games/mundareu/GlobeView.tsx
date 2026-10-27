import { useEffect, useRef } from 'react'
import Globe, { type GlobeInstance } from 'globe.gl'
import type { Country } from './logic'

interface GlobeViewProps {
  countries: Country[]
  /** Cor de cada país já chutado (e dos territórios dele). */
  colors: Map<string, string>
  focus: Country | null
  dark: boolean
  showLabels: boolean
}

interface MaterialLike {
  color: { set: (c: string) => void }
}

export function GlobeView({ countries, colors, focus, dark, showLabels }: GlobeViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const globe = useRef<GlobeInstance | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const g = new Globe(el, { rendererConfig: { antialias: true, alpha: true } })
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereAltitude(0.12)
      .polygonsTransitionDuration(300)
      .polygonGeoJsonGeometry('geometry')
    g.controls().autoRotate = false
    g.pointOfView({ lat: -12, lng: -50, altitude: 2.4 }, 0)
    globe.current = g
    const resize = () => {
      g.width(el.clientWidth)
      g.height(el.clientHeight)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    return () => {
      ro.disconnect()
      g._destructor()
      el.innerHTML = ''
      globe.current = null
    }
  }, [])

  useEffect(() => {
    const g = globe.current
    if (!g) return
    ;(g.globeMaterial() as unknown as MaterialLike).color.set(dark ? '#1d2b45' : '#bfe3f5')
    g.atmosphereColor(dark ? '#6a7bd6' : '#9fd3f0')
    const land = dark ? '#3a3650' : '#f4efe4'
    g.polygonsData(countries)
      .polygonCapColor((d: object) => colors.get((d as Country).id) ?? land)
      .polygonSideColor(() => (dark ? 'rgba(0,0,0,0.25)' : 'rgba(30,27,46,0.15)'))
      .polygonStrokeColor(() => (dark ? '#5a5570' : '#b9b0a0'))
      .polygonAltitude((d: object) => (colors.has((d as Country).id) ? 0.014 : 0.005))
      .polygonLabel((d: object) => {
        const c = d as Country
        if (!showLabels && !colors.has(c.id)) return ''
        return `<div style="padding:4px 8px;border-radius:8px;background:#1e1b2e;color:#fff;font:600 13px Nunito Variable,sans-serif">${c.name}</div>`
      })
  }, [countries, colors, dark, showLabels])

  useEffect(() => {
    if (focus && globe.current) {
      globe.current.pointOfView({ lat: focus.label[1], lng: focus.label[0], altitude: 1.9 }, 900)
    }
  }, [focus])

  return (
    <div
      ref={ref}
      className="mx-auto aspect-square w-full max-w-[520px] cursor-grab touch-none overflow-hidden rounded-full active:cursor-grabbing"
      role="img"
      aria-label="Globo com os países chutados coloridos pela proximidade"
    />
  )
}
