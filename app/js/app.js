/* WorkIndia Reimagined — router + event wiring. */

(function () {
  "use strict";

  var S = window.WI_STATE;
  var V = window.WI_VIEWS;

  var callTimerInterval = null;
  var matchingTimer = null;
  var countAnimTimer = null;
  var paymentTimer = null;

  var TITLES = {
    dashboard: "Dashboard",
    jobs: "My Jobs",
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

  // The chip used to show "Day X/7 of trial", but day-count and the
  // real trial-ending condition (SHORTLIST_TARGET contact unlocks) are
  // two separate mechanics — a recruiter who has already unlocked all
  // their contacts but is still on "Day 1/7" reads as broken or confusing.
  // So while the trial is active we show a plain "How trial works" CTA
  // and explain the actual construct on hover/tap instead of a number
  // that doesn't line up with what's about to happen.
  function renderShellChrome() {
    var st = S.get();
    var wrap = document.getElementById("trialChipWrap");
    var chip = document.getElementById("trialChip");
    var label = document.getElementById("trialChipLabel");
    if (st.trialEnded) {
      label.textContent = st.subscribed ? "Subscribed" : "Trial complete";
      chip.className = "trial-chip " + (st.subscribed ? "ok" : "done");
      wrap.classList.remove("has-tooltip", "tooltip-open");
    } else {
      label.textContent = "How trial works";
      chip.className = "trial-chip interactive";
      wrap.classList.add("has-tooltip");
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
    document.getElementById("viewRoot").classList.toggle("view-wide", route === "billing");
    document.getElementById("viewRoot").innerHTML = V[route]();
    renderShellChrome();
    wireViewActions();
    wireRecruiterCallAudios();
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }

  // The recruiter-call recordings in the Calls tab are the recruiter's own
  // mic audio, captured live via js/recorder.js while the call was
  // connected — never a placeholder clip. They use plain <audio> elements
  // rather than the AI-call simulated-progress machinery, since there's no
  // transcript-highlight sync to drive here — just play/pause and an
  // elapsed/duration readout.
  var rcallObjectUrls = {}; // candidateId -> object URL, so we don't re-fetch from IndexedDB on every render

  function wireRecruiterCallAudios() {
    document.querySelectorAll("audio[data-rcall]").forEach(function (audio) {
      var id = audio.getAttribute("data-rcall");
      if (!audio.src && window.WI_RECORDER) {
        if (rcallObjectUrls[id]) {
          audio.src = rcallObjectUrls[id];
        } else {
          window.WI_RECORDER.getRecording(id).then(function (blob) {
            if (!blob) return;
            var url = URL.createObjectURL(blob);
            rcallObjectUrls[id] = url;
            audio.src = url;
          });
        }
      }
      audio.onplay = function () {
        document.querySelectorAll("audio[data-rcall]").forEach(function (a) { if (a !== audio) a.pause(); });
        var btn = document.getElementById("rcallBtn-" + id);
        if (btn) btn.innerHTML = "&#10074;&#10074;";
      };
      audio.onpause = function () {
        var btn = document.getElementById("rcallBtn-" + id);
        if (btn) btn.innerHTML = "&#9658;";
      };
      audio.onended = function () {
        var btn = document.getElementById("rcallBtn-" + id);
        if (btn) btn.innerHTML = "&#9658;";
      };
      audio.ontimeupdate = function () {
        var lbl = document.getElementById("rcallTime-" + id);
        if (lbl) lbl.textContent = fmtTime(audio.currentTime) + " / " + fmtTime(audio.duration);
      };
    });
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
          company: fd.get("company"),
          idVerificationRequired: fd.get("idVerificationRequired") === "on"
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

  function handleAction(action, id, el) {
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
      case "retry-mic-call":
        var retryId = S.get().callOverlayFor || id;
        var st2 = S.get();
        st2.callPhase = "requesting-mic";
        render();
        requestMicThenConnect(retryId);
        break;
      case "cancel-call":
        if (window.WI_RECORDER) window.WI_RECORDER.discardCapture();
        closeCallOverlay();
        render();
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
      case "toggle-rcall":
        var rAudio = document.getElementById("rcallAudio-" + id);
        if (rAudio) { if (rAudio.paused) rAudio.play(); else rAudio.pause(); }
        break;
      case "toggle-summary":
        var sumBox = document.getElementById("rcallSummary-" + id);
        if (sumBox) sumBox.style.display = sumBox.style.display === "none" ? "block" : "none";
        break;
      case "view-profile":
        document.querySelectorAll("audio").forEach(function (a) { a.pause(); });
        S.openCandidateProfile(id);
        render();
        break;
      case "close-profile":
        S.closeCandidateProfile();
        render();
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
        // "Buy Now" / "Start Trial Now" opens the mock payment modal —
        // actually subscribing happens once that flow completes, not here.
        var tierGroup = (el && el.getAttribute("data-group")) || "single";
        S.closePaywall();
        S.startPayment(id, tierGroup);
        render();
        break;
      case "select-payment-method":
        S.selectPaymentMethod(id);
        render();
        break;
      case "pay-now":
        S.beginPaymentProcessing();
        render();
        if (S.get().paymentStep === "processing") {
          paymentTimer = setTimeout(function () {
            S.completePayment();
            render();
          }, 1600);
        }
        break;
      case "confirm-qr-scan":
        S.confirmQrScan();
        render();
        if (S.get().paymentStep === "processing") {
          paymentTimer = setTimeout(function () {
            S.completePayment();
            render();
          }, 1600);
        }
        break;
      case "close-payment-modal":
        if (paymentTimer) { clearTimeout(paymentTimer); paymentTimer = null; }
        S.closePaymentModal();
        render();
        break;
      case "set-billing-tab":
        S.setBillingTab(id);
        render();
        break;
      case "request-sales-help":
        S.requestSalesHelp();
        render();
        break;
      case "toggle-job-details":
        S.toggleJobDetails();
        render();
        break;
      case "toggle-past-job":
        S.togglePastJob(id);
        render();
        break;
      case "rate-mock-job":
        S.rateMockJob(el.getAttribute("data-job-id"), el.getAttribute("data-rating"));
        render();
        break;
      case "toggle-hire-bad-tag":
        S.toggleHireBadTag(el.getAttribute("data-tag"));
        render();
        break;
      case "submit-hire-bad-feedback":
        S.submitHireBadFeedback();
        render();
        break;
      case "toggle-mock-bad-tag":
        S.toggleMockJobBadTag(el.getAttribute("data-job-id"), el.getAttribute("data-tag"));
        render();
        break;
      case "submit-mock-bad-feedback":
        S.submitMockJobBadFeedback(el.getAttribute("data-job-id"));
        render();
        break;
      case "set-cand-filter":
        S.setCandidateFilter(el.getAttribute("data-key"), el.getAttribute("data-value"));
        render();
        break;
      case "toggle-verified-filter":
        S.toggleVerifiedFilter();
        render();
        break;
      case "clear-cand-filters":
        S.clearCandidateFilters();
        render();
        break;
      case "dismiss-intro":
        S.setFlowStep("posting");
        render();
        break;
    }
  }

  // Every platform call is recorded, so mic access is a precondition for
  // placing the call at all — not something it quietly proceeds without.
  // openCall() asks for the mic first; only once that succeeds does the
  // "Connecting…" / "Connected" flow (and the call-counts-toward-trial
  // logic in S.connectCall) start.
  function openCall(id) {
    var st = S.get();
    st.callOverlayFor = id;
    st.callPhase = "requesting-mic";
    st.callSeconds = 0;
    render();
    requestMicThenConnect(id);
  }

  function requestMicThenConnect(id) {
    if (!window.WI_RECORDER) {
      // No mic support in this browser at all — same hard block.
      var s0 = S.get();
      if (s0.callOverlayFor !== id) return;
      S.setMicPermissionDenied(true);
      s0.callPhase = "mic-blocked";
      render();
      return;
    }
    window.WI_RECORDER.startCapture().then(function (started) {
      var s = S.get();
      if (s.callOverlayFor !== id) return; // overlay was cancelled/closed while the permission prompt was up
      if (started) {
        S.setMicPermissionDenied(false);
        beginConnectingFlow(id);
      } else {
        S.setMicPermissionDenied(true);
        s.callPhase = "mic-blocked";
        render();
      }
    });
  }

  function beginConnectingFlow(id) {
    var s = S.get();
    s.callPhase = "connecting";
    render();
    setTimeout(function () {
      var s2 = S.get();
      if (s2.callOverlayFor !== id) return;
      s2.callPhase = "connected";
      S.connectCall(id);
      render();
      callTimerInterval = setInterval(function () {
        var s3 = S.get();
        if (s3.callOverlayFor !== id || s3.callPhase !== "connected") {
          clearInterval(callTimerInterval);
          return;
        }
        s3.callSeconds = (s3.callSeconds || 0) + 1;
        var disp = document.getElementById("callTimerDisplay");
        if (disp) {
          var m = Math.floor(s3.callSeconds / 60), ss = s3.callSeconds % 60;
          disp.textContent = (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
        }
      }, 1000);
    }, 1400);
  }

  function endCall() {
    if (callTimerInterval) clearInterval(callTimerInterval);
    var st = S.get();
    var id = st.callOverlayFor;
    if (id) S.recordCallDuration(id, st.callSeconds || 0);
    st.callPhase = "shortlist";
    render();
    if (id && window.WI_RECORDER) {
      window.WI_RECORDER.stopCapture(id).then(function (blob) {
        S.markLiveRecording(id, !!blob);
        delete rcallObjectUrls[id]; // force a fresh fetch so the just-saved recording picks up
        if (currentRoute() === "calls") render(); // re-render so the done-row picks up the new recording flag
      });
    }
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
    if (window.WI_RECORDER) window.WI_RECORDER.discardCapture(); // call abandoned mid-way — release the mic, don't save
    var st = S.get();
    st.callOverlayFor = null;
    st.callPhase = null;
  }

  function applyIncomingSearch() {
    var params = new URLSearchParams(location.search);
    var role = params.get("role");
    var city = params.get("city");
    if (!role || !city) return;
    // Arriving with ?role=&city= means someone just submitted the landing
    // page's "Start Hiring" search — that's an explicit request to walk
    // through the demo flow, so always start fresh. Without this, a
    // browser that already finished onboarding earlier would silently
    // resume that old session and dump the visitor straight onto the
    // dashboard, skipping login and job posting entirely.
    var st = S.get();
    if (st.onboarded) S.resetAll();
    S.submitSearch(role, city); // sets flowStep to "count" — the role/city search already happened on the landing page
    // Drop ?role=&city= from the URL once consumed, so reloading or
    // revisiting this same link later doesn't silently wipe the session
    // the visitor is now building.
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", location.pathname + location.hash);
    }
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", function () {
    if (!location.hash) location.hash = "#/dashboard";
    applyIncomingSearch();
    render();

    // Hover shows the "how trial works" tooltip on desktop; this click
    // toggle covers touch devices, which have no hover state.
    var trialWrap = document.getElementById("trialChipWrap");
    if (trialWrap) {
      trialWrap.addEventListener("click", function (e) {
        if (!this.classList.contains("has-tooltip")) return;
        this.classList.toggle("tooltip-open");
        e.stopPropagation();
      });
      document.addEventListener("click", function () {
        trialWrap.classList.remove("tooltip-open");
      });
    }
  });
})();
