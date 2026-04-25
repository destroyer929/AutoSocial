"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

function PromotionDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  // Initialize ID from URL immediately if possible
  const [promotionId, setPromotionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get("id") || "0";
    }
    return "0";
  });

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && id !== promotionId) {
      setPromotionId(id);
    }
  }, [searchParams, promotionId]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Chat state
  const [chatTicket, setChatTicket] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Forms state
  const [submitPlatform, setSubmitPlatform] = useState("instagram");
  const [submitUrl, setSubmitUrl] = useState("");
  
  const [linkPlatform, setLinkPlatform] = useState("instagram");
  const [linkUsername, setLinkUsername] = useState("");

  const [ticketCategory, setTicketCategory] = useState("submission");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");

  const [messageFlash, setMessageFlash] = useState<{ text: string, isError: boolean } | null>(null);

  // Announcement form state
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementImage, setAnnouncementImage] = useState<File | null>(null);
  const [announcementPreview, setAnnouncementPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [promotionId]);

  const fetchData = async () => {
    if (!promotionId || promotionId === "0") return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/promotions/${promotionId}/detail`);
      console.log("DEBUG: Promotion Detail Data:", res);
      setData(res);
    } catch (err) {
      console.error(err);
      setMessageFlash({ text: "Failed to load promotion.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsRead = async () => {
    try {
      await apiFetch(`/api/promotions/${promotionId}/mark_announcements_read`, { method: "POST" });
      // Update local data to clear badges instantly
      setData((prev: any) => ({
        ...prev,
        unread_count: 0,
        announcements: prev.announcements.map((n: any) => ({ ...n, is_read: true }))
      }));
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  const showFlash = (text: string, isError = false) => {
    setMessageFlash({ text, isError });
    setTimeout(() => setMessageFlash(null), 3500);
  };

  const handleJoin = async () => {
    try {
      const res = await apiFetch("/api/promotions/join", {
        method: "POST",
        body: JSON.stringify({ promotion_id: parseInt(promotionId) })
      });
      fetchData();
      if (res.status === "pending") {
        showFlash("Join request sent. Awaiting approval.", false);
      } else {
        showFlash("Successfully joined promotion.");
      }
    } catch (err: any) {
      showFlash(err.message || "Failed to join", true);
    }
  };

  const handleModerateJoin = async (targetUserId: number, action: string) => {
    try {
      const res = await apiFetch(`/api/promotions/${promotionId}/requests/${targetUserId}/${action}`, {
        method: "POST"
      });
      showFlash(res.message || "Action successful.");
      fetchData();
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const handleLeave = async () => {
    if (!confirm('WARNING: Are you sure you want to completely leave this campaign?')) return;
    try {
      await apiFetch(`/api/promotions/${promotionId}/leave`, { method: "POST" });
      fetchData();
      showFlash("Left promotion.");
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/submit", {
        method: "POST",
        body: JSON.stringify({ promotion_id: parseInt(promotionId), platform: submitPlatform, url: submitUrl })
      });
      setSubmitUrl("");
      fetchData();
      showFlash("Video submitted! Stats will be scraped soon.");
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/register_account", {
        method: "POST",
        body: JSON.stringify({ promotion_id: parseInt(promotionId), platform: linkPlatform, account_name: linkUsername })
      });
      setLinkUsername("");
      fetchData();
      showFlash("Account linked successfully.");
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('Disconnect from the platform altogether?')) return;
    try {
      await apiFetch("/api/delete_account", {
        method: "POST",
        body: JSON.stringify({ account_id: accountId })
      });
      fetchData();
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/promotions/${promotionId}/tickets/create`, {
        method: "POST",
        body: JSON.stringify({ category: ticketCategory, subject: ticketSubject, message: ticketMessage })
      });
      setTicketSubject("");
      setTicketMessage("");
      fetchData();
      setActivePanel("support");
      setChatTicket(null); // Back to list view
      showFlash("Support ticket created.");
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const openChat = (ticket: any) => {
    setChatTicket(ticket);
    setChatMessages([]);
    if (ws.current) ws.current.close();
    
    // Create new websocket connection (assume we use the same host logic for Next.js -> FastAPI)
    // Next.js client talks to backend on port 8000
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    ws.current = new WebSocket(`${wsProtocol}//${host}/ws/${promotionId}/${ticket.id}`);
    
    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'history' }));
      setTimeout(() => ws.current?.send(JSON.stringify({ type: 'mark_read' })), 300);
    };

    ws.current.onmessage = (event) => {
      const d = JSON.parse(event.data);
      if (d.type === 'history') {
        setChatMessages(d.messages || []);
        ws.current?.send(JSON.stringify({ type: 'mark_read' }));
        scrollToBottom();
        // Refresh sidebar badges after history load
        fetchData();
      } else if (d.type === 'message') {
        setChatMessages(prev => [...prev, d]);
        if (d.sender !== user?.email) {
          ws.current?.send(JSON.stringify({ type: 'mark_read' }));
          fetchData(); // Refresh badge on new message if in chat
        }
        scrollToBottom();
      } else if (d.type === 'read_receipt') {
        if (d.reader !== user?.email) {
          setChatMessages(prev => prev.map(m => m.sender === user?.email ? { ...m, is_read: true } : m));
        }
      }
    };
  };

  const closeTicket = async () => {
    if (!confirm('Are you sure? This will permanently delete the ticket.')) return;
    try {
      await apiFetch(`/api/promotions/${promotionId}/tickets/${chatTicket.id}/delete`, { method: "POST" });
      setChatTicket(null);
      fetchData();
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() && !pendingImageFile) return;

    if (pendingImageFile && chatTicket) {
      const formData = new FormData();
      formData.append("file", pendingImageFile);
      
      try {
        const url = `/api/promotions/${promotionId}/tickets/${chatTicket.id}/upload_image`;
        // Since apiFetch takes JSON by default, we need a custom fetch for FormData, or adjust apiFetch
        // Next.js fallback if apiFetch doesn't support FormData:
        const response = await fetch(url, { method: "POST", body: formData });
        const result = await response.json();
        
        if (result.status === "success") {
          ws.current?.send(JSON.stringify({ type: 'message', content: `[IMAGE] ${result.url}` }));
          setPendingImageFile(null);
          setPendingImage(null);
        } else {
          showFlash("Image upload failed: " + result.message, true);
          return;
        }
      } catch (err) {
        showFlash("Failed to upload image", true);
        return;
      }
    }

    if (chatInput.trim()) {
      ws.current?.send(JSON.stringify({ type: 'message', content: chatInput.trim() }));
      setChatInput("");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPendingImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleAdminAction = async (action: 'blacklist' | 'whitelist' | 'remove', videoUrl: string, platform: string) => {
    if (action === 'remove' && !confirm('Are you sure you want to PERMANENTLY remove this submission?')) return;
    
    try {
      const res = await apiFetch(`/api/promotions/${promotionId}/submissions/${action}`, {
        method: "POST",
        body: JSON.stringify({ video_url: videoUrl, platform })
      });
      showFlash(res.message || `Submission ${action}ed.`);
      fetchData();
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const handleManageMember = async (targetUserId: number, action: string) => {
    try {
      const res = await apiFetch(`/api/promotions/${promotionId}/members/${targetUserId}/${action}`, {
        method: "POST"
      });
      showFlash(res.message || "Action successful.");
      fetchData();
    } catch (err: any) {
      showFlash(err.message, true);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", announcementTitle);
      formData.append("message", announcementMessage);
      if (announcementImage) formData.append("image", announcementImage);

      const res = await fetch(`/api/promotions/${promotionId}/announcements`, {
        method: "POST",
        body: formData
      });
      const result = await res.json();
      if (result.status === "success") {
        showFlash("Announcement posted successfully.");
        setAnnouncementTitle("");
        setAnnouncementMessage("");
        setAnnouncementImage(null);
        setAnnouncementPreview(null);
        fetchData();
      } else {
        showFlash(result.error || "Failed to post announcement", true);
      }
    } catch (err) {
      showFlash("Failed to post announcement", true);
    }
  };

  const handleDismissAnnouncement = async (id: number) => {
    try {
      await apiFetch(`/api/promotions/${promotionId}/announcements/${id}/dismiss`, { method: "POST" });
      setData((prev: any) => ({
        ...prev,
        announcements: prev.announcements.filter((n: any) => n.id !== id)
      }));
    } catch (err) {
      console.error("Failed to dismiss announcement", err);
    }
  };

  const handleAnnouncementImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnnouncementImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAnnouncementPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!data || data.error || !data.promotion) return;
    const { user_join_status, is_owner, unread_count } = data;

    // Redirect restricted users to overview if they try to access locked panels
    const restrictedPanels = ['notifications', 'guidelines', 'submit', 'analytics'];
    if (user_join_status !== 'approved' && !is_owner && restrictedPanels.includes(activePanel)) {
      setActivePanel('overview');
    }

    if (activePanel === 'notifications' && unread_count > 0) {
      markNotificationsRead();
    }
  }, [data, activePanel]);

  if (loading || !data) return <div style={{color:'white', padding:'40px'}}>Loading...</div>;
  if (data.error) return <div style={{color:'white', padding:'40px'}}>Error: {data.error}</div>;

  const { promotion, already_joined, user_join_status, is_removed, is_banned, join_count, is_admin, is_owner, unread_count, accounts, submitted_videos, support_tickets, manage_tickets, join_requests, analytics, admin_analytics, online_members, offline_members, announcements } = data;

  if (!promotion) return <div style={{color:'white', padding:'40px'}}>Promotion not found.</div>;

  const renderPlatforms = (platformsStr: string) => {
    if (!platformsStr || platformsStr === 'all') {
      return (
        <>
          <span className="plat-chip"><img src="/static/logos/Instagram_logo.png" alt="Instagram" /> Instagram</span>
          <span className="plat-chip"><img src="/static/logos/YouTube_logo.png" alt="YouTube" /> YouTube</span>
          <span className="plat-chip"><img src="/static/logos/Tiktok_logo.png" alt="TikTok" /> TikTok</span>
          <span className="plat-chip"><img src="/static/logos/twitter_logo.png" alt="X" /> X</span>
        </>
      );
    }
    const plist = platformsStr.split(',');
    return plist.map((plat, idx) => {
      const p = plat.trim();
      if (p === 'instagram') return <span key={idx} className="plat-chip"><img src="/static/logos/Instagram_logo.png" alt="Instagram" /> Instagram</span>;
      if (p === 'youtube') return <span key={idx} className="plat-chip"><img src="/static/logos/YouTube_logo.png" alt="YouTube" /> YouTube</span>;
      if (p === 'tiktok') return <span key={idx} className="plat-chip"><img src="/static/logos/Tiktok_logo.png" alt="TikTok" /> TikTok</span>;
      if (p === 'twitter' || p === 'x') return <span key={idx} className="plat-chip"><img src="/static/logos/twitter_logo.png" alt="X" /> X</span>;
      return <span key={idx} className="plat-chip">{p}</span>;
    });
  };

  return (
    <>
      <style jsx global>{`
        /* Include exact CSS verbatim from template */
        :root {
          --bg:           #080d14;
          --surface:      rgba(255,255,255,0.04);
          --surface-2:    rgba(255,255,255,0.07);
          --border:       rgba(255,255,255,0.10);
          --border-2:     rgba(255,255,255,0.16);
          --text:         #f0f4f8;
          --text-soft:    #7a8899;
          --text-muted:   #4a5668;
          --neon:         #6cf2d5;
          --neon-dim:     rgba(108,242,213,0.12);
          --neon-border:  rgba(108,242,213,0.35);
          --gold:         #f5d28b;
          --danger:       #ef4444;
          --success:      #10b981;
          --warning:      #f59e0b;
          --sidebar-w:    240px;
          --header-h:     60px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
        body {
          font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text);
          min-height: 100vh; line-height: 1.5; overflow: hidden;
        }
        /* Topbar */
        .topbar {
          position: fixed; top: 0; left: 0; right: 0; height: var(--header-h); z-index: 200;
          backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
          background: linear-gradient(180deg, rgba(8,13,20,0.97), rgba(8,13,20,0.93));
          border-bottom: 1px solid var(--border); display: flex; align-items: center;
          padding: 0 24px; gap: 16px;
        }
        .topbar-logo { display: flex; align-items: center; gap: 9px; font-size: 1rem; font-weight: 800; letter-spacing: -0.04em; }
        .topbar-logo i { color: var(--neon); font-size: 1.1rem; }
        .topbar-sep { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; }
        .topbar-promo-name { font-size: 0.88rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .topbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; flex-shrink: 0; }
        .topbar-user { font-size: 0.78rem; color: var(--text-soft); }
        .topbar-btn {
          display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; font-size: 0.8rem; font-weight: 500;
          border: 1px solid var(--border); background: var(--surface); color: var(--text);
          text-decoration: none; cursor: pointer; transition: background .18s, border-color .18s, transform .15s;
        }
        .topbar-btn:hover { background: var(--surface-2); border-color: var(--border-2); transform: translateY(-1px); }

        /* App shell */
        .app-shell { display: flex; position: fixed; top: var(--header-h); left: 0; right: 0; bottom: 0; }
        .sidebar {
          width: var(--sidebar-w); flex-shrink: 0; display: flex; flex-direction: column;
          border-right: 1px solid var(--border); background: linear-gradient(180deg, rgba(8,13,20,0.98), rgba(10,16,24,0.96));
          overflow: hidden; padding: 28px 0 24px;
        }
        .sidebar-promo-card { margin: 0 14px 24px; padding: 14px; border-radius: 16px; border: 1px solid var(--border); background: var(--surface); }
        .sidebar-cover { width: 100%; aspect-ratio: 16/9; border-radius: 10px; overflow: hidden; background: #020617; margin-bottom: 10px; }
        .sidebar-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sidebar-cover-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; color: #e5e7eb; background: radial-gradient(circle at 10% 0%, rgba(56,189,248,0.3), transparent 60%), linear-gradient(145deg, #020617, #0e141b); }
        .sidebar-promo-title { font-size: 0.82rem; font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-promo-meta { font-size: 0.72rem; color: var(--text-soft); margin-top: 3px; }
        .sidebar-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.68rem; padding: 2px 9px; border-radius: 999px; font-weight: 600; margin-top: 7px; }
        .badge-live      { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: #6ee7b7; }
        .badge-scheduled { background: rgba(148,163,184,0.1);  border: 1px solid rgba(148,163,184,0.3); color: #94a3b8; }
        
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 0 10px; }
        .nav-item {
          display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px; cursor: pointer;
          font-size: 0.85rem; font-weight: 500; color: var(--text-soft); transition: background .18s, color .18s; position: relative; user-select: none; border: 1px solid transparent;
        }
        .nav-item i { width: 18px; text-align: center; font-size: 0.9rem; transition: color .18s; flex-shrink: 0; }
        .nav-item:hover { background: var(--surface); color: var(--text); }
        .nav-item.active { background: var(--neon-dim); color: var(--neon); border-color: var(--neon-border); font-weight: 600; }
        .nav-item.active i { color: var(--neon); }
        .nav-active-bar { position: absolute; left: 0; top: 25%; bottom: 25%; width: 3px; border-radius: 0 3px 3px 0; background: var(--neon); opacity: 0; transition: opacity .18s; }
        .nav-item.active .nav-active-bar { opacity: 1; }
        .nav-pill { margin-left: auto; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: var(--neon-dim); color: var(--neon); border: 1px solid var(--neon-border); }

        .sidebar-footer { padding: 14px; border-top: 1px solid var(--border); margin-top: auto; }
        .budget-bar-label { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-soft); margin-bottom: 6px; }
        .budget-bar-label strong { color: var(--neon); }
        .budget-bar-track { height: 5px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
        .budget-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--neon), #4dd0e1); width: 65%; transition: width .6s cubic-bezier(0.16,1,0.3,1); }

        .main-content { flex: 1; overflow-y: auto; padding: 0; scroll-behavior: smooth; }
        .main-content::-webkit-scrollbar { width: 6px; }
        .main-content::-webkit-scrollbar-track { background: transparent; }
        .main-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .main-content::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        .panel { min-height: 100%; padding: 36px 40px 60px; display: none; animation: fadeSlideIn .25s cubic-bezier(0.16,1,0.3,1) both; }
        .panel.active { display: block; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Shared Components */
        .panel-title { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.04em; margin-bottom: 6px; }
        .panel-subtitle { font-size: 0.88rem; color: var(--text-soft); margin-bottom: 32px; }
        .section-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text-muted); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
        .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .glass-card { background: linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02)); border: 1px solid var(--border); border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,.5); }

        /* Forms */
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-soft); }
        .input-wrap { position: relative; display: flex; align-items: center; }
        .input-wrap i { position: absolute; left: 14px; color: var(--text-muted); pointer-events: none; transition: color .18s; }
        .input-wrap:focus-within i { color: var(--neon); }
        .form-input, .form-select, .form-textarea { width: 100%; font-family: inherit; color: var(--text); background: rgba(6,10,17,0.9); border: 1px solid rgba(148,163,184,0.3); border-radius: 12px; outline: none; font-size: 0.88rem; transition: border-color .2s, box-shadow .2s; }
        .form-input, .form-select { padding: 11px 12px 11px 40px; }
        .form-textarea { padding: 11px 14px; resize: vertical; min-height: 90px; line-height: 1.55; }
        .form-input::placeholder, .form-textarea::placeholder { color: rgba(148,163,184,0.5); }
        .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--neon); box-shadow: 0 0 0 1px rgba(108,242,213,0.4); }

        /* Buttons */
        .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 26px; border-radius: 999px; border: none; background: linear-gradient(135deg, var(--neon), #4dd0e1); color: #020617; font-size: 0.9rem; font-weight: 700; cursor: pointer; box-shadow: 0 14px 40px rgba(0,0,0,.6); transition: transform .15s, box-shadow .2s, background .2s; font-family: inherit; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 22px 55px rgba(0,0,0,.8); background: linear-gradient(135deg, #4dd0e1, var(--neon)); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
        .btn-ghost { display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 999px; cursor: pointer; font-family: inherit; background: var(--neon-dim); color: var(--neon); font-size: 0.88rem; font-weight: 600; border: 1px solid var(--neon-border); transition: background .18s, transform .15s; }
        .btn-ghost:hover { background: rgba(108,242,213,0.2); transform: translateY(-1px); }

        .alert { padding: 13px 16px; border-radius: 13px; font-size: 0.88rem; font-weight: 500; display: flex; align-items: center; gap: 10px; margin-bottom: 24px; border: 1px solid; }
        .alert-success { border-color: rgba(16,185,129,0.4); color: #bbf7d0; background: rgba(16,185,129,0.08); }
        .alert-error   { border-color: rgba(239,68,68,0.4);   color: #fecaca; background: rgba(239,68,68,0.08);   }

        /* Overview */
        .overview-hero { display: grid; grid-template-columns: 720px 1fr; gap: 28px; margin-bottom: 36px; align-items: start; }
        .overview-cover { border-radius: 16px; overflow: hidden; border: 1px solid var(--border); background: #020617; height: 460px; }
        .overview-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .overview-cover-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 800; color: #e5e7eb; background: radial-gradient(circle at 10% 0%, rgba(56,189,248,0.3), transparent 60%), linear-gradient(145deg, #020617, #0e141b); }
        .status-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; padding: 4px 12px; border-radius: 999px; font-weight: 600; width: fit-content; }
        .chip-live      { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.45); color: #6ee7b7; }
        .chip-scheduled { background: rgba(148,163,184,0.1);  border: 1px solid rgba(148,163,184,0.35); color: #94a3b8; }
        .ov-title { font-size: clamp(1.3rem, 2.5vw, 1.9rem); font-weight: 800; letter-spacing: -0.04em; line-height: 1.15; }
        .ov-type { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--neon-border); color: var(--neon); background: var(--neon-dim); width: fit-content; font-weight: 500; }
        .ov-desc { font-size: 0.9rem; color: var(--text-soft); line-height: 1.65; max-width: 55ch; }
        .meta-chips { display: flex; flex-wrap: wrap; gap: 9px; }
        .meta-chip { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); font-size: 0.82rem; }
        .meta-chip i { color: var(--neon); font-size: 0.85rem; }
        .meta-chip span { color: var(--text-soft); }
        .meta-chip strong { color: var(--text); }
        .platforms-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .platforms-lbl { font-size: 0.72rem; color: var(--text-soft); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
        .plat-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 0.76rem; font-weight: 600; border: 1px solid var(--border); background: var(--surface); }
        .plat-chip img { width: 13px; height: 13px; object-fit: contain; }
        .join-card { background: linear-gradient(160deg, rgba(108,242,213,0.08), rgba(77,208,225,0.03)); border: 1px solid var(--neon-border); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 12px; height: fit-content; }
        .join-card h3 { font-size: 1rem; font-weight: 700; }
        .join-card p { font-size: 0.84rem; color: var(--text-soft); line-height: 1.55; }
        .btn-joined { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 999px; border: 1px solid rgba(16,185,129,0.4); background: rgba(16,185,129,0.08); color: #6ee7b7; font-size: 0.9rem; font-weight: 700; cursor: default; width: 100%; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px 18px; }
        .stat-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); }
        .stat-value { font-size: 1rem; font-weight: 700; color: var(--text); margin-top: 5px; }
        .stat-value.hi { color: var(--neon); }

        /* Notifications */
        .notif-list { display: flex; flex-direction: column; gap: 10px; }
        .notif-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border-radius: 15px; background: var(--surface); border: 1px solid var(--border); transition: background .18s; }
        .notif-item:hover { background: var(--surface-2); }
        .notif-icon { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
        .ni-system { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
        .notif-body { flex: 1; }
        .notif-title { font-size: 0.88rem; font-weight: 600; margin-bottom: 2px; }
        .notif-desc  { font-size: 0.8rem; color: var(--text-soft); line-height: 1.45; }
        .notif-time  { font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; }
        .notif-dot   { width: 8px; height: 8px; border-radius: 50%; background: var(--neon); flex-shrink: 0; margin-top: 7px; }
        .btn-dismiss-notif { position: absolute; top: 12px; right: 12px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: var(--text-soft); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; cursor: pointer; opacity: 0; transition: opacity 0.2s, background 0.2s; }
        .notif-item:hover .btn-dismiss-notif { opacity: 1; }
        .empty-state { text-align: center; padding: 60px 20px; color: var(--text-soft); font-size: 0.9rem; }
        .empty-state i { font-size: 2.5rem; display: block; margin-bottom: 14px; opacity: .3; }

        /* Rules */
        .rules-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .rule-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border-radius: 15px; background: var(--surface); border: 1px solid var(--border); }
        .rule-num { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: var(--neon-dim); border: 1px solid var(--neon-border); color: var(--neon); }
        .rule-text { font-size: 0.88rem; color: #dde4ed; line-height: 1.55; flex: 1; padding-top: 2px; }
        .rule-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 0.66rem; padding: 2px 8px; border-radius: 999px; font-weight: 600; vertical-align: middle; margin-left: 7px; }
        .tag-req { background: rgba(239,68,68,0.14); color: #fca5a5; border: 1px solid rgba(239,68,68,0.28); }
        .tag-opt { background: var(--neon-dim); color: var(--neon); border: 1px solid var(--neon-border); }
        .rules-warning { padding: 13px 16px; border-radius: 13px; font-size: 0.83rem; color: #fcd34d; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); display: flex; align-items: flex-start; gap: 10px; line-height: 1.55; }

        /* Submit */
        .disabled-flow { opacity: 0.5; pointer-events: none; }
        .ticket-form-card { padding: 22px 24px; }
        .ticket-form-header { display: flex; align-items: center; gap: 10px; font-size: 1rem; font-weight: 700; }
        .sv-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
        .sv-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 14px; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); }
        .sv-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--surface); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sv-icon img { width: 18px; height: 18px; object-fit: contain; }
        .sv-body { flex: 1; min-width: 0; }
        .sv-url { font-size: 0.82rem; color: var(--neon); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .sv-date { font-size: 0.72rem; color: var(--text-soft); margin-top: 2px; }
        .sv-badge { font-size: 0.7rem; padding: 3px 9px; border-radius: 999px; font-weight: 600; background: rgba(16,185,129,0.14); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; white-space: nowrap; }

        /* Analytics */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 22px; margin-bottom: 34px; }
        .kpi { position: relative; background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.14); border-radius: 22px; padding: 22px 22px 20px; backdrop-filter: blur(26px); box-shadow: 0 28px 70px rgba(0,0,0,0.55); overflow: hidden; }
        .kpi-label { position: relative; font-size: 0.78rem; color: #aeb8c6; text-transform: uppercase; letter-spacing: 0.12em; }
        .kpi h2 { position: relative; margin: 10px 0 6px; font-size: 2.2rem; font-weight: 800; color: #f2d49a; }
        .kpi-sub { position: relative; font-size: 0.8rem; color: rgba(174,184,198,0.9); }
        .table-card { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015)); border-radius: 26px; border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(28px); box-shadow: 0 36px 90px rgba(0,0,0,0.62); overflow: auto; }
        .analytics-table { width: 100%; border-collapse: collapse; }
        .analytics-table thead { background: rgba(0,0,0,0.55); }
        .analytics-table th, .analytics-table td { padding: 16px 20px; font-size: 0.9rem; text-align: left; }
        .analytics-table th { color: #aeb8c6; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; font-size: 0.78rem; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .analytics-table tbody tr { border-bottom: 1px solid rgba(255,255,255,0.07); transition: background 0.18s; }
        .analytics-table tbody tr:hover { background: rgba(15,23,42,0.9); }
        .badge { display: inline-flex; align-items: center; justify-content: center; padding: 5px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .badge.instagram { background: linear-gradient(135deg,#ff8ab4,#ff5ea2); color:#020617; }
        .badge.tiktok    { background: linear-gradient(135deg,#5be3c7,#38bdf8); color:#020617; }
        .badge.twitter   { background: linear-gradient(135deg,#60a5fa,#38bdf8); color:#020617; }
        .badge.youtube   { background: linear-gradient(135deg,#f97373,#ef4444); color:#020617; }
        .view-link { position:relative; color:var(--neon); text-decoration:none; font-weight:500; font-size:0.86rem; display:inline-flex; align-items:center; gap:4px; }

        /* Support Tickets & Chat */
        .back-link { display: inline-flex; align-items: center; gap: 8px; color: var(--text-soft); font-size: 0.84rem; font-weight: 500; background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 20px; transition: color .18s; }
        .back-link:hover { color: var(--text); }
        .ticket-list { display: flex; flex-direction: column; gap: 10px; }
        .ticket-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: background .18s, border-color .18s, transform .14s; }
        .ticket-row:hover { background: var(--surface-2); border-color: var(--border-2); transform: translateY(-1px); }
        .ticket-row-left  { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .ticket-row-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .ticket-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .dot-open   { background: var(--neon); box-shadow: 0 0 6px rgba(108,242,213,0.6); }
        .dot-closed { background: var(--text-muted); }
        .ticket-row-body { flex: 1; min-width: 0; }
        .ticket-row-subject { font-size: 0.88rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ticket-row-meta { font-size: 0.74rem; color: var(--text-soft); margin-top: 2px; display: flex; gap: 6px; flex-wrap: wrap; }
        .ticket-closed .ticket-row-subject { color: var(--text-soft); }
        .ticket-badge { font-size: 0.7rem; padding: 3px 10px; border-radius: 999px; font-weight: 700; white-space: nowrap; }
        .badge-open   { background: var(--neon-dim); border: 1px solid var(--neon-border); color: var(--neon); }
        .badge-closed { background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.25); color: var(--text-soft); }
        
        .chat-shell { display: flex; flex-direction: column; height: 560px; overflow: hidden; border-radius: 20px; }
        .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.04); flex-shrink: 0; gap: 12px; flex-wrap: wrap; }
        .chat-header-left  { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .chat-ticket-id { font-size: 0.72rem; color: var(--text-soft); font-weight: 600; }
        .chat-ticket-subject { font-size: 0.9rem; font-weight: 700; color: var(--text); }
        .btn-close-ticket { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); color: #fca5a5; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .18s, transform .14s; }
        .btn-close-ticket:hover { background: rgba(239,68,68,0.16); transform: translateY(-1px); }
        .chat-messages { flex: 1; overflow-y: auto; padding: 20px 18px; display: flex; flex-direction: column; gap: 16px; }
        .chat-messages::-webkit-scrollbar { width: 5px; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .chat-empty { text-align: center; padding: 40px 0; color: var(--text-soft); font-size: 0.88rem; }
        .chat-empty i { font-size: 2rem; display: block; margin-bottom: 10px; opacity: .3; }
        .chat-msg { display: flex; gap: 10px; align-items: flex-end; }
        .msg-user  { flex-direction: row-reverse; }
        .msg-admin { flex-direction: row; }
        .msg-avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
        .msg-user  .msg-avatar { background: var(--neon-dim); color: var(--neon); }
        .msg-admin .msg-avatar { background: rgba(56,189,248,0.14); color: #7dd3fc; }
        .msg-bubble-wrap { display: flex; flex-direction: column; max-width: 72%; }
        .msg-user  .msg-bubble-wrap { align-items: flex-end; }
        .msg-admin .msg-bubble-wrap { align-items: flex-start; }
        .msg-sender { font-size: 0.7rem; color: var(--text-soft); margin-bottom: 4px; font-weight: 600; }
        .msg-bubble { padding: 10px 14px; border-radius: 16px; font-size: 0.86rem; line-height: 1.55; word-break: break-word; }
        .msg-user  .msg-bubble { background: var(--neon-dim); border: 1px solid var(--neon-border); color: var(--text); border-bottom-right-radius: 4px; }
        .msg-admin .msg-bubble { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-bottom-left-radius: 4px; }
        .msg-time  { font-size: 0.68rem; color: var(--text-muted); margin-top: 4px; }
        .msg-image { max-width: 220px; border-radius: 12px; margin-top: 5px; cursor: pointer; border: 1px solid var(--border); display: block; }
        
        .chat-input-bar { display: flex; align-items: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--border); background: rgba(255,255,255,0.03); flex-shrink: 0; }
        .chat-textarea { flex: 1; padding: 10px 14px; border-radius: 14px; border: 1px solid rgba(148,163,184,0.3); background: rgba(6,10,17,0.9); color: var(--text); font-family: inherit; font-size: 0.88rem; resize: none; outline: none; line-height: 1.5; max-height: 120px; overflow-y: auto; transition: border-color .2s, box-shadow .2s; }
        .chat-textarea:focus { border-color: var(--neon); box-shadow: 0 0 0 1px rgba(108,242,213,0.35); }
        .chat-attach-btn { width: 40px; height: 40px; border-radius: 50%; border: none; flex-shrink: 0; background: rgba(255,255,255,0.06); color: var(--text-soft); font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .18s, color .18s; }
        .chat-attach-btn:hover { background: rgba(255,255,255,0.15); color: var(--text); }
        .chat-send-btn { width: 40px; height: 40px; border-radius: 50%; border: none; flex-shrink: 0; background: linear-gradient(135deg, var(--neon), #4dd0e1); color: #020617; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .14s, box-shadow .18s; box-shadow: 0 8px 20px rgba(0,0,0,.5); }
        .chat-send-btn:hover { transform: scale(1.08); box-shadow: 0 12px 28px rgba(0,0,0,.7); }
        .chat-preview-container { padding: 10px 16px; background: rgba(6,10,17,0.95); border-top: 1px solid var(--border); border-bottom: 1px dashed rgba(255,255,255,0.05); position: relative; }
        .chat-preview-box { position: relative; display: inline-block; }
        .chat-preview-img { height: 60px; border-radius: 8px; border: 1px solid var(--border-2); object-fit: cover; }
        .chat-preview-remove { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: var(--danger); color: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }

        /* Members Drawer */
        .members-drawer { position: fixed; right: -320px; top: var(--header-h); bottom: 0; width: 320px; background: rgba(8,13,20,0.98); border-left: 1px solid var(--border); transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 150; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
        .members-drawer.open { right: 0; }
        .main-content { transition: margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .main-content.drawer-open { margin-right: 320px; }
        .drawer-header { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .drawer-title { font-weight: 700; font-size: 1.1rem; }
        .drawer-close { background: none; border: none; color: var(--text-soft); font-size: 1.2rem; cursor: pointer; transition: color 0.15s; }
        .drawer-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 24px; }
        .member-group-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 10px; }
        .member-row { display: flex; align-items: center; gap: 12px; position: relative; margin-bottom: 12px; }
        .member-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--surface-2); font-size: 0.85rem; color: var(--text-soft); flex-shrink: 0; position: relative; }
        .status-dot { width: 9px; height: 9px; border-radius: 50%; position: absolute; bottom: 0; right: 0; border: 2px solid rgba(8,13,20,1); }
        .dot-online { background: #10b981; }
        .dot-offline { background: #4b5563; }
        .member-info { flex: 1; min-width: 0; }
        .member-name { font-size: 0.88rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
        .member-role { font-size: 0.7rem; color: var(--text-soft); }

        @media (max-width: 860px) {
          body { overflow: auto; }
          .app-shell { position: relative; flex-direction: column; top: 0; }
          .sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; padding: 12px 14px; border-right: none; border-bottom: 1px solid var(--border); position: sticky; top: var(--header-h); z-index: 100; background: rgba(8,13,20,0.97); }
          .sidebar-promo-card, .sidebar-footer { display: none; }
          .sidebar-nav { flex-direction: row; flex-wrap: wrap; gap: 6px; padding: 0; flex: none; }
          .nav-item { padding: 8px 14px; font-size: 0.78rem; border-radius: 999px; }
          .nav-active-bar { display: none; }
          .main-content { overflow: visible; }
          .panel { padding: 24px 18px 48px; min-height: unset; }
          .overview-hero { grid-template-columns: 1fr; }
          .kpi-row { grid-template-columns: repeat(3, 1fr); }
        }

        /* Support Extras */
        .support-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .so-item { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); cursor: pointer; text-decoration: none; color: inherit; transition: background .18s, border-color .18s, transform .15s; }
        .so-item:hover { background: var(--surface-2); border-color: var(--border-2); transform: translateY(-1px); }
        .so-icon { width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .so-teal { background: var(--neon-dim); color: var(--neon); }
        .so-gold { background: rgba(245,210,139,0.12); color: var(--gold); }
        .so-text { flex: 1; }
        .so-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 3px; }
        .so-desc  { font-size: 0.78rem; color: var(--text-soft); }
        .so-arrow { color: var(--text-muted); font-size: 0.8rem; }
        .divider-label { text-align: center; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); position: relative; margin: 4px 0 20px; }
        .divider-label::before, .divider-label::after { content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background: var(--border); }
        .divider-label::before { left: 0; } .divider-label::after { right: 0; }

        /* Rules Styling */
        .rules-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .rule-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 18px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); }
        .rule-num { width: 24px; height: 24px; border-radius: 50%; background: var(--neon); color: #020617; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0; margin-top: 2px; }
        .rule-text { font-size: 0.9rem; line-height: 1.5; color: var(--text); flex: 1; }
        .rule-tag { padding: 2px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-left: 8px; vertical-align: middle; }
        .tag-req { background: rgba(239,68,68,0.15); color: #fca5a5; }
        .tag-opt { background: rgba(59,130,246,0.15); color: #93c5fd; }
        .rules-warning { display: flex; gap: 14px; padding: 16px; border-radius: 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #fbbf24; font-size: 0.82rem; line-height: 1.5; }
        .rules-warning i { font-size: 1.1rem; margin-top: 2px; }

        /* Member Actions Dropdown */
        .member-actions { position: relative; }
        .member-details { position: relative; }
        .member-details summary { list-style: none; }
        .member-details summary::-webkit-details-marker { display: none; }
        .btn-kebab { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-soft); transition: background .15s; border: none; background: transparent; }
        .btn-kebab:hover { background: var(--surface-2); color: var(--text); }
        .member-dropdown { position: absolute; right: 0; top: 100%; width: 180px; background: #161e2b; border: 1px solid var(--border-2); border-radius: 12px; padding: 6px; z-index: 200; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .dropdown-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; font-size: 0.82rem; font-weight: 500; color: var(--text); border: none; background: transparent; cursor: pointer; text-align: left; transition: background .15s; }
        .dropdown-item:hover { background: rgba(255,255,255,0.06); }
        .dropdown-item.danger { color: #fca5a5; }
        .dropdown-item.danger:hover { background: rgba(239,68,68,0.1); }
        .dropdown-item i { width: 16px; text-align: center; font-size: 0.9rem; opacity: 0.7; }
        .member-avatar.admin { color: var(--neon); }
      `}</style>

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-logo"><i className="fa-solid fa-bolt"></i> AutoSocial</div>
        <div className="topbar-sep"></div>
        <span className="topbar-promo-name">{promotion.campaign_title || promotion.name}</span>
        <div className="topbar-right">
          <span className="topbar-user">{user?.email?.split('@')[0]}</span>
          {already_joined && !is_owner && (
            <button onClick={handleLeave} className="topbar-btn" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", cursor: "pointer" }}>
              <i className="fa-solid fa-person-walking-arrow-right"></i> Leave Campaign
            </button>
          )}
          <Link href="/my-promotions" className="topbar-btn"><i className="fa-solid fa-arrow-left"></i> My Promotions</Link>
          <Link href="/" className="topbar-btn"><i className="fa-solid fa-house"></i></Link>
        </div>
      </header>

      {/* App Shell */}
      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-promo-card">
            <div className="sidebar-cover">
              {promotion.image_path ? <img src={promotion.image_path} alt="" /> : <div className="sidebar-cover-fallback">{(promotion.campaign_title || promotion.name)[0]}</div>}
            </div>
            <div className="sidebar-promo-title">{promotion.campaign_title || promotion.name}</div>
            <div className="sidebar-promo-meta">{promotion.budget ? `$${promotion.budget} budget · ` : ''}{join_count} joined</div>
            {promotion.is_active ? <span className="sidebar-badge badge-live"><i className="fa-solid fa-bolt" style={{ fontSize: '.6rem' }}></i> Live</span> : <span className="sidebar-badge badge-scheduled"><i className="fa-regular fa-circle-dot" style={{ fontSize: '.6rem' }}></i> Scheduled</span>}
          </div>

          <nav className="sidebar-nav">
            <div className={`nav-item ${activePanel === 'overview' ? 'active' : ''}`} onClick={() => setActivePanel('overview')}>
              <div className="nav-active-bar"></div><i className="fa-solid fa-layer-group"></i> Overview
            </div>
            {(user_join_status === 'approved' || is_owner) && (
              <>
                <div className={`nav-item ${activePanel === 'notifications' ? 'active' : ''}`} onClick={() => setActivePanel('notifications')}>
                  <div className="nav-active-bar"></div><i className="fa-solid fa-bell"></i> Notifications
                  {unread_count > 0 && <span className="nav-pill" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>{unread_count}</span>}
                </div>
                <div className={`nav-item ${activePanel === 'guidelines' ? 'active' : ''}`} onClick={() => setActivePanel('guidelines')}>
                  <div className="nav-active-bar"></div><i className="fa-solid fa-scroll"></i> Guidelines
                </div>
                <div className={`nav-item ${activePanel === 'submit' ? 'active' : ''}`} onClick={() => setActivePanel('submit')}>
                  <div className="nav-active-bar"></div><i className="fa-solid fa-upload"></i> Submit
                </div>
                <div className={`nav-item ${activePanel === 'analytics' ? 'active' : ''}`} onClick={() => setActivePanel('analytics')}>
                  <div className="nav-active-bar"></div><i className="fa-solid fa-chart-line"></i> Analytics
                </div>
              </>
            )}
            <div className={`nav-item ${activePanel === 'support' ? 'active' : ''}`} onClick={() => { setActivePanel('support'); setChatTicket(null); }}>
              <div className="nav-active-bar"></div><i className="fa-solid fa-headset"></i> Support
              {(support_tickets?.some((t: any) => t.unread_count > 0)) && <span className="nav-pill" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>!</span>}
            </div>
            {(is_admin || is_owner) && (
              <>
                <div className="nav-sep" style={{ height: '1px', background: 'var(--border)', margin: '12px 16px', opacity: 0.5 }}></div>
                <div className={`nav-item ${activePanel === 'manage-tickets' ? 'active' : ''}`} onClick={() => { setActivePanel('manage-tickets'); setChatTicket(null); }}>
                  <div className="nav-active-bar"></div><i className="fa-solid fa-ticket"></i> Manage Tickets
                  {(manage_tickets?.some((t: any) => t.unread_count > 0)) && <span className="nav-pill" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>!</span>}
                </div>
                <div className={`nav-item ${activePanel === 'join-requests' ? 'active' : ''}`} onClick={() => setActivePanel('join-requests')}>
                  <div className="nav-active-bar"></div><i className="fa-solid fa-user-clock"></i> Join Requests
                  {join_requests?.length > 0 && <span className="nav-pill" style={{ background: 'var(--neon)', color: '#000', border: 'none' }}>{join_requests.length}</span>}
                </div>
              </>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="budget-bar-label"><span>Campaign Growth</span><strong>{Math.min(Math.round((join_count / 25) * 100), 100)}%</strong></div>
            <div className="budget-bar-track"><div className="budget-bar-fill" style={{ width: `${Math.min((join_count / 25) * 100), 100}%` }}></div></div>
          </div>
        </aside>

        {/* Main content */}
        <main className={`main-content ${drawerOpen ? 'drawer-open' : ''}`} id="main-content">
          {messageFlash && (
            <div style={{ padding: '24px 40px 0' }}>
              <div className={`alert ${messageFlash.isError ? 'alert-error' : 'alert-success'}`}>
                <i className={`fa-solid ${messageFlash.isError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i> {messageFlash.text}
              </div>
            </div>
          )}

          {/* OVERVIEW PANEL */}
          <section className={`panel ${activePanel === 'overview' ? 'active' : ''}`}>
            <div className="panel-title">Overview</div>
            <div className="panel-subtitle">Campaign details and join status</div>

            <div className="overview-hero">
              <div className="overview-cover">
                {promotion.image_path ? <img src={promotion.image_path} alt="" /> : <div className="overview-cover-fallback">{(promotion.campaign_title || promotion.name)[0]}</div>}
              </div>

              <div className="join-card">
                {user_join_status === 'approved' || is_owner ? (
                  <>
                    <h3><i className="fa-solid fa-circle-check" style={{ color: "#6ee7b7" }}></i> {is_owner ? "You are the Owner" : "You're In!"}</h3>
                    <p>{is_owner ? "Manage your campaign members and track submissions from the sidebar." : "You've successfully joined this promotion. Head over to Submit to upload your video."}</p>
                    
                    {is_owner && join_requests && join_requests.length > 0 && (
                      <div 
                        onClick={() => setActivePanel('join-requests')}
                        style={{ 
                          background: 'rgba(108,242,213,0.1)', 
                          border: '1px solid var(--neon-border)', 
                          borderRadius: '16px', 
                          padding: '16px', 
                          marginBottom: '20px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          transition: 'transform 0.2s, background 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(108,242,213,0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(108,242,213,0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '12px', 
                          background: 'var(--neon)', 
                          color: '#000', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}>
                          <i className="fa-solid fa-user-clock"></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--neon)', fontSize: '0.95rem' }}>{join_requests.length} Pending Join Requests</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>New users are waiting to join your campaign. Review them now.</div>
                        </div>
                        <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-muted)' }}></i>
                      </div>
                    )}

                    <div className="btn-joined"><i className="fa-solid fa-check"></i> {is_owner ? "Owner" : "Joined"}</div>
                    {!is_owner && <button className="btn-ghost" onClick={() => setActivePanel('submit')}><i className="fa-solid fa-upload"></i> Submit Video</button>}
                  </>
                ) : user_join_status === 'pending' ? (
                  <>
                    <h3><i className="fa-solid fa-hourglass-half" style={{ color: "var(--gold)" }}></i> Request Pending</h3>
                    <p>Your request to join is being reviewed by the campaign admins. You'll be notified once approved.</p>
                    <div style={{ background: 'rgba(245,210,139,0.1)', border: '1px solid rgba(245,210,139,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--gold)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <i className="fa-solid fa-circle-info"></i>
                      <span>Access to campaign features is locked until approval.</span>
                    </div>
                    <button className="btn-ghost" disabled style={{ width: '100%', opacity: 0.8 }}><i className="fa-solid fa-user-clock"></i> Awaiting Approval</button>
                  </>
                ) : (
                  <>
                    <h3>Join this Promotion</h3>
                    <p>Join to unlock video submission, analytics tracking, and direct support for this campaign.</p>
                    <button onClick={handleJoin} className="btn-primary" style={{ width: '100%' }}>
                      <i className={`fa-solid ${promotion.join_policy === 'manual' ? 'fa-user-plus' : 'fa-handshake-simple'}`}></i>
                      {promotion.join_policy === 'manual' ? ' Request to Join' : ' Join Promotion'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="section-label">Campaign Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {promotion.is_active ? <span className="status-chip chip-live"><i className="fa-solid fa-bolt" style={{ fontSize: '.65rem' }}></i> Live</span> : <span className="status-chip chip-scheduled"><i className="fa-regular fa-circle-dot" style={{ fontSize: '.65rem' }}></i> Scheduled</span>}
                  <h2 className="ov-title">{promotion.campaign_title || promotion.name}</h2>
                </div>
                <button type="button" className="btn-ghost" onClick={() => setDrawerOpen(!drawerOpen)} style={{ alignSelf: 'flex-start', padding: '10px 18px', fontWeight: 600, borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'var(--text)', transition: 'background .15s, border-color .15s', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                  Members <i className="fa-solid fa-users" style={{ color: 'var(--text-soft)' }}></i>
                </button>
              </div>

              {promotion.campaign_type && <span className="ov-type"><i className="fa-solid fa-tag"></i> {promotion.campaign_type.replace('-', ' ')}</span>}
              {promotion.details && <p className="ov-desc">{promotion.details}</p>}

              <div className="meta-chips">
                {promotion.budget && <div className="meta-chip"><i className="fa-solid fa-sack-dollar"></i><span>Budget</span><strong>${promotion.budget}</strong></div>}
                <div className="meta-chip" style={{ cursor: 'pointer' }} onClick={() => setDrawerOpen(true)}><i className="fa-solid fa-users"></i><span>Joined</span><strong>{join_count}</strong></div>
              </div>

              <div className="platforms-row">
                <span className="platforms-lbl">Platforms</span>
                {renderPlatforms(promotion.platforms)}
              </div>
            </div>

            <div className="section-label">Campaign Details</div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">Campaign ID</div><div className="stat-value">#{promotion.campaign_id}</div></div>
              {promotion.budget && <div className="stat-card"><div className="stat-label">Budget</div><div className="stat-value hi">${promotion.budget}</div></div>}
              <div className="stat-card"><div className="stat-label">Total Joined</div><div className="stat-value hi">{join_count}</div></div>
              <div className="stat-card"><div className="stat-label">Status</div><div className="stat-value">{promotion.is_active ? 'Active' : 'Scheduled'}</div></div>
              <div className="stat-card"><div className="stat-label">Type</div><div className="stat-value">{promotion.campaign_type || '—'}</div></div>
            </div>
          </section>

          {/* NOTIFICATIONS PANEL */}
          <section className={`panel ${activePanel === 'notifications' ? 'active' : ''}`}>
            <div className="panel-title">Notifications</div>
            <div className="panel-subtitle">Updates and alerts for this campaign</div>
            
            {(is_admin || is_owner) && (
              <div className="glass-card" style={{ padding: '20px', marginBottom: '32px', border: '1px solid var(--neon-border)', background: 'rgba(108,242,213,0.03)' }}>
                <div className="section-label" style={{ marginBottom: '16px' }}><i className="fa-solid fa-bullhorn" style={{ color: 'var(--neon)' }}></i> Post New Announcement</div>
                <form onSubmit={handlePostAnnouncement}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <input type="text" className="form-input" placeholder="Title" value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} required style={{ paddingLeft: '14px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <textarea className="form-textarea" placeholder="Announcement message..." value={announcementMessage} onChange={e => setAnnouncementMessage(e.target.value)} required></textarea>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="file" id="ann-img" hidden onChange={handleAnnouncementImageChange} accept="image/*" />
                    <button type="button" onClick={() => document.getElementById('ann-img')?.click()} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                      <i className="fa-solid fa-image"></i> {announcementImage ? 'Change Image' : 'Add Image'}
                    </button>
                    {announcementPreview && (
                      <div style={{ position: 'relative' }}>
                        <img src={announcementPreview} style={{ height: '36px', borderRadius: '6px', border: '1px solid var(--border)' }} alt="Preview" />
                        <button type="button" onClick={() => { setAnnouncementImage(null); setAnnouncementPreview(null); }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--danger)', border: 'none', color: 'white', fontSize: '10px', cursor: 'pointer' }}>×</button>
                      </div>
                    )}
                    <button type="submit" className="btn-primary" style={{ marginLeft: 'auto', padding: '8px 20px', fontSize: '0.85rem' }}>Post Announcement</button>
                  </div>
                </form>
              </div>
            )}

            <div className="notif-list">
              {announcements?.length ? announcements.map((n: any) => (
                <div key={n.id} className="notif-item" style={{ position: 'relative' }}>
                  <div className="notif-icon ni-system"><i className="fa-solid fa-bullhorn"></i></div>
                  <div className="notif-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="notif-title">{n.title}</div>
                      <button onClick={() => handleDismissAnnouncement(n.id)} className="btn-dismiss-notif" style={{ opacity: 0.6, cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-soft)', padding: '4px' }}>
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                    <div className="notif-desc">{n.message}</div>
                    {n.image_url && <img src={n.image_url} style={{ maxWidth: '100%', borderRadius: '12px', marginTop: '12px', border: '1px solid var(--border)' }} alt="Announcement" />}
                    <div className="notif-time" style={{ opacity: 0.6, marginTop: '8px' }}>Sent by {n.author_email?.split('@')[0]} • {n.created_at_fmt}</div>
                  </div>
                  {!n.is_read && <div className="notif-dot" style={{ position: 'absolute', top: '14px', right: '40px' }}></div>}
                </div>
              )) : (
                <div className="empty-state"><i className="fa-regular fa-bell-slash"></i><p>No notifications yet.</p></div>
              )}
            </div>
          </section>

          {/* GUIDELINES PANEL */}
          <section className={`panel ${activePanel === 'guidelines' ? 'active' : ''}`}>
            <div className="panel-title">Rules & Guidelines</div>
            <div className="panel-subtitle">Follow these rules to keep your submission valid</div>
            <div className="rules-list">
              <div className="rule-item">
                <div className="rule-num">1</div>
                <div className="rule-text">Video must be publicly visible. <span className="rule-tag tag-req">Required</span></div>
              </div>
              <div className="rule-item">
                <div className="rule-num">2</div>
                <div className="rule-text">Must mention the campaign brand name. <span className="rule-tag tag-req">Required</span></div>
              </div>
              <div className="rule-item">
                <div className="rule-num">3</div>
                <div className="rule-text">Video should be at least 15 seconds long. <span className="rule-tag tag-opt">Recommended</span></div>
              </div>
              <div className="rule-item">
                <div className="rule-num">4</div>
                <div className="rule-text">Avoid using copyrighted music unless licensed. <span className="rule-tag tag-opt">Optional</span></div>
              </div>
            </div>
            <div className="rules-warning">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <div>Failure to follow the required guidelines may lead to submission rejection or blacklisting of your account.</div>
            </div>
          </section>

          {/* SUBMIT VIDEO PANEL */}
          <section className={`panel ${activePanel === 'submit' ? 'active' : ''}`}>
            <div className="panel-title">Submit Video</div>
            <div className="panel-subtitle">Submit your promotion video and link your social accounts</div>
            {!already_joined && (
              <div className="alert alert-error"><i className="fa-solid fa-lock" style={{ marginRight: '8px' }}></i> You need to join this promotion first.</div>
            )}
            <div className={!already_joined ? "disabled-flow" : ""} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '30px' }}>
              <div className="ticket-form-card glass-card" style={{ flex: 1, minWidth: '300px' }}>
                <div className="ticket-form-header"><i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--neon)' }}></i><span>Submit Video</span></div>
                <form className="submit-form" onSubmit={handleSubmitVideo} style={{ marginTop: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <div className="input-wrap">
                      <i className="fa-solid fa-layer-group"></i>
                      <select className="form-select" value={submitPlatform} onChange={e => setSubmitPlatform(e.target.value)}>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="twitter">X / Twitter</option>
                        <option value="youtube">YouTube</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Video URL</label>
                    <div className="input-wrap">
                      <i className="fa-solid fa-link"></i>
                      <input type="url" className="form-input" value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" disabled={!already_joined}><i className="fa-solid fa-paper-plane"></i> Submit Video</button>
                </form>
              </div>

              <div className="ticket-form-card glass-card" style={{ flex: 1, minWidth: '300px' }}>
                <div className="ticket-form-header"><i className="fa-solid fa-user-plus" style={{ color: 'var(--gold)' }}></i><span>Link New Account</span></div>
                <form className="submit-form" onSubmit={handleLinkAccount} style={{ marginTop: '18px' }}>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <div className="input-wrap">
                      <i className="fa-solid fa-mobile-screen"></i>
                      <select className="form-select" value={linkPlatform} onChange={e => setLinkPlatform(e.target.value)}>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="twitter">X / Twitter</option>
                        <option value="youtube">YouTube</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <div className="input-wrap">
                      <i className="fa-solid fa-at"></i>
                      <input type="text" className="form-input" value={linkUsername} onChange={e => setLinkUsername(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg,var(--success),#059669)', color: '#ecfdf5' }}><i className="fa-solid fa-link"></i> Register Account</button>
                </form>
              </div>
            </div>

            <div className="section-label">Your Linked Accounts</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {accounts?.map((acc: any) => (
                <div key={acc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '15px', padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={`/static/logos/${acc.platform}_logo.png`} style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt="" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '2px', fontSize: '1.05rem' }}>@{acc.account_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{acc.platform}</div>
                  </div>
                  <button type="button" onClick={() => handleDeleteAccount(acc.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                </div>
              ))}
              {!accounts?.length && <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px 0' }}><p>No social accounts linked.</p></div>}
            </div>
            
            {already_joined && (
              <div style={{ marginTop: '36px' }}>
                <div className="section-label">Your Submissions</div>
                <div className="sv-list">
                  {submitted_videos?.map((sv: any, i: number) => (
                    <div key={i} className="sv-item">
                      <div className="sv-icon"><img src={`/static/logos/${sv.platform}_logo.png`} alt="" /></div>
                      <div className="sv-body">
                        <a href={sv.video_url} target="_blank" className="sv-url">{sv.video_url}</a>
                        <div className="sv-date">Submitted {sv.submitted_at}</div>
                      </div>
                      <span className="sv-badge">Submitted</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ANALYTICS PANEL */}
          <section className={`panel ${activePanel === 'analytics' ? 'active' : ''}`}>
            <div className="panel-title">Analytics</div>
            <div className="panel-subtitle">Performance tracking for this campaign</div>
            
            {!is_admin && !is_owner ? (
              <>
                <div className="kpi-grid">
                  <div className="kpi"><div className="kpi-label">Total Views</div><h2>{analytics?.total_views || 0}</h2></div>
                  <div className="kpi"><div className="kpi-label">Total Likes</div><h2 style={{ color: '#f87171' }}>{analytics?.total_likes || 0}</h2></div>
                  <div className="kpi"><div className="kpi-label">Total Comments</div><h2 style={{ color: '#93c5fd' }}>{analytics?.total_comments || 0}</h2></div>
                </div>

                <div className="section-label">Your Submissions</div>
                <div className="table-card">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>Video URL</th>
                        <th>Views</th>
                        <th>Likes</th>
                        <th>Comments</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics?.videos?.map((v: any, i: number) => (
                        <tr key={i}>
                          <td><span className={`badge ${v.platform}`}>{v.platform}</span></td>
                          <td><a href={v.video_url} target="_blank" className="view-link">{v.video_url.split('/').pop() || 'Video'} <i className="fa-solid fa-up-right-from-square" style={{fontSize:'.7rem'}}></i></a></td>
                          <td><strong>{v.views?.toLocaleString()}</strong></td>
                          <td>{v.likes?.toLocaleString()}</td>
                          <td>{v.comments?.toLocaleString()}</td>
                          <td style={{fontSize:'.75rem', color:'var(--text-soft)'}}>{v.last_updated}</td>
                        </tr>
                      ))}
                      {!analytics?.videos?.length && <tr><td colSpan={6} style={{textAlign:'center', padding:'40px', color:'var(--text-soft)'}}>No submissions yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="kpi-grid">
                  <div className="kpi"><div className="kpi-label">Total Views</div><h2>{admin_analytics?.total_views || 0}</h2></div>
                  <div className="kpi"><div className="kpi-label">Total Likes</div><h2 style={{ color: '#f87171' }}>{admin_analytics?.total_likes || 0}</h2></div>
                  <div className="kpi"><div className="kpi-label">Total Comments</div><h2 style={{ color: '#93c5fd' }}>{admin_analytics?.total_comments || 0}</h2></div>
                </div>

                <div className="section-label">User Submissions</div>
                <div className="table-card">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>User / Platform</th>
                        <th>Video URL</th>
                        <th>Views</th>
                        <th>Likes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin_analytics?.users?.map((u: any) => (
                        u.videos.map((v: any, vi: number) => (
                          <tr key={`${u.name}-${vi}`} style={{ opacity: v.is_blacklisted ? 0.5 : 1 }}>
                            <td>
                              <div style={{fontWeight:700}}>{u.name}</div>
                              <span className={`badge ${v.platform}`} style={{fontSize:'.6rem', padding:'2px 6px'}}>{v.platform}</span>
                            </td>
                            <td>
                              <a href={v.video_url} target="_blank" className="view-link">{v.video_url.split('/').pop()}</a>
                              {v.is_blacklisted && <span style={{marginLeft:'8px', fontSize:'.65rem', color:'#f87171', fontWeight:700}}><i className="fa-solid fa-ban"></i> BLACKLISTED</span>}
                            </td>
                            <td><strong>{v.views?.toLocaleString()}</strong></td>
                            <td>{v.likes?.toLocaleString()}</td>
                            <td>
                              <div style={{display:'flex', gap:'6px'}}>
                                {v.is_blacklisted ? (
                                  <button onClick={() => handleAdminAction('whitelist', v.video_url, v.platform)} className="btn-ghost" style={{padding:'4px 8px', fontSize:'.7rem', borderColor:'#6ee7b7', color:'#6ee7b7'}}><i className="fa-solid fa-check"></i> Whitelist</button>
                                ) : (
                                  <button onClick={() => handleAdminAction('blacklist', v.video_url, v.platform)} className="btn-ghost" style={{padding:'4px 8px', fontSize:'.7rem', borderColor:'#f87171', color:'#f87171'}}><i className="fa-solid fa-ban"></i> Blacklist</button>
                                )}
                                <button onClick={() => handleAdminAction('remove', v.video_url, v.platform)} className="btn-ghost" style={{padding:'4px 8px', fontSize:'.7rem', borderColor:'rgba(255,255,255,0.1)'}}><i className="fa-solid fa-trash"></i></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ))}
                      {!admin_analytics?.users?.length && <tr><td colSpan={5} style={{textAlign:'center', padding:'40px', color:'var(--text-soft)'}}>No submissions across campaign.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* SUPPORT PANEL */}
          <section className={`panel ${activePanel === 'support' ? 'active' : ''}`}>
            <div className="panel-title">Support</div>
            <div className="panel-subtitle">Raise a ticket — chat with the admin</div>

            {!chatTicket && (
              <div id="support-list-view">
                <div className="support-options">
                  <a href="#" onClick={(e) => { e.preventDefault(); setChatTicket('create'); }} className="so-item">
                    <div className="so-icon so-teal"><i className="fa-solid fa-ticket"></i></div>
                    <div className="so-text">
                      <div className="so-title">Raise a Ticket</div>
                      <div className="so-desc">Direct line to campaign managers for specific issues.</div>
                    </div>
                    <i className="fa-solid fa-chevron-right so-arrow"></i>
                  </a>
                  <a href="mailto:support@autosocial.com" className="so-item">
                    <div className="so-icon so-gold"><i className="fa-solid fa-envelope"></i></div>
                    <div className="so-text">
                      <div className="so-title">Email Support</div>
                      <div className="so-desc">For general inquiries and billing questions.</div>
                    </div>
                    <i className="fa-solid fa-chevron-right so-arrow"></i>
                  </a>
                </div>

                <div className="divider-label">Or manage existing tickets</div>
                
                <div className="section-label">Your Active Tickets</div>
                <div className="ticket-list">
                  {support_tickets?.map((t: any) => (
                    <div key={t.id} className={`ticket-row ${t.status === 'closed' ? 'ticket-closed' : 'ticket-open'}`} onClick={() => openChat(t)}>
                      <div className="ticket-row-left">
                        <div className={`ticket-status-dot ${t.status === 'open' ? 'dot-open' : 'dot-closed'}`}></div>
                        <div className="ticket-row-body">
                          <div className="ticket-row-subject">#{t.id} — {t.subject}</div>
                          <div className="ticket-row-meta"><span>Opened {t.created_at}</span></div>
                        </div>
                      </div>
                      <div className="ticket-row-right">
                        {t.unread_count > 0 && <span className="ticket-unread-badge">{t.unread_count}</span>}
                        <span className={`ticket-badge ${t.status === 'open' ? 'badge-open' : 'badge-closed'}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                  {!support_tickets?.length && <div className="empty-state"><p>No tickets yet.</p></div>}
                </div>
              </div>
            )}

            {chatTicket === 'create' && (
              <div id="support-create-view">
                <button className="back-link" onClick={() => setChatTicket(null)}><i className="fa-solid fa-arrow-left"></i> Back to Tickets</button>
                <div className="ticket-form-card glass-card">
                  <div className="ticket-form-header"><i className="fa-solid fa-ticket" style={{ color: 'var(--neon)' }}></i><span>New Support Ticket</span></div>
                  <form className="support-form" onSubmit={handleCreateTicket} style={{ marginTop: '18px' }}>
                    <div className="form-group">
                      <label className="form-label">Subject</label>
                      <input type="text" className="form-input" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="form-textarea" value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} required></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="btn-primary"><i className="fa-solid fa-paper-plane"></i> Submit Ticket</button>
                      <button type="button" className="btn-ghost" onClick={() => setChatTicket(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {chatTicket && chatTicket !== 'create' && (
              <div id="support-chat-view">
                <button className="back-link" onClick={() => setChatTicket(null)}><i className="fa-solid fa-arrow-left"></i> Back to Tickets</button>
                <div className="chat-shell glass-card">
                  <div className="chat-header">
                    <div className="chat-header-left">
                      <div className="ticket-status-dot dot-open"></div>
                      <div>
                        <div className="chat-ticket-id">#{chatTicket.id}</div>
                        <div className="chat-ticket-subject">{chatTicket.subject}</div>
                      </div>
                    </div>
                    <div className="chat-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {chatTicket.subject.startsWith("Join Request:") && (
                        <>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              onClick={() => handleModerateJoin(chatTicket.user_id, 'reject')} 
                              className="btn-ghost" 
                              style={{ padding: '7px 16px', fontSize: '0.78rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}
                            >
                              <i className="fa-solid fa-user-xmark" style={{ fontSize: '0.85rem' }}></i> Reject
                            </button>
                            <button 
                              onClick={() => handleModerateJoin(chatTicket.user_id, 'approve')} 
                              className="btn-primary" 
                              style={{ padding: '7px 16px', fontSize: '0.78rem', boxShadow: 'none' }}
                            >
                              <i className="fa-solid fa-user-check" style={{ fontSize: '0.85rem' }}></i> Approve
                            </button>
                          </div>
                          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
                        </>
                      )}
                      <button type="button" className="btn-close-ticket" onClick={closeTicket} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px' }}>
                        <i className="fa-solid fa-trash-can"></i> Delete
                      </button>
                    </div>
                  </div>

                  <div className="chat-messages" ref={chatScrollRef}>
                    {chatMessages.map((msg, i) => {
                      const isMe = msg.sender === user?.email;
                      const displayContent = msg.content.startsWith("[IMAGE] ") 
                        ? <img src={msg.content.replace("[IMAGE] ", "")} className="msg-image" onClick={(e) => window.open(e.currentTarget.src, '_blank')} /> 
                        : msg.content;
                      
                      return (
                        <div key={i} className={`chat-msg ${isMe ? 'msg-user' : 'msg-admin'}`}>
                          <div className="msg-avatar">{isMe ? <i className="fa-solid fa-user"></i> : <i className="fa-solid fa-headset"></i>}</div>
                          <div className="msg-bubble-wrap">
                            <div className="msg-sender">{isMe ? 'You' : msg.sender.split('@')[0]}</div>
                            <div className="msg-bubble">{displayContent}</div>
                            <div className="msg-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              {msg.created_at || msg.time}
                              {isMe && <span style={{ marginLeft: '6px', fontSize: '0.65rem' }}><i className={`fa-solid ${msg.is_read ? 'fa-check-double' : 'fa-check'}`} style={{ color: msg.is_read ? '#3b82f6' : '#7a8899' }}></i></span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {pendingImage && (
                    <div className="chat-preview-container" style={{ display: 'block' }}>
                      <div className="chat-preview-box">
                        <img src={pendingImage} className="chat-preview-img" />
                        <button type="button" className="chat-preview-remove" onClick={() => { setPendingImage(null); setPendingImageFile(null); }}><i className="fa-solid fa-xmark"></i></button>
                      </div>
                    </div>
                  )}

                  <div className="chat-input-bar">
                    <input type="file" id="chat-file-input" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                    <textarea className="chat-textarea" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }} placeholder="Type your message..." rows={1}></textarea>
                    <button type="button" className="chat-attach-btn" onClick={() => document.getElementById('chat-file-input')?.click()}><i className="fa-solid fa-paperclip"></i></button>
                    <button type="button" className="chat-send-btn" onClick={handleSendChat}><i className="fa-solid fa-paper-plane"></i></button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* MANAGE TICKETS PANEL */}
          {is_admin && (
            <section className={`panel ${activePanel === 'manage-tickets' ? 'active' : ''}`}>
              <div className="panel-title" style={{ color: 'var(--gold)' }}>Manage Tickets</div>
              <div className="ticket-list">
                {manage_tickets?.map((t: any) => (
                  <div key={t.id} className="ticket-row ticket-open" onClick={() => { setChatTicket(t); setActivePanel('support'); openChat(t); }}>
                    <div className="ticket-row-left">
                      <div className="ticket-status-dot dot-open"></div>
                      <div className="ticket-row-body">
                        <div className="ticket-row-subject">#{t.id} — {t.subject}</div>
                        <div className="ticket-row-meta"><span style={{ color: 'var(--gold)' }}>{t.creator_email?.split('@')[0]}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* JOIN REQUESTS PANEL */}
          {(is_admin || is_owner) && (
            <section className={`panel ${activePanel === 'join-requests' ? 'active' : ''}`}>
              <div className="panel-title">Join Requests</div>
              <div className="panel-subtitle">Review and approve members wanting to join your campaign</div>
              
              <div className="notif-list" style={{ marginTop: '24px' }}>
                {join_requests?.length ? join_requests.map((req: any) => (
                  <div key={req.id} className="notif-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                    <div className="notif-icon" style={{ background: 'rgba(108,242,213,0.1)', color: 'var(--neon)' }}><i className="fa-solid fa-user-plus"></i></div>
                    <div className="notif-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="notif-title" style={{ fontSize: '1rem' }}>{req.email}</div>
                          <div className="notif-desc">Wants to join "{promotion.name}"</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={async () => {
                              try {
                                const res = await apiFetch(`/api/promotions/${promotionId}/init-chat/${req.user_id}`, { method: "POST" });
                                // Refresh data to get the new ticket in the list
                                const newData = await apiFetch(`/api/promotions/${promotionId}/detail`);
                                setData(newData);
                                
                                if (res.ticket_id && newData.manage_tickets) {
                                  const newTicket = newData.manage_tickets.find((t: any) => t.id === res.ticket_id);
                                  if (newTicket) {
                                    setChatTicket(newTicket);
                                    setActivePanel('support');
                                    openChat(newTicket);
                                    showFlash("Chat initialized with candidate.");
                                    return;
                                  }
                                }
                                
                                setActivePanel('manage-tickets');
                                showFlash("Chat initialized. View it in Manage Tickets.");
                              } catch (err: any) {
                                showFlash(err.message || "An unexpected error occurred", true);
                              }
                            }}
                            className="btn-ghost" 
                            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                          >
                            <i className="fa-solid fa-comments"></i> Chat
                          </button>
                          <button onClick={() => handleModerateJoin(req.user_id, 'reject')} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>Reject</button>
                          <button onClick={() => handleModerateJoin(req.user_id, 'approve')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Approve</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state"><i className="fa-solid fa-user-shield"></i><p>No pending join requests.</p></div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      <aside id="members-drawer" className={`members-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">Members ({ (online_members?.length || 0) + (offline_members?.length || 0) })</div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="drawer-body">
          <div className="member-group">
            <div className="member-group-label">Online {online_members?.length}</div>
            <div className="member-list">
              {online_members?.map((m: any) => (
                <div key={m.id} className="member-row">
                  <div className={`member-avatar ${m.is_owner || m.is_admin ? 'admin' : ''}`} style={m.is_owner ? { color: 'var(--gold)', border: '1px solid rgba(245,210,139,0.3)' } : {}}>
                    <i className={`fa-solid ${m.is_owner ? 'fa-crown' : (m.is_admin ? 'fa-shield-halved' : 'fa-user')}`}></i>
                    <div className="status-dot dot-online"></div>
                  </div>
                  <div className="member-info">
                    <div className="member-name">{m.name}</div>
                    <div className="member-role">{m.is_owner ? 'Owner' : (m.is_admin ? 'Admin' : 'Member')}</div>
                  </div>
                  {(is_owner || (is_admin && !m.is_owner && !m.is_admin)) && m.id !== user?.id && (
                    <div className="member-actions">
                      <details className="member-details">
                        <summary className="btn-kebab"><i className="fa-solid fa-ellipsis-vertical"></i></summary>
                        <div className="member-dropdown">
                          {is_owner && (
                            <button onClick={() => handleManageMember(m.id, m.is_admin ? 'remove-admin' : 'make-admin')} className="dropdown-item">
                              <i className="fa-solid fa-shield-halved"></i> {m.is_admin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                          )}
                          <button onClick={() => handleManageMember(m.id, 'remove')} className="dropdown-item danger">
                            <i className="fa-solid fa-user-minus"></i> Remove User
                          </button>
                          <button onClick={() => handleManageMember(m.id, 'ban')} className="dropdown-item danger">
                            <i className="fa-solid fa-ban"></i> Ban User
                          </button>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="member-group" style={{ marginTop: '24px' }}>
            <div className="member-group-label">Offline {offline_members?.length}</div>
            <div className="member-list">
              {offline_members?.map((m: any) => (
                <div key={m.id} className="member-row" style={{ opacity: 0.6 }}>
                  <div className={`member-avatar ${m.is_owner || m.is_admin ? 'admin' : ''}`} style={m.is_owner ? { color: 'var(--gold)', border: '1px solid rgba(245,210,139,0.3)' } : {}}>
                    <i className={`fa-solid ${m.is_owner ? 'fa-crown' : (m.is_admin ? 'fa-shield-halved' : 'fa-user')}`}></i>
                    <div className="status-dot dot-offline"></div>
                  </div>
                  <div className="member-info">
                    <div className="member-name">{m.name}</div>
                    <div className="member-role">{m.is_owner ? 'Owner' : (m.is_admin ? 'Admin' : 'Member')}</div>
                  </div>
                  {(is_owner || (is_admin && !m.is_owner && !m.is_admin)) && m.id !== user?.id && (
                    <div className="member-actions">
                      <details className="member-details">
                        <summary className="btn-kebab"><i className="fa-solid fa-ellipsis-vertical"></i></summary>
                        <div className="member-dropdown">
                          {is_owner && (
                            <button onClick={() => handleManageMember(m.id, m.is_admin ? 'remove-admin' : 'make-admin')} className="dropdown-item">
                              <i className="fa-solid fa-shield-halved"></i> {m.is_admin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                          )}
                          <button onClick={() => handleManageMember(m.id, 'remove')} className="dropdown-item danger">
                            <i className="fa-solid fa-user-minus"></i> Remove User
                          </button>
                          <button onClick={() => handleManageMember(m.id, 'ban')} className="dropdown-item danger">
                            <i className="fa-solid fa-ban"></i> Ban User
                          </button>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function PromotionDetailPage() {
  return (
    <Suspense fallback={<div style={{color:'white', padding:'40px'}}>Loading...</div>}>
      <PromotionDetailContent />
    </Suspense>
  );
}
