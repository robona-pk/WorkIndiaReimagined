/* WorkIndia Reimagined — router + event wiring. */

(function () {
  "use strict";

  var S = window.WI_STATE;
  var V = window.WI_VIEWS;

  var callTimerInterval = null;
  var matchingTimer = null;
  var countAnimTimer = null;

  var TITLES = {
    dashboard: "Dashboard",
    candidates: "Candidates",
    calls: "Calls",
    billing: "Trial & Billing",
    updates: "Updates",
    settings: "Settings"
  };

  function currentRoute() {
    var h = (location.hash || "#/dashboard").replace("#/", "");
    return V[h] ? h : "dashboard";
  }

  function renderShellChrome() {
    var st = S.get();
    var chip = document.getElementById("trialChip");
    if (st.trialEnded) {
      chip.textContent = st.subscribed ? "Subscribed" : "Trial complete";
      chip.className = "trial-chip " + (st.subscribed ? "ok" : "done");
    } else {
      chip.textContent = "Day " + st.day + "/" + window.WI_DATA.TRIAL_DAY_CAP + " of trial";
      chip.className = "trial-chip";
    }
  }

  function render() {
    var st = S.get();

    if (matchingTimer) { clearTimeout(matchingTimer); matchingTimer = null; }
    if (countAnimTimer) { clearInterval(countAnimTimer); countAnimTimer = null; }

    if (!st.onboarded) {
      document.getElementById("appShell").style.display = "none";
      document.getElementById("onboardRoot").style.display = "block";
      var step = st.flowStep || "search";
      document.getElementById("onboardRoot").innerHTML = (V[step] || V.search)();
      wireFlowForms();
      wireViewActions();
      wireChipFields();

      if (step === "count") runCountAnimation();
      if (step === "matching") {
        matchingTimer = setTimeout(function () {
          S.setFlowStep("hotleads");
          render();
        }, 1700);
      }
      return;
    }

    document.getElementById("onboardRoot").style.display = "none";
    document.getElementById("appShell").style.display = "flex";

    var route = currentRoute();
    document.getElementById("topbarTitle").textContent = TITLES[route];
    document.querySelectorAll(".sb-link").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === route);
    });
    document.getElementById("viewRoot").innerHTML = V[route]();
    renderShellChrome();
    wireViewActions();
  }

  // Animate the candidate count up from 0, then reveal the ₹1 pricing CTA
  // in place — this is the whole "step 2" screen; no separate click-through.
  function runCountAnimation() {
    var wrap = document.querySelector(".flow-step[data-count-target]");
    var numEl = document.getElementById("countNum");
    var reveal = document.getElementById("pricingReveal");
    if (!wrap || !numEl) return;
    var target = parseInt(wrap.getAttribute("data-count-target"), 10) || 0;
    var steps = 24, i = 0;
    countAnimTimer = setInterval(function () {
      i++;
      var pct = Math.min(1, i / steps);
      var eased = 1 - Math.pow(1 - pct, 3);
      numEl.textContent = Math.round(target * eased).toLocaleString("en-IN");
      if (pct >= 1) {
        clearInterval(countAnimTimer);
        countAnimTimer = null;
        if (reveal) {
          reveal.style.transition = "opacity .4s ease";
          setTimeout(function () { reveal.style.opacity = "1"; }, 120);
        }
      }
    }, 35);
  }

  // Chip-style quick-select fields (experience/education/gender/english on
  // the job-posting step) — click sets the hidden input WireFlowForms reads
  // on submit, and recomputes the "almost live" progress bar.
  function wireChipFields() {
    document.querySelectorAll(".chip-opts").forEach(function (group) {
      group.querySelectorAll(".chip-opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          group.querySelectorAll(".chip-opt").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          var hidden = group.previousElementSibling;
          if (hidden && hidden.tagName === "INPUT") hidden.value = btn.getAttribute("data-chip-value");
          recomputePostProgress();
        });
      });
    });
    var postingForm = document.getElementById("postingForm");
    if (postingForm) postingForm.addEventListener("input", recomputePostProgress);
  }

  function recomputePostProgress() {
    var form = document.getElementById("postingForm");
    var fill = document.getElementById("postProgressFill");
    var pctLabel = document.getElementById("postPct");
    if (!form || !fill) return;
    var fields = form.querySelectorAll("input, select");
    var total = fields.length, filled = 0;
    fields.forEach(function (f) { if (String(f.value || "").trim() !== "") filled++; });
    var pct = Math.max(55, Math.round((filled / total) * 100));
    fill.style.width = pct + "%";
    if (pctLabel) pctLabel.textContent = pct + "%";
  }

  function wireFlowForms() {
    var searchForm = document.getElementById("searchForm");
    if (searchForm) {
      searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(searchForm);
        S.submitSearch(fd.get("role"), fd.get("city"));
        render();
      });
    }

    var loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(loginForm);
        S.verifyLogin(fd.get("phone"));
        render();
      });
    }

    var postingForm = document.getElementById("postingForm");
    if (postingForm) {
      postingForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(postingForm);
        var st = S.get();
        S.confirmJobPosting({
          title: st.searchRole,
          city: st.searchCity,
          experience: fd.get("experience"),
          education: fd.get("education"),
          gender: fd.get("gender"),
          english: fd.get("english"),
          salaryMin: fd.get("salaryMin"),
          salaryMax: fd.get("salaryMax"),
          openings: fd.get("openings"),
          company: fd.get("company")
        }, {
          industry: fd.get("industry"),
          size: fd.get("companySize"),
          location: fd.get("companyLocation")
        });
        window.__draftCompany = fd.get("company");
        render();
      });
    }
  }

  function wireViewActions() {
    document.querySelectorAll("[data-action]").forEach(function (el) {
      el.addEventListener("click", function () {
        var action = el.getAttribute("data-action");
        var id = el.getAttribute("data-id");
        handleAction(action, id, el);
      });
    });
  }

  function handleAction(action, id) {
    switch (action) {
      case "mark-relevant":
        S.markRelevant(id);
        render();
        break;
      case "mark-not-relevant":
        S.markNotRelevant(id);
        render();
        break;
      case "advance-batch":
        S.advanceBatch();
        render();
        break;
      case "open-call":
        openCall(id);
        break;
      case "end-call":
        endCall();
        break;
      case "call-shortlist":
        S.markShortlisted(id);
        closeCallOverlay();
        render();
        break;
      case "call-not-fit":
        S.markNotFit(id);
        closeCallOverlay();
        render();
        break;
      case "subscribe":
        S.subscribe();
        render();
        break;
      case "confirm-hire":
        var st = S.get();
        var byId = {};
        window.WI_DATA.CANDIDATE_POOL.forEach(function (c) { byId[c.id] = c; });
        var name = (st.shortlistedIds.map(function (i) { return byId[i]; }).filter(Boolean)[0] || { name: "your new hire" }).name;
        S.confirmHire(name);
        render();
        break;
      case "rate-hire":
        S.rateHire(event.target.getAttribute("data-rating"));
        render();
        break;
      case "reset-demo":
        if (callTimerInterval) clearInterval(callTimerInterval);
        S.resetAll();
        location.hash = "#/dashboard";
        render();
        break;
      case "toggle-recording":
        toggleRecording(id);
        break;
      case "toggle-transcript":
        var panel = document.getElementById("transcript-" + id);
        if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
        break;
      case "start-trial":
        S.startTrial(window.__draftCompany || "Your Company");
        location.hash = "#/dashboard";
        render();
        break;
      case "shortlist-from-card":
        S.shortlistCandidate(id);
        render();
        break;
      case "close-paywall":
        S.closePaywall();
        render();
        break;
      case "subscribe-tier":
        S.subscribe();
        S.closePaywall();
        render();
        break;
    }
  }

  function openCall(id) {
    var st = S.get();
    st.callOverlayFor = id;
    st.callPhase = "connecting";
    st.callSeconds = 0;
    render();
    setTimeout(function () {
      var s = S.get();
      if (s.callOverlayFor !== id) return;
      s.callPhase = "connected";
      S.connectCall(id);
      render();
      callTimerInterval = setInterval(function () {
        var s2 = S.get();
        if (s2.callOverlayFor !== id || s2.callPhase !== "connected") {
          clearInterval(callTimerInterval);
          return;
        }
        s2.callSeconds = (s2.callSeconds || 0) + 1;
        var disp = document.getElementById("callTimerDisplay");
        if (disp) {
          var m = Math.floor(s2.callSeconds / 60), ss = s2.callSeconds % 60;
          disp.textContent = (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
        }
      }, 1000);
    }, 1400);
  }

  function endCall() {
    if (callTimerInterval) clearInterval(callTimerInterval);
    var st = S.get();
    st.callPhase = "shortlist";
    render();
  }

  var recordings = {}; // candId -> { elapsed, interval, duration, transcript }

  function toggleRecording(id) {
    // pause any other recording currently playing (real audio or simulated)
    Object.keys(recordings).forEach(function (otherId) {
      if (otherId !== id && recordings[otherId].interval) pauseRecording(otherId);
    });
    var audioEl = document.getElementById("recAudio-" + id);
    if (audioEl) {
      document.querySelectorAll("audio").forEach(function (a) { if (a !== audioEl && !a.paused) a.pause(); });
    }

    if (!recordings[id]) {
      var cand = window.WI_DATA.CANDIDATE_POOL.filter(function (c) { return c.id === id; })[0];
      recordings[id] = { elapsed: 0, interval: null, duration: cand.callDurationSec || 45, transcript: cand.callTranscript || [], real: !!cand.audioFile };
    }
    var rec = recordings[id];
    var playing = audioEl ? !audioEl.paused : !!rec.interval;
    if (playing) {
      pauseRecording(id);
    } else {
      playRecording(id);
    }
  }

  // Real recordings (cand-1/2/3) play actual synthesized audio and sync the
  // transcript highlight to real audio.currentTime via timeupdate. Everyone
  // else keeps the simulated progress-bar playback (no file to play).
  function playRecording(id) {
    var btn = document.getElementById("recBtn-" + id);
    var audioEl = document.getElementById("recAudio-" + id);
    if (btn) { btn.innerHTML = "&#10073;&#10073;"; btn.classList.add("playing"); }

    if (audioEl) {
      audioEl.play().catch(function () { /* autoplay-policy fallback: user already clicked, should be fine */ });
      audioEl.ontimeupdate = function () { updateRecordingUI(id, audioEl.currentTime); };
      audioEl.onended = function () { pauseRecording(id); updateRecordingUI(id, 0); };
      return;
    }

    var rec = recordings[id];
    rec.interval = setInterval(function () {
      rec.elapsed += 0.4;
      if (rec.elapsed >= rec.duration) {
        rec.elapsed = rec.duration;
        updateRecordingUI(id, rec.elapsed);
        pauseRecording(id);
        return;
      }
      updateRecordingUI(id, rec.elapsed);
    }, 400);
  }

  function pauseRecording(id) {
    var rec = recordings[id];
    if (rec && rec.interval) { clearInterval(rec.interval); rec.interval = null; }
    var audioEl = document.getElementById("recAudio-" + id);
    if (audioEl && !audioEl.paused) audioEl.pause();
    var btn = document.getElementById("recBtn-" + id);
    if (btn) { btn.innerHTML = "&#9658;"; btn.classList.remove("playing"); }
  }

  function updateRecordingUI(id, elapsed) {
    var rec = recordings[id];
    if (!rec) return;
    var pct = Math.min(100, (elapsed / rec.duration) * 100);
    var fill = document.getElementById("recFill-" + id);
    var time = document.getElementById("recTime-" + id);
    if (fill) fill.style.width = pct + "%";
    if (time) {
      var fmt = function (sec) {
        var m = Math.floor(sec / 60), ss = Math.floor(sec % 60);
        return (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
      };
      time.textContent = fmt(elapsed) + " / " + fmt(rec.duration);
    }
    var n = rec.transcript.length;
    if (n === 0) return;

    var activeIdx;
    if (rec.real) {
      // use real per-line start/end timestamps baked into the transcript
      activeIdx = 0;
      for (var j = 0; j < n; j++) {
        if (elapsed >= (rec.transcript[j].start || 0)) activeIdx = j;
      }
    } else {
      activeIdx = Math.min(n - 1, Math.floor((elapsed / rec.duration) * n));
    }
    for (var i = 0; i < n; i++) {
      var lineEl = document.getElementById("recline-" + id + "-" + i);
      if (lineEl) lineEl.classList.toggle("heard", i <= activeIdx);
    }
    var panel = document.getElementById("transcript-" + id);
    if (panel && panel.style.display !== "none") {
      var activeEl = document.getElementById("recline-" + id + "-" + activeIdx);
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }
  }

  function closeCallOverlay() {
    if (callTimerInterval) clearInterval(callTimerInterval);
    var st = S.get();
    st.callOverlayFor = null;
    st.callPhase = null;
  }

  function applyIncomingSearch() {
    var st = S.get();
    if (st.onboarded) return;
    var params = new URLSearchParams(location.search);
    var role = params.get("role");
    var city = params.get("city");
    if (role && city) {
      S.submitSearch(role, city); // sets flowStep to "count" — the role/city search already happened on the landing page
    }
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", function () {
    if (!location.hash) location.hash = "#/dashboard";
    applyIncomingSearch();
    render();
  });
})();
