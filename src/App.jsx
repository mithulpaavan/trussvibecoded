import { useEffect, useMemo, useState } from "react";
import { CoordinatePanel } from "./components/CoordinatePanel";
import { MaterialPanel } from "./components/MaterialPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { TrussCanvas } from "./components/Canvas";
import { defaultMaterials } from "./data/materials";
import { AnalysisError, analyzeTruss } from "./engine/stiffnessSolver";
import {
  exportDesignJson,
  exportResultsCsv,
  exportResultsPdf
} from "./utils/exporters";
import { nodeToAnalysisNode, snapWorldValue, worldToCanvas } from "./utils/coordinates";

const baseArea = 0.003;

const starterNodes = [
  { id: "n1", label: "N1", x: 150, y: 400 },
  { id: "n2", label: "N2", x: 350, y: 400 },
  { id: "n3", label: "N3", x: 250, y: 250 }
];

const starterMembers = [
  { id: "m1", label: "M1", startNodeId: "n1", endNodeId: "n2", materialId: "steel", area: baseArea },
  { id: "m2", label: "M2", startNodeId: "n1", endNodeId: "n3", materialId: "steel", area: baseArea },
  { id: "m3", label: "M3", startNodeId: "n2", endNodeId: "n3", materialId: "steel", area: baseArea }
];

const starterSupports = [
  { id: "s1", nodeId: "n1", type: "pinned" },
  { id: "s2", nodeId: "n2", type: "roller" }
];

const starterLoads = [{ id: "l1", nodeId: "n3", magnitude: 10000, angleDeg: -90 }];

const nextId = (prefix, items) => `${prefix}${items.length + 1 + Math.floor(Math.random() * 1000)}`;
const emptySelection = () => ({ nodes: [], members: [], loads: [], supports: [] });

function makeSnapshot({ nodes, members, loads, supports, materials }) {
  return { nodes, members, loads, supports, materials };
}

