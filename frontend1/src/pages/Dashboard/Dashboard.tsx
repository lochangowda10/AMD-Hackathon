import "./Dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard">

      <aside className="sidebar">

        <h2>AMD AI</h2>

        <ul>

          <li>🏠 Dashboard</li>

          <li>📈 Markets</li>

          <li>💼 Portfolio</li>

          <li>🤖 AI Agents</li>

          <li>📰 News</li>

          <li>⚙ Settings</li>

        </ul>

      </aside>

      <main className="content">

        <h1>AI Trading Dashboard</h1>

        <p>
          Welcome back! Here's your live trading overview.
        </p>

        <div className="cards">

          <div className="card">
            <h3>Portfolio</h3>
            <h2>₹5,24,300</h2>
            <span>+4.82%</span>
          </div>

          <div className="card">
            <h3>NIFTY 50</h3>
            <h2>25,428</h2>
            <span>+1.15%</span>
          </div>

          <div className="card">
            <h3>AI Confidence</h3>
            <h2>92%</h2>
            <span>Bullish</span>
          </div>

          <div className="card">
            <h3>Today's P/L</h3>
            <h2>+₹12,540</h2>
            <span>Profit</span>
          </div>

        </div>

        <div className="chart">

          <h2>Live Market Chart</h2>

          <div className="chartPlaceholder">

            Chart will be integrated here

          </div>

        </div>

      </main>

    </div>
  );
}