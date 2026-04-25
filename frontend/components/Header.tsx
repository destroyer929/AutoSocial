"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header>
      <div className="header-content">
        <div className="logo-block">
          <Link href="/" className="logo-main" style={{ textDecoration: "none", color: "white" }}>
            <i className="fa-solid fa-robot"></i> AutoSocial
          </Link>
          <div style={{ fontSize: "0.8rem", color: "var(--text-soft)", marginLeft: "32px", marginTop: "-4px" }}>
            Social Intelligence Dashboard
          </div>
        </div>

        <nav className="header-actions">
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
              <button onClick={handleLogout} className="btn-header btn-logout" style={{ border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5" }}>
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
