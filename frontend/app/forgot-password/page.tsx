"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // await apiFetch("/api/forgot-password", { ... });
      setMessage({ text: "If that email exists, we sent a code.", isError: false });
    } catch (err) {
      setMessage({ text: "Something went wrong.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <style jsx>{`
        .auth-page-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--bg-main); }
        .auth-card { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid var(--border); width: 100%; max-width: 400px; text-align: center; }
        input { width: 100%; padding: 12px; border-radius: 12px; background: #111; border: 1px solid #333; color: white; margin-bottom: 20px; }
        .btn { width: 100%; padding: 12px; border-radius: 999px; background: var(--accent-neon); color: black; font-weight: 700; border: none; cursor: pointer; }
      `}</style>
      <div className="auth-card">
        <h2 style={{ marginBottom: "10px" }}>Reset Password</h2>
        <p style={{ color: "var(--text-soft)", marginBottom: "30px", fontSize: "0.9rem" }}>Enter your email to receive a recovery code.</p>
        
        {message && (
          <div style={{ padding: "10px", borderRadius: "8px", background: message.isError ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: message.isError ? "#fca5a5" : "#bbf7d0", marginBottom: "20px" }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn" disabled={loading}>Send Reset Code</button>
        </form>
        <div style={{ marginTop: "20px", fontSize: "0.9rem" }}>
          <Link href="/login" style={{ color: "var(--accent-neon)", textDecoration: "none" }}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
