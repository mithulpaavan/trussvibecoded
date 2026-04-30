export const defaultMaterials = [
  {
    id: "steel",
    name: "Steel",
    youngsModulus: 200e9,
    yieldStrength: 250e6,
    density: 7850,
    color: "#64748b"
  },
  {
    id: "aluminum",
    name: "Aluminum",
    youngsModulus: 69e9,
    yieldStrength: 150e6,
    density: 2700,
    color: "#94a3b8"
  },
  {
    id: "wood",
    name: "Wood",
    youngsModulus: 11e9,
    yieldStrength: 40e6,
    density: 600,
    color: "#a16207"
  }
];

export const getMaterial = (materials, materialId) =>
  materials.find((material) => material.id === materialId) ?? materials[0];

