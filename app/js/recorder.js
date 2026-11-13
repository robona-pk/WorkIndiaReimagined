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
    abortTranscription();
    if (!SpeechRecognitionCtor) return false;
    recognitionWanted = true;
    try {
      var r = new SpeechRecognitionCtor();
      r.continuous = true;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.lang = "en-IN"; // English (India) for now
      r.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            var piece = (e.results[i][0].transcript || "").trim();
            if (piece) transcriptParts.push(piece.charAt(0).toUpperCase() + piece.slice(1));
          }
        }
      };
      // Chrome stops a continuous session after a pause in speech; restart
      // it while the call is still going so nothing said later is lost.
      r.onend = function () {
        if (recognitionWanted && recognizer === r) {
          try { r.start(); } catch (e) { /* ignore */ }
        } else if (r._onFinalEnd) {
          r._onFinalEnd();
        }
      };
      r.onerror = function (e) {
        if (e && (e.error === "not-allowed" || e.error === "service-not-allowed")) recognitionWanted = false;
      };
      recognizer = r;
      r.start();
      return true;
    } catch (e) {
      recognizer = null;
      return false;
    }
  }

  // Stops recognition and resolves with everything that was said. Waits for
  // the browser to deliver the last sentence (or 2.5s at most).
  function stopTranscription() {
    recognitionWanted = false;
    var r = recognizer;
    recognizer = null;
    if (!r) return Promise.resolve(joinParts());
    return new Promise(function (resolve) {
      var done = false;
      function finish() { if (done) return; done = true; resolve(joinParts()); }
      r._onFinalEnd = finish;
      try { r.stop(); } catch (e) { finish(); }
      setTimeout(finish, 2500);
    });
  }

  function abortTranscription() {
    recognitionWanted = false;
    if (recognizer) { try { recognizer.abort(); } catch (e) { /* ignore */ } }
    recognizer = null;
  }

  function joinParts() {
    return transcriptParts.map(function (p) { return /[.?!]$/.test(p) ? p : p + "."; }).join(" ").trim();
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
    if (!global.navigator || !global.navigator.mediaDevices || !global.navigator.mediaDevices.getUserMedia || !global.MediaRecorder) {
      lastError = "unsupported";
      return Promise.resolve(false);
    }
    // A previous capture that was never stopped would hold the mic; release it.
    discardCapture();
    return global.navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
    }).then(function (stream) {
      var mimeType = pickMimeType();
      var rec;
      try {
        rec = mimeType ? new global.MediaRecorder(stream, { mimeType: mimeType }) : new global.MediaRecorder(stream);
      } catch (e) {
        rec = new global.MediaRecorder(stream);
      }
      // Each call keeps its own chunk list, so a later call (or closing the
      // call window) can never wipe this call's audio before it is saved.
      rec._chunks = [];
      rec._stream = stream;
      rec.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) rec._chunks.push(e.data);
      };
      // Emit a chunk every second, so audio is never lost if the tab is
      // closed or the browser stops the recorder unexpectedly.
      rec.start(1000);
      activeRecorder = rec;
      activeStream = stream;
      return true;
    }).catch(function (err) {
      lastError = (err && err.name) || "denied";
      return false;
    });
  }

  function releaseStream(stream) {
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
  }

  // Stops capture (if running) and saves the result for candidateId.
  // Resolves the Blob on success, or null if there's nothing to save.
  function stopCapture(candidateId) {
    var rec = activeRecorder;
    // Detach right away: nothing after this point (closing the call window,
    // starting another call) can touch this recording.
    activeRecorder = null;
    activeStream = null;
    if (!rec) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        releaseStream(rec._stream);
        var blob = rec._chunks.length ? new Blob(rec._chunks, { type: rec.mimeType || "audio/webm" }) : null;
        if (!blob || blob.size < 400) { resolve(null); return; }
        saveRecording(candidateId, blob).then(function () { resolve(blob); }).catch(function () { resolve(null); });
      }
      rec.onstop = finish;
      if (rec.state === "inactive") { finish(); return; }
      try { rec.stop(); } catch (e) { finish(); }
      setTimeout(finish, 3000); // safety net if onstop never fires
    });
  }

  // Abandons any in-progress capture without saving (e.g. call cancelled
  // before it connected).
  function discardCapture() {
    var rec = activeRecorder;
    activeRecorder = null;
    activeStream = null;
    if (rec) {
      rec.ondataavailable = null;
      rec.onstop = null;
      if (rec.state !== "inactive") { try { rec.stop(); } catch (e) { /* ignore */ } }
      releaseStream(rec._stream);
    }
    abortTranscription();
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
