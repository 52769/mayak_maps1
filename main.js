const API = "https://web-production-ca948.up.railway.app/api";

let TEAM_NUMBER = null;
let ROLE = null;
let pointsData = [];
let completedPoints = [];
let currentFilter = "all";

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

/* ========================= */

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

/* ========================= */

async function loadUser() {

  const tg = window.Telegram?.WebApp;

  if (!tg) {
    log("Telegram WebApp not found");
    return;
  }

  tg.ready();

  let attempts = 0;
  while (!tg.initDataUnsafe?.user && attempts < 15) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (!tg.initDataUnsafe?.user) {
    log("Telegram user not detected");
    return;
  }

  const telegram_id = tg.initDataUnsafe.user.id;

  try {

    const response = await fetch(API + "/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id })
    });

    if (!response.ok) {
      log("User not registered");
      return;
    }

    const data = await response.json();

    TEAM_NUMBER = data.team_number;
    ROLE = data.role;

    updateTeamInfo();

  } catch (err) {
    log("User API error");
  }
}

/* ========================= */

async function loadPoints() {

  if (!TEAM_NUMBER) return;

  try {

    const response = await fetch(
      API + "/points?team_number=" + TEAM_NUMBER
    );

    if (!response.ok) {
      log("Points API error");
      return;
    }

    const data = await response.json();

    pointsData = data.points || [];
    completedPoints = data.completed || [];

    renderPoints();

  } catch (err) {
    log("Points fetch failed");
  }
}

/* ========================= */

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

    layer.appendChild(el);
  });
}

/* ========================= */

function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.type;
      renderPoints();
    });
  });
}

/* ========================= */

function updateTeamInfo() {
  const teamInfo = document.getElementById("team-info");
  if (!teamInfo) return;

  teamInfo.innerHTML =
    `Команда: ${TEAM_NUMBER}<br>Роль: ${ROLE}`;
}

/* ========================= */

function initMapControls() {

  const container = document.getElementById("map-container");
  const wrapper = document.getElementById("map-wrapper");

  if (!container || !wrapper) return;

  let scale = 1;
  let posX = 0;
  let posY = 0;

  function update() {
    container.style.transform =
      `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  wrapper.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
      wrapper.dataset.startX = e.touches[0].clientX - posX;
      wrapper.dataset.startY = e.touches[0].clientY - posY;
    }
  });

  wrapper.addEventListener("touchmove", e => {
    if (e.touches.length === 1) {
      posX = e.touches[0].clientX - wrapper.dataset.startX;
      posY = e.touches[0].clientY - wrapper.dataset.startY;
      update();
    }
  });
}

/* ========================= */

function log(msg) {
  const debug = document.getElementById("debug");
  if (debug)
    debug.innerHTML += `<div>${msg}</div>`;
}

