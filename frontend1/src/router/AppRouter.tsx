import { Routes, Route } from "react-router-dom";
import Layout from "../components/layout/Layout";

function Dashboard() {
  return (
    <div className="page">
      <h1>AMD AI Trading Copilot</h1>
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
      </Route>
    </Routes>
  );
}