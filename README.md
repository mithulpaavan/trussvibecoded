# Interactive Truss System Builder & Analyzer

A production-style educational structural analysis tool for designing and analyzing 2D truss systems with the matrix stiffness method.

## Project Structure

```text
.
├── src/
│   ├── components/
│   │   ├── Canvas.jsx
│   │   ├── MaterialPanel.jsx
│   │   ├── ResultsPanel.jsx
│   │   ├── Sidebar.jsx
│   │   └── TopBar.jsx
│   ├── data/materials.js
│   ├── engine/stiffnessSolver.js
│   ├── utils/exporters.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── index.html
```

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Engineering Method

The analysis engine implements a 2D truss finite element stiffness formulation:

1. Each node has two translational degrees of freedom, `ux` and `uy`.
2. Each bar member contributes a 4x4 global stiffness matrix:

   `k = (AE/L) * [[c², cs, -c², -cs], [cs, s², -cs, -s²], [-c², -cs, c², cs], [-cs, -s², cs, s²]]`

   where `A` is area, `E` is Young's modulus, `L` is member length, and `c`/`s` are direction cosines.
3. Member stiffness matrices are assembled into the global matrix `K`.
4. Supports constrain displacement degrees of freedom:
   - Pinned and fixed supports constrain `ux` and `uy`.
   - Roller supports constrain vertical displacement `uy`.
5. The reduced system `Kff * uf = Ff` is solved using Gaussian elimination with partial pivoting.
6. Reactions are recovered from `R = K*u - F`.
7. Member axial extension is computed as `delta = [-c, -s, c, s] * ue`.
8. Strain, stress, force, and factor of safety are calculated:
   - `strain = delta / L`
   - `stress = E * strain`
   - `force = stress * A`
   - `FoS = yieldStrength / abs(stress)`

The solver rejects mechanisms and ill-conditioned systems with explicit warnings rather than returning misleading values.

## Features

- Click-to-create nodes with grid snapping.
- Exact coordinate builder for adding/editing nodes in meters.
- Dropdown-based node/member selection and member creation.
- Zoomable/pannable scalable SVG grid with fit/reset view controls.
- Multi-select deletion for nodes, members, loads, and supports.
- Direct load/support deletion from the coordinate panel.
- Member creation by selecting two nodes.
- Drag-to-reposition nodes.
- Material database with Steel, Aluminum, Wood, and custom entries.
- Supports: pinned, roller, fixed.
- Loads by magnitude and angle.
- Matrix stiffness analysis with displacements, member force, stress, factor of safety, and reactions.
- Deformation overlay scaled for visibility.
- Red/blue member force visualization and failure highlighting.
- JSON save/load.
- CSV and PDF result export.

## Further Improvements

- Add distributed loads converted into equivalent nodal loads.
- Add buckling checks for compression members.
- Add member group editing and automatic section catalogs.
- Add optimization using weight and stress constraints.
- Add modal analysis and dynamic load cases.
- Extend the element formulation for 3D trusses.
