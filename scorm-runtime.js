/* SCORM 1.2 runtime – independent of the exercise UI. */
(function (global) {
  "use strict";
  var api = null, initialized = false, finished = false, completed = false;
  function locate(start) {
    var current = start, depth = 0;
    while (current && depth < 12) {
      try { if (current.API && typeof current.API.LMSInitialize === "function") return current.API; } catch (e) {}
      try { if (current.parent === current) break; current = current.parent; } catch (e) { break; }
      depth++;
    }
    return null;
  }
  try { api = locate(global) || (global.opener ? locate(global.opener) : null); } catch (e) { api = null; }
  if (api) {
    try {
      initialized = api.LMSInitialize("") === "true";
      if (initialized) {
        var status = api.LMSGetValue("cmi.core.lesson_status");
        completed = status === "completed" || status === "passed";
        if (!completed && (!status || status === "not attempted")) {
          api.LMSSetValue("cmi.core.lesson_status", "incomplete");
          api.LMSCommit("");
        }
      }
    } catch (e) { initialized = false; }
  }
  function put(key, value) {
    if (!initialized || finished) return false;
    try { return api.LMSSetValue(key, String(value)) === "true"; } catch (e) { return false; }
  }
  function commit() {
    if (!initialized || finished) return;
    try { api.LMSCommit(""); } catch (e) {}
  }
  function loadState() {
    if (!initialized) return null;
    try {
      var raw = api.LMSGetValue("cmi.suspend_data");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveState(state) {
    if (!initialized || finished) return;
    var raw = JSON.stringify(state);
    // SCORM 1.2 guarantees 4096 characters for suspend_data.
    if (raw.length > 3900) { console.error("SCORM state is too large to save safely"); return; }
    put("cmi.suspend_data", raw);
    commit();
  }
  function setScore(score) {
    if (!initialized || finished) return;
    put("cmi.core.score.min", 0);
    put("cmi.core.score.max", 24);
    put("cmi.core.score.raw", Math.max(0, Math.min(24, Number(score) || 0)));
    commit();
  }
  function complete(state, score) {
    if (!initialized || finished) return;
    saveState(state);
    setScore(score);
    put("cmi.core.lesson_status", "completed");
    put("cmi.core.exit", "");
    completed = true;
    commit();
  }
  function finish() {
    if (!initialized || finished) return;
    if (!completed) put("cmi.core.exit", "suspend");
    commit();
    try { api.LMSFinish(""); } catch (e) {}
    finished = true;
  }
  global.SzofajSCORM = { isConnected: initialized, loadState: loadState, saveState: saveState, setScore: setScore, complete: complete, finish: finish };
  global.addEventListener("pagehide", finish);
  global.addEventListener("beforeunload", finish);
})(window);
