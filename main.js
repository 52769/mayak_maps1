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

const API = "https://mayakmaps-production.up.railway.app/api";

let TEAM_NUMBER = null;
let ROLE = "member";

let pointsData = [];
let completedPoints = [];
let currentFilter = "all";
let activePoint = null;

/* =========================
   👤 Получение данных пользователя
========================= */

async function loadUser() {

  if (!tg || !tg.initDataUnsafe?.user) {
    console.warn("Dev mode — fallback user");
    TEAM_NUMBER = localStorage.getItem("team_id") || "1";
    ROLE = localStorage.getItem("role") || "member";
    return;
  }

  const telegram_id = tg.initDataUnsafe.user.id;

  const response = await fetch(API + "/me", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ telegram_id })
  });

  const data = await response.json();

  TEAM_NUMBER = data.team_number;
  ROLE = data.role;

  localStorage.setItem("team_id", TEAM_NUMBER);
  localStorage.setItem("role", ROLE);

  updateTeamInfo();
}

/* =========================
   📦 Загрузка точек
========================= */

async function loadPoints() {

  if (!TEAM_NUMBER) return;

  try {

    const response = await fetch(
      API + "/points?team_number=" + TEAM_NUMBER
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

    /* Фильтр по типу */
    if (currentFilter !== "all" && point.type !== currentFilter)
      return;

    /* Видимость для команд */
    if (
      point.visible_for &&
      point.visible_for.length > 0 &&
      !point.visible_for.includes(String(TEAM_NUMBER))
    ) return;

    /* Проверка времени открытия */
    const now = new Date();
    const unlockTime = point.unlock ? new Date(point.unlock) : null;

    const lockedByTime = unlockTime && now < unlockTime;
    const locked = point.locked || lockedByTime;

    const el = document.createElement("img");
    el.src = "assets/icons/" + point.type + ".png";
    el.className = "point";

    el.style.left = point.x + "%";
    el.style.top = point.y + "%";

    /* Пройденные */
    if (completedPoints.includes(point.id))
      el.classList.add("completed");

    /* Закрытые */
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

completeBtn.addEventListener("click", () => {

  if (!activePoint) return;

  if (!tg) return;

  tg.sendData(JSON.stringify({
    type: "point_completed",
    pointId: activePoint.id
  }));

  modal.style.display = "none";

  /* Перезагружаем точки через 1 сек */
  setTimeout(loadPoints, 1000);
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

/* Zoom кнопки */
document.querySelectorAll(".zoom-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    zoom(btn.innerText === "+" ? 1.2 : 0.8);
  });
});

/* Колёсико */
wrapper.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1.1 : 0.9);
});

/* Drag мышью */
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

/* Touch */
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
   👥 Обновление верхней панели
========================= */

function updateTeamInfo() {
  const teamInfo = document.getElementById("team-info");

  if (!teamInfo) return;

  teamInfo.innerHTML = `
    👥 Команда: <b>${TEAM_NUMBER}</b><br>
    Роль: ${ROLE === "curator" ? "Куратор" : "Участник"}
  `;
}

/* =========================
   🚀 INIT
========================= */

(async () => {
  await loadUser();
  await loadPoints();
  updateTransform();
})();



