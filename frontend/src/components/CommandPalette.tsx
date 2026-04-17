import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { Search, Mic, FileText, FolderOpen, Monitor, Settings, Download } from 'lucide-react'
import { useUIStore, type WorkspaceView } from '../stores/uiStore'

interface Command {
  id: string
  label: string
  shortcut?: string
  icon: typeof Search
  action: () => void
}

export function CommandPalette() {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { t, setView, commandPaletteOpen: open, setCommandPaletteOpen: setOpen } = useUIStore()

  const commands = useMemo<Command[]>(() => [
    { id: 'nav-live', label: t.nav?.live || 'Live', shortcut: 'Ctrl+1', icon: Mic, action: () => setView('live' as WorkspaceView) },
    { id: 'nav-review', label: t.nav?.review || 'Review', shortcut: 'Ctrl+2', icon: FileText, action: () => setView('review' as WorkspaceView) },
    { id: 'nav-topics', label: t.nav?.topics || 'Topics', shortcut: 'Ctrl+3', icon: FolderOpen, action: () => setView('topics' as WorkspaceView) },
    { id: 'nav-caption', label: t.nav?.caption || 'Caption', icon: Monitor, action: () => {
      window.electronAPI?.captionToggle?.(undefined, 'command-palette')
    }},
    { id: 'nav-settings', label: t.nav?.settings || 'Settings', shortcut: 'Ctrl+,', icon: Settings, action: () => setView('settings' as WorkspaceView) },
    { id: 'export-data', label: t.command?.exportData || 'Export Data', icon: Download, action: () => {
      const btn = document.querySelector('[data-action="export-data"]') as HTMLButtonElement
      btn?.click()
    }},
  ], [t, setView])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) || cmd.id.includes(q),
    )
  }, [commands, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const execute = useCallback((cmd: Command) => {
    cmd.action()
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!useUIStore.getState().commandPaletteOpen)
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      execute(filtered[selectedIndex])
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => { setOpen(false); setQuery('') }}
    >
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.command?.searchPlaceholder || 'Type a command...'}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={cmd.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => execute(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-left">{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
