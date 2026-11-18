"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
          { theme: "outline", size: "large", width: "100%", shape: "pill", text: "signup_with" }
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
        router.push(redirect);
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Google Signup failed", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match!", isError: true });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const data = await apiFetch("/api/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.success) {
        setMessage({ text: data.message, isError: false });
        // Automatically log in after signup if API returns tokens, or redirect to login
        if (data.token) {
           await login(data);
           router.push(redirect);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Signup failed", isError: true });
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
          --glass-bg: rgba(255,255,255,0.06);
          --glass-border: rgba(255,255,255,0.15);
          --text-main: #ffffff;
          --text-soft: #aab4c0;
          --accent-neon: #6cf2d5;
          --accent-gold: #f5d28b;
          --danger: #ef4444;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          background: var(--bg-main);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
          color: var(--text-main);
        }

        .auth-container {
          width: 100%;
          max-width: 460px;
          padding: 20px;
        }

        .auth-card {
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
          padding: 36px 32px 30px;
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(0,0,0,.8);
          text-align: center;
          border: 1px solid var(--glass-border);
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
          background: radial-gradient(380px circle at top left, rgba(255,255,255,.17), transparent 55%);
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
          padding: 11px 14px 11px 42px;
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

        .input-wrapper:focus-within i {
          color: var(--accent-neon);
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
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
          margin-top: 10px;
          position: relative;
          z-index: 1;
          box-shadow: 0 22px 50px rgba(0,0,0,.8);
        }

        .btn-submit:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #4dd0e1, var(--accent-neon));
          box-shadow: 0 28px 70px rgba(0,0,0,.92);
        }

        .btn-submit:active {
          transform: translateY(0);
          box-shadow: 0 18px 40px rgba(0,0,0,.85);
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

        .alert {
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          z-index: 1;
          border: 1px solid rgba(248,113,113,0.5);
          background: rgba(248,113,113,0.16);
          color: #fecaca;
        }

        .alert.success {
          background: rgba(34,197,94,0.18);
          color: #bbf7d0;
          border-color: rgba(34,197,94,0.5);
        }

        .alert i { font-size: 0.9rem; }

        @media (max-width: 480px) {
          .auth-card {
            padding: 28px 22px 24px;
          }
        }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          <div className="logo"><i className="fa-solid fa-robot"></i> AutoSocial</div>
          <p className="subtitle">Join AutoSocial and automate your growth.</p>

          <div id="alert-area">
            {message && (
              <div className={`alert ${message.isError ? "" : "success"}`}>
                <i className={`fa-solid ${message.isError ? "fa-triangle-exclamation" : "fa-check"}`}></i>
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
              <label className="label">Create Password</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-lock"></i>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Confirm Password</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-check-double"></i>
                <input
                  type="password"
                  id="confirm_password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="divider">or</div>
          <div id="googleBtn"></div>

          <div className="auth-footer">
            Already have an account? <Link href={`/login${redirect !== "/" ? "?redirect=" + encodeURIComponent(redirect) : ""}`}>Log In</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{color:'white', padding:'40px'}}>Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}

