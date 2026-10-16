const ACTION_START_EVENT = "fishonitory:action-request-start";
const ACTION_END_EVENT = "fishonitory:action-request-end";
const INSTALL_KEY = Symbol.for("fishonitory.actionRequestTrackingInstalled");

export function installActionRequestTracking() {
  if (typeof window === "undefined" || window[INSTALL_KEY]) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (...args) => {
    const request = args[0];
    const method = String(args[1]?.method || request?.method || "GET").toUpperCase();
    const isAction = !["GET", "HEAD", "OPTIONS"].includes(method);

    if (isAction) window.dispatchEvent(new Event(ACTION_START_EVENT));

    return nativeFetch(...args).finally(() => {
      if (isAction) window.dispatchEvent(new Event(ACTION_END_EVENT));
    });
  };

  window[INSTALL_KEY] = true;
}

export { ACTION_END_EVENT, ACTION_START_EVENT };
