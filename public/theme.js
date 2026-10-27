// Runs before first paint: applies a saved theme choice (without one, CSS follows
// the system) and marks that scripts run, so scroll reveals don't hide content otherwise.
document.documentElement.classList.add("js");
try {
  const t = localStorage.getItem("theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch {}
