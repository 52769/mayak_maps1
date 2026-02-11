/* =========================
   🚀 Telegram WebApp Init
========================= */

const TelegramApp = (() => {

  const tg = window.Telegram?.WebApp;

  if (!tg) {
    console.warn("Telegram WebApp API не найдено");
    return null;
  }

  tg.ready();
  tg.expand();

  console.log("Telegram WebApp инициализирован");

  /* =========================
     🎨 Theme (по желанию)
  ========================= */

  function applyTheme() {
    const theme = tg.themeParams;

    if (!theme) return;

    document.documentElement.style.setProperty(
      "--bg",
      theme.bg_color || "#ffffff"
    );

    document.documentElement.style.setProperty(
      "--text",
      theme.text_color || "#000000"
    );

    document.documentElement.style.setProperty(
      "--accent",
      theme.button_color || "#2AABEE"
    );
  }

  applyTheme();

  tg.onEvent("themeChanged", applyTheme);

  /* =========================
     👥 Получение team_id
  ========================= */

  function getTeamId() {

    // 1️⃣ из start_param (если бот передал)
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam) {
      localStorage.setItem("team_id", startParam);
      return startParam;
    }

    // 2️⃣ если уже сохранён
    const saved = localStorage.getItem("team_id");
    if (saved) return saved;

    // 3️⃣ fallback
    const fallback = "team_1";
    localStorage.setItem("team_id", fallback);
    return fallback;
  }

  const teamId = getTeamId();

  console.log("Team ID:", teamId);

  /* =========================
     🔘 Main Button
  ========================= */

  function showMainButton(text, callback) {
    tg.MainButton.setText(text);
    tg.MainButton.show();

    tg.MainButton.onClick(callback);
  }

  function hideMainButton() {
    tg.MainButton.hide();
  }

  /* =========================
     📤 Отправка данных в бота
  ========================= */

  function sendData(data) {
    tg.sendData(JSON.stringify(data));
  }

  /* =========================
     ❌ Закрытие приложения
  ========================= */

  function closeApp() {
    tg.close();
  }

  return {
    tg,
    teamId,
    showMainButton,
    hideMainButton,
    sendData,
    closeApp
  };

})();
