/* =========================
   🚀 Telegram WebApp Init
========================= */

const TelegramApp = (() => {

  const tg = window.Telegram?.WebApp;

  /* =========================
     🛑 Dev fallback
  ========================= */

  if (!tg) {
    console.warn("Telegram WebApp API не найдено — режим разработки");

    return {
      tg: null,
      getTelegramId: () => null,
      sendData: (data) => console.log("Mock sendData:", data),
      closeApp: () => console.log("Mock close")
    };
  }

  /* =========================
     🔧 Базовая инициализация
  ========================= */

  tg.ready();
  tg.expand();

  console.log("Telegram WebApp инициализирован");

  /* =========================
     🎨 Применение темы Telegram
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
     👤 Получение Telegram ID
  ========================= */

  function getTelegramId() {
    return tg.initDataUnsafe?.user?.id || null;
  }

  /* =========================
     📤 Отправка данных боту
  ========================= */

  function sendData(data) {
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
     ❌ Закрытие приложения
  ========================= */

  function closeApp() {
    tg.close();
  }

  /* =========================
     📦 Экспорт
  ========================= */

  return {
    tg,
    getTelegramId,
    sendData,
    closeApp
  };

})();
