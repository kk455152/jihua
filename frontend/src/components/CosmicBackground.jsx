import { useEffect, useMemo, useRef } from 'react'

// 30 颗完全静态的背景星点 + 6 颗慢速闪烁的"主英雄"星点
function makeStaticStars(count, sizeRange) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `s-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
    })
  }
  return arr
}
function makeHeroStars(count) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `h-${i}`,
      x: 8 + Math.random() * 84,
      y: 8 + Math.random() * 84,
      size: 2.4 + Math.random() * 1.2,
      delay: Math.random() * 6,
    })
  }
  return arr
}

export default function CosmicBackground() {
  const staticStars = useMemo(() => makeStaticStars(30, [0.8, 1.6]), [])
  const heroStars = useMemo(() => makeHeroStars(6), [])

  // 鼠标跟随光晕（保留：低成本、用户决定保留）
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
      {/* 基础宇宙渐变背景（静态） */}
      <div className="absolute inset-0 cosmic-bg" />

      {/* 漂浮星云 - 保留，因为用户选择不调整 */}
      <div className="absolute inset-0 nebula-drift-a" />
      <div className="absolute inset-0 nebula-drift-b" />

      {/* 静态星点 — 完全无动画，纯渲染开销 */}
      <div className="absolute inset-0">
        {staticStars.map((s) => (
          <span
            key={s.id}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              borderRadius: '999px',
              background: '#e0e7ff',
              opacity: 0.55,
            }}
          />
        ))}
        {/* 英雄星：6 颗主要星点慢闪，节奏 6s */}
        {heroStars.map((s) => (
          <span
            key={s.id}
            className="hero-twinkle"
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              borderRadius: '999px',
              background: '#ffffff',
              boxShadow: '0 0 3px #ffffff',
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* 鼠标跟随光晕（保留） */}
      <div ref={haloRef} className="absolute inset-0 cosmic-cursor-halo" />
    </div>
  )
}
