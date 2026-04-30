import { Plus } from "lucide-react";

export function MaterialPanel({
  materials,
  selectedMaterialId,
  setSelectedMaterialId,
  selectedArea,
  setSelectedArea,
  addCustomMaterial
}) {
  return (
    <section className="border-b border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Materials</h2>
        <button
          title="Add custom material"
          onClick={addCustomMaterial}
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-line bg-white hover:border-slate-400"
        >
          <Plus size={16} />
        </button>
      </div>
      <select
        value={selectedMaterialId}
        onChange={(event) => setSelectedMaterialId(event.target.value)}
        className="w-full rounded border border-line bg-white px-3 py-2 text-sm"
      >
        {materials.map((material) => (
          <option key={material.id} value={material.id}>
            {material.name}
          </option>
        ))}
      </select>
      <label className="mt-3 block text-xs font-medium text-slate-500">Default member area (m^2)</label>
      <input
        type="number"
        step="0.0001"
        min="0.00001"
        value={selectedArea}
        onChange={(event) => setSelectedArea(Number(event.target.value))}
        className="mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
      />
      <div className="mt-3 space-y-2">
        {materials.map((material) => (
          <div key={material.id} className="rounded border border-line bg-white p-2 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span>{material.name}</span>
              <span className="h-3 w-3 rounded-full" style={{ background: material.color }} />
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-slate-500">
              <span>E {(material.youngsModulus / 1e9).toFixed(1)} GPa</span>
              <span>Fy {(material.yieldStrength / 1e6).toFixed(0)} MPa</span>
              <span>{material.density} kg/m^3</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

