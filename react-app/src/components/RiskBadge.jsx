export default function RiskBadge({ score, level }) {
  const getRiskClass = () => {
    if (score >= 70) return 'risk-critical'
    if (score >= 50) return 'risk-high'
    if (score >= 30) return 'risk-medium'
    return 'risk-low'
  }

  return (
    <span className={`risk-badge ${getRiskClass()}`}>
      {score}/100 {level?.toUpperCase()}
    </span>
  )
}
