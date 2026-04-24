"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import CampaignModal from "@/components/CampaignModal";
import LLMModal from "@/components/LLMModal";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState("all");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isLLMModalOpen, setIsLLMModalOpen] = useState(false);
  const [llmPlatform, setLlmPlatform] = useState("instagram");
  const [llmData, setLlmData] = useState<any>(null);
  const [llmProgress, setLlmProgress] = useState(0);
  const [showAccounts, setShowAccounts] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchAccounts = async () => {
        try {
          const data = await apiFetch(`/api/accounts?platform=${currentPlatform}`);
          setAccounts(data);
        } catch (err) {
          console.error("Failed to fetch accounts");
        }
      };
      fetchAccounts();
    }
  }, [user, currentPlatform]);

  const handleLlmSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLlmPlatform(formData.get("platform") as string);
    setIsLLMModalOpen(true);
    setLlmProgress(0);
    setLlmData(null);

    const interval = setInterval(() => {
      setLlmProgress((prev) => (prev < 97 ? prev + 3 : prev));
    }, 200);

    try {
      // Mocking LLM generation for now
      setTimeout(() => {
        clearInterval(interval);
        setLlmProgress(100);
        setLlmData({
          hook: "Unlock the secret to 10x growth with this one simple trick...",
          caption: "Growth is not a destination, it's a journey. Start yours today. #growth #mindset",
          hashtags: ["#growth", "#success", "#mindset", "#entrepreneur"]
        });
      }, 2000);
    } catch (err) {
      clearInterval(interval);
      setLlmProgress(100);
      setLlmData({ hook: "Generation failed." });
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

      <Header />

      {user ? (
        <div className="container" style={{ paddingTop: "20px" }}>
          {message && (
            <div className={`alert ${message.isError ? "alert-error" : "alert-success"}`}>
              <i className={`fa-solid ${message.isError ? "fa-circle-exclamation" : "fa-circle-check"}`}></i>
              <div>{message.text}</div>
            </div>
          )}

          <div className="action-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "48px" }}>
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
                <button type="submit" className="btn-primary" style={{ background: "linear-gradient(135deg, var(--accent-gold), #fbbf24)" }}>Register Account</button>
              </form>
            </div>

            <div className="card submit-card">
              <h2>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--accent-neon)" }}></i>
                AI Viral Content
              </h2>
              <form onSubmit={handleLlmSubmit}>
                <div className="form-group">
                  <label>Topic</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-lightbulb"></i>
                    <input type="text" name="topic" placeholder="e.g. Mindset for founders" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Goal</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-bullseye"></i>
                    <select name="goal" required>
                      <option value="followers">Followers</option>
                      <option value="views">Views</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary">Generate Strategy</button>
              </form>
            </div>
          </div>

          <div className="section-header" style={{ marginBottom: "24px" }}>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Registered Accounts</h2>
              <div style={{ display: "flex", gap: "12px" }}>
                {["all", "instagram", "tiktok", "twitter", "youtube"].map((p) => (
                  <button 
                    key={p}
                    onClick={() => setCurrentPlatform(p)}
                    style={{ 
                      padding: "6px 12px", borderRadius: "12px", border: "1px solid var(--border)", 
                      background: currentPlatform === p ? "var(--accent-neon)" : "transparent",
                      color: currentPlatform === p ? "#020617" : "white",
                      cursor: "pointer", fontSize: "0.8rem", textTransform: "capitalize"
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="accounts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
            {accounts.length > 0 ? (
              accounts.map((acc) => (
                <div key={acc.id} className="card" style={{ padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "10px", color: "var(--accent-neon)" }}>
                    <i className={`fa-brands fa-${acc.platform.toLowerCase() === "twitter" ? "x-twitter" : acc.platform.toLowerCase()}`}></i>
                  </div>
                  <div style={{ fontWeight: 700 }}>@{acc.account_name}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-soft)", textTransform: "uppercase" }}>{acc.platform}</div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "var(--text-soft)" }}>
                No accounts found. Link one above!
              </div>
            )}
          </div>
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
    </main>
  );
}

function GuestView() {
  return (
    <div className="container">
      <section className="hero" style={{ padding: "120px 0 80px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 900, letterSpacing: "-0.05em", marginBottom: "24px" }}>
          The Future of <span style={{ color: "var(--accent-neon)" }}>Social Automation</span>
        </h1>
        <p style={{ fontSize: "1.25rem", color: "var(--text-soft)", maxWidth: "700px", margin: "0 auto 40px", lineHeight: 1.6 }}>
          Join elite creators and brands. Automate your growth, join high-paying campaigns, and leverage AI to go viral.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <Link href="/signup" className="btn-primary" style={{ padding: "16px 40px", fontSize: "1rem" }}>Start Building</Link>
          <Link href="/promotions" className="btn-header" style={{ padding: "16px 40px", fontSize: "1rem" }}>Browse Campaigns</Link>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "80px" }}>
        <div className="card" style={{ padding: "40px", borderTop: "4px solid var(--accent-neon)" }}>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "16px" }}>For Creators</h2>
          <p style={{ color: "var(--text-soft)", marginBottom: "24px" }}>Get paid for your reach. Join campaigns from top brands and get instant payouts.</p>
          <Link href="/signup?role=creator" style={{ color: "var(--accent-neon)", textDecoration: "none", fontWeight: 700 }}>Get Started &rarr;</Link>
        </div>
        <div className="card" style={{ padding: "40px", borderTop: "4px solid var(--primary)" }}>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "16px" }}>For Brands</h2>
          <p style={{ color: "var(--text-soft)", marginBottom: "24px" }}>Scale your influence. Launch campaigns and hire verified creators in seconds.</p>
          <Link href="/signup?role=brand" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 700 }}>Get Started &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
