/* WorkIndia Reimagined — first-time guided tour of the dashboard.
   Replaces the standalone "hot leads" screen that used to sit between job
   posting and the dashboard: the employer lands on their real dashboard
   first, and the concept (AI screening calls, unlock-by-relevance, masked
   calling, trial limits, flat fee) is explained on the actual UI it
   refers to. Shown once (state.tourSeen), replayable from the dashboard. */

(function (global) {
  "use strict";

  var D = global.WI_DATA;
  var open = false;
  var idx = 0;
  var steps = [];
  var opts = {};
  var els = {};

  function buildSteps() {
    var st = global.WI_STATE.get();
    var job = st.job || {};
    var jobLabel = [job.title, job.city].filter(Boolean).join(", ");
    return [
      {
        target: null,
        title: "Your job is live " + "&#127881;",
        body: (jobLabel ? "<b>" + jobLabel + "</b> is now visible to candidates. " : "") +
          "Here's a quick look at how hiring works on WorkIndia &mdash; it takes under a minute."
      },
      {
        target: '[data-tour="review"]',
        title: "AI has already called candidates for you",
        body: "Every profile comes with the AI's screening call &mdash; availability, pay expectation and language. " +
          "Listen to the recording or read the transcript before you decide."
      },
      {
        target: '[data-tour="review"]',
        title: "Mark Relevant to unlock their number",
        body: "Like a candidate? Mark them <b>Relevant</b> and their contact unlocks. " +
          "Not a fit? Mark them Not relevant and move to the next one."
      },
      {
        target: '[data-tour="calls"]',
        title: "Call from the platform",
        body: "Calls go through WorkIndia, so your personal number stays private. " +
          "Every call is recorded here for your reference."
      },
      {
        target: '[data-tour="trial-stats"]',
        title: "How your trial works",
        body: "Your trial ends when you shortlist <b>" + D.SHORTLIST_TARGET + "</b> candidates, review all <b>" +
          D.TOTAL_ALLOCATION + "</b> profiles, or after <b>" + D.TRIAL_DAY_CAP + " days</b> &mdash; whichever comes first. " +
          "Track your progress here."
      },
      {
        target: "#trialChip",
        title: "One flat fee, no commission",
        body: "WorkIndia charges a flat monthly fee &mdash; never a cut of the salary you pay. " +
          "Tap this anytime to see how the trial works.",
        cta: "Start reviewing candidates",
        goTo: "#/candidates"
      }
    ];
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function ensureDom() {
    if (els.root) return;
    var root = document.createElement("div");
    root.className = "tour-root";
    root.innerHTML =
      '<div class="tour-spot" id="tourSpot"></div>' +
      '<div class="tour-card" id="tourCard" role="dialog" aria-modal="true" aria-labelledby="tourTitle">' +
        '<div class="tour-count" id="tourCount"></div>' +
        '<p class="tour-title" id="tourTitle"></p>' +
        '<p class="tour-body" id="tourBody"></p>' +
        '<div class="tour-dots" id="tourDots"></div>' +
        '<div class="tour-actions">' +
          '<button type="button" class="tour-skip" id="tourSkip">Skip tour</button>' +
          '<div class="tour-nav">' +
            '<button type="button" class="btn ghost" id="tourBack">Back</button>' +
            '<button type="button" class="btn primary" id="tourNext">Next</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    els = {
      root: root,
      spot: root.querySelector("#tourSpot"),
      card: root.querySelector("#tourCard"),
      count: root.querySelector("#tourCount"),
      title: root.querySelector("#tourTitle"),
      body: root.querySelector("#tourBody"),
      dots: root.querySelector("#tourDots"),
      skip: root.querySelector("#tourSkip"),
      back: root.querySelector("#tourBack"),
      next: root.querySelector("#tourNext")
    };
    els.skip.addEventListener("click", function () { finish(null); });
    els.back.addEventListener("click", function () { if (idx > 0) { idx--; show(); } });
    els.next.addEventListener("click", function () {
      if (idx < steps.length - 1) { idx++; show(); }
      else finish(steps[idx].goTo || null);
    });
    document.addEventListener("keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape") finish(null);
      if (e.key === "ArrowRight") els.next.click();
      if (e.key === "ArrowLeft") els.back.click();
    });
    global.addEventListener("resize", function () { if (open) position(); });
  }

  function show() {
    var s = steps[idx];
    els.count.textContent = (idx + 1) + " of " + steps.length;
    els.title.innerHTML = s.title;
    els.body.innerHTML = s.body;
    els.dots.innerHTML = steps.map(function (_, i) {
      return '<span class="tour-dot' + (i === idx ? " active" : "") + '"></span>';
    }).join("");
    els.back.style.visibility = idx === 0 ? "hidden" : "visible";
    els.skip.style.visibility = idx === steps.length - 1 ? "hidden" : "visible";
    els.next.textContent = idx === steps.length - 1 ? (s.cta || "Done") : (idx === 0 ? "Show me around" : "Next");
    var target = s.target ? document.querySelector(s.target) : null;
    if (visible(target)) target.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(position, visible(target) ? 250 : 0);
  }

  function position() {
    var s = steps[idx];
    var target = s.target ? document.querySelector(s.target) : null;
    var card = els.card;
    var vw = global.innerWidth, vh = global.innerHeight;

    if (!visible(target)) {
      // No anchor (welcome step, or the target is hidden on this screen
      // size): dim everything and centre the card.
      els.spot.className = "tour-spot centered";
      els.spot.removeAttribute("style");
      card.className = "tour-card centered";
      card.removeAttribute("style");
      return;
    }

    var r = target.getBoundingClientRect();
    var pad = 8;
    els.spot.className = "tour-spot";
    els.spot.style.top = (r.top - pad) + "px";
    els.spot.style.left = (r.left - pad) + "px";
    els.spot.style.width = (r.width + pad * 2) + "px";
    els.spot.style.height = (r.height + pad * 2) + "px";

    card.className = "tour-card";
    card.style.top = "0px"; card.style.left = "0px";
    var cw = card.offsetWidth, ch = card.offsetHeight, gap = 16;
    var top = r.bottom + pad + gap;
    if (top + ch > vh - 12) top = r.top - pad - gap - ch;   // flip above
    if (top < 12) top = Math.max(12, Math.min(vh - ch - 12, r.top)); // fallback
    var left = r.left + r.width / 2 - cw / 2;
    left = Math.max(12, Math.min(vw - cw - 12, left));
    card.style.top = top + "px";
    card.style.left = left + "px";
  }

  function start(o) {
    opts = o || {};
    steps = buildSteps();
    idx = 0;
    ensureDom();
    open = true;
    els.root.style.display = "block";
    document.body.classList.add("tour-open");
    show();
  }

  function finish(goTo) {
    open = false;
    if (els.root) els.root.style.display = "none";
    document.body.classList.remove("tour-open");
    if (opts.onFinish) opts.onFinish(goTo);
  }

  global.WI_TOUR = {
    start: start,
    isOpen: function () { return open; }
  };
})(window);
