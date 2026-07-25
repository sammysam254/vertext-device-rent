/**
 * Simple hash-based SPA router with safe regex matching & auth token hash parser
 */

const routes = {};
let currentRoute = null;
let beforeEachHook = null;

export function addRoute(path, handler) {
  routes[path] = handler;
}

export function beforeEach(fn) {
  beforeEachHook = fn;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getHash() {
  let hash = window.location.hash.slice(1) || '/';

  // Check if hash contains Supabase auth tokens (e.g. #access_token=...&type=recovery)
  if (hash.includes('type=recovery')) {
    return '/reset-password';
  }

  // Handle double hash or appended tokens (e.g. /login#access_token=...)
  if (hash.includes('#')) {
    hash = hash.split('#')[0];
  }

  // Handle query parameters (e.g. /login?code=...)
  if (hash.includes('?')) {
    hash = hash.split('?')[0];
  }

  return hash || '/';
}

async function dispatch() {
  const raw = getHash();
  let matched = null;
  let params = {};

  for (const pattern of Object.keys(routes)) {
    // Skip wildcard fallback pattern in loop to prevent /^^*$/ invalid regex syntax error
    if (pattern === '*') continue;

    const paramNames = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    try {
      const regex = new RegExp(`^${regexStr}$`);
      const match = raw.match(regex);
      if (match) {
        matched = pattern;
        paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        break;
      }
    } catch (_) {
      // Ignore invalid regex
    }
  }

  const handler = matched ? routes[matched] : routes['*'];
  if (!handler) return;

  if (beforeEachHook) {
    const proceed = await beforeEachHook(raw, params);
    if (proceed === false) return;
  }

  currentRoute = raw;
  handler(params);
}

export function initRouter() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}

export function getCurrentRoute() {
  return currentRoute;
}
