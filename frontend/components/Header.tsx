"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header>
      <div className="header-content">
        <Link href="/" className="logo-main" style={{ textDecoration: "none", color: "white" }}>
          <i className="fa-solid fa-robot"></i> AutoSocial
        </Link>

        <nav style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {user ? (
            <>
              <Link href="/promotions" className="btn-header">
                <i className="fa-solid fa-rocket"></i> Campaigns
              </Link>
              <Link href="/stats" className="btn-header">
                <i className="fa-solid fa-chart-line"></i> Analytics
              </Link>
              <Link href="/my-promotions" className="btn-header">
                <i className="fa-solid fa-folder-open"></i> My Work
              </Link>
              <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)", margin: "0 8px" }}></div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>
                {user.email.split("@")[0]}
              </span>
              <button onClick={logout} className="btn-header" style={{ background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-header">Login</Link>
              <Link href="/signup" className="btn-header" style={{ background: "var(--accent-neon)", color: "#020617", border: "none", fontWeight: 700 }}>
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
