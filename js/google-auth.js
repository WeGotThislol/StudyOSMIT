// StudyOS — Google Auth Module
// Uses Google Identity Services (GSI) for OAuth 2.0
// Auth state is persisted to sessionStorage so it survives page refreshes.

// Check localStorage first (set via Settings UI), then fall back to hardcoded value
const HARDCODED_CLIENT_ID = '828835228790-ko2jv2f7nb9c23ncumbvp7javh02ot58.apps.googleusercontent.com';
const CLIENT_ID = localStorage.getItem('studyos_google_client_id') || HARDCODED_CLIENT_ID;

const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// Session storage keys for auth persistence
const SESSION_KEYS = {
  ACCESS_TOKEN: 'studyos_gauth_token',
  TOKEN_EXPIRY: 'studyos_gauth_expiry',
  USER_PROFILE: 'studyos_gauth_profile',
};

class GoogleAuth {
  constructor() {
    this._accessToken = null;
    this._tokenExpiry = null;
    this._userProfile = null;
    this._tokenClient = null;
    this._onAuthChange = new Set();
    this._initialized = false;
    this._refreshPromise = null; // guards concurrent silent refresh attempts

    // Restore persisted session immediately on construction
    this._restoreSession();
  }

  get isConnected() {
    return !!this._accessToken && Date.now() < (this._tokenExpiry || 0);
  }

  get accessToken() {
    return this._accessToken;
  }

  get userProfile() {
    return this._userProfile;
  }

  get clientId() {
    return CLIENT_ID;
  }

  get isConfigured() {
    return CLIENT_ID && CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && CLIENT_ID.length > 10;
  }

