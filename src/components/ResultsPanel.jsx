import { Ruler, Scale3d, ShieldCheck } from "lucide-react";
import { formatEngineering } from "../engine/stiffnessSolver";

export function ResultsPanel({ results, selectedMemberId, selectedNodeId }) {
  const selectedMember = results?.memberResults.find((member) => member.memberId === selectedMemberId);
  const selectedNode = results?.nodeResults.find((node) => node.nodeId === selectedNodeId);

  return (
    <section className="bg-white">
      <div className="border-b border-line p-4">
        <h2 className="text-sm font-semibold text-ink">Analysis Results</h2>
        {!results ? (
          <p className="mt-2 text-sm text-slate-500">Run analysis to compute member forces, stress, reactions, and safety factors.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric icon={Ruler} label="Members" value={String(results.memberResults.length)} />
            <Metric icon={ShieldCheck} label="Status" value={results.memberResults.some((member) => member.failed) ? "Check" : "OK"} danger={results.memberResults.some((member) => member.failed)} />
            <Metric icon={Scale3d} label="Mass" value={formatEngineering(results.totalMass, "kg")} />
          </div>
        )}
      </div>

      {results ? (
        <div className="p-4">
          {selectedMember ? (
            <SelectedCard title={`Selected ${selectedMember.label}`}>
              <ResultRow label="Mode" value={selectedMember.mode} tone={selectedMember.mode === "zero force member" ? "success" : undefined} />
              <ResultRow label="Force" value={formatEngineering(selectedMember.force, "N")} />
              <ResultRow label="Stress" value={formatEngineering(selectedMember.stress, "Pa")} />
              <ResultRow label="Length" value={formatMeters(selectedMember.length)} />
            </SelectedCard>
          ) : null}

          {selectedNode ? (
            <SelectedCard title={`Selected ${selectedNode.label}`}>
              <ResultRow label="Rx" value={formatEngineering(selectedNode.rx, "N")} />
              <ResultRow label="Ry" value={formatEngineering(selectedNode.ry, "N")} />
            </SelectedCard>
          ) : null}

          <h3 className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Members</h3>
          <div className="space-y-2">
            {results.memberResults.map((member) => (
              <div key={member.memberId} className={`rounded border p-3 text-sm ${member.failed ? "border-rose-300 bg-rose-50" : "border-line bg-panel"}`}>
                <div className="flex items-center justify-between font-semibold">
                  <span>{member.label}</span>
                  <span className={modeClass(member.mode)}>{member.mode}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <ResultRow label="F" value={formatEngineering(member.force, "N")} />
                  <ResultRow label="stress" value={formatEngineering(member.stress, "Pa")} />
                  <ResultRow label="L" value={formatMeters(member.length)} />
                  <ResultRow label="Area" value={`${member.area.toPrecision(3)} m^2`} />
                </div>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Nodes</h3>
          <div className="space-y-2">
            {results.nodeResults.map((node) => (
              <div key={node.nodeId} className="rounded border border-line bg-panel p-3 text-xs text-slate-600">
                <div className="mb-1 font-semibold text-ink">{node.label}</div>
                <ResultRow label="R" value={`${formatEngineering(node.rx, "N")}, ${formatEngineering(node.ry, "N")}`} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ icon: Icon, label, value, danger }) {
  return (
    <div className={`rounded border p-2 ${danger ? "border-rose-300 bg-rose-50" : "border-line bg-panel"}`}>
      <Icon size={15} className={danger ? "text-rose-600" : "text-slate-500"} />
      <div className="mt-1 text-[11px] font-medium text-slate-500">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function SelectedCard({ title, children }) {
  return (
    <section className="mb-4 rounded border border-ink bg-white p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">{children}</div>
    </section>
  );
}

function modeClass(mode) {
  if (mode === "zero force member") return "text-green-600";
  if (mode === "tension") return "text-rose-600";
  return "text-blue-600";
}

function formatMeters(value) {
  return `${Number(value).toFixed(3)} m`;
}

function ResultRow({ label, value, danger, tone }) {
  const toneClass = tone === "success" ? "text-green-700" : danger ? "text-rose-700" : "text-ink";
  return (
    <>
      <span className="text-slate-500">{label}</span>
      <span className={`text-right font-medium ${toneClass}`}>{value}</span>
    </>
  );
}
