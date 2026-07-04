(function () {
  const startDate = new Date(2026, 6, 4);
  const endDate = new Date(2026, 7, 4);
  const today = clampDate(new Date(), startDate, endDate);
  const storageKey = "month-progress-v1";

  const weekdayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа"];

  const state = loadState();
  const days = buildDays();
  let selectedKey = formatKey(today);
  let activeModal = null;

  const calendarGrid = document.querySelector("#calendarGrid");
  const dayModal = document.querySelector("#dayModal");
  const modalBackdrop = document.querySelector("#modalBackdrop");
  const closeDay = document.querySelector("#closeDay");
  const profileModal = document.querySelector("#profileModal");
  const profileBackdrop = document.querySelector("#profileBackdrop");
  const closeProfile = document.querySelector("#closeProfile");
  const profileButton = document.querySelector("#profileButton");
  const profileButtonPhoto = document.querySelector("#profileButtonPhoto");
  const avatarButton = document.querySelector("#avatarButton");
  const changePhotoButton = document.querySelector("#changePhotoButton");
  const fitPhotoButton = document.querySelector("#fitPhotoButton");
  const photoInput = document.querySelector("#photoInput");
  const profilePhoto = document.querySelector("#profilePhoto");
  const avatarFallback = document.querySelector("#avatarFallback");
  const selectedWeekday = document.querySelector("#selectedWeekday");
  const selectedDate = document.querySelector("#selectedDate");
  const loadPill = document.querySelector("#loadPill");
  const dayFocus = document.querySelector("#dayFocus");
  const taskList = document.querySelector("#taskList");
  const energyRange = document.querySelector("#energyRange");
  const energyValue = document.querySelector("#energyValue");
  const dayNotes = document.querySelector("#dayNotes");
  const habitScore = document.querySelector("#habitScore");
  const workScore = document.querySelector("#workScore");
  const sportScore = document.querySelector("#sportScore");
  const streakScore = document.querySelector("#streakScore");
  const topStreakScore = document.querySelector("#topStreakScore");
  const streakFlame = document.querySelector("#streakFlame");
  const syncUrlInput = document.querySelector("#syncUrlInput");
  const syncKeyInput = document.querySelector("#syncKeyInput");
  const syncCodeInput = document.querySelector("#syncCodeInput");
  const saveSyncSettingsButton = document.querySelector("#saveSyncSettings");
  const pullSyncButton = document.querySelector("#pullSyncButton");
  const pushSyncButton = document.querySelector("#pushSyncButton");
  const syncStatus = document.querySelector("#syncStatus");

  renderCalendar();
  renderStats();
  renderProfilePhoto();
  renderSyncSettings();
  normalizeStoredProfilePhoto();

  profileButton.addEventListener("click", openProfile);
  avatarButton.addEventListener("click", () => photoInput.click());
  changePhotoButton.addEventListener("click", () => photoInput.click());
  fitPhotoButton.addEventListener("click", fitCurrentPhoto);
  photoInput.addEventListener("change", handlePhotoChange);
  closeDay.addEventListener("click", closeDayModal);
  modalBackdrop.addEventListener("click", closeDayModal);
  closeProfile.addEventListener("click", closeProfileModal);
  profileBackdrop.addEventListener("click", closeProfileModal);
  saveSyncSettingsButton.addEventListener("click", saveSyncSettings);
  pullSyncButton.addEventListener("click", pullCloudState);
  pushSyncButton.addEventListener("click", pushCloudState);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (activeModal === "day") closeDayModal();
    if (activeModal === "profile") closeProfileModal();
  });

  energyRange.addEventListener("input", () => {
    const entry = ensureEntry(selectedKey);
    entry.energy = Number(energyRange.value);
    energyValue.textContent = entry.energy;
    saveState();
  });

  dayNotes.addEventListener("input", () => {
    ensureEntry(selectedKey).notes = dayNotes.value;
    saveState();
  });

  function buildDays() {
    const result = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      result.push(buildDay(new Date(current)));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  function buildDay(date) {
    const key = formatKey(date);
    const day = date.getDay();
    const weekIndex = Math.floor((date - startDate) / 604800000);
    const isSportDay = [1, 3, 6].includes(day);
    const isRestDay = day === 0;
    const isDeepDay = [2, 4].includes(day);
    const productFocus = productFocusFor(date, weekIndex);
    const botFocus = botFocusFor(date, weekIndex);

    const tasks = [
      {
        id: "cold",
        title: "Холодный душ",
        meta: "2-4 минуты. Главное - отметить выполнение, без насилия над собой.",
        type: "habit"
      },
      {
        id: "english",
        title: "Английский",
        meta: "15 минут: слова, listening или короткий текст.",
        type: "habit"
      },
      {
        id: "design",
        title: "Веб-дизайн",
        meta: "60 минут подготовки к конкурсу: один экран, разбор референса или практика.",
        type: "work"
      }
    ];

    if (isSportDay) {
      tasks.push({
        id: "sport",
        title: "Спорт",
        meta: "45-60 минут: база, техника, растяжка в конце.",
        type: "sport"
      });
    }

    if (!isRestDay) {
      tasks.push({
        id: "product",
        title: productFocus.title,
        meta: productFocus.meta,
        type: "work"
      });
    }

    tasks.push({
      id: "bot",
      title: botFocus.title,
      meta: botFocus.meta,
      type: "work"
    });

    if (isRestDay) {
      tasks.push({
        id: "review",
        title: "Недельный обзор",
        meta: "20 минут: что работает, что перегружает, что переносим.",
        type: "habit"
      });
    }

    return {
      key,
      date,
      focus: focusFor(date, weekIndex, isRestDay, isDeepDay),
      tasks
    };
  }

  function focusFor(date, weekIndex, isRestDay, isDeepDay) {
    if (formatKey(date) === "2026-07-04") return "Запустить систему и сделать первый контакт с планом";
    if (isRestDay) return "Восстановление, обзор недели и поддержка привычек";
    if (weekIndex === 0) return isDeepDay ? "Собрать базу продукта и MVP" : "Войти в ритм без перегруза";
    if (weekIndex === 1) return isDeepDay ? "Первые бизнесы и прототип чат-бота" : "Закрепить ежедневные блоки";
    if (weekIndex === 2) return isDeepDay ? "Продажи, обратная связь и улучшение MVP" : "Держать стабильность";
    if (weekIndex === 3) return isDeepDay ? "Довести продукт до предложения" : "Собрать результаты в понятную систему";
    return "Финиш месяца и подготовка следующего цикла";
  }

  function productFocusFor(date, weekIndex) {
    const day = date.getDay();
    const weekPlans = [
      [
        ["Идея продукта", "45 минут: выбрать 1 нишу и 1 простую проблему бизнеса."],
        ["Оффер продукта", "60 минут: сформулировать, что ты продаешь и какой результат обещаешь."],
        ["Список бизнесов", "45 минут: найти 10 мест, куда можно обратиться."],
        ["Скрипт предложения", "45 минут: написать короткое сообщение и устный питч."],
        ["Первые 2 контакта", "30-45 минут: написать или зайти в 2 бизнеса."]
      ],
      [
        ["Уточнить оффер", "45 минут: сделать предложение более конкретным после первых реакций."],
        ["5 новых контактов", "60 минут: отправить сообщения или зайти в бизнесы."],
        ["Мини-презентация", "60 минут: собрать 1 страницу с пользой, ценой и примерами."],
        ["Разбор отказов", "30 минут: выписать возражения и ответы."],
        ["Следующие 5 контактов", "60 минут: продолжить продажи без ожидания идеальности."]
      ],
      [
        ["Пилотное предложение", "60 минут: предложить дешевый или тестовый запуск."],
        ["Дожим теплых", "45 минут: написать тем, кто уже ответил."],
        ["Улучшить пример", "60 минут: сделать мокап, демо или маленький результат."],
        ["Еще 5 контактов", "60 минут: расширить список и обратиться."],
        ["Финансы", "30 минут: прописать цену, оплату и что входит."]
      ],
      [
        ["Собрать кейс", "45 минут: оформить все, что уже сделал, в понятный пример."],
        ["10 контактов", "75 минут: активный день outreach."],
        ["Переговоры", "45 минут: подготовить ответы, условия и следующий шаг."],
        ["Упаковка", "60 минут: довести презентацию и оффер."],
        ["Итоги продаж", "30 минут: цифры, выводы, следующий месяц."]
      ],
      [
        ["Финальный рывок", "60 минут: выбрать один самый вероятный путь к оплате."],
        ["Контакты и follow-up", "60 минут: написать всем теплым лидам."]
      ]
    ];
    const pool = weekPlans[Math.min(weekIndex, weekPlans.length - 1)];
    const index = Math.max(0, Math.min(pool.length - 1, day - 1));
    return { title: pool[index][0], meta: pool[index][1] };
  }

  function botFocusFor(date, weekIndex) {
    const day = date.getDay();
    const map = [
      [
        ["MVP чат-бота", "60 минут: определить пользователей, 3 главных сценария и ограничения."],
        ["Архитектура бота", "60 минут: расписать команды, данные и ответы."],
        ["Прототип диалогов", "60 минут: написать основные ветки общения."],
        ["Техстек MVP", "45 минут: выбрать стек и минимальный способ запуска."],
        ["План разработки", "45 минут: разбить MVP на задачи."]
      ],
      [
        ["Скелет MVP", "75 минут: создать базовую структуру и первый сценарий."],
        ["Сценарии бота", "60 минут: добавить 2-3 ключевых ответа."],
        ["Данные университета", "60 минут: подготовить тестовую базу вопросов."],
        ["Проверка диалогов", "45 минут: пройти путь пользователя."],
        ["Сборка демо", "60 минут: показать минимальный рабочий поток."]
      ],
      [
        ["Улучшить ответы", "60 минут: сделать ответы короче и полезнее."],
        ["Логика состояний", "75 минут: обработать ошибки и непонятные запросы."],
        ["Тесты сценариев", "45 минут: проверить 10 типовых вопросов."],
        ["Мини-админка", "60 минут: решить, как обновлять вопросы/ответы."],
        ["Демо для обратной связи", "60 минут: подготовить показ."]
      ],
      [
        ["Полировка MVP", "75 минут: убрать грубые места и повторения."],
        ["Онбординг", "60 минут: сделать первое сообщение и меню."],
        ["Сбор обратной связи", "45 минут: дать попробовать 1-2 людям."],
        ["Исправления", "60 минут: внести улучшения по фидбеку."],
        ["План следующего месяца", "45 минут: что нужно после MVP."]
      ],
      [
        ["Финиш MVP", "75 минут: собрать рабочую демо-версию."],
        ["Документация", "45 минут: записать, как запускать и что умеет бот."]
      ]
    ];
    const pool = map[Math.min(weekIndex, map.length - 1)];
    const index = day === 0 ? pool.length - 1 : Math.max(0, Math.min(pool.length - 1, day - 1));
    return { title: pool[index][0], meta: pool[index][1] };
  }

  function renderCalendar() {
    calendarGrid.innerHTML = "";
    const firstOffset = mondayIndex(startDate);
    for (let i = 0; i < firstOffset; i += 1) {
      const spacer = document.createElement("div");
      spacer.className = "day-cell is-empty";
      calendarGrid.appendChild(spacer);
    }

    days.forEach((day) => {
      const entry = ensureEntry(day.key);
      const button = document.createElement("button");
      const status = dayStatus(day, entry);
      button.type = "button";
      button.className = `day-cell is-${status.kind} ${day.key === formatKey(today) ? "is-today" : ""}`;
      button.setAttribute("aria-label", `${formatDate(day.date)}, ${weekdayNames[day.date.getDay()]}, ${status.label}`);
      button.innerHTML = `
        <span class="day-number">
          <span>${day.date.getDate()}</span>
        </span>
      `;
      button.addEventListener("click", () => openDay(day.key));
      calendarGrid.appendChild(button);
    });
  }

  function openDay(key) {
    selectedKey = key;
    activeModal = "day";
    renderDay();
    dayModal.classList.add("is-open");
    dayModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    closeDay.focus();
  }

  function closeDayModal() {
    activeModal = null;
    dayModal.classList.remove("is-open");
    dayModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function openProfile() {
    activeModal = "profile";
    renderStats();
    renderSyncSettings();
    profileModal.classList.add("is-open");
    profileModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    closeProfile.focus();
  }

  function closeProfileModal() {
    activeModal = null;
    profileModal.classList.remove("is-open");
    profileModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function handlePhotoChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      normalizeAvatar(reader.result)
        .then((avatarDataUrl) => {
          state.profilePhoto = avatarDataUrl;
          state.profilePhotoVersion = 5;
          saveState();
          renderProfilePhoto();
        })
        .finally(() => {
          photoInput.value = "";
        });
    });
    reader.readAsDataURL(file);
  }

  function normalizeAvatar(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const crop = findAvatarCrop(image);

        canvas.width = size;
        canvas.height = size;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      });
      image.addEventListener("error", reject);
      image.src = source;
    });
  }

  function findAvatarCrop(image) {
    const sampleMax = 420;
    const scale = Math.min(1, sampleMax / Math.max(image.naturalWidth, image.naturalHeight));
    const sampleWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const sampleHeight = Math.max(1, Math.round(image.naturalHeight * scale));
    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });

    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    sampleContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);

    const data = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const background = averageCornerColor(data, sampleWidth, sampleHeight);
    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const index = (y * sampleWidth + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        if (isPhotoContent(r, g, b, a, background)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return centerSquareCrop(image.naturalWidth, image.naturalHeight);
    }

    const padding = Math.max(maxX - minX, maxY - minY) * 0.08;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(sampleWidth, maxX + padding);
    maxY = Math.min(sampleHeight, maxY + padding);

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const centerX = (minX + maxX) / 2 / scale;
    const centerY = (minY + maxY) / 2 / scale;
    const contentRatio = contentHeight / Math.max(1, contentWidth);
    const inverseRatio = contentWidth / Math.max(1, contentHeight);

    if (contentRatio > 1.14) {
      const sourceSize = Math.min(contentWidth * 1.08 / scale, image.naturalWidth, image.naturalHeight);
      const topY = Math.max(0, minY / scale - sourceSize * 0.04);
      return squareCropAt(centerX - sourceSize / 2, topY, sourceSize, image.naturalWidth, image.naturalHeight);
    }

    if (inverseRatio > 1.14) {
      const sourceSize = Math.min(contentHeight * 1.08 / scale, image.naturalWidth, image.naturalHeight);
      return squareCropAround(centerX, centerY, sourceSize, image.naturalWidth, image.naturalHeight);
    }

    const sourceSize = Math.min(Math.max(contentWidth, contentHeight) * 1.08 / scale, image.naturalWidth, image.naturalHeight);
    return squareCropAround(centerX, centerY, sourceSize, image.naturalWidth, image.naturalHeight);
  }

  function averageCornerColor(data, width, height) {
    const points = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1]
    ];
    const color = { r: 0, g: 0, b: 0 };

    points.forEach(([x, y]) => {
      const index = (y * width + x) * 4;
      color.r += data[index];
      color.g += data[index + 1];
      color.b += data[index + 2];
    });

    return {
      r: color.r / points.length,
      g: color.g / points.length,
      b: color.b / points.length
    };
  }

  function isPhotoContent(r, g, b, a, background) {
    if (a < 30) return false;
    const distance = Math.hypot(r - background.r, g - background.g, b - background.b);
    const veryLightNeutral = r > 185 && g > 185 && b > 185 && Math.abs(r - g) < 24 && Math.abs(g - b) < 24;
    const saturated = Math.max(r, g, b) - Math.min(r, g, b) > 32;
    const darkEnough = r < 170 || g < 170 || b < 170;

    return distance > 34 && !veryLightNeutral && (saturated || darkEnough);
  }

  function centerSquareCrop(width, height) {
    const size = Math.min(width, height);
    return {
      x: Math.max(0, (width - size) / 2),
      y: Math.max(0, (height - size) / 2),
      size
    };
  }

  function squareCropAround(centerX, centerY, size, width, height) {
    const cropSize = Math.min(size, width, height);
    const maxX = width - cropSize;
    const maxY = height - cropSize;
    return {
      x: clamp(centerX - cropSize / 2, 0, maxX),
      y: clamp(centerY - cropSize / 2, 0, maxY),
      size: cropSize
    };
  }

  function squareCropAt(x, y, size, width, height) {
    const cropSize = Math.min(size, width, height);
    return {
      x: clamp(x, 0, width - cropSize),
      y: clamp(y, 0, height - cropSize),
      size: cropSize
    };
  }

  function renderProfilePhoto() {
    const photo = state.profilePhoto;
    const hasPhoto = Boolean(photo);
    profilePhoto.src = hasPhoto ? photo : "";
    profilePhoto.hidden = !hasPhoto;
    profileButtonPhoto.src = hasPhoto ? photo : "";
    profileButtonPhoto.hidden = !hasPhoto;
    avatarFallback.hidden = hasPhoto;
    profileButton.classList.toggle("has-photo", hasPhoto);
    avatarButton.classList.toggle("has-photo", hasPhoto);
    fitPhotoButton.disabled = !hasPhoto;
  }

  function fitCurrentPhoto() {
    if (!state.profilePhoto) return;
    zoomAvatar(state.profilePhoto, 1.28)
      .then((avatarDataUrl) => {
        state.profilePhoto = avatarDataUrl;
        state.profilePhotoVersion = 5;
        saveState();
        renderProfilePhoto();
      })
      .catch(() => {});
  }

  function zoomAvatar(source, factor) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / factor;
        const sourceX = (image.naturalWidth - sourceSize) / 2;
        const sourceY = (image.naturalHeight - sourceSize) / 2;

        canvas.width = size;
        canvas.height = size;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      });
      image.addEventListener("error", reject);
      image.src = source;
    });
  }

  function normalizeStoredProfilePhoto() {
    if (!state.profilePhoto || state.profilePhotoVersion === 5) return;
    normalizeAvatar(state.profilePhoto)
      .then((avatarDataUrl) => {
        state.profilePhoto = avatarDataUrl;
        state.profilePhotoVersion = 5;
        saveState();
        renderProfilePhoto();
      })
      .catch(() => {});
  }

  function renderDay() {
    const day = days.find((item) => item.key === selectedKey) || days[0];
    const entry = ensureEntry(day.key);
    const status = dayStatus(day, entry);
    selectedWeekday.textContent = weekdayNames[day.date.getDay()];
    selectedDate.textContent = formatDate(day.date);
    loadPill.textContent = status.label;
    loadPill.className = `load-pill ${status.kind}`;
    dayFocus.textContent = day.focus;
    energyRange.value = entry.energy;
    energyValue.textContent = entry.energy;
    dayNotes.value = entry.notes || "";
    taskList.innerHTML = "";

    day.tasks.forEach((task) => {
      const row = document.createElement("div");
      const done = Boolean(entry.tasks[task.id]);
      row.className = `task-row ${done ? "done" : ""}`;
      row.innerHTML = `
        <button class="check-button" type="button" aria-label="Отметить задачу">${done ? "✓" : ""}</button>
        <div>
          <span class="task-title">${task.title}</span>
          <span class="task-meta">${task.meta}</span>
        </div>
      `;
      row.querySelector("button").addEventListener("click", () => {
        entry.tasks[task.id] = !entry.tasks[task.id];
        saveState();
        renderDay();
        renderCalendar();
        renderStats();
      });
      taskList.appendChild(row);
    });
  }

  function renderStats() {
    let habitDone = 0;
    let habitTotal = 0;
    let workDone = 0;
    let workTotal = 0;
    let sportDone = 0;
    let sportTotal = 0;
    let currentStreak = 0;

    days.forEach((day) => {
      const entry = ensureEntry(day.key);
      const required = day.tasks.filter((task) => task.type === "habit");
      if (day.date <= today) {
        const requiredDone = required.every((task) => entry.tasks[task.id]);
        currentStreak = requiredDone ? currentStreak + 1 : 0;
      }

      day.tasks.forEach((task) => {
        if (task.type === "habit") {
          habitTotal += 1;
          if (entry.tasks[task.id]) habitDone += 1;
        }
        if (task.type === "work") {
          workTotal += 1;
          if (entry.tasks[task.id]) workDone += 1;
        }
        if (task.type === "sport") {
          sportTotal += 1;
          if (entry.tasks[task.id]) sportDone += 1;
        }
      });
    });

    habitScore.textContent = `${percent(habitDone, habitTotal)}%`;
    workScore.textContent = `${percent(workDone, workTotal)}%`;
    sportScore.textContent = `${sportDone}/${sportTotal}`;
    const streakText = `${currentStreak} ${dayWord(currentStreak)}`;
    streakScore.textContent = streakText;
    topStreakScore.textContent = streakText;
    streakFlame.className.baseVal = `flame-icon ${streakLevelClass(currentStreak)}`;
  }

  function renderSyncSettings() {
    syncUrlInput.value = state.syncUrl || "";
    syncKeyInput.value = state.syncKey || "";
    syncCodeInput.value = state.syncCode || "";
  }

  function saveSyncSettings() {
    state.syncUrl = cleanUrl(syncUrlInput.value);
    state.syncKey = syncKeyInput.value.trim();
    state.syncCode = syncCodeInput.value.trim();
    saveState();
    setSyncStatus("Настройки сохранены. Теперь можно сохранить прогресс в облако или загрузить его на другом устройстве.", "ok");
  }

  function getSyncSettings() {
    const settings = {
      url: cleanUrl(syncUrlInput.value || state.syncUrl || ""),
      key: (syncKeyInput.value || state.syncKey || "").trim(),
      code: (syncCodeInput.value || state.syncCode || "").trim()
    };

    if (!settings.url || !settings.key || !settings.code) {
      setSyncStatus("Нужны Supabase URL, anon key и один код синхронизации для ноутбука и телефона.", "error");
      return null;
    }

    return settings;
  }

  async function pushCloudState() {
    const settings = getSyncSettings();
    if (!settings) return;

    saveSyncSettings();
    setSyncBusy(true);
    setSyncStatus("Сохраняю прогресс в облако...", "busy");

    try {
      const response = await fetch(`${settings.url}/rest/v1/progress_sync?on_conflict=sync_code`, {
        method: "POST",
        headers: cloudHeaders(settings, { Prefer: "resolution=merge-duplicates" }),
        body: JSON.stringify({
          sync_code: settings.code,
          payload: exportProgressState(),
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error(await response.text());
      setSyncStatus("Готово. Теперь на телефоне введи эти же настройки и нажми «Загрузить».", "ok");
    } catch (error) {
      setSyncStatus("Не получилось сохранить в облако. Проверь таблицу Supabase, URL и anon key.", "error");
    } finally {
      setSyncBusy(false);
    }
  }

  async function pullCloudState() {
    const settings = getSyncSettings();
    if (!settings) return;

    saveSyncSettings();
    setSyncBusy(true);
    setSyncStatus("Загружаю прогресс из облака...", "busy");

    try {
      const response = await fetch(
        `${settings.url}/rest/v1/progress_sync?sync_code=eq.${encodeURIComponent(settings.code)}&select=payload,updated_at`,
        { headers: cloudHeaders(settings) }
      );

      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      if (!rows.length || !rows[0].payload) {
        setSyncStatus("В облаке пока нет прогресса для этого кода. Сначала сохрани его с ноутбука.", "error");
        return;
      }

      applyCloudState(rows[0].payload, settings);
      setSyncStatus("Прогресс загружен. Календарь, профиль и фото обновлены.", "ok");
    } catch (error) {
      setSyncStatus("Не получилось загрузить прогресс. Проверь подключение и настройки Supabase.", "error");
    } finally {
      setSyncBusy(false);
    }
  }

  function exportProgressState() {
    const copy = JSON.parse(JSON.stringify(state));
    delete copy.syncUrl;
    delete copy.syncKey;
    delete copy.syncCode;
    return copy;
  }

  function applyCloudState(payload, settings) {
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, payload, {
      syncUrl: settings.url,
      syncKey: settings.key,
      syncCode: settings.code
    });
    saveState();
    renderCalendar();
    renderStats();
    renderProfilePhoto();
    renderSyncSettings();
    if (activeModal === "day") renderDay();
  }

  function cloudHeaders(settings, extra = {}) {
    const headers = {
      apikey: settings.key,
      "Content-Type": "application/json",
      ...extra
    };

    if (!settings.key.startsWith("sb_publishable_")) {
      headers.Authorization = `Bearer ${settings.key}`;
    }

    return headers;
  }

  function setSyncBusy(isBusy) {
    pullSyncButton.disabled = isBusy;
    pushSyncButton.disabled = isBusy;
    saveSyncSettingsButton.disabled = isBusy;
  }

  function setSyncStatus(message, type) {
    syncStatus.textContent = message;
    syncStatus.className = `sync-status ${type || ""}`.trim();
  }

  function cleanUrl(value) {
    return value.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  }

  function dayWord(count) {
    const lastTwo = count % 100;
    const last = count % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return "дней";
    if (last === 1) return "день";
    if (last >= 2 && last <= 4) return "дня";
    return "дней";
  }

  function streakLevelClass(streak) {
    if (streak >= 14) return "streak-level-4";
    if (streak >= 7) return "streak-level-3";
    if (streak >= 3) return "streak-level-2";
    if (streak >= 1) return "streak-level-1";
    return "streak-level-0";
  }

  function dayStatus(day, entry) {
    const done = day.tasks.filter((task) => entry.tasks[task.id]).length;
    if (done === day.tasks.length) return { kind: "done", label: "Готово" };
    if (done > 0) return { kind: "progress", label: "В процессе" };
    return { kind: "not-started", label: "Не начато" };
  }

  function ensureEntry(key) {
    if (!state[key]) {
      state[key] = { tasks: {}, energy: 5, notes: "" };
    }
    return state[key];
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function formatKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function clampDate(date, min, max) {
    if (date < min) return new Date(min);
    if (date > max) return new Date(max);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function formatDate(date) {
    return `${date.getDate()} ${monthNames[date.getMonth()]}`;
  }

  function mondayIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  function percent(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
