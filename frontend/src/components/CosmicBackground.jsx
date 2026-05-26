import { useEffect, useMemo, useRef } from 'react'

const STAR_CLASSES = ['star-white', 'star-white', 'star-white', 'star-blue', 'star-yellow', 'star-red']

function makeFieldStars(count, sizeRange) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `f-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      cls: STAR_CLASSES[Math.floor(Math.random() * STAR_CLASSES.length)],
      opacity: 0.45 + Math.random() * 0.45,
    })
  }
  return arr
}

function makeMicroStars(count) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `m-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
    })
  }
  return arr
}

function makeHeroStars(count) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `h-${i}`,
      x: 12 + Math.random() * 76,
      y: 12 + Math.random() * 76,
      size: 2.4 + Math.random() * 1.4,
      cls: STAR_CLASSES[Math.floor(Math.random() * STAR_CLASSES.length)],
      delay: Math.random() * 6,
    })
  }
  return arr
}

const FLARE_STARS = [
  { id: 'lf-0', x: 22, y: 24, color: 'lens-flare-blue', size: 90, delay: 0 },
  { id: 'lf-1', x: 74, y: 64, color: '', size: 70, delay: 2.5 },
  { id: 'lf-2', x: 58, y: 16, color: 'lens-flare-red', size: 60, delay: 5 },
]

export default function CosmicBackground() {
  const fieldStars = useMemo(() => makeFieldStars(40, [0.7, 1.6]), [])
  const microStars = useMemo(() => makeMicroStars(80), [])
  const heroStars = useMemo(() => makeHeroStars(7), [])

  const haloRef = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = haloRef.current
    if (!el) return
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        el.style.setProperty('--mx', `${x}%`)
        el.style.setProperty('--my', `${y}%`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none" aria-hidden="true">
      {/* Deep void + galactic core warmth + emission-line nebulae */}
      <div className="absolute inset-0 cosmic-bg" />

      {/* Drifting colored gas veils (H-alpha + O III) */}
      <div className="absolute inset-0 nebula-drift-a" />
      <div className="absolute inset-0 nebula-drift-b" />

      {/* Distant galaxy micro-stars (sub-pixel sand) */}
      <div className="absolute inset-0">
        {microStars.map((s) => (
          <span
            key={s.id}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: 1,
              height: 1,
              borderRadius: '999px',
              background: 'rgba(220, 230, 255, 0.55)',
            }}
          />
        ))}
      </div>

      {/* Field stars with chromatic glow per stellar class */}
      <div className="absolute inset-0">
        {fieldStars.map((s) => (
          <span
            key={s.id}
            className={s.cls}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              borderRadius: '999px',
              opacity: s.opacity,
            }}
          />
        ))}
        {/* Hero stars: 7 brightest twinkle slowly */}
        {heroStars.map((s) => (
          <span
            key={s.id}
            className={`${s.cls} hero-twinkle`}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              borderRadius: '999px',
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Dust lanes — opaque organic bands obscuring the bright nebula behind */}
      <div className="absolute inset-0 dust-lanes" />

      {/* Lens flare diffraction spikes — Hubble/JWST signature on bright stars */}
      {FLARE_STARS.map((f) => (
        <div
          key={f.id}
          className={`lens-flare ${f.color}`}
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.size,
            height: f.size,
            animationDelay: `${f.delay}s`,
          }}
        />
      ))}

      {/* Mouse-follow halo */}
      <div ref={haloRef} className="absolute inset-0 cosmic-cursor-halo" />
    </div>
  )
}
