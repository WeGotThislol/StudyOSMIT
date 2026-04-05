// StudyOS — Hash-based SPA Router

class Router {
  constructor() {
    this._routes = new Map();
    this._currentRoute = null;
    this._beforeHooks = [];
    this._afterHooks = [];
    this._container = null;
  }

  init(containerId = 'app-content') {
    this._container = document.getElementById(containerId);
    window.addEventListener('hashchange', () => this._handleRoute());
    // Handle initial route
    if (!window.location.hash) {
      window.location.hash = '#dashboard';
    } else {
      this._handleRoute();
    }
  }

  register(path, handler) {
    this._routes.set(path, handler);
  }

  navigate(path) {
    window.location.hash = `#${path}`;
  }

  beforeEach(hook) {
    this._beforeHooks.push(hook);
  }

  afterEach(hook) {
    this._afterHooks.push(hook);
  }

  get currentRoute() {
    return this._currentRoute;
  }

  _parseHash() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const parts = hash.split('/');
    return {
      path: parts[0],
      params: parts.slice(1),
      full: hash,
    };
  }

  async _handleRoute() {
    const route = this._parseHash();
    const prevRoute = this._currentRoute;

    // Run before hooks
    for (const hook of this._beforeHooks) {
      const result = await hook(route, prevRoute);
      if (result === false) return; // Navigation cancelled
    }

    this._currentRoute = route;

    // Find handler
    const handler = this._routes.get(route.path);
    if (handler) {
      // Hide all page views
      const pages = this._container?.querySelectorAll('.page-view');
      pages?.forEach(p => {
        p.classList.remove('page-active');
        p.style.display = 'none';
      });

      // Show target page
      const pageEl = document.getElementById(`page-${route.path}`);
      if (pageEl) {
        pageEl.style.display = 'block';
        requestAnimationFrame(() => {
          pageEl.classList.add('page-active');
        });
      }

      // Run handler
      try {
        await handler(route);
      } catch (e) {
        console.error(`Router: Error in handler for "${route.path}"`, e);
      }
    } else {
      console.warn(`Router: No handler for "${route.path}", redirecting to dashboard.`);
      this.navigate('dashboard');
      return;
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === route.path);
    });

    // Run after hooks
    for (const hook of this._afterHooks) {
      await hook(route, prevRoute);
    }
  }
}

export const router = new Router();
export default router;
