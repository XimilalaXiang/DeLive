import { type ChangeEvent, type Ref } from 'react'
import { AlertCircle, Check, Download, Upload } from 'lucide-react'
import type { Translations } from '../../i18n'

interface ImportMessage {
  type: 'success' | 'error'
  text: string
}

interface DataManagementPanelProps {
  t: Translations
  handleExport: () => Promise<void>
  handleImportClick: () => void
  fileInputRef: Ref<HTMLInputElement>
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  importMessage: ImportMessage | null
  handleExportDiagnostics: () => Promise<void>
}

export function DataManagementPanel({
  t,
  handleExport,
  handleImportClick,
  fileInputRef,
  handleFileChange,
  importMessage,
  handleExportDiagnostics,
}: DataManagementPanelProps) {
  const hasElectronApi = !!window.electronAPI

  return (
    <div className="space-y-6">
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
          {t.settings.dataManagement}
        </label>
        <p className="text-xs text-muted-foreground">
          {t.settings.dataManagementDesc}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => void handleExport()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            {t.settings.exportData}
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t.settings.importData}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(event) => void handleFileChange(event)}
            className="hidden"
          />
        </div>

        {importMessage && (
          <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${
            importMessage.type === 'success'
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {importMessage.type === 'success' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {importMessage.text}
          </div>
        )}
      </section>

      {hasElectronApi && (
        <section className="workspace-panel-muted p-4 space-y-3">
          <label className="text-sm font-medium leading-none flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            {t.settings.diagnostics}
          </label>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">{t.settings.exportDiagnostics}</p>
              <p className="text-xs text-muted-foreground">{t.settings.exportDiagnosticsDesc}</p>
            </div>
            <button
              onClick={() => void handleExportDiagnostics()}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-4 h-4" />
              {t.settings.exportDiagnostics}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
