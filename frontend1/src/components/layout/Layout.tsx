import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        AMD AI
      </div>

      <div className="links">
        <a href="#">Dashboard</a>
        <a href="#">Markets</a>
        <a href="#">Portfolio</a>
        <a href="#">AI Agents</a>
      </div>

      <button className="navButton">
        Launch App
      </button>

    </nav>
  );
}