export function passwordResetRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function urlHasPasswordRecoveryToken() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
}

export function cleanAuthUrl() {
  window.history.replaceState(null, "", passwordResetRedirectUrl());
}
