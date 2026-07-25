/**
 * Simple hash-based SPA router
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
  return window.location.hash.slice(1) || '/';
}

async function dispatch() {
  const raw = getHash();
  // Match with params: e.g. /stream/ABC123
  let matched = null;
  let params = {};

  for (const pattern of Object.keys(routes)) {
    const paramNames = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}$`);
    const match = raw.match(regex);
    if (match) {
      matched = pattern;
      paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      break;
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
