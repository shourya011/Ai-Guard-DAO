import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'

// Notification types
const NOTIFICATION_TYPES = {
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_VOTED: 'proposal_voted',
  PROPOSAL_EXECUTED: 'proposal_executed',
  RISK_ALERT: 'risk_alert',
}

export function useRealtimeNotifications(proposalManagerAddress) {
  const [notifications, setNotifications] = useState(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('dao_notifications')
    return saved ? JSON.parse(saved) : []
  })
  const [unreadCount, setUnreadCount] = useState(0)
  const providerRef = useRef(null)
  const lastBlockRef = useRef(null)

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dao_notifications', JSON.stringify(notifications))
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Setup blockchain event listener
  useEffect(() => {
    if (!proposalManagerAddress) return

    const setupListener = async () => {
      try {
        // Use the RPC from environment
        const rpcUrl = import.meta.env.VITE_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        providerRef.current = provider

        // ProposalManager ABI - just the events we need
        const proposalManagerABI = [
          'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint8 proposalType, string title)',
          'event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 support, uint256 weight)',
          'event ProposalExecuted(uint256 indexed proposalId)',
        ]

        const contract = new ethers.Contract(
          proposalManagerAddress,
          proposalManagerABI,
          provider
        )

        // Get current block
        const currentBlock = await provider.getBlockNumber()
        lastBlockRef.current = currentBlock

        // Listen for new proposals
        contract.on('ProposalCreated', (proposalId, proposer, proposalType, title, event) => {
          const notification = {
            id: `proposal_${proposalId}_${Date.now()}`,
            type: NOTIFICATION_TYPES.PROPOSAL_CREATED,
            severity: 'info',
            title: 'New DAO Proposal',
            message: `"${title}" has been submitted`,
            proposalId: proposalId.toString(),
            proposer: proposer,
            timestamp: Date.now(),
            read: false,
          }
          
          addNotification(notification)
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification('New DAO Proposal', {
              body: notification.message,
              icon: '/logo.png',
              tag: notification.id,
            })
          }
        })

        // Listen for votes
        contract.on('VoteCast', (proposalId, voter, support, weight, event) => {
          const supportText = support === 1 ? 'for' : support === 0 ? 'against' : 'abstain'
          const notification = {
            id: `vote_${proposalId}_${voter}_${Date.now()}`,
            type: NOTIFICATION_TYPES.PROPOSAL_VOTED,
            severity: 'info',
            title: 'Vote Cast',
            message: `Vote cast ${supportText} Proposal #${proposalId}`,
            proposalId: proposalId.toString(),
            voter: voter,
            timestamp: Date.now(),
            read: false,
          }
          
          addNotification(notification)
        })

        // Listen for executions
        contract.on('ProposalExecuted', (proposalId, event) => {
          const notification = {
            id: `executed_${proposalId}_${Date.now()}`,
            type: NOTIFICATION_TYPES.PROPOSAL_EXECUTED,
            severity: 'success',
            title: 'Proposal Executed',
            message: `Proposal #${proposalId} has been executed`,
            proposalId: proposalId.toString(),
            timestamp: Date.now(),
            read: false,
          }
          
          addNotification(notification)
        })

        console.log('✅ Real-time notifications enabled')
      } catch (error) {
        console.error('Failed to setup event listeners:', error)
      }
    }

    setupListener()

    // Cleanup
    return () => {
      if (providerRef.current) {
        providerRef.current.removeAllListeners()
      }
    }
  }, [proposalManagerAddress])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)) // Keep last 50
  }

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Manually add notification (for risk alerts from AI)
  const addRiskAlert = (proposalId, riskScore, message) => {
    const severity = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'warning' : 'info'
    const notification = {
      id: `risk_${proposalId}_${Date.now()}`,
      type: NOTIFICATION_TYPES.RISK_ALERT,
      severity,
      title: severity === 'critical' ? 'Critical Risk Alert' : 'Risk Assessment',
      message: message || `Proposal #${proposalId} has risk score: ${riskScore}`,
      proposalId: proposalId.toString(),
      riskScore,
      timestamp: Date.now(),
      read: false,
    }
    
    addNotification(notification)

    if (severity === 'critical' && Notification.permission === 'granted') {
      new Notification('⚠️ Critical Risk Alert', {
        body: notification.message,
        icon: '/logo.png',
        tag: notification.id,
      })
    }
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addRiskAlert,
  }
}
