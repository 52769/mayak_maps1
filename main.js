const API = "https://mayakmaps-production.up.railway.app/api";

let TEAM_NUMBER = null;
let ROLE = null;

let pointsData = [];
let completedPoints = [];
let currentFilter = "all";
let activePoint = null;

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  await waitForTelegram();
  await loadUser();
  await loadPoints();
  initFilters();
  initMapControls();
}

/* =========================
   🧠 Ждём Telegram
========================= */

function waitForTelegram() {
  return new Promise(resolve => {
    const check = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

/* =========================
   👤 USER
========================= */

async function loadUser() {
  try {

    const tg = window.Telegram?.WebApp;

    if (!tg?.initDataUnsafe?.user) {
      console.warn("Telegram user not available");
      return;
    }

    const telegram_id = tg.initDataUnsafe.user.id;

    const response = await fetch(API + "/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id })
    });

    if (!response.ok) throw new Error("User API error");

    const data = await response.json();

    TEAM_NUMBER = data.team_number;
    ROLE = data.role;

    updateTeamInfo();

  } catch (err) {
    console.error("loadUser:", err);
  }
}

/* =========================
   📦 POINTS
========================= */

async function loadPoints() {

  if (!TEAM_NUMBER) return;

  try {

    const response = await fetch(
      API + "/points?team_number=" + TEAM_NUMBER
    );

    if (!response.ok) throw new Error("Points API error");

    const data = await response.json();

    pointsData = data.points || [];
    completedPoints = data.completed || [];

    renderPoints();

  } catch (err) {
    console.error("loadPoints:", err);
  }
}

/* =========================
   📍 RENDER
========================= */

function renderPoints() {

  const layer = document.getElementById("points-layer");
  if (!layer) return;

  layer.innerHTML = "";

  pointsData.forEach(point => {

    if (currentFilter !== "all" && point.type !== currentFilter)
      return;

    if (
      point.visible_for &&
      point.visible_for.length > 0 &&
      !point.visible_for.includes(String(TEAM_NUMBER))
    ) return;

    const el = document.createElement("div");
    el.className = "point";
    el.style.left = point.x + "%";
    el.style.top = point.y + "%";

    if (completedPoints.includes(point.id))
      el.classList.add("completed");

    el.addEventListener("click", () => openModal(point));

    layer.appendChild(el);
  });
}

/* =========================
   📄 MODAL
========================= */

function openModal(point) {

  activePoint = point;

  const modal = document.getElementById("modal");
  if (!modal) return;

  document.getElementById("modal-title").innerText = point.title || "";
  document.getElementById("modal-desc").innerText = point.desc || "";

  modal.style.display = "block";
}

document.addEventListener("click", e => {
  if (e.target.id === "close-btn") {
    document.getElementById("modal").style.display = "none";
  }
});

/* =========================
   👥 TEAM INFO
========================= */

function updateTeamInfo() {
  const teamInfo = document.getElementById("team-info");
  if (!teamInfo) return;

  teamInfo.innerHTML =
    `Команда: ${TEAM_NUMBER}<br>
     Роль: ${ROLE}`;
}

/* =========================
   🗺 MAP CONTROLS
========================= */

function initMapControls() {

  const container = document.getElementById("map-container");
  const wrapper = document.getElementById("map-wrapper");

  if (!container || !wrapper) return;

  let scale = 1;
  let posX = 0;
  let posY = 0;

  let startX = 0;
  let startY = 0;
  let isDragging = false;

  function update() {
    container.style.transform =
      `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  /* Mouse */
  wrapper.addEventListener("mousedown", e => {
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    update();
  });

  /* Touch drag */
  wrapper.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX - posX;
      startY = e.touches[0].clientY - posY;
    }
  });

  wrapper.addEventListener("touchmove", e => {
    if (!isDragging) return;
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
    update();
  });

  wrapper.addEventListener("touchend", () => {
    isDragging = false;
  });
}
