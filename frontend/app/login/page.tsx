"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");
    if (error) {
      setMessage({ text: error, isError: true });
    } else if (success) {
      setMessage({ text: success, isError: false });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
  };

  return (
    <div className="auth-page-wrapper">
      <div className="glow-1" style={{
        position: "fixed", top: "-10%", left: "-10%", width: "40%", height: "40%",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)",
        pointerEvents: "none", zIndex: -1
      }}></div>

      <style jsx>{`
        .auth-page-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          width: 100%;
          background: var(--bg-main);
          font-family: var(--font-poppins), sans-serif;
        }
        .auth-container {
          width: 100%;
          max-width: 420px;
          padding: 20px;
        }
        .auth-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, .08), rgba(255, 255, 255, .02));
          padding: 40px;
          border-radius: 22px;
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(26px);
          box-shadow: 0 40px 100px rgba(0, 0, 0, .8);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .auth-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(420px circle at top left, rgba(255, 255, 255, .1), transparent 50%);
          pointer-events: none;
        }
        .logo {
          font-size: 1.8rem;
          font-weight: 700;
          color: white;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .logo i { color: var(--accent-neon); }
        .subtitle {
          color: var(--text-soft);
          font-size: 0.95rem;
          margin-bottom: 30px;
        }
        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }
        .label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-soft);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .input-wrapper {
          position: relative;
        }
        .input-wrapper i {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #7c8796;
          font-size: 1rem;
        }
        input {
          width: 100%;
          padding: 12px 15px 12px 45px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 12px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          outline: none;
          background: rgba(6, 10, 17, 0.92);
          color: white;
        }
        input:focus {
          border-color: var(--accent-neon);
          box-shadow: 0 0 0 1px rgba(108, 242, 213, 0.6);
        }
        .btn-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #020617;
          border: none;
          border-radius: 999px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 10px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, .7);
        }
        .btn-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 25px 60px rgba(0, 0, 0, .9);
        }
        .auth-footer {
          margin-top: 25px;
          font-size: 0.9rem;
          color: var(--text-soft);
        }
        .auth-footer a {
          color: var(--accent-neon);
          text-decoration: none;
          font-weight: 600;
        }
        .forgot-link {
          display: block;
          text-align: right;
          font-size: 0.8rem;
          color: var(--text-soft);
          margin-top: -15px;
          margin-bottom: 20px;
          text-decoration: none;
        }
        .alert {
          padding: 12px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .alert-error { background: rgba(239, 68, 68, 0.1); color: #fecaca; border-color: rgba(239, 68, 68, 0.4); }
        .alert-success { background: rgba(16, 185, 129, 0.1); color: #bbf7d0; border-color: rgba(16, 185, 129, 0.4); }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          <div className="logo">
            <i className="fa-solid fa-robot"></i> AutoSocial
          </div>
          <p className="subtitle">Welcome back! Please login to continue.</p>

          {message && (
            <div className={`alert ${message.isError ? "alert-error" : "alert-success"}`}>
              <i className={`fa-solid ${message.isError ? "fa-circle-exclamation" : "fa-circle-check"}`}></i>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email Address</label>
              <div className="input-wrapper">
                <i className="fa-regular fa-envelope"></i>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-lock"></i>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Link href="/forgot-password" title="Forgot Password?" className="forgot-link">
              Forgot Password?
            </Link>

            <button type="submit" className="btn-submit">
              Log In
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
