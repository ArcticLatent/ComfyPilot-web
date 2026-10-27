const REPO = "ArcticLatent/ComfyPilot";
const root = document.documentElement;

function isLight() {
  if (root.dataset.theme) return root.dataset.theme === "light";
  return matchMedia("(prefers-color-scheme: light)").matches;
}

// ---------- Theme toggle ----------
document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
  const next = isLight() ? "dark" : "light";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
});

// ---------- Nav border once scrolled ----------
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- Reveal on scroll ----------
const revealTargets = document.querySelectorAll(".section-head, .card, .tour-row, .dl, .callout, .faq details, .closing h2");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  revealTargets.forEach((el) => { el.classList.add("reveal"); io.observe(el); });
}

// ---------- Screenshot lightbox ----------
const lightbox = document.querySelector(".lightbox");
const lightboxImg = lightbox.querySelector("img");
document.querySelectorAll("[data-zoom]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const src = (isLight() && btn.dataset.zoomLight) || btn.dataset.zoom;
    const shown = [...btn.querySelectorAll("img")].find((img) => img.offsetParent !== null);
    lightboxImg.src = src;
    lightboxImg.alt = shown?.alt ?? "";
    lightbox.showModal();
  });
});
// Close when clicking the backdrop or the image.
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target === lightboxImg) lightbox.close();
});

// ---------- Copy buttons ----------
document.querySelectorAll(".copy").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.previousElementSibling.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
      btn.classList.add("done");
    } catch {
      btn.textContent = "Select it";
    }
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1800);
  });
});

// ---------- Download: suggest the file for this system ----------
function detectSystem() {
  const ua = navigator.userAgent;
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/android|iphone|ipad|ipod/i.test(ua)) return { os: "mobile" };
  if (/win/i.test(platform) || /windows/i.test(ua)) return { os: "windows" };
  if (/mac/i.test(platform) || /mac os x/i.test(ua)) return { os: "mac" };
  if (/linux|x11/i.test(platform) || /linux/i.test(ua)) {
    if (/ubuntu|debian/i.test(ua)) return { os: "linux", asset: "deb" };
    if (/fedora/i.test(ua)) return { os: "linux", asset: "rpm" };
    return { os: "linux" };
  }
  return { os: "unknown" };
}

const system = detectSystem();
const primary = document.querySelector("[data-primary-download]");
const primaryLabel = document.querySelector("[data-primary-label]");
const primaryNote = document.querySelector("[data-primary-note]");
const osNote = document.querySelector("[data-os-note]");

function suggest(asset) {
  const link = document.querySelector(`[data-asset="${asset}"]`);
  link?.closest(".dl").classList.add("suggested");
  return link;
}

if (system.os === "windows") {
  const link = suggest("exe");
  primary.href = link.href;
  primaryLabel.textContent = "Download for Windows";
} else if (system.os === "linux") {
  primaryLabel.textContent = "Download for Linux";
  if (system.asset) suggest(system.asset);
  primaryNote.innerHTML = 'Version <span data-version>1.0.0</span> · .deb, .rpm, Arch package or AppImage';
} else if (system.os === "mac") {
  osNote.textContent = "ComfyPilot is for Windows and Linux; there is no macOS version yet.";
  osNote.hidden = false;
}

// ---------- Download: links to the latest release ----------
// The links in the HTML point at a known release; this swaps in the newest one.
const ASSETS = {
  exe: /^ComfyPilot-Setup-.+\.exe$/,
  deb: /_amd64\.deb$/,
  rpm: /\.x86_64\.rpm$/,
  arch: /-x86_64\.pkg\.tar\.zst$/,
  appimage: /\.AppImage$/,
};

function formatSize(bytes) {
  return `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;
}

async function latestRelease() {
  const key = "comfypilot-release";
  try {
    const cached = JSON.parse(sessionStorage.getItem(key));
    if (cached && Date.now() - cached.at < 3600_000) return cached.release;
  } catch {}
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  const release = {
    version: data.tag_name.replace(/^v/, ""),
    assets: data.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })),
  };
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), release })); } catch {}
  return release;
}

latestRelease().then((release) => {
  document.querySelectorAll("[data-version]").forEach((el) => { el.textContent = release.version; });
  for (const [kind, pattern] of Object.entries(ASSETS)) {
    const asset = release.assets.find((a) => pattern.test(a.name));
    const link = document.querySelector(`[data-asset="${kind}"]`);
    if (!asset || !link) continue;
    link.href = asset.url;
    const size = link.querySelector("[data-size]");
    if (size) size.textContent = formatSize(asset.size);
    if (kind === "exe" && system.os === "windows") primary.href = asset.url;
  }
}).catch(() => {
  // Keep the links from the HTML; they still work, and the app updates itself.
});
