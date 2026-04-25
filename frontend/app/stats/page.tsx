"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function StatsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<string[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [currentPlatform, setCurrentPlatform] = useState("all");
  const [currentAccount, setCurrentAccount] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const data = await apiFetch(`/api/stats?platform=${currentPlatform}&account=${currentAccount}`);
        setStats(data.stats || []);
        setAllAccounts(data.all_accounts || []);
        setTotalViews(data.total_views || 0);
        setTotalLikes(data.total_likes || 0);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, [user, currentPlatform, currentAccount]);

  const handleDelete = async (url: string, platform: string) => {
    try {
      await apiFetch("/api/stats/delete", {
        method: "POST",
        body: JSON.stringify({ url, platform })
      });
      setStats(prev => prev.filter(s => !(s.url === url && s.platform === platform)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-main: radial-gradient(1200px circle at 10% 10%, #1b2635 0%, transparent 40%),
                     radial-gradient(1000px circle at 90% 20%, #2a1a38 0%, transparent 40%),
                     linear-gradient(180deg, #05070b, #0d1117);
          --glass-bg: rgba(255, 255, 255, 0.06);
          --glass-border: rgba(255, 255, 255, 0.14);
          --glass-strong: rgba(255, 255, 255, 0.08);
          --text-main: #ffffff;
          --text-soft: #aeb8c6;
          --accent-neon: #5be3c7;
          --accent-neon-soft: rgba(91, 227, 199, 0.18);
          --accent-gold: #f2d49a;
          --accent-gold-soft: rgba(242, 212, 154, 0.24);
          --border-subtle: rgba(255, 255, 255, 0.07);
          --danger-soft: rgba(255, 112, 112, 0.18);
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          background: var(--bg-main);
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          color: var(--text-main);
          -webkit-font-smoothing: antialiased;
        }

        .container {
          max-width: 1250px;
          margin: 0 auto;
          padding: 40px 24px 96px;
        }

        /* Header */

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 36px;
          gap: 16px;
        }

        .title-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .header h1 {
          margin: 0;
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(90deg, #ffffff, var(--accent-neon));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header p {
          margin: 0;
          font-size: 0.9rem;
          color: var(--text-soft);
          max-width: 460px;
        }

        .back {
          padding: 10px 20px;
          border-radius: 999px;
          border: 1px solid var(--glass-border);
          background: var(--glass-bg);
          color: var(--text-main);
          text-decoration: none;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.25s ease, box-shadow 0.25s ease,
            border-color 0.25s ease, background 0.25s ease;
        }

        .back span {
          font-size: 1rem;
          transform: translateY(-0.5px);
        }

        .back:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
          border-color: var(--accent-neon-soft);
          background: rgba(0, 0, 0, 0.55);
        }

        /* KPI */

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 22px;
          margin-bottom: 34px;
        }

        .kpi {
          position: relative;
          background: linear-gradient(180deg, var(--glass-strong), rgba(255, 255, 255, 0.02));
          border: 1px solid var(--glass-border);
          border-radius: 22px;
          padding: 22px 22px 20px;
          backdrop-filter: blur(26px);
          -webkit-backdrop-filter: blur(26px);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.55);
          overflow: hidden;
        }

        .kpi::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(
              340px circle at top left,
              rgba(255, 255, 255, 0.14),
              transparent 55%
            ),
            radial-gradient(
              260px circle at bottom right,
              rgba(0, 0, 0, 0.35),
              transparent 65%
            );
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .kpi-label {
          position: relative;
          font-size: 0.78rem;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .kpi h2 {
          position: relative;
          margin: 10px 0 6px;
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--accent-gold);
        }

        .kpi-sub {
          position: relative;
          font-size: 0.8rem;
          color: rgba(174, 184, 198, 0.9);
        }

        /* Filters */

        .filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          background: var(--glass-bg);
          padding: 18px 20px;
          border-radius: 22px;
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          margin-bottom: 28px;
        }

        .platforms {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .platforms button {
          padding: 8px 18px;
          border-radius: 999px;
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          text-decoration: none;
          font-size: 0.8rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.35);
          transition: background 0.25s ease, border-color 0.25s ease,
            color 0.25s ease, transform 0.2s ease;
          cursor: pointer;
        }

        .platforms button:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--accent-neon-soft);
          transform: translateY(-1px);
        }

        .platforms .active {
          background: linear-gradient(
            135deg,
            var(--accent-neon),
            #4acbdd
          );
          color: #020617;
          border-color: transparent;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
        }

        .platforms .active::after {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #0f172a;
          margin-left: 4px;
        }

        .filters form {
          margin: 0;
        }

        select {
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid var(--glass-border);
          background: rgba(3, 7, 18, 0.85);
          color: #e5e7eb;
          font-size: 0.85rem;
          outline: none;
          min-width: 170px;
          cursor: pointer;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        select:focus {
          border-color: var(--accent-neon-soft);
          box-shadow: 0 0 0 1px rgba(91, 227, 199, 0.2);
        }

        /* Table Card */

        .table-card {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.015)
          );
          border-radius: 26px;
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          box-shadow: 0 36px 90px rgba(0, 0, 0, 0.62);
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: rgba(0, 0, 0, 0.55);
        }

        th,
        td {
          padding: 18px 22px;
          font-size: 0.9rem;
          text-align: left;
        }

        th {
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 600;
          font-size: 0.78rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        tbody tr {
          border-bottom: 1px solid var(--border-subtle);
          transition: background 0.18s ease, transform 0.18s ease;
        }

        tbody tr:hover {
          background: rgba(15, 23, 42, 0.9);
          transform: translateY(-1px);
        }

        tbody tr:last-child {
          border-bottom: none;
        }

        td strong {
          font-weight: 600;
        }

        /* Badge */

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid rgba(15, 23, 42, 0.65);
          box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.5);
        }

        .instagram {
          background: linear-gradient(135deg, #ff8ab4, #ff5ea2);
          color: #020617;
        }

        .tiktok {
          background: linear-gradient(135deg, #5be3c7, #38bdf8);
          color: #020617;
        }

        .twitter {
          background: linear-gradient(135deg, #60a5fa, #38bdf8);
          color: #020617;
        }

        .youtube {
          background: linear-gradient(135deg, #f97373, #ef4444);
          color: #020617;
        }

        /* View link */

        .view {
          position: relative;
          color: var(--accent-neon);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.86rem;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .view::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -2px;
          width: 0;
          height: 1px;
          background: var(--accent-neon);
          transition: width 0.2s ease;
        }

        .view:hover::after {
          width: 100%;
        }

        .view span {
          font-size: 0.9rem;
          transform: translateY(-0.5px);
        }

        /* Empty state */

        .empty {
          text-align: center;
          padding: 72px 32px 76px;
          color: var(--text-soft);
        }

        .empty h3 {
          margin: 0 0 8px;
          font-size: 1.2rem;
          font-weight: 600;
          color: #e5e7eb;
        }

        .empty p {
          margin: 0;
          font-size: 0.9rem;
        }

        /* Responsive tweaks */

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .filters {
            align-items: stretch;
          }

          .filters form {
            width: 100%;
          }

          select {
            width: 100%;
          }

          th,
          td {
            padding: 14px 16px;
          }

          .kpi {
            padding: 18px 18px 16px;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="title-block">
            <h1>Analytics Dashboard</h1>
            <p>Track performance across your connected social accounts, with a clear, elevated view of reach, revenue, and engagement.</p>
          </div>
          <Link href="/" className="back">
            <span>←</span> Back
          </Link>
        </div>

        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-label">Total Views</div>
            <h2>{totalViews.toLocaleString()}</h2>
            <div className="kpi-sub">Overall reach across all platforms</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Total Money Generated</div>
            <h2>{totalLikes.toLocaleString()}</h2>
            <div className="kpi-sub">Cumulative revenue from your content</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Active Accounts</div>
            <h2>{allAccounts.length}</h2>
            <div className="kpi-sub">Profiles currently connected</div>
          </div>
        </div>

        <div className="filters">
          <div className="platforms">
            <button
              onClick={() => setCurrentPlatform("all")}
              className={currentPlatform === "all" ? "active" : ""}
            >
              All
            </button>
            <button
              onClick={() => setCurrentPlatform("instagram")}
              className={currentPlatform === "instagram" ? "active" : ""}
            >
              Instagram
            </button>
            <button
              onClick={() => setCurrentPlatform("tiktok")}
              className={currentPlatform === "tiktok" ? "active" : ""}
            >
              TikTok
            </button>
            <button
              onClick={() => setCurrentPlatform("twitter")}
              className={currentPlatform === "twitter" ? "active" : ""}
            >
              Twitter
            </button>
            <button
              onClick={() => setCurrentPlatform("youtube")}
              className={currentPlatform === "youtube" ? "active" : ""}
            >
              YouTube
            </button>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            <select value={currentAccount} onChange={(e) => setCurrentAccount(e.target.value)}>
              <option value="all">All Accounts</option>
              {allAccounts.map(acc => (
                <option key={acc} value={acc}>@{acc}</option>
              ))}
            </select>
          </form>
        </div>

        <div className="table-card">
          {stats.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Account</th>
                  <th>Views</th>
                  <th>Likes</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className={`badge ${row.platform.toLowerCase()}`}>
                        {row.platform}
                      </span>
                    </td>
                    <td><strong>{row.account_name}</strong></td>
                    <td>{row.views}</td>
                    <td>{row.likes}</td>
                    <td>{row.timestamp || "—"}</td>
                    <td>
                      <a href={row.url} target="_blank" className="view" rel="noopener noreferrer">
                        <span>↗</span> View
                      </a>
                      <button onClick={() => handleDelete(row.url, row.platform)} style={{
                        background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(248, 113, 113, 0.7)", color: "#fecaca", borderRadius: "999px", padding: "6px 10px", fontSize: "0.75rem", cursor: "pointer", marginLeft: "8px"
                      }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <h3>No analytics data</h3>
              <p>Add content or adjust your filters to see performance.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
