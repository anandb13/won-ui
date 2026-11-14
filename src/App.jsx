import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import WonList from "./pages/WonList.jsx";
import WonBuilder from "./pages/WonBuilder.jsx";
import RateCard from "./pages/RateCard.jsx";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/won", label: "Work orders", end: true },
  { to: "/won/new", label: "New WON" },
  { to: "/rates", label: "Rate card" },
];

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">WON Builder</div>
        <nav>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-note">
          Prototype UI. Data is sample data stored in this browser only.
        </p>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/won" element={<WonList />} />
          <Route path="/won/:id" element={<WonBuilder />} />
          <Route path="/rates" element={<RateCard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
