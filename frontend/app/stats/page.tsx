"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<string[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [currentPlatform, setCurrentPlatform] = useState("all");
  const [currentAccount, setCurrentAccount] = useState("all");

  useEffect(() => {
    if (user) {
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
    }
  }, [user, currentPlatform, currentAccount]);

  return (
    <div className="container" style={{ padding: "40px 24px 96px" }}>
      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 36px;
          gap: 16px;
        }
        .title-block h1 {
          margin: 0;
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(90deg, #ffffff, var(--accent-neon));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .title-block p {
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
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.25s ease;
        }
        .back:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
          background: rgba(0, 0, 0, 0.55);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 22px;
          margin-bottom: 34px;
        }
        .kpi {
          position: relative;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255, 255, 255, 0.02));
          border: 1px solid var(--glass-border);
          border-radius: 22px;
          padding: 22px 22px 20px;
          backdrop-filter: blur(26px);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.55);
          overflow: hidden;
        }
        .kpi-label {
          font-size: 0.78rem;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .kpi h2 {
          margin: 10px 0 6px;
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--accent-gold);
        }
        .kpi-sub {
          font-size: 0.8rem;
          color: rgba(174, 184, 198, 0.9);
        }
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
          background: rgba(0, 0, 0, 0.35);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .platforms button.active {
          background: linear-gradient(135deg, var(--accent-neon), #4acbdd);
          color: #020617;
          border-color: transparent;
        }
        .table-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015));
          border-radius: 26px;
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(28px);
          box-shadow: 0 36px 90px rgba(0, 0, 0, 0.62);
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: rgba(0, 0, 0, 0.55);
          padding: 18px 22px;
          color: var(--text-soft);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 600;
          font-size: 0.78rem;
          text-align: left;
          border-bottom: 1px solid var(--border-subtle);
        }
        td {
          padding: 18px 22px;
          font-size: 0.9rem;
          border-bottom: 1px solid var(--border-subtle);
        }
        .badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge.instagram { background: linear-gradient(45deg, #f09433, #bc1888); color: white; }
        .badge.tiktok { background: #000; color: white; }
        .badge.youtube { background: #ff0000; color: white; }
        .badge.twitter { background: #1da1f2; color: white; }
        
        .view-link {
          color: var(--accent-neon);
          text-decoration: none;
          font-weight: 500;
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
        }
      `}</style>

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
          {["all", "instagram", "tiktok", "twitter", "youtube"].map((p) => (
            <button
              key={p}
              className={currentPlatform === p ? "active" : ""}
              onClick={() => setCurrentPlatform(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <select 
          value={currentAccount} 
          onChange={(e) => setCurrentAccount(e.target.value)}
        >
          <option value="all">All Accounts</option>
          {allAccounts.map((acc) => (
            <option key={acc} value={acc}>@{acc}</option>
          ))}
        </select>
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
                <th>Actions</th>
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
                    <a href={row.url} target="_blank" className="view-link" rel="noopener noreferrer">
                      View ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "72px", color: "var(--text-soft)" }}>
            <i className="fa-solid fa-chart-simple" style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.2 }}></i>
            <h3>No analytics data</h3>
            <p>Add content or adjust your filters to see performance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
