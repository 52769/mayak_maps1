const API = "https://web-production-ca948.up.railway.app/api";

let TEAM_NUMBER = null;
let ROLE = null;
let pointsData = [];
let completedPoints = [];
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", initApp);

/* ========================= */

async function initApp() {
  await waitForTelegram();
  await loadUser();
  await loadPoints();
  initFilters();
  initMapControls();
  initZoom();
}

/* ========================= */

function waitForTelegram() {
  return new Promise(resolve => {
    if (window.Telegram && window.Telegram.WebApp) {
      resolve();
    } else {
      resolve();
    }
  });
}

/* ========================= */

async function loadUser() {

  const tg = window.Telegram?.WebApp;
  if (!tg?.initDataUnsafe?.user) return;

  const telegram_id = tg.initDataUnsafe.user.id;

  try {
    const response = await fetch(API + "/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id })
    });

    if (!response.ok) return;

    const data = await response.json();
    TEAM_NUMBER = data.team_number;
    ROLE = data.role;

    updateTeamInfo();

  } catch {}
}

/* ========================= */

async function loadPoints() {

  if (!TEAM_NUMBER) return;

  try {
    const response = await fetch(
      API + "/points?team_number=" + encodeURIComponent(TEAM_NUMBER)
    );

    if (!response.ok) return;

    const data = await response.json();

    pointsData = data.points || [];
    completedPoints = data.completed || [];

    renderPoints();

  } catch {}
}

/* ========================= */

function renderPoints() {

  const layer = document.getElementById("points-layer");
  layer.innerHTML = "";

  pointsData.forEach(point => {

    if (currentFilter !== "all" && point.type !== currentFilter)
      return;

    if (
      point.visible_for &&
      point.visible_for.length > 0 &&
      !point.visible_for.includes(String(TEAM_NUMBER))
    ) return;

    const img = document.createElement("img");
    img.src = "assets/icons/" + point.type + ".png?v=1";
    img.className = "point";
    img.style.left = point.x + "%";
    img.style.top = point.y + "%";

    if (completedPoints.includes(point.id))
      img.classList.add("completed");

    if (point.locked)
      img.classList.add("locked");

    img.addEventListener("click", () => openModal(point));

    layer.appendChild(img);
  });
}

/* ========================= */

function initMapControls() {

  const container = document.getElementById("map-container");
  const wrapper = document.getElementById("map-wrapper");

  let posX = 0;
  let posY = 0;
  let scale = 1;

  let isDragging = false;

  let lastX = 0;
  let lastY = 0;

  let startDistance = null;
  let startScale = 1;

  let pinchCenter = null;
  let pinchMapX = 0;
  let pinchMapY = 0;

  function update() {
    container.style.transform =
      `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  function clamp() {
    const rect = wrapper.getBoundingClientRect();
    const mapWidth = container.offsetWidth * scale;
    const mapHeight = container.offsetHeight * scale;

    const minX = Math.min(0, rect.width - mapWidth);
    const minY = Math.min(0, rect.height - mapHeight);

    posX = Math.max(minX, Math.min(0, posX));
    posY = Math.max(minY, Math.min(0, posY));
  }

  function distance(t1, t2) {
    return Math.hypot(
      t2.clientX - t1.clientX,
      t2.clientY - t1.clientY
    );
  }

  function center(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }

  /* =========================
     TOUCH START
  ========================= */

  wrapper.addEventListener("touchstart", (e) => {

    if (e.touches.length === 1) {

      isDragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;

    }

    if (e.touches.length === 2) {

      isDragging = false;

      startDistance = distance(e.touches[0], e.touches[1]);
      startScale = scale;

      pinchCenter = center(e.touches[0], e.touches[1]);

      const rect = wrapper.getBoundingClientRect();

      const offsetX = pinchCenter.x - rect.left;
      const offsetY = pinchCenter.y - rect.top;

      pinchMapX = (offsetX - posX) / scale;
      pinchMapY = (offsetY - posY) / scale;
    }

  }, { passive: false });

  /* =========================
     TOUCH MOVE
  ========================= */

  wrapper.addEventListener("touchmove", (e) => {

    e.preventDefault();

    // Drag
    if (e.touches.length === 1 && isDragging) {

      const touch = e.touches[0];

      const dx = touch.clientX - lastX;
      const dy = touch.clientY - lastY;

      posX += dx;
      posY += dy;

      lastX = touch.clientX;
      lastY = touch.clientY;

      clamp();
      update();
    }

    // Pinch zoom
    if (e.touches.length === 2) {

      const newDistance = distance(e.touches[0], e.touches[1]);

      if (!startDistance) return;

      const newScale = Math.min(
        Math.max(startScale * (newDistance / startDistance), 0.5),
        3
      );

      scale = newScale;

      const rect = wrapper.getBoundingClientRect();
      const offsetX = pinchCenter.x - rect.left;
      const offsetY = pinchCenter.y - rect.top;

      posX = offsetX - pinchMapX * scale;
      posY = offsetY - pinchMapY * scale;

      clamp();
      update();
    }

  }, { passive: false });

  /* =========================
     TOUCH END
  ========================= */

  wrapper.addEventListener("touchend", () => {
    isDragging = false;
    startDistance = null;
  });

}





/* ========================= */

function initZoom() {

  let zoomLevel = 1;

  document.getElementById("zoom-in").onclick = () => {
    zoomLevel += 0.2;
    window.__mapZoom(zoomLevel);
  };

  document.getElementById("zoom-out").onclick = () => {
    zoomLevel -= 0.2;
    window.__mapZoom(zoomLevel);
  };
}






