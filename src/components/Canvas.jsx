import { useMemo, useRef, useState } from "react";
import { Maximize2, Move, ZoomIn, ZoomOut } from "lucide-react";
import { canvasToWorld, snapCanvasValue } from "../utils/coordinates";

const NODE_RADIUS = 7;
const DEFAULT_VIEWBOX = { x: -100, y: -100, width: 1000, height: 700 };

const snap = (value) => snapCanvasValue(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function gridStepFor(viewBoxWidth) {
  if (viewBoxWidth > 8000) return 500;
  if (viewBoxWidth > 4000) return 250;
  if (viewBoxWidth > 2000) return 100;
  if (viewBoxWidth > 1000) return 50;
  return 25;
}

function supportIcon(type, x, y, selected) {
  const stroke = selected ? "#0f766e" : "#172033";
  if (type === "roller") {
    return (
      <g>
        <polygon points={`${x - 16},${y + 18} ${x + 16},${y + 18} ${x},${y}`} fill="#f8fafc" stroke={stroke} strokeWidth="2" />
        <circle cx={x - 8} cy={y + 25} r="4" fill="#fff" stroke={stroke} strokeWidth="1.5" />
        <circle cx={x + 8} cy={y + 25} r="4" fill="#fff" stroke={stroke} strokeWidth="1.5" />
      </g>
    );
  }
  if (type === "fixed") {
    return (
      <g stroke={stroke} strokeWidth="2">
        <line x1={x - 18} y1={y + 18} x2={x + 18} y2={y + 18} />
        {[-14, -6, 2, 10].map((offset) => (
          <line key={offset} x1={x + offset} y1={y + 18} x2={x + offset - 7} y2={y + 28} />
        ))}
      </g>
    );
  }
  return (
    <polygon points={`${x - 16},${y + 20} ${x + 16},${y + 20} ${x},${y}`} fill="#f8fafc" stroke={stroke} strokeWidth="2" />
  );
}

function forceColor(force) {
  if (!Number.isFinite(force)) return "#334155";
  if (Math.abs(force) <= 1e-6) return "#16a34a";
  return force >= 0 ? "#dc2626" : "#2563eb";
}

function displaySupportType(type) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

export function TrussCanvas({
  nodes,
  members,
  loads,
  supports,
  activeTool,
  selectedNodeId,
  selectedMemberId,
  selectedObjects,
  memberStartNodeId,
  results,
  deformationScale,
  setNodes,
  onCanvasNode,
  onNodeClick,
  onMemberClick,
  onLoadNode,
  onSupportNode,
  onSelectObject,
  clearSelection
}) {
  const svgRef = useRef(null);
  const [dragNodeId, setDragNodeId] = useState(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const [panState, setPanState] = useState(null);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const memberResultMap = useMemo(
    () => new Map((results?.memberResults ?? []).map((result) => [result.memberId, result])),
    [results]
  );
  const nodeResultMap = useMemo(
    () => new Map((results?.nodeResults ?? []).map((result) => [result.nodeId, result])),
    [results]
  );
  const gridStep = gridStepFor(viewBox.width);
  const gridMeters = gridStep / 100;

  const svgPointFromEvent = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height
    };
  };

  const pointFromEvent = (event) => {
    const point = svgPointFromEvent(event);
    return {
      x: snap(point.x),
      y: snap(point.y)
    };
  };

  const zoomAround = (factor, center) => {
    setViewBox((current) => {
      const nextWidth = clamp(current.width * factor, 150, 12000);
      const nextHeight = clamp(current.height * factor, 100, 9000);
      const nextScaleX = nextWidth / current.width;
      const nextScaleY = nextHeight / current.height;
      return {
        x: center.x - (center.x - current.x) * nextScaleX,
        y: center.y - (center.y - current.y) * nextScaleY,
        width: nextWidth,
        height: nextHeight
      };
    });
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const center = svgPointFromEvent(event);
    zoomAround(event.deltaY > 0 ? 1.15 : 0.87, center);
  };

  const fitToStructure = () => {
    if (!nodes.length) {
      setViewBox(DEFAULT_VIEWBOX);
      return;
    }
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(250, maxX - minX);
    const spanY = Math.max(180, maxY - minY);
    const margin = Math.max(150, Math.max(spanX, spanY) * 0.25);
    setViewBox({
      x: minX - margin,
      y: minY - margin,
      width: spanX + margin * 2,
      height: spanY + margin * 2
    });
  };

  const handleCanvasPointerDown = (event) => {
    if (activeTool !== "pan" && event.button !== 1) return;
    event.preventDefault();
    setPanState({
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox
    });
  };

  const handleCanvasClick = (event) => {
    if (activeTool === "pan") return;
    if (activeTool === "node") {
      onCanvasNode(pointFromEvent(event));
    } else {
      clearSelection();
    }
  };

  const handleNodePointerDown = (event, nodeId) => {
    event.stopPropagation();
    if (activeTool === "select") {
      onSelectObject("nodes", nodeId, event.shiftKey);
      if (!event.shiftKey) setDragNodeId(nodeId);
    }
  };

  const handlePointerMove = (event) => {
    if (panState) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((event.clientX - panState.clientX) / rect.width) * panState.viewBox.width;
      const dy = ((event.clientY - panState.clientY) / rect.height) * panState.viewBox.height;
      setViewBox({
        ...panState.viewBox,
        x: panState.viewBox.x - dx,
        y: panState.viewBox.y - dy
      });
      return;
    }
    if (!dragNodeId || activeTool !== "select") return;
    const point = pointFromEvent(event);
    setNodes((current) =>
      current.map((node) => (node.id === dragNodeId ? { ...node, x: point.x, y: point.y } : node))
    );
  };

  const endPointerAction = () => {
    setDragNodeId(null);
    setPanState(null);
  };

  const handleNodeClick = (event, nodeId) => {
    event.stopPropagation();
    if (activeTool === "member") onNodeClick(nodeId);
    if (activeTool === "load") onLoadNode(nodeId);
    if (activeTool === "support") onSupportNode(nodeId);
  };

  const maxForce = Math.max(
    ...Array.from(memberResultMap.values()).map((result) => Math.abs(result.force)),
    1
  );

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden bg-[#eef3f7]">
      <svg
        ref={svgRef}
        className={`h-full w-full ${activeTool === "pan" ? "cursor-grab" : "cursor-crosshair"}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="none"
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerAction}
        onPointerLeave={endPointerAction}
      >
        <defs>
          <pattern id="smallGrid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
            <path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="#d7dee8" strokeWidth="0.8" />
          </pattern>
          <marker id="loadArrow" viewBox="0 0 12 10" refX="10" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
            <path d="M 0 1 L 12 5 L 0 9 z" fill="#0f766e" />
          </marker>
          <marker id="selectedLoadArrow" viewBox="0 0 12 10" refX="10" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
            <path d="M 0 1 L 12 5 L 0 9 z" fill="#172033" />
          </marker>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#smallGrid)" />

        {members.map((member) => {
          const a = nodeMap.get(member.startNodeId);
          const b = nodeMap.get(member.endNodeId);
          if (!a || !b) return null;
          const result = memberResultMap.get(member.id);
          const failed = result?.failed;
          const selected = selectedObjects.members.includes(member.id) || selectedMemberId === member.id;
          const stroke = failed ? "#7f1d1d" : result ? forceColor(result.force) : "#475569";
          const width = result ? 3 + (Math.abs(result.force) / maxForce) * 8 : 4;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const length = Math.hypot(dx, dy) || 1;
          const labelX = (a.x + b.x) / 2 + (-dy / length) * 16;
          const labelY = (a.y + b.y) / 2 + (dx / length) * 16;
          return (
            <g
              key={member.id}
              onClick={(event) => {
                event.stopPropagation();
                onMemberClick(member.id, event.shiftKey);
              }}
              className="cursor-pointer"
            >
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="22" strokeLinecap="round" />
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={selected ? width + 3 : width}
                strokeLinecap="round"
                strokeDasharray={failed ? "8 5" : undefined}
              />
              {selected ? <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="7" fill="#172033" /> : null}
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                className="fill-slate-800 text-[12px] font-semibold"
                stroke="#f8fafc"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {member.label}
              </text>
            </g>
          );
        })}

        {results
          ? members.map((member) => {
              const a = nodeMap.get(member.startNodeId);
              const b = nodeMap.get(member.endNodeId);
              const ar = nodeResultMap.get(member.startNodeId);
              const br = nodeResultMap.get(member.endNodeId);
              if (!a || !b || !ar || !br) return null;
              return (
                <line
                  key={`def-${member.id}`}
                  x1={a.x + ar.ux * deformationScale}
                  y1={a.y - ar.uy * deformationScale}
                  x2={b.x + br.ux * deformationScale}
                  y2={b.y - br.uy * deformationScale}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              );
            })
          : null}

        {loads.map((load) => {
          const node = nodeMap.get(load.nodeId);
          if (!node) return null;
          const rad = ((load.angleDeg ?? -90) * Math.PI) / 180;
          const scale = Math.min(58, Math.max(28, Math.abs(load.magnitude) / 120));
          const x1 = node.x - Math.cos(rad) * scale;
          const y1 = node.y + Math.sin(rad) * scale;
          const selected = selectedObjects.loads.includes(load.id);
          return (
            <g
              key={load.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelectObject("loads", load.id, event.shiftKey);
              }}
              className="cursor-pointer"
            >
              <line x1={x1} y1={y1} x2={node.x} y2={node.y} stroke="transparent" strokeWidth="18" />
              <line
                x1={x1}
                y1={y1}
                x2={node.x}
                y2={node.y}
                stroke={selected ? "#172033" : "#0f766e"}
                strokeWidth={selected ? "3" : "2"}
                strokeLinecap="round"
                markerEnd={selected ? "url(#selectedLoadArrow)" : "url(#loadArrow)"}
              />
              {selected ? <circle cx={x1} cy={y1} r="5" fill="#172033" /> : null}
              <text x={x1 + 4} y={y1 - 5} className="fill-teal-800 text-[11px] font-semibold">
                {load.magnitude} N
              </text>
            </g>
          );
        })}

        {supports.map((support) => {
          const node = nodeMap.get(support.nodeId);
          if (!node) return null;
          const selected = selectedObjects.supports.includes(support.id);
          return (
            <g
              key={support.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelectObject("supports", support.id, event.shiftKey);
              }}
              className="cursor-pointer"
            >
              <circle cx={node.x} cy={node.y + 18} r="24" fill="transparent" />
              {selected ? <circle cx={node.x} cy={node.y + 18} r="28" fill="none" stroke="#0f766e" strokeWidth="2" /> : null}
              {supportIcon(support.type, node.x, node.y, selected)}
              <text
                x={node.x}
                y={node.y + 48}
                textAnchor="middle"
                className="fill-slate-800 text-[11px] font-semibold"
                stroke="#f8fafc"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {displaySupportType(support.type)}
              </text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const selected = selectedObjects.nodes.includes(node.id) || selectedNodeId === node.id || memberStartNodeId === node.id;
          const world = canvasToWorld(node);
          return (
            <g key={node.id} onPointerDown={(event) => handleNodePointerDown(event, node.id)} onClick={(event) => handleNodeClick(event, node.id)} className="cursor-pointer">
              {selected ? <circle cx={node.x} cy={node.y} r="14" fill="none" stroke="#0f766e" strokeWidth="2" /> : null}
              <circle cx={node.x} cy={node.y} r={NODE_RADIUS} fill={selected ? "#172033" : "#fff"} stroke="#172033" strokeWidth="2" />
              <text x={node.x + 10} y={node.y - 10} className="fill-slate-700 text-[11px] font-semibold">
                {node.label} ({world.x.toFixed(2)}, {world.y.toFixed(2)})
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute right-3 top-3 flex items-center gap-1 rounded border border-line bg-white/95 p-1 shadow-sm">
        <button title="Zoom in" onClick={() => zoomAround(0.82, { x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 })} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-panel">
          <ZoomIn size={16} />
        </button>
        <button title="Zoom out" onClick={() => zoomAround(1.22, { x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 })} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-panel">
          <ZoomOut size={16} />
        </button>
        <button title="Fit structure" onClick={fitToStructure} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-panel">
          <Maximize2 size={16} />
        </button>
        <button title="Reset view" onClick={() => setViewBox(DEFAULT_VIEWBOX)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-panel">
          <Move size={16} />
        </button>
      </div>
      <div className="absolute bottom-3 left-3 rounded border border-line bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
        Grid: {gridMeters} m
      </div>
    </div>
  );
}
