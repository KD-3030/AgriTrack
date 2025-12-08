import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tractor, AlertTriangle, MapPin, Calendar } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import { getAnalytics } from '../lib/api'
import './HomePage.css'

interface Stats {
  totalMachines: number
  activeMachines: number
  idleMachines: number
  offlineMachines: number
  alertCount: number
  // Alias properties to match both API response and realtime stats
  total?: number
  active?: number
  idle?: number
  offline?: number
  alerts?: number
}

export default function HomePage() {
  const navigate = useNavigate()
  const { machines, connected } = useSocket()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    // Get stats from API
    getAnalytics()
      .then(setStats)
      .catch(console.error)
  }, [])

  // Calculate stats from real-time data if available
  const realtimeStats = {
    total: machines.size,
    active: Array.from(machines.values()).filter(m => m.state === 'active').length,
    idle: Array.from(machines.values()).filter(m => m.state === 'idle').length,
    offline: Array.from(machines.values()).filter(m => m.state === 'off').length,
    alerts: Array.from(machines.values()).reduce((sum, m) => sum + (m.alerts?.length || 0), 0)
  }

  // Normalize stats to use consistent property names
  const displayStats = connected && machines.size > 0 
    ? realtimeStats 
    : stats 
      ? { 
          total: stats.totalMachines,
          active: stats.activeMachines,
          idle: stats.idleMachines,
          offline: stats.offlineMachines,
          alerts: stats.alertCount
        }
      : null

  return (
    <div className="home-page">
      {/* Welcome Section */}
      <section className="welcome-section">
        <h2>Welcome, Farmer! 👋</h2>
        <p>Find and book CRM machinery near you</p>
      </section>

      {/* Stats Grid */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card" onClick={() => navigate('/machines')}>
            <div className="stat-icon active">
              <Tractor size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{displayStats?.active || 0}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          
          <div className="stat-card" onClick={() => navigate('/machines')}>
            <div className="stat-icon idle">
              <Tractor size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{displayStats?.idle || 0}</span>
              <span className="stat-label">Available</span>
            </div>
          </div>

          <div className="stat-card alert" onClick={() => navigate('/machines')}>
            <div className="stat-icon alert">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{displayStats?.alerts || 0}</span>
              <span className="stat-label">Alerts</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate('/bookings')}>
            <div className="stat-icon booking">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">--</span>
              <span className="stat-label">Bookings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="actions-section">
        <h3>Quick Actions</h3>
        <div className="action-cards">
          <div className="action-card" onClick={() => navigate('/machines')}>
            <MapPin size={32} className="action-icon" />
            <div>
              <h4>Find Nearby</h4>
              <p>Browse available machinery</p>
            </div>
          </div>
          <div className="action-card" onClick={() => navigate('/bookings')}>
            <Calendar size={32} className="action-icon" />
            <div>
              <h4>My Bookings</h4>
              <p>View your reservations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="activity-section">
        <h3>Live Updates</h3>
        <div className="activity-list">
          {Array.from(machines.values())
            .filter(m => m.alerts && m.alerts.length > 0)
            .slice(0, 5)
            .map(machine => (
              <div key={machine.id} className="activity-item" onClick={() => navigate(`/machines/${machine.id}`)}>
                <span className="activity-icon">⚠️</span>
                <div className="activity-info">
                  <span className="activity-title">{machine.id}</span>
                  <span className="activity-message">{machine.alerts[0]?.message}</span>
                </div>
              </div>
            ))}
          {machines.size === 0 && (
            <p className="text-muted text-center" style={{ padding: '20px' }}>
              {connected ? 'No recent alerts' : 'Connecting to server...'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
