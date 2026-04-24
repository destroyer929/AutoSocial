"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/api/promotions?q=${searchQuery}`);
        setPromotions(data.promotions || []);
      } catch (err) {
        console.error("Failed to fetch promotions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotions();
  }, [searchQuery]);

  return (
    <div className="page-shell">
      <style jsx>{`
        .page-shell {
          max-width: 1120px;
          margin: 0 auto;
          padding: 32px 24px 64px;
          font-family: var(--font-inter), sans-serif;
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
          color: white;
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
          transition: all 0.2s ease;
        }
        .btn-back:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, .7);
          background: rgba(0, 0, 0, 0.55);
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
          transition: all 0.2s ease;
        }
        .search-input:focus {
          border-color: var(--accent-neon);
          box-shadow: 0 0 0 1px rgba(108, 242, 213, 0.6);
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
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .promotions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 26px;
        }
        .promo-card {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid rgba(148, 163, 184, 0.55);
          background: linear-gradient(145deg, #020617, #020617);
          box-shadow: 0 32px 100px rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(28px);
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .promo-card:hover {
          transform: translateY(-6px);
          border-color: rgba(248, 250, 252, 0.5);
        }
        .promo-image-wrapper {
          height: 210px;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .promo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .promo-image.fallback {
          font-size: 3.5rem;
          font-weight: 800;
          color: #333;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 10% 0%, rgba(56,189,248,0.2), transparent 60%);
        }
        .promo-content {
          padding: 14px;
        }
        .promo-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .promo-title {
          font-size: 1rem;
          font-weight: 600;
          color: white;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
        .promo-tag {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid #444;
          color: #aaa;
        }
        .promo-footer {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .promo-status {
          font-size: 0.75rem;
          color: var(--accent-neon);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .promo-budget {
          font-size: 0.8rem;
          color: white;
          font-weight: 600;
        }
        .no-results {
          text-align: center;
          padding: 100px;
          color: var(--text-soft);
          grid-column: 1/-1;
        }
      `}</style>

      <div className="promotions-header">
        <div className="promotions-heading">
          <h1>Promotions</h1>
          <p>Discover new campaigns and earn by creating.</p>
        </div>
        <Link href="/" className="btn-back">
          <i className="fa-solid fa-arrow-left-long"></i> Back to Dashboard
        </Link>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search promotions or campaigns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="btn-search">
          <i className="fa-solid fa-magnifying-glass"></i> Search
        </button>
      </div>

      <div className="promotions-grid">
        {loading ? (
          <div className="no-results">Loading campaigns...</div>
        ) : promotions.length > 0 ? (
          promotions.map((promo) => (
            <Link key={promo.id} href={`/promotions/${promo.id}`} className="promo-card">
              <div className="promo-image-wrapper">
                {promo.image_path ? (
                  <img src={promo.image_path} alt={promo.name} className="promo-image" />
                ) : (
                  <div className="promo-image fallback">{promo.campaign_title ? promo.campaign_title[0] : (promo.name ? promo.name[0] : "?")}</div>
                )}
              </div>
              <div className="promo-content">
                <div className="promo-title-row">
                  <h2 className="promo-title">{promo.campaign_title || promo.name}</h2>
                  <span className="promo-tag">{promo.campaign_type || "Campaign"}</span>
                </div>
                <div className="promo-footer">
                  <div className="promo-status">
                    <i className="fa-solid fa-bolt"></i> Live
                  </div>
                  <div className="promo-budget">${promo.budget || 0}</div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="no-results">No promotions found.</div>
        )}
      </div>
    </div>
  );
}
