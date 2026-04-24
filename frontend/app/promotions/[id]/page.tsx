"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function PromotionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [promotion, setPromotion] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  // Panels state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // const data = await apiFetch(`/promotions/${id}`);
        // setPromotion(data.promotion);
        // setUserEmail(data.user_email);
        // setIsJoined(data.is_joined);
        // setSubmissions(data.submissions || []);
        // setStats(data.stats || []);
        // setNotifs(data.notifications || []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch promotion details:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="loading">Loading campaign details...</div>;
  if (!promotion) return <div className="error">Campaign not found.</div>;

  return (
    <div className="app-shell">
      <style jsx>{`
        .app-shell {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg);
          font-family: var(--font-inter), sans-serif;
        }
        .topbar {
          position: fixed; top: 0; left: 0; right: 0; height: 60px;
          display: flex; align-items: center; padding: 0 24px;
          background: rgba(8, 13, 20, 0.95); border-bottom: 1px solid var(--border);
          backdrop-filter: blur(20px); z-index: 100;
        }
        .sidebar {
          width: 240px; border-right: 1px solid var(--border);
          display: flex; flex-direction: column; padding: 80px 0 20px;
          background: rgba(8, 13, 20, 0.98);
        }
        .nav-item {
          padding: 12px 20px; display: flex; align-items: center; gap: 12px;
          color: var(--text-soft); cursor: pointer; transition: all 0.2s;
          font-size: 0.85rem; font-weight: 500;
        }
        .nav-item:hover { color: white; background: rgba(255, 255, 255, 0.05); }
        .nav-item.active { color: var(--accent-neon); background: rgba(108, 242, 213, 0.05); border-left: 3px solid var(--accent-neon); }
        
        .main-content {
          flex: 1; padding: 80px 40px 40px; overflow-y: auto;
        }
        .panel { display: none; animation: fadeIn 0.3s ease; }
        .panel.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .glass-card {
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border);
          border-radius: 20px; padding: 30px;
        }
        .btn-join {
          width: 100%; padding: 14px; border-radius: 999px;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #020617; font-weight: 700; border: none; cursor: pointer;
        }
        .sidebar-promo-card {
          margin: 0 15px 20px; padding: 15px; border-radius: 16px;
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border);
        }
        .sidebar-cover {
          aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; margin-bottom: 10px;
        }
      `}</style>

      <div className="topbar">
        <div className="topbar-logo"><i className="fa-solid fa-robot"></i> AutoSocial</div>
        <div style={{ margin: "0 20px", height: "20px", borderLeft: "1px solid var(--border)" }}></div>
        <div className="topbar-promo-name">{promotion.name}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <Link href="/promotions" className="topbar-btn" style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--border)", textDecoration: "none", color: "white", fontSize: "0.8rem" }}>
            <i className="fa-solid fa-arrow-left"></i> Back
          </Link>
        </div>
      </div>

      <div className="sidebar">
        <div className="sidebar-promo-card">
          <div className="sidebar-cover">
            {promotion.image_path ? (
              <img src={promotion.image_path} alt="" style={{ width: "100%", height: "100%", object-fit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>{promotion.name[0]}</div>
            )}
          </div>
          <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>{promotion.name}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-soft)" }}>{promotion.type}</div>
        </div>

        <nav className="sidebar-nav">
          {[
            { id: "overview", icon: "fa-circle-info", label: "Overview" },
            { id: "guidelines", icon: "fa-book", label: "Guidelines" },
            { id: "submit", icon: "fa-cloud-arrow-up", label: "Submit Video" },
            { id: "analytics", icon: "fa-chart-pie", label: "Performance" },
            { id: "support", icon: "fa-headset", label: "Support Chat" },
            { id: "notifications", icon: "fa-bell", label: "Announcements" },
          ].map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <i className={`fa-solid ${item.icon}`}></i> {item.label}
            </div>
          ))}
        </nav>
      </div>

      <div className="main-content">
        {/* Overview Panel */}
        <div className={`panel ${activeTab === "overview" ? "active" : ""}`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "30px" }}>
            <div>
              <h1 style={{ fontSize: "2rem", marginBottom: "10px" }}>{promotion.name}</h1>
              <p style={{ color: "var(--text-soft)", marginBottom: "30px", lineHeight: 1.6 }}>{promotion.description}</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" }}>
                <div className="glass-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-soft)", textTransform: "uppercase" }}>Total Budget</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: var(--accent-neon) }}>${promotion.budget}</div>
                </div>
                <div className="glass-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-soft)", textTransform: "uppercase" }}>Joined Creators</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{promotion.joined_count || 0}</div>
                </div>
              </div>
            </div>
            
            <div className="glass-card" style={{ height: "fit-content" }}>
              <h3 style={{ marginBottom: "15px" }}>Ready to join?</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: "20px" }}>Connect your social accounts and start creating content for this campaign.</p>
              {isJoined ? (
                <div style={{ textAlign: "center", color: var(--accent-neon), fontWeight: 700 }}>
                  <i className="fa-solid fa-circle-check"></i> You're in this campaign!
                </div>
              ) : (
                <button className="btn-join">Join Campaign</button>
              )}
            </div>
          </div>
        </div>

        {/* Other panels would go here... */}
        <div className={`panel ${activeTab !== "overview" ? "active" : ""}`}>
          <div className="glass-card" style={{ textAlign: "center", padding: "100px" }}>
            <i className="fa-solid fa-person-digging" style={{ fontSize: "3rem", marginBottom: "20px", opacity: 0.3 }}></i>
            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel Under Construction</h2>
            <p style={{ color: "var(--text-soft)" }}>I am currently migrating this specific functionality to Next.js.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
