import { Eraser, FileUp, Play, Save, Upload } from "lucide-react";

export function TopBar({
  runAnalysis,
  reset,
  saveJson,
  loadJson,
  exportCsv,
  exportPdf,
  analysisEnabled,
  error
}) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-line bg-white px-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Interactive Truss System Builder & Analyzer</h1>
        <p className="text-xs text-slate-500">2D finite element truss analysis with stiffness matrix assembly</p>
      </div>
      <div className="flex items-center gap-2">
        {error ? <span className="max-w-80 truncate text-xs font-medium text-rose-600">{error}</span> : null}
        <button
          onClick={runAnalysis}
          className="inline-flex items-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <Play size={16} />
          Run
        </button>
        <button onClick={reset} className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm">
          <Eraser size={16} />
          Clear
        </button>
        <button onClick={saveJson} className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm">
          <Save size={16} />
          JSON
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-line px-3 py-2 text-sm">
          <Upload size={16} />
          Load
          <input type="file" accept="application/json" className="hidden" onChange={loadJson} />
        </label>
        <button
          onClick={exportCsv}
          disabled={!analysisEnabled}
          className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm disabled:opacity-40"
        >
          <FileUp size={16} />
          CSV
        </button>
        <button
          onClick={exportPdf}
          disabled={!analysisEnabled}
          className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-sm disabled:opacity-40"
        >
          <FileUp size={16} />
          PDF
        </button>
      </div>
    </header>
  );
}

