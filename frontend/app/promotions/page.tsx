"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

import { Suspense } from "react";

function PromotionsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const joinedParam = searchParams.get("joined");
  const initialQuery = searchParams.get("q") || "";
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.append("q", searchQuery);
        if (category !== "all") queryParams.append("category", category);
        
        const data = await apiFetch(`/api/promotions?${queryParams.toString()}`);
        setPromotions(data.promotions || []);
      } catch (err) {
        console.error("Failed to fetch promotions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotions();
  }, [searchQuery, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The effect will trigger because searchQuery is updated, but if we want to change URL:
    // This is a simple SPA fetch, but to mimic exact behavior, we might just rely on state.
    // If we want exact behavior (reloading or updating query param), we can pushstate.
    // We'll just rely on the React state update to fetch new data without reload.
  };

  const renderPlatforms = (platformsStr: string) => {
    if (!platformsStr || platformsStr === 'all') {
      return (
        <>
          <img src="/static/logos/Tiktok_logo.png" alt="TikTok" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />
          <img src="/static/logos/YouTube_logo.png" alt="YouTube" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />
          <img src="/static/logos/twitter_logo.png" alt="X" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />
          <img src="/static/logos/Instagram_logo.png" alt="Instagram" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />
        </>
      );
    }
    const plist = platformsStr.split(',');
    return plist.map((plat, idx) => {
      const p = plat.trim();
      if (p === 'instagram') return <img key={idx} src="/static/logos/Instagram_logo.png" alt="Instagram" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />;
      if (p === 'youtube') return <img key={idx} src="/static/logos/YouTube_logo.png" alt="YouTube" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />;
      if (p === 'tiktok') return <img key={idx} src="/static/logos/Tiktok_logo.png" alt="TikTok" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />;
      if (p === 'twitter' || p === 'x') return <img key={idx} src="/static/logos/twitter_logo.png" alt="X" style={{ height: "16px", width: "16px", marginLeft: "4px", verticalAlign: "middle" }} />;
      return null;
    });
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-main: radial-gradient(1200px circle at 10% 10%, #1c2a3a 0%, transparent 40%),
                     radial-gradient(1000px circle at 90% 20%, #2d1f3a 0%, transparent 40%),
                     linear-gradient(180deg, #0b0f14, #0e141b);
          --glass-bg: rgba(15, 23, 42, 0.88);
          --glass-border: rgba(148, 163, 184, 0.45);
          --text-main: #ffffff;
          --text-soft: #aab4c0;
          --accent-neon: #6cf2d5;
          --accent-gold: #f5d28b;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          min-height: 100vh;
          background: var(--bg-main);
          color: var(--text-main);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .page-shell {
          max-width: 1120px;
          margin: 0 auto;
          padding: 32px 24px 64px;
        }

        .promotions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .promotions-heading h1 {
          font-size: 1.6rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin-bottom: 4px;
        }

        .promotions-heading p {
          font-size: 0.85rem;
          color: var(--text-soft);
        }

        .btn-create {
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #0b0f14;
          padding: 10px 24px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 15px rgba(108, 242, 213, 0.3);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .btn-create:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(108, 242, 213, 0.4);
        }

        .btn-back {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid var(--glass-border);
          background: var(--glass-bg);
          color: var(--text-main);
          text-decoration: none;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .btn-back:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, .7);
          border-color: rgba(255, 255, 255, 0.26);
          background: rgba(0, 0, 0, 0.55);
        }

        .alert-joined {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 18px;
          border-radius: 14px;
          margin-bottom: 22px;
          font-size: 0.9rem;
          font-weight: 500;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.45);
          color: #bbf7d0;
        }

        .search-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }

        .search-input {
          flex: 1;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(6, 10, 17, 0.92);
          color: var(--text-main);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .search-input::placeholder {
          color: rgba(148, 163, 184, 0.8);
        }

        .search-input:focus {
          border-color: var(--accent-neon);
          box-shadow: 0 0 0 1px rgba(108, 242, 213, 0.6);
          background: rgba(6, 10, 17, 1);
        }

        .btn-search {
          padding: 10px 18px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #020617;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 18px 40px rgba(0, 0, 0, .8);
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-search:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #4dd0e1, var(--accent-neon));
          box-shadow: 0 24px 60px rgba(0, 0, 0, .9);
        }

        .btn-search:active {
          transform: translateY(0);
          box-shadow: 0 16px 34px rgba(0, 0, 0, .85);
        }

        .promotions-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 26px;
        }

        .promo-card {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid rgba(148, 163, 184, 0.55);
          background:
            radial-gradient(circle at 0 0, rgba(148, 163, 184, 0.26), transparent 55%),
            radial-gradient(circle at 100% 0, rgba(56, 189, 248, 0.22), transparent 55%),
            linear-gradient(145deg, #020617, #020617);
          box-shadow:
            0 32px 100px rgba(0, 0, 0, 0.95),
            0 0 0 1px rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .promo-card::before {
          content: "";
          position: absolute;
          inset: -30%;
          background:
            radial-gradient(circle at 10% 0%, rgba(250, 250, 250, 0.13), transparent 55%),
            radial-gradient(circle at 90% 0%, rgba(56, 189, 248, 0.28), transparent 60%);
          opacity: 0;
          mix-blend-mode: screen;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }

        .promo-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow:
            0 40px 120px rgba(0, 0, 0, 0.98),
            0 0 0 1px rgba(226, 232, 240, 0.7);
          border-color: rgba(248, 250, 252, 0.5);
        }

        .promo-card:hover::before {
          opacity: 1;
        }

        .promo-image-wrapper {
          position: relative;
          overflow: hidden;
        }

        .promo-image {
          width: 100%;
          height: 210px;
          object-fit: cover;
          display: block;
          transform: scale(1.03);
          filter: saturate(1.2);
          transition: transform 0.25s ease, filter 0.25s ease;
        }

        .promo-card:hover .promo-image {
          transform: scale(1.08);
          filter: saturate(1.35);
        }

        .promo-image-wrapper::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(15, 23, 42, 0) 10%,
            rgba(15, 23, 42, 0.45) 70%,
            rgba(15, 23, 42, 0.9) 100%
          );
          pointer-events: none;
        }

        .promo-image.fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.5rem;
          font-weight: 800;
          color: #e5e7eb;
          background:
            radial-gradient(circle at 10% 0, rgba(56, 189, 248, 0.4), transparent 60%),
            linear-gradient(145deg, #020617, #020617);
        }

        .promo-content {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .promo-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .promo-title {
          font-size: 0.98rem;
          font-weight: 650;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .promo-tag {
          font-size: 0.7rem;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.7);
          color: rgba(226, 232, 240, 0.95);
          white-space: nowrap;
        }

        .promo-meta {
          font-size: 0.78rem;
          color: var(--text-soft);
        }

        .promo-footer {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .promo-status {
          font-size: 0.74rem;
          color: var(--text-soft);
        }

        .promo-status span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 9px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.65);
        }

        .promo-status-active {
          color: var(--accent-neon);
          border-color: rgba(74, 222, 128, 0.8);
        }

        .promo-status-inactive {
          color: rgba(248, 250, 252, 0.82);
        }

        .promo-platform-pill {
          font-size: 0.74rem;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.7);
          color: rgba(226, 232, 240, 0.95);
        }

        .promo-view-hint {
          font-size: 0.72rem;
          color: var(--accent-neon);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .promo-card:hover .promo-view-hint {
          opacity: 1;
          transform: translateY(0);
        }

        .no-results {
          color: var(--text-soft);
          font-size: 0.95rem;
          padding: 40px 0;
          text-align: center;
        }

        @media (max-width: 1200px) {
          .promotions-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        @media (max-width: 900px) {
          .promotions-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 640px) {
          .promotions-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>

      <div className="page-shell">
        <div className="promotions-header">
          <div className="promotions-heading">
            <h1>Promotions</h1>
            <p>Discover and join active campaigns</p>
          </div>

          {user && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Link href="/create-campaign" className="btn-create">
                <i className="fa-solid fa-plus"></i> Create Campaign
              </Link>
              <Link href="/" className="btn-back">
                <i className="fa-solid fa-arrow-left-long"></i> Back to Dashboard
              </Link>
            </div>
          )}
        </div>

        {joinedParam && (
          <div className="alert-joined">
            <i className="fa-solid fa-circle-check"></i>
            You have successfully joined the promotion!
          </div>
        )}

        <div style={{ 
          display: "flex", 
          alignItems: "center",
          background: "var(--glass-bg)", 
          padding: "8px", 
          borderRadius: "22px", 
          border: "1px solid var(--glass-border)", 
          backdropFilter: "blur(20px)", 
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          marginBottom: "40px"
        }}>
          {/* Category Dropdown Prefix */}
          <div style={{ position: "relative", borderRight: "1px solid var(--glass-border)", paddingRight: "10px", marginRight: "10px" }}>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ 
                background: "transparent", 
                color: "var(--accent-neon)", 
                border: "none", 
                borderRadius: "12px", 
                padding: "10px 30px 10px 15px", 
                outline: "none", 
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 700,
                appearance: "none",
                width: "140px"
              }}
            >
              <option value="all">All Categories</option>
              <option value="podcasts">Podcasts</option>
              <option value="gaming">Gaming</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="fashion">Fashion</option>
              <option value="tech">Tech</option>
              <option value="finance">Finance</option>
              <option value="irl-content">IRL Content</option>
              <option value="sport">Sport</option>
            </select>
            <i className="fa-solid fa-chevron-down" style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--accent-neon)", pointerEvents: "none" }}></i>
          </div>

          <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", color: "var(--text-soft)" }}></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search promotions or campaigns..."
                className="search-input"
                style={{ width: "100%", padding: "10px 10px 10px 42px", border: "none", background: "transparent", fontSize: "1rem" }}
              />
            </div>
            <button type="submit" className="btn-search" style={{ padding: "10px 24px", borderRadius: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
               <i className="fa-solid fa-magnifying-glass"></i> Search
            </button>
          </form>
        </div>

        {!loading && promotions.length > 0 ? (
          <div className="promotions-grid">
            {promotions.map(promo => (
              <Link key={promo.id} href={`/promotion-detail?id=${promo.id}`} className="promo-card">
                <div className="promo-image-wrapper">
                  {promo.image_path ? (
                    <img src={promo.image_path} alt={promo.campaign_title || promo.name} className="promo-image" />
                  ) : (
                    <div className="promo-image fallback">
                      {(promo.campaign_title || promo.name)?.[0]}
                    </div>
                  )}
                </div>

                <div className="promo-content">
                  <div className="promo-title-row">
                    <h2 className="promo-title">{promo.campaign_title || promo.name}</h2>
                    <div className="promo-tag">
                      {promo.campaign_type ? promo.campaign_type.replace('-', ' ') : 'Campaign'}
                    </div>
                  </div>

                  <p className="promo-meta">
                    <strong style={{ fontWeight: 600 }}>Platforms:</strong>
                    {renderPlatforms(promo.platforms)}
                  </p>

                  <div className="promo-footer">
                    <p className="promo-status">
                      {promo.is_active ? (
                        <span className="promo-status-active">
                          <i className="fa-solid fa-bolt" style={{ fontSize: "0.7rem" }}></i> Live
                        </span>
                      ) : (
                        <span className="promo-status-inactive">
                          <i className="fa-regular fa-circle-dot" style={{ fontSize: "0.7rem" }}></i> Scheduled
                        </span>
                      )}
                    </p>

                    <div className="promo-platform-pill">
                      Budget: ${promo.budget || 0}
                    </div>
                  </div>

                  <div className="promo-view-hint">
                    <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.65rem" }}></i> View & Join
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (!loading && (
          <p className="no-results">
            No promotions found{searchQuery ? ` for "${searchQuery}"` : ""}.
          </p>
        ))}
      </div>
    </>
  );
}

export default function PromotionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PromotionsContent />
    </Suspense>
  );
}