  /**
   * Initialize the Google Identity Services client.
   * If a valid session exists from sessionStorage, notifies listeners immediately.
   * If the stored token is expired, attempts a silent refresh.
   */
  async init() {
    if (!this.isConfigured) {
      console.warn('GoogleAuth: Client ID not configured. Google features disabled.');
      return false;
    }

    const gsiReady = await new Promise((resolve) => {
      const checkGSI = () => {
        if (window.google?.accounts?.oauth2) {
          this._tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => this._handleTokenResponse(response),
          });
          this._initialized = true;
          resolve(true);
        } else {
          setTimeout(checkGSI, 100);
        }
      };
      checkGSI();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this._initialized) {
          console.warn('GoogleAuth: GSI library failed to load.');
          resolve(false);
        }
      }, 5000);
    });

    if (!gsiReady) return false;

    // If we restored a valid token from session, notify listeners right away
    if (this.isConnected) {
      console.info('GoogleAuth: Restored session from sessionStorage.');
      this._notifyListeners();
      return true;
    }

    // If we had a stored token but it expired, try a silent refresh
    const storedToken = sessionStorage.getItem(SESSION_KEYS.ACCESS_TOKEN);
    if (storedToken && !this.isConnected) {
      console.info('GoogleAuth: Stored token expired, attempting silent refresh...');
      const refreshed = await this._silentRefresh();
      if (refreshed) {
        console.info('GoogleAuth: Silent refresh succeeded.');
      } else {
        console.info('GoogleAuth: Silent refresh failed — user must re-connect.');
        this._clearSession();
      }
    }

    return true;
  }

  /**
   * Trigger the OAuth consent flow
   */
  connect() {
    if (!this._tokenClient) {
      console.error('GoogleAuth: Not initialized.');
      return;
    }
    this._tokenClient.requestAccessToken();
  }

  /**
   * Disconnect / revoke access
   */
  disconnect() {
    if (this._accessToken) {
      window.google?.accounts?.oauth2?.revoke(this._accessToken);
    }
    this._accessToken = null;
    this._tokenExpiry = null;
    this._userProfile = null;
    this._clearSession();
    this._notifyListeners();
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthChange(callback) {
    this._onAuthChange.add(callback);
    return () => this._onAuthChange.delete(callback);
  }

  /**
   * Make an authenticated API request.
   * On 401, attempts a silent token refresh once before giving up.
   */
  async fetch(url, options = {}) {
    if (!this.isConnected) {
      // Attempt a quick silent refresh before failing
      const refreshed = await this._silentRefresh();
      if (!refreshed) {
        throw new Error('Not authenticated');
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this._accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired server-side, try silent refresh
      const refreshed = await this._silentRefresh();
      if (refreshed) {
        // Retry the request with the new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this._accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
      // Refresh failed — clear auth state
      this._accessToken = null;
      this._tokenExpiry = null;
      this._clearSession();
      this._notifyListeners();
      throw new Error('Token expired. Please reconnect.');
    }

    return response;
  }

  // ========== Private Methods ==========

  async _handleTokenResponse(response) {
    if (response.error) {
      console.error('GoogleAuth: Token error:', response.error);
      return;
    }

    this._accessToken = response.access_token;
    this._tokenExpiry = Date.now() + (response.expires_in * 1000);

    // Persist to sessionStorage
    this._persistSession();

    // Fetch user profile
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${this._accessToken}` },
      });
      if (profileRes.ok) {
        this._userProfile = await profileRes.json();
        // Persist updated profile
        sessionStorage.setItem(SESSION_KEYS.USER_PROFILE, JSON.stringify(this._userProfile));
      }
    } catch (e) {
      console.warn('GoogleAuth: Failed to fetch profile.', e);
    }

    this._notifyListeners();
  }

  /**
   * Attempt a silent token refresh using GSI's prompt: ''
   * This avoids showing any popup/consent screen.
   * Returns true if refresh succeeded, false otherwise.
   */
  _silentRefresh() {
    if (!this._tokenClient || !this._initialized) return Promise.resolve(false);

    // Prevent concurrent refresh attempts
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
        this._refreshPromise = null;
      }, 5000);

      // Temporarily override the callback for this refresh attempt
      const originalCallback = this._tokenClient.callback;

      this._tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          clearTimeout(timeout);
          this._refreshPromise = null;

          if (response.error) {
            console.warn('GoogleAuth: Silent refresh failed:', response.error);
            resolve(false);
            return;
          }

          this._accessToken = response.access_token;
          this._tokenExpiry = Date.now() + (response.expires_in * 1000);
          this._persistSession();

          // Re-fetch profile if we don't have one
          if (!this._userProfile) {
            fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { 'Authorization': `Bearer ${this._accessToken}` },
            })
              .then(r => r.ok ? r.json() : null)
              .then(profile => {
                if (profile) {
                  this._userProfile = profile;
                  sessionStorage.setItem(SESSION_KEYS.USER_PROFILE, JSON.stringify(profile));
                  this._notifyListeners();
                }
              })
              .catch(() => {});
          }

          this._notifyListeners();
          resolve(true);
        },
        prompt: '', // silent — no popup
      });

      try {
        this._tokenClient.requestAccessToken({ prompt: '' });
      } catch (e) {
        clearTimeout(timeout);
        this._refreshPromise = null;
        console.warn('GoogleAuth: Silent refresh threw:', e);
        // Re-initialize the normal token client
        this._tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response) => this._handleTokenResponse(response),
        });
        resolve(false);
      }
    });

    return this._refreshPromise;
  }

  /**
   * Persist auth state to sessionStorage
   */
  _persistSession() {
    try {
      sessionStorage.setItem(SESSION_KEYS.ACCESS_TOKEN, this._accessToken);
      sessionStorage.setItem(SESSION_KEYS.TOKEN_EXPIRY, String(this._tokenExpiry));
      if (this._userProfile) {
        sessionStorage.setItem(SESSION_KEYS.USER_PROFILE, JSON.stringify(this._userProfile));
      }
    } catch (e) {
      console.warn('GoogleAuth: Failed to persist session.', e);
    }
  }

  /**
   * Restore auth state from sessionStorage
   */
  _restoreSession() {
    try {
      const token = sessionStorage.getItem(SESSION_KEYS.ACCESS_TOKEN);
      const expiry = sessionStorage.getItem(SESSION_KEYS.TOKEN_EXPIRY);
      const profileStr = sessionStorage.getItem(SESSION_KEYS.USER_PROFILE);

      if (token && expiry) {
        const expiryNum = Number(expiry);
        if (Date.now() < expiryNum) {
          // Token is still valid
          this._accessToken = token;
          this._tokenExpiry = expiryNum;
        }
        // else: token expired — will attempt silent refresh in init()
      }

      if (profileStr) {
        try {
          this._userProfile = JSON.parse(profileStr);
        } catch (e) { /* ignore parse errors */ }
      }
    } catch (e) {
      console.warn('GoogleAuth: Failed to restore session.', e);
    }
  }

  /**
   * Clear persisted auth state from sessionStorage
   */
  _clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(SESSION_KEYS.TOKEN_EXPIRY);
      sessionStorage.removeItem(SESSION_KEYS.USER_PROFILE);
    } catch (e) { /* ignore */ }
  }

  _notifyListeners() {
    for (const fn of this._onAuthChange) {
      fn(this.isConnected, this._userProfile);
    }
  }
}

export const googleAuth = new GoogleAuth();
export default googleAuth;
