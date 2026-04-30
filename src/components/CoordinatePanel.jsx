import { useEffect, useState } from "react";
import { Link, LocateFixed, Plus, Trash2 } from "lucide-react";
import { canvasToWorld, formatCoord, worldToCanvas } from "../utils/coordinates";

export function CoordinatePanel({
  nodes,
  members,
  loads,
  supports,
  materials,
  selectedObjects,
  selectedNodeId,
  selectedMemberId,
  selectionCount,
  selectedMaterialId,
  selectedArea,
  loadDraft,
  supportType,
  addNodeByCoordinate,
  addMemberBetween,
  updateNode,
  updateMember,
  deleteNode,
  deleteMember,
  deleteLoad,
  deleteSupport,
  deleteSelected,
  addLoadToNode,
  addSupportToNode,
  setSelectedNodeId,
  setSelectedMemberId,
  setSelectedMaterialId,
  setSelectedArea
}) {
  const [newNode, setNewNode] = useState({ x: 0, y: 0 });
  const [memberDraft, setMemberDraft] = useState({ startNodeId: "", endNodeId: "" });
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const nodeLabel = (nodeId) => nodes.find((node) => node.id === nodeId)?.label ?? nodeId;

  useEffect(() => {
    setMemberDraft((draft) => {
      const startNodeId = nodes.some((node) => node.id === draft.startNodeId)
        ? draft.startNodeId
        : nodes[0]?.id ?? "";
      const endNodeId =
        nodes.some((node) => node.id === draft.endNodeId && node.id !== startNodeId)
          ? draft.endNodeId
          : nodes.find((node) => node.id !== startNodeId)?.id ?? "";
      return startNodeId === draft.startNodeId && endNodeId === draft.endNodeId
        ? draft
        : { startNodeId, endNodeId };
    });
  }, [nodes]);

  const handleNodeCoordinate = (axis, value) => {
    if (!selectedNode || !Number.isFinite(value)) return;
    const current = canvasToWorld(selectedNode);
    const next = worldToCanvas({ ...current, [axis]: value });
    updateNode(selectedNode.id, next);
  };

  return (
    <section className="border-b border-line bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <LocateFixed size={16} />
        <h2 className="text-sm font-semibold text-ink">Coordinate Builder</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CoordinateInput label="New X (m)" value={newNode.x} onChange={(value) => setNewNode((draft) => ({ ...draft, x: value }))} />
        <CoordinateInput label="New Y (m)" value={newNode.y} onChange={(value) => setNewNode((draft) => ({ ...draft, y: value }))} />
      </div>
      <button
        onClick={() => {
          addNodeByCoordinate(newNode);
        }}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        <Plus size={15} />
        Add Node at Coordinates
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <SelectBox label="Select Node" value={selectedNodeId ?? ""} onChange={(value) => {
          setSelectedNodeId(value || null);
        }}>
          <option value="">None</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>{node.label}</option>
          ))}
        </SelectBox>
        <SelectBox label="Select Member" value={selectedMemberId ?? ""} onChange={(value) => {
          const member = members.find((item) => item.id === value);
          setSelectedMemberId(value || null);
          if (member) {
            setSelectedMaterialId(member.materialId);
            setSelectedArea(member.area);
          }
        }}>
          <option value="">None</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.label}</option>
          ))}
        </SelectBox>
      </div>

      {selectionCount ? (
        <button
          onClick={deleteSelected}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
        >
          <Trash2 size={15} />
          Delete Selected ({selectionCount})
        </button>
      ) : null}

      {selectedNode ? (
        <div className="mt-3 rounded border border-ink bg-panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{selectedNode.label}</span>
            <button title="Delete node" onClick={() => deleteNode(selectedNode.id)} className="inline-flex h-8 w-8 items-center justify-center rounded border border-line bg-white">
              <Trash2 size={15} />
            </button>
          </div>
          <label className="text-xs font-medium text-slate-500">Label</label>
          <input
            value={selectedNode.label}
            onChange={(event) => updateNode(selectedNode.id, { label: event.target.value })}
            className="mt-1 w-full rounded border border-line bg-white px-2 py-1 text-sm"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumberBox
              label="X (m)"
              value={formatCoord(canvasToWorld(selectedNode).x)}
              onChange={(value) => handleNodeCoordinate("x", value)}
            />
            <NumberBox
              label="Y (m)"
              value={formatCoord(canvasToWorld(selectedNode).y)}
              onChange={(value) => handleNodeCoordinate("y", value)}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => addLoadToNode(selectedNode.id)} className="rounded border border-line bg-white px-2 py-2 text-xs font-semibold">
              Add Load ({loadDraft.magnitude} N)
            </button>
            <button onClick={() => addSupportToNode(selectedNode.id)} className="rounded border border-line bg-white px-2 py-2 text-xs font-semibold">
              Add {supportType} Support
            </button>
          </div>
        </div>
      ) : null}

      {selectedMember ? (
        <div className="mt-3 rounded border border-ink bg-panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{selectedMember.label}</span>
            <button title="Delete member" onClick={() => deleteMember(selectedMember.id)} className="inline-flex h-8 w-8 items-center justify-center rounded border border-line bg-white">
              <Trash2 size={15} />
            </button>
          </div>
          <label className="text-xs font-medium text-slate-500">Label</label>
          <input
            value={selectedMember.label}
            onChange={(event) => updateMember(selectedMember.id, { label: event.target.value })}
            className="mt-1 w-full rounded border border-line bg-white px-2 py-1 text-sm"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SelectBox label="Material" value={selectedMember.materialId} onChange={(value) => {
              setSelectedMaterialId(value);
              updateMember(selectedMember.id, { materialId: value });
            }}>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>{material.name}</option>
              ))}
            </SelectBox>
            <NumberBox label="Area (m^2)" value={selectedMember.area} onChange={(value) => {
              setSelectedArea(value);
              updateMember(selectedMember.id, { area: value });
            }} />
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded border border-line bg-panel p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Link size={15} />
          Add Member by Node IDs
        </div>
        <MemberCreator
          nodes={nodes}
          memberDraft={memberDraft}
          setMemberDraft={setMemberDraft}
          addMemberBetween={addMemberBetween}
          selectedMaterialId={selectedMaterialId}
          selectedArea={selectedArea}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ObjectList title="Loads">
          {loads.map((load) => (
            <ObjectRow
              key={load.id}
              selected={selectedObjects.loads.includes(load.id)}
              label={`${nodeLabel(load.nodeId)} | ${load.magnitude} N`}
              onDelete={() => deleteLoad(load.id)}
            />
          ))}
        </ObjectList>
        <ObjectList title="Supports">
          {supports.map((support) => (
            <ObjectRow
              key={support.id}
              selected={selectedObjects.supports.includes(support.id)}
              label={`${nodeLabel(support.nodeId)} | ${support.type}`}
              onDelete={() => deleteSupport(support.id)}
            />
          ))}
        </ObjectList>
      </div>
    </section>
  );
}

