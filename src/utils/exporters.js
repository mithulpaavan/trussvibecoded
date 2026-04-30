const csvEscape = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportDesignJson(state) {
  downloadBlob(
    "truss-design.json",
    JSON.stringify(state, null, 2),
    "application/json;charset=utf-8"
  );
}

export function exportResultsCsv(results) {
  if (!results) return;
  const rows = [
    ["Member", "Material", "Length (m)", "Force (N)", "Stress (Pa)", "FoS", "Mode", "Failed"],
    ...results.memberResults.map((member) => [
      member.label,
      member.materialName,
      member.length,
      member.force,
      member.stress,
      member.fos,
      member.mode,
      member.failed ? "yes" : "no"
    ]),
    [],
    ["Node", "Reaction X (N)", "Reaction Y (N)"],
    ...results.nodeResults.map((node) => [node.label, node.rx, node.ry])
  ];

  downloadBlob(
    "truss-results.csv",
    rows.map((row) => row.map(csvEscape).join(",")).join("\n"),
    "text/csv;charset=utf-8"
  );
}

export async function exportResultsPdf(results) {
  if (!results) return;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Truss Analysis Report", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Members analyzed: ${results.memberResults.length}`, 14, 30);
  doc.text(`Minimum FoS: ${Number.isFinite(results.minFos) ? results.minFos.toFixed(3) : "Infinity"}`, 14, 36);
  doc.text(`Estimated member mass: ${results.totalMass.toFixed(3)} kg`, 14, 42);

  let y = 54;
  doc.setFont("helvetica", "bold");
  doc.text("Members", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  results.memberResults.forEach((member) => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(
      `${member.label}: ${member.mode}, F=${member.force.toExponential(3)} N, stress=${member.stress.toExponential(3)} Pa, FoS=${Number.isFinite(member.fos) ? member.fos.toFixed(2) : "Infinity"}`,
      14,
      y
    );
    y += 6;
  });

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Support Reactions", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  results.nodeResults.forEach((node) => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(
      `${node.label}: Rx=${node.rx.toExponential(3)} N, Ry=${node.ry.toExponential(3)} N`,
      14,
      y
    );
    y += 6;
  });

  doc.save("truss-analysis-results.pdf");
}