export default function App() {
  const [nodes, setNodes] = useState(starterNodes);
  const [members, setMembers] = useState(starterMembers);
  const [loads, setLoads] = useState(starterLoads);
  const [supports, setSupports] = useState(starterSupports);
  const [materials, setMaterials] = useState(defaultMaterials);
  const [activeTool, setActiveTool] = useState("select");
  const [selectedObjects, setSelectedObjects] = useState(emptySelection);
  const [memberStartNodeId, setMemberStartNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState("steel");
  const [selectedArea, setSelectedArea] = useState(baseArea);
  const [supportType, setSupportType] = useState("pinned");
  const [loadDraft, setLoadDraft] = useState({ magnitude: 5000, angleDeg: -90 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const deformationScale = useMemo(() => {
    if (!results?.maxDisplacement) return 1;
    return Math.min(60000, Math.max(1500, 65 / results.maxDisplacement));
  }, [results]);

  const clearAnalysis = () => {
    setResults(null);
    setError("");
  };

  const selectionCount = useMemo(
    () =>
      selectedObjects.nodes.length +
      selectedObjects.members.length +
      selectedObjects.loads.length +
      selectedObjects.supports.length,
    [selectedObjects]
  );

  const applySelection = (nextSelection) => {
    setSelectedObjects(nextSelection);
    const nodeId = nextSelection.nodes.at(-1) ?? null;
    const memberId = nextSelection.members.at(-1) ?? null;
    setSelectedNodeId(nodeId);
    setSelectedMemberId(memberId);
    if (memberId) {
      const member = members.find((item) => item.id === memberId);
      if (member) {
        setSelectedMaterialId(member.materialId);
        setSelectedArea(member.area);
      }
    }
  };

  const clearSelection = () => {
    applySelection(emptySelection());
  };

  const selectObject = (type, id, additive = false) => {
    if (!id) {
      clearSelection();
      return;
    }
    const next = additive
      ? {
          ...selectedObjects,
          [type]: selectedObjects[type].includes(id)
            ? selectedObjects[type].filter((item) => item !== id)
            : [...selectedObjects[type], id]
        }
      : { ...emptySelection(), [type]: [id] };
    applySelection(next);
  };

  const addNode = (point) => {
    const nodeId = nextId("n", nodes);
    setNodes((current) => [
      ...current,
      { id: nodeId, label: `N${current.length + 1}`, x: point.x, y: point.y }
    ]);
    applySelection({ ...emptySelection(), nodes: [nodeId] });
    clearAnalysis();
  };

  const addNodeByCoordinate = (point) => {
    const x = snapWorldValue(Number(point.x));
    const y = snapWorldValue(Number(point.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      setError("Node coordinates must be valid numbers.");
      return;
    }
    addNode(worldToCanvas({ x, y }));
    setActiveTool("select");
  };

  const addMemberBetween = (startNodeId, endNodeId, materialId = selectedMaterialId, area = selectedArea) => {
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) {
      setError("Choose two different nodes for the member.");
      return false;
    }
    const exists = members.some(
      (member) =>
        (member.startNodeId === startNodeId && member.endNodeId === endNodeId) ||
        (member.startNodeId === endNodeId && member.endNodeId === startNodeId)
    );
    if (!exists) {
      const memberId = nextId("m", members);
      setMembers((current) => [
        ...current,
        {
          id: memberId,
          label: `M${current.length + 1}`,
          startNodeId,
          endNodeId,
          materialId,
          area: Number(area) || baseArea
        }
      ]);
      applySelection({ ...emptySelection(), members: [memberId] });
      setActiveTool("select");
      clearAnalysis();
      return true;
    }
    setError("That member already exists.");
    return false;
  };

  const handleNodeClick = (nodeId) => {
    if (!memberStartNodeId) {
      setMemberStartNodeId(nodeId);
      return;
    }
    if (memberStartNodeId !== nodeId) {
      addMemberBetween(memberStartNodeId, nodeId);
    }
    setMemberStartNodeId(null);
  };

  const addLoadToNode = (nodeId) => {
    const loadId = nextId("l", loads);
    setLoads((current) => [
      ...current.filter((load) => load.nodeId !== nodeId),
      { id: loadId, nodeId, ...loadDraft }
    ]);
    applySelection({ ...emptySelection(), loads: [loadId] });
    clearAnalysis();
  };

  const addSupportToNode = (nodeId) => {
    const supportId = nextId("s", supports);
    setSupports((current) => [
      ...current.filter((support) => support.nodeId !== nodeId),
      { id: supportId, nodeId, type: supportType }
    ]);
    applySelection({ ...emptySelection(), supports: [supportId] });
    clearAnalysis();
  };

  const handleMemberClick = (memberId, additive = false) => {
    selectObject("members", memberId, additive);
    const member = members.find((item) => item.id === memberId);
    if (member) {
      setSelectedMaterialId(member.materialId);
      setSelectedArea(member.area);
    }
  };

  const updateSelectedMember = (updates) => {
    if (!selectedMemberId) return;
    updateMember(selectedMemberId, updates);
  };

  const updateNode = (nodeId, updates) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, ...updates } : node))
    );
    clearAnalysis();
  };

  const updateMember = (memberId, updates) => {
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, ...updates } : member))
    );
    clearAnalysis();
  };

  const deleteNode = (nodeId) => {
    const selectedMember = members.find((member) => member.id === selectedMemberId);
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setMembers((current) =>
      current.filter((member) => member.startNodeId !== nodeId && member.endNodeId !== nodeId)
    );
    setLoads((current) => current.filter((load) => load.nodeId !== nodeId));
    setSupports((current) => current.filter((support) => support.nodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (selectedMember?.startNodeId === nodeId || selectedMember?.endNodeId === nodeId) {
      setSelectedMemberId(null);
    }
    setMemberStartNodeId(null);
    setSelectedObjects((current) => ({
      nodes: current.nodes.filter((id) => id !== nodeId),
      members: current.members.filter((id) => {
        const member = members.find((item) => item.id === id);
        return member && member.startNodeId !== nodeId && member.endNodeId !== nodeId;
      }),
      loads: current.loads.filter((id) => loads.some((load) => load.id === id && load.nodeId !== nodeId)),
      supports: current.supports.filter((id) =>
        supports.some((support) => support.id === id && support.nodeId !== nodeId)
      )
    }));
    clearAnalysis();
  };

  const deleteMember = (memberId) => {
    setMembers((current) => current.filter((member) => member.id !== memberId));
    if (selectedMemberId === memberId) setSelectedMemberId(null);
    setSelectedObjects((current) => ({
      ...current,
      members: current.members.filter((id) => id !== memberId)
    }));
    clearAnalysis();
  };

  const deleteLoad = (loadId) => {
    setLoads((current) => current.filter((load) => load.id !== loadId));
    setSelectedObjects((current) => ({
      ...current,
      loads: current.loads.filter((id) => id !== loadId)
    }));
    clearAnalysis();
  };

  const deleteSupport = (supportId) => {
    setSupports((current) => current.filter((support) => support.id !== supportId));
    setSelectedObjects((current) => ({
      ...current,
      supports: current.supports.filter((id) => id !== supportId)
    }));
    clearAnalysis();
  };

  const deleteSelected = () => {
    if (!selectionCount) return;
    const nodeIds = new Set(selectedObjects.nodes);
    const memberIds = new Set(selectedObjects.members);
    const loadIds = new Set(selectedObjects.loads);
    const supportIds = new Set(selectedObjects.supports);

    setNodes((current) => current.filter((node) => !nodeIds.has(node.id)));
    setMembers((current) =>
      current.filter(
        (member) =>
          !memberIds.has(member.id) &&
          !nodeIds.has(member.startNodeId) &&
          !nodeIds.has(member.endNodeId)
      )
    );
    setLoads((current) => current.filter((load) => !loadIds.has(load.id) && !nodeIds.has(load.nodeId)));
    setSupports((current) =>
      current.filter((support) => !supportIds.has(support.id) && !nodeIds.has(support.nodeId))
    );
    setMemberStartNodeId(null);
    clearSelection();
    clearAnalysis();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected]);

  const runAnalysis = () => {
    try {
      const analysis = analyzeTruss({
        nodes: nodes.map(nodeToAnalysisNode),
        members,
        loads,
        supports,
        materials
      });
      setResults(analysis);
      setError("");
    } catch (caught) {
      setResults(null);
      setError(caught instanceof AnalysisError ? caught.message : "Analysis failed.");
    }
  };

  const reset = () => {
    setNodes([]);
    setMembers([]);
    setLoads([]);
    setSupports([]);
    setMemberStartNodeId(null);
    clearSelection();
    clearAnalysis();
  };

  const addCustomMaterial = () => {
    const name = window.prompt("Material name", "Custom");
    if (!name) return;
    const youngsModulus = Number(window.prompt("Young's Modulus, E (Pa)", "200000000000"));
    const yieldStrength = Number(window.prompt("Yield strength (Pa)", "250000000"));
    const density = Number(window.prompt("Density (kg/m^3)", "7850"));
    if (![youngsModulus, yieldStrength, density].every((value) => Number.isFinite(value) && value > 0)) {
      setError("Custom material values must be positive numbers.");
      return;
    }
    const material = {
      id: `custom-${Date.now()}`,
      name,
      youngsModulus,
      yieldStrength,
      density,
      color: "#0f766e"
    };
    setMaterials((current) => [...current, material]);
    setSelectedMaterialId(material.id);
  };

  const saveJson = () => {
    exportDesignJson(makeSnapshot({ nodes, members, loads, supports, materials }));
  };

  const loadJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      setNodes(Array.isArray(json.nodes) ? json.nodes : []);
      setMembers(Array.isArray(json.members) ? json.members : []);
      setLoads(Array.isArray(json.loads) ? json.loads : []);
      setSupports(Array.isArray(json.supports) ? json.supports : []);
      setMaterials(Array.isArray(json.materials) && json.materials.length ? json.materials : defaultMaterials);
      clearSelection();
      setMemberStartNodeId(null);
      clearAnalysis();
    } catch {
      setError("Could not load that JSON design.");
    } finally {
      event.target.value = "";
    }
  };

  const removeFailedMembers = () => {
    if (!results) return;
    const failedIds = new Set(results.memberResults.filter((member) => member.failed).map((member) => member.memberId));
    setMembers((current) => current.filter((member) => !failedIds.has(member.id)));
    clearAnalysis();
  };

  return (
    <div className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-panel">
      <TopBar
        runAnalysis={runAnalysis}
        reset={reset}
        saveJson={saveJson}
        loadJson={loadJson}
        exportCsv={() => exportResultsCsv(results)}
        exportPdf={() => exportResultsPdf(results)}
        analysisEnabled={Boolean(results)}
        error={error}
      />
      <main className="flex min-h-0 flex-1">
        <Sidebar
          activeTool={activeTool}
          setActiveTool={(tool) => {
            setActiveTool(tool);
            setMemberStartNodeId(null);
          }}
          supportType={supportType}
          setSupportType={setSupportType}
          loadDraft={loadDraft}
          setLoadDraft={setLoadDraft}
        />
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-line bg-white px-4 py-2">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{nodes.length} nodes</span>
              <span>{members.length} members</span>
              <span>{loads.length} loads</span>
              <span>{supports.length} supports</span>
              {selectionCount ? <span className="font-semibold text-ink">{selectionCount} selected</span> : null}
              {memberStartNodeId ? <span className="font-semibold text-ink">Pick second node for member</span> : null}
            </div>
            <div className="flex items-center gap-2">
              {selectionCount ? (
                <button onClick={deleteSelected} className="rounded border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Delete selected
                </button>
              ) : null}
              {selectedMemberId ? (
                <>
                  <select
                    value={selectedMaterialId}
                    onChange={(event) => {
                      setSelectedMaterialId(event.target.value);
                      updateSelectedMember({ materialId: event.target.value });
                    }}
                    className="rounded border border-line bg-white px-2 py-1 text-xs"
                  >
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>{material.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.0001"
                    value={selectedArea}
                    onChange={(event) => {
                      const area = Number(event.target.value);
                      setSelectedArea(area);
                      updateSelectedMember({ area });
                    }}
                    className="w-28 rounded border border-line bg-white px-2 py-1 text-xs"
                  />
                </>
              ) : null}
              {results?.memberResults.some((member) => member.failed) ? (
                <button onClick={removeFailedMembers} className="rounded border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Remove failed
                </button>
              ) : null}
            </div>
          </div>
          <TrussCanvas
            nodes={nodes}
            members={members}
            loads={loads}
            supports={supports}
            materials={materials}
            activeTool={activeTool}
            selectedNodeId={selectedNodeId}
            selectedMemberId={selectedMemberId}
            memberStartNodeId={memberStartNodeId}
            results={results}
            deformationScale={deformationScale}
            selectedObjects={selectedObjects}
            onSelectObject={selectObject}
            clearSelection={clearSelection}
            setNodes={(updater) => {
              setNodes(updater);
              clearAnalysis();
            }}
            onCanvasNode={addNode}
            onNodeClick={handleNodeClick}
            onMemberClick={handleMemberClick}
            onLoadNode={addLoadToNode}
            onSupportNode={addSupportToNode}
          />
        </section>
        <div className="flex min-h-0 w-[30rem] shrink-0 flex-col border-l border-line bg-white">
          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
            <CoordinatePanel
              nodes={nodes}
              members={members}
              loads={loads}
              supports={supports}
              materials={materials}
              selectedObjects={selectedObjects}
              selectedNodeId={selectedNodeId}
              selectedMemberId={selectedMemberId}
              selectionCount={selectionCount}
              selectedMaterialId={selectedMaterialId}
              selectedArea={selectedArea}
              loadDraft={loadDraft}
              supportType={supportType}
              addNodeByCoordinate={addNodeByCoordinate}
              addMemberBetween={addMemberBetween}
              updateNode={updateNode}
              updateMember={updateMember}
              deleteNode={deleteNode}
              deleteMember={deleteMember}
              deleteLoad={deleteLoad}
              deleteSupport={deleteSupport}
              deleteSelected={deleteSelected}
              addLoadToNode={addLoadToNode}
              addSupportToNode={addSupportToNode}
              setSelectedNodeId={(id) => (id ? selectObject("nodes", id) : clearSelection())}
              setSelectedMemberId={(id) => (id ? handleMemberClick(id) : clearSelection())}
              setSelectedMaterialId={setSelectedMaterialId}
              setSelectedArea={setSelectedArea}
            />
            <MaterialPanel
              materials={materials}
              selectedMaterialId={selectedMaterialId}
              setSelectedMaterialId={setSelectedMaterialId}
              selectedArea={selectedArea}
              setSelectedArea={setSelectedArea}
              addCustomMaterial={addCustomMaterial}
            />
            <ResultsPanel results={results} selectedMemberId={selectedMemberId} selectedNodeId={selectedNodeId} />
          </div>
        </div>
      </main>
    </div>
  );
}
