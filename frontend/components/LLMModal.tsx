"use client";

import { useState, useEffect, useRef } from "react";

interface LLMModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  data: any;
  progress: number;
}

export default function LLMModal({ isOpen, onClose, platform, data, progress }: LLMModalProps) {
  const [typedData, setTypedData] = useState<any>({});
  const typewriterTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const typeInto = (key: string, text: string, delay = 15) => {
    if (typewriterTimers.current[key]) clearInterval(typewriterTimers.current[key]);
    
    let i = 0;
    setTypedData((prev: any) => ({ ...prev, [key]: "" }));
    
    const timer = setInterval(() => {
      if (i >= text.length) {
        clearInterval(timer);
        delete typewriterTimers.current[key];
        return;
      }
      setTypedData((prev: any) => ({ ...prev, [key]: (prev[key] || "") + text[i] }));
      i++;
    }, delay);
    
    typewriterTimers.current[key] = timer;
  };

  useEffect(() => {
    if (isOpen && data) {
      if (platform === "instagram") {
        typeInto("hook", data.hook || "");
        typeInto("caption", data.caption || "");
        typeInto("description", data.description || "");
        typeInto("cta", data.cta || "");
        typeInto("hashtags", (data.hashtags || []).join(" "));
      } else if (platform === "youtube") {
        typeInto("title", data.title || "");
        typeInto("yt_description", data.yt_description || "");
        typeInto("yt_tags", (data.yt_tags || []).join(", "));
      } else if (platform === "tiktok") {
        typeInto("tiktok_caption", data.tiktok_caption || "");
        typeInto("tiktok_hashtags", (data.tiktok_hashtags || []).join(" "));
      } else if (platform === "twitter") {
        typeInto("tweet_text", data.tweet_text || "");
        typeInto("tweet_hashtags", (data.tweet_hashtags || []).join(" "));
      }
    } else {
      // Clear timers and data when modal closes
      Object.values(typewriterTimers.current).forEach(clearInterval);
      typewriterTimers.current = {};
      setTypedData({});
    }
  }, [isOpen, data, platform]);

  if (!isOpen) return null;

  const platformLabelMap: Record<string, string> = {
    instagram: "Instagram Reels",
    youtube: "YouTube Shorts",
    tiktok: "TikTok",
    twitter: "Twitter / X"
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{
        maxWidth: "720px",
        width: "95%",
        textAlign: "left",
        padding: "26px 26px 22px",
        background: "radial-gradient(circle at top left, rgba(148,163,184,0.14), transparent 55%), radial-gradient(circle at bottom right, rgba(56,189,248,0.18), transparent 55%), linear-gradient(160deg, rgba(15,23,42,0.96), rgba(15,23,42,0.99))",
        borderRadius: "22px",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 40px 120px rgba(0,0,0,0.95)",
        backdropFilter: "blur(26px)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          inset: "-40%",
          opacity: 0.18,
          background: "radial-gradient(circle at 10% 0%, rgba(45,212,191,0.8), transparent 55%), radial-gradient(circle at 90% 100%, rgba(94,234,212,0.7), transparent 55%)",
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}></div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(148,163,184,0.9)", marginBottom: "4px" }}>
                Viral content package
              </div>
              <h3 style={{ fontSize: "1.12rem", color: "#f9fafb", margin: 0, display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Generated {platformLabelMap[platform] || "Package"}
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.16em", padding: "3px 8px", borderRadius: "999px", border: "1px solid rgba(148,163,184,0.45)", color: "#e5e7eb", background: "rgba(15,23,42,0.8)" }}>
                  {platform}
                </span>
              </h3>
            </div>
            <button type="button" onClick={onClose} className="btn-header" style={{ padding: "6px 10px", gap: "6px" }}>
              <i className="fa-solid fa-xmark"></i>
              <span style={{ fontSize: "0.78rem" }}>Close</span>
            </button>
          </div>

          <div style={{ height: "1px", width: "100%", marginBottom: "12px", background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.6), transparent)" }}></div>

          <div style={{ marginBottom: "14px", width: "100%" }}>
            <div style={{ width: "100%", height: "4px", borderRadius: "999px", background: "rgba(15,23,42,0.9)", overflow: "hidden", border: "1px solid rgba(148,163,184,0.4)" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: "999px", background: "linear-gradient(90deg,#22c55e,#a3e635,#facc15)", boxShadow: "0 0 14px rgba(190,242,100,0.7)", transition: "width 0.15s linear" }}></div>
            </div>
            <div style={{ marginTop: "6px", fontSize: "0.74rem", color: "#9ca3af", textAlign: "right", letterSpacing: "0.16em", textTransform: "uppercase" }}>
              {progress < 100 ? `Generating ${Math.round(progress)}%` : "Ready 100%"}
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
            {platform === "instagram" && (
              <>
                <Field label="Hook" value={typedData.hook} />
                <Field label="Caption" value={typedData.caption} />
                <Field label="Description" value={typedData.description} />
                <Field label="CTA" value={typedData.cta} />
                <Field label="Hashtags" value={typedData.hashtags} />
              </>
            )}
            {platform === "youtube" && (
              <>
                <Field label="Title" value={typedData.title} />
                <Field label="Description" value={typedData.yt_description} />
                <Field label="Tags" value={typedData.yt_tags} />
              </>
            )}
            {platform === "tiktok" && (
              <>
                <Field label="Caption" value={typedData.tiktok_caption} />
                <Field label="Hashtags" value={typedData.tiktok_hashtags} />
              </>
            )}
            {platform === "twitter" && (
              <>
                <Field label="Tweet" value={typedData.tweet_text} />
                <Field label="Hashtags" value={typedData.tweet_hashtags} />
              </>
            )}
          </div>

          <div style={{ marginTop: "6px", display: "flex", gap: "12px", fontSize: "0.82rem", color: "#9ca3af", alignItems: "center", flexWrap: "wrap" }}>
            <div><span style={{ opacity: 0.8 }}>Hook Score</span>: <span style={{ color: "#a5f3fc" }}>{data?.hook_score || ""}</span>/10</div>
            <div><span style={{ opacity: 0.8 }}>Virality</span>: <span style={{ color: "#bef264" }}>{data?.virality_score || ""}</span>/100</div>
            <div style={{ marginLeft: "auto", fontSize: "0.78rem", padding: "3px 8px", borderRadius: "999px", border: "1px solid rgba(148,163,184,0.4)", background: "rgba(15,23,42,0.92)" }}>
              <i className="fa-solid fa-bolt-lightning" style={{ color: "#fde68a", marginRight: "6px" }}></i>
              <span style={{ color: "#e5e7eb" }}>LLM Generated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#020617", borderRadius: "10px", padding: "10px", border: "1px solid #1f2937" }}>
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af" }}>{label}</div>
      <div style={{ marginTop: "4px", color: "#e5e7eb", fontSize: "0.9rem" }}>{value}</div>
    </div>
  );
}
