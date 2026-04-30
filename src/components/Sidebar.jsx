import {
  Circle,
  Download,
  Hand,
  MousePointer2,
  Ruler,
  Shield,
  Triangle
} from "lucide-react";

const tools = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "node", label: "Node", icon: Circle },
  { id: "member", label: "Member", icon: Ruler },
  { id: "load", label: "Load", icon: Download },
  { id: "support", label: "Support", icon: Triangle },
  { id: "pan", label: "Pan", icon: Hand }
];

export function Sidebar({ activeTool, setActiveTool, supportType, setSupportType, loadDraft, setLoadDraft }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-white">
      <div className="border-b border-line px-4 py-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tools</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                title={tool.label}
                onClick={() => setActiveTool(tool.id)}
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded border text-xs font-medium transition ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-panel text-slate-700 hover:border-slate-400"
                }`}
              >
                <Icon size={18} />
                {tool.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Download size={16} />
            Load Input
          </div>
          <label className="text-xs font-medium text-slate-500">Magnitude (N)</label>
          <input
            type="number"
            value={loadDraft.magnitude}
            onChange={(event) => setLoadDraft((draft) => ({ ...draft, magnitude: Number(event.target.value) }))}
            className="mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
          />
          <label className="mt-3 block text-xs font-medium text-slate-500">Angle (deg)</label>
          <input
            type="number"
            value={loadDraft.angleDeg}
            onChange={(event) => setLoadDraft((draft) => ({ ...draft, angleDeg: Number(event.target.value) }))}
            className="mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
          />
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Shield size={16} />
            Support Type
          </div>
          <select
            value={supportType}
            onChange={(event) => setSupportType(event.target.value)}
            className="w-full rounded border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="pinned">Pinned</option>
            <option value="roller">Roller</option>
            <option value="fixed">Fixed</option>
          </select>
        </section>

        <section className="rounded border border-line bg-panel p-3 text-xs leading-5 text-slate-600">
          <p><strong>Select</strong>: drag nodes or inspect items.</p>
          <p><strong>Node</strong>: click empty canvas.</p>
          <p><strong>Member</strong>: click two nodes.</p>
          <p><strong>Load/Support</strong>: click a node.</p>
        </section>
      </div>
    </aside>
  );
}
