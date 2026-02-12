/* =========================
   ⚙ CONFIG
========================= */

const API = "https://mayakmaps-production.up.railway.app/api";

let TEAM_NUMBER = null;
let ROLE = "member";

let pointsData = [];
let completedPoints = [];
let currentFilter = "all";
let activePoint = null;

/* =========================
   🚀 INIT
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  await loadUser();
  await loadPoints();
  initFilters();
  initMapControls();
});

/* =========================
   👤 USER
========================= */

async function loadUser() {
  try {
    const telegram_id = window.TelegramApp?.getTelegramId();

    if (!telegram_id) {
      console.warn("DEV MODE");
      TEAM_NUMBER = localStorage.getItem("team_id") || "1";
      ROLE = localStorage.getItem("role") || "member";
      updateTeamInfo();
      return;
    }

    const response = await fetch(API + "/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id })
    });

    if (!response.ok) throw new Error("API error");

    const data = await response.json();

    TEAM_NUMBER = data.team_number;
    ROLE = data.role;

    localStorage.setItem("team_id", TEAM_NUMBER);
    localStorage.setItem("role", ROLE);

    updateTeamInfo();

  } catch (err) {
    console.error("loadUser error:", err);
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
    console.error("loadPoints error:", err);
  }
}

/* =========================
   🎛 FILTERS
========================= */

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

    const now = new Date();
    const unlockTime = point.unlock ? new Date(point.unlock) : null;
    const lockedByTime = unlockTime && now < unlockTime;
    const locked = point.locked || lockedByTime;

    const el = document.createElement("div");
    el.className = "point";
    el.style.left = point.x + "%";
    el.style.top = point.y + "%";

    if (completedPoints.includes(point.id))
      el.classList.add("completed");

    if (locked)
      el.classList.add("locked");

    el.addEventListener("click", () => {
      if (locked) {
        alert("Точка пока закрыта");
        return;
      }
      openModal(point);
    });

    layer.appendChild(el);
  });
}

/* =========================
   📄 MODAL
========================= */

function openModal(point) {

  activePoint = point;

  const modal = document.getElementById("modal");
  const title = document.getElementById("modal-title");
  const desc = document.getElementById("modal-desc");
  const meta = document.getElementById("modal-meta");
  const completeBtn = document.getElementById("complete-btn");

  if (!modal) return;

  title.innerText = point.title || "";
  desc.innerText = point.desc || "";

  meta.innerHTML = `
    Тип: ${point.type}<br>
    ID: ${point.id}
  `;

  modal.style.display = "block";

  if (
    ROLE !== "curator" ||
    completedPoints.includes(point.id)
  ) {
    completeBtn.style.display = "none";
  } else {
    completeBtn.style.display = "block";
  }
}

document.getElementById("close-btn")?.addEventListener("click", () => {
  document.getElementById("modal").style.display = "none";
});

document.getElementById("complete-btn")?.addEventListener("click", () => {

  if (!activePoint) return;

  window.TelegramApp?.sendData({
    type: "point_completed",
    pointId: activePoint.id
  });

  document.getElementById("modal").style.display = "none";

  setTimeout(loadPoints, 1000);
});

/* =========================
   👥 TEAM INFO
========================= */

function updateTeamInfo() {

  const teamInfo = document.getElementById("team-info");
  if (!teamInfo) return;

  teamInfo.style.color = "#000";

  teamInfo.innerHTML = `
    👥 Команда: <b>${TEAM_NUMBER}</b><br>
    Роль: ${ROLE === "curator" ? "Куратор" : "Участник"}
  `;
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
  let isDragging = false;
  let startX, startY;

  function updateTransform() {
    container.style.transform =
      `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  function zoom(factor) {
    scale *= factor;
    scale = Math.min(Math.max(scale, 0.5), 3);
    updateTransform();
  }

  document.querySelectorAll(".zoom-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      zoom(btn.innerText === "+" ? 1.2 : 0.8);
    });
  });

  wrapper.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.1 : 0.9);
  });

  wrapper.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    updateTransform();
  });
}
