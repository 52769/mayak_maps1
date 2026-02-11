/* =========================
   🚀 Telegram Init
========================= */

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

/* =========================
   ⚙ CONFIG
========================= */

const TEAM_ID =
  window.TelegramApp?.teamId ||
  localStorage.getItem("team_id") ||
  "team_1";

let pointsData = [];
let currentFilter = "all";
let activePoint = null;

/* =========================
   📦 Load Points JSON
========================= */

async function loadPoints() {
  try {
    const response = await fetch("data/points.json?t=" + Date.now());
    pointsData = await response.json();
    renderPoints();
  } catch (err) {
    console.error("Ошибка загрузки points.json", err);
  }
}

/* =========================
   💾 Team Progress
========================= */

let teamProgress = JSON.parse(
  localStorage.getItem("progress_" + TEAM_ID) || "[]"
);

function saveProgress() {
  localStorage.setItem(
    "progress_" + TEAM_ID,
    JSON.stringify(teamProgress)
  );
}

/* =========================
   🧭 Filters
========================= */

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    currentFilter = btn.dataset.type;
    renderPoints();
  });
});

/* =========================
   📍 Render Points
========================= */

const layer = document.getElementById("points-layer");

function renderPoints() {
  layer.innerHTML = "";

  pointsData.forEach(point => {

    if (currentFilter !== "all" && point.type !== currentFilter)
      return;

    const now = new Date();
    const unlockTime = point.unlock ? new Date(point.unlock) : null;
    const locked = unlockTime && now < unlockTime;

    const el = document.createElement("img");
    el.src = "assets/icons/" + point.type + ".png";
    el.className = "point";

    el.style.left = point.x + "%";
    el.style.top = point.y + "%";

    if (teamProgress.includes(point.id))
      el.classList.add("completed");

    if (locked)
      el.classList.add("locked");

    el.addEventListener("click", () => {
      if (locked) {
        alert("Точка откроется позже");
        return;
      }
      openModal(point);
    });

    layer.appendChild(el);
  });
}

/* =========================
   📄 Modal
========================= */

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const completeBtn = document.getElementById("complete-btn");

function openModal(point) {
  activePoint = point;

  modalTitle.innerText = point.title || "";
  modalDesc.innerText = point.desc || "";

  modal.style.display = "block";

  const alreadyCompleted = teamProgress.includes(point.id);
  completeBtn.style.display = alreadyCompleted ? "none" : "block";
}

completeBtn.addEventListener("click", () => {

  if (!activePoint) return;

  if (!teamProgress.includes(activePoint.id)) {
    teamProgress.push(activePoint.id);
    saveProgress();
  }

  modal.style.display = "none";
  renderPoints();
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

/* =========================
   🗺 Zoom + Drag (Google Maps Style)
========================= */

let scale = 1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX, startY;

const container = document.getElementById("map-container");
const wrapper = document.getElementById("map-wrapper");

function updateTransform() {
  container.style.transform =
    `translate(${posX}px, ${posY}px) scale(${scale})`;
}

/* ====== Zoom в точку ====== */

function zoomAtPoint(clientX, clientY, factor) {

  const rect = wrapper.getBoundingClientRect();

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const prevScale = scale;
  scale *= factor;
  scale = Math.min(Math.max(scale, 0.5), 3);

  posX = x - ((x - posX) * (scale / prevScale));
  posY = y - ((y - posY) * (scale / prevScale));

  updateTransform();
}

/* ====== Кнопки ====== */

document.querySelectorAll(".zoom-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const rect = wrapper.getBoundingClientRect();
    const factor = btn.innerText === "+" ? 1.2 : 0.8;

    zoomAtPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      factor
    );
  });
});

/* ====== Колесо мыши ====== */

wrapper.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoomAtPoint(
    e.clientX,
    e.clientY,
    e.deltaY < 0 ? 1.1 : 0.9
  );
});

/* ====== Drag мышью ====== */

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

/* ====== Touch (1 палец — drag, 2 пальца — zoom) ====== */

let initialDistance = null;
let initialScale = 1;

wrapper.addEventListener("touchstart", (e) => {

  if (e.touches.length === 2) {
    initialDistance = getDistance(e.touches[0], e.touches[1]);
    initialScale = scale;
  }

  if (e.touches.length === 1) {
    isDragging = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }
});

wrapper.addEventListener("touchmove", (e) => {

  if (e.touches.length === 2) {

    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const scaleFactor = currentDistance / initialDistance;

    const newScale = Math.min(Math.max(initialScale * scaleFactor, 0.5), 3);

    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    zoomAtPoint(centerX, centerY, newScale / scale);
    return;
  }

  if (!isDragging) return;

  posX = e.touches[0].clientX - startX;
  posY = e.touches[0].clientY - startY;
  updateTransform();
});

wrapper.addEventListener("touchend", () => {
  isDragging = false;
});

/* ====== Distance helper ====== */

function getDistance(t1, t2) {
  return Math.sqrt(
    Math.pow(t2.clientX - t1.clientX, 2) +
    Math.pow(t2.clientY - t1.clientY, 2)
  );
}

/* =========================
   🔄 Auto refresh
========================= */

setInterval(loadPoints, 10000);

/* =========================
   🚀 INIT
========================= */

loadPoints();
updateTransform();
