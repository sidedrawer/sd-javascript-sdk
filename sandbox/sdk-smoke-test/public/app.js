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
const downloadProgressEl = $("downloadProgress");
const downloadProgressLabelEl = $("downloadProgressLabel");
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

function setDownloadProgress(value) {
  downloadProgressEl.value = value;
  downloadProgressLabelEl.textContent = `${value}%`;
}

function resetProgress() {
  setUploadProgress(0);
  setDownloadProgress(0);
}

function resolveDownloadFilename(fileToken, fileNameWithExtension) {
  if (fileNameWithExtension) {
    return fileNameWithExtension;
  }

  const uploadedName = fileInputEl.files?.[0]?.name;
  if (uploadedName) {
    return uploadedName;
  }

  if (fileToken) {
    return `download-${fileToken.slice(0, 8)}.bin`;
  }

  return `download-${Date.now()}.bin`;
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

$("btnDownload").addEventListener("click", async () => {
  const fileToken = fileTokenEl.value.trim();
  const fileNameWithExtension = fileNameWithExtensionEl.value.trim();

  if (!fileToken && !fileNameWithExtension) {
    log(
      "files.download — provide a file token (from upload) or file name with extension",
      "err"
    );
    return;
  }

  const { sidedrawerId, recordId } = getConfig();
  if (!sidedrawerId || !recordId) {
    log("files.download — sidedrawerId and recordId are required", "err");
    return;
  }

  setDownloadProgress(0);
  log("files.download — requesting binary…");

  const progressSubscriber$ = {
    next(percentage) {
      setDownloadProgress(percentage);
    },
  };

  const responseType = downloadResponseTypeEl.value || "blob";

  const downloadParams = {
    sidedrawerId,
    recordId,
    responseType,
    progressSubscriber$,
  };

  if (fileToken) {
    downloadParams.fileToken = fileToken;
  } else {
    downloadParams.fileNameWithExtension = fileNameWithExtension;
  }

  try {
    const sd = createSdk();
    const file = await sd.files.download(downloadParams);

    const size =
      file instanceof Blob
        ? file.size
        : file instanceof ArrayBuffer
          ? file.byteLength
          : (file?.byteLength ?? 0);
    const filename = resolveDownloadFilename(fileToken, fileNameWithExtension);

    saveBlobToDisk(file, filename);
    log(
      `files.download — OK (${size} bytes, responseType=${responseType}) — saved as "${filename}"`,
      "ok"
    );
  } catch (err) {
    log(`files.download — ${err.message ?? err}`, "err");
  }
});

applyMode(modeEl.value);
resetProgress();
log(`Ready — targeting ${baseUrlEl.value || "(unset)"}`, "ok");
