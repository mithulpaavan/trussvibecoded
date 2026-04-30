const EPSILON = 1e-9;
const ZERO_FORCE_TOLERANCE = 1e-6;

export class AnalysisError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AnalysisError";
    this.details = details;
  }
}

const zeroMatrix = (rows, cols) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);

const multiplyMatrixVector = (matrix, vector) =>
  matrix.map((row) => dot(row, vector));

const cloneMatrix = (matrix) => matrix.map((row) => [...row]);

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = cloneMatrix(matrix);
  const b = [...vector];

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let maxAbs = Math.abs(a[col][col]);

    for (let row = col + 1; row < n; row += 1) {
      const value = Math.abs(a[row][col]);
      if (value > maxAbs) {
        maxAbs = value;
        pivotRow = row;
      }
    }

    if (maxAbs < EPSILON) {
      throw new AnalysisError(
        "The global stiffness matrix is singular. Add supports or members to remove rigid-body motion/mechanisms.",
        { pivot: maxAbs, column: col }
      );
    }

    if (pivotRow !== col) {
      [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
    }

    for (let row = col + 1; row < n; row += 1) {
      const factor = a[row][col] / a[col][col];
      if (Math.abs(factor) < EPSILON) continue;
      for (let k = col; k < n; k += 1) {
        a[row][k] -= factor * a[col][k];
      }
      b[row] -= factor * b[col];
    }
  }

  const x = Array.from({ length: n }, () => 0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = b[row];
    for (let col = row + 1; col < n; col += 1) {
      sum -= a[row][col] * x[col];
    }
    x[row] = sum / a[row][row];
  }

  return x;
}

function supportConstraints(supportType) {
  if (supportType === "roller") return [false, true];
  if (supportType === "pinned" || supportType === "fixed") return [true, true];
  return [false, false];
}

function loadToComponents(load) {
  const radians = ((load.angleDeg ?? -90) * Math.PI) / 180;
  const magnitude = Number(load.magnitude) || 0;
  return {
    fx: magnitude * Math.cos(radians),
    fy: magnitude * Math.sin(radians)
  };
}

function memberGeometry(member, nodeMap) {
  const start = nodeMap.get(member.startNodeId);
  const end = nodeMap.get(member.endNodeId);
  if (!start || !end) {
    throw new AnalysisError(`Member ${member.id} references a missing node.`);
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < EPSILON) {
    throw new AnalysisError(`Member ${member.label ?? member.id} has zero length.`);
  }

  return {
    start,
    end,
    length,
    c: dx / length,
    s: dy / length
  };
}

