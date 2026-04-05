// StudyOS — Google Auth Module
// Uses Google Identity Services (GSI) for OAuth 2.0

// Check localStorage first (set via Settings UI), then fall back to hardcoded value
const HARDCODED_CLIENT_ID = '828835228790-ko2jv2f7nb9c23ncumbvp7javh02ot58.apps.googleusercontent.com';
const CLIENT_ID = localStorage.getItem('studyos_google_client_id') || HARDCODED_CLIENT_ID;

const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

class GoogleAuth {
  constructor() {
    this._accessToken = null;
    this._tokenExpiry = null;
    this._userProfile = null;
    this._tokenClient = null;
    this._onAuthChange = new Set();
    this._initialized = false;
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
   * Initialize the Google Identity Services client
   */
  async init() {
    if (!this.isConfigured) {
      console.warn('GoogleAuth: Client ID not configured. Google features disabled.');
      return false;
    }

    return new Promise((resolve) => {
      // Wait for GSI library to load
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
   * Make an authenticated API request
   */
  async fetch(url, options = {}) {
    if (!this.isConnected) {
      throw new Error('Not authenticated');
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
      // Token expired, try to refresh
      this._accessToken = null;
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

    // Fetch user profile
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${this._accessToken}` },
      });
      if (profileRes.ok) {
        this._userProfile = await profileRes.json();
      }
    } catch (e) {
      console.warn('GoogleAuth: Failed to fetch profile.', e);
    }

    this._notifyListeners();
  }

  _notifyListeners() {
    for (const fn of this._onAuthChange) {
      fn(this.isConnected, this._userProfile);
    }
  }
}

export const googleAuth = new GoogleAuth();
export default googleAuth;
