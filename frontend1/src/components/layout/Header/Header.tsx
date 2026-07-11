export default function Header() {
  return (
    <header
      style={{
        height: 70,
        borderBottom: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
      }}
    >
      <h3>AI Multi-Agent Trading Platform</h3>

      <div>🟢 Online</div>
    </header>
  );
}