"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function MyPromotionsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "created";
  
  const [createdPromos, setCreatedPromos] = useState<any[]>([]);
  const [joinedPromos, setJoinedPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string, isError: boolean } | null>(null);
  const [dropdownOpenId, setDropdownOpenId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const data = await apiFetch("/api/my-promotions");
        setCreatedPromos(data.created_promos || []);
        setJoinedPromos(data.joined_promos || []);
      } catch (err) {
        console.error("Failed to fetch my-promotions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, []);

  const handleToggleStatus = async (id: number, isActive: boolean) => {
    if (!confirm(`Are you sure you want to ${isActive ? 'pause' : 'resume'} this campaign?`)) return;
    try {
      await apiFetch(`/api/promotions/${id}/toggle-status`, { method: "POST" });
      setCreatedPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: !isActive } : p));
    } catch (err) {
      console.error(err);
      setMessage({ text: "Action failed", isError: true });
    }
    setDropdownOpenId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('WARNING: Are you sure you want to permanently remove this campaign? All submissions and tickets will be destroyed.')) return;
    try {
      await apiFetch(`/api/promotions/${id}/delete`, { method: "POST" });
      setCreatedPromos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      setMessage({ text: "Delete failed", isError: true });
    }
    setDropdownOpenId(null);
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

  const renderPromoCardInner = (promo: any) => (
    <>
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
          <div className="promo-platform-pill">Budget: ${promo.budget || '0'}</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="promotions-header">
        <div className="promotions-heading">
          <h1>My Promotions</h1>
          <p>Logged in as {user?.email ? user.email.split('@')[0] : ''}</p>
        </div>

        <Link href="/" className="btn-back">
          <i className="fa-solid fa-arrow-left-long"></i> Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className="alert-joined" style={message.isError ? { background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.45)", color: "#fecaca" } : {}}>
          <i className={`fa-solid ${message.isError ? "fa-circle-exclamation" : "fa-circle-check"}`}></i>
          {message.text}
        </div>
      )}

      <div className="tabs-container" style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
        <Link href="/my-promotions?tab=created" style={{ 
          padding: "8px 18px", borderRadius: "999px", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600, transition: "all 0.2s",
          ...(activeTab === 'created' 
            ? { background: "var(--accent-neon)", color: "#020617", boxShadow: "0 0 15px rgba(108, 242, 213, 0.4)", border: "1px solid var(--accent-neon)" } 
            : { background: "rgba(15, 23, 42, 0.6)", color: "var(--text-soft)", border: "1px solid var(--glass-border)" })
        }}>
          <i className="fa-solid fa-folder-plus"></i> Campaigns Created
        </Link>
        <Link href="/my-promotions?tab=joined" style={{ 
          padding: "8px 18px", borderRadius: "999px", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600, transition: "all 0.2s",
          ...(activeTab === 'joined' 
            ? { background: "var(--accent-neon)", color: "#020617", boxShadow: "0 0 15px rgba(108, 242, 213, 0.4)", border: "1px solid var(--accent-neon)" } 
            : { background: "rgba(15, 23, 42, 0.6)", color: "var(--text-soft)", border: "1px solid var(--glass-border)" })
        }}>
          <i className="fa-solid fa-users"></i> Campaigns Joined
        </Link>
      </div>

      {activeTab === 'created' && (
        <>
          <h2 style={{ marginBottom: "20px", fontSize: "1.25rem" }}>Campaigns Created</h2>
          {!loading && createdPromos.length > 0 ? (
            <div className="promotions-grid">
              {createdPromos.map(promo => (
                <div key={promo.id} style={{ position: "relative" }}>
                  <Link href={`/promotion-detail?id=${promo.id}`} className="promo-card">
                    {renderPromoCardInner(promo)}
                  </Link>
                  <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10 }} onMouseLeave={() => setDropdownOpenId(null)}>
                    <button type="button" style={{ background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(148, 163, 184, 0.4)", padding: "6px 12px", borderRadius: "8px", color: "#fff", cursor: "pointer", backdropFilter: "blur(10px)" }} onClick={() => setDropdownOpenId(dropdownOpenId === promo.id ? null : promo.id)}>
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    {dropdownOpenId === promo.id && (
                      <div className="nav-dropdown-content" style={{ display: "block", position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#0f172a", minWidth: "140px", border: "1px solid rgba(148, 163, 184, 0.45)", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", zIndex: 100 }}>
                        <div style={{ margin: 0 }}>
                          <button onClick={() => handleToggleStatus(promo.id, promo.is_active)} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 16px", background: "none", border: "none", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-main)", cursor: "pointer", textAlign: "left", transition: "background 0.15s", borderBottom: "1px solid rgba(255,255,255,0.05)" }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <i className={`fa-solid ${promo.is_active ? 'fa-pause' : 'fa-play'}`} style={{ width: "14px" }}></i> {promo.is_active ? 'Pause' : 'Resume'}
                          </button>
                        </div>
                        <div style={{ margin: 0 }}>
                          <button onClick={() => handleDelete(promo.id)} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 16px", background: "none", border: "none", fontSize: "0.82rem", fontWeight: 500, color: "#ef4444", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <i className="fa-solid fa-trash" style={{ width: "14px" }}></i> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (!loading && (
            <p className="no-results">You have not created any campaigns yet.</p>
          ))}
        </>
      )}

      {activeTab === 'joined' && (
        <>
          <h2 style={{ marginBottom: "20px", fontSize: "1.25rem" }}>Campaigns Joined</h2>
          {!loading && joinedPromos.length > 0 ? (
            <div className="promotions-grid">
              {joinedPromos.map(promo => (
                <Link key={promo.id} href={`/promotion-detail?id=${promo.id}`} className="promo-card">
                  {renderPromoCardInner(promo)}
                </Link>
              ))}
            </div>
          ) : (!loading && (
            <p className="no-results">You have not joined any campaigns yet.</p>
          ))}
        </>
      )}
    </>
  );
}

export default function MyPromotionsPage() {
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
        <Suspense fallback={<div className="no-results">Loading...</div>}>
          <MyPromotionsContent />
        </Suspense>
      </div>
    </>
  );
}
