"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    // Load Google script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: "930691125959-4lap9etbk2u6b1oelnhckgnciriboqa3.apps.googleusercontent.com",
          callback: handleGoogleResponse,
        });
        google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", width: "100%", shape: "pill", text: "continue_with" }
        );
      }
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });
      if (data.success) {
        await login(data);
        router.push("/");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Google Login failed", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.success) {
        await login(data);
        router.push("/");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Invalid credentials", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          /* Shared tokens with dashboards */
          --bg-main: radial-gradient(1200px circle at 10% 10%, #1c2a3a 0%, transparent 40%),
                     radial-gradient(1000px circle at 90% 20%, #2d1f3a 0%, transparent 40%),
                     linear-gradient(180deg, #0b0f14, #0e141b);
          --glass-bg: rgba(255,255,255,0.06);
          --glass-border: rgba(255,255,255,0.15);
          --text-main: #ffffff;
          --text-soft: #aab4c0;
          --accent-neon: #6cf2d5;
          --accent-gold: #f5d28b;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          min-height: 100vh;
          background: var(--bg-main);
          display: flex;
          justify-content: center;
          align-items: center;
          color: var(--text-main);
          -webkit-font-smoothing: antialiased;
        }

        .auth-container {
          width: 100%;
          max-width: 420px;
          padding: 20px;
        }

        .auth-card {
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
          padding: 36px 32px 32px;
          border-radius: 22px;
          border: 1px solid var(--glass-border);
          box-shadow: 0 30px 80px rgba(0,0,0,.7);
          text-align: center;
          backdrop-filter: blur(26px);
          -webkit-backdrop-filter: blur(26px);
          animation: slideUp 0.5s ease-out;
          position: relative;
          overflow: hidden;
        }

        .auth-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(360px circle at top left, rgba(255,255,255,.16), transparent 55%);
          pointer-events: none;
        }

        @keyframes slideUp {
          from { transform: translateY(18px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .logo {
          position: relative;
          font-size: 1.7rem;
          font-weight: 600;
          background: linear-gradient(135deg, #ffffff, var(--accent-neon));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.03em;
        }

        .logo i {
          color: var(--accent-neon);
          -webkit-text-fill-color: var(--accent-neon);
        }

        .subtitle {
          position: relative;
          color: var(--text-soft);
          font-size: 0.9rem;
          margin-bottom: 26px;
        }

        /* Alerts */

        .alert {
          position: relative;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .alert-error {
          background: rgba(239,68,68,0.16);
          color: #fecaca;
          border-color: rgba(239,68,68,0.5);
        }

        .alert-success {
          background: rgba(34,197,94,0.18);
          color: #bbf7d0;
          border-color: rgba(34,197,94,0.5);
        }

        .alert i { font-size: 0.95rem; }

        /* Form */

        .form-group {
          margin-bottom: 18px;
          text-align: left;
          position: relative;
          z-index: 1;
        }

        .label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-soft);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper i {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #7c8796;
          font-size: 0.95rem;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        input {
          width: 100%;
          padding: 11px 42px 11px 42px; /* Providing space for icons on both sides */
          border: 1px solid rgba(148,163,184,0.45);
          border-radius: 12px;
          font-size: 0.9rem;
          background: rgba(6,10,17,0.92);
          color: var(--text-main);
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        input::placeholder {
          color: rgba(148,163,184,0.8);
        }

        input:focus {
          border-color: var(--accent-neon);
          background: rgba(6,10,17,1);
          box-shadow: 0 0 0 1px rgba(108,242,213,0.6);
        }

        .input-wrapper:focus-within i:not(.toggle-password) {
          color: var(--accent-neon);
        }

        .toggle-password {
          position: absolute;
          right: 14px !important;
          left: auto !important;
          top: 50%;
          transform: translateY(-50%);
          color: var(--accent-neon) !important; /* Force neon color */
          font-size: 0.95rem;
          cursor: pointer;
          pointer-events: auto !important;
          z-index: 100; /* High z-index to stay above input */
          opacity: 0.8;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .toggle-password:hover {
          opacity: 1;
          transform: translateY(-50%) scale(1.1);
        }

        /* Hide default browser eye */
        input::-ms-reveal,
        input::-ms-clear {
          display: none;
        }

        /* Remember Me Styles */
        .remember-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          cursor: pointer;
          user-select: none;
        }

        .remember-group input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--accent-neon);
          cursor: pointer;
          margin: 0;
          padding: 0;
        }

        .remember-label {
          font-size: 0.85rem;
          color: var(--text-soft);
          font-weight: 500;
        }

        .auth-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: -10px;
          margin-bottom: 22px;
        }

        .forgot-link {
          margin: 0 !important;
        }

        .btn-submit {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, var(--accent-neon), #4dd0e1);
          color: #020617;
          border: none;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
          position: relative;
          z-index: 1;
          box-shadow: 0 22px 50px rgba(0,0,0,.78);
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .btn-submit:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #4dd0e1, var(--accent-neon));
          box-shadow: 0 28px 70px rgba(0,0,0,.9);
        }

        .btn-submit:active {
          transform: translateY(0);
          box-shadow: 0 18px 40px rgba(0,0,0,.82);
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0;
          color: var(--text-soft);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .divider::before, .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--glass-border);
        }

        #googleBtn {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }

        .forgot-link {
          display: block;
          text-align: right;
          font-size: 0.8rem;
          margin-top: -10px;
          margin-bottom: 18px;
          color: var(--accent-neon);
          text-decoration: none;
          font-weight: 500;
          position: relative;
          z-index: 1;
          transition: color 0.2s ease;
        }

        .forgot-link:hover {
          color: #7cf5e0;
          text-decoration: underline;
        }

        .auth-footer {
          margin-top: 22px;
          font-size: 0.85rem;
          color: var(--text-soft);
          position: relative;
          z-index: 1;
        }

        .auth-footer a {
          color: var(--accent-neon);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .auth-footer a:hover {
          color: #7cf5e0;
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 28px 22px 26px;
          }
        }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          <div className="logo">
            <i className="fa-solid fa-robot"></i>
            AutoSocial
          </div>
          <p className="subtitle">Welcome back. Log in to access your creator dashboard.</p>

          <div id="alert-area">
            {message && (
              <div className={`alert ${message.isError ? "alert-error" : "alert-success"}`}>
                <i className={`fa-solid ${message.isError ? "fa-circle-exclamation" : "fa-circle-check"}`}></i>
                {message.text}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email Address</label>
              <div className="input-wrapper">
                <i className="fa-regular fa-envelope"></i>
                <input
                  type="email"
                  name="email"
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
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="passwordInput"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <i
                  className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"} toggle-password`}
                  id="eyeIcon"
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>
            </div>

            <div className="auth-options">
              <label className="remember-group">
                <input type="checkbox" name="remember" />
                <span className="remember-label">Remember Me</span>
              </label>
              <Link href="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="divider">or</div>
          <div id="googleBtn"></div>

          <div className="auth-footer">
            Don't have an account?{" "}
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </>
  );
}

