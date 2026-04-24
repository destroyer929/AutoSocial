"use client";

import { useState } from "react";

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CampaignModal({ isOpen, onClose }: CampaignModalProps) {
  const [platformMode, setPlatformMode] = useState("all");

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal campaign-modal">
        <button type="button" onClick={onClose} className="modal-close">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <h3 className="campaign-title">Create Campaign</h3>
        <p className="campaign-subtitle">
          Set up a campaign influencers will love to work with.
        </p>

        <form>
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
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Describe what this campaign is about"
                ></textarea>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Platforms</label>
              <div className="input-wrapper">
                <i className="fa-brands fa-square-instagram"></i>
                <select
                  name="platform_mode"
                  value={platformMode}
                  onChange={(e) => setPlatformMode(e.target.value)}
                >
                  <option value="all">All platforms</option>
                  <option value="custom">Select specific platforms</option>
                </select>
              </div>

              {platformMode === "custom" && (
                <div className="platform-custom-group" style={{ marginTop: "8px" }}>
                  <div className="platform-chip-row">
                    <label className="platform-chip">
                      <input type="checkbox" name="platforms" value="instagram" />
                      <span>
                        <i className="fa-brands fa-instagram"></i> Instagram
                      </span>
                    </label>
                    <label className="platform-chip">
                      <input type="checkbox" name="platforms" value="youtube" />
                      <span>
                        <i className="fa-brands fa-youtube"></i> YouTube
                      </span>
                    </label>
                    <label className="platform-chip">
                      <input type="checkbox" name="platforms" value="tiktok" />
                      <span>
                        <i className="fa-brands fa-tiktok"></i> TikTok
                      </span>
                    </label>
                    <label className="platform-chip">
                      <input type="checkbox" name="platforms" value="twitter" />
                      <span>
                        <i className="fa-brands fa-x-twitter"></i> Twitter
                      </span>
                    </label>
                  </div>
                  <small className="form-hint">
                    Choose one or more platforms when using "Select specific platforms".
                  </small>
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
                  <option value="music">Music</option>
                  <option value="gambling">Gambling</option>
                  <option value="brands">Brands</option>
                  <option value="film-and-tv">Film & TV</option>
                  <option value="others">Others</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Campaign Image</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-image"></i>
                <input type="file" name="image" accept="image/*" className="file-input" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Budget (USD)</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-dollar-sign"></i>
                <input
                  type="number"
                  name="budget"
                  min="0"
                  step="0.01"
                  placeholder="Enter total budget e.g. 500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="campaign-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
