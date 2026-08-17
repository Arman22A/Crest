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
  const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).has("preview");
  const authClient = window.supabase.createClient(supabaseUrl, cloudPublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const weekdayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const calendarMonthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const contentStages = [
    { id: "idea", name: "Идея", description: "Мысль сохранена" },
    { id: "preparation", name: "Подготовка", description: "Хук и сценарий" },
    { id: "production", name: "Производство", description: "Съёмка и монтаж" },
    { id: "published", name: "Опубликовано", description: "Ролик вышел" }
  ];

  const state = loadState();
  let currentSession = null;
  let now = new Date();
  let today = currentDayDate();
  const plannedDays = buildPlannedDays();
  migrateState();
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
  let notesCloudSaveTimer = null;
  let isNotesComposing = false;
  let activeProfilePage = "overview";
  let editingCalendarId = null;
  let selectedCalendarIcon = "calendar";
  let selectedCalendarColor = "#286fb4";
  let activeContentView = "work";
  let activeMobileContentStage = null;
  let editingContentId = null;
  let editingContentTemplateId = null;

  const calendarGrid = document.querySelector("#calendarGrid");
  const calendarTabs = document.querySelector("#calendarTabs");
  const addCalendarButton = document.querySelector("#addCalendarButton");
  const settingsAddCalendarButton = document.querySelector("#settingsAddCalendarButton");
  const activeCalendarIcon = document.querySelector("#activeCalendarIcon");
  const activeCalendarLabel = document.querySelector("#activeCalendarLabel");
  const activeCalendarTitle = document.querySelector("#activeCalendarTitle");
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
  const selectedDayNumber = document.querySelector("#selectedDayNumber");
  const selectedCalendarName = document.querySelector("#selectedCalendarName");
  const loadPill = document.querySelector("#loadPill");
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
  const addTaskTypeButton = document.querySelector("#addTaskTypeButton");
  const newTaskTypeEditor = document.querySelector("#newTaskTypeEditor");
  const newTaskTypeName = document.querySelector("#newTaskTypeName");
  const saveTaskTypeButton = document.querySelector("#saveTaskTypeButton");
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
  const profileCalendarSummary = document.querySelector("#profileCalendarSummary");
  const calendarSettingsList = document.querySelector("#calendarSettingsList");
  const taskTypeSettingsList = document.querySelector("#taskTypeSettingsList");
  const profileTabs = document.querySelectorAll("[data-profile-tab]");
  const profilePages = document.querySelectorAll("[data-profile-page]");
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
  const calendarEditorModal = document.querySelector("#calendarEditorModal");
  const calendarEditorBackdrop = document.querySelector("#calendarEditorBackdrop");
  const closeCalendarEditorButton = document.querySelector("#closeCalendarEditor");
  const calendarEditorTitle = document.querySelector("#calendarEditorTitle");
  const calendarNameInput = document.querySelector("#calendarNameInput");
  const calendarIconOptions = document.querySelector("#calendarIconOptions");
  const calendarColorOptions = document.querySelector("#calendarColorOptions");
  const saveCalendarButton = document.querySelector("#saveCalendarButton");
  const deleteCalendarButton = document.querySelector("#deleteCalendarButton");
  const planningSpace = document.querySelector("#planningSpace");
  const contentSpace = document.querySelector("#contentSpace");
  const planningSpaceButton = document.querySelector("#planningSpaceButton");
  const contentSpaceButton = document.querySelector("#contentSpaceButton");
  const contentNavButtons = document.querySelectorAll("[data-content-view]");
  const contentPages = document.querySelectorAll("[data-content-page]");
  const contentWorkspaceTitle = document.querySelector("#contentWorkspaceTitle");
  const contentSearchButton = document.querySelector("#contentSearchButton");
  const contentSearchBar = document.querySelector("#contentSearchBar");
  const contentWorkSearch = document.querySelector("#contentWorkSearch");
  const contentWorkMetrics = document.querySelector("#contentWorkMetrics");
  const contentStageTabs = document.querySelector("#contentStageTabs");
  const contentKanban = document.querySelector("#contentKanban");
  const addContentButton = document.querySelector("#addContentButton");
  const addIdeaButton = document.querySelector("#addIdeaButton");
  const addPlannedContentButton = document.querySelector("#addPlannedContentButton");
  const contentIdeasSearch = document.querySelector("#contentIdeasSearch");
  const contentStatusFilter = document.querySelector("#contentStatusFilter");
  const contentPlatformFilter = document.querySelector("#contentPlatformFilter");
  const contentIdeasList = document.querySelector("#contentIdeasList");
  const contentPlanSummary = document.querySelector("#contentPlanSummary");
  const contentPlanList = document.querySelector("#contentPlanList");
  const contentAnalyticsPeriod = document.querySelector("#contentAnalyticsPeriod");
  const contentAnalyticsMetrics = document.querySelector("#contentAnalyticsMetrics");
  const contentAnalyticsChart = document.querySelector("#contentAnalyticsChart");
  const contentInsights = document.querySelector("#contentInsights");
  const contentTopList = document.querySelector("#contentTopList");
  const contentTemplateList = document.querySelector("#contentTemplateList");
  const addContentTemplateButton = document.querySelector("#addContentTemplateButton");
  const contentSpaceNameInput = document.querySelector("#contentSpaceNameInput");
  const saveContentSpaceNameButton = document.querySelector("#saveContentSpaceName");
  const contentPlatformSettings = document.querySelector("#contentPlatformSettings");
  const newContentPlatform = document.querySelector("#newContentPlatform");
  const addContentPlatformButton = document.querySelector("#addContentPlatform");
  const contentPillarSettings = document.querySelector("#contentPillarSettings");
  const newContentPillar = document.querySelector("#newContentPillar");
  const addContentPillarButton = document.querySelector("#addContentPillar");
  const resetContentSpaceButton = document.querySelector("#resetContentSpace");
  const contentEditorModal = document.querySelector("#contentEditorModal");
  const contentEditorPanel = contentEditorModal.querySelector(".content-editor-panel");
  const contentEditorBackdrop = document.querySelector("#contentEditorBackdrop");
  const closeContentEditorButton = document.querySelector("#closeContentEditor");
  const contentEditorTitle = document.querySelector("#contentEditorTitle");
  const contentTitleInput = document.querySelector("#contentTitleInput");
  const contentStageInput = document.querySelector("#contentStageInput");
  const contentStageOptions = document.querySelector("#contentStageOptions");
  const contentPlatformInput = document.querySelector("#contentPlatformInput");
  const contentPlatformOptions = document.querySelector("#contentPlatformOptions");
  const contentFormatInput = document.querySelector("#contentFormatInput");
  const contentFormatOptions = document.querySelector("#contentFormatOptions");
  const contentPillarInput = document.querySelector("#contentPillarInput");
  const contentPillarOptions = document.querySelector("#contentPillarOptions");
  const contentHookInput = document.querySelector("#contentHookInput");
  const contentScriptInput = document.querySelector("#contentScriptInput");
  const contentNextActionInput = document.querySelector("#contentNextActionInput");
  const contentPublishDateInput = document.querySelector("#contentPublishDateInput");
  const contentPublishTimeInput = document.querySelector("#contentPublishTimeInput");
  const contentViewsInput = document.querySelector("#contentViewsInput");
  const contentReachInput = document.querySelector("#contentReachInput");
  const contentLikesInput = document.querySelector("#contentLikesInput");
  const contentCommentsInput = document.querySelector("#contentCommentsInput");
  const contentSharesInput = document.querySelector("#contentSharesInput");
  const contentSavesInput = document.querySelector("#contentSavesInput");
  const contentRetentionInput = document.querySelector("#contentRetentionInput");
  const contentResultsSection = document.querySelector("#contentResultsSection");
  const saveContentItemButton = document.querySelector("#saveContentItem");
  const deleteContentItemButton = document.querySelector("#deleteContentItem");
  const contentTemplateModal = document.querySelector("#contentTemplateModal");
  const contentTemplateBackdrop = document.querySelector("#contentTemplateBackdrop");
  const closeContentTemplateButton = document.querySelector("#closeContentTemplate");
  const contentTemplateEditorTitle = document.querySelector("#contentTemplateEditorTitle");
  const contentTemplateTitleInput = document.querySelector("#contentTemplateTitleInput");
  const contentTemplateFormatInput = document.querySelector("#contentTemplateFormatInput");
  const contentTemplateHookInput = document.querySelector("#contentTemplateHookInput");
  const contentTemplateBodyInput = document.querySelector("#contentTemplateBodyInput");
  const saveContentTemplateButton = document.querySelector("#saveContentTemplate");
  const deleteContentTemplateButton = document.querySelector("#deleteContentTemplate");

  applyTheme(state.theme || "light");
  renderCalendarNavigation();
  renderCalendar();
  renderStats();
  renderGoals();
  renderCalendarSettings();
  renderTaskTypeSettings();
  renderProfilePhoto();
  renderAccount();
  renderReminderSettings();
  initializeContentStudio();
  normalizeStoredProfilePhoto();
  startDateWatcher();
  openRequestedDay();
  if (localPreview) {
    authScreen.hidden = true;
    document.body.classList.add("is-authenticated");
  } else {
    initializeAuth();
  }
  if ("clearAppBadge" in navigator) navigator.clearAppBadge().catch(() => {});

  profileButton.addEventListener("click", openProfile);
  planningSpaceButton.addEventListener("click", () => switchWorkspace("planning"));
  contentSpaceButton.addEventListener("click", () => switchWorkspace("content"));
  contentNavButtons.forEach((button) => button.addEventListener("click", () => showContentView(button.dataset.contentView)));
  addContentButton.addEventListener("click", () => openContentEditor());
  addIdeaButton.addEventListener("click", () => openContentEditor());
  addPlannedContentButton.addEventListener("click", () => openContentEditor(null, { planned: true }));
  contentSearchButton.addEventListener("click", toggleContentSearch);
  contentWorkSearch.addEventListener("input", renderContentWork);
  contentIdeasSearch.addEventListener("input", renderContentIdeas);
  contentStatusFilter.addEventListener("change", renderContentIdeas);
  contentPlatformFilter.addEventListener("change", renderContentIdeas);
  contentAnalyticsPeriod.addEventListener("change", renderContentAnalytics);
  contentEditorBackdrop.addEventListener("click", closeContentEditor);
  closeContentEditorButton.addEventListener("click", closeContentEditor);
  bindContentChoiceGroup(contentStageOptions, contentStageInput);
  bindContentChoiceGroup(contentPlatformOptions, contentPlatformInput);
  bindContentChoiceGroup(contentFormatOptions, contentFormatInput);
  bindContentChoiceGroup(contentPillarOptions, contentPillarInput);
  saveContentItemButton.addEventListener("click", saveContentItemFromEditor);
  deleteContentItemButton.addEventListener("click", deleteContentItemFromEditor);
  addContentTemplateButton.addEventListener("click", () => openContentTemplateEditor());
  contentTemplateBackdrop.addEventListener("click", closeContentTemplateEditor);
  closeContentTemplateButton.addEventListener("click", closeContentTemplateEditor);
  saveContentTemplateButton.addEventListener("click", saveContentTemplateFromEditor);
  deleteContentTemplateButton.addEventListener("click", deleteContentTemplateFromEditor);
  saveContentSpaceNameButton.addEventListener("click", saveContentSpaceName);
  addContentPlatformButton.addEventListener("click", () => addContentSetting("platform"));
  addContentPillarButton.addEventListener("click", () => addContentSetting("pillar"));
  newContentPlatform.addEventListener("keydown", (event) => { if (event.key === "Enter") addContentSetting("platform"); });
  newContentPillar.addEventListener("keydown", (event) => { if (event.key === "Enter") addContentSetting("pillar"); });
  resetContentSpaceButton.addEventListener("click", resetContentStudio);
  addCalendarButton.addEventListener("click", () => openCalendarEditor());
  settingsAddCalendarButton.addEventListener("click", () => openCalendarEditor());
  previousMonthButton.addEventListener("click", () => changeMonth(-1));
  nextMonthButton.addEventListener("click", () => changeMonth(1));
  todayButton.addEventListener("click", goToToday);
  calendarGrid.addEventListener("touchstart", handleCalendarTouchStart, { passive: true });
  calendarGrid.addEventListener("touchend", handleCalendarTouchEnd, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(() => centerActiveCalendarTab("auto")));
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
  addTaskTypeButton.addEventListener("click", showNewTaskTypeEditor);
  saveTaskTypeButton.addEventListener("click", saveNewTaskType);
  newTaskTypeName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveNewTaskType();
  });
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
  closeCalendarEditorButton.addEventListener("click", closeCalendarEditor);
  calendarEditorBackdrop.addEventListener("click", closeCalendarEditor);
  saveCalendarButton.addEventListener("click", saveCalendarFromEditor);
  deleteCalendarButton.addEventListener("click", deleteCalendarFromEditor);
  calendarIconOptions.addEventListener("click", handleCalendarIconChoice);
  calendarColorOptions.addEventListener("click", handleCalendarColorChoice);
  profileTabs.forEach((button) => {
    button.addEventListener("click", () => showProfilePage(button.dataset.profileTab));
  });
  themeChoices.forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.themeChoice, { save: true }));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (contentTemplateModal.classList.contains("is-open")) {
      closeContentTemplateEditor();
      return;
    }
    if (contentEditorModal.classList.contains("is-open")) {
      closeContentEditor();
      return;
    }
    if (calendarEditorModal.classList.contains("is-open")) {
      closeCalendarEditor();
      return;
    }
    if (taskModal.classList.contains("is-open")) {
      closeTaskEditor();
      return;
    }
    if (activeModal === "day") closeDayModal();
    if (activeModal === "profile") closeProfileModal();
  });

  energyRange.addEventListener("input", () => {
    const entry = ensureEntry(selectedKey);
    entry.energy = Number(energyRange.value);
    entry.updatedAt = new Date().toISOString();
    energyValue.textContent = entry.energy;
    saveState();
  });

  dayNotes.addEventListener("compositionstart", () => {
    isNotesComposing = true;
    clearTimeout(notesCloudSaveTimer);
    notesCloudSaveTimer = null;
  });

  dayNotes.addEventListener("compositionend", () => {
    isNotesComposing = false;
    saveNotesDraft({ cloudDelay: 1400 });
  });

  dayNotes.addEventListener("input", () => {
    saveNotesDraft({ cloudDelay: isNotesComposing ? null : 1400 });
  });

  dayNotes.addEventListener("blur", () => {
    isNotesComposing = false;
    saveNotesDraft({ cloudDelay: 100 });
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

  function defaultCalendars() {
    return [
      {
        id: "tasks",
        name: "Дела",
        icon: "list",
        color: "#286fb4",
        description: "Задачи и проекты",
        system: true
      },
      {
        id: "habits",
        name: "Привычки",
        icon: "repeat",
        color: "#2f7d5a",
        description: "Полезные привычки",
        system: true
      },
      {
        id: "sport",
        name: "Спорт",
        icon: "sport",
        color: "#b76032",
        description: "Тренировки и форма",
        system: true
      }
    ];
  }

  function defaultContentTemplates() {
    return [
      {
        id: "content-template-story",
        title: "Личная история",
        format: "Reels",
        hook: "Я долго не рассказывал об этом, но...",
        body: "1. Ситуация до изменения\n2. Момент, когда всё изменилось\n3. Что я сделал\n4. Результат и честный вывод",
        system: true
      },
      {
        id: "content-template-breakdown",
        title: "Полезный разбор",
        format: "Shorts",
        hook: "Вот почему у тебя не получается...",
        body: "1. Назвать проблему\n2. Показать типичную ошибку\n3. Дать 3 конкретных шага\n4. Короткий итог",
        system: true
      },
      {
        id: "content-template-challenge",
        title: "Путь или челлендж",
        format: "TikTok",
        hook: "День 1: проверяю, смогу ли я...",
        body: "1. Цель челленджа\n2. Что произошло сегодня\n3. Трудность или неожиданность\n4. Следующий шаг",
        system: true
      }
    ];
  }

  function defaultContentStudio() {
    return {
      name: "Контент",
      items: [],
      templates: defaultContentTemplates(),
      platforms: ["Reels", "TikTok", "Shorts", "YouTube"],
      pillars: ["Личный опыт", "Дизайн", "Продукт", "Учёба"],
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeContentStudio(value) {
    const fallback = defaultContentStudio();
    const source = value && typeof value === "object" ? value : {};
    const validStages = new Set(contentStages.map((stage) => stage.id));
    const items = Array.isArray(source.items) ? source.items : [];
    const customTemplates = Array.isArray(source.templates)
      ? source.templates.filter((template) => template && !template.system)
      : [];
    return {
      name: String(source.name || fallback.name).trim().slice(0, 32) || fallback.name,
      items: items.filter(Boolean).map((item) => ({
        id: String(item.id || `content-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        title: String(item.title || "Без названия").trim().slice(0, 100),
        stage: validStages.has(item.stage) ? item.stage : "idea",
        platform: String(item.platform || fallback.platforms[0]),
        format: String(item.format || "Reels"),
        pillar: String(item.pillar || fallback.pillars[0]),
        hook: String(item.hook || ""),
        script: String(item.script || ""),
        nextAction: String(item.nextAction || ""),
        publishDate: /^\d{4}-\d{2}-\d{2}$/.test(item.publishDate || "") ? item.publishDate : "",
        publishTime: /^\d{2}:\d{2}$/.test(item.publishTime || "") ? item.publishTime : "",
        metrics: normalizeContentMetrics(item.metrics),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      })),
      templates: [
        ...defaultContentTemplates(),
        ...customTemplates.map((template) => ({
          id: String(template.id || `content-template-${Date.now()}-${Math.random().toString(16).slice(2)}`),
          title: String(template.title || "Шаблон").trim().slice(0, 60),
          format: String(template.format || "Reels"),
          hook: String(template.hook || ""),
          body: String(template.body || ""),
          system: false,
          updatedAt: template.updatedAt || new Date().toISOString()
        }))
      ],
      platforms: normalizeContentTokens(source.platforms, fallback.platforms),
      pillars: normalizeContentTokens(source.pillars, fallback.pillars),
      updatedAt: source.updatedAt || new Date().toISOString()
    };
  }

  function normalizeContentTokens(values, fallback) {
    if (!Array.isArray(values)) return [...fallback];
    const result = [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
    return result.length ? result.slice(0, 20) : [...fallback];
  }

  function normalizeContentMetrics(metrics) {
    const source = metrics && typeof metrics === "object" ? metrics : {};
    const number = (value, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(0, Number(value) || 0));
    return {
      views: number(source.views),
      reach: number(source.reach),
      likes: number(source.likes),
      comments: number(source.comments),
      shares: number(source.shares),
      saves: number(source.saves),
      retention: number(source.retention, 100)
    };
  }

  function calendars() {
    if (!Array.isArray(state.calendars) || !state.calendars.length) {
      state.calendars = defaultCalendars();
    }
    return state.calendars;
  }

  function calendarById(id) {
    return calendars().find((calendar) => calendar.id === id) || calendars()[0];
  }

  function activeCalendar() {
    const calendar = calendarById(state.activeCalendarId);
    if (state.activeCalendarId !== calendar.id) state.activeCalendarId = calendar.id;
    return calendar;
  }

  function calendarStore(calendarId = activeCalendar().id) {
    state.calendarData = state.calendarData && typeof state.calendarData === "object" ? state.calendarData : {};
    if (!state.calendarData[calendarId] || typeof state.calendarData[calendarId] !== "object") {
      state.calendarData[calendarId] = { dayPlans: {}, entries: {}, updatedAt: new Date().toISOString() };
    }
    const store = state.calendarData[calendarId];
    store.dayPlans = store.dayPlans && typeof store.dayPlans === "object" ? store.dayPlans : {};
    store.entries = store.entries && typeof store.entries === "object" ? store.entries : {};
    return store;
  }

  function effectiveDay(day) {
    const custom = calendarStore().dayPlans[day.key];
    if (!custom) return day;
    return {
      ...day,
      focus: custom.focus || day.focus,
      tasks: Array.isArray(custom.tasks) ? custom.tasks : day.tasks
    };
  }

  function dayForDate(date, calendarId = activeCalendar().id) {
    const key = formatKey(date);
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const starterEnabled = state.useStarterTemplate !== false;
    const inStarterRange = normalizedDate >= planStartDate && normalizedDate <= planEndDate;
    const sourceDay = inStarterRange
      ? (plannedDays.find((item) => item.key === key) || buildDay(normalizedDate))
      : null;
    let focus = "Без фокуса";
    let tasks = [];

    if (calendarId === "tasks" && sourceDay) {
      focus = sourceDay.focus;
      tasks = sourceDay.tasks.filter((task) => !["habit", "sport"].includes(task.type));
    } else if (calendarId === "habits" && starterEnabled) {
      focus = "Ритм и забота о себе";
      tasks = [
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
        }
      ];
      if (normalizedDate.getDay() === 0) {
        tasks.push({
          id: "review",
          title: "Недельный обзор",
          meta: "20 минут: что работает, что перегружает, что переносим.",
          type: "habit"
        });
      }
    } else if (calendarId === "sport" && starterEnabled) {
      focus = "Тренировка и восстановление";
      if ([1, 3, 6].includes(normalizedDate.getDay())) {
        tasks = [{
          id: "sport",
          title: "Спорт",
          meta: "45-60 минут: база, техника, растяжка в конце.",
          type: "sport"
        }];
      }
    }

    return { key, date: normalizedDate, focus, tasks: cloneTasks(tasks) };
  }

  function dayForKey(key, calendarId = activeCalendar().id) {
    const parts = key.split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      return dayForDate(today, calendarId);
    }
    return dayForDate(new Date(parts[0], parts[1] - 1, parts[2]), calendarId);
  }

  function ensureDayPlan(key) {
    const day = dayForKey(key);
    const store = calendarStore();
    if (!store.dayPlans[key]) {
      store.dayPlans[key] = {
        focus: day.focus,
        tasks: cloneTasks(day.tasks),
        updatedAt: new Date().toISOString()
      };
      store.updatedAt = new Date().toISOString();
    }
    return store.dayPlans[key];
  }

  function cloneTasks(tasks) {
    return tasks.map((task) => ({ ...task }));
  }

  function restoreLegacyLockedDays() {
    const lockedDays = state.lockedDays && typeof state.lockedDays === "object" ? state.lockedDays : {};
    const keys = Object.keys(lockedDays);
    delete state.lockedDays;
    if (!keys.length) return false;

    const migrationTime = new Date().toISOString();
    state.dayPlans = state.dayPlans && typeof state.dayPlans === "object" ? state.dayPlans : {};

    keys.forEach((key) => {
      const snapshot = lockedDays[key];
      if (!isDateKey(key) || !snapshot || typeof snapshot !== "object") return;
      const restoredAt = typeof snapshot.lockedAt === "string" ? snapshot.lockedAt : migrationTime;
      const baseDay = legacyDayForKey(key);
      const existingPlan = state.dayPlans[key] && typeof state.dayPlans[key] === "object"
        ? state.dayPlans[key]
        : {};
      state.dayPlans[key] = {
        ...existingPlan,
        focus: typeof snapshot.focus === "string"
          ? snapshot.focus
          : (existingPlan.focus || baseDay.focus),
        tasks: Array.isArray(snapshot.tasks)
          ? cloneTasks(snapshot.tasks)
          : (Array.isArray(existingPlan.tasks) ? cloneTasks(existingPlan.tasks) : cloneTasks(baseDay.tasks)),
        updatedAt: restoredAt
      };

      if (snapshot.entry && typeof snapshot.entry === "object") {
        state[key] = {
          ...JSON.parse(JSON.stringify(snapshot.entry)),
          updatedAt: restoredAt
        };
      }
    });

    return true;
  }

  function migrateState() {
    const fallbackUpdatedAt = state.localUpdatedAt || new Date().toISOString();
    state.profileName = String(state.profileName || "").trim().slice(0, 40);
    if (typeof state.useStarterTemplate !== "boolean") state.useStarterTemplate = true;
    state.dayPlans = state.dayPlans && typeof state.dayPlans === "object" ? state.dayPlans : {};
    restoreLegacyLockedDays();
    migrateLegacyCalendarData(fallbackUpdatedAt);
    state.schemaVersion = 33;
    state.calendars = normalizeCalendars(state.calendars);
    state.activeCalendarId = calendarById(state.activeCalendarId || "tasks").id;
    state.taskTypes = normalizeTaskTypes(state.taskTypes);
    state.reminderMorning = validTime(state.reminderMorning) ? state.reminderMorning : "10:00";
    state.reminderEvening = validTime(state.reminderEvening) ? state.reminderEvening : "16:00";
    state.reminderTimezone = state.reminderTimezone || detectedTimezone();
    state.remindersEnabled = Boolean(state.remindersEnabled);
    state.cloudRevision = Number(state.cloudRevision) || 0;
    state.contentStudio = normalizeContentStudio(state.contentStudio);
    state.contentStudioUpdatedAt = state.contentStudioUpdatedAt || state.contentStudio.updatedAt || fallbackUpdatedAt;
    state.activeWorkspace = state.activeWorkspace === "content" ? "content" : "planning";

    calendars().forEach((calendar) => {
      const store = calendarStore(calendar.id);
      if (!store.updatedAt) store.updatedAt = fallbackUpdatedAt;
      Object.values(store.dayPlans).forEach((plan) => {
        if (plan && !plan.updatedAt) plan.updatedAt = fallbackUpdatedAt;
      });
      Object.values(store.entries).forEach((entry) => {
        if (entry && !entry.updatedAt) entry.updatedAt = fallbackUpdatedAt;
      });
    });

    delete state.syncUrl;
    delete state.syncKey;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function migrateLegacyCalendarData(fallbackUpdatedAt) {
    if (state.calendarData && typeof state.calendarData === "object") {
      delete state.dayPlans;
      Object.keys(state).filter(isDateKey).forEach((key) => delete state[key]);
      return;
    }

    const sourcePlans = state.dayPlans && typeof state.dayPlans === "object" ? state.dayPlans : {};
    const sourceEntries = {};
    Object.keys(state).filter(isDateKey).forEach((key) => {
      if (state[key] && typeof state[key] === "object") sourceEntries[key] = state[key];
    });
    const stores = {
      tasks: { dayPlans: {}, entries: {}, updatedAt: fallbackUpdatedAt },
      habits: { dayPlans: {}, entries: {}, updatedAt: fallbackUpdatedAt },
      sport: { dayPlans: {}, entries: {}, updatedAt: fallbackUpdatedAt }
    };
    const keys = new Set([
      ...plannedDays.map((day) => day.key),
      ...Object.keys(sourcePlans),
      ...Object.keys(sourceEntries)
    ]);

    keys.forEach((key) => {
      if (!isDateKey(key)) return;
      const baseDay = legacyDayForKey(key);
      const custom = sourcePlans[key] && typeof sourcePlans[key] === "object" ? sourcePlans[key] : {};
      const allTasks = Array.isArray(custom.tasks) ? cloneTasks(custom.tasks) : cloneTasks(baseDay.tasks);
      const sourceEntry = sourceEntries[key] && typeof sourceEntries[key] === "object"
        ? sourceEntries[key]
        : { tasks: {}, energy: 5, notes: "", updatedAt: fallbackUpdatedAt };
      const groups = {
        tasks: allTasks.filter((task) => !["habit", "sport"].includes(task.type)),
        habits: allTasks.filter((task) => task.type === "habit"),
        sport: allTasks.filter((task) => task.type === "sport")
      };

      Object.entries(groups).forEach(([calendarId, tasks]) => {
        stores[calendarId].dayPlans[key] = {
          focus: calendarId === "tasks"
            ? (custom.focus || baseDay.focus)
            : (calendarId === "habits" ? "Ритм и забота о себе" : "Тренировка и восстановление"),
          tasks: cloneTasks(tasks),
          updatedAt: custom.updatedAt || fallbackUpdatedAt
        };
        const taskIds = new Set(tasks.map((task) => task.id));
        const completed = {};
        Object.entries(sourceEntry.tasks || {}).forEach(([taskId, done]) => {
          if (taskIds.has(taskId)) completed[taskId] = Boolean(done);
        });
        stores[calendarId].entries[key] = {
          tasks: completed,
          energy: calendarId === "tasks" ? Number(sourceEntry.energy) || 5 : 5,
          notes: calendarId === "tasks" ? String(sourceEntry.notes || "") : "",
          updatedAt: sourceEntry.updatedAt || fallbackUpdatedAt
        };
      });
    });

    state.calendarData = stores;
    state.calendars = defaultCalendars();
    state.activeCalendarId = "tasks";
    state.calendarsUpdatedAt = fallbackUpdatedAt;
    delete state.dayPlans;
    Object.keys(state).filter(isDateKey).forEach((key) => delete state[key]);
  }

  function legacyDayForKey(key) {
    const planned = plannedDays.find((item) => item.key === key);
    if (planned) return planned;
    const parts = key.split("-").map(Number);
    const date = parts.length === 3 && parts.every(Number.isFinite)
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(today);
    return { key: formatKey(date), date, focus: "Без фокуса", tasks: [] };
  }

  function normalizeCalendars(value) {
    const source = Array.isArray(value) ? value : defaultCalendars();
    const seen = new Set();
    const result = source
      .filter((calendar) => calendar && typeof calendar === "object")
      .map((calendar) => ({
        id: String(calendar.id || `calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        name: String(calendar.name || "Календарь").trim().slice(0, 24) || "Календарь",
        icon: calendarIconNames().includes(calendar.icon) ? calendar.icon : "calendar",
        color: validCalendarColor(calendar.color) ? calendar.color : "#286fb4",
        description: String(calendar.description || "Личный календарь").trim().slice(0, 48),
        system: Boolean(calendar.system)
      }))
      .filter((calendar) => {
        if (seen.has(calendar.id)) return false;
        seen.add(calendar.id);
        return true;
      });
    const defaults = defaultCalendars();
    const defaultIds = new Set(defaults.map((calendar) => calendar.id));
    const normalizedDefaults = defaults.map((calendar) => {
      const existing = result.find((item) => item.id === calendar.id);
      return existing ? { ...existing, system: true } : calendar;
    });
    return [
      ...normalizedDefaults,
      ...result.filter((calendar) => !defaultIds.has(calendar.id))
    ];
  }

  function defaultTaskTypes() {
    return [
      { id: "habit", name: "Привычка", color: "#2f7d5a", system: true },
      { id: "work", name: "Работа", color: "#286fb4", system: true },
      { id: "sport", name: "Спорт", color: "#b76032", system: true },
      { id: "personal", name: "Личное", color: "#7b61a8", system: true }
    ];
  }

  function normalizeTaskTypes(value) {
    const source = Array.isArray(value) ? value : defaultTaskTypes();
    const seen = new Set();
    const result = source
      .filter((type) => type && typeof type === "object")
      .map((type) => ({
        id: String(type.id || `type-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        name: String(type.name || "Другое").trim().slice(0, 24) || "Другое",
        color: validCalendarColor(type.color) ? type.color : "#4d6b78",
        system: Boolean(type.system)
      }))
      .filter((type) => {
        if (seen.has(type.id)) return false;
        seen.add(type.id);
        return true;
      });
    const defaults = defaultTaskTypes();
    const defaultIds = new Set(defaults.map((type) => type.id));
    const normalizedDefaults = defaults.map((type) => {
      const existing = result.find((item) => item.id === type.id);
      return existing ? { ...existing, system: true } : type;
    });
    return [
      ...normalizedDefaults,
      ...result.filter((type) => !defaultIds.has(type.id))
    ];
  }

  function taskTypes() {
    state.taskTypes = normalizeTaskTypes(state.taskTypes);
    return state.taskTypes;
  }

  function validCalendarColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
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

  function refreshCurrentDate() {
    now = new Date();
    const nextToday = currentDayDate(now);
    if (formatKey(nextToday) === formatKey(today)) return false;
    today = nextToday;
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
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

  function calendarIconNames() {
    return ["list", "repeat", "sport", "study", "target", "calendar"];
  }

  function calendarIconSvg(name) {
    const paths = {
      list: '<path d="M9 6h11M9 12h11M9 18h11"></path><path d="M4 6h.01M4 12h.01M4 18h.01"></path>',
      repeat: '<path d="m17 2 4 4-4 4"></path><path d="M3 11V9a3 3 0 0 1 3-3h15"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v2a3 3 0 0 1-3 3H3"></path>',
      sport: '<path d="M6.5 6.5h11v11h-11z"></path><path d="M2 9v6M22 9v6M4 7v10M20 7v10"></path>',
      study: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
      target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>',
      calendar: '<path d="M8 2v4M16 2v4M3 9h18"></path><rect x="3" y="4" width="18" height="17" rx="2"></rect>'
    };
    return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.calendar}</svg>`;
  }

  function renderCalendarNavigation() {
    const current = activeCalendar();
    calendarTabs.innerHTML = "";
    calendars().forEach((calendar) => {
      const button = document.createElement("button");
      const active = calendar.id === current.id;
      button.type = "button";
      button.className = `calendar-tab ${active ? "is-active" : ""}`;
      button.style.setProperty("--calendar-color", calendar.color);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", `Открыть календарь ${calendar.name}`);
      button.innerHTML = `${calendarIconSvg(calendar.icon)}<span>${escapeHtml(calendar.name)}</span>`;
      button.addEventListener("click", () => switchCalendar(calendar.id));
      calendarTabs.appendChild(button);
    });

    activeCalendarIcon.innerHTML = calendarIconSvg(current.icon);
    activeCalendarIcon.style.setProperty("--calendar-color", current.color);
    activeCalendarTitle.textContent = current.name;
    activeCalendarLabel.textContent = current.description || "Личный календарь";
    document.documentElement.style.setProperty("--calendar-accent", current.color);
    renderProfileCalendarSummary();

    requestAnimationFrame(() => centerActiveCalendarTab("smooth"));
  }

  function centerActiveCalendarTab(behavior = "smooth") {
    const activeButton = calendarTabs.querySelector(".calendar-tab.is-active");
    if (!activeButton || calendarTabs.scrollWidth <= calendarTabs.clientWidth) return;
    const centeredLeft = activeButton.offsetLeft - (calendarTabs.clientWidth - activeButton.offsetWidth) / 2;
    calendarTabs.scrollTo({ left: Math.max(0, centeredLeft), behavior });
  }

  function switchCalendar(calendarId) {
    if (!calendars().some((calendar) => calendar.id === calendarId)) return;
    state.activeCalendarId = calendarId;
    state.activeCalendarUpdatedAt = new Date().toISOString();
    saveState();
    renderCalendarNavigation();
    renderCalendar();
    renderStats();
    if (activeModal === "day") renderDay();
  }

  function renderProfileCalendarSummary() {
    if (!profileCalendarSummary) return;
    profileCalendarSummary.innerHTML = "";
    calendars().forEach((calendar) => {
      const day = effectiveDayForCalendar(dayForDate(today, calendar.id), calendar.id);
      const entry = readEntryForCalendar(day.key, calendar.id);
      const done = day.tasks.filter((task) => entry.tasks[task.id]).length;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "profile-calendar-row";
      row.style.setProperty("--calendar-color", calendar.color);
      row.innerHTML = `
        <span class="profile-calendar-row-icon">${calendarIconSvg(calendar.icon)}</span>
        <span><strong>${escapeHtml(calendar.name)}</strong><small>${done} из ${day.tasks.length} сегодня</small></span>
        <span class="profile-calendar-row-count">${day.tasks.length - done}</span>
      `;
      row.addEventListener("click", () => {
        switchCalendar(calendar.id);
        closeProfileModal();
      });
      profileCalendarSummary.appendChild(row);
    });
  }

  function effectiveDayForCalendar(day, calendarId) {
    const custom = calendarStore(calendarId).dayPlans[day.key];
    if (!custom) return day;
    return {
      ...day,
      focus: custom.focus || day.focus,
      tasks: Array.isArray(custom.tasks) ? custom.tasks : day.tasks
    };
  }

  function showProfilePage(pageName) {
    activeProfilePage = ["overview", "goals", "reminders", "settings"].includes(pageName)
      ? pageName
      : "overview";
    profileTabs.forEach((button) => {
      const active = button.dataset.profileTab === activeProfilePage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    profilePages.forEach((page) => {
      const active = page.dataset.profilePage === activeProfilePage;
      page.classList.toggle("is-active", active);
      page.hidden = !active;
    });
    if (activeProfilePage === "settings") {
      renderCalendarSettings();
      renderTaskTypeSettings();
    }
  }

  function renderCalendarSettings() {
    if (!calendarSettingsList) return;
    calendarSettingsList.innerHTML = "";
    calendars().forEach((calendar) => {
      const row = document.createElement("div");
      row.className = "calendar-settings-row";
      row.style.setProperty("--calendar-color", calendar.color);
      row.innerHTML = `
        <span class="calendar-settings-icon">${calendarIconSvg(calendar.icon)}</span>
        <span class="calendar-settings-copy">
          <strong>${escapeHtml(calendar.name)}</strong>
          <small>${calendar.system ? "Основной календарь" : "Пользовательский календарь"}</small>
        </span>
        <button class="icon-button calendar-edit-button" type="button" aria-label="Изменить календарь ${escapeAttribute(calendar.name)}" title="Изменить">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"></path></svg>
        </button>
      `;
      row.querySelector(".calendar-edit-button").addEventListener("click", () => openCalendarEditor(calendar.id));
      calendarSettingsList.appendChild(row);
    });
  }

  function openCalendarEditor(calendarId = null) {
    const calendar = calendarId ? calendarById(calendarId) : null;
    editingCalendarId = calendar ? calendar.id : null;
    selectedCalendarIcon = calendar?.icon || "calendar";
    selectedCalendarColor = calendar?.color || "#286fb4";
    calendarEditorTitle.textContent = calendar ? "Настроить календарь" : "Новый календарь";
    calendarNameInput.value = calendar?.name || "";
    saveCalendarButton.textContent = calendar ? "Сохранить" : "Создать календарь";
    deleteCalendarButton.hidden = !calendar || calendar.system;
    calendarIconOptions.querySelectorAll("[data-calendar-icon]").forEach((button) => {
      button.innerHTML = calendarIconSvg(button.dataset.calendarIcon);
      button.classList.toggle("is-selected", button.dataset.calendarIcon === selectedCalendarIcon);
    });
    calendarColorOptions.querySelectorAll("[data-calendar-color]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.calendarColor === selectedCalendarColor);
    });
    calendarEditorModal.classList.add("is-open");
    calendarEditorModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => calendarNameInput.focus());
  }

  function closeCalendarEditor() {
    calendarEditorModal.classList.remove("is-open");
    calendarEditorModal.setAttribute("aria-hidden", "true");
    editingCalendarId = null;
    if (!dayModal.classList.contains("is-open") && !profileModal.classList.contains("is-open")) {
      document.body.classList.remove("modal-open");
    }
  }

  function handleCalendarIconChoice(event) {
    const button = event.target.closest("[data-calendar-icon]");
    if (!button) return;
    selectedCalendarIcon = button.dataset.calendarIcon;
    calendarIconOptions.querySelectorAll("[data-calendar-icon]").forEach((item) => {
      item.classList.toggle("is-selected", item === button);
    });
  }

  function handleCalendarColorChoice(event) {
    const button = event.target.closest("[data-calendar-color]");
    if (!button) return;
    selectedCalendarColor = button.dataset.calendarColor;
    calendarColorOptions.querySelectorAll("[data-calendar-color]").forEach((item) => {
      item.classList.toggle("is-selected", item === button);
    });
  }

  function saveCalendarFromEditor() {
    const name = calendarNameInput.value.trim().slice(0, 24);
    if (!name) {
      calendarNameInput.focus();
      return;
    }
    const timestamp = new Date().toISOString();
    if (editingCalendarId) {
      const calendar = calendars().find((item) => item.id === editingCalendarId);
      if (!calendar) return;
      calendar.name = name;
      calendar.icon = selectedCalendarIcon;
      calendar.color = selectedCalendarColor;
      calendar.description = calendar.system ? calendar.description : "Личный календарь";
    } else {
      const id = `calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      state.calendars.push({
        id,
        name,
        icon: selectedCalendarIcon,
        color: selectedCalendarColor,
        description: "Личный календарь",
        system: false
      });
      state.calendarData[id] = { dayPlans: {}, entries: {}, updatedAt: timestamp };
      state.activeCalendarId = id;
      state.activeCalendarUpdatedAt = timestamp;
    }
    state.calendarsUpdatedAt = timestamp;
    saveState();
    closeCalendarEditor();
    renderCalendarNavigation();
    renderCalendarSettings();
    renderCalendar();
    renderStats();
  }

  function deleteCalendarFromEditor() {
    const calendar = calendars().find((item) => item.id === editingCalendarId);
    if (!calendar || calendar.system) return;
    if (!window.confirm(`Удалить календарь «${calendar.name}» и все его записи?`)) return;
    state.calendars = calendars().filter((item) => item.id !== calendar.id);
    delete state.calendarData[calendar.id];
    const timestamp = new Date().toISOString();
    if (state.activeCalendarId === calendar.id) {
      state.activeCalendarId = "tasks";
      state.activeCalendarUpdatedAt = timestamp;
    }
    state.calendarsUpdatedAt = timestamp;
    saveState();
    closeCalendarEditor();
    renderCalendarNavigation();
    renderCalendarSettings();
    renderCalendar();
    renderStats();
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
    showProfilePage("overview");
    renderStats();
    renderGoals();
    renderCalendarSettings();
    renderTaskTypeSettings();
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
    const entry = ensureEntry(sourceDay.key);
    const status = dayStatus(day, entry);
    selectedWeekday.textContent = weekdayNames[sourceDay.date.getDay()];
    selectedDayNumber.textContent = sourceDay.date.getDate();
    selectedDate.textContent = `${monthNames[sourceDay.date.getMonth()]} ${sourceDay.date.getFullYear()}`;
    selectedCalendarName.textContent = activeCalendar().name;
    loadPill.textContent = status.label;
    loadPill.className = `load-pill ${status.kind}`;
    dayFocus.textContent = day.focus;
    editDayButton.textContent = isEditingDay ? "Готово" : "Изменить";
    editDayButton.hidden = false;
    dayFocus.contentEditable = isEditingDay ? "true" : "false";
    dayFocus.classList.toggle("is-editable", isEditingDay);
    dayFocus.setAttribute("aria-label", isEditingDay ? "Изменить фокус дня" : "Фокус дня");
    addTaskButton.hidden = false;
    energyRange.value = entry.energy;
    energyRange.disabled = false;
    energyValue.textContent = entry.energy;
    if (!isNotesInputActive() && dayNotes.value !== (entry.notes || "")) {
      dayNotes.value = entry.notes || "";
    }
    if (dayNotes.readOnly) dayNotes.readOnly = false;
    taskList.innerHTML = "";

    day.tasks.forEach((task) => {
      const row = document.createElement("div");
      const done = Boolean(entry.tasks[task.id]);
      const type = taskTypeById(task.type);
      row.className = `task-row ${done ? "done" : ""} ${isEditingDay ? "is-editable" : ""}`;
      row.style.setProperty("--task-type-color", type.color);
      row.innerHTML = `
        <button class="check-button" type="button" aria-label="Отметить задачу" ${isEditingDay ? "disabled" : ""}>${done ? "✓" : ""}</button>
        <button class="task-content-button" type="button" ${isEditingDay ? "" : "disabled"} aria-label="Изменить задачу ${escapeAttribute(task.title)}">
          <span class="task-title-line">
            <span class="task-title">${escapeHtml(task.title)}</span>
            <span class="task-type-badge">${escapeHtml(type.name)}</span>
          </span>
          <span class="task-meta">${escapeHtml(task.meta)}</span>
        </button>
      `;
      row.querySelector("button").addEventListener("click", () => {
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
    isEditingDay = !isEditingDay;
    if (isEditingDay) ensureDayPlan(selectedKey);
    if (!isEditingDay) closeTaskEditor();
    renderDay();
  }

  function saveDayFocus() {
    if (!isEditingDay) return;
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
    const plan = ensureDayPlan(selectedKey);
    const task = plan.tasks[index];
    if (!task) return;
    editingTaskIndex = index;
    taskEditorEyebrow.textContent = "Задача";
    taskEditorTitle.textContent = "Изменить задачу";
    taskTitleInput.value = task.title;
    taskMetaInput.value = task.meta || "";
    renderTaskTypeOptions(task.type || defaultTaskTypeForCalendar());
    newTaskTypeEditor.hidden = true;
    saveTaskButton.textContent = "Сохранить изменения";
    deleteTaskButton.hidden = false;
    showTaskEditor();
  }

  function openAddTaskEditor() {
    editingTaskIndex = null;
    taskEditorEyebrow.textContent = "Новая задача";
    taskEditorTitle.textContent = "Добавить задачу";
    taskTitleInput.value = "";
    taskMetaInput.value = "";
    renderTaskTypeOptions(defaultTaskTypeForCalendar());
    newTaskTypeEditor.hidden = true;
    newTaskTypeName.value = "";
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
    if (editingTaskIndex === null) return;
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

  function defaultTaskTypeForCalendar() {
    if (activeCalendar().id === "habits") return "habit";
    if (activeCalendar().id === "sport") return "sport";
    return "work";
  }

  function taskTypeById(typeId) {
    return taskTypes().find((type) => type.id === typeId)
      || { id: typeId || "personal", name: "Другое", color: "#4d6b78", system: false };
  }

  function renderTaskTypeOptions(selectedId = taskTypeInput.value) {
    const preferred = taskTypes().some((type) => type.id === selectedId)
      ? selectedId
      : defaultTaskTypeForCalendar();
    taskTypeInput.innerHTML = taskTypes()
      .map((type) => `<option value="${escapeAttribute(type.id)}">${escapeHtml(type.name)}</option>`)
      .join("");
    taskTypeInput.value = preferred;
  }

  function showNewTaskTypeEditor() {
    newTaskTypeEditor.hidden = false;
    newTaskTypeName.value = "";
    requestAnimationFrame(() => newTaskTypeName.focus());
  }

  function saveNewTaskType() {
    const name = newTaskTypeName.value.trim().slice(0, 24);
    if (!name) {
      newTaskTypeName.focus();
      return;
    }
    const existing = taskTypes().find((type) => type.name.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"));
    if (existing) {
      renderTaskTypeOptions(existing.id);
      newTaskTypeEditor.hidden = true;
      return;
    }
    const palette = ["#7b61a8", "#9a4352", "#4d6b78", "#9a6a2f", "#397082"];
    const type = {
      id: `type-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      color: palette[taskTypes().length % palette.length],
      system: false
    };
    state.taskTypes.push(type);
    state.taskTypesUpdatedAt = new Date().toISOString();
    saveState();
    renderTaskTypeOptions(type.id);
    renderTaskTypeSettings();
    newTaskTypeEditor.hidden = true;
  }

  function renderTaskTypeSettings() {
    if (!taskTypeSettingsList) return;
    taskTypeSettingsList.innerHTML = "";
    taskTypes().forEach((type) => {
      const row = document.createElement("div");
      row.className = "task-type-settings-row";
      row.innerHTML = `
        <span class="task-type-settings-swatch" style="--type-color:${type.color}"></span>
        <strong>${escapeHtml(type.name)}</strong>
        ${type.system ? '<small>Системный</small>' : `
          <button class="icon-button remove-task-type-button" type="button" aria-label="Удалить тип ${escapeAttribute(type.name)}" title="Удалить">×</button>
        `}
      `;
      const removeButton = row.querySelector(".remove-task-type-button");
      if (removeButton) removeButton.addEventListener("click", () => removeTaskType(type.id));
      taskTypeSettingsList.appendChild(row);
    });
  }

  function removeTaskType(typeId) {
    const type = taskTypes().find((item) => item.id === typeId);
    if (!type || type.system) return;
    if (!window.confirm(`Удалить тип «${type.name}»? Записи этого типа станут личными.`)) return;
    const timestamp = new Date().toISOString();
    calendars().forEach((calendar) => {
      const store = calendarStore(calendar.id);
      let storeChanged = false;
      Object.values(store.dayPlans).forEach((plan) => {
        if (!Array.isArray(plan.tasks)) return;
        let changed = false;
        plan.tasks.forEach((task) => {
          if (task.type !== typeId) return;
          task.type = "personal";
          changed = true;
        });
        if (changed) {
          plan.updatedAt = timestamp;
          storeChanged = true;
        }
      });
      if (storeChanged) store.updatedAt = timestamp;
    });
    state.taskTypes = taskTypes().filter((item) => item.id !== typeId);
    state.taskTypesUpdatedAt = timestamp;
    saveState();
    renderTaskTypeSettings();
    renderDay();
  }

  function renderStats() {
    let habitDone = 0;
    let habitTotal = 0;
    let workDone = 0;
    let workTotal = 0;
    let sportDone = 0;
    let sportTotal = 0;
    let currentStreak = 0;

    calendars().forEach((calendar) => {
      trackedDays(calendar.id).forEach((day) => {
        if (day.date > today) return;
        const visibleDay = effectiveDayForCalendar(day, calendar.id);
        const entry = readEntryForCalendar(day.key, calendar.id);
        visibleDay.tasks.forEach((task) => {
          if (task.type === "habit") {
            habitTotal += 1;
            if (entry.tasks[task.id]) habitDone += 1;
          } else if (task.type === "sport") {
            sportTotal += 1;
            if (entry.tasks[task.id]) sportDone += 1;
          } else {
            workTotal += 1;
            if (entry.tasks[task.id]) workDone += 1;
          }
        });
      });
    });

    trackedDays("habits").forEach((day) => {
      if (day.date > today) return;
      const visibleDay = effectiveDayForCalendar(day, "habits");
      const entry = readEntryForCalendar(day.key, "habits");
      const required = visibleDay.tasks.filter((task) => task.type === "habit");
      const requiredDone = required.length > 0 && required.every((task) => entry.tasks[task.id]);
      if (day.date < today) {
        currentStreak = requiredDone ? currentStreak + 1 : 0;
      } else if (requiredDone) {
        currentStreak += 1;
      }
    });

    habitScore.textContent = `${percent(habitDone, habitTotal)}%`;
    workScore.textContent = `${percent(workDone, workTotal)}%`;
    sportScore.textContent = `${sportDone}/${sportTotal}`;
    const streakText = `${currentStreak} ${dayWord(currentStreak)}`;
    streakScore.textContent = streakText;
    topStreakScore.textContent = streakText;
    streakFlame.className.baseVal = `flame-icon ${streakLevelClass(currentStreak)}`;
    renderProfileCalendarSummary();
  }

  function trackedDays(calendarId = activeCalendar().id) {
    const result = new Map();
    const rangeStart = new Date(Math.max(planStartDate.getTime(), new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29).getTime()));
    const rangeEnd = new Date(today);
    for (let date = new Date(rangeStart); date <= rangeEnd; date.setDate(date.getDate() + 1)) {
      const day = dayForDate(new Date(date), calendarId);
      result.set(day.key, day);
    }
    const store = calendarStore(calendarId);
    Object.keys(store.dayPlans).forEach((key) => {
      if (isDateKey(key)) result.set(key, dayForKey(key, calendarId));
    });
    Object.keys(store.entries).forEach((key) => {
      if (isDateKey(key)) result.set(key, dayForKey(key, calendarId));
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
    const requestPayload = exportProgressState();

    isCloudBusy = true;
    setSyncBusy(true);
    if (!options.auto) setSyncStatus("Сохраняю прогресс в облако...", "busy");
    cloudSaveTimer = null;

    try {
      const result = await cloudRequest("push", settings, {
        payload: requestPayload,
        baseRevision: state.cloudRevision || 0,
        reminderDays: buildReminderDays(),
        legacyCode: state.syncCode || undefined
      });
      captureActiveNotesDraft();
      applyCloudState(
        mergeCloudPayloadWithLocalChanges(result.payload, requestPayload),
        result.updatedAt,
        result.revision
      );
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
    if (options.auto && isNotesInputActive()) return;
    if (notesCloudSaveTimer) {
      clearTimeout(notesCloudSaveTimer);
      notesCloudSaveTimer = null;
      if (options.auto) {
        scheduleCloudSave(0);
        return;
      }
      return pushCloudState();
    }
    const settings = getSyncSettings({ silent: options.auto });
    if (!settings) return;
    const requestPayload = exportProgressState();

    isCloudBusy = true;
    setSyncBusy(true);
    if (!options.auto) setSyncStatus("Загружаю прогресс из облака...", "busy");

    try {
      const result = await cloudRequest("pull", settings);
      if (state.syncCode) {
        isCloudBusy = false;
        setSyncBusy(false);
        return await pushCloudState({ auto: true });
      }
      if (!result.exists && options.pushIfEmpty) {
        isCloudBusy = false;
        setSyncBusy(false);
        return await pushCloudState({ auto: true });
      }
      if (result.exists && (!state.cloudRevision || result.revision > state.cloudRevision)) {
        captureActiveNotesDraft();
        applyCloudState(
          mergeCloudPayloadWithLocalChanges(result.payload, requestPayload),
          result.updatedAt,
          result.revision
        );
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
    saveState({ skipCloud: true });
    isApplyingCloud = false;
    renderCalendarNavigation();
    renderCalendar();
    renderStats();
    renderGoals();
    renderCalendarSettings();
    renderTaskTypeSettings();
    renderProfilePhoto();
    renderAccount();
    renderReminderSettings();
    renderContentStudio();
    switchWorkspace(state.activeWorkspace || "planning", { save: false });
    applyTheme(state.theme || "light");
    if (activeModal === "day") renderDay();
  }

  function mergeCloudPayloadWithLocalChanges(payload, baseline) {
    const merged = JSON.parse(JSON.stringify(payload || {}));
    const current = exportProgressState();
    const baselineState = baseline || {};
    const handledKeys = new Set(["calendarData"]);
    merged.calendarData = mergeChangedCalendarData(
      merged.calendarData,
      current.calendarData,
      baselineState.calendarData
    );

    new Set([...Object.keys(current), ...Object.keys(baselineState)]).forEach((key) => {
      if (!handledKeys.has(key)) preserveChangedValue(merged, current, baselineState, key);
    });
    return merged;
  }

  function mergeChangedCalendarData(cloudValue, currentValue, baselineValue) {
    const target = cloudValue && typeof cloudValue === "object"
      ? JSON.parse(JSON.stringify(cloudValue))
      : {};
    const currentData = currentValue && typeof currentValue === "object" ? currentValue : {};
    const baselineData = baselineValue && typeof baselineValue === "object" ? baselineValue : {};
    new Set([...Object.keys(currentData), ...Object.keys(baselineData)]).forEach((calendarId) => {
      const currentStore = currentData[calendarId];
      const baselineStore = baselineData[calendarId];
      if (JSON.stringify(currentStore) === JSON.stringify(baselineStore)) return;
      if (currentStore === undefined) {
        delete target[calendarId];
        return;
      }
      if (!baselineStore) {
        target[calendarId] = JSON.parse(JSON.stringify(currentStore));
        return;
      }

      const targetStore = target[calendarId] && typeof target[calendarId] === "object"
        ? { ...target[calendarId] }
        : {};
      ["dayPlans", "entries"].forEach((mapName) => {
        const targetMap = targetStore[mapName] && typeof targetStore[mapName] === "object"
          ? { ...targetStore[mapName] }
          : {};
        const currentMap = currentStore[mapName] && typeof currentStore[mapName] === "object"
          ? currentStore[mapName]
          : {};
        const baselineMap = baselineStore[mapName] && typeof baselineStore[mapName] === "object"
          ? baselineStore[mapName]
          : {};
        new Set([...Object.keys(currentMap), ...Object.keys(baselineMap)]).forEach((key) => {
          preserveChangedValue(targetMap, currentMap, baselineMap, key);
        });
        targetStore[mapName] = targetMap;
      });
      new Set([...Object.keys(currentStore), ...Object.keys(baselineStore)]).forEach((key) => {
        if (!["dayPlans", "entries"].includes(key)) {
          preserveChangedValue(targetStore, currentStore, baselineStore, key);
        }
      });
      target[calendarId] = targetStore;
    });
    return target;
  }

  function preserveChangedValue(target, current, baseline, key) {
    if (JSON.stringify(current[key]) === JSON.stringify(baseline[key])) return;
    if (current[key] === undefined) {
      delete target[key];
      return;
    }
    target[key] = JSON.parse(JSON.stringify(current[key]));
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

  function scheduleCloudSave(delay = 900) {
    if (!getSyncSettings({ silent: true }) || isApplyingCloud) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      pushCloudState({ auto: true });
    }, delay);
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
      const key = formatKey(date);
      const incomplete = [];
      let total = 0;
      calendars().forEach((calendar) => {
        const day = effectiveDayForCalendar(dayForDate(date, calendar.id), calendar.id);
        const entry = readEntryForCalendar(day.key, calendar.id);
        total += day.tasks.length;
        day.tasks
          .filter((task) => !entry.tasks[task.id])
          .forEach((task) => {
            incomplete.push({
              id: `${calendar.id}:${task.id}`,
              title: `${calendar.name}: ${task.title}`
            });
          });
      });
      result[key] = { total, incomplete };
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

  function initializeContentStudio() {
    renderContentFilters();
    activeContentView = "work";
    switchWorkspace(state.activeWorkspace || "planning", { save: false });
    renderContentStudio();
  }

  function contentStudioState() {
    state.contentStudio = normalizeContentStudio(state.contentStudio);
    return state.contentStudio;
  }

  function switchWorkspace(workspace, options = {}) {
    const isContent = workspace === "content";
    state.activeWorkspace = isContent ? "content" : "planning";
    planningSpace.hidden = isContent;
    contentSpace.hidden = !isContent;
    planningSpaceButton.classList.toggle("is-active", !isContent);
    contentSpaceButton.classList.toggle("is-active", isContent);
    planningSpaceButton.setAttribute("aria-selected", String(!isContent));
    contentSpaceButton.setAttribute("aria-selected", String(isContent));
    document.body.classList.toggle("is-content-space", isContent);
    if (isContent) renderContentStudio();
    if (options.save !== false) saveState({ skipCloud: true });
  }

  function showContentView(view) {
    const known = new Set(["work", "ideas", "plan", "analytics", "templates", "settings"]);
    activeContentView = known.has(view) ? view : "work";
    contentNavButtons.forEach((button) => {
      const active = button.dataset.contentView === activeContentView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    contentPages.forEach((page) => {
      const active = page.dataset.contentPage === activeContentView;
      page.hidden = !active;
      page.classList.toggle("is-active", active);
    });
    renderContentView();
  }

  function renderContentStudio() {
    const studio = contentStudioState();
    contentWorkspaceTitle.textContent = studio.name;
    contentSpaceNameInput.value = studio.name;
    renderContentFilters();
    renderContentView();
  }

  function renderContentView() {
    if (activeContentView === "work") renderContentWork();
    if (activeContentView === "ideas") renderContentIdeas();
    if (activeContentView === "plan") renderContentPlan();
    if (activeContentView === "analytics") renderContentAnalytics();
    if (activeContentView === "templates") renderContentTemplates();
    if (activeContentView === "settings") renderContentSettings();
  }

  function renderContentFilters() {
    const studio = contentStudioState();
    const currentStage = contentStageInput.value;
    const currentPlatform = contentPlatformInput.value;
    const currentPillar = contentPillarInput.value;
    const statusFilter = contentStatusFilter.value;
    const platformFilter = contentPlatformFilter.value;
    contentStageInput.innerHTML = contentStages.map((stage) => `<option value="${stage.id}">${stage.name}</option>`).join("");
    contentStatusFilter.innerHTML = `<option value="all">Все этапы</option>${contentStages.map((stage) => `<option value="${stage.id}">${stage.name}</option>`).join("")}`;
    contentPlatformInput.innerHTML = studio.platforms.map((platform) => `<option>${escapeHtml(platform)}</option>`).join("");
    contentPlatformFilter.innerHTML = `<option value="all">Все платформы</option>${studio.platforms.map((platform) => `<option>${escapeHtml(platform)}</option>`).join("")}`;
    contentPillarInput.innerHTML = studio.pillars.map((pillar) => `<option>${escapeHtml(pillar)}</option>`).join("");
    if (contentStages.some((stage) => stage.id === currentStage)) contentStageInput.value = currentStage;
    if (studio.platforms.includes(currentPlatform)) contentPlatformInput.value = currentPlatform;
    if (studio.pillars.includes(currentPillar)) contentPillarInput.value = currentPillar;
    if (["all", ...contentStages.map((stage) => stage.id)].includes(statusFilter)) contentStatusFilter.value = statusFilter;
    if (["all", ...studio.platforms].includes(platformFilter)) contentPlatformFilter.value = platformFilter;
  }

  function bindContentChoiceGroup(container, select) {
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-content-choice]");
      if (!button || !container.contains(button)) return;
      select.value = button.dataset.contentChoice;
      if (select === contentStageInput && select.value === "published") contentResultsSection.open = true;
      renderContentEditorChoices();
    });
  }

  function renderContentEditorChoices() {
    contentStageOptions.innerHTML = contentStages.map((stage, index) => {
      const selected = stage.id === contentStageInput.value;
      return `
        <button class="content-stage-option ${selected ? "is-selected" : ""}" type="button" role="radio" aria-checked="${selected}" data-content-choice="${stage.id}">
          <span class="content-stage-option-number">${String(index + 1).padStart(2, "0")}</span>
          <span class="content-stage-option-copy"><strong>${escapeHtml(stage.name)}</strong><small>${escapeHtml(stage.description)}</small></span>
          <span class="content-choice-check" aria-hidden="true">&#10003;</span>
        </button>
      `;
    }).join("");
    renderContentChipOptions(contentPlatformOptions, contentPlatformInput);
    renderContentChipOptions(contentFormatOptions, contentFormatInput);
    renderContentChipOptions(contentPillarOptions, contentPillarInput);
  }

  function renderContentChipOptions(container, select) {
    container.innerHTML = Array.from(select.options).map((option) => {
      const selected = option.value === select.value;
      return `<button class="content-choice-chip ${selected ? "is-selected" : ""}" type="button" role="radio" aria-checked="${selected}" data-content-choice="${escapeAttribute(option.value)}">${escapeHtml(option.textContent)}</button>`;
    }).join("");
  }

  function renderContentWork() {
    const studio = contentStudioState();
    const query = contentWorkSearch.value.trim().toLowerCase();
    const items = studio.items.filter((item) => contentMatchesQuery(item, query));
    const published = studio.items.filter((item) => item.stage === "published");
    const views = published.reduce((sum, item) => sum + item.metrics.views, 0);
    renderContentMetricCards(contentWorkMetrics, [
      ["Идей", studio.items.filter((item) => item.stage === "idea").length, true],
      ["В работе", studio.items.filter((item) => ["preparation", "production"].includes(item.stage)).length, false],
      ["Опубликовано", published.length, false],
      ["Просмотры", formatContentNumber(views), true]
    ]);
    if (!activeMobileContentStage) {
      activeMobileContentStage = contentStages.find((stage) => items.some((item) => item.stage === stage.id))?.id || "idea";
    }
    contentStageTabs.innerHTML = contentStages.map((stage) => `<button class="${stage.id === activeMobileContentStage ? "is-active" : ""}" type="button" data-content-stage-tab="${stage.id}">${stage.name}</button>`).join("");
    contentStageTabs.querySelectorAll("[data-content-stage-tab]").forEach((button) => button.addEventListener("click", () => {
      activeMobileContentStage = button.dataset.contentStageTab;
      renderContentWork();
    }));
    contentKanban.innerHTML = "";
    contentStages.forEach((stage) => {
      const stageItems = items.filter((item) => item.stage === stage.id);
      const column = document.createElement("section");
      column.className = `content-column ${stage.id === activeMobileContentStage ? "is-mobile-active" : ""}`;
      column.innerHTML = `<header class="content-column-header"><span>${stage.name}</span><span class="content-count">${stageItems.length}</span></header><div class="content-column-list"></div>`;
      const list = column.querySelector(".content-column-list");
      if (!stageItems.length) {
        list.innerHTML = `<p class="content-empty-state">${query ? "Ничего не найдено" : "Здесь пока пусто"}</p>`;
      } else {
        stageItems.sort(contentUpdatedSort).forEach((item) => list.appendChild(createContentCard(item)));
      }
      contentKanban.appendChild(column);
    });
  }

  function createContentCard(item) {
    const button = document.createElement("button");
    button.className = "content-card";
    button.type = "button";
    const detail = item.nextAction || item.hook || "Открой и добавь следующий шаг";
    button.innerHTML = `
      <span class="content-card-top"><span class="content-stage-chip">${escapeHtml(item.format || item.platform)}</span><span aria-hidden="true">•••</span></span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(detail)}</p>
      ${item.stage === "published" ? `<span class="content-card-result">${formatContentNumber(item.metrics.views)} просмотров</span>` : ""}
    `;
    button.addEventListener("click", () => openContentEditor(item.id));
    return button;
  }

  function renderContentIdeas() {
    const studio = contentStudioState();
    const query = contentIdeasSearch.value.trim().toLowerCase();
    const stage = contentStatusFilter.value || "all";
    const platform = contentPlatformFilter.value || "all";
    const items = studio.items
      .filter((item) => contentMatchesQuery(item, query))
      .filter((item) => stage === "all" || item.stage === stage)
      .filter((item) => platform === "all" || item.platform === platform)
      .sort(contentUpdatedSort);
    contentIdeasList.innerHTML = "";
    if (!items.length) {
      contentIdeasList.innerHTML = `<p class="content-empty-state">Идей по этим условиям пока нет.</p>`;
      return;
    }
    items.forEach((item) => {
      const row = document.createElement("article");
      row.className = "content-idea-row";
      row.tabIndex = 0;
      row.innerHTML = `
        <div class="content-row-meta"><span class="content-stage-chip">${contentStageName(item.stage)}</span><span>${escapeHtml(item.platform)}</span><span>${escapeHtml(item.pillar)}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.hook || item.nextAction || "Добавь хук и следующий шаг")}</p>
      `;
      row.addEventListener("click", () => openContentEditor(item.id));
      row.addEventListener("keydown", (event) => { if (event.key === "Enter") openContentEditor(item.id); });
      contentIdeasList.appendChild(row);
    });
  }

  function renderContentPlan() {
    const studio = contentStudioState();
    const planned = studio.items.filter((item) => item.publishDate).sort((a, b) => `${a.publishDate}${a.publishTime}`.localeCompare(`${b.publishDate}${b.publishTime}`));
    const todayKey = formatKey(new Date());
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekKey = formatKey(nextWeek);
    renderContentMetricCards(contentPlanSummary, [
      ["Запланировано", planned.filter((item) => item.stage !== "published").length, true],
      ["Ближайшие 7 дней", planned.filter((item) => item.publishDate >= todayKey && item.publishDate <= nextWeekKey && item.stage !== "published").length, false],
      ["Без даты", studio.items.filter((item) => item.stage !== "published" && !item.publishDate).length, false]
    ]);
    contentPlanList.innerHTML = "";
    if (!planned.length) {
      contentPlanList.innerHTML = `<p class="content-empty-state">Укажи дату публикации в карточке ролика — он появится здесь.</p>`;
      return;
    }
    planned.forEach((item) => {
      const row = document.createElement("article");
      row.className = "content-plan-item";
      row.tabIndex = 0;
      row.innerHTML = `
        <time class="content-plan-date" datetime="${item.publishDate}">${formatContentDate(item.publishDate)}${item.publishTime ? `<br>${escapeHtml(item.publishTime)}` : ""}</time>
        <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.platform)} · ${escapeHtml(item.format)} · ${escapeHtml(item.pillar)}</p></div>
        <span class="content-plan-status">${contentStageName(item.stage)}</span>
      `;
      row.addEventListener("click", () => openContentEditor(item.id));
      row.addEventListener("keydown", (event) => { if (event.key === "Enter") openContentEditor(item.id); });
      contentPlanList.appendChild(row);
    });
  }

  function renderContentAnalytics() {
    const period = contentAnalyticsPeriod.value || "30";
    const published = contentStudioState().items
      .filter((item) => item.stage === "published")
      .filter((item) => contentItemInPeriod(item, period));
    const totals = published.reduce((sum, item) => {
      Object.keys(sum).forEach((key) => { sum[key] += Number(item.metrics[key]) || 0; });
      return sum;
    }, { views: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, retention: 0 });
    const interactions = totals.likes + totals.comments + totals.shares + totals.saves;
    const engagement = totals.views ? (interactions / totals.views) * 100 : 0;
    const retention = published.length ? totals.retention / published.length : 0;
    renderContentMetricCards(contentAnalyticsMetrics, [
      ["Просмотры", formatContentNumber(totals.views), true],
      ["Охват", formatContentNumber(totals.reach), false],
      ["Вовлечённость", `${formatContentDecimal(engagement)}%`, true],
      ["Средний досмотр", `${formatContentDecimal(retention)}%`, false]
    ]);
    renderContentChart(published);
    renderContentInsights(published);
    renderContentTopList(published);
  }

  function renderContentChart(items) {
    const sorted = [...items].sort((a, b) => (a.publishDate || a.createdAt).localeCompare(b.publishDate || b.createdAt)).slice(-12);
    const max = Math.max(0, ...sorted.map((item) => item.metrics.views));
    if (!sorted.length || max === 0) {
      contentAnalyticsChart.innerHTML = `<p class="content-empty-state">Добавь просмотры опубликованным роликам, чтобы увидеть график.</p>`;
      return;
    }
    contentAnalyticsChart.innerHTML = sorted.map((item) => {
      const height = Math.max(8, Math.round((item.metrics.views / max) * 100));
      const top = item.metrics.views === max ? "is-top" : "";
      return `<button class="content-chart-bar ${top}" type="button" style="height:${height}%" data-content-id="${escapeAttribute(item.id)}" aria-label="${escapeAttribute(item.title)}, ${item.metrics.views} просмотров"><span>${formatContentNumber(item.metrics.views)}</span></button>`;
    }).join("");
    contentAnalyticsChart.querySelectorAll("[data-content-id]").forEach((button) => button.addEventListener("click", () => openContentEditor(button.dataset.contentId)));
  }

  function renderContentInsights(items) {
    if (!items.length) {
      contentInsights.innerHTML = `<p class="content-empty-state">После первой публикации здесь появятся выводы.</p>`;
      return;
    }
    const bestFormat = bestContentGroup(items, "format");
    const bestPlatform = bestContentGroup(items, "platform");
    const bestRetention = [...items].sort((a, b) => b.metrics.retention - a.metrics.retention)[0];
    const insights = [
      ["ЛУЧШИЙ ФОРМАТ", `${bestFormat.name}: в среднем ${formatContentNumber(bestFormat.average)} просмотров.`],
      ["СИЛЬНАЯ ПЛАТФОРМА", `${bestPlatform.name}: лучший средний результат.`],
      ["ЛУЧШИЙ ДОСМОТР", bestRetention.metrics.retention ? `«${bestRetention.title}» — ${formatContentDecimal(bestRetention.metrics.retention)}%.` : "Добавь процент досмотра в опубликованные ролики."]
    ];
    contentInsights.innerHTML = insights.map(([title, copy]) => `<div class="content-insight"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>`).join("");
  }

  function renderContentTopList(items) {
    const top = [...items].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5);
    if (!top.length) {
      contentTopList.innerHTML = `<p class="content-empty-state">Опубликованные ролики появятся здесь.</p>`;
      return;
    }
    contentTopList.innerHTML = top.map((item) => `
      <button class="content-top-row" type="button" data-content-id="${escapeAttribute(item.id)}">
        <strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.platform)}</span><span class="is-accent">${formatContentNumber(item.metrics.views)}</span><span>${formatContentDecimal(item.metrics.retention)}%</span>
      </button>
    `).join("");
    contentTopList.querySelectorAll("[data-content-id]").forEach((button) => button.addEventListener("click", () => openContentEditor(button.dataset.contentId)));
  }

  function renderContentTemplates() {
    const templates = contentStudioState().templates;
    contentTemplateList.innerHTML = "";
    templates.forEach((template) => {
      const card = document.createElement("article");
      card.className = "content-template-card";
      card.innerHTML = `
        <div class="content-template-top"><span class="content-stage-chip">${escapeHtml(template.format)}</span><span>${template.system ? "Встроенный" : "Мой шаблон"}</span></div>
        <h3>${escapeHtml(template.title)}</h3>
        <p>${escapeHtml(template.hook || template.body)}</p>
        <div class="content-template-actions"><button class="content-primary-button" type="button" data-use-template="${escapeAttribute(template.id)}">Использовать</button>${template.system ? "" : `<button class="content-secondary-button" type="button" data-edit-template="${escapeAttribute(template.id)}" aria-label="Изменить шаблон">Изменить</button>`}</div>
      `;
      card.querySelector("[data-use-template]").addEventListener("click", () => useContentTemplate(template.id));
      const editButton = card.querySelector("[data-edit-template]");
      if (editButton) editButton.addEventListener("click", () => openContentTemplateEditor(template.id));
      contentTemplateList.appendChild(card);
    });
  }

  function renderContentSettings() {
    const studio = contentStudioState();
    contentSpaceNameInput.value = studio.name;
    renderContentTokenSettings(contentPlatformSettings, studio.platforms, "platform");
    renderContentTokenSettings(contentPillarSettings, studio.pillars, "pillar");
  }

  function renderContentTokenSettings(container, values, kind) {
    container.innerHTML = values.map((value) => `<span class="content-token">${escapeHtml(value)}<button type="button" data-remove-content-setting="${kind}" data-value="${escapeAttribute(value)}" aria-label="Удалить ${escapeAttribute(value)}">×</button></span>`).join("");
    container.querySelectorAll("[data-remove-content-setting]").forEach((button) => button.addEventListener("click", () => removeContentSetting(button.dataset.removeContentSetting, button.dataset.value)));
  }

  function toggleContentSearch() {
    contentSearchBar.hidden = !contentSearchBar.hidden;
    if (!contentSearchBar.hidden) contentWorkSearch.focus();
  }

  function openContentEditor(id = null, options = {}) {
    const studio = contentStudioState();
    const existing = id ? studio.items.find((item) => item.id === id) : null;
    const template = options.template || null;
    editingContentId = existing ? existing.id : null;
    renderContentFilters();
    contentEditorTitle.textContent = existing ? "Изменить ролик" : "Новая идея";
    contentTitleInput.value = existing?.title || "";
    contentStageInput.value = existing?.stage || "idea";
    contentPlatformInput.value = existing?.platform || studio.platforms[0];
    contentFormatInput.value = existing?.format || template?.format || "Reels";
    contentPillarInput.value = existing?.pillar || studio.pillars[0];
    renderContentEditorChoices();
    contentHookInput.value = existing?.hook || template?.hook || "";
    contentScriptInput.value = existing?.script || template?.body || "";
    contentNextActionInput.value = existing?.nextAction || "";
    contentPublishDateInput.value = existing?.publishDate || (options.planned ? formatKey(new Date()) : "");
    contentPublishTimeInput.value = existing?.publishTime || "";
    const metrics = normalizeContentMetrics(existing?.metrics);
    contentViewsInput.value = metrics.views || "";
    contentReachInput.value = metrics.reach || "";
    contentLikesInput.value = metrics.likes || "";
    contentCommentsInput.value = metrics.comments || "";
    contentSharesInput.value = metrics.shares || "";
    contentSavesInput.value = metrics.saves || "";
    contentRetentionInput.value = metrics.retention || "";
    contentResultsSection.open = existing?.stage === "published" || Object.values(metrics).some((value) => Number(value) > 0);
    saveContentItemButton.textContent = existing ? "Сохранить изменения" : "Сохранить идею";
    deleteContentItemButton.hidden = !existing;
    contentEditorModal.classList.add("is-open");
    contentEditorModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    contentEditorPanel.scrollTop = 0;
    requestAnimationFrame(() => contentTitleInput.focus());
  }

  function closeContentEditor() {
    contentEditorModal.classList.remove("is-open");
    contentEditorModal.setAttribute("aria-hidden", "true");
    editingContentId = null;
    if (!contentTemplateModal.classList.contains("is-open")) document.body.classList.remove("modal-open");
  }

  function saveContentItemFromEditor() {
    const title = contentTitleInput.value.trim();
    if (!title) {
      contentTitleInput.focus();
      contentTitleInput.setCustomValidity("Напиши название ролика");
      contentTitleInput.reportValidity();
      contentTitleInput.setCustomValidity("");
      return;
    }
    const studio = contentStudioState();
    const existing = editingContentId ? studio.items.find((item) => item.id === editingContentId) : null;
    const timestamp = new Date().toISOString();
    const item = {
      id: existing?.id || `content-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: title.slice(0, 100),
      stage: contentStageInput.value,
      platform: contentPlatformInput.value,
      format: contentFormatInput.value,
      pillar: contentPillarInput.value,
      hook: contentHookInput.value.trim(),
      script: contentScriptInput.value.trim(),
      nextAction: contentNextActionInput.value.trim().slice(0, 140),
      publishDate: contentPublishDateInput.value,
      publishTime: contentPublishTimeInput.value,
      metrics: normalizeContentMetrics({
        views: contentViewsInput.value,
        reach: contentReachInput.value,
        likes: contentLikesInput.value,
        comments: contentCommentsInput.value,
        shares: contentSharesInput.value,
        saves: contentSavesInput.value,
        retention: contentRetentionInput.value
      }),
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    };
    if (item.stage === "published" && !item.publishDate) item.publishDate = formatKey(new Date());
    if (existing) Object.assign(existing, item);
    else studio.items.push(item);
    activeMobileContentStage = item.stage;
    saveContentStudioChanges();
    closeContentEditor();
  }

  function deleteContentItemFromEditor() {
    if (!editingContentId) return;
    const studio = contentStudioState();
    const item = studio.items.find((entry) => entry.id === editingContentId);
    if (!item || !window.confirm(`Удалить «${item.title}»?`)) return;
    studio.items = studio.items.filter((entry) => entry.id !== editingContentId);
    saveContentStudioChanges();
    closeContentEditor();
  }

  function openContentTemplateEditor(id = null) {
    const template = id ? contentStudioState().templates.find((entry) => entry.id === id && !entry.system) : null;
    editingContentTemplateId = template?.id || null;
    contentTemplateEditorTitle.textContent = template ? "Изменить шаблон" : "Новый шаблон";
    contentTemplateTitleInput.value = template?.title || "";
    contentTemplateFormatInput.value = template?.format || "Reels";
    contentTemplateHookInput.value = template?.hook || "";
    contentTemplateBodyInput.value = template?.body || "";
    deleteContentTemplateButton.hidden = !template;
    contentTemplateModal.classList.add("is-open");
    contentTemplateModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => contentTemplateTitleInput.focus());
  }

  function closeContentTemplateEditor() {
    contentTemplateModal.classList.remove("is-open");
    contentTemplateModal.setAttribute("aria-hidden", "true");
    editingContentTemplateId = null;
    if (!contentEditorModal.classList.contains("is-open")) document.body.classList.remove("modal-open");
  }

  function saveContentTemplateFromEditor() {
    const title = contentTemplateTitleInput.value.trim();
    if (!title) {
      contentTemplateTitleInput.focus();
      return;
    }
    const studio = contentStudioState();
    const existing = editingContentTemplateId ? studio.templates.find((entry) => entry.id === editingContentTemplateId && !entry.system) : null;
    const template = {
      id: existing?.id || `content-template-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: title.slice(0, 60),
      format: contentTemplateFormatInput.value,
      hook: contentTemplateHookInput.value.trim(),
      body: contentTemplateBodyInput.value.trim(),
      system: false,
      updatedAt: new Date().toISOString()
    };
    if (existing) Object.assign(existing, template);
    else studio.templates.push(template);
    saveContentStudioChanges();
    closeContentTemplateEditor();
  }

  function deleteContentTemplateFromEditor() {
    if (!editingContentTemplateId) return;
    const studio = contentStudioState();
    const template = studio.templates.find((entry) => entry.id === editingContentTemplateId && !entry.system);
    if (!template || !window.confirm(`Удалить шаблон «${template.title}»?`)) return;
    studio.templates = studio.templates.filter((entry) => entry.id !== editingContentTemplateId);
    saveContentStudioChanges();
    closeContentTemplateEditor();
  }

  function useContentTemplate(id) {
    const template = contentStudioState().templates.find((entry) => entry.id === id);
    if (!template) return;
    openContentEditor(null, { template });
  }

  function saveContentSpaceName() {
    const name = contentSpaceNameInput.value.trim().slice(0, 32);
    if (!name) {
      contentSpaceNameInput.focus();
      return;
    }
    contentStudioState().name = name;
    saveContentStudioChanges();
  }

  function addContentSetting(kind) {
    const studio = contentStudioState();
    const isPlatform = kind === "platform";
    const input = isPlatform ? newContentPlatform : newContentPillar;
    const key = isPlatform ? "platforms" : "pillars";
    const value = input.value.trim().slice(0, isPlatform ? 20 : 24);
    if (!value) {
      input.focus();
      return;
    }
    if (!studio[key].some((entry) => entry.toLowerCase() === value.toLowerCase())) studio[key].push(value);
    input.value = "";
    saveContentStudioChanges();
  }

  function removeContentSetting(kind, value) {
    const studio = contentStudioState();
    const key = kind === "platform" ? "platforms" : "pillars";
    if (studio[key].length <= 1) return;
    studio[key] = studio[key].filter((entry) => entry !== value);
    saveContentStudioChanges();
  }

  function resetContentStudio() {
    if (!window.confirm("Очистить идеи, аналитику и пользовательские шаблоны контент-пространства? Календари останутся без изменений.")) return;
    state.contentStudio = defaultContentStudio();
    saveContentStudioChanges();
    showContentView("work");
  }

  function saveContentStudioChanges() {
    const updatedAt = new Date().toISOString();
    contentStudioState().updatedAt = updatedAt;
    state.contentStudioUpdatedAt = updatedAt;
    saveState();
    renderContentStudio();
  }

  function renderContentMetricCards(container, values) {
    container.innerHTML = values.map(([label, value, accent]) => `<article class="content-metric-card ${accent ? "is-accent" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
  }

  function contentMatchesQuery(item, query) {
    if (!query) return true;
    return [item.title, item.platform, item.format, item.pillar, item.hook, item.script, item.nextAction]
      .some((value) => String(value || "").toLowerCase().includes(query));
  }

  function contentUpdatedSort(a, b) {
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  }

  function contentStageName(id) {
    return contentStages.find((stage) => stage.id === id)?.name || "Идея";
  }

  function formatContentNumber(value) {
    const number = Number(value) || 0;
    if (number < 1000) return String(Math.round(number));
    return new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(number);
  }

  function formatContentDecimal(value) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Number(value) || 0);
  }

  function formatContentDate(key) {
    const parts = String(key || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return "Без даты";
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(parts[0], parts[1] - 1, parts[2]));
  }

  function contentItemInPeriod(item, period) {
    if (period === "all") return true;
    const source = item.publishDate ? new Date(`${item.publishDate}T12:00:00`) : new Date(item.createdAt);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - Number(period || 30));
    return Number.isFinite(source.getTime()) && source >= threshold;
  }

  function bestContentGroup(items, key) {
    const groups = new Map();
    items.forEach((item) => {
      const name = item[key] || "Не указано";
      const current = groups.get(name) || { total: 0, count: 0 };
      current.total += item.metrics.views;
      current.count += 1;
      groups.set(name, current);
    });
    return [...groups.entries()]
      .map(([name, value]) => ({ name, average: value.count ? value.total / value.count : 0 }))
      .sort((a, b) => b.average - a.average)[0] || { name: "Нет данных", average: 0 };
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
    const store = calendarStore();
    if (!store.entries[key]) {
      store.entries[key] = { tasks: {}, energy: 5, notes: "", updatedAt: new Date().toISOString() };
      store.updatedAt = new Date().toISOString();
    }
    return store.entries[key];
  }

  function readEntry(key) {
    return readEntryForCalendar(key, activeCalendar().id);
  }

  function readEntryForCalendar(key, calendarId) {
    return calendarStore(calendarId).entries[key] || { tasks: {}, energy: 5, notes: "" };
  }

  function isNotesInputActive() {
    return isNotesComposing || document.activeElement === dayNotes;
  }

  function captureActiveNotesDraft() {
    if (!isNotesInputActive()) return false;
    return saveNotesDraft({ cloudDelay: null });
  }

  function saveNotesDraft(options = {}) {
    if (!selectedKey) return false;
    const entry = ensureEntry(selectedKey);
    const nextNotes = dayNotes.value;
    const changed = entry.notes !== nextNotes;
    if (changed) {
      entry.notes = nextNotes;
      entry.updatedAt = new Date().toISOString();
      saveState({ skipCloud: true });
    }

    if (options.cloudDelay !== null && (changed || options.cloudDelay <= 100)) {
      clearTimeout(notesCloudSaveTimer);
      notesCloudSaveTimer = setTimeout(() => {
        notesCloudSaveTimer = null;
        scheduleCloudSave(0);
      }, Math.max(0, Number(options.cloudDelay) || 0));
    }
    return changed;
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
      navigator.serviceWorker.register("sw.js?v=38").then((registration) => registration.update()).catch(() => {});
    });
  }
})();