function CoordinateInput({ label, value, onChange }) {
  return (
    <label className="text-xs font-medium text-slate-500">
      {label}
      <input
        type="number"
        step="0.25"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded border border-line bg-white px-2 py-1 text-sm"
      />
    </label>
  );
}

function NumberBox({ label, value, onChange }) {
  return (
    <label className="text-xs font-medium text-slate-500">
      {label}
      <input
        type="number"
        step="0.25"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded border border-line bg-white px-2 py-1 text-sm"
      />
    </label>
  );
}

function SelectBox({ label, value, onChange, children }) {
  return (
    <label className="text-xs font-medium text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-line bg-white px-2 py-1 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function ObjectList({ title, children }) {
  return (
    <div className="rounded border border-line bg-panel p-2">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ObjectRow({ label, selected, onDelete }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs ${selected ? "border-ink bg-white" : "border-line bg-white"}`}>
      <span className="truncate">{label}</span>
      <button title="Delete" onClick={onDelete} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-rose-50">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function MemberCreator({ nodes, memberDraft, setMemberDraft, addMemberBetween, selectedMaterialId, selectedArea }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        value={memberDraft.startNodeId}
        onChange={(event) => setMemberDraft((draft) => ({ ...draft, startNodeId: event.target.value }))}
        className="rounded border border-line bg-white px-2 py-1 text-sm"
      >
        <option value="">Start</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>{node.label}</option>
        ))}
      </select>
      <select
        value={memberDraft.endNodeId}
        onChange={(event) => setMemberDraft((draft) => ({ ...draft, endNodeId: event.target.value }))}
        className="rounded border border-line bg-white px-2 py-1 text-sm"
      >
        <option value="">End</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>{node.label}</option>
        ))}
      </select>
      <button
        onClick={() => {
          addMemberBetween(memberDraft.startNodeId, memberDraft.endNodeId, selectedMaterialId, selectedArea);
        }}
        disabled={nodes.length < 2}
        className="col-span-2 inline-flex items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
      >
        Add Member
      </button>
    </div>
  );
}
