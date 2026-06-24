import { useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { ActivityEvent } from './types';
import { 
  Activity, 
  LogOut, 
  User, 
  Key, 
  Layers, 
  Send, 
  Plus, 
  Play, 
  Database,
  UserPlus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const signingUpRef = useRef(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // App Features State
  const [displayName, setDisplayName] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  
  const [customText, setCustomText] = useState('');
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [customSuccess, setCustomSuccess] = useState(false);
  
  const [buttonLoading, setButtonLoading] = useState(false);

  // Events Feed State
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');

  // Handle Authentication State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      if (signingUpRef.current) {
        return;
      }
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setDisplayName(currentUser.displayName || '');
      } else {
        setDisplayName('');
        setEvents([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Events Feed in Real-time
  useEffect(() => {
    if (!user) return;

    setFeedLoading(true);
    setFeedError('');

    // Query events for signed-in user, order by timestamp desc, limit to last 10
    const q = query(
      collection(db, 'events'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot: any) => {
        const eventsList: ActivityEvent[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          eventsList.push({
            id: doc.id,
            userId: data.userId,
            eventType: data.eventType,
            timestamp: data.timestamp,
            metadata: data.metadata
          });
        });
        setEvents(eventsList);
        setFeedLoading(false);
      },
      (error: any) => {
        console.error('Error fetching Firestore events:', error);
        setFeedError('Failed to fetch activities feed due to security rules or network.');
        setFeedLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Helper: Log event via Express API Server
  const logEventToServer = async (currentUser: any, eventType: string, metadata?: Record<string, any>) => {
    try {
      const idToken = await currentUser.getIdToken(true);
      const response = await fetch(`${BACKEND_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ eventType, metadata })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Server error logging event');
      }

      console.log(`Successfully logged event: ${eventType}`);
    } catch (err) {
      console.error('Event logging error:', err);
    }
  };

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Please fill in all credentials.');
      return;
    }
    setAuthSubmitting(true);
    setAuthError('');

    try {
      if (isSignUp) {
        // Sign Up
        signingUpRef.current = true;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Log sign-up event to server
        await logEventToServer(userCredential.user, 'USER_SIGN_UP', { email });
        
        // Immediately sign out to prevent auto-login
        await signOut(auth);
        
        signingUpRef.current = false;
        setUser(null);
        setIsSignUp(false);
        setSuccessMessage('Account created successfully! Please sign in with your credentials.');
        setPassword('');
      } else {
        // Sign In
        setSuccessMessage('');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Log sign-in event to server
        await logEventToServer(userCredential.user, 'USER_SIGN_IN', { email });
      }
    } catch (err: any) {
      signingUpRef.current = false;
      console.error(err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'Email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password should be at least 6 characters.';
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (!user) return;
    try {
      // Log sign-out event to server before signing out client
      await logEventToServer(user, 'USER_SIGN_OUT', { email: user.email });
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // User Actions
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setProfileSubmitting(true);
    setProfileSuccess(false);

    try {
      // Send audit event to server
      await logEventToServer(user, 'PROFILE_UPDATE', { 
        oldName: user.displayName || 'None', 
        newName: displayName.trim() 
      });
      
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleLogCustomAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customText.trim()) return;

    setCustomSubmitting(true);
    setCustomSuccess(false);

    try {
      await logEventToServer(user, 'CUSTOM_ACTION', { 
        inputDetails: customText.trim() 
      });
      setCustomText('');
      setCustomSuccess(true);
      setTimeout(() => setCustomSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setCustomSubmitting(false);
    }
  };

  const handleTrackedButtonClick = async (buttonId: string) => {
    if (!user) return;
    setButtonLoading(true);

    try {
      await logEventToServer(user, 'TRACKED_BUTTON_CLICK', { 
        buttonId,
        clientX: window.innerWidth,
        clientY: window.innerHeight
      });
    } catch (err) {
      console.error(err);
    } finally {
      setButtonLoading(false);
    }
  };

  // Format Firestore Timestamp safely
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Logging...';
    // If it's a Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    // If it's standard ISO/string date
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (authLoading) {
    return (
      <div className="fullscreen-loader">
        <Loader2 className="spinner" />
        <p>Loading User Ledger System...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Background decor */}
      <div className="glow-orb top-left"></div>
      <div className="glow-orb bottom-right"></div>

      <header className="app-header">
        <div className="header-logo">
          <Activity className="header-icon pulse" />
          <h1>Activity<span>Ledger</span></h1>
        </div>
        {user && (
          <div className="user-profile-badge">
            <span className="user-email">{user.email}</span>
            <button className="btn btn-secondary sign-out-btn" onClick={handleSignOut}>
              <LogOut className="btn-icon" /> Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="app-content">
        {!user ? (
          /* Auth Card View */
          <div className="auth-card-container">
            <div className="auth-card">
              <div className="auth-header-sec">
                <Layers className="auth-decor-icon" />
                <h2>{isSignUp ? 'Create Platform Account' : 'Security Sign In'}</h2>
                <p>{isSignUp ? 'Register to begin tracking events in Firestore' : 'Access your activities ledger dashboard'}</p>
              </div>

              {authError && (
                <div className="alert alert-danger">
                  <AlertCircle className="alert-icon" />
                  <span>{authError}</span>
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success">
                  <AlertCircle className="alert-icon" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-with-icon">
                    <User className="input-icon" />
                    <input 
                      type="email" 
                      id="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-with-icon">
                    <Key className="input-icon" />
                    <input 
                      type="password" 
                      id="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={authSubmitting}>
                  {authSubmitting ? (
                    <>
                      <Loader2 className="spinner btn-spinner" /> 
                      {isSignUp ? 'Signing Up...' : 'Signing In...'}
                    </>
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="btn-icon" /> : <Play className="btn-icon" />}
                      {isSignUp ? 'Sign Up' : 'Sign In'}
                    </>
                  )}
                </button>
              </form>

              <div className="auth-toggle">
                <button type="button" className="btn-link" onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); setSuccessMessage(''); }}>
                  {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Dashboard View */
          <div className="dashboard-grid">
            
            {/* Interactive Panel */}
            <section className="dashboard-panel panel-actions">
              <div className="panel-header">
                <h2>Trackable Actions</h2>
                <p>Trigger actions below to dispatch events through the server logic layer.</p>
              </div>

              <div className="actions-stack">
                {/* Action 1: Update Profile Name */}
                <div className="action-card">
                  <div className="action-desc">
                    <h3>Update Profile Attribute</h3>
                    <p>Fires a <code>PROFILE_UPDATE</code> audit log including the payload diff.</p>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="inline-action-form">
                    <input 
                      type="text" 
                      placeholder="Enter new attribute value" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={profileSubmitting}>
                      {profileSubmitting ? <Loader2 className="spinner btn-spinner" /> : <Plus className="btn-icon" />}
                      Save
                    </button>
                  </form>
                  {profileSuccess && <p className="action-success-text">Profile updated & event logged!</p>}
                </div>

                {/* Action 2: Trigger Custom Activity */}
                <div className="action-card">
                  <div className="action-desc">
                    <h3>Log Custom Ledger Entry</h3>
                    <p>Fires a <code>CUSTOM_ACTION</code> containing your custom input details.</p>
                  </div>
                  <form onSubmit={handleLogCustomAction} className="inline-action-form">
                    <input 
                      type="text" 
                      placeholder="What are you working on?" 
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={customSubmitting}>
                      {customSubmitting ? <Loader2 className="spinner btn-spinner" /> : <Send className="btn-icon" />}
                      Send
                    </button>
                  </form>
                  {customSuccess && <p className="action-success-text">Custom entry logged!</p>}
                </div>

                {/* Action 3: Tracked Button Click */}
                <div className="action-card">
                  <div className="action-desc">
                    <h3>Tracked UI Action</h3>
                    <p>Fires a <code>TRACKED_BUTTON_CLICK</code> capturing window coordinates.</p>
                  </div>
                  <div className="button-actions-row">
                    <button 
                      className="btn btn-indigo" 
                      onClick={() => handleTrackedButtonClick('btn-indigo-omega')}
                      disabled={buttonLoading}
                    >
                      Trigger Omega Click
                    </button>
                    <button 
                      className="btn btn-purple" 
                      onClick={() => handleTrackedButtonClick('btn-purple-sigma')}
                      disabled={buttonLoading}
                    >
                      Trigger Sigma Click
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Audit Feed Ledger Panel */}
            <section className="dashboard-panel panel-feed">
              <div className="panel-header feed-header-row">
                <div>
                  <h2>Live Activity Feed</h2>
                  <p>Displaying your last 10 activities synced in real-time from Firestore.</p>
                </div>
                <div className="db-badge">
                  <Database className="db-badge-icon" />
                  <span>Secure Rules (Read-Only)</span>
                </div>
              </div>

              {feedError && (
                <div className="alert alert-danger">
                  <AlertCircle className="alert-icon" />
                  <span>{feedError}</span>
                </div>
              )}

              {feedLoading ? (
                <div className="feed-loader">
                  <Loader2 className="spinner" />
                  <p>Listening to Firestore events feed...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="feed-empty">
                  <Activity className="empty-icon" />
                  <h3>No activities recorded yet</h3>
                  <p>Use the actions panel on the left to dispatch your first database audit logs!</p>
                </div>
              ) : (
                <div className="timeline-container">
                  <div className="timeline-line"></div>
                  <div className="timeline-events-list">
                    {events.map((event) => (
                      <div key={event.id} className="timeline-item">
                        <div className="timeline-node"></div>
                        <div className="timeline-card">
                          <div className="timeline-card-header">
                            <span className="event-badge" data-type={event.eventType}>
                              {event.eventType}
                            </span>
                            <span className="event-time">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                          
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="timeline-metadata">
                              <h4>Audit Data:</h4>
                              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with TypeScript, React, and Firebase Security Rules. Writes restricted via server-side gateway.</p>
      </footer>
    </div>
  );
}

export default App;
