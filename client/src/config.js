const apiHost =
  typeof window !== "undefined" ? window.location.hostname : "localhost";

export const API_URL =
  import.meta.env.VITE_API_URL || `http://${apiHost}:3000/api`;
