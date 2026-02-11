/* =========================
   ⚙ CONFIG
========================= */

const TEAM_ID = window.TelegramApp?.teamId || localStorage.getItem("team_id") || "team_1";

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

  if (teamProgress.includes(point.id)) {
    completeBtn.style.display = "none";
  } else {
    completeBtn.style.display = "block";
  }
}

completeBtn.addEventListener("click", () => {

  if (!activePoint) return;

  if (!teamProgress.includes(activePoint.id)) {
    teamProgress.push(activePoint.id);
    saveProgress();
  }

  // Отправка события в Telegram-бот
  if (window.TelegramApp) {
    TelegramApp.sendData({
      type: "point_completed",
      team: TEAM_ID,
      pointId: activePoint.id
    });
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
   🔍 Zoom + Drag
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

function zoom(factor) {
  scale *= factor;
  scale = Math.min(Math.max(scale, 0.5), 3);
  updateTransform();
}

/* Zoom buttons */
document.querySelectorAll(".zoom-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const factor = btn.innerText === "+" ? 1.2 : 0.8;
    zoom(factor);
  });
});

/* Mouse wheel zoom */
wrapper.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1.1 : 0.9);
});

/* Drag mouse */
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

/* Touch drag */
wrapper.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }
});

wrapper.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  posX = e.touches[0].clientX - startX;
  posY = e.touches[0].clientY - startY;
  updateTransform();
});

wrapper.addEventListener("touchend", () => {
  isDragging = false;
});
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
    scale = Math.min(Math.max(initialScale * scaleFactor, 0.5), 3);
    updateTransform();
    return;
  }

  if (!isDragging) return;

  posX = e.touches[0].clientX - startX;
  posY = e.touches[0].clientY - startY;
  updateTransform();
});

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

