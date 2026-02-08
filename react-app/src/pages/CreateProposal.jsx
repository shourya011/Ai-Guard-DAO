import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Trash2, DollarSign, Code, Users, Settings as SettingsIcon, AlertCircle, CheckCircle, Upload, ArrowLeft } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { ethers } from 'ethers'
import '../styles/CreateProposal.css'

export default function CreateProposal() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    type: 0, // 0=Treasury, 1=Contract, 2=Membership, 3=Parameter
    title: '',
    description: '',
    category: '',
    discussionURL: '',
    proposalIPFS: '',
    actions: [
      {
        target: '',
        value: '0',
        data: '0x',
        description: ''
      }
    ]
  })

  const proposalTypes = [
    { value: 0, label: 'Treasury', icon: <DollarSign size={18} />, description: 'Transfer funds from DAO treasury' },
    { value: 1, label: 'Contract', icon: <Code size={18} />, description: 'Execute smart contract functions' },
    { value: 2, label: 'Membership', icon: <Users size={18} />, description: 'Add/remove DAO members' },
    { value: 3, label: 'Parameter', icon: <SettingsIcon size={18} />, description: 'Update DAO parameters' },
  ]

  const categories = ['Treasury', 'Development', 'Marketing', 'Community', 'Governance', 'Emergency', 'Other']

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleActionChange = (index, field, value) => {
    const newActions = [...formData.actions]
    newActions[index][field] = value
    setFormData(prev => ({ ...prev, actions: newActions }))
  }

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { target: '', value: '0', data: '0x', description: '' }]
    }))
  }

  const removeAction = (index) => {
    if (formData.actions.length > 1) {
      setFormData(prev => ({
        ...prev,
        actions: prev.actions.filter((_, i) => i !== index)
      }))
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required'
    if (!formData.description.trim()) return 'Description is required'
    if (!formData.category) return 'Category is required'
    
    for (let i = 0; i < formData.actions.length; i++) {
      const action = formData.actions[i]
      if (!action.target || !ethers.isAddress(action.target)) {
        return `Action ${i + 1}: Invalid target address`
      }
      if (!action.description.trim()) {
        return `Action ${i + 1}: Description is required`
      }
    }
    
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Check if wallet is connected
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      // Get ProposalManager contract
      const proposalManagerAddress = import.meta.env.VITE_PROPOSAL_MANAGER_ADDRESS
      if (!proposalManagerAddress) {
        throw new Error('ProposalManager address not configured')
      }

      const proposalManagerABI = [
        'function createProposal(uint8 proposalType, tuple(string title, string description, string category, string discussionURL, string proposalIPFS) metadata, tuple(address target, uint256 value, bytes data, string description)[] actions) external returns (uint256)'
      ]

      const contract = new ethers.Contract(proposalManagerAddress, proposalManagerABI, signer)

      // Prepare metadata
      const metadata = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        discussionURL: formData.discussionURL || '',
        proposalIPFS: formData.proposalIPFS || ''
      }

      // Prepare actions
      const actions = formData.actions.map(action => ({
        target: action.target,
        value: ethers.parseEther(action.value || '0'),
        data: action.data || '0x',
        description: action.description
      }))

      // Create proposal
      console.log('Creating proposal...', { type: formData.type, metadata, actions })
      const tx = await contract.createProposal(formData.type, metadata, actions)
      
      console.log('Transaction sent:', tx.hash)
      const receipt = await tx.wait()
      console.log('Proposal created!', receipt)

      setSuccess(true)
      setTimeout(() => {
        navigate('/proposals')
      }, 2000)

    } catch (err) {
      console.error('Failed to create proposal:', err)
      setError(err.message || 'Failed to create proposal')
    } finally {
      setLoading(false)
    }
  }

  // Import from JSON
  const handleImportJSON = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        setFormData(prev => ({
          ...prev,
          ...imported,
          actions: imported.actions || prev.actions
        }))
        setError('')
      } catch (err) {
        setError('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(formData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proposal-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="create-proposal-page">
        <div className="page-header">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate('/proposals')}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1>Create New DAO Proposal</h1>
              <p>Submit a proposal for DAO members to vote on</p>
            </div>
          </div>
          <div className="header-actions">
            <label className="import-button">
              <Upload size={18} />
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                style={{ display: 'none' }}
              />
            </label>
            <button onClick={handleExportJSON} className="export-button">
              Export JSON
            </button>
          </div>
        </div>

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={20} />
            <div>
              <strong>Success!</strong> Your proposal has been created. Redirecting to proposals page...
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="proposal-form">
          {/* Proposal Type */}
          <div className="form-section">
            <h3>Proposal Type</h3>
            <div className="proposal-type-grid">
              {proposalTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`type-card ${formData.type === type.value ? 'active' : ''}`}
                  onClick={() => handleInputChange('type', type.value)}
                >
                  <div className="type-icon">{type.icon}</div>
                  <div className="type-label">{type.label}</div>
                  <div className="type-description">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group full-width">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter proposal title"
                  maxLength={200}
                  required
                />
                <span className="char-count">{formData.title.length}/200</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Provide a detailed description of the proposal. You can use Markdown formatting."
                  rows={8}
                  required
                />
                <span className="helper-text">Markdown supported</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Discussion URL</label>
                <input
                  type="url"
                  value={formData.discussionURL}
                  onChange={(e) => handleInputChange('discussionURL', e.target.value)}
                  placeholder="https://forum.dao.xyz/proposal-123"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label>IPFS Hash (optional)</label>
                <input
                  type="text"
                  value={formData.proposalIPFS}
                  onChange={(e) => handleInputChange('proposalIPFS', e.target.value)}
                  placeholder="ipfs://QmHash..."
                />
                <span className="helper-text">Store proposal details on IPFS for immutability</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-section">
            <div className="section-header">
              <h3>Actions</h3>
              <button type="button" onClick={addAction} className="add-action-button">
                <Plus size={18} />
                Add Action
              </button>
            </div>

            {formData.actions.map((action, index) => (
              <div key={index} className="action-card">
                <div className="action-header">
                  <span className="action-number">Action {index + 1}</span>
                  {formData.actions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAction(index)}
                      className="remove-action-button"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Target Address *</label>
                    <input
                      type="text"
                      value={action.target}
                      onChange={(e) => handleActionChange(index, 'target', e.target.value)}
                      placeholder="0x..."
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Value (MON)</label>
                    <input
                      type="text"
                      value={action.value}
                      onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                      placeholder="0.0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Call Data</label>
                    <input
                      type="text"
                      value={action.data}
                      onChange={(e) => handleActionChange(index, 'data', e.target.value)}
                      placeholder="0x"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Action Description *</label>
                    <textarea
                      value={action.description}
                      onChange={(e) => handleActionChange(index, 'description', e.target.value)}
                      placeholder="Describe what this action does"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/proposals')}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating DAO Proposal...
                </>
              ) : success ? (
                <>
                  <CheckCircle size={18} />
                  Created!
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Create DAO Proposal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
