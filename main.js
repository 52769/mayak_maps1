/* =========================
   ⚙ CONFIG
========================= */

// ⚠ ВАЖНО: обязательно https
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

(async () => {
  await loadUser();
  await loadPoints();
  initFilters();
  initMapControls();
})();

/* =========================
   👤 Получение пользователя
========================= */

async function loadUser() {

  try {

    const telegram_id = TelegramApp?.getTelegramId();

    // DEV fallback
    if (!telegram_id) {
      console.warn("DEV MODE — используем localStorage");

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

    if (!response.ok) {
      console.error("Ошибка получения пользователя");
      return;
    }

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
   📦 Загрузка точек
========================= */

async function loadPoints() {

  if (!TEAM_NUMBER) return;

  try {

    const response = await fetch(
      API + "/points?team_number=" + TEAM_NUMBER
    );

    if (!response.ok) {
      console.error("Ошибка загрузки точек");
      return;
    }

    const data = await response.json();

    pointsData = data.points || [];
    completedPoints = data.completed || [];

    renderPoints();

  } catch (err) {
    console.error("loadPoints error:", err);
  }
}

/* =========================
   🎛 Фильтры
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
   📍 Отрисовка точек
========================= */

const layer = document.getElementById("points-layer");

function renderPoints() {

  if (!layer) return;

  layer.innerHTML = "";

  pointsData.forEach(point => {

    // Фильтр по типу
    if (currentFilter !== "all" && point.type !== currentFilter)
      return;

    // Проверка visible_for
    if (
      point.visible_for &&
      point.visible_for.length > 0 &&
      !point.visible_for.includes(String(TEAM_NUMBER))
    ) return;

    // Проверка unlock времени
    const now = new Date();
    const unlockTime = point.unlock ? new Date(point.unlock) : null;
    const lockedByTime = unlockTime && now < unlockTime;
    const locked = point.locked || lockedByTime;

    const el = document.createElement("div");
    el.className = "point";

    // если нет иконок — fallback круг
    el.style.background = "#2AABEE";
    el.style.borderRadius = "50%";

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
   📄 Модалка
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
   ✅ Засчёт точки
========================= */

completeBtn.addEventListener("click", () => {

  if (!activePoint) return;

  TelegramApp.sendData({
    type: "point_completed",
    pointId: activePoint.id
  });

  modal.style.display = "none";

  // Обновляем данные через секунду
  setTimeout(loadPoints, 1000);
});

/* =========================
   👥 Обновление панели
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
   🗺 Zoom + Drag
========================= */

function initMapControls() {

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
