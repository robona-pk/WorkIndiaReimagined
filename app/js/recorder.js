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

  // ---- live speech-to-text, so the post-call "summary" reflects what was
  // actually said instead of a canned line. Uses the browser's own
  // SpeechRecognition (Chrome/Edge); where it isn't available, transcription
  // simply doesn't happen — callers must treat an empty transcript as "no
  // transcript," never fill in a fabricated one. ----
  var SpeechRecognitionCtor = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  var recognizer = null;
  var recognitionWanted = false; // true while a call is "supposed" to be transcribing — lets onend auto-restart after a browser-forced stop
  var transcriptParts = [];

  function transcriptionSupported() { return !!SpeechRecognitionCtor; }

  function startTranscription() {
    transcriptParts = [];
    if (!SpeechRecognitionCtor) return false;
    recognitionWanted = true;
    try {
      recognizer = new SpeechRecognitionCtor();
      recognizer.continuous = true;
      recognizer.interimResults = false;
      recognizer.lang = (global.navigator && global.navigator.language) || "en-IN";
      recognizer.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            var piece = (e.results[i][0].transcript || "").trim();
            if (piece) transcriptParts.push(piece);
          }
        }
      };
      // Some browsers auto-stop a continuous session after a few seconds of
      // silence. If we're still mid-call, just restart it — otherwise a
      // quiet moment on the call would silently truncate the transcript.
      recognizer.onend = function () {
        if (recognitionWanted) {
          try { recognizer.start(); } catch (e) { /* already running / unsupported mid-call restart */ }
        }
      };
      recognizer.onerror = function () { /* e.g. "no-speech" — not fatal, onend will decide whether to restart */ };
      recognizer.start();
      return true;
    } catch (e) {
      recognizer = null;
      return false;
    }
  }

  // Stops recognition and returns whatever was actually transcribed (may be
  // an empty string if nothing was understood, or recognition never started).
  function stopTranscription() {
    recognitionWanted = false;
    if (recognizer) {
      try { recognizer.stop(); } catch (e) { /* ignore */ }
    }
    recognizer = null;
    return transcriptParts.join(" ").trim();
  }

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
    stopTranscription(); // abandoned call — discard whatever was transcribed so far too
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

  // ---- Transcript of the saved recording itself (not live captions, not
  // canned text). The recording is decoded to 16 kHz mono and run through
  // Whisper in a background worker (js/transcribe-worker.js). Resolves the
  // transcript ("" if no speech was found); rejects if transcription
  // couldn't run in this browser (e.g. offline on first use). ----
  var worker = null;
  var pendingJobs = {};

  function getWorker() {
    if (worker) return worker;
    worker = new Worker("js/transcribe-worker.js", { type: "module" });
    worker.onmessage = function (e) {
      var m = e.data || {};
      if (m.type === "progress") return;
      var job = pendingJobs[m.id];
      if (!job) return;
      delete pendingJobs[m.id];
      if (m.type === "done") job.resolve(m.text || "");
      else job.reject(new Error(m.error || "Transcription failed"));
    };
    worker.onerror = function () {
      Object.keys(pendingJobs).forEach(function (k) {
        pendingJobs[k].reject(new Error("Transcription worker failed to load"));
        delete pendingJobs[k];
      });
      worker = null;
    };
    return worker;
  }

  function decodeTo16kMono(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var AC = global.AudioContext || global.webkitAudioContext;
      var ctx = new AC();
      return new Promise(function (resolve, reject) {
        ctx.decodeAudioData(buf, resolve, reject);
      }).then(function (decoded) {
        try { ctx.close(); } catch (e) { /* ignore */ }
        var length = Math.max(1, Math.ceil(decoded.duration * 16000));
        var off = new OfflineAudioContext(1, length, 16000);
        var src = off.createBufferSource();
        src.buffer = decoded;
        src.connect(off.destination);
        src.start();
        return off.startRendering();
      }).then(function (rendered) {
        return new Float32Array(rendered.getChannelData(0));
      });
    });
  }

  // Whisper tends to "hear" stock phrases in silence; those aren't speech.
  function cleanTranscript(text) {
    var t = (text || "").replace(/\s+/g, " ").trim();
    if (/^(\[[^\]]*\]|\([^)]*\)|\s|thank you\.?|thanks for watching!?\.?|you\.?)*$/i.test(t)) return "";
    return t;
  }

  function transcribeRecording(candidateId) {
    return getRecording(candidateId).then(function (blob) {
      if (!blob) return "";
      return decodeTo16kMono(blob).then(function (audio) {
        return new Promise(function (resolve, reject) {
          pendingJobs[candidateId] = { resolve: resolve, reject: reject };
          getWorker().postMessage({ id: candidateId, audio: audio }, [audio.buffer]);
        });
      });
    }).then(cleanTranscript);
  }

  global.WI_RECORDER = {
    startCapture: startCapture,
    stopCapture: stopCapture,
    discardCapture: discardCapture,
    getRecording: getRecording,
    getLastError: getLastError,
    transcribeRecording: transcribeRecording,
    startTranscription: startTranscription,
    stopTranscription: stopTranscription,
    transcriptionSupported: transcriptionSupported
  };
})(window);
