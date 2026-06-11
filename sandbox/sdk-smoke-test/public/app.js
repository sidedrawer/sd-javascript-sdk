const MODE_PRESETS = {
  mock: {
    baseUrl: window.location.origin,
    sidedrawerId: "test",
    recordId: "test",
  },
  uat: {
    baseUrl: "https://api-uat.sidedraweruat.com",
    sidedrawerId: "69fb528a795f942d4a5bd3b7",
    recordId: "69fb554a795f942d4a5be4b0",
  },
};

const $ = (id) => document.getElementById(id);

const logEl = $("log");
const modeEl = $("mode");
const baseUrlEl = $("baseUrl");
const accessTokenEl = $("accessToken");
const sidedrawerIdEl = $("sidedrawerId");
const recordIdEl = $("recordId");
const maxUploadMBsEl = $("maxUploadMBs");
const fileTokenEl = $("fileToken");
const fileNameWithExtensionEl = $("fileNameWithExtension");
const fileInputEl = $("fileInput");
const uploadProgressEl = $("uploadProgress");
const uploadProgressLabelEl = $("uploadProgressLabel");
const downloadResponseTypeEl = $("downloadResponseType");
const btnAbortEl = $("btnAbort");

const SEARCH_FILTER_IDS = {
  name: "searchName",
  uniqueReference: "searchUniqueReference",
  recordTypeName: "searchRecordTypeName",
  recordSubtypeName: "searchRecordSubtypeName",
  recordTypeId: "searchRecordTypeId",
  status: "searchStatus",
  externalKey: "searchExternalKey",
  externalKeyValue: "searchExternalKeyValue",
  limit: "searchLimit",
  locale: "searchLocale",
};

const UPLOAD_EXTRA_IDS = {
  displayType: "uploadDisplayType",
  envelopeId: "uploadEnvelopeId",
  correlationId: "uploadCorrelationId",
  fileExtension: "uploadFileExtension",
};

const UPLOAD_OPTION_IDS = {
  maxRetries: "uploadMaxRetries",
  maxConcurrency: "uploadMaxConcurrency",
  maxChunkSizeBytes: "uploadMaxChunkSizeBytes",
};

let uploadAbortController = null;

function log(message, type = "info") {
  const line = document.createElement("div");
  line.className = `log-${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function getConfig() {
  return {
    baseUrl: baseUrlEl.value.trim(),
    sidedrawerId: sidedrawerIdEl.value.trim(),
    recordId: recordIdEl.value.trim(),
  };
}

function applyMode(mode) {
  const preset = MODE_PRESETS[mode];
  if (!preset) return;
  baseUrlEl.value = preset.baseUrl;
  sidedrawerIdEl.value = preset.sidedrawerId;
  recordIdEl.value = preset.recordId;
}

function collectStringMap(idMap) {
  const out = {};
  for (const [param, id] of Object.entries(idMap)) {
    const value = $(id)?.value.trim();
    if (value) out[param] = value;
  }
  return out;
}

function collectNumberMap(idMap) {
  const out = {};
  for (const [param, id] of Object.entries(idMap)) {
    const raw = $(id)?.value.trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid number for ${param}: "${raw}"`);
    }
    out[param] = value;
  }
  return out;
}

