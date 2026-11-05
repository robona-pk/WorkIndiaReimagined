/* WorkIndia Reimagined — mic capture for the recruiter's own call recording.
 *
 * The "recorded call" shown in the Calls tab must be what the recruiter
 * actually says to the candidate, not a placeholder clip. This module:
 *   - asks for mic access and records while a platform call is connected
 *   - stores the resulting audio (a real Blob) in IndexedDB, keyed by
 *     candidate id, so it survives reloads within the same browser
 *   - has no fallback audio: if mic access is denied or unsupported, the
 *     call simply has no recording — never a canned substitute.
 */
(function (global) {
  "use strict";

  var DB_NAME = "wi_call_recordings";
  var STORE = "calls";
  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error("indexedDB unavailable")); return; }
      var req = global.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function saveRecording(id, blob) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(blob, id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getRecording(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return null; });
  }

  var activeStream = null;
  var activeRecorder = null;
  var chunks = [];
  var lastError = null;

  function pickMimeType() {
    if (!global.MediaRecorder || !global.MediaRecorder.isTypeSupported) return "";
    var candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (var i = 0; i < candidates.length; i++) {
      if (global.MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return "";
  }

  // Starts capturing the recruiter's mic. Resolves true once recording has
  // actually started, false if mic access isn't available or is denied —
  // callers should treat false as "no recording will exist for this call."
  function startCapture() {
    lastError = null;
    chunks = [];
    if (!global.navigator || !global.navigator.mediaDevices || !global.navigator.mediaDevices.getUserMedia || !global.MediaRecorder) {
      lastError = "unsupported";
      return Promise.resolve(false);
    }
    return global.navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      activeStream = stream;
      var mimeType = pickMimeType();
      try {
        activeRecorder = mimeType ? new global.MediaRecorder(stream, { mimeType: mimeType }) : new global.MediaRecorder(stream);
      } catch (e) {
        activeRecorder = new global.MediaRecorder(stream);
      }
      activeRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      activeRecorder.start();
      return true;
    }).catch(function (err) {
      lastError = (err && err.name) || "denied";
      cleanupStream();
      return false;
    });
  }

  // Stops capture (if running) and saves the result for candidateId.
  // Resolves the Blob on success, or null if there's nothing to save.
  function stopCapture(candidateId) {
    if (!activeRecorder || activeRecorder.state === "inactive") {
      cleanupStream();
      return Promise.resolve(null);
    }
    var recorder = activeRecorder;
    return new Promise(function (resolve) {
      recorder.onstop = function () {
        var blob = chunks.length ? new Blob(chunks, { type: recorder.mimeType || "audio/webm" }) : null;
        cleanupStream();
        if (!blob || blob.size < 400) { resolve(null); return; }
        saveRecording(candidateId, blob).then(function () { resolve(blob); }).catch(function () { resolve(null); });
      };
      try { recorder.stop(); } catch (e) { cleanupStream(); resolve(null); }
    });
  }

  // Abandons any in-progress capture without saving (e.g. call window closed).
  function discardCapture() {
    if (activeRecorder && activeRecorder.state !== "inactive") {
      try { activeRecorder.stop(); } catch (e) { /* ignore */ }
    }
    cleanupStream();
  }

  function cleanupStream() {
    if (activeStream) {
      activeStream.getTracks().forEach(function (t) { t.stop(); });
    }
    activeStream = null;
    activeRecorder = null;
    chunks = [];
  }

  function getLastError() { return lastError; }

  global.WI_RECORDER = {
    startCapture: startCapture,
    stopCapture: stopCapture,
    discardCapture: discardCapture,
    getRecording: getRecording,
    getLastError: getLastError
  };
})(window);
