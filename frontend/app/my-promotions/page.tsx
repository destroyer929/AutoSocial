"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function MyPromotionsPage() {
  const [tab, setTab] = useState("created");
  const [createdPromos, setCreatedPromos] = useState<any[]>([]);
  const [joinedPromos, setJoinedPromos] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    const fetchMyPromotions = async () => {
      try {
        // const data = await apiFetch(`/my-promotions?tab=${tab}`);
        // setCreatedPromos(data.created_promos);
        // setJoinedPromos(data.joined_promos);
        // setUserEmail(data.user_email);
      } catch (err) {
        console.error("Failed to fetch my promotions:", err);
      }
    };
    fetchMyPromotions();
  }, [tab]);

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
        .tabs-container {
          display: flex;
          gap: 12px;
          margin-bottom: 28px;
        }
        .tab-btn {
          padding: 8px 18px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
        }
        .tab-btn.active {
          background: var(--accent-neon);
          color: #020617;
          box-shadow: 0 0 15px rgba(108, 242, 213, 0.4);
          border: 1px solid var(--accent-neon);
        }
        .tab-btn.inactive {
          background: rgba(15, 23, 42, 0.6);
          color: var(--text-soft);
          border: 1px solid var(--glass-border);
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
        }
        .promo-budget {
          font-size: 0.8rem;
          color: white;
          font-weight: 600;
        }
        .alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 18px;
          border-radius: 14px;
          margin-bottom: 22px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .alert-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.45); color: #bbf7d0; }
        .alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.45); color: #fecaca; }
      `}</style>

      <div className="promotions-header">
        <div className="promotions-heading">
          <h1>My Promotions</h1>
          <p>Manage the campaigns you created or joined.</p>
        </div>
        <Link href="/" className="btn-back">
          <i className="fa-solid fa-arrow-left-long"></i> Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className={`alert ${message.isError ? "alert-error" : "alert-success"}`}>
          <i className={`fa-solid ${message.isError ? "fa-circle-exclamation" : "fa-circle-check"}`}></i>
          {message.text}
        </div>
      )}

      <div className="tabs-container">
        <button
          className={`tab-btn ${tab === "created" ? "active" : "inactive"}`}
          onClick={() => setTab("created")}
        >
          <i className="fa-solid fa-folder-plus"></i> Campaigns Created
        </button>
        <button
          className={`tab-btn ${tab === "joined" ? "active" : "inactive"}`}
          onClick={() => setTab("joined")}
        >
          <i className="fa-solid fa-users"></i> Campaigns Joined
        </button>
      </div>

      <h2 style={{ marginBottom: "20px", fontSize: "1.25rem", color: "white" }}>
        {tab === "created" ? "Campaigns Created" : "Campaigns Joined"}
      </h2>

      <div className="promotions-grid">
        {(tab === "created" ? createdPromos : joinedPromos).length > 0 ? (
          (tab === "created" ? createdPromos : joinedPromos).map((promo) => (
            <Link key={promo.id} href={`/promotions/${promo.id}`} className="promo-card">
              <div className="promo-image-wrapper">
                {promo.image_path ? (
                  <img src={promo.image_path} alt={promo.name} className="promo-image" />
                ) : (
                  <div className="promo-image fallback">{promo.name[0]}</div>
                )}
              </div>
              <div className="promo-content">
                <div className="promo-title-row">
                  <h2 className="promo-title">{promo.name}</h2>
                  <span className="promo-tag">{promo.type}</span>
                </div>
                <div className="promo-footer">
                  <div className="promo-status">
                    <i className="fa-solid fa-bolt"></i> Live
                  </div>
                  <div className="promo-budget">${promo.budget}</div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p style={{ color: "var(--text-soft)" }}>
            {tab === "created"
              ? "You have not created any campaigns yet."
              : "You have not joined any campaigns yet."}
          </p>
        )}
      </div>
    </div>
  );
}