export function analyzeTruss({ nodes, members, loads, supports, materials }) {
  if (nodes.length < 2 || members.length === 0) {
    throw new AnalysisError("Create at least two nodes and one member before running analysis.");
  }

  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const size = nodes.length * 2;
  const K = zeroMatrix(size, size);
  const F = Array.from({ length: size }, () => 0);
  const restrained = Array.from({ length: size }, () => false);
  const memberInputs = [];

  members.forEach((member) => {
    const geometry = memberGeometry(member, nodeMap);
    const material = materials.find((item) => item.id === member.materialId) ?? materials[0];
    const area = Number(member.area) || 0;
    if (area <= 0) {
      throw new AnalysisError(`Member ${member.label ?? member.id} has a non-positive area.`);
    }

    const { c, s, length } = geometry;
    const factor = (material.youngsModulus * area) / length;
    const local = [
      [c * c, c * s, -c * c, -c * s],
      [c * s, s * s, -c * s, -s * s],
      [-c * c, -c * s, c * c, c * s],
      [-c * s, -s * s, c * s, s * s]
    ].map((row) => row.map((value) => value * factor));

    const dofs = [
      nodeIndex.get(member.startNodeId) * 2,
      nodeIndex.get(member.startNodeId) * 2 + 1,
      nodeIndex.get(member.endNodeId) * 2,
      nodeIndex.get(member.endNodeId) * 2 + 1
    ];

    dofs.forEach((globalRow, row) => {
      dofs.forEach((globalCol, col) => {
        K[globalRow][globalCol] += local[row][col];
      });
    });

    memberInputs.push({ member, material, geometry, dofs });
  });

  loads.forEach((load) => {
    if (!nodeIndex.has(load.nodeId)) return;
    const index = nodeIndex.get(load.nodeId);
    const { fx, fy } = loadToComponents(load);
    F[index * 2] += fx;
    F[index * 2 + 1] += fy;
  });

  supports.forEach((support) => {
    if (!nodeIndex.has(support.nodeId)) return;
    const index = nodeIndex.get(support.nodeId);
    const [lockX, lockY] = supportConstraints(support.type);
    restrained[index * 2] ||= lockX;
    restrained[index * 2 + 1] ||= lockY;
  });

  const freeDofs = restrained
    .map((isRestrained, index) => (!isRestrained ? index : null))
    .filter((index) => index !== null);

  if (freeDofs.length === size) {
    throw new AnalysisError("The structure has no restrained degrees of freedom. Add supports before analysis.");
  }
  if (freeDofs.length === 0) {
    throw new AnalysisError("All node degrees of freedom are restrained. Add free joints or remove support constraints.");
  }

  const Kff = freeDofs.map((row) => freeDofs.map((col) => K[row][col]));
  const Ff = freeDofs.map((row) => F[row]);
  const uf = solveLinearSystem(Kff, Ff);
  const displacements = Array.from({ length: size }, () => 0);
  freeDofs.forEach((dof, index) => {
    displacements[dof] = uf[index];
  });

  const reactionsVector = multiplyMatrixVector(K, displacements).map(
    (value, index) => value - F[index]
  );

  const nodeResults = nodes.map((node, index) => ({
    nodeId: node.id,
    label: node.label,
    ux: displacements[index * 2],
    uy: displacements[index * 2 + 1],
    rx: restrained[index * 2] ? reactionsVector[index * 2] : 0,
    ry: restrained[index * 2 + 1] ? reactionsVector[index * 2 + 1] : 0
  }));

  const memberResults = memberInputs.map(({ member, material, geometry, dofs }) => {
    const ue = dofs.map((dof) => displacements[dof]);
    const extension = dot([-geometry.c, -geometry.s, geometry.c, geometry.s], ue);
    const strain = extension / geometry.length;
    const stress = material.youngsModulus * strain;
    const force = stress * member.area;
    const fos = Math.abs(stress) < EPSILON ? Infinity : material.yieldStrength / Math.abs(stress);
    const mass = geometry.length * member.area * material.density;
    const mode =
      Math.abs(force) <= ZERO_FORCE_TOLERANCE
        ? "zero force member"
        : force > 0
          ? "tension"
          : "compression";

    return {
      memberId: member.id,
      label: member.label,
      startNodeId: member.startNodeId,
      endNodeId: member.endNodeId,
      materialName: material.name,
      length: geometry.length,
      area: member.area,
      extension,
      strain,
      stress,
      force,
      fos,
      failed: fos < 1,
      mode,
      mass
    };
  });

  const maxDisplacement = Math.max(
    ...nodeResults.map((node) => Math.hypot(node.ux, node.uy)),
    0
  );
  const totalMass = memberResults.reduce((sum, member) => sum + member.mass, 0);
  const minFos = Math.min(...memberResults.map((member) => member.fos));

  return {
    status: "ok",
    nodeResults,
    memberResults,
    totalMass,
    maxDisplacement,
    minFos,
    globalStiffness: K,
    loadVector: F,
    displacementVector: displacements,
    restrainedDofs: restrained
  };
}

export function formatEngineering(value, unit = "", digits = 3) {
  if (!Number.isFinite(value)) return `Infinity${unit ? ` ${unit}` : ""}`;
  if (Math.abs(value) < 1e-12) return `0${unit ? ` ${unit}` : ""}`;

  const prefixes = [
    { scale: 1e9, prefix: "G" },
    { scale: 1e6, prefix: "M" },
    { scale: 1e3, prefix: "k" },
    { scale: 1, prefix: "" },
    { scale: 1e-3, prefix: "m" },
    { scale: 1e-6, prefix: "u" }
  ];
  const item =
    prefixes.find((prefix) => Math.abs(value) >= prefix.scale) ??
    prefixes[prefixes.length - 1];
  return `${(value / item.scale).toPrecision(digits)} ${item.prefix}${unit}`.trim();
}
