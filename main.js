const API = "https://mayakmaps-production.up.railway.app/api";

let TEAM_NUMBER = null;
let ROLE = null;

let pointsData = [];
let completedPoints = [];
let currentFilter = "all";
let activePoint = null;

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

  const tg = window.Telegram?.WebApp;

  if (!tg || !tg.initDataUnsafe?.user) {
    console.error("Telegram user not detected");
    return;
  }

  const telegram_id = tg.initDataUnsafe.user.id;

  try {

    const response = await fetch(API + "/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id })
    });

    if (!response.ok) throw new Error("API user error");

    const data = await response.json();

    TEAM_NUMBER = data.team_number;
    ROLE = data.role;

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
  document.getElementById("modal-title").innerText = point.title || "";
  document.getElementById("modal-desc").innerText = point.desc || "";
  document.getElementById("modal-meta").innerHTML =
    `Тип: ${point.type}<br>ID: ${point.id}`;

  modal.style.display = "block";

  const completeBtn = document.getElementById("complete-btn");

  if (ROLE !== "curator" || completedPoints.includes(point.id)) {
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

  window.Telegram?.WebApp?.sendData(JSON.stringify({
    type: "point_completed",
    pointId: activePoint.id
  }));

  document.getElementById("modal").style.display = "none";
  setTimeout(loadPoints, 1000);
});

/* =========================
   👥 TEAM INFO
========================= */

function updateTeamInfo() {
  const teamInfo = document.getElementById("team-info");
  if (!teamInfo) return;

  teamInfo.innerHTML =
    `👥 Команда: <b>${TEAM_NUMBER}</b><br>
     Роль: ${ROLE === "curator" ? "Куратор" : "Участник"}`;
}

/* =========================
   🗺 MAP CONTROLS (TOUCH FIX)
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

  /* Pinch zoom */
  wrapper.addEventListener("touchmove", e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!wrapper._lastDistance)
        wrapper._lastDistance = distance;

      const diff = distance - wrapper._lastDistance;

      scale += diff * 0.005;
      scale = Math.min(Math.max(scale, 0.5), 3);

      wrapper._lastDistance = distance;

      update();
    }
  });

}
