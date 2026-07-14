(function () {
  const planStartDate = new Date(2026, 6, 4);
  const planEndDate = new Date(2026, 7, 4);
  const legacyStorageKey = "month-progress-v1";
  const activeUserStorageKey = "crest-active-user-v1";
  const legacyClaimedStorageKey = "crest-legacy-claimed-v1";
  const bootstrapUserId = localStorage.getItem(activeUserStorageKey);
  const storageKey = bootstrapUserId ? `crest-user-${bootstrapUserId}` : legacyStorageKey;
  const supabaseUrl = "https://bclhwefsswxtqtwzppik.supabase.co";
  const cloudFunctionUrl = "https://bclhwefsswxtqtwzppik.supabase.co/functions/v1/crest-api";
  const cloudPublishableKey = "sb_publishable_CDziEC3GM9o0di7zIqw9vw_PgeCT9oJ";
  const vapidPublicKey = "BA1j44cNJV6QoirknYZOiFPQaLiygwxyVmRbaFCcIm3V5lFmTeM-S1SgctoZXNNR5makhB7ip44OcXjDXNMeRQc";
  const authClient = window.supabase.createClient(supabaseUrl, cloudPublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const weekdayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const calendarMonthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

  const state = loadState();
  let currentSession = null;
  let now = new Date();
  let today = currentDayDate();
  const plannedDays = buildPlannedDays();
  migrateState();
  sealPastDays({ persist: false });
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedKey = formatKey(today);
  let activeModal = null;
  let isEditingDay = false;
  let cloudSaveTimer = null;
  let cloudPullTimer = null;
  let isApplyingCloud = false;
  let isCloudBusy = false;
  let editingTaskIndex = null;
  let calendarTouchStart = null;
  let dateWatchTimer = null;

  const calendarGrid = document.querySelector("#calendarGrid");
  const monthTitle = document.querySelector("#monthTitle");
  const previousMonthButton = document.querySelector("#previousMonth");
  const nextMonthButton = document.querySelector("#nextMonth");
  const todayButton = document.querySelector("#todayButton");
  const dayModal = document.querySelector("#dayModal");
  const dayPanel = dayModal.querySelector(".day-panel");
  const modalBackdrop = document.querySelector("#modalBackdrop");
  const closeDay = document.querySelector("#closeDay");
  const profileModal = document.querySelector("#profileModal");
  const profileBackdrop = document.querySelector("#profileBackdrop");
  const closeProfile = document.querySelector("#closeProfile");
  const profileButton = document.querySelector("#profileButton");
  const profileButtonPhoto = document.querySelector("#profileButtonPhoto");
  const profileTitle = document.querySelector("#profileTitle");
  const avatarButton = document.querySelector("#avatarButton");
  const changePhotoButton = document.querySelector("#changePhotoButton");
  const fitPhotoButton = document.querySelector("#fitPhotoButton");
  const photoInput = document.querySelector("#photoInput");
  const profilePhoto = document.querySelector("#profilePhoto");
  const avatarFallback = document.querySelector("#avatarFallback");
  const selectedWeekday = document.querySelector("#selectedWeekday");
  const selectedDate = document.querySelector("#selectedDate");
  const loadPill = document.querySelector("#loadPill");
  const lockedDayNotice = document.querySelector("#lockedDayNotice");
  const dayFocus = document.querySelector("#dayFocus");
  const taskList = document.querySelector("#taskList");
  const editDayButton = document.querySelector("#editDayButton");
  const addTaskButton = document.querySelector("#addTaskButton");
  const taskModal = document.querySelector("#taskModal");
  const taskModalBackdrop = document.querySelector("#taskModalBackdrop");
  const closeTaskEditorButton = document.querySelector("#closeTaskEditor");
  const taskEditorEyebrow = document.querySelector("#taskEditorEyebrow");
  const taskEditorTitle = document.querySelector("#taskEditorTitle");
  const taskTitleInput = document.querySelector("#taskTitleInput");
  const taskMetaInput = document.querySelector("#taskMetaInput");
  const taskTypeInput = document.querySelector("#taskTypeInput");
  const saveTaskButton = document.querySelector("#saveTaskButton");
  const deleteTaskButton = document.querySelector("#deleteTaskButton");
  const energyRange = document.querySelector("#energyRange");
  const energyValue = document.querySelector("#energyValue");
  const dayNotes = document.querySelector("#dayNotes");
  const habitScore = document.querySelector("#habitScore");
  const workScore = document.querySelector("#workScore");
  const sportScore = document.querySelector("#sportScore");
  const streakScore = document.querySelector("#streakScore");
  const topStreakScore = document.querySelector("#topStreakScore");
  const streakFlame = document.querySelector("#streakFlame");
  const goalBand = document.querySelector("#goalBand");
  const newGoalKicker = document.querySelector("#newGoalKicker");
  const newGoalTitle = document.querySelector("#newGoalTitle");
  const addGoalButton = document.querySelector("#addGoalButton");
  const profileNameInput = document.querySelector("#profileNameInput");
  const saveProfileNameButton = document.querySelector("#saveProfileName");
  const syncNowButton = document.querySelector("#syncNowButton");
  const logoutButton = document.querySelector("#logoutButton");
  const accountEmail = document.querySelector("#accountEmail");
  const syncStatus = document.querySelector("#syncStatus");
  const reminderToggle = document.querySelector("#reminderToggle");
  const morningTimeInput = document.querySelector("#morningTimeInput");
  const eveningTimeInput = document.querySelector("#eveningTimeInput");
  const reminderTimezone = document.querySelector("#reminderTimezone");
  const refreshTimezoneButton = document.querySelector("#refreshTimezoneButton");
  const testNotificationButton = document.querySelector("#testNotificationButton");
  const reminderStatus = document.querySelector("#reminderStatus");
  const themeColor = document.querySelector("#themeColor");
  const themeChoices = document.querySelectorAll("[data-theme-choice]");
  const authScreen = document.querySelector("#authScreen");
  const loginTab = document.querySelector("#loginTab");
  const registerTab = document.querySelector("#registerTab");
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const loginEmail = document.querySelector("#loginEmail");
  const loginPassword = document.querySelector("#loginPassword");
  const registerName = document.querySelector("#registerName");
  const registerEmail = document.querySelector("#registerEmail");
  const registerPassword = document.querySelector("#registerPassword");
  const registerPasswordConfirm = document.querySelector("#registerPasswordConfirm");
  const authStatus = document.querySelector("#authStatus");

  applyTheme(state.theme || "light");
  renderCalendar();
  renderStats();
  renderGoals();
  renderProfilePhoto();
  renderAccount();
  renderReminderSettings();
  normalizeStoredProfilePhoto();
  startDateWatcher();
  openRequestedDay();
  initializeAuth();
  if ("clearAppBadge" in navigator) navigator.clearAppBadge().catch(() => {});

  profileButton.addEventListener("click", openProfile);
  previousMonthButton.addEventListener("click", () => changeMonth(-1));
  nextMonthButton.addEventListener("click", () => changeMonth(1));
  todayButton.addEventListener("click", goToToday);
  calendarGrid.addEventListener("touchstart", handleCalendarTouchStart, { passive: true });
  calendarGrid.addEventListener("touchend", handleCalendarTouchEnd, { passive: true });
  avatarButton.addEventListener("click", () => photoInput.click());
  changePhotoButton.addEventListener("click", () => photoInput.click());
  fitPhotoButton.addEventListener("click", fitCurrentPhoto);
  photoInput.addEventListener("change", handlePhotoChange);
  closeDay.addEventListener("click", closeDayModal);
  modalBackdrop.addEventListener("click", closeDayModal);
  closeProfile.addEventListener("click", closeProfileModal);
  profileBackdrop.addEventListener("click", closeProfileModal);
  editDayButton.addEventListener("click", toggleDayEditor);
  dayFocus.addEventListener("blur", saveDayFocus);
  dayFocus.addEventListener("keydown", handleFocusKeydown);
  addTaskButton.addEventListener("click", openAddTaskEditor);
  taskModalBackdrop.addEventListener("click", closeTaskEditor);
  closeTaskEditorButton.addEventListener("click", closeTaskEditor);
  saveTaskButton.addEventListener("click", saveTaskFromEditor);
  deleteTaskButton.addEventListener("click", deleteTaskFromEditor);
  addGoalButton.addEventListener("click", addGoal);
  saveProfileNameButton.addEventListener("click", saveProfileName);
  syncNowButton.addEventListener("click", () => pullCloudState({ pushIfEmpty: true }));
  logoutButton.addEventListener("click", logoutAccount);
  loginTab.addEventListener("click", () => showAuthMode("login"));
  registerTab.addEventListener("click", () => showAuthMode("register"));
  loginForm.addEventListener("submit", loginAccount);
  registerForm.addEventListener("submit", registerAccount);
  reminderToggle.addEventListener("change", handleReminderToggle);
  morningTimeInput.addEventListener("change", saveReminderSettings);
  eveningTimeInput.addEventListener("change", saveReminderSettings);
  refreshTimezoneButton.addEventListener("click", refreshReminderTimezone);
  testNotificationButton.addEventListener("click", sendTestNotification);
  themeChoices.forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.themeChoice, { save: true }));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (taskModal.classList.contains("is-open")) {
      closeTaskEditor();
      return;
    }
    if (activeModal === "day") closeDayModal();
    if (activeModal === "profile") closeProfileModal();
  });

  energyRange.addEventListener("input", () => {
    if (isDayLocked(selectedKey)) return;
    const entry = ensureEntry(selectedKey);
    entry.energy = Number(energyRange.value);
    entry.updatedAt = new Date().toISOString();
    energyValue.textContent = entry.energy;
    saveState();
  });

  dayNotes.addEventListener("input", () => {
    if (isDayLocked(selectedKey)) return;
    const entry = ensureEntry(selectedKey);
    entry.notes = dayNotes.value;
    entry.updatedAt = new Date().toISOString();
    saveState();
  });

  window.addEventListener("online", handleAppResume);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") handleAppResume();
  });

  async function initializeAuth() {
    const { data, error } = await authClient.auth.getSession();
    if (error) {
      showSignedOut("Не удалось проверить аккаунт. Проверь интернет и попробуй снова.", "error");
    } else if (data.session) {
      activateSession(data.session);
    } else {
      showSignedOut("Войди или создай аккаунт, чтобы открыть свой календарь.");
    }

    authClient.auth.onAuthStateChange((event, session) => {
      currentSession = session;
      if (event === "SIGNED_OUT") {
        showSignedOut("Ты вышел из аккаунта.");
        return;
      }
      if (!session) return;
      if (event === "TOKEN_REFRESHED") {
        renderAccount();
        return;
      }
      setTimeout(() => activateSession(session), 0);
    });
  }

  function activateSession(session) {
    currentSession = session;
    const userId = session.user.id;
    if (bootstrapUserId !== userId) {
      prepareAccountStorage(session.user);
      localStorage.setItem(activeUserStorageKey, userId);
      window.location.reload();
      return;
    }

    if (!state.profileName) {
      state.profileName = accountDisplayName(session.user);
      state.profileUpdatedAt = new Date().toISOString();
      saveState({ skipCloud: true });
    }

    authScreen.hidden = true;
    document.body.classList.add("is-authenticated");
    renderProfilePhoto();
    renderAccount();
    startAutoSync();
    pullCloudState({ auto: true, pushIfEmpty: true }).then(() => refreshNotificationSubscription());
  }

  function prepareAccountStorage(user) {
    const userKey = `crest-user-${user.id}`;
    if (localStorage.getItem(userKey)) return;

    let nextState = {};
    const legacy = readStoredState(legacyStorageKey);
    const legacyOwner = localStorage.getItem(legacyClaimedStorageKey);
    const canClaimLegacy = Boolean(legacy.syncCode) && !legacyOwner;
    if (canClaimLegacy) {
      nextState = legacy;
      localStorage.setItem(legacyClaimedStorageKey, user.id);
    } else {
      nextState.goals = [];
      nextState.goalsUpdatedAt = new Date().toISOString();
    }

    nextState.profileName = accountDisplayName(user);
    nextState.profileUpdatedAt = new Date().toISOString();
    nextState.useStarterTemplate = canClaimLegacy;
    nextState.cloudRevision = canClaimLegacy ? Number(nextState.cloudRevision) || 0 : 0;
    localStorage.setItem(userKey, JSON.stringify(nextState));
  }

  function accountDisplayName(user) {
    const metadataName = String(user?.user_metadata?.display_name || "").trim();
    if (metadataName) return metadataName.slice(0, 40);
    const emailName = String(user?.email || "").split("@")[0].trim();
    return (emailName || "Пользователь").slice(0, 40);
  }

  function showSignedOut(message, type) {
    currentSession = null;
    authScreen.hidden = false;
    document.body.classList.remove("is-authenticated");
    if (cloudPullTimer) clearInterval(cloudPullTimer);
    cloudPullTimer = null;
    renderAccount();
    setAuthStatus(message, type);
  }

  function showAuthMode(mode) {
    const register = mode === "register";
    loginForm.hidden = register;
    registerForm.hidden = !register;
    loginTab.classList.toggle("is-active", !register);
    registerTab.classList.toggle("is-active", register);
    loginTab.setAttribute("aria-selected", String(!register));
    registerTab.setAttribute("aria-selected", String(register));
    setAuthStatus(register ? "Создай личный аккаунт Crest." : "Войди, чтобы продолжить с любого устройства.");
    (register ? registerName : loginEmail).focus();
  }

  async function loginAccount(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthStatus("Входим в аккаунт...");
    const { data, error } = await authClient.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value
    });
    setAuthBusy(false);
    if (error || !data.session) {
      setAuthStatus(authErrorMessage(error), "error");
      return;
    }
    setAuthStatus("Аккаунт открыт. Загружаем календарь...", "ok");
    activateSession(data.session);
  }

  async function registerAccount(event) {
    event.preventDefault();
    const name = registerName.value.trim();
    if (name.length < 2) {
      setAuthStatus("Имя должно содержать хотя бы 2 символа.", "error");
      return;
    }
    if (registerPassword.value !== registerPasswordConfirm.value) {
      setAuthStatus("Пароли не совпадают.", "error");
      return;
    }

    setAuthBusy(true);
    setAuthStatus("Создаём личный аккаунт...");
    const { data, error } = await authClient.auth.signUp({
      email: registerEmail.value.trim(),
      password: registerPassword.value,
      options: {
        data: { display_name: name },
        emailRedirectTo: "https://arman22a.github.io/Crest/"
      }
    });
    setAuthBusy(false);
    if (error) {
      setAuthStatus(authErrorMessage(error), "error");
      return;
    }
    if (!data.session) {
      showAuthMode("login");
      loginEmail.value = registerEmail.value.trim();
      setAuthStatus("Аккаунт создан. Открой письмо от Crest и подтверди email, затем войди.", "ok");
      return;
    }
    setAuthStatus("Аккаунт создан. Переносим твой календарь...", "ok");
    activateSession(data.session);
  }

  async function logoutAccount() {
    logoutButton.disabled = true;
    setSyncStatus("Выходим из аккаунта...", "busy");
    try {
      if (state.notificationEndpoint && currentSession) {
        await cloudRequest("unsubscribe", getSyncSettings({ silent: true }), { endpoint: state.notificationEndpoint });
      }
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }
      await authClient.auth.signOut({ scope: "local" });
    } finally {
      localStorage.removeItem(activeUserStorageKey);
      window.location.reload();
    }
  }

  async function saveProfileName() {
    const name = profileNameInput.value.trim();
    if (name.length < 2) {
      setSyncStatus("Имя должно содержать хотя бы 2 символа.", "error");
      return;
    }
    saveProfileNameButton.disabled = true;
    const { error } = await authClient.auth.updateUser({ data: { display_name: name } });
    saveProfileNameButton.disabled = false;
    if (error) {
      setSyncStatus("Не удалось сохранить имя. Проверь интернет.", "error");
      return;
    }
    state.profileName = name.slice(0, 40);
    state.profileUpdatedAt = new Date().toISOString();
    saveState();
    renderProfilePhoto();
    setSyncStatus("Имя сохранено и будет видно на всех устройствах.", "ok");
  }

  function setAuthBusy(busy) {
    authScreen.querySelectorAll("input, button").forEach((element) => {
      element.disabled = busy;
    });
  }

  function setAuthStatus(message, type) {
    authStatus.textContent = message;
    authStatus.className = `auth-status ${type || ""}`.trim();
  }

  function authErrorMessage(error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("rate limit")) return "Слишком много писем отправлено за короткое время. Подожди около часа и попробуй снова.";
    if (message.includes("invalid login credentials")) return "Неверный email или пароль.";
    if (message.includes("email not confirmed")) return "Сначала подтверди email по ссылке из письма.";
    if (message.includes("already registered") || message.includes("already been registered")) return "Этот email уже зарегистрирован. Перейди во вкладку «Войти».";
    if (message.includes("password")) return "Пароль должен содержать не менее 8 символов.";
    if (message.includes("email")) return "Проверь правильность email.";
    return "Не удалось выполнить действие. Проверь интернет и попробуй снова.";
  }

  function buildPlannedDays() {
    const result = [];
    const current = new Date(planStartDate);
    while (current <= planEndDate) {
      result.push(buildDay(new Date(current)));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  function buildDay(date) {
    const key = formatKey(date);
    if (state.useStarterTemplate === false) {
      return {
        key,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        focus: "Без фокуса",
        tasks: []
      };
    }
    const day = date.getDay();
    const weekIndex = Math.floor((date - planStartDate) / 604800000);
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

  function effectiveDay(day) {
    const locked = state.lockedDays && state.lockedDays[day.key];
    if (locked) {
      return {
        ...day,
        focus: locked.focus || day.focus,
        tasks: Array.isArray(locked.tasks) ? locked.tasks : day.tasks
      };
    }

    return editableDay(day);
  }

  function editableDay(day) {
    const custom = state.dayPlans && state.dayPlans[day.key];
    if (!custom) return day;
    return {
      ...day,
      focus: custom.focus || day.focus,
      tasks: Array.isArray(custom.tasks) ? custom.tasks : day.tasks
    };
  }

  function dayForDate(date) {
    const key = formatKey(date);
    const planned = plannedDays.find((item) => item.key === key);
    if (planned) return planned;
    return {
      key,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      focus: "Без фокуса",
      tasks: []
    };
  }

  function dayForKey(key) {
    const parts = key.split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      return dayForDate(today);
    }
    return dayForDate(new Date(parts[0], parts[1] - 1, parts[2]));
  }

  function ensureDayPlan(key) {
    if (isDayLocked(key)) return effectiveDay(dayForKey(key));
    const day = dayForKey(key);
    state.dayPlans = state.dayPlans || {};
    if (!state.dayPlans[key]) {
      state.dayPlans[key] = {
        focus: day.focus,
        tasks: cloneTasks(day.tasks),
        updatedAt: new Date().toISOString()
      };
    }
    return state.dayPlans[key];
  }

  function cloneTasks(tasks) {
    return tasks.map((task) => ({ ...task }));
  }

  function migrateState() {
    const fallbackUpdatedAt = state.localUpdatedAt || new Date().toISOString();
    state.schemaVersion = 29;
    state.profileName = String(state.profileName || "").trim().slice(0, 40);
    if (typeof state.useStarterTemplate !== "boolean") state.useStarterTemplate = true;
    state.lockedDays = state.lockedDays && typeof state.lockedDays === "object" ? state.lockedDays : {};
    state.dayPlans = state.dayPlans && typeof state.dayPlans === "object" ? state.dayPlans : {};
    state.reminderMorning = validTime(state.reminderMorning) ? state.reminderMorning : "10:00";
    state.reminderEvening = validTime(state.reminderEvening) ? state.reminderEvening : "16:00";
    state.reminderTimezone = state.reminderTimezone || detectedTimezone();
    state.remindersEnabled = Boolean(state.remindersEnabled);
    state.cloudRevision = Number(state.cloudRevision) || 0;

    Object.values(state.dayPlans).forEach((plan) => {
      if (plan && !plan.updatedAt) plan.updatedAt = fallbackUpdatedAt;
    });

    Object.keys(state).forEach((key) => {
      if (!isDateKey(key) || !state[key] || typeof state[key] !== "object") return;
      if (!state[key].updatedAt) state[key].updatedAt = fallbackUpdatedAt;
    });

    delete state.syncUrl;
    delete state.syncKey;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function detectedTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow";
    } catch (error) {
      return "Europe/Moscow";
    }
  }

  function currentDayDate(reference = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: state.reminderTimezone || detectedTimezone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(reference);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
    } catch (error) {
      return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    }
  }

  function isDateKey(key) {
    return /^\d{4}-\d{2}-\d{2}$/.test(key);
  }

  function validTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
  }

  function isDayLocked(key) {
    if (state.lockedDays && state.lockedDays[key]) return true;
    return dayForKey(key).date < today;
  }

  function sealPastDays(options = {}) {
    state.lockedDays = state.lockedDays || {};
    let changed = false;

    trackedDays().forEach((day) => {
      if (day.date >= today || state.lockedDays[day.key]) return;
      const visibleDay = editableDay(day);
      const entry = state[day.key] || { tasks: {}, energy: 5, notes: "" };
      state.lockedDays[day.key] = {
        focus: visibleDay.focus,
        tasks: cloneTasks(visibleDay.tasks),
        entry: JSON.parse(JSON.stringify(entry)),
        lockedAt: new Date().toISOString()
      };
      changed = true;
    });

    if (!changed) return false;
    if (options.persist === false) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } else {
      saveState();
    }
    return true;
  }

  function refreshCurrentDate() {
    now = new Date();
    const nextToday = currentDayDate(now);
    if (formatKey(nextToday) === formatKey(today)) return false;
    today = nextToday;
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    sealPastDays();
    renderCalendar();
    renderStats();
    if (activeModal === "day") renderDay();
    return true;
  }

  function startDateWatcher() {
    clearInterval(dateWatchTimer);
    dateWatchTimer = setInterval(refreshCurrentDate, 60000);
  }

  function handleAppResume() {
    refreshCurrentDate();
    sealPastDays();
    pullCloudState({ auto: true });
    refreshNotificationSubscription();
  }

  function openRequestedDay() {
    const requested = new URLSearchParams(window.location.search).get("date");
    if (!requested || !isDateKey(requested)) return;
    const requestedDay = dayForKey(requested);
    visibleMonth = new Date(requestedDay.date.getFullYear(), requestedDay.date.getMonth(), 1);
    renderCalendar();
    openDay(requested);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function defaultGoals() {
    return [
      { id: "sport", kicker: "Спорт", title: "3 раза в неделю" },
      { id: "english", kicker: "Английский", title: "15 минут в день" },
      { id: "design", kicker: "Веб-дизайн", title: "1 час в день" },
      { id: "product", kicker: "Продукт", title: "первые клиенты" },
      { id: "mvp", kicker: "MVP", title: "чат-бот для вуза" }
    ];
  }

  function goals() {
    if (!Array.isArray(state.goals)) {
      state.goals = state.useStarterTemplate === false ? [] : defaultGoals();
    }
    return state.goals;
  }

  function renderCalendar() {
    calendarGrid.innerHTML = "";
    monthTitle.textContent = `${calendarMonthNames[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;
    const monthDays = buildVisibleMonth();
    const firstOffset = mondayIndex(monthDays[0].date);
    for (let i = 0; i < firstOffset; i += 1) {
      const spacer = document.createElement("div");
      spacer.className = "day-cell is-empty";
      calendarGrid.appendChild(spacer);
    }

    monthDays.forEach((day) => {
      const entry = readEntry(day.key);
      const button = document.createElement("button");
      const visibleDay = effectiveDay(day);
      const status = dayStatus(visibleDay, entry);
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

    const renderedCells = firstOffset + monthDays.length;
    const trailingCells = (7 - (renderedCells % 7)) % 7;
    for (let i = 0; i < trailingCells; i += 1) {
      const spacer = document.createElement("div");
      spacer.className = "day-cell is-empty";
      calendarGrid.appendChild(spacer);
    }

    calendarGrid.classList.remove("calendar-enter");
    void calendarGrid.offsetWidth;
    calendarGrid.classList.add("calendar-enter");
  }

  function buildVisibleMonth() {
    const result = [];
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
      result.push(dayForDate(new Date(year, month, dayNumber)));
    }
    return result;
  }

  function changeMonth(offset) {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    renderCalendar();
  }

  function goToToday() {
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
  }

  function handleCalendarTouchStart(event) {
    const touch = event.changedTouches[0];
    calendarTouchStart = { x: touch.clientX, y: touch.clientY };
  }

  function handleCalendarTouchEnd(event) {
    if (!calendarTouchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - calendarTouchStart.x;
    const deltaY = touch.clientY - calendarTouchStart.y;
    calendarTouchStart = null;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    changeMonth(deltaX < 0 ? 1 : -1);
  }

  function openDay(key) {
    selectedKey = key;
    activeModal = "day";
    isEditingDay = false;
    renderDay();
    dayModal.classList.add("is-open");
    dayModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    closeDay.focus();
  }

  function closeDayModal() {
    closeTaskEditor();
    activeModal = null;
    dayModal.classList.remove("is-open");
    dayModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function openProfile() {
    activeModal = "profile";
    renderStats();
    renderGoals();
    renderProfilePhoto();
    renderAccount();
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
          state.profileUpdatedAt = new Date().toISOString();
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
    const name = state.profileName || (currentSession ? accountDisplayName(currentSession.user) : "Пользователь");
    profileTitle.textContent = name;
    profileNameInput.value = name;
    avatarFallback.textContent = name.trim().charAt(0).toUpperCase() || "C";
    profilePhoto.src = hasPhoto ? photo : "";
    profilePhoto.hidden = !hasPhoto;
    profileButtonPhoto.src = hasPhoto ? photo : "";
    profileButtonPhoto.hidden = !hasPhoto;
    avatarFallback.hidden = hasPhoto;
    profileButton.classList.toggle("has-photo", hasPhoto);
    avatarButton.classList.toggle("has-photo", hasPhoto);
    fitPhotoButton.disabled = !hasPhoto;
  }

  function applyTheme(theme, options = {}) {
    const selectedTheme = theme === "knight" ? "knight" : "light";
    document.documentElement.dataset.theme = selectedTheme;
    themeColor.setAttribute("content", selectedTheme === "knight" ? "#050a12" : "#f7f8f3");

    themeChoices.forEach((button) => {
      const isSelected = button.dataset.themeChoice === selectedTheme;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });

    if (options.save) {
      state.theme = selectedTheme;
      state.themeUpdatedAt = new Date().toISOString();
      saveState();
    }
  }

  function fitCurrentPhoto() {
    if (!state.profilePhoto) return;
    zoomAvatar(state.profilePhoto, 1.28)
      .then((avatarDataUrl) => {
        state.profilePhoto = avatarDataUrl;
        state.profilePhotoVersion = 5;
        state.profileUpdatedAt = new Date().toISOString();
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
        state.profileUpdatedAt = new Date().toISOString();
        saveState();
        renderProfilePhoto();
      })
      .catch(() => {});
  }

  function renderDay() {
    const sourceDay = dayForKey(selectedKey);
    const day = effectiveDay(sourceDay);
    const locked = isDayLocked(sourceDay.key);
    const entry = locked ? readEntry(sourceDay.key) : ensureEntry(sourceDay.key);
    const status = dayStatus(day, entry);
    selectedWeekday.textContent = weekdayNames[sourceDay.date.getDay()];
    selectedDate.textContent = formatDate(sourceDay.date);
    loadPill.textContent = status.label;
    loadPill.className = `load-pill ${status.kind}`;
    dayFocus.textContent = day.focus;
    editDayButton.textContent = isEditingDay ? "Готово" : "Изменить";
    editDayButton.hidden = locked;
    lockedDayNotice.hidden = !locked;
    dayPanel.classList.toggle("is-locked", locked);
    dayFocus.contentEditable = isEditingDay && !locked ? "true" : "false";
    dayFocus.classList.toggle("is-editable", isEditingDay && !locked);
    dayFocus.setAttribute("aria-label", isEditingDay && !locked ? "Изменить фокус дня" : "Фокус дня");
    addTaskButton.hidden = !isEditingDay || locked;
    energyRange.value = entry.energy;
    energyRange.disabled = locked;
    energyValue.textContent = entry.energy;
    dayNotes.value = entry.notes || "";
    dayNotes.readOnly = locked;
    taskList.innerHTML = "";

    day.tasks.forEach((task) => {
      const row = document.createElement("div");
      const done = Boolean(entry.tasks[task.id]);
      row.className = `task-row ${done ? "done" : ""} ${isEditingDay && !locked ? "is-editable" : ""}`;
      row.innerHTML = `
        <button class="check-button" type="button" aria-label="Отметить задачу" ${isEditingDay || locked ? "disabled" : ""}>${done ? "✓" : ""}</button>
        <button class="task-content-button" type="button" ${isEditingDay && !locked ? "" : "disabled"} aria-label="Изменить задачу ${escapeAttribute(task.title)}">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="task-meta">${escapeHtml(task.meta)}</span>
        </button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        if (locked) return;
        entry.tasks[task.id] = !entry.tasks[task.id];
        entry.updatedAt = new Date().toISOString();
        saveState();
        renderDay();
        renderCalendar();
        renderStats();
      });
      row.querySelector(".task-content-button").addEventListener("click", () => openTaskEditor(day.tasks.indexOf(task)));
      taskList.appendChild(row);
    });
  }

  function toggleDayEditor() {
    if (isDayLocked(selectedKey)) return;
    isEditingDay = !isEditingDay;
    if (isEditingDay) ensureDayPlan(selectedKey);
    if (!isEditingDay) closeTaskEditor();
    renderDay();
  }

  function saveDayFocus() {
    if (!isEditingDay || isDayLocked(selectedKey)) return;
    const plan = ensureDayPlan(selectedKey);
    plan.focus = dayFocus.textContent.trim() || "Без фокуса";
    plan.updatedAt = new Date().toISOString();
    saveState();
    renderCalendar();
  }

  function handleFocusKeydown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    dayFocus.blur();
  }

  function openTaskEditor(index) {
    if (isDayLocked(selectedKey)) return;
    const plan = ensureDayPlan(selectedKey);
    const task = plan.tasks[index];
    if (!task) return;
    editingTaskIndex = index;
    taskEditorEyebrow.textContent = "Задача";
    taskEditorTitle.textContent = "Изменить задачу";
    taskTitleInput.value = task.title;
    taskMetaInput.value = task.meta || "";
    taskTypeInput.value = task.type || "habit";
    saveTaskButton.textContent = "Сохранить изменения";
    deleteTaskButton.hidden = false;
    showTaskEditor();
  }

  function openAddTaskEditor() {
    if (isDayLocked(selectedKey)) return;
    editingTaskIndex = null;
    taskEditorEyebrow.textContent = "Новая задача";
    taskEditorTitle.textContent = "Добавить задачу";
    taskTitleInput.value = "";
    taskMetaInput.value = "";
    taskTypeInput.value = "habit";
    saveTaskButton.textContent = "Добавить задачу";
    deleteTaskButton.hidden = true;
    showTaskEditor();
  }

  function showTaskEditor() {
    taskModal.classList.add("is-open");
    taskModal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => taskTitleInput.focus());
  }

  function closeTaskEditor() {
    taskModal.classList.remove("is-open");
    taskModal.setAttribute("aria-hidden", "true");
    editingTaskIndex = null;
  }

  function saveTaskFromEditor() {
    if (isDayLocked(selectedKey)) return;
    const title = taskTitleInput.value.trim();
    if (!title) {
      taskTitleInput.focus();
      return;
    }

    const plan = ensureDayPlan(selectedKey);
    if (editingTaskIndex === null) {
      plan.tasks.push({
        id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        meta: taskMetaInput.value.trim(),
        type: taskTypeInput.value
      });
    } else if (plan.tasks[editingTaskIndex]) {
      plan.tasks[editingTaskIndex].title = title;
      plan.tasks[editingTaskIndex].meta = taskMetaInput.value.trim();
      plan.tasks[editingTaskIndex].type = taskTypeInput.value;
    }

    plan.updatedAt = new Date().toISOString();

    saveState();
    closeTaskEditor();
    renderDay();
    renderCalendar();
    renderStats();
  }

  function deleteTaskFromEditor() {
    if (editingTaskIndex === null || isDayLocked(selectedKey)) return;
    const plan = ensureDayPlan(selectedKey);
    const removed = plan.tasks[editingTaskIndex];
    plan.tasks.splice(editingTaskIndex, 1);
    if (removed) {
      const entry = ensureEntry(selectedKey);
      delete entry.tasks[removed.id];
      entry.updatedAt = new Date().toISOString();
    }
    plan.updatedAt = new Date().toISOString();
    saveState();
    closeTaskEditor();
    renderDay();
    renderCalendar();
    renderStats();
  }

  function renderStats() {
    let habitDone = 0;
    let habitTotal = 0;
    let workDone = 0;
    let workTotal = 0;
    let sportDone = 0;
    let sportTotal = 0;
    let currentStreak = 0;

    trackedDays().forEach((day) => {
      const visibleDay = effectiveDay(day);
      const entry = readEntry(day.key);
      const required = visibleDay.tasks.filter((task) => task.type === "habit");
      if (day.date < today) {
        const requiredDone = required.length > 0 && required.every((task) => entry.tasks[task.id]);
        currentStreak = requiredDone ? currentStreak + 1 : 0;
      } else if (formatKey(day.date) === formatKey(today)) {
        const requiredDone = required.length > 0 && required.every((task) => entry.tasks[task.id]);
        if (requiredDone) currentStreak += 1;
      }

      visibleDay.tasks.forEach((task) => {
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

  function trackedDays() {
    const result = new Map(plannedDays.map((day) => [day.key, day]));
    Object.keys(state.dayPlans || {}).forEach((key) => {
      result.set(key, dayForKey(key));
    });
    Object.keys(state).filter(isDateKey).forEach((key) => {
      result.set(key, dayForKey(key));
    });
    Object.keys(state.lockedDays || {}).forEach((key) => {
      result.set(key, dayForKey(key));
    });
    return Array.from(result.values()).sort((left, right) => left.date - right.date);
  }

  function renderGoals() {
    goalBand.innerHTML = "";

    goals().forEach((goal, index) => {
      const item = document.createElement("div");
      item.className = "goal-item editable-goal-item";
      item.innerHTML = `
        <input class="goal-kicker-input" type="text" value="${escapeAttribute(goal.kicker)}" aria-label="Категория цели">
        <input class="goal-title-input" type="text" value="${escapeAttribute(goal.title)}" aria-label="Текст цели">
        <button class="icon-button remove-button" type="button" aria-label="Удалить цель" title="Удалить">×</button>
      `;

      const kickerInput = item.querySelector(".goal-kicker-input");
      const titleInput = item.querySelector(".goal-title-input");
      const removeButton = item.querySelector(".remove-button");

      kickerInput.addEventListener("input", () => updateGoal(index, "kicker", kickerInput.value));
      titleInput.addEventListener("input", () => updateGoal(index, "title", titleInput.value));
      removeButton.addEventListener("click", () => removeGoal(index));
      goalBand.appendChild(item);
    });
  }

  function updateGoal(index, field, value) {
    const list = goals();
    if (!list[index]) return;
    list[index][field] = value;
    state.goalsUpdatedAt = new Date().toISOString();
    saveState();
  }

  function addGoal() {
    const kicker = newGoalKicker.value.trim();
    const title = newGoalTitle.value.trim();
    if (!kicker || !title) return;

    goals().push({
      id: `goal-${Date.now()}`,
      kicker,
      title
    });

    newGoalKicker.value = "";
    newGoalTitle.value = "";
    state.goalsUpdatedAt = new Date().toISOString();
    saveState();
    renderGoals();
  }

  function removeGoal(index) {
    goals().splice(index, 1);
    state.goalsUpdatedAt = new Date().toISOString();
    saveState();
    renderGoals();
  }

  function renderAccount() {
    const user = currentSession?.user;
    accountEmail.textContent = user?.email || "-";
    profileNameInput.value = state.profileName || (user ? accountDisplayName(user) : "");
    syncNowButton.disabled = !user || isCloudBusy;
    logoutButton.disabled = !user;
    saveProfileNameButton.disabled = !user;
    if (user && !isCloudBusy) setSyncStatus("Аккаунт подключён. Изменения синхронизируются автоматически.", "ok");
  }

  function getSyncSettings(options = {}) {
    if (!currentSession?.access_token) {
      if (!options.silent) {
        setSyncStatus("Сначала войди в аккаунт Crest.", "error");
      }
      return null;
    }
    return { userId: currentSession.user.id, accessToken: currentSession.access_token };
  }

  async function pushCloudState(options = {}) {
    if (isCloudBusy && options.auto) return;
    const settings = getSyncSettings({ silent: options.auto });
    if (!settings) return;

    isCloudBusy = true;
    setSyncBusy(true);
    if (!options.auto) setSyncStatus("Сохраняю прогресс в облако...", "busy");
    cloudSaveTimer = null;

    try {
      const result = await cloudRequest("push", settings, {
        payload: exportProgressState(),
        baseRevision: state.cloudRevision || 0,
        reminderDays: buildReminderDays(),
        legacyCode: state.syncCode || undefined
      });
      applyCloudState(result.payload, result.updatedAt, result.revision);
      clearLegacyCloudPassword();
      if (!options.auto) {
        setSyncStatus("Готово. Аккаунт синхронизирован.", "ok");
      } else {
        setSyncStatus("Сохранено в облако.", "ok");
      }
      return true;
    } catch (error) {
      if (!options.auto) {
        setSyncStatus("Не получилось сохранить изменения. Проверь интернет.", "error");
      }
      return false;
    } finally {
      isCloudBusy = false;
      setSyncBusy(false);
    }
  }

  async function pullCloudState(options = {}) {
    if (isCloudBusy && options.auto) return;
    if (options.auto && cloudSaveTimer) return;
    const settings = getSyncSettings({ silent: options.auto });
    if (!settings) return;

    isCloudBusy = true;
    setSyncBusy(true);
    if (!options.auto) setSyncStatus("Загружаю прогресс из облака...", "busy");

    try {
      const result = await cloudRequest("pull", settings);
      if (!result.exists && options.pushIfEmpty) {
        isCloudBusy = false;
        setSyncBusy(false);
        return await pushCloudState({ auto: true });
      }
      if (result.exists && (!state.cloudRevision || result.revision > state.cloudRevision)) {
        applyCloudState(result.payload, result.updatedAt, result.revision);
        setSyncStatus(options.auto ? "Подтянул свежие изменения из облака." : "Прогресс загружен. Календарь, профиль и фото обновлены.", "ok");
      } else if (!options.auto) {
        setSyncStatus("У тебя уже свежая версия прогресса.", "ok");
      }
      return true;
    } catch (error) {
      if (!options.auto) {
        setSyncStatus("Не получилось загрузить прогресс. Проверь интернет и повтори.", "error");
      }
      return false;
    } finally {
      isCloudBusy = false;
      setSyncBusy(false);
    }
  }

  function exportProgressState() {
    const copy = JSON.parse(JSON.stringify(state));
    delete copy.syncCode;
    delete copy.cloudUpdatedAt;
    delete copy.cloudRevision;
    delete copy.remindersEnabled;
    delete copy.notificationEndpoint;
    return copy;
  }

  function applyCloudState(payload, cloudUpdatedAt, cloudRevision) {
    const localDevice = {
      remindersEnabled: state.remindersEnabled,
      notificationEndpoint: state.notificationEndpoint
    };
    isApplyingCloud = true;
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, payload, {
      cloudUpdatedAt,
      cloudRevision,
      remindersEnabled: localDevice.remindersEnabled,
      notificationEndpoint: localDevice.notificationEndpoint
    });
    migrateState();
    today = currentDayDate();
    sealPastDays({ persist: false });
    saveState({ skipCloud: true });
    isApplyingCloud = false;
    renderCalendar();
    renderStats();
    renderGoals();
    renderProfilePhoto();
    renderAccount();
    renderReminderSettings();
    applyTheme(state.theme || "light");
    if (activeModal === "day") renderDay();
  }

  function startAutoSync() {
    if (cloudPullTimer) {
      clearInterval(cloudPullTimer);
      cloudPullTimer = null;
    }

    if (!getSyncSettings({ silent: true })) return;

    cloudPullTimer = setInterval(() => {
      pullCloudState({ auto: true });
    }, 20000);
  }

  function scheduleCloudSave() {
    if (!getSyncSettings({ silent: true }) || isApplyingCloud) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      pushCloudState({ auto: true });
    }, 900);
  }

  async function cloudRequest(action, settings, data = {}) {
    const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
    const session = sessionData?.session;
    if (sessionError || !session) {
      const authError = new Error("Authentication required");
      authError.code = "AUTH_REQUIRED";
      throw authError;
    }
    currentSession = session;
    const response = await fetch(cloudFunctionUrl, {
      method: "POST",
      headers: {
        apikey: cloudPublishableKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...data })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || "Cloud request failed");
      error.code = result.code || "CLOUD_ERROR";
      throw error;
    }
    return result;
  }

  function setSyncBusy(isBusy) {
    syncNowButton.disabled = isBusy || !currentSession;
    saveProfileNameButton.disabled = isBusy || !currentSession;
  }

  function setSyncStatus(message, type) {
    syncStatus.textContent = message;
    syncStatus.className = `sync-status ${type || ""}`.trim();
  }

  function clearLegacyCloudPassword() {
    if (!state.syncCode) return;
    delete state.syncCode;
    saveState({ skipCloud: true });
    const legacy = readStoredState(legacyStorageKey);
    if (legacy.syncCode) {
      delete legacy.syncCode;
      localStorage.setItem(legacyStorageKey, JSON.stringify(legacy));
    }
  }

  function buildReminderDays() {
    const result = {};
    for (let offset = 0; offset <= 45; offset += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      const day = effectiveDay(dayForDate(date));
      const entry = readEntry(day.key);
      const incomplete = day.tasks
        .filter((task) => !entry.tasks[task.id])
        .map((task) => ({ id: task.id, title: task.title }));
      result[day.key] = { total: day.tasks.length, incomplete };
    }
    return result;
  }

  function renderReminderSettings() {
    reminderToggle.checked = Boolean(state.remindersEnabled);
    morningTimeInput.value = state.reminderMorning || "10:00";
    eveningTimeInput.value = state.reminderEvening || "16:00";
    reminderTimezone.textContent = state.reminderTimezone || detectedTimezone();
    const supported = pushSupported();
    reminderToggle.disabled = !supported;
    morningTimeInput.disabled = !supported;
    eveningTimeInput.disabled = !supported;
    testNotificationButton.disabled = !supported || !state.remindersEnabled;
    if (!supported) {
      setReminderStatus("Системные уведомления не поддерживаются этим режимом браузера.", "error");
    }
  }

  function pushSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  async function handleReminderToggle() {
    if (reminderToggle.checked) {
      await enableReminders();
    } else {
      await disableReminders();
    }
  }

  async function enableReminders() {
    const settings = getSyncSettings({ silent: true });
    if (!settings) {
      reminderToggle.checked = false;
      setReminderStatus("Сначала войди в аккаунт Crest.", "error");
      return;
    }
    if (!pushSupported()) {
      reminderToggle.checked = false;
      setReminderStatus("На iPhone открой Crest с экрана Домой, затем попробуй снова.", "error");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        reminderToggle.checked = false;
        state.remindersEnabled = false;
        saveState({ skipCloud: true });
        setReminderStatus("Разрешение не выдано. Его можно изменить в настройках уведомлений устройства.", "error");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      state.remindersEnabled = true;
      state.notificationEndpoint = subscription.endpoint;
      saveReminderValues();
      await registerNotificationSubscription(subscription, settings);
      renderReminderSettings();
      setReminderStatus("Уведомления включены на этом устройстве.", "ok");
    } catch (error) {
      reminderToggle.checked = false;
      state.remindersEnabled = false;
      saveState({ skipCloud: true });
      setReminderStatus("Не получилось включить уведомления. Проверь системное разрешение.", "error");
    }
  }

  async function disableReminders() {
    state.remindersEnabled = false;
    saveState({ skipCloud: true });
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const settings = getSyncSettings({ silent: true });
      if (subscription && settings) {
        await cloudRequest("unsubscribe", settings, { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
    } catch (error) {
      // The local setting still stays disabled if the network is temporarily unavailable.
    }
    delete state.notificationEndpoint;
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderReminderSettings();
    setReminderStatus("Уведомления выключены на этом устройстве.", "");
  }

  function saveReminderValues() {
    state.reminderMorning = validTime(morningTimeInput.value) ? morningTimeInput.value : "10:00";
    state.reminderEvening = validTime(eveningTimeInput.value) ? eveningTimeInput.value : "16:00";
    state.reminderTimezone = state.reminderTimezone || detectedTimezone();
    state.reminderUpdatedAt = new Date().toISOString();
    saveState();
  }

  async function saveReminderSettings() {
    saveReminderValues();
    renderReminderSettings();
    if (!state.remindersEnabled) return;
    await refreshNotificationSubscription({ showStatus: true });
  }

  async function refreshReminderTimezone() {
    state.reminderTimezone = detectedTimezone();
    today = currentDayDate();
    sealPastDays();
    saveReminderValues();
    renderReminderSettings();
    renderCalendar();
    renderStats();
    if (state.remindersEnabled) await refreshNotificationSubscription({ showStatus: true });
  }

  async function refreshNotificationSubscription(options = {}) {
    if (!state.remindersEnabled || !pushSupported() || Notification.permission !== "granted") return;
    const settings = getSyncSettings({ silent: true });
    if (!settings) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        if (options.showStatus) setReminderStatus("Подписка устройства потеряна. Выключи и снова включи напоминания.", "error");
        return;
      }
      state.notificationEndpoint = subscription.endpoint;
      localStorage.setItem(storageKey, JSON.stringify(state));
      await registerNotificationSubscription(subscription, settings);
      if (options.showStatus) setReminderStatus("Настройки напоминаний обновлены.", "ok");
    } catch (error) {
      if (options.showStatus) setReminderStatus("Не получилось обновить подписку. Проверь интернет.", "error");
    }
  }

  async function registerNotificationSubscription(subscription, settings) {
    await cloudRequest("subscribe", settings, {
      subscription: subscription.toJSON(),
      deviceName: deviceName(),
      timezone: state.reminderTimezone,
      morningTime: state.reminderMorning,
      eveningTime: state.reminderEvening,
      reminderDays: buildReminderDays()
    });
  }

  async function sendTestNotification() {
    const settings = getSyncSettings({ silent: true });
    if (!settings || !state.remindersEnabled || !state.notificationEndpoint) {
      setReminderStatus("Сначала включи уведомления на этом устройстве.", "error");
      return;
    }
    testNotificationButton.disabled = true;
    setReminderStatus("Отправляю тестовое уведомление...", "");
    try {
      await cloudRequest("test_notification", settings, { endpoint: state.notificationEndpoint });
      setReminderStatus("Тест отправлен. Уведомление должно появиться через несколько секунд.", "ok");
    } catch (error) {
      setReminderStatus("Тест не отправился. Проверь подключение и разрешение.", "error");
    } finally {
      testNotificationButton.disabled = false;
    }
  }

  function setReminderStatus(message, type) {
    reminderStatus.textContent = message;
    reminderStatus.className = `reminder-status ${type || ""}`.trim();
  }

  function deviceName() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "iPhone" : "Ноутбук";
  }

  function urlBase64ToUint8Array(value) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
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
    if (day.tasks.length > 0 && done === day.tasks.length) return { kind: "done", label: "Готово" };
    if (done > 0) return { kind: "progress", label: "В процессе" };
    return { kind: "not-started", label: "Не начато" };
  }

  function escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeHtml(value) {
    return escapeAttribute(value).replace(/'/g, "&#39;");
  }

  function ensureEntry(key) {
    const locked = state.lockedDays && state.lockedDays[key];
    if (locked && locked.entry) return locked.entry;
    if (!state[key]) {
      state[key] = { tasks: {}, energy: 5, notes: "", updatedAt: new Date().toISOString() };
    }
    return state[key];
  }

  function readEntry(key) {
    const locked = state.lockedDays && state.lockedDays[key];
    if (locked && locked.entry) return locked.entry;
    return state[key] || { tasks: {}, energy: 5, notes: "" };
  }

  function loadState() {
    return readStoredState(storageKey);
  }

  function readStoredState(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveState(options = {}) {
    state.localUpdatedAt = new Date().toISOString();
    localStorage.setItem(storageKey, JSON.stringify(state));
    if (!options.skipCloud) scheduleCloudSave();
  }

  function formatKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
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
      navigator.serviceWorker.register("sw.js?v=29").then((registration) => registration.update()).catch(() => {});
    });
  }
})();
