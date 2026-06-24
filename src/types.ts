/**
 * Represents the structure of an Event Document in the activity ledger.
 */
export interface ActivityEvent {
  id?: string;
  userId: string;
  eventType: string;
  timestamp: any; // Can be Firebase Timestamp on client-read, or ISO string from API, or Date
  metadata?: Record<string, any>;
}

/**
 * Standard list of tracked events supported by the application.
 */
export type EventType = 
  | 'USER_SIGN_UP'
  | 'USER_SIGN_IN'
  | 'USER_SIGN_OUT'
  | 'PROFILE_UPDATE'
  | 'TRACKED_BUTTON_CLICK'
  | 'CUSTOM_ACTION';

/**
 * API response structure when logging an event via the server endpoint.
 */
export interface LogEventResponse {
  success: boolean;
  id: string;
  userId: string;
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
