"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [campaignType, setCampaignType] = useState("gaming");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "youtube", "instagram", "twitter"]);
  const [joinPolicy, setJoinPolicy] = useState("automatic");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("budget", budget || "0");
    formData.append("campaign_type", campaignType);
    formData.append("platforms", platforms.join(","));
    formData.append("join_policy", joinPolicy);
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/campaigns/create", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        router.push(`/promotion-detail?id=${data.promotion_id}&msg=Campaign+Created+Successfully`);
      } else {
        setError(data.error || "Failed to create campaign");
      }
    } catch (err) {
      setError("System error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-main: radial-gradient(1200px circle at 10% 10%, #1c2a3a 0%, transparent 40%),
                     radial-gradient(1000px circle at 90% 20%, #2d1f3a 0%, transparent 40%),
                     linear-gradient(180deg, #0b0f14, #0e141b);
          --glass-bg: rgba(255, 255, 255, 0.03);
          --glass-border: rgba(255, 255, 255, 0.1);
          --accent-neon: #6cf2d5;
          --text-main: #ffffff;
          --text-soft: #94a3b8;
        }

        body {
          background: var(--bg-main);
          color: var(--text-main);
          font-family: 'Inter', system-ui, sans-serif;
          min-height: 100vh;
          margin: 0;
          padding: 40px 20px;
        }

        .container {
          max-width: 720px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .header h1 {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff, var(--accent-neon));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .btn-back {
          color: var(--text-soft);
          text-decoration: none;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
        }

        .btn-back:hover { color: var(--accent-neon); }

        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .form-group { margin-bottom: 24px; }
        .label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-soft);
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        input, textarea, select {
          width: 100%;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }

        input:focus, textarea:focus, select:focus {
          border-color: var(--accent-neon);
        }

        .image-upload {
          width: 100%;
          height: 200px;
          border: 2px dashed var(--glass-border);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          position: relative;
        }

        .image-upload:hover { border-color: var(--accent-neon); background: rgba(108, 242, 213, 0.05); }

        .image-preview { width: 100%; height: 100%; object-fit: cover; }

        .platform-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .platform-chip {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,0.02);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.8rem;
        }

        .platform-chip.active {
          border-color: var(--accent-neon);
          background: rgba(108, 242, 213, 0.1);
          color: var(--accent-neon);
        }

        .policy-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .policy-card {
          padding: 20px;
          border-radius: 16px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: all 0.2s;
        }

        .policy-card.active {
          border-color: var(--accent-neon);
          background: rgba(108, 242, 213, 0.1);
        }

        .policy-card h3 { font-size: 1rem; margin-bottom: 4px; }
        .policy-card p { font-size: 0.8rem; color: var(--text-soft); margin: 0; }

        .btn-submit {
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #0b0f14;
          font-weight: 700;
          font-size: 1.1rem;
          border: none;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(108, 242, 213, 0.4);
        }

        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 0.9rem;
          text-align: center;
        }
      `}</style>

      <div className="container">
        <div className="header">
          <h1>Create Campaign</h1>
          <Link href="/promotions" className="btn-back">
            <i className="fa-solid fa-arrow-left"></i> Back to Promotions
          </Link>
        </div>

        <div className="glass-card">
          {error && <div className="error-msg">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Campaign Image</label>
              <div className="image-upload" onClick={() => document.getElementById('img-input')?.click()}>
                {imagePreview ? (
                  <img src={imagePreview} className="image-preview" alt="Preview" />
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--accent-neon)' }}></i>
                    <p style={{ margin: 0 }}>Click to upload cover image</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-soft)' }}>JPG, PNG or WEBP (Max 2MB)</span>
                  </>
                )}
                <input type="file" id="img-input" hidden accept="image/*" onChange={handleImageChange} />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Campaign Title</label>
              <input 
                type="text" 
                placeholder="e.g. Summer Gaming Tournament" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="label">Description & Goals</label>
              <textarea 
                rows={4} 
                placeholder="What is this campaign about? What are the requirements?" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="label">Budget ($)</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={budget} 
                  onChange={e => setBudget(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="label">Campaign Type</label>
                <select value={campaignType} onChange={e => setCampaignType(e.target.value)}>
                  <option value="gaming">Gaming</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="education">Education</option>
                  <option value="finance">Finance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Target Platforms</label>
              <div className="platform-grid">
                {[
                  { id: 'tiktok', icon: 'fa-tiktok', label: 'TikTok' },
                  { id: 'youtube', icon: 'fa-youtube', label: 'YouTube' },
                  { id: 'instagram', icon: 'fa-instagram', label: 'Instagram' },
                  { id: 'twitter', icon: 'fa-twitter', label: 'X' },
                ].map(p => (
                  <div 
                    key={p.id} 
                    className={`platform-chip ${platforms.includes(p.id) ? 'active' : ''}`}
                    onClick={() => togglePlatform(p.id)}
                  >
                    <i className={`fa-brands ${p.icon}`} style={{ fontSize: '1.2rem' }}></i>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Join Policy</label>
              <div className="policy-grid">
                <div 
                  className={`policy-card ${joinPolicy === 'automatic' ? 'active' : ''}`}
                  onClick={() => setJoinPolicy('automatic')}
                >
                  <h3><i className="fa-solid fa-bolt"></i> Automatic</h3>
                  <p>Users join immediately upon clicking.</p>
                </div>
                <div 
                  className={`policy-card ${joinPolicy === 'manual' ? 'active' : ''}`}
                  onClick={() => setJoinPolicy('manual')}
                >
                  <h3><i className="fa-solid fa-shield-check"></i> Manual</h3>
                  <p>Admins must approve each request.</p>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Creating..." : "Launch Campaign"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
