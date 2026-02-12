/* =========================
   🚀 Telegram WebApp Init
========================= */

const TelegramApp = (() => {

  const tg = window.Telegram?.WebApp;

  /* =========================
     🛑 Fallback (если не Telegram)
  ========================= */

  if (!tg) {
    console.warn("Telegram WebApp API не найдено — режим разработки");

    const fallbackTeam = localStorage.getItem("team_id") || "team_1";
    const fallbackRole = localStorage.getItem("role") || "curator";

    localStorage.setItem("team_id", fallbackTeam);
    localStorage.setItem("role", fallbackRole);

    return {
      tg: null,
      teamId: fallbackTeam,
      role: fallbackRole,
      sendData: (data) => {
        console.log("Mock sendData:", data);
      },
      closeApp: () => {
        console.log("Mock close");
      }
    };
  }

  /* =========================
     🔧 Базовая инициализация
  ========================= */

  tg.ready();
  tg.expand();

  console.log("Telegram WebApp инициализирован");

  /* =========================
     🎨 Применение темы
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
     🔑 Получение параметров запуска
  ========================= */

  function parseStartParam() {

    const startParam = tg.initDataUnsafe?.start_param;

    if (!startParam) return null;

    /*
      Формат рекомендуемый:
      team_3:curator
      team_2:member
    */

    const parts = startParam.split(":");

    const teamId = parts[0] || "team_1";
    const role = parts[1] || "member";

    return { teamId, role };
  }

  function initAuth() {

    const parsed = parseStartParam();

    if (parsed) {
      localStorage.setItem("team_id", parsed.teamId);
      localStorage.setItem("role", parsed.role);
      return parsed;
    }

    /* Если уже есть сохранённые данные */
    const savedTeam = localStorage.getItem("team_id");
    const savedRole = localStorage.getItem("role");

    if (savedTeam && savedRole) {
      return { teamId: savedTeam, role: savedRole };
    }

    /* Fallback */
    const defaultTeam = "team_1";
    const defaultRole = "member";

    localStorage.setItem("team_id", defaultTeam);
    localStorage.setItem("role", defaultRole);

    return { teamId: defaultTeam, role: defaultRole };
  }

  const auth = initAuth();

  console.log("Team ID:", auth.teamId);
  console.log("Role:", auth.role);

  /* =========================
     📤 Отправка данных в бота
  ========================= */

  function sendData(data) {

    if (!tg) return;

    try {
      tg.sendData(
        typeof data === "string"
          ? data
          : JSON.stringify(data)
      );
    } catch (err) {
      console.error("Ошибка отправки данных:", err);
    }
  }

  /* =========================
     🔘 Main Button (опционально)
  ========================= */

  function showMainButton(text, callback) {

    tg.MainButton.setText(text);
    tg.MainButton.show();

    tg.MainButton.offClick();

    tg.MainButton.onClick(() => {
      callback();
    });
  }

  function hideMainButton() {
    tg.MainButton.hide();
  }

  /* =========================
     ❌ Закрытие приложения
  ========================= */

  function closeApp() {
    tg.close();
  }

  /* =========================
     📦 Экспорт API
  ========================= */

  return {
    tg,
    teamId: auth.teamId,
    role: auth.role,
    sendData,
    showMainButton,
    hideMainButton,
    closeApp
  };

})();
