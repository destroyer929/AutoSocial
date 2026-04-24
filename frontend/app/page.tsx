"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import CampaignModal from "@/components/CampaignModal";
import LLMModal from "@/components/LLMModal";
import { apiFetch } from "@/lib/api";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState("all");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isLLMModalOpen, setIsLLMModalOpen] = useState(false);
  const [llmPlatform, setLlmPlatform] = useState("instagram");
  const [llmData, setLlmData] = useState<any>(null);
  const [llmProgress, setLlmProgress] = useState(0);
  const [showAccounts, setShowAccounts] = useState(true);

  const handleLlmSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const topic = formData.get("topic") as string;
    const audience = formData.get("audience") as string;
    const goal = formData.get("goal") as string;
    const platform = formData.get("platform") as string;

    setLlmPlatform(platform);
    setIsLLMModalOpen(true);
    setLlmProgress(0);
    setLlmData(null);

    const interval = setInterval(() => {
      setLlmProgress((prev) => (prev < 97 ? prev + 3 : prev));
    }, 200);

    try {
      const data = await apiFetch("/instagram", {
        method: "POST",
        body: JSON.stringify({ topic, audience, goal, platform }),
      });
      clearInterval(interval);
      setLlmProgress(100);
      setLlmData(data);
    } catch (err) {
      clearInterval(interval);
      setLlmProgress(100);
      setLlmData({ hook: "Request failed. Check backend connection." });
    }
  };

  return (
    <main>
      <div className="glow-1" style={{
        position: "fixed", top: "-10%", left: "-10%", width: "40%", height: "40%",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)",
        pointerEvents: "none", zIndex: -1
      }}></div>
      <div className="glow-2" style={{
        position: "fixed", bottom: "-10%", right: "-10%", width: "40%", height: "40%",
        background: "radial-gradient(circle, rgba(108, 242, 213, 0.12), transparent 70%)",
        pointerEvents: "none", zIndex: -1
      }}></div>

      <Header 
        userEmail={userEmail} 
        onOpenCampaignModal={() => setIsCampaignModalOpen(true)} 
      />

      {userEmail ? (
        <div className="container" style={{ paddingTop: "120px" }}>
          {message && (
            <div className={`alert ${message.isError ? "alert-error" : "alert-success"}`}>
              <i className={`fa-solid ${message.isError ? "fa-circle-exclamation" : "fa-circle-check"}`}></i>
              <div>{message.text}</div>
            </div>
          )}

          <div className="action-grid">
            <div className="card submit-card">
              <h2>
                <i className="fa-solid fa-cloud-arrow-up" style={{ color: "var(--accent-neon)" }}></i>
                Submit Video
              </h2>
              <form>
                <div className="form-group">
                  <label>Target Platform</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-layer-group"></i>
                    <select name="platform">
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="youtube">YouTube Shorts</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Video Link</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-link"></i>
                    <input type="text" name="url" placeholder="https://..." required />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Process Submission</button>
              </form>
            </div>

            <div className="card link-card">
              <h2>
                <i className="fa-solid fa-user-plus" style={{ color: "var(--accent-gold)" }}></i>
                Link New Account
              </h2>
              <form>
                <div className="form-group">
                  <label>Platform</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-mobile-screen"></i>
                    <select name="platform">
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-at"></i>
                    <input type="text" name="account_name" placeholder="username (no @)" required />
                  </div>
                </div>
                <button type="submit" className="btn-primary btn-green">Register Account</button>
              </form>
            </div>

            <div className="card submit-card">
              <h2>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--accent-neon)" }}></i>
                Generate Viral Content
              </h2>
              <form onSubmit={handleLlmSubmit}>
                <div className="form-group">
                  <label>Topic</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-lightbulb"></i>
                    <input type="text" name="topic" placeholder="e.g. Mindset for young entrepreneurs" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Audience</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-users"></i>
                    <input type="text" name="audience" placeholder="e.g. 18–24 founders on Instagram" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Goal</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-bullseye"></i>
                    <select name="goal" required>
                      <option value="followers">Followers</option>
                      <option value="views">Views</option>
                      <option value="reach">Reach</option>
                      <option value="saves">Saves</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Platform</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-layer-group"></i>
                    <select name="platform" required>
                      <option value="instagram">Instagram Reels</option>
                      <option value="youtube">YouTube Shorts</option>
                      <option value="tiktok">TikTok</option>
                      <option value="twitter">Twitter / X</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary">Generate Package</button>
              </form>
            </div>
          </div>

          <div className="section-header">
            <div className="section-title">
              <h2>Registered Accounts</h2>
              <button onClick={() => setShowAccounts(!showAccounts)} className="btn-toggle">
                <i className={`fa-solid ${showAccounts ? "fa-eye-slash" : "fa-eye"}`}></i> 
                {showAccounts ? "Hide" : "Show"}
              </button>
            </div>

            <div className="filter-bar">
              {["all", "instagram", "tiktok", "twitter", "youtube"].map((p) => (
                <button 
                  key={p}
                  onClick={() => setCurrentPlatform(p)}
                  className={`filter-btn ${currentPlatform === p ? "active" : ""}`}
                >
                  {p === "all" ? "All" : <i className={`fa-brands fa-${p === "twitter" ? "x-twitter" : p}`}></i>}
                </button>
              ))}
            </div>
          </div>

          {showAccounts && (
            <div className="accounts-wrapper">
              <div className="accounts-grid">
                {accounts.length > 0 ? (
                  accounts
                    .filter(a => currentPlatform === "all" || a.platform.toLowerCase() === currentPlatform)
                    .map((acc) => (
                      <div key={acc.id} className="account-card">
                        <div className={`platform-badge bg-${acc.platform.toLowerCase()}`}>
                          <i className={`fa-brands fa-${acc.platform.toLowerCase() === "twitter" ? "x-twitter" : acc.platform.toLowerCase()}`}></i>
                        </div>
                        <div className="acc-username">@{acc.account_name}</div>
                        <div className="acc-platform">{acc.platform}</div>
                        <button className="btn-delete-icon" title="Remove Account">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="empty-state">
                    <i className="fa-solid fa-ghost"></i>
                    <p>No accounts found matching this filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <GuestView />
      )}

      <CampaignModal 
        isOpen={isCampaignModalOpen} 
        onClose={() => setIsCampaignModalOpen(false)} 
      />

      <LLMModal 
        isOpen={isLLMModalOpen} 
        onClose={() => setIsLLMModalOpen(false)} 
        platform={llmPlatform}
        data={llmData}
        progress={llmProgress}
      />

      <footer style={{ padding: "60px 0", borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--text-soft)", fontSize: "0.9rem" }}>
        <p>&copy; 2026 AutoSocial Platform. All rights reserved.</p>
      </footer>
    </main>
  );
}

function GuestView() {
  return (
    <div className="container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
      {/* Hero Section */}
      <section className="hero" style={{ padding: "180px 0 100px", display: "flex", alignItems: "center", gap: "60px" }}>
        <div className="hero-text" style={{ flex: 1 }}>
          <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, color: "var(--neon)", marginBottom: "24px" }}>
            <i className="fa-solid fa-bolt"></i> V3.0 Now Live
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: "24px", background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Earn by Creating.<br />Grow with AI.
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-soft)", marginBottom: "40px", maxWidth: "500px" }}>
            Join global campaigns, get paid for your content, and grow faster using our AI-powered viral prediction tools.
          </p>
          <div className="hero-btns" style={{ display: "flex", gap: "16px" }}>
            <a href="/signup" className="btn-header" style={{ padding: "14px 32px", background: "linear-gradient(135deg, var(--primary), #818cf8)", color: "white", border: "none", borderRadius: "12px", fontWeight: 700 }}>Get Started Free</a>
            <a href="/promotions" className="btn-header" style={{ padding: "14px 32px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-main)", borderRadius: "12px", fontWeight: 600 }}>Explore Campaigns</a>
          </div>
        </div>
        <div className="hero-visual" style={{ flex: 1.2, position: "relative" }}>
          <div className="mockup-container" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: "24px", padding: "8px", border: "1px solid var(--border)", boxShadow: "0 40px 100px rgba(0,0,0,0.6)", transform: "perspective(1000px) rotateY(-10deg) rotateX(5deg)" }}>
            <img src="/static/autosocial_hero_mockup.png" style={{ width: "100%", height: "auto", borderRadius: "18px", display: "block" }} alt="Dashboard Mockup" />
          </div>
        </div>
      </section>

      {/* Two Paths */}
      <div id="paths" style={{ padding: "100px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          <div className="card" style={{ padding: "60px", borderTop: "4px solid var(--neon)" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "16px" }}>For Creators</h2>
            <ul style={{ listStyle: "none", marginBottom: "40px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i className="fa-solid fa-check" style={{ color: "var(--neon)" }}></i> Browse & join campaigns</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i className="fa-solid fa-check" style={{ color: "var(--neon)" }}></i> Predict virality with AI</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i className="fa-solid fa-check" style={{ color: "var(--neon)" }}></i> Secure wallet for payouts</li>
            </ul>
            <a href="/signup?role=creator" className="btn-header" style={{ background: "var(--neon)", color: "#020617", width: "100%", textAlign: "center", fontWeight: 800, borderRadius: "12px", textDecoration: "none", padding: "16px" }}>Start as Creator</a>
          </div>
          <div className="card" style={{ padding: "60px", borderTop: "4px solid var(--primary)" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "16px" }}>For Brands</h2>
            <ul style={{ listStyle: "none", marginBottom: "40px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i className="fa-solid fa-check" style={{ color: "var(--primary)" }}></i> Post custom campaigns</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i className="fa-solid fa-check" style={{ color: "var(--primary)" }}></i> Hire top creators instantly</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i className="fa-solid fa-check" style={{ color: "var(--primary)" }}></i> Real-time ROI analytics</li>
            </ul>
            <a href="/signup?role=brand" className="btn-header" style={{ background: "var(--primary)", color: "white", width: "100%", textAlign: "center", fontWeight: 800, borderRadius: "12px", textDecoration: "none", padding: "16px" }}>Start as Brand</a>
          </div>
        </div>
      </div>

      {/* Chat Feature */}
      <section style={{ padding: "100px 0", display: "flex", alignItems: "center", gap: "80px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card" style={{ padding: "16px 20px", borderRadius: "20px", maxWidth: "80%" }}>
            <strong>@Nike_Brand</strong>
            <p>Hey! Loved your last reel. Would you like to join our upcoming marathon campaign?</p>
          </div>
          <div className="card" style={{ padding: "16px 20px", marginLeft: "auto", background: "var(--neon-glow)", borderColor: "var(--neon)", maxWidth: "80%", borderRadius: "20px" }}>
            <strong>@Creator_Star</strong>
            <p>I'm in! Let's discuss the hooks. Should I use the high-energy AI suggestion?</p>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "16px" }}>Collaborate in Real-Time</h2>
          <p style={{ color: "var(--text-soft)", fontSize: "1.1rem", marginBottom: "24px" }}>
            No more messy email threads. Discuss content ideas, get faster approvals, and build lasting relationships through our integrated chat system.
          </p>
        </div>
      </section>
    </div>
  );
}