function parseJsonField(id, label) {
  const raw = $(id)?.value.trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${label}: ${err.message}`);
  }
}

function createSdk() {
  const accessToken = accessTokenEl.value.trim();
  const { baseUrl } = getConfig();

  if (!accessToken) {
    throw new Error("Access token is required");
  }
  if (!baseUrl) {
    throw new Error("Base URL is required");
  }

  return new sidedrawer.SideDrawer({
    baseUrl,
    accessToken,
  });
}

function setUploadProgress(value) {
  uploadProgressEl.value = value;
  uploadProgressLabelEl.textContent = `${value}%`;
}

function resetProgress() {
  setUploadProgress(0);
}

function saveBlobToDisk(data, filename) {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data], { type: "application/octet-stream" });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

modeEl.addEventListener("change", () => {
  applyMode(modeEl.value);
  log(`Mode -> ${modeEl.value} (defaults reloaded)`, "info");
});

$("btnFetchUploadLimit").addEventListener("click", async () => {
  const { sidedrawerId } = getConfig();
  if (!sidedrawerId) {
    log("upload limit — sidedrawerId is required", "err");
    return;
  }

  log(`upload limit — fetching /home for sidedrawer ${sidedrawerId}…`);

  try {
    const sd = createSdk();
    const path = `/api/v1/records/sidedrawer/sidedrawer-id/${encodeURIComponent(
      sidedrawerId
    )}/home?locale=en-CA`;

    const home = await sd.context.http.get(path);
    const features = home?.subscriptionFeatures ?? home?.[0]?.subscriptionFeatures;

    if (!features) {
      log(
        "upload limit — response does not include subscriptionFeatures",
        "err"
      );
      return;
    }

    const raw = features["sidedrawer.maxUploadMBs"];
    if (raw == null || raw === "") {
      log(
        "upload limit — subscriptionFeatures.sidedrawer.maxUploadMBs is missing (backend will decide)",
        "info"
      );
      maxUploadMBsEl.value = "";
      return;
    }

    const parsed = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      log(`upload limit — could not parse value: "${raw}"`, "err");
      return;
    }

    maxUploadMBsEl.value = String(parsed);
    log(`upload limit — OK (maxUploadMBs = ${parsed} MB)`, "ok");
  } catch (err) {
    log(`upload limit — ${err.message ?? err}`, "err");
  }
});

$("btnSearch").addEventListener("click", async () => {
  const { sidedrawerId } = getConfig();
  if (!sidedrawerId) {
    log("records.search — sidedrawerId is required", "err");
    return;
  }

  log("records.search — sending request…");

  try {
    const sd = createSdk();
    const filters = collectStringMap(SEARCH_FILTER_IDS);
    const displayInactive = $("searchDisplayInactive").checked;

    const records = await sd.records.search({
      sidedrawerId,
      displayInactive,
      ...filters,
    });

    const count = Array.isArray(records) ? records.length : 0;
    log(`records.search — OK (${count} record(s))`, "ok");
    log(JSON.stringify(records, null, 2), "info");
  } catch (err) {
    log(`records.search — ${err.message ?? err}`, "err");
  }
});

$("btnError").addEventListener("click", async () => {
  log("HttpServiceError — triggering 404…");

  try {
    const sd = createSdk();
    await sd.context.http.get("/api/v2/smoke/trigger-404");
    log("HttpServiceError — expected failure but request succeeded", "err");
  } catch (err) {
    const status = err?.response?.status;
    const fields = [
      err.message && `message: ${err.message}`,
      err.code && `code: ${err.code}`,
      status != null && `response.status: ${status}`,
      err.request != null && "request: present",
      err.response != null && "response: present",
    ]
      .filter(Boolean)
      .join(", ");

    log(`HttpServiceError — caught (${fields})`, "ok");

    if (err?.response?.data != null) {
      try {
        const bodyPreview = JSON.stringify(err.response.data).slice(0, 200);
        log(`HttpServiceError.body — ${bodyPreview}`, "info");
      } catch {
        log(`HttpServiceError.body — (non-serializable payload)`, "info");
      }
    }
  }
});

$("btnUpload").addEventListener("click", async () => {
  const file = fileInputEl.files?.[0];

  if (!file) {
    log("files.upload — select a file first", "err");
    return;
  }

  const { sidedrawerId, recordId } = getConfig();
  if (!sidedrawerId || !recordId) {
    log("files.upload — sidedrawerId and recordId are required", "err");
    return;
  }

  let metadata;
  let externalKeys;
  let uploadOptions;
  let maxUploadMBs;

  try {
    metadata = parseJsonField("uploadMetadata", "metadata");
    externalKeys = parseJsonField("uploadExternalKeys", "externalKeys");
    uploadOptions = collectNumberMap(UPLOAD_OPTION_IDS);

    const rawMaxUpload = maxUploadMBsEl.value.trim();
    if (rawMaxUpload) {
      const parsed = Number(rawMaxUpload);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid Max upload (MB): "${rawMaxUpload}"`);
      }
      maxUploadMBs = parsed;
    }
  } catch (err) {
    log(`files.upload — ${err.message}`, "err");
    return;
  }

  const extras = collectStringMap(UPLOAD_EXTRA_IDS);

  uploadAbortController = new AbortController();
  btnAbortEl.disabled = false;
  setUploadProgress(0);

  const progressSubscriber$ = {
    next(percentage) {
      setUploadProgress(percentage);
    },
  };

  log(`files.upload — uploading "${file.name}" (${file.size} bytes)…`);

  try {
    const sd = createSdk();
    const params = {
      sidedrawerId,
      recordId,
      file,
      fileName: `browser-${Date.now()}`,
      uploadTitle: file.name,
      fileType: "document",
      ...extras,
      ...uploadOptions,
      progressSubscriber$,
      signal: uploadAbortController.signal,
    };

    if (metadata !== undefined) params.metadata = metadata;
    if (externalKeys !== undefined) params.externalKeys = externalKeys;
    if (maxUploadMBs !== undefined) {
      params.maxUploadMBs = maxUploadMBs;
      log(
        `files.upload — preflight active: maxUploadMBs=${maxUploadMBs} (file=${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)} MB)`,
        "info"
      );
    }

    const result = await sd.files.upload(params);

    if (result?.fileToken) {
      fileTokenEl.value = result.fileToken;
      log(`files.upload — OK (fileToken: ${result.fileToken})`, "ok");
      log(JSON.stringify(result, null, 2), "info");
    } else if (result?._id ?? result?.id) {
      log(`files.upload — OK (id: ${result._id ?? result.id})`, "ok");
      log(JSON.stringify(result, null, 2), "info");
    } else {
      log(`files.upload — unexpected result: ${JSON.stringify(result)}`, "err");
    }
  } catch (err) {
    const code = err?.code;
    const status = err?.response?.status;
    const tags = [code && `code=${code}`, status != null && `status=${status}`]
      .filter(Boolean)
      .join(" ");
    log(
      `files.upload — ${err.message ?? err}${tags ? `  [${tags}]` : ""}`,
      "err"
    );
    if (err?.response?.data != null) {
      try {
        log(
          `files.upload.body — ${JSON.stringify(err.response.data).slice(0, 300)}`,
          "info"
        );
      } catch {
        /* non-serializable */
      }
    }
  } finally {
    uploadAbortController = null;
    btnAbortEl.disabled = true;
  }
});

