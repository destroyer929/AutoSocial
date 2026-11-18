"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import Header from "@/components/Header";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState("all");
  const [isAccountsHidden, setIsAccountsHidden] = useState(false);
  
  // Modals
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [platformMode, setPlatformMode] = useState("all");
  
  // LLM Modal
  const [showLlmModal, setShowLlmModal] = useState(false);
  const [llmPlatformLabel, setLlmPlatformLabel] = useState("");
  const [llmProgress, setLlmProgress] = useState(0);
  const [llmProgressText, setLlmProgressText] = useState("Preparing...");
  const [llmResultPlatform, setLlmResultPlatform] = useState("");
  const [llmScores, setLlmScores] = useState({ hook: "", virality: "" });
  const [llmData, setLlmData] = useState<any>({});
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showGenerateInputModal, setShowGenerateInputModal] = useState(false);

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Form values
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("followers");
  const [platform, setPlatform] = useState("instagram");

  // Link Account values
  const [linkPlatform, setLinkPlatform] = useState("instagram");
  const [accountName, setAccountName] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Campaign Discovery (Guest)
  const [guestPromotions, setGuestPromotions] = useState<any[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestCategory, setGuestCategory] = useState("all");
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (user) {
      apiFetch(`/api/accounts?platform=${currentPlatform}`)
        .then(data => setAccounts(data.accounts || []))
        .catch(err => console.error(err));
    }
  }, [user, currentPlatform]);

  useEffect(() => {
    if (!user) {
      fetchDiscovery();
    }
  }, [user, guestSearch, guestCategory]);

  const fetchDiscovery = async () => {
    try {
      setGuestLoading(true);
      const query = new URLSearchParams();
      if (guestSearch) query.append("q", guestSearch);
      if (guestCategory !== "all") query.append("category", guestCategory);
      
      const res = await apiFetch(`/api/promotions?${query.toString()}`);
      setGuestPromotions(res.promotions || []);
    } catch (err) {
      console.error("Discovery fetch failed:", err);
    } finally {
      setGuestLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (confirm("Delete this account? This removes all stats history.")) {
      try {
        await apiFetch("/api/accounts/delete", {
          method: "POST",
          body: JSON.stringify({ account_id: accountId })
        });
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Campaign created (placeholder for API submit)");
    setShowCampaignModal(false);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkLoading(true);
    setLinkError("");
    try {
      await apiFetch("/api/accounts/register", {
        method: "POST",
        body: JSON.stringify({ platform: linkPlatform, account_name: accountName })
      });
      // Refresh accounts
      const data = await apiFetch(`/api/accounts?platform=${currentPlatform}`);
      setAccounts(data.accounts || []);
      setShowLinkModal(false);
      setAccountName("");
    } catch (err: any) {
      setLinkError(err.message || "Failed to link account");
    } finally {
      setLinkLoading(false);
    }
  };

  // LLM Logic
  const startProgress = () => {
    setLlmProgress(0);
    setLlmProgressText("Preparing...");
    let val = 0;
    progressTimerRef.current = setInterval(() => {
      if (val < 70) val += 3;
      else if (val < 90) val += 1;
      else if (val < 97) val += 0.5;
      
      if (val > 97) val = 97;
      setLlmProgress(val);
      setLlmProgressText(`Generating ${Math.round(val)}%`);
    }, 120);
  };

  const finishProgress = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setLlmProgress(100);
    setLlmProgressText("Ready 100%");
  };

  const handleLlmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowGenerateInputModal(false);
    const platformLabelMap: any = {
      instagram: "Instagram Reels",
      youtube: "YouTube Shorts",
      tiktok: "TikTok",
      twitter: "Twitter / X"
    };
    
    setLlmPlatformLabel(platformLabelMap[platform]);
    setLlmResultPlatform(platform);
    setLlmData({});
    setLlmScores({ hook: "", virality: "" });
    setShowLlmModal(true);
    startProgress();

    try {
      const data = await apiFetch("/api/generate-viral", {
        method: "POST",
        body: JSON.stringify({ topic, audience, goal, platform })
      });
      
      setLlmData(data);
      setLlmScores({ hook: data.hook_score || "", virality: data.virality_score || "" });
      finishProgress();
    } catch (err: any) {
      setLlmData({ error: err.message || "Request failed" });
      finishProgress();
    }
  };

  const closeLlmModal = () => {
    setShowLlmModal(false);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  const renderPlatforms = (platformsStr: string) => {
    if (!platformsStr || platformsStr === 'all') {
      return (
        <span style={{ display: "inline-flex", gap: "6px", marginLeft: "8px" }}>
          <img src="/static/logos/Tiktok_logo.png" alt="TikTok" style={{ height: "14px", width: "14px" }} />
          <img src="/static/logos/YouTube_logo.png" alt="YouTube" style={{ height: "14px", width: "14px" }} />
          <img src="/static/logos/twitter_logo.png" alt="X" style={{ height: "14px", width: "14px" }} />
          <img src="/static/logos/Instagram_logo.png" alt="Instagram" style={{ height: "14px", width: "14px" }} />
        </span>
      );
    }
    const plist = platformsStr.split(',');
    return (
      <span style={{ display: "inline-flex", gap: "6px", marginLeft: "8px" }}>
        {plist.map((plat, idx) => {
          const p = plat.trim();
          if (p === 'instagram') return <img key={idx} src="/static/logos/Instagram_logo.png" alt="Instagram" style={{ height: "14px", width: "14px" }} />;
          if (p === 'youtube') return <img key={idx} src="/static/logos/YouTube_logo.png" alt="YouTube" style={{ height: "14px", width: "14px" }} />;
          if (p === 'tiktok') return <img key={idx} src="/static/logos/Tiktok_logo.png" alt="TikTok" style={{ height: "14px", width: "14px" }} />;
          if (p === 'twitter' || p === 'x') return <img key={idx} src="/static/logos/twitter_logo.png" alt="X" style={{ height: "14px", width: "14px" }} />;
          return null;
        })}
      </span>
    );
  };

  // Typewriter effect component to perfectly mimic vanilla JS implementation
  const TypewriterField = ({ label, id, text }: { label: string, id: string, text: string }) => {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
      if (!text) {
        setDisplayedText("");
        return;
      }
      
      setDisplayedText("");
      let i = 0;
      const timer = setInterval(() => {
        if (i >= text.length) {
          clearInterval(timer);
          return;
        }
        setDisplayedText(prev => prev + (text[i] || ""));
        i++;
      }, 15);
      
      return () => clearInterval(timer);
    }, [text]);

    return (
      <div className="llm-field-box">
        <div className="llm-field-label">{label}</div>
        <div id={id} className="llm-field-value">{displayedText}</div>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        :root {
          /* Unified Premium Tokens */
          --bg: #030712;
          --bg-main: radial-gradient(1200px circle at 10% 10%, #1c2a3a 0%, transparent 40%),
            radial-gradient(1000px circle at 90% 20%, #2d1f3a 0%, transparent 40%),
            linear-gradient(180deg, #0b0f14, #0e141b);
          --surface: rgba(255, 255, 255, 0.03);
          --surface-hover: rgba(255, 255, 255, 0.06);
          --border: rgba(255, 255, 255, 0.08);
          --glass-bg: rgba(255, 255, 255, 0.06);
          --glass-border: rgba(255, 255, 255, 0.15);
          --text-main: #ffffff;
          --text-soft: #9ca3af;
          --accent-neon: #6cf2d5;
          --accent-gold: #f5d28b;
          --neon: #6cf2d5;
          --neon-glow: rgba(108, 242, 213, 0.3);
          --primary: #6366f1;
          --primary-glow: rgba(99, 102, 241, 0.3);
          --danger: #ef4444;
          --success: #10b981;
          --warning: #f59e0b;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: var(--bg-main);
          color: var(--text-main);
          line-height: 1.5;
          padding-bottom: 60px;
          -webkit-font-smoothing: antialiased;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        /* HEADER – match analytics tone */

        header {
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: linear-gradient(180deg, rgba(5, 10, 18, 0.96), rgba(5, 10, 18, 0.9));
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          margin-bottom: 0;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .logo-block {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          line-height: 1.2;
        }

        .logo-main {
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-main i {
          color: var(--accent-neon);
          font-size: 1.1rem;
        }

        .logo-sub {
          font-size: 0.85rem;
          color: var(--text-soft);
          font-weight: 400;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-header {
          background: var(--glass-bg);
          color: var(--text-main);
          border: 1px solid var(--glass-border);
          padding: 8px 16px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease, background .25s ease, color .25s ease;
          cursor: pointer;
        }

        .btn-header i {
          font-size: 0.95rem;
        }

        .btn-header:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, .6);
          border-color: rgba(255, 255, 255, 0.26);
          background: rgba(0, 0, 0, 0.6);
        }

        .btn-logout:hover {
          border-color: rgba(239, 68, 68, 0.6);
          color: #fee2e2;
          background: rgba(127, 29, 29, 0.4);
        }

        @media (max-width: 640px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        /* ALERTS */
        .alert {
          padding: 14px 16px;
          border-radius: 14px;
          margin-bottom: 24px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          border: 1px solid var(--glass-border);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          box-shadow: 0 24px 60px rgba(0, 0, 0, .65);
        }

        .alert-success {
          border-color: rgba(16, 185, 129, 0.45);
          color: #bbf7d0;
        }

        .alert-error {
          border-color: rgba(239, 68, 68, 0.5);
          color: #fecaca;
        }

        .alert i {
          font-size: 1.05rem;
        }

        /* ACTION CARDS */
        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .card {
          position: relative;
          background: linear-gradient(180deg, rgba(255, 255, 255, .08), rgba(255, 255, 255, .02));
          border-radius: 22px;
          padding: 24px 24px 22px;
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(26px);
          -webkit-backdrop-filter: blur(26px);
          box-shadow: 0 30px 80px rgba(0, 0, 0, .65);
          overflow: hidden;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }

        .card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(420px circle at top left, rgba(255, 255, 255, .16), transparent 50%);
          pointer-events: none;
        }

        .card.submit-card { border-top: 3px solid var(--accent-neon); }
        .card.link-card { border-top: 3px solid var(--accent-gold); }

        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 40px 100px rgba(0, 0, 0, .75);
          border-color: rgba(255, 255, 255, 0.22);
        }

        .card h2 {
          position: relative;
          font-size: 1.15rem;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .card h2 i { font-size: 1.1rem; }

        /* BIG ACTION CARDS */
        .big-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
          margin-bottom: 50px;
        }

        .big-action-card {
          background: linear-gradient(145deg, rgba(255, 255, 255, .08), rgba(255, 255, 255, .03));
          border-radius: 28px;
          padding: 40px;
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0, 0, 0, .6);
        }

        .big-action-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.08), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .big-action-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: var(--accent-neon);
          box-shadow: 0 45px 110px rgba(0, 0, 0, .8);
        }

        .big-action-card:hover::before {
          opacity: 1;
        }

        .big-action-icon {
          width: 80px;
          height: 80px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          margin-bottom: 24px;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 15px 35px rgba(0, 0, 0, .5);
          transition: transform 0.3s ease;
        }

        .big-action-card:hover .big-action-icon {
          transform: rotate(-5deg) scale(1.1);
        }

        .big-action-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .big-action-desc {
          font-size: 0.95rem;
          color: var(--text-soft);
          line-height: 1.6;
          max-width: 300px;
        }

        /* FORM ELEMENTS */
        .form-group {
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }

        label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-soft);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper i {
          position: absolute;
          left: 14px;
          color: #7c8796;
          pointer-events: none;
          transition: color .2s ease;
          font-size: 0.95rem;
        }

        select, input, textarea {
          width: 100%;
          padding: 11px 12px 11px 40px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          font-family: inherit;
          font-size: 0.92rem;
          color: var(--text-main);
          background: rgba(6, 10, 17, 0.92);
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease, color .2s ease;
          appearance: none;
        }

        textarea {
          padding-top: 10px;
          padding-bottom: 10px;
          resize: vertical;
          min-height: 42px;
        }

        select:focus, input:focus, textarea:focus {
          outline: none;
          border-color: var(--accent-neon);
          box-shadow: 0 0 0 1px rgba(108, 242, 213, 0.6);
          background: rgba(6, 10, 17, 1);
        }

        .input-wrapper:focus-within i {
          color: var(--accent-neon);
        }

        .btn-primary {
          width: 100%;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #020617;
          border: none;
          padding: 12px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
          margin-top: 10px;
          font-size: 0.95rem;
          box-shadow: 0 22px 50px rgba(0, 0, 0, .75);
          position: relative;
          z-index: 1;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #4dd0e1, var(--accent-neon));
          box-shadow: 0 30px 70px rgba(0, 0, 0, .9);
          transform: translateY(-1px);
        }

        .btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 18px 40px rgba(0, 0, 0, .8);
        }

        .btn-green {
          background: linear-gradient(135deg, var(--success), #059669);
          color: #ecfdf5;
          box-shadow: 0 22px 50px rgba(6, 95, 70, .7);
        }

        .btn-green:hover {
          background: linear-gradient(135deg, #059669, var(--success));
        }

        /* SECTION HEADER + FILTERS */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-title h2 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .btn-toggle {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: var(--text-soft);
          padding: 8px 14px;
          border-radius: 999px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background .2s ease, color .2s ease, border-color .2s ease, transform .15s ease;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .btn-toggle:hover {
          border-color: rgba(255, 255, 255, 0.3);
          color: #ffffff;
          background: rgba(0, 0, 0, 0.5);
          transform: translateY(-1px);
        }

        .filter-bar {
          background: var(--glass-bg);
          padding: 6px;
          border-radius: 999px;
          display: inline-flex;
          gap: 4px;
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 24px 60px rgba(0, 0, 0, .75);
        }

        .filter-btn {
          padding: 8px 18px;
          border-radius: 999px;
          text-decoration: none;
          color: var(--text-soft);
          font-weight: 500;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background .2s ease, color .2s ease, box-shadow .2s ease, transform .12s ease;
          min-width: 34px;
          cursor: pointer;
          border: none;
          background: transparent;
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .filter-btn.active {
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #020617;
          box-shadow: 0 18px 40px rgba(0, 0, 0, .8);
          transform: translateY(-1px);
        }

        /* ACCOUNTS GRID */
        .accounts-wrapper {
          transition: max-height 0.4s ease-out, opacity 0.4s ease-out, margin-top 0.3s ease-out;
          overflow: hidden;
        }

        .accounts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
          padding-bottom: 16px;
        }

        .account-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, .07), rgba(255, 255, 255, .02));
          border-radius: 18px;
          padding: 22px 20px 20px;
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          transition: 0.2s ease;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 28px 80px rgba(0, 0, 0, .7);
        }

        .account-card:hover {
          box-shadow: 0 36px 100px rgba(0, 0, 0, .85);
          border-color: rgba(255, 255, 255, 0.22);
          transform: translateY(-2px);
          background: linear-gradient(180deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .03));
        }

        .platform-badge {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.45rem;
          color: #ffffff;
          margin-bottom: 12px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, .75);
        }

        .bg-instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
        .bg-tiktok { background: #000000; }
        .bg-twitter { background: #1DA1F2; }
        .bg-youtube { background: #FF0000; }

        .acc-username {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 2px;
          color: #ffffff;
        }

        .acc-platform {
          font-size: 0.72rem;
          color: var(--text-soft);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.14em;
        }

        .btn-delete-icon {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(248, 113, 113, 0.12);
          border: 1px solid rgba(248, 113, 113, 0.4);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fecaca;
          cursor: pointer;
          opacity: 0;
          transition: 0.2s ease;
          font-size: 0.78rem;
        }

        .account-card:hover .btn-delete-icon {
          opacity: 1;
        }

        .btn-delete-icon:hover {
          background: var(--danger);
          color: #fef2f2;
          transform: translateY(-1px);
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: var(--text-soft);
          background: linear-gradient(180deg, rgba(255, 255, 255, .06), rgba(255, 255, 255, .02));
          border-radius: 18px;
          border: 1px dashed rgba(255, 255, 255, .22);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 30px 90px rgba(0, 0, 0, .8);
        }

        .empty-state i {
          font-size: 2.4rem;
          margin-bottom: 12px;
          color: rgba(203, 213, 225, 0.9);
        }

        /* MODALS */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 10, 18, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 1000;
        }

        .modal {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.98));
          padding: 32px 26px 26px;
          border-radius: 20px;
          max-width: 450px;
          width: 90%;
          text-align: center;
          box-shadow: 0 40px 100px rgba(0, 0, 0, .9);
          border: 1px solid rgba(255, 255, 255, 0.18);
          animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes popIn {
          0% { transform: scale(0.94); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* DROPDOWN */
        .nav-dropdown-content {
          display: none;
          position: absolute;
          top: 100%;
          right: 0;
          background: transparent;
          min-width: 220px;
          z-index: 1000;
          padding-top: 12px;
          transform-origin: top right;
          animation: dropdownIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nav-dropdown-inner {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          overflow: hidden;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.85);
          padding: 8px;
        }

        .nav-dropdown:hover .nav-dropdown-content {
          display: block;
        }

        .dropdown-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: var(--text-soft);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .dropdown-link:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }

        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .llm-field-box {
          background: #020617;
          border-radius: 10px;
          padding: 10px;
          border: 1px solid #1f2937;
        }

        .llm-field-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #9ca3af;
        }

        .llm-field-value {
          margin-top: 4px;
          color: #e5e7eb;
          font-size: 0.9rem;
        }
        
        /* Campaign Modal specific */
        .campaign-form-scroll {
          overflow-y: auto;
          max-height: 60vh;
          padding-right: 4px;
        }
        .campaign-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid rgba(148, 163, 184, 0.35);
          flex-shrink: 0;
        }
        .btn-secondary {
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: rgba(15, 23, 42, 0.9);
          color: var(--text-soft);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .btn-secondary:hover {
          background: rgba(15, 23, 42, 1);
          border-color: rgba(255, 255, 255, 0.3);
          color: #e5e7eb;
        }
        .modal-close {
          position: absolute;
          top: 10px;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-soft);
          cursor: pointer;
          font-size: 0.9rem;
          padding: 4px;
          border-radius: 999px;
          transition: all 0.18s ease;
        }
        .modal-close:hover {
          background: rgba(15, 23, 42, 0.9);
          color: #e5e7eb;
        }
        .platform-custom-group { margin-top: 8px; }
        .platform-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .platform-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          padding: 4px 10px;
          font-size: 0.78rem;
          color: #e5e7eb;
          cursor: pointer;
          background: rgba(15, 23, 42, 0.9);
        }
        .platform-chip input { display: none; }
        .platform-chip span { display: inline-flex; align-items: center; gap: 6px; }
        .platform-chip input:checked+span {
          color: #0f172a;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          border-radius: 999px;
          padding: 3px 9px;
        }
      `}</style>

      <header>
        <div className="header-content">
          <div className="logo-block">
            <div className="logo-main">
              <i className="fa-solid fa-robot"></i>
              AutoSocial
            </div>
            <div className="logo-sub">{user?.email ? user.email.split('@')[0] : 'Marketing'}</div>
          </div>

          <div className="header-actions">
            {user ? (
              <>
                <Link href="/stats" className="btn-header"><i className="fa-solid fa-chart-pie"></i> Analytics</Link>
                <Link href="/create-campaign" className="btn-header">
                  <i className="fa-solid fa-flag"></i> Create Campaign
                </Link>
                <div className="nav-dropdown" style={{ position: "relative", display: "inline-block" }}>
                  <button className="btn-header">
                    <i className="fa-solid fa-folder-open"></i> My Promotions
                    <i className="fa-solid fa-chevron-down" style={{ fontSize: "0.7rem", marginLeft: "6px" }}></i>
                  </button>
                  <div className="nav-dropdown-content">
                    <div className="nav-dropdown-inner">
                      <Link href="/my-promotions?tab=created" className="dropdown-link">
                        <i className="fa-solid fa-folder-plus"></i> Campaigns Created
                      </Link>
                      <Link href="/my-promotions?tab=joined" className="dropdown-link">
                        <i className="fa-solid fa-users"></i> Campaigns Joined
                      </Link>
                    </div>
                  </div>
                </div>
                <Link href="/promotions" className="btn-header"><i className="fa-solid fa-bullhorn"></i> Promotions</Link>
                <Link href="/" className="btn-header btn-logout" onClick={async (e) => {
                  e.preventDefault();
                  await logout();
                  window.location.href = "/";
                }}><i className="fa-solid fa-right-from-bracket"></i> Logout</Link>
              </>
            ) : (
              <>
                <Link href="#" className="btn-header">Home</Link>
                <Link href="#paths" className="btn-header">Creators</Link>
                <Link href="#paths" className="btn-header">Brands</Link>
                <Link href="/login" className="btn-header">Log In</Link>
                <Link href="/signup" className="btn-header" style={{ background: "var(--neon)", color: "#020617", fontWeight: 700, border: "none", padding: "8px 20px", borderRadius: "999px", textDecoration: "none" }}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {user && (
        <div className="container" style={{ paddingTop: "120px" }}>
          
          <div className="big-action-grid">
            <div className="big-action-card" onClick={() => setShowLinkModal(true)}>
              <div className="big-action-icon" style={{ color: "var(--accent-gold)", background: "rgba(245, 210, 139, 0.1)" }}>
                <i className="fa-solid fa-user-plus"></i>
              </div>
              <div className="big-action-title">Link Account</div>
              <div className="big-action-desc">Connect your Instagram, TikTok, YouTube or X accounts to track stats.</div>
            </div>

            <div className="big-action-card" onClick={() => setShowGenerateInputModal(true)}>
              <div className="big-action-icon" style={{ color: "var(--accent-neon)", background: "rgba(108, 242, 213, 0.1)" }}>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <div className="big-action-title">Generate Viral Content</div>
              <div className="big-action-desc">Use AI to create high-performing hooks, captions and tags for your niche.</div>
            </div>
          </div>

          <div className="section-header">
            <div className="section-title">
              <h2>Registered Accounts</h2>
              <button onClick={() => setIsAccountsHidden(!isAccountsHidden)} className="btn-toggle">
                {isAccountsHidden ? <><i className="fa-solid fa-eye"></i> Show</> : <><i className="fa-solid fa-eye-slash"></i> Hide</>}
              </button>
            </div>

            <div className="filter-bar">
              <button onClick={() => setCurrentPlatform("all")} className={`filter-btn ${currentPlatform === "all" ? "active" : ""}`}>All</button>
              <button onClick={() => setCurrentPlatform("instagram")} className={`filter-btn ${currentPlatform === "instagram" ? "active" : ""}`}>
                <i className="fa-brands fa-instagram"></i>
              </button>
              <button onClick={() => setCurrentPlatform("tiktok")} className={`filter-btn ${currentPlatform === "tiktok" ? "active" : ""}`}>
                <i className="fa-brands fa-tiktok"></i>
              </button>
              <button onClick={() => setCurrentPlatform("twitter")} className={`filter-btn ${currentPlatform === "twitter" ? "active" : ""}`}>
                <i className="fa-brands fa-x-twitter"></i>
              </button>
              <button onClick={() => setCurrentPlatform("youtube")} className={`filter-btn ${currentPlatform === "youtube" ? "active" : ""}`}>
                <i className="fa-brands fa-youtube"></i>
              </button>
            </div>
          </div>

          <div 
            className="accounts-wrapper" 
            style={{ 
              maxHeight: isAccountsHidden ? "0px" : "1000px", 
              opacity: isAccountsHidden ? 0 : 1,
              marginTop: isAccountsHidden ? "-10px" : "0px"
            }}
          >
            <div className="accounts-grid">
              {accounts.length > 0 ? accounts.map(acc => (
                <div key={acc.id} className="account-card">
                  <div className={`platform-badge bg-${acc.platform.toLowerCase()}`}>
                    {acc.platform.toLowerCase() === 'instagram' && <i className="fa-brands fa-instagram"></i>}
                    {acc.platform.toLowerCase() === 'tiktok' && <i className="fa-brands fa-tiktok"></i>}
                    {acc.platform.toLowerCase() === 'twitter' && <i className="fa-brands fa-x-twitter"></i>}
                    {acc.platform.toLowerCase() === 'youtube' && <i className="fa-brands fa-youtube"></i>}
                  </div>
                  <div className="acc-username">@{acc.account_name}</div>
                  <div className="acc-platform">{acc.platform}</div>

                  <button onClick={() => handleDeleteAccount(acc.id)} className="btn-delete-icon" title="Remove Account">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              )) : (
                <div className="empty-state">
                  <i className="fa-solid fa-ghost"></i>
                  <p>No accounts found matching this filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          {/* Hero Section */}
          <section className="hero" style={{ padding: "80px 0 100px", display: "flex", alignItems: "center", gap: "60px", flexWrap: "wrap" }}>
            <div className="hero-text" style={{ flex: 1, minWidth: "300px" }}>
              <div className="hero-badge"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, color: "var(--neon)", marginBottom: "24px" }}>
                <i className="fa-solid fa-bolt"></i> V3.0 Now Live
              </div>
              <h1
                style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: "24px", background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Earn by Creating.<br />Grow with AI.</h1>
              <p style={{ fontSize: "1.125rem", color: "var(--text-soft)", marginBottom: "40px", maxWidth: "500px" }}>Join global
                campaigns, get paid for your content, and grow faster using our AI-powered viral prediction tools.</p>
              <div className="hero-btns" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <Link href="/signup" className="btn-header"
                  style={{ padding: "14px 32px", background: "linear-gradient(135deg, var(--primary), #818cf8)", color: "white", border: "none", borderRadius: "12px", textDecoration: "none", fontWeight: 700 }}>Get
                  Started Free</Link>
                <Link href="/promotions" className="btn-header"
                  style={{ padding: "14px 32px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-main)", borderRadius: "12px", textDecoration: "none", fontWeight: 600 }}>Explore
                  Campaigns</Link>
              </div>
            </div>
            <div className="hero-visual" style={{ flex: 1.2, position: "relative", minWidth: "300px" }}>
              <div className="mockup-container"
                style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: "24px", padding: "8px", border: "1px solid var(--border)", boxShadow: "0 40px 100px rgba(0,0,0,0.6)", transform: "perspective(1000px) rotateY(-10deg) rotateX(5deg)" }}>
                <img src="/static/autosocial_hero_mockup.png"
                  style={{ width: "100%", height: "auto", borderRadius: "18px", display: "block" }} alt="Dashboard Mockup" />
              </div>
            </div>
          </section>
          
          {/* Campaign Discovery Section */}
          <section id="discovery" style={{ padding: "80px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ textAlign: "center", marginBottom: "50px" }}>
              <h2 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "16px" }}>Explore Campaigns</h2>
              <p style={{ color: "var(--text-soft)", fontSize: "1.1rem" }}>Find the perfect campaign to showcase your creativity.</p>
            </div>

            {/* Integrated Search & Category Hub */}
            <div style={{ maxWidth: "900px", margin: "0 auto 50px", position: "relative" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center",
                background: "rgba(15, 23, 42, 0.7)", 
                padding: "10px", 
                borderRadius: "24px", 
                border: "1px solid var(--border)", 
                backdropFilter: "blur(20px)", 
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                marginBottom: "30px"
              }}>
                {/* Category Dropdown Prefix */}
                <div style={{ position: "relative", borderRight: "1px solid var(--border)", paddingRight: "10px", marginRight: "10px" }}>
                  <select 
                    value={guestCategory}
                    onChange={(e) => setGuestCategory(e.target.value)}
                    style={{ 
                      background: "transparent", 
                      color: "var(--neon)", 
                      border: "none", 
                      borderRadius: "12px", 
                      padding: "10px 30px 10px 15px", 
                      outline: "none", 
                      cursor: "pointer",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      appearance: "none",
                      width: "160px"
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
                  <i className="fa-solid fa-chevron-down" style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--neon)", pointerEvents: "none" }}></i>
                </div>

                {/* Search Input Area */}
                <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", color: "var(--text-soft)" }}></i>
                  <input 
                    type="text" 
                    placeholder="Search by campaign name, brand, or title..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "12px 12px 12px 40px", 
                      background: "transparent", 
                      border: "none", 
                      color: "white", 
                      outline: "none", 
                      fontSize: "1.1rem" 
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && fetchDiscovery()}
                  />
                </div>

                <button 
                  onClick={fetchDiscovery}
                  style={{ 
                    background: "linear-gradient(135deg, var(--neon), #4dd0e1)", 
                    color: "#020617", 
                    border: "none", 
                    borderRadius: "16px", 
                    padding: "12px 32px", 
                    fontWeight: 800, 
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  Explore
                </button>
              </div>

              {/* Quick Filter Pills (Optional but helpful) */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { id: "all", label: "All", icon: "fa-border-all" },
                  { id: "podcasts", label: "Podcasts", icon: "fa-podcast" },
                  { id: "gaming", label: "Gaming", icon: "fa-gamepad" },
                  { id: "tech", label: "Tech", icon: "fa-microchip" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setGuestCategory(cat.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: "1px solid",
                      borderColor: guestCategory === cat.id ? "var(--neon)" : "var(--border)",
                      background: guestCategory === cat.id ? "rgba(108, 242, 213, 0.1)" : "var(--surface)",
                      color: guestCategory === cat.id ? "var(--neon)" : "var(--text-soft)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <i className={`fa-solid ${cat.icon}`}></i>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Grid */}
            {guestLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)" }}>Loading campaigns...</div>
            ) : guestPromotions.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                {guestPromotions.map(promo => (
                  <Link key={promo.id} href={`/promotion-detail?id=${promo.id}`} className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.2s ease", textDecoration: "none" }}>
                    <div style={{ height: "180px", background: promo.image_path ? `url(${promo.image_path}) center/cover` : "linear-gradient(135deg, #1e293b, #0f172a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                       {!promo.image_path && <i className="fa-solid fa-bullhorn" style={{ fontSize: "3rem", opacity: 0.2 }}></i>}
                    </div>
                    <div style={{ padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>{promo.campaign_title || promo.name}</h3>
                        <span style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(108, 242, 213, 0.1)", color: "var(--neon)", borderRadius: "999px", border: "1px solid var(--neon)" }}>
                          {promo.campaign_type || "Campaign"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: "16px" }}>
                        <strong>Platforms:</strong> {renderPlatforms(promo.platforms)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--accent-gold)" }}>${promo.budget || 0} Budget</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--neon)" }}>View Details <i className="fa-solid fa-arrow-right"></i></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)", background: "var(--surface)", borderRadius: "20px" }}>
                No campaigns found matching your criteria.
              </div>
            )}
          </section>

          {/* Two Paths */}
          <div id="paths" style={{ padding: "100px 0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
              <div className="card" style={{ padding: "60px", borderTop: "4px solid var(--neon)" }}>
                <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "16px" }}>For Creators</h2>
                <ul style={{ listStyle: "none", marginBottom: "40px" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i
                    className="fa-solid fa-check" style={{ color: "var(--neon)" }}></i> Browse & join campaigns</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i
                    className="fa-solid fa-check" style={{ color: "var(--neon)" }}></i> Predict virality with AI</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i
                    className="fa-solid fa-check" style={{ color: "var(--neon)" }}></i> Secure wallet for payouts</li>
                </ul>
                <Link href="/signup?role=creator" className="btn-header"
                  style={{ background: "var(--neon)", color: "#020617", width: "100%", textAlign: "center", fontWeight: 800, borderRadius: "12px", textDecoration: "none", padding: "16px", display: "block" }}>Start
                  as Creator</Link>
              </div>
              <div className="card" style={{ padding: "60px", borderTop: "4px solid var(--primary)" }}>
                <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "16px" }}>For Brands</h2>
                <ul style={{ listStyle: "none", marginBottom: "40px" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i
                    className="fa-solid fa-check" style={{ color: "var(--primary)" }}></i> Post custom campaigns</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i
                    className="fa-solid fa-check" style={{ color: "var(--primary)" }}></i> Hire top creators instantly</li>
                  <li style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "var(--text-soft)" }}><i
                    className="fa-solid fa-check" style={{ color: "var(--primary)" }}></i> Real-time ROI analytics</li>
                </ul>
                <Link href="/signup?role=brand" className="btn-header"
                  style={{ background: "var(--primary)", color: "white", width: "100%", textAlign: "center", fontWeight: 800, borderRadius: "12px", textDecoration: "none", padding: "16px", display: "block" }}>Start
                  as Brand</Link>
              </div>
            </div>
          </div>

          {/* Chat Feature */}
          <section style={{ padding: "100px 0", display: "flex", alignItems: "center", gap: "80px", flexWrap: "wrap-reverse" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: "300px" }}>
              <div className="card" style={{ padding: "16px 20px", borderRadius: "20px", maxWidth: "80%" }}>
                <strong>@Nike_Brand</strong>
                <p>Hey! Loved your last reel. Would you like to join our upcoming marathon campaign?</p>
              </div>
              <div className="card"
                style={{ padding: "16px 20px", marginLeft: "auto", background: "var(--neon-glow)", borderColor: "var(--neon)", maxWidth: "80%", borderRadius: "20px" }}>
                <strong>@Creator_Star</strong>
                <p>I'm in! Let's discuss the hooks. Should I use the high-energy AI suggestion?</p>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "300px" }}>
              <h2 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "16px" }}>Collaborate in Real-Time</h2>
              <p style={{ color: "var(--text-soft)", fontSize: "1.1rem", marginBottom: "24px" }}>No more messy email threads. Discuss
                content ideas, get faster approvals, and build lasting relationships through our integrated chat system.</p>
            </div>
          </section>
        </div>
      )}

      <footer
        style={{ padding: "60px 0", borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--text-soft)", fontSize: "0.9rem" }}>
        <p>&copy; 2026 AutoSocial Platform. All rights reserved.</p>
      </footer>

      {/* Link Account Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <button className="modal-close" onClick={() => setShowLinkModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", color: "#fff" }}>
              <i className="fa-solid fa-user-plus" style={{ color: "var(--accent-gold)" }}></i>
              Link New Account
            </h2>
            <form onSubmit={handleLinkSubmit} style={{ textAlign: "left" }}>
              <div className="form-group">
                <label>Platform</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-mobile-screen"></i>
                  <select value={linkPlatform} onChange={e => setLinkPlatform(e.target.value)} required>
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
                  <input 
                    type="text" 
                    value={accountName} 
                    onChange={e => setAccountName(e.target.value)} 
                    placeholder="username (no @)" 
                    required 
                  />
                </div>
              </div>
              {linkError && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginBottom: "12px" }}>{linkError}</p>}
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "10px" }} disabled={linkLoading}>
                {linkLoading ? "Registering..." : "Register Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Generate Input Modal */}
      {showGenerateInputModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateInputModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <button className="modal-close" onClick={() => setShowGenerateInputModal(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", color: "#fff" }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--accent-neon)" }}></i>
              Generate Content
            </h2>
            <form onSubmit={handleLlmSubmit} style={{ textAlign: "left" }}>
              <div className="form-group">
                <label>Topic</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-lightbulb"></i>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Mindset for young entrepreneurs" required />
                </div>
              </div>

              <div className="form-group">
                <label>Audience</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-users"></i>
                  <input type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. 18–24 founders on Instagram" required />
                </div>
              </div>

              <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Goal</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-bullseye"></i>
                    <select value={goal} onChange={e => setGoal(e.target.value)} required>
                      <option value="followers">Followers</option>
                      <option value="views">Views</option>
                      <option value="reach">Reach</option>
                      <option value="saves">Saves</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>Platform</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-layer-group"></i>
                    <select value={platform} onChange={e => setPlatform(e.target.value)} required>
                      <option value="instagram">Instagram Reels</option>
                      <option value="youtube">YouTube Shorts</option>
                      <option value="tiktok">TikTok</option>
                      <option value="twitter">Twitter / X</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "14px" }}>
                Generate Package
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LLM Modal */}
      {showLlmModal && (
        <div className="modal-overlay">
          <div className="modal" style={{
            maxWidth: "720px", width: "95%", textAlign: "left", padding: "26px 26px 22px",
            background: "radial-gradient(circle at top left, rgba(148,163,184,0.14), transparent 55%), radial-gradient(circle at bottom right, rgba(56,189,248,0.18), transparent 55%), linear-gradient(160deg, rgba(15,23,42,0.96), rgba(15,23,42,0.99))",
            borderRadius: "22px", border: "1px solid rgba(148,163,184,0.55)", boxShadow: "0 40px 120px rgba(0,0,0,0.95)",
            backdropFilter: "blur(26px)", position: "relative", overflow: "hidden"
          }}>
            <div style={{
              position: "absolute", inset: "-40%", opacity: 0.18, pointerEvents: "none", mixBlendMode: "screen",
              background: "radial-gradient(circle at 10% 0%, rgba(45,212,191,0.8), transparent 55%), radial-gradient(circle at 90% 100%, rgba(94,234,212,0.7), transparent 55%)"
            }}></div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(148,163,184,0.9)", marginBottom: "4px" }}>
                    Viral content package
                  </div>
                  <h3 style={{ fontSize: "1.12rem", color: "#f9fafb", margin: 0, display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    Generated Package
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.16em", padding: "3px 8px", borderRadius: "999px", border: "1px solid rgba(148,163,184,0.45)", color: "#e5e7eb", background: "rgba(15,23,42,0.8)" }}>
                      {llmPlatformLabel}
                    </span>
                  </h3>
                </div>
                <button type="button" onClick={closeLlmModal} className="modal-close" style={{ position: "static" }}>
                  <i className="fa-solid fa-xmark"></i> <span style={{ fontSize: "0.78rem" }}>Close</span>
                </button>
              </div>

              <div style={{ height: "1px", width: "100%", marginBottom: "12px", background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.6), transparent)" }}></div>

              <div style={{ marginBottom: "14px", width: "100%" }}>
                <div style={{ width: "100%", height: "4px", borderRadius: "999px", background: "rgba(15,23,42,0.9)", overflow: "hidden", border: "1px solid rgba(148,163,184,0.4)" }}>
                  <div style={{ height: "100%", width: `${llmProgress}%`, borderRadius: "999px", background: "linear-gradient(90deg,#22c55e,#a3e635,#facc15)", boxShadow: "0 0 14px rgba(190,242,100,0.7)", transition: "width 0.15s linear" }}></div>
                </div>
                <div style={{ marginTop: "6px", fontSize: "0.74rem", color: "#9ca3af", textAlign: "right", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  {llmProgressText}
                </div>
              </div>

              {llmData.error && (
                <div className="llm-field-box">
                  <div className="llm-field-label">Error</div>
                  <div className="llm-field-value">{llmData.error}</div>
                </div>
              )}

              {llmResultPlatform === "instagram" && !llmData.error && (
                <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
                  <TypewriterField label="Hook" id="m-hook" text={llmData.hook || ""} />
                  <TypewriterField label="Caption" id="m-caption" text={llmData.caption || ""} />
                  <TypewriterField label="Description" id="m-description" text={llmData.description || ""} />
                  <TypewriterField label="CTA" id="m-cta" text={llmData.cta || ""} />
                  <TypewriterField label="Hashtags" id="m-hashtags" text={(llmData.hashtags || []).join(" ")} />
                </div>
              )}

              {llmResultPlatform === "youtube" && !llmData.error && (
                <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
                  <TypewriterField label="Title" id="m-title" text={llmData.title || ""} />
                  <TypewriterField label="Description" id="m-yt-description" text={llmData.yt_description || ""} />
                  <TypewriterField label="Tags" id="m-yt-tags" text={(llmData.yt_tags || []).join(", ")} />
                </div>
              )}

              {llmResultPlatform === "tiktok" && !llmData.error && (
                <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
                  <TypewriterField label="Caption" id="m-tiktok-caption" text={llmData.tiktok_caption || ""} />
                  <TypewriterField label="Hashtags" id="m-tiktok-hashtags" text={(llmData.tiktok_hashtags || []).join(" ")} />
                </div>
              )}

              {llmResultPlatform === "twitter" && !llmData.error && (
                <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
                  <TypewriterField label="Tweet" id="m-tweet-text" text={llmData.tweet_text || ""} />
                  <TypewriterField label="Hashtags" id="m-tweet-hashtags" text={(llmData.tweet_hashtags || []).join(" ")} />
                </div>
              )}

              <div style={{ marginTop: "6px", display: "flex", gap: "12px", fontSize: "0.82rem", color: "#9ca3af", alignItems: "center", flexWrap: "wrap" }}>
                <div><span style={{ opacity: 0.8 }}>Hook Score</span>: <span style={{ color: "#a5f3fc" }}>{llmScores.hook}</span>/10</div>
                <div><span style={{ opacity: 0.8 }}>Virality</span>: <span style={{ color: "#bef264" }}>{llmScores.virality}</span>/100</div>
                <div style={{ marginLeft: "auto", fontSize: "0.78rem", padding: "3px 8px", borderRadius: "999px", border: "1px solid rgba(148,163,184,0.4)", background: "rgba(15,23,42,0.92)" }}>
                  <i className="fa-solid fa-bolt-lightning" style={{ color: "#fde68a", marginRight: "6px" }}></i>
                  <span style={{ color: "#e5e7eb" }}>LLM Generated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="modal-overlay">
          <div className="modal campaign-modal" style={{ textAlign: "left", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <button type="button" onClick={() => setShowCampaignModal(false)} className="modal-close">
              <i className="fa-solid fa-xmark"></i>
            </button>

            <h3 className="campaign-title">Create Campaign</h3>
            <p className="campaign-subtitle">Set up a campaign influencers will love to work with.</p>

            <form onSubmit={handleCampaignSubmit}>
              <div className="campaign-form-scroll">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-heading"></i>
                    <input type="text" name="title" required placeholder="Campaign name" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-align-left"></i>
                    <textarea name="description" rows={3} placeholder="Describe what this campaign is about"></textarea>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Platforms</label>
                  <div className="input-wrapper">
                    <i className="fa-brands fa-square-instagram"></i>
                    <select name="platform_mode" value={platformMode} onChange={(e) => setPlatformMode(e.target.value)}>
                      <option value="all">All platforms</option>
                      <option value="custom">Select specific platforms</option>
                    </select>
                  </div>

                  {platformMode === "custom" && (
                    <div className="platform-custom-group">
                      <div className="platform-chip-row">
                        <label className="platform-chip">
                          <input type="checkbox" name="platforms" value="instagram" />
                          <span><i className="fa-brands fa-instagram"></i> Instagram</span>
                        </label>
                        <label className="platform-chip">
                          <input type="checkbox" name="platforms" value="youtube" />
                          <span><i className="fa-brands fa-youtube"></i> YouTube</span>
                        </label>
                        <label className="platform-chip">
                          <input type="checkbox" name="platforms" value="tiktok" />
                          <span><i className="fa-brands fa-tiktok"></i> TikTok</span>
                        </label>
                        <label className="platform-chip">
                          <input type="checkbox" name="platforms" value="twitter" />
                          <span><i className="fa-brands fa-x-twitter"></i> Twitter</span>
                        </label>
                      </div>
                      <small className="form-hint">Choose one or more platforms when using "Select specific platforms".</small>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Type</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-layer-group"></i>
                    <select name="campaign_type" required>
                      <option value="podcasts">Podcasts</option>
                      <option value="irl-content">IRL Content</option>
                      <option value="sport">Sport</option>
                      <option value="gaming">Gaming</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="fashion">Fashion</option>
                      <option value="tech">Tech</option>
                      <option value="finance">Finance</option>
                      <option value="brands">Brands</option>
                      <option value="others">Others</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Budget (USD)</label>
                  <div className="input-wrapper">
                    <i className="fa-solid fa-dollar-sign"></i>
                    <input type="number" name="budget" min="0" step="0.01" placeholder="Enter total budget e.g. 500" required />
                  </div>
                </div>
              </div>

              <div className="campaign-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCampaignModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
