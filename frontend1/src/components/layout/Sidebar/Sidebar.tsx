import { LayoutDashboard } from "lucide-react";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 260,
        background: "#0d1321",
        padding: 24,
        borderRight: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <h2
        style={{
          color: "#00e5ff",
          marginBottom: 40,
        }}
      >
        AMD Copilot
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
      >
        <LayoutDashboard size={18} />
        Dashboard
      </div>
    </aside>
  );
}