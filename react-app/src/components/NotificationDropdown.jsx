import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check, Clock, Trash2, AlertTriangle, CheckCircle, FileText } from 'lucide-react'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)
  
  // Get contract address from env
  const proposalManagerAddress = import.meta.env.VITE_PROPOSAL_MANAGER_ADDRESS

  // Use real-time notifications hook
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useRealtimeNotifications(proposalManagerAddress)

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format timestamp to relative time
  const formatTime = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`
    return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`
  }

  // Get icon for notification type
  const getNotificationIcon = (notification) => {
    if (notification.severity === 'critical') return <AlertTriangle size={16} />
    if (notification.severity === 'success') return <CheckCircle size={16} />
    if (notification.severity === 'warning') return <Clock size={16} />
    return <Bell size={16} />
  }

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)
    // Navigate to proposals page if proposal-related
    if (notification.proposalId) {
      navigate('/proposals')
      setShowNotifications(false)
    }
  }

  return (
    <div className="notification-wrapper" ref={notificationRef}>
      <button 
        className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
        onClick={() => setShowNotifications(!showNotifications)}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      
      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="mark-read-btn">
                  <Check size={14} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="clear-all-btn">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={32} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${notif.severity} ${notif.read ? 'read' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">{formatTime(notif.timestamp)}</div>
                  </div>
                  <button 
                    className="notification-delete"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="notification-footer">
            <button onClick={() => { setShowNotifications(false); navigate('/settings'); }}>
              Notification Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