btnAbortEl.addEventListener("click", () => {
  if (uploadAbortController) {
    log("files.upload — aborting…", "info");
    uploadAbortController.abort();
  }
});

// ─────────────────────────────────────────────────────────────────────
// Download (DownloadSession + IndexedDB)
// ─────────────────────────────────────────────────────────────────────
//
// Uses the high-level `DownloadSession` class with an
// `IndexedDBDownloadStorage` adapter. Chunks and offset are persisted
// to IDB as they arrive, so closing the tab and re-opening still lets
// you resume from the same byte via `restoreDownloadSession`.

const sessionStateEl = $("sessionState");
const sessionIdEl = $("sessionId");
const sessionOffsetEl = $("sessionOffset");
const sessionProgressEl = $("sessionProgress");
const sessionProgressLabelEl = $("sessionProgressLabel");
const btnSessionStartEl = $("btnSessionStart");
const btnSessionPauseEl = $("btnSessionPause");
const btnSessionResumeEl = $("btnSessionResume");
const btnSessionCancelEl = $("btnSessionCancel");
const btnSessionListEl = $("btnSessionList");
const btnSessionRestoreEl = $("btnSessionRestore");
const btnSessionClearAllEl = $("btnSessionClearAll");
const sessionPendingSelectEl = $("sessionPendingSelect");

