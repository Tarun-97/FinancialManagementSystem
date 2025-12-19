// frontend/src/App.jsx
import React from "react";
import { NavLink, Routes, Route } from "react-router-dom";

import States from "./pages/States.jsx";
import Departments from "./pages/Departments.jsx";
import FiscalYears from "./pages/FiscalYears.jsx";
import Accounts from "./pages/Accounts.jsx";
import Budgets from "./pages/Budgets.jsx";
import Expenditures from "./pages/Expenditures.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MultiView from "./pages/MultiView.jsx";
import VisualBuilder from "./pages/VisualBuilder.jsx";

const Link = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) => (isActive ? "navLink active" : "navLink")}
    end
  >
    {children}
  </NavLink>
);

export default function App() {
  return (
    <div>
      <header className="topbar container">
        <div className="brand">
          <div className="logoDot" />
          <h2>FMS</h2>
        </div>
        <nav className="navRow">
          <Link to="/">Dashboard</Link>
          <Link to="/states">States</Link>
          <Link to="/departments">Departments</Link>
          <Link to="/fiscal-years">Fiscal Years</Link>
          <Link to="/accounts">Accounts</Link>
          <Link to="/budgets">Budgets</Link>
          <Link to="/expenditures">Expenditures</Link>
          <Link to="/multi-view">Multi View</Link>
          <Link to="/visual-builder">DB Builder</Link>
        </nav>
      </header>

      <main className="main container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/states" element={<States />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/fiscal-years" element={<FiscalYears />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/expenditures" element={<Expenditures />} />
          <Route path="/multi-view" element={<MultiView />} />
          <Route path="/visual-builder" element={<VisualBuilder />} />
        </Routes>
      </main>
    </div>
  );
}
