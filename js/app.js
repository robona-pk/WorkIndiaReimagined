/* WorkIndia Reimagined — router + event wiring. */

(function () {
  "use strict";

  var S = window.WI_STATE;
  var V = window.WI_VIEWS;

  var callTimerInterval = null;

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

    if (!st.onboarded) {
      document.getElementById("appShell").style.display = "none";
      document.getElementById("onboardRoot").style.display = "block";
      document.getElementById("onboardRoot").innerHTML = window.__showOnboardForm ? V.onboarding() : V.landing();
      wireOnboardForm();
      wireViewActions();
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

  function wireOnboardForm() {
    var form = document.getElementById("onboardForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      S.postJob(fd.get("company"), fd.get("phone"), {
        title: fd.get("title"),
        city: fd.get("city"),
        salaryMin: fd.get("salaryMin"),
        salaryMax: fd.get("salaryMax"),
        openings: fd.get("openings")
      });
      location.hash = "#/dashboard";
      render();
    });
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
        window.__showOnboardForm = false;
        location.hash = "#/dashboard";
        render();
        break;
      case "go-onboarding":
        window.__showOnboardForm = true;
        render();
        break;
      case "go-landing":
        window.__showOnboardForm = false;
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

  function closeCallOverlay() {
    if (callTimerInterval) clearInterval(callTimerInterval);
    var st = S.get();
    st.callOverlayFor = null;
    st.callPhase = null;
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", function () {
    if (!location.hash) location.hash = "#/dashboard";
    render();
  });
})();
