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

const API = "https://your-backend-url.com/api";

const TEAM_ID = localStorage.getItem("team_id") || "team_1";
const ROLE = localStorage.getItem("role") || "member";

let pointsData = [];
let currentFilter = "all";
let activePoint = null;
let completedPoints = [];

/* =========================
   📦 Load Points from Backend
========================= */

async function loadPoints() {
  try {
    const response = await fetch(
      API + "/points?team_id=" + TEAM_ID
    );

    const data = await response.json();

    pointsData = data.points;
    completedPoints = data.completed || [];

    renderPoints();

  } catch (err) {
    console.error("Ошибка загрузки точек:", err);
  }
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

    /* 🔎 Фильтр типа */
    if (currentFilter !== "all" && point.type !== currentFilter)
      return;

    /* 👥 Видимость для команды */
    if (
      point.visible_for &&
      point.visible_for.length > 0 &&
      !point.visible_for.includes(point.team_numeric_id)
    ) return;

    /* ⏳ Проверка времени */
    const now = new Date();
    const unlockTime = point.unlock ? new Date(point.unlock) : null;

    const lockedByTime = unlockTime && now < unlockTime;
    const locked = point.locked || lockedByTime;

    /* 📍 Создание точки */
    const el = document.createElement("img");
    el.src = "assets/icons/" + point.type + ".png";
    el.className = "point";

    el.style.left = point.x + "%";
    el.style.top = point.y + "%";

    /* ✅ Пройдено */
    if (completedPoints.includes(point.id))
      el.classList.add("completed");

    /* 🔒 Закрыто */
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
   📄 Modal
========================= */

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalMeta = document.getElementById("modal-meta");
const completeBtn = document.getElementById("complete-btn");

function openModal(point) {

  activePoint = point;

  modalTitle.innerText = point.title || "";
  modalDesc.innerText = point.desc || "";

  modalMeta.innerHTML = `
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

/* =========================
   ✅ Complete Point
========================= */

completeBtn.addEventListener("click", async () => {

  if (!activePoint) return;

  try {

    /* Отправляем в Telegram-бот */
    if (tg) {
      tg.sendData(JSON.stringify({
        type: "point_completed",
        pointId: activePoint.id
      }));
    }

    /* Также отправляем в backend */
    await fetch(API + "/points/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        team_id: TEAM_ID,
        point_id: activePoint.id
      })
    });

    modal.style.display = "none";
    loadPoints();

  } catch (err) {
    console.error("Ошибка отметки точки:", err);
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

/* =========================
   🔄 Auto refresh
========================= */

setInterval(loadPoints, 10000);

/* =========================
   🚀 INIT
========================= */

loadPoints();
updateTransform();
