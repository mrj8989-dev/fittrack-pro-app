import { MUSCLE_LABEL } from '../lib/muscles'
import type { MuscleId } from '../lib/muscles'

// Figura estilizada en dos vistas. Cada zona muscular es una forma con su id;
// las partes neutras (cabeza, manos, rodillas...) solo dan contexto.

type Shape = { id: MuscleId; d?: string; ellipse?: [number, number, number, number]; rect?: [number, number, number, number, number] }

const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${200 - Number(x)} ${y}`)
const both = (id: MuscleId, d: string): Shape[] => [{ id, d }, { id, d: mirror(d) }]
const pair = (id: MuscleId, cx: number, cy: number, rx: number, ry: number): Shape[] => [
  { id, ellipse: [cx, cy, rx, ry] },
  { id, ellipse: [200 - cx, cy, rx, ry] },
]

const FRONT: Shape[] = [
  ...pair('shoulders', 66, 80, 15, 13),
  ...both('chest', 'M100 68 L76 71 Q66 84 72 101 Q86 109 100 105 Z'),
  ...both('obliques', 'M86 109 L75 106 Q70 132 76 160 L86 166 Z'),
  { id: 'abs', rect: [87, 108, 26, 58, 7] },
  ...pair('biceps', 56, 111, 9, 20),
  ...pair('forearms', 49, 154, 8, 21),
  ...pair('quads', 84, 233, 14, 40),
  ...both('adductors', 'M99 198 Q91 216 95 252 L100 252 Z'),
  ...pair('tibialis', 83, 318, 8, 28),
]

const BACK: Shape[] = [
  ...both('traps', 'M100 50 L80 70 L89 77 L100 116 Z'),
  ...pair('shoulders', 66, 81, 15, 13),
  ...both('lats', 'M89 79 L73 90 Q70 120 82 146 L98 148 L98 118 Z'),
  { id: 'lower-back', rect: [86, 146, 28, 22, 6] },
  ...pair('triceps', 56, 110, 9, 20),
  ...pair('forearms', 49, 154, 8, 21),
  ...pair('glutes', 88, 191, 14, 17),
  ...pair('hamstrings', 86, 245, 13, 36),
  ...pair('calves', 85, 309, 11, 27),
]

function Neutral({ back }: { back?: boolean }) {
  const fill = 'var(--body-base)'
  return (
    <g fill={fill}>
      <circle cx={100} cy={28} r={18} />
      <rect x={92} y={44} width={16} height={12} rx={4} />
      <circle cx={46} cy={185} r={7} />
      <circle cx={154} cy={185} r={7} />
      {!back && <path d="M76 164 L124 164 L120 188 L100 198 L80 188 Z" />}
      <circle cx={84} cy={279} r={8} />
      <circle cx={116} cy={279} r={8} />
      {back && <>
        <ellipse cx={84} cy={330} rx={8} ry={14} />
        <ellipse cx={116} cy={330} rx={8} ry={14} />
      </>}
      <ellipse cx={83} cy={354} rx={10} ry={6} />
      <ellipse cx={117} cy={354} rx={10} ry={6} />
    </g>
  )
}

function Figure({ shapes, back, primary, secondary, onSelect, label }: {
  shapes: Shape[]
  back?: boolean
  primary: Set<MuscleId>
  secondary: Set<MuscleId>
  onSelect?: (m: MuscleId) => void
  label: string
}) {
  return (
    <figure style={{ margin: 0, flex: 1, minWidth: 0, textAlign: 'center' }}>
      <svg viewBox="20 0 160 370" className="body-map" role="img" aria-label={`Vista ${label.toLowerCase()}`}>
        <Neutral back={back} />
        {shapes.map((s, i) => {
          const state = primary.has(s.id) ? 'primary' : secondary.has(s.id) ? 'secondary' : 'idle'
          const common = {
            className: `muscle ${state}${onSelect ? ' selectable' : ''}`,
            onClick: onSelect ? () => onSelect(s.id) : undefined,
          }
          const title = <title>{MUSCLE_LABEL[s.id]}</title>
          if (s.ellipse) return <ellipse key={i} cx={s.ellipse[0]} cy={s.ellipse[1]} rx={s.ellipse[2]} ry={s.ellipse[3]} {...common}>{title}</ellipse>
          if (s.rect) return <rect key={i} x={s.rect[0]} y={s.rect[1]} width={s.rect[2]} height={s.rect[3]} rx={s.rect[4]} {...common}>{title}</rect>
          return <path key={i} d={s.d} {...common}>{title}</path>
        })}
      </svg>
      <figcaption style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        {label}
      </figcaption>
    </figure>
  )
}

export default function BodyMap({ primary = [], secondary = [], onSelect, height = 300 }: {
  primary?: MuscleId[]
  secondary?: MuscleId[]
  onSelect?: (m: MuscleId) => void
  height?: number
}) {
  const p = new Set(primary)
  const s = new Set(secondary.filter(m => !p.has(m)))
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', height }}>
      <Figure shapes={FRONT} primary={p} secondary={s} onSelect={onSelect} label="Frontal" />
      <Figure shapes={BACK} back primary={p} secondary={s} onSelect={onSelect} label="Posterior" />
    </div>
  )
}
