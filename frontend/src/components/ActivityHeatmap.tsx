import { useMemo, useState, useCallback } from 'react'
import { Flame, Calendar, Clock, TrendingUp, ChevronDown } from 'lucide-react'
import type { TranscriptSession } from '../types'
import { useUIStore } from '../stores/uiStore'
import type { Translations } from '../i18n'

interface ActivityHeatmapProps {
  sessions: TranscriptSession[]
  onDateClick?: (date: string) => void
  activeDate?: string | null
}

interface DayData {
  date: string
  count: number
  duration: number
}

type TimeRange = '1w' | '1m' | '6m' | '1y'

const RANGE_WEEKS: Record<TimeRange, number> = {
  '1w': 1,
  '1m': 5,
  '6m': 26,
  '1y': 53,
}

const DAYS_PER_WEEK = 7
const HEATMAP_RANGE_KEY = 'heatmap-range'

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getLevel(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

const HEATMAP_COLLAPSED_KEY = 'heatmap-collapsed'

export function ActivityHeatmap({ sessions, onDateClick, activeDate }: ActivityHeatmapProps) {
  const { language, t } = useUIStore()
  const hm = (t as Translations).heatmap
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: DayData } | null>(null)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(HEATMAP_COLLAPSED_KEY) === 'true')
  const [range, setRange] = useState<TimeRange>(() => (localStorage.getItem(HEATMAP_RANGE_KEY) as TimeRange) || '1y')

  const handleRangeChange = useCallback((r: TimeRange) => {
    setRange(r)
    localStorage.setItem(HEATMAP_RANGE_KEY, r)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(HEATMAP_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  const dailyMap = useMemo(() => {
    const map = new Map<string, { count: number; duration: number }>()
    for (const s of sessions) {
      const entry = map.get(s.date) || { count: 0, duration: 0 }
      entry.count++
      entry.duration += s.duration || 0
      map.set(s.date, entry)
    }
    return map
  }, [sessions])

  const weeks = RANGE_WEEKS[range]

  const { grid, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = toDateStr(today)

    const endOfLastWeek = new Date(today)
    endOfLastWeek.setDate(today.getDate() + (6 - today.getDay()))

    const startDate = new Date(endOfLastWeek)
    startDate.setDate(endOfLastWeek.getDate() - (weeks * 7 - 1))

    const cells: DayData[][] = []
    const months: { label: string; col: number }[] = []
    const monthNames = language === 'zh'
      ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    let lastMonth = -1
    const cursor = new Date(startDate)

    for (let week = 0; week < weeks; week++) {
      const col: DayData[] = []
      for (let day = 0; day < DAYS_PER_WEEK; day++) {
        const dateStr = toDateStr(cursor)
        const isFuture = dateStr > todayStr
        const stats = dailyMap.get(dateStr)
        col.push({
          date: dateStr,
          count: isFuture ? -1 : (stats?.count || 0),
          duration: isFuture ? 0 : (stats?.duration || 0),
        })

        if (day === 0 && cursor.getMonth() !== lastMonth) {
          lastMonth = cursor.getMonth()
          months.push({ label: monthNames[lastMonth], col: week })
        }

        cursor.setDate(cursor.getDate() + 1)
      }
      cells.push(col)
    }

    return { grid: cells, monthLabels: months }
  }, [dailyMap, language, weeks])

  const summary = useMemo(() => {
    const now = new Date()
    const thisMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    let totalCount = 0
    let totalDuration = 0
    let thisMonthCount = 0

    for (const [date, stats] of dailyMap) {
      totalCount += stats.count
      totalDuration += stats.duration
      if (date.startsWith(thisMonthStr)) {
        thisMonthCount += stats.count
      }
    }

    let streak = 0
    const check = new Date(now)
    check.setHours(0, 0, 0, 0)
    while (true) {
      const ds = toDateStr(check)
      if (dailyMap.has(ds)) {
        streak++
        check.setDate(check.getDate() - 1)
      } else {
        break
      }
    }

    return { totalCount, totalDuration, thisMonthCount, streak }
  }, [dailyMap])

  const handleMouseEnter = useCallback((e: React.MouseEvent, data: DayData) => {
    if (data.count < 0) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const parent = (e.target as HTMLElement).closest('[data-heatmap]')?.getBoundingClientRect()
    if (!parent) return
    setTooltip({
      x: rect.left - parent.left + rect.width / 2,
      y: rect.top - parent.top - 16,
      data,
    })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const dayLabels = ['', hm?.dayMon || 'Mon', '', hm?.dayWed || 'Wed', '', hm?.dayFri || 'Fri', '']

  const copy = {
    title: hm?.title || 'Activity Overview',
    total: hm?.total || 'Total',
    thisMonth: hm?.thisMonth || 'This month',
    streak: hm?.streak || 'Streak',
    totalDuration: hm?.totalDuration || 'Duration',
    days: hm?.days || 'days',
    less: hm?.less || 'Less',
    more: hm?.more || 'More',
    noRecordings: hm?.noRecordings || 'No recordings',
    recording: hm?.recording || 'recordings',
  }

  const levelClasses = [
    'bg-muted/60 dark:bg-muted/30',
    'bg-primary/20 dark:bg-primary/25',
    'bg-primary/40 dark:bg-primary/45',
    'bg-primary/65 dark:bg-primary/60',
    'bg-primary dark:bg-primary/85',
  ]

  return (
    <div className="workspace-panel p-5 space-y-4" data-heatmap>
      {/* Header + summary stats — clickable to toggle collapse */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
        aria-expanded={!collapsed}
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          {copy.title}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            {copy.total} <strong className="text-foreground">{summary.totalCount}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {copy.thisMonth} <strong className="text-foreground">{summary.thisMonthCount}</strong>
          </span>
          {summary.totalDuration > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {copy.totalDuration} <strong className="text-foreground">{formatDuration(summary.totalDuration)}</strong>
            </span>
          )}
          {summary.streak > 0 && (
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              {copy.streak} <strong className="text-foreground">{summary.streak}</strong> {copy.days}
            </span>
          )}
        </div>
      </button>

      {/* Time range selector */}
      {!collapsed && (
        <div className="flex items-center gap-1">
          {([
            { key: '1w' as TimeRange, label: language === 'zh' ? '1周' : '1W' },
            { key: '1m' as TimeRange, label: language === 'zh' ? '1月' : '1M' },
            { key: '6m' as TimeRange, label: language === 'zh' ? '6月' : '6M' },
            { key: '1y' as TimeRange, label: language === 'zh' ? '1年' : '1Y' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleRangeChange(key)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                range === key
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Heatmap grid — collapsible */}
      {!collapsed && <div className="relative overflow-x-auto">
        <div
          className="grid gap-[2px] w-fit"
          style={{
            gridTemplateColumns: `20px repeat(${weeks}, 12px)`,
            gridTemplateRows: `14px repeat(${DAYS_PER_WEEK}, 12px)`,
          }}
        >
          {/* Top-left corner spacer */}
          <div />
          {/* Month labels row */}
          {grid.map((_, weekIdx) => {
            const monthLabel = monthLabels.find((m) => m.col === weekIdx)
            return (
              <div key={`m-${weekIdx}`} className="text-[10px] leading-[14px] text-muted-foreground/70 truncate">
                {monthLabel?.label || ''}
              </div>
            )
          })}

          {/* Day rows: label + cells */}
          {Array.from({ length: DAYS_PER_WEEK }).map((_, dayIdx) => (
            <>
              <div key={`dl-${dayIdx}`} className="text-[10px] leading-none text-muted-foreground/70 text-right pr-1 flex items-center justify-end">
                {dayLabels[dayIdx]}
              </div>
              {grid.map((week, weekIdx) => {
                const cell = week[dayIdx]
                if (cell.count < 0) {
                  return <div key={`c-${weekIdx}-${dayIdx}`} />
                }
                const level = getLevel(cell.count)
                const isActive = activeDate === cell.date
                return (
                  <div
                    key={`c-${weekIdx}-${dayIdx}`}
                    className={`rounded-[3px] cursor-pointer transition-all duration-100 ${levelClasses[level]} ${
                      isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'hover:ring-1 hover:ring-foreground/20'
                    }`}
                    onClick={() => onDateClick?.(cell.date)}
                    onMouseEnter={(e) => handleMouseEnter(e, cell)}
                    onMouseLeave={handleMouseLeave}
                  />
                )
              })}
            </>
          ))}
        </div>

        {/* Tooltip — positioned above cell with caret */}
        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none -translate-x-1/2"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md mb-1.5">
              <p className="font-medium text-foreground">{tooltip.data.date}</p>
              <p className="text-muted-foreground whitespace-nowrap">
                {tooltip.data.count === 0
                  ? copy.noRecordings
                  : `${tooltip.data.count} ${copy.recording}${tooltip.data.duration > 0 ? ` · ${formatDuration(tooltip.data.duration)}` : ''}`}
              </p>
            </div>
            <div className="flex justify-center -mt-1.5">
              <div className="w-2 h-2 rotate-45 bg-popover border-r border-b border-border" />
            </div>
          </div>
        )}
      </div>}

      {/* Legend */}
      {!collapsed && (
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground/70">
          <span>{copy.less}</span>
          {levelClasses.map((cls, i) => (
            <div key={i} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
          ))}
          <span>{copy.more}</span>
        </div>
      )}
    </div>
  )
}
