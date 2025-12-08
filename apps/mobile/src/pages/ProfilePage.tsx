import { useState } from 'react'
import { User, Phone, MapPin, Bell, LogOut, ChevronRight } from 'lucide-react'
import './ProfilePage.css'

export default function ProfilePage() {
  const [notifications, setNotifications] = useState(true)

  // Demo user data - replace with actual auth
  const user = {
    name: 'Demo Farmer',
    phone: '+91 98765 43210',
    location: 'Ludhiana, Punjab',
    farmSize: '15 hectares'
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="avatar">
          <User size={40} />
        </div>
        <h2>{user.name}</h2>
        <p className="phone">{user.phone}</p>
      </div>

      {/* Profile Info */}
      <div className="profile-section">
        <h3>Farm Details</h3>
        <div className="info-card">
          <div className="info-row">
            <div className="info-icon">
              <MapPin size={20} />
            </div>
            <div className="info-content">
              <span className="info-label">Location</span>
              <span className="info-value">{user.location}</span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-icon">
              <span>🌾</span>
            </div>
            <div className="info-content">
              <span className="info-label">Farm Size</span>
              <span className="info-value">{user.farmSize}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="profile-section">
        <h3>Settings</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-left">
              <Bell size={20} />
              <span>Push Notifications</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="settings-row clickable">
            <div className="settings-left">
              <Phone size={20} />
              <span>Update Phone Number</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="profile-section">
        <h3>Support</h3>
        <div className="settings-card">
          <div className="settings-row clickable">
            <div className="settings-left">
              <span>📞</span>
              <span>Contact Helpline</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
          <div className="settings-row clickable">
            <div className="settings-left">
              <span>❓</span>
              <span>FAQs</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Logout */}
      <button className="logout-btn">
        <LogOut size={20} />
        Logout
      </button>

      {/* App Info */}
      <div className="app-info">
        <p>AgriTrack v1.0.0</p>
        <p>Smart India Hackathon 2025</p>
      </div>
    </div>
  )
}