// Lazy IDB storage adapter (created on first interaction so importing
// the SDK on Node-like environments doesn't try to touch indexedDB).
// Avoid the name `sessionStorage` — it shadows the browser global.
let idbStorageAdapter = null;
function getSessionStorage() {
  if (!idbStorageAdapter) {
    idbStorageAdapter = sidedrawer.createIndexedDBDownloadStorage();
  }
  return idbStorageAdapter;
}

let activeSession = null;
let activeSubs = [];
function unsubscribeAll() {
  for (const s of activeSubs) {
    try {
      s.unsubscribe();
    } catch {
      /* noop */
    }
  }
  activeSubs = [];
}

function paintSession(state, progress) {
  sessionStateEl.textContent = state ?? "—";
  if (progress) {
    sessionOffsetEl.textContent = progress.total
      ? `${progress.offset.toLocaleString()} / ${progress.total.toLocaleString()}`
      : progress.offset.toLocaleString();
    const pct =
      progress.percentage != null
        ? Math.round(progress.percentage)
        : 0;
    sessionProgressEl.value = pct;
    sessionProgressLabelEl.textContent = `${pct}%`;
  }
}

function bindSession(session) {
  unsubscribeAll();
  activeSession = session;
  sessionIdEl.textContent = session.id;

  activeSubs.push(
    session.state$.subscribe((state) => {
      paintSession(state, session.getProgress());
      // Mirror state into button enable flags.
      const isRunning = state === "running";
      const isPaused = state === "paused";
      const isTerminal =
        state === "completed" || state === "canceled" || state === "failed";
      btnSessionPauseEl.disabled = !isRunning;
      btnSessionResumeEl.disabled = !isPaused;
      btnSessionCancelEl.disabled = isTerminal || state === "idle";
      btnSessionStartEl.disabled = isRunning || isPaused;
      if (state !== "idle") {
        log(`DownloadSession[${shortId(session.id)}] → ${state}`, "info");
      }
    })
  );

  activeSubs.push(
    session.progress$.subscribe((progress) => {
      paintSession(session.getState(), progress);
    })
  );

  activeSubs.push(
    session.result$.subscribe({
      next: (payload) => {
        if (!payload) {
          log(
            `DownloadSession[${shortId(session.id)}] — completed (no payload — discarded)`,
            "ok"
          );
          return;
        }
        const fileNameInput = document
          .getElementById("fileNameWithExtension")
          .value.trim();
        const fileTokenForName = document
          .getElementById("fileToken")
          .value.trim();
        const filename =
          fileNameInput ||
          (fileTokenForName
            ? `download-${fileTokenForName.slice(0, 8)}.bin`
            : `session-${shortId(session.id)}.bin`);
        saveBlobToDisk(payload, filename);
        log(
          `DownloadSession[${shortId(session.id)}] — completed, saved as "${filename}"`,
          "ok"
        );
      },
      error: (err) => {
        log(
          `DownloadSession[${shortId(session.id)}] — error: ${err?.message ?? err}`,
          "err"
        );
      },
    })
  );
}

function shortId(id) {
  return id.length > 40 ? `${id.slice(0, 18)}…${id.slice(-18)}` : id;
}

