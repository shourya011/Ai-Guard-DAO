export default function StatCard({ icon: Icon, label, value, valueColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={valueColor ? { color: valueColor } : {}}>
          {value}
        </div>
      </div>
    </div>
  )
}
