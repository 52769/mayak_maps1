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

function openModal(point) {

  const modal = document.getElementById("modal");
  const title = document.getElementById("modal-title");
  const desc = document.getElementById("modal-desc");
  const meta = document.getElementById("modal-meta");
  const completeBtn = document.getElementById("complete-btn");
  const closeBtn = document.getElementById("close-btn");

  title.innerText = point.title || "Без названия";
  desc.innerText = point.desc || "";
  meta.innerText = "Тип: " + point.type;

  modal.style.display = "block";

  closeBtn.onclick = () => modal.style.display = "none";

  if (completedPoints.includes(point.id)) {
    completeBtn.innerText = "Уже пройдено";
    completeBtn.disabled = true;
    return;
  }

  completeBtn.innerText = "Отметить как пройдено";
  completeBtn.disabled = false;

  completeBtn.onclick = async () => {

    completeBtn.innerText = "Отмечаем...";
    completeBtn.disabled = true;

    try {

      const tg = window.Telegram?.WebApp;
      const telegram_id = tg?.initDataUnsafe?.user?.id;
      
      const response = await fetch(API + "/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_number: TEAM_NUMBER,
          telegram_id: telegram_id,
          point_id: point.id
        })
      });


      if (!response.ok) {
        completeBtn.innerText = "Ошибка";
        completeBtn.disabled = false;
        return;
      }

      completeBtn.innerText = "Готово ✅";

      setTimeout(() => {
        modal.style.display = "none";
        loadPoints();
      }, 600);

    } catch {
      completeBtn.innerText = "Ошибка сети";
      completeBtn.disabled = false;
    }
  };
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
  teamInfo.innerHTML =
    `Команда: ${TEAM_NUMBER}<br>Роль: ${ROLE}`;
}

/* ========================= */

function initMapControls() {

  const container = document.getElementById("map-container");
  const wrapper = document.getElementById("map-wrapper");

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let posX = 0;
  let posY = 0;
  let scale = 1;

  function update() {
    container.style.transform =
      `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  wrapper.addEventListener("mousedown", e => {
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
  });

  wrapper.addEventListener("mousemove", e => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    update();
  });

  wrapper.addEventListener("mouseup", () => isDragging = false);
  wrapper.addEventListener("mouseleave", () => isDragging = false);

  wrapper.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    startX = touch.clientX - posX;
    startY = touch.clientY - posY;
  });

  wrapper.addEventListener("touchmove", e => {
    const touch = e.touches[0];
    posX = touch.clientX - startX;
    posY = touch.clientY - startY;
    update();
  });

  window.__mapZoom = value => {
    scale = Math.min(Math.max(value, 0.5), 3);
    update();
  };
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


