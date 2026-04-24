"use client";

import { useState } from "react";
import Link from "next/link";

interface HeaderProps {
  userEmail: string | null;
  onOpenCampaignModal: () => void;
}

export default function Header({ userEmail, onOpenCampaignModal }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header>
      <div className="header-content">
        <div className="logo-block">
          <div className="logo-main">
            <i className="fa-solid fa-robot"></i>
            AutoSocial
          </div>
          <div className="logo-sub">
            {userEmail ? userEmail.split("@")[0] : "Marketing"}
          </div>
        </div>

        <div className="header-actions">
          {userEmail ? (
            <>
              <Link href="/stats" className="btn-header">
                <i className="fa-solid fa-chart-pie"></i> Analytics
              </Link>
              <button type="button" className="btn-header" onClick={onOpenCampaignModal}>
                <i className="fa-solid fa-flag"></i> Create Campaign
              </button>
              <div
                className="nav-dropdown"
                style={{ position: "relative", display: "inline-block" }}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <button
                  className="btn-header"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <i className="fa-solid fa-folder-open"></i> My Promotions
                  <i className="fa-solid fa-chevron-down" style={{ fontSize: "0.7rem", marginLeft: "6px" }}></i>
                </button>
                <div className={`nav-dropdown-content ${showDropdown ? "show" : ""}`}>
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
              <Link href="/promotions" className="btn-header">
                <i className="fa-solid fa-bullhorn"></i> Promotions
              </Link>
              <Link href="/logout" className="btn-header btn-logout">
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </Link>
            </>
          ) : (
            <>
              <Link href="#" className="btn-header">Home</Link>
              <Link href="#paths" className="btn-header">Creators</Link>
              <Link href="#paths" className="btn-header">Brands</Link>
              <Link href="/login" className="btn-header">Log In</Link>
              <Link
                href="/signup"
                className="btn-header"
                style={{
                  background: "var(--neon)",
                  color: "#020617",
                  fontWeight: 700,
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  textDecoration: "none"
                }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
