import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">₨</span> SpendWise
        </div>
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/categories">Categories & Budgets</NavLink>
        </nav>
        <div className="user">
          <span className="user-name">{user?.full_name}</span>
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