btnSessionStartEl.addEventListener("click", () => {
  const sdk = createSdk();
  if (!sdk) return;
  const sidedrawerId = sidedrawerIdEl.value.trim();
  const recordId = recordIdEl.value.trim();
  const fileToken = document.getElementById("fileToken").value.trim();
  const fileNameWithExtension = document
    .getElementById("fileNameWithExtension")
    .value.trim();
  const responseType = downloadResponseTypeEl.value || "blob";

  if (!sidedrawerId || !recordId) {
    log("DownloadSession — sidedrawerId and recordId are required", "err");
    return;
  }
  if (!fileToken && !fileNameWithExtension) {
    log(
      "DownloadSession — either fileToken or fileNameWithExtension is required",
      "err"
    );
    return;
  }

  const session = sdk.files.createDownloadSession({
    sidedrawerId,
    recordId,
    fileToken: fileToken || undefined,
    fileNameWithExtension: fileNameWithExtension || undefined,
    responseType,
    storage: getSessionStorage(),
  });
  bindSession(session);
  log(
    `DownloadSession — created (id=${shortId(session.id)}), starting…`,
    "info"
  );
  session.start();
});

btnSessionPauseEl.addEventListener("click", () => {
  if (!activeSession) return;
  log("DownloadSession — pause()", "info");
  activeSession.pause();
});

btnSessionResumeEl.addEventListener("click", () => {
  if (!activeSession) return;
  log("DownloadSession — resume()", "info");
  activeSession.resume();
});

btnSessionCancelEl.addEventListener("click", () => {
  if (!activeSession) return;
  log("DownloadSession — cancel() (clears IDB)", "info");
  activeSession.cancel();
});

btnSessionListEl.addEventListener("click", async () => {
  const sdk = createSdk();
  if (!sdk) return;
  try {
    const pending = await sdk.files.listPendingDownloads(getSessionStorage());
    sessionPendingSelectEl.innerHTML = "";
    if (pending.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "(no pending sessions in IDB)";
      sessionPendingSelectEl.appendChild(opt);
      sessionPendingSelectEl.disabled = true;
      btnSessionRestoreEl.disabled = true;
      log("DownloadSession — no pending sessions in IDB", "info");
      return;
    }
    for (const meta of pending) {
      const opt = document.createElement("option");
      opt.value = meta.sessionId;
      const pct = meta.fileSize
        ? ` (${Math.round((meta.offset / meta.fileSize) * 100)}%)`
        : "";
      opt.textContent = `${shortId(meta.sessionId)} — offset ${meta.offset}${pct}`;
      sessionPendingSelectEl.appendChild(opt);
    }
    sessionPendingSelectEl.disabled = false;
    btnSessionRestoreEl.disabled = false;
    log(
      `DownloadSession — found ${pending.length} pending session(s) in IDB`,
      "ok"
    );
  } catch (err) {
    log(`DownloadSession — listPendingDownloads error: ${err?.message ?? err}`, "err");
  }
});

btnSessionRestoreEl.addEventListener("click", async () => {
  const sdk = createSdk();
  if (!sdk) return;
  const sessionId = sessionPendingSelectEl.value;
  if (!sessionId) return;
  try {
    const session = await sdk.files.restoreDownloadSession(sessionId, {
      storage: getSessionStorage(),
    });
    if (!session) {
      log(`DownloadSession — no meta for "${sessionId}" in IDB`, "err");
      return;
    }
    bindSession(session);
    log(
      `DownloadSession — restored ${shortId(session.id)}, resuming…`,
      "info"
    );
    session.resume();
  } catch (err) {
    log(`DownloadSession — restore error: ${err?.message ?? err}`, "err");
  }
});

btnSessionClearAllEl.addEventListener("click", async () => {
  try {
    const storage = getSessionStorage();
    const all = await storage.listSessions();
    for (const meta of all) {
      await storage.clear(meta.sessionId);
    }
    sessionPendingSelectEl.innerHTML =
      '<option value="">(no pending sessions in IDB)</option>';
    sessionPendingSelectEl.disabled = true;
    btnSessionRestoreEl.disabled = true;
    log(`DownloadSession — cleared ${all.length} session(s) from IDB`, "ok");
  } catch (err) {
    log(`DownloadSession — clear error: ${err?.message ?? err}`, "err");
  }
});

applyMode(modeEl.value);
resetProgress();
log(`Ready — targeting ${baseUrlEl.value || "(unset)"}`, "ok");
