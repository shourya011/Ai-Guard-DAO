/**
 * Event Bus
 * 
 * Centralized event emitter for application-wide events.
 * Used for decoupling components and enabling event-driven architecture.
 */

import { EventEmitter } from 'events';

// Create the global event emitter
export const eventBus = new EventEmitter();

// Increase max listeners for production use
eventBus.setMaxListeners(50);

// Event names - centralized for consistency
export const EVENTS = {
  PROPOSAL_CREATED: 'proposal_created',
  NEW_PROPOSAL: 'new_proposal',
  ANALYSIS_COMPLETE: 'analysis_complete',
  VOTE_CAST: 'vote_cast',
  STATUS_UPDATED: 'status_updated',
};
