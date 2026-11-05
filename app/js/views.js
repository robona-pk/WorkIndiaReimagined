/* WorkIndia Reimagined — view renderers. Each returns an HTML string
   for the #view-root outlet. Interactive elements use data-action
   attributes wired up by app.js via event delegation. */

(function (global) {
  "use strict";

  var D = global.WI_DATA;
  var S = global.WI_STATE;

  function esc(s) { return String(s); }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60), ss = sec % 60;
    return (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
  }

  function tickerItems() {
    var cats = ["Logistics &amp; last-mile delivery", "Quick-commerce warehouses", "Security &amp; facility management",
      "QSR &amp; restaurant chains", "Retail &amp; supermarket chains", "Field sales teams",
      "Manufacturing &amp; factories", "Courier &amp; fleet operators", "Hospitality &amp; housekeeping", "Healthcare support staff"];
    return cats.map(function (c) { return '<span class="ticker-chip">' + c + '</span>'; }).join("");
  }

  // ---------------- Step 1: job search ----------------
  function renderJobSearch() {
    return (
      '<div class="onb-wrap flow-step">' +
        '<div class="flow-progress">Step 1 of 6 &middot; Find your candidates</div>' +
        '<div class="onb-logo">W</div>' +
        '<h1 class="onb-title">Who are you hiring?</h1>' +
        '<p class="onb-sub">Tell us the role and the city &mdash; we\'ll show you how many candidates are available before you commit to anything.</p>' +
        '<form id="searchForm" class="card">' +
          '<div class="field"><label>Job title</label><input name="role" list="roleList" type="text" placeholder="e.g. Delivery Executive" value="Delivery Executive" required>' +
            '<datalist id="roleList">' + D.ROLE_SUGGESTIONS.map(function (r) { return '<option value="' + r + '">'; }).join("") + '</datalist>' +
          '</div>' +
          '<div class="field"><label>City</label><input name="city" list="cityList" type="text" placeholder="e.g. Mumbai" value="Mumbai" required>' +
            '<datalist id="cityList">' + D.CITY_SUGGESTIONS.map(function (c) { return '<option value="' + c + '">'; }).join("") + '</datalist>' +
          '</div>' +
          '<button type="submit" class="btn primary full">Search candidates</button>' +
        '</form>' +
      '</div>'
    );
  }

  // ---------------- Step 2: candidate count ----------------
  function renderCandidateCount() {
    var st = S.get();
    var count = D.estimateCandidateCount(st.searchRole, st.searchCity);
    return (
      '<div class="onb-wrap flow-step">' +
        '<div class="flow-progress">Step 2 of 6 &middot; Candidates available</div>' +
        '<div class="count-hero">' +
          '<div class="count-num">' + count.toLocaleString("en-IN") + '</div>' +
          '<p class="count-label">candidates found for <b>' + esc(st.searchRole) + '</b> near <b>' + esc(st.searchCity) + '</b></p>' +
        '</div>' +
        '<div class="card">' +
          '<p class="section-sub" style="margin-bottom:16px;">That\'s how many exist. What matters is how many are actually available, nearby and a fit &mdash; which is what the trial screens for before you ever see a profile.</p>' +
          '<button class="btn primary full" data-action="goto-pricing">Continue &rarr;</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ---------------- Step 3: pricing teaser ----------------
  function renderPricingTeaser() {
    return (
      '<div class="onb-wrap flow-step">' +
        '<div class="flow-progress">Step 3 of 6 &middot; Start your trial</div>' +
        '<div class="price-hero">' +
          '<div class="price-rupee">&#8377;' + D.PLANS.trialDueToday + '</div>' +
          '<p class="price-label">to start hiring today</p>' +
        '</div>' +
        '<div class="card">' +
          '<ul class="land-list" style="margin-bottom:18px;">' +
            '<li>AI calls and screens candidates by voice before you see them</li>' +
            '<li>Review up to 30 verified profiles, in batches of 10</li>' +
            '<li>Call candidates through the platform &mdash; your number stays private</li>' +
            '<li>Trial ends once you shortlist 3, review all 30, or after 7 days</li>' +
          '</ul>' +
          '<div class="flat-fee-note" style="margin-bottom:16px;">Renews at &#8377;' + D.PLANS.trialRenewalAmount.toLocaleString("en-IN") + '/month only if you continue &mdash; one flat fee, no commission on salary.</div>' +
          '<button class="btn primary full" data-action="goto-login">Start Hiring @ &#8377;' + D.PLANS.trialDueToday + ' &rarr;</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ---------------- Step 4: login ----------------
  function renderLoginStep() {
    return (
      '<div class="onb-wrap flow-step">' +
        '<div class="flow-progress">Step 4 of 6 &middot; Verify your number</div>' +
        '<div class="onb-logo">W</div>' +
        '<h1 class="onb-title">Verify your mobile number</h1>' +
        '<p class="onb-sub">We\'ll use this to send candidate updates &mdash; no email signup, no password.</p>' +
        '<form id="loginForm" class="card">' +
          '<div class="field"><label>Mobile number</label><input name="phone" type="tel" placeholder="98765 43210" value="9353248620" maxlength="10" required></div>' +
          '<div class="field"><label>OTP</label><input name="otp" type="text" placeholder="Auto-filled for this demo" value="1234" required></div>' +
          '<button type="submit" class="btn primary full">Verify &amp; continue</button>' +
        '</form>' +
      '</div>'
    );
  }

  // ---------------- Step 5: AI job posting ----------------
  function renderJobPostingAI() {
    var st = S.get();
    var spec = D.suggestJobSpec(st.searchRole);
    return (
      '<div class="onb-wrap flow-step">' +
        '<div class="flow-progress">Step 5 of 6 &middot; AI-generated job post</div>' +
        '<h1 class="onb-title">We\'ve drafted your job post</h1>' +
        '<p class="onb-sub">From just the role and city, here\'s what AI filled in. Edit anything before it goes live.</p>' +
        '<form id="postingForm" class="card">' +
          '<div class="ai-badge-row">&#10024; AI-generated from "' + esc(st.searchRole) + '" in ' + esc(st.searchCity) + '"</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1"><label>Experience</label><input name="experience" type="text" value="' + spec.experience + '"></div>' +
            '<div class="field" style="flex:1"><label>Education</label><input name="education" type="text" value="' + spec.education + '"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1"><label>Gender preference</label><input name="gender" type="text" value="' + spec.gender + '"></div>' +
            '<div class="field" style="flex:1"><label>English required</label><input name="english" type="text" value="' + spec.english + '"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1"><label>Salary min (&#8377;/month)</label><input name="salaryMin" type="number" value="' + spec.salaryMin + '"></div>' +
            '<div class="field" style="flex:1"><label>Salary max (&#8377;/month)</label><input name="salaryMax" type="number" value="' + spec.salaryMax + '"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1"><label>Openings</label><input name="openings" type="number" value="2" required></div>' +
            '<div class="field" style="flex:1"><label>Company name</label><input name="company" type="text" placeholder="e.g. Kapoor Logistics" value="Kapoor Logistics" required></div>' +
          '</div>' +
          '<button type="submit" class="btn primary full">Post job &amp; see hot leads &rarr;</button>' +
        '</form>' +
      '</div>'
    );
  }

  // ---------------- Step 6: hot leads preview ----------------
  function renderHotLeadsStep() {
    var leads = D.CANDIDATE_POOL.slice(0, 3);
    return (
      '<div class="onb-wrap flow-step" style="max-width:560px;">' +
        '<div class="flow-progress">Step 6 of 6 &middot; Your hot leads</div>' +
        '<h1 class="onb-title">AI already called 3 candidates for you</h1>' +
        '<p class="onb-sub">Listen to how the screening call went before you commit to a full batch.</p>' +
        leads.map(function (c) {
          return '<div class="cand-card done" style="margin-bottom:14px;">' +
            '<div class="cand-top">' +
              '<div><div class="cand-name">' + esc(c.name) + '</div><div class="cand-meta">' + c.age + 'y &middot; ' + c.area + ' (' + c.distanceKm + ' km) &middot; ' + c.experienceYears + ' yrs exp</div></div>' +
              '<span class="badge-ai">&#10024; Hot lead</span>' +
            '</div>' +
            renderCallRecording(c) +
          '</div>';
        }).join("") +
        '<button class="btn primary full" data-action="start-trial">Start my trial &amp; review all candidates &rarr;</button>' +
      '</div>'
    );
  }

  // ---------------- Dashboard ----------------
  function renderDashboard() {
    var st = S.get();
    var job = st.job;
    var reviewed = st.reviewed, relevant = st.relevantIds.length, calls = st.calledIds.length, shortlisted = st.shortlistedIds.length;
    var pct = Math.min(100, (reviewed / D.TOTAL_ALLOCATION) * 100);

    var endBanner = "";
    if (st.trialEnded) {
      var reasonText = st.trialEndReason === "shortlist_target"
        ? "You've shortlisted " + D.SHORTLIST_TARGET + " strong candidates — your trial is complete."
        : st.trialEndReason === "allocation_exhausted"
          ? "You've reviewed all " + D.TOTAL_ALLOCATION + " profiles included in this trial."
          : "Your 7-day trial window is up.";
      endBanner = '<div class="card" style="background:var(--primary);color:#fff;border:none;margin-bottom:18px;">' +
        '<strong style="font-size:14px;">Trial complete.</strong> <span style="font-size:13.5px;">' + reasonText + ' <a href="#/billing" style="color:#fff;text-decoration:underline;">See what it found &rarr;</a></span></div>';
    }

    return (
      '<div>' +
        endBanner +
        '<div class="stat-row">' +
          '<div class="stat-box"><div class="n">' + reviewed + '/' + D.TOTAL_ALLOCATION + '</div><div class="l">profiles reviewed</div></div>' +
          '<div class="stat-box"><div class="n">' + shortlisted + '/' + D.SHORTLIST_TARGET + '</div><div class="l">shortlisted</div></div>' +
          '<div class="stat-box"><div class="n">Day ' + st.day + '/' + D.TRIAL_DAY_CAP + '</div><div class="l">of trial</div></div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:18px;">' +
          '<p class="section-title">' + esc(job.title) + ', ' + esc(job.city) + '</p>' +
          '<p class="section-sub">' + esc(job.openings) + ' openings &middot; &#8377;' + esc(job.salaryMin) + '&ndash;&#8377;' + esc(job.salaryMax) + '/month &middot; posted by ' + esc(job.company || "") + '</p>' +
          '<div class="progress-bar-track" style="margin-bottom:8px;"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<p class="hint">Trial allocation used: ' + reviewed + ' of ' + D.TOTAL_ALLOCATION + ' profiles</p>' +
          '<div class="row" style="margin-top:14px;">' +
            '<a href="#/candidates" class="btn primary" style="text-decoration:none;">Review candidates</a>' +
            '<a href="#/calls" class="btn ghost" style="text-decoration:none;">Go to calls (' + Math.max(0, relevant - calls) + ' waiting)</a>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<p class="section-title">What\'s happened so far</p>' +
          timelineItem("Job posted &amp; live", true) +
          timelineItem("First candidate AI-screened and reviewed", reviewed > 0) +
          timelineItem("First contact unlocked (marked Relevant)", relevant > 0) +
          timelineItem("First call connected via platform", calls > 0) +
          timelineItem(D.SHORTLIST_TARGET + " candidates shortlisted", shortlisted >= D.SHORTLIST_TARGET) +
          timelineItem("Hire confirmed", st.hireConfirmed) +
        '</div>' +
      '</div>'
    );
  }

  function timelineItem(label, done) {
    return '<div class="timeline-item ' + (done ? "" : "pending") + '"><span class="dot"></span><span>' + label + '</span></div>';
  }

  // ---------------- AI screening call recording (per candidate card) ----------------
  function renderCallRecording(c) {
    var dur = c.callDurationSec || 45;
    var transcriptLines = (c.callTranscript || []).map(function (line, idx) {
      return '<div class="rec-line ' + line.who + '" id="recline-' + c.id + '-' + idx + '">' +
        '<span class="rec-who">' + (line.who === "ai" ? "AI" : c.name.split(" ")[0]) + '</span>' +
        '<span class="rec-text">' + line.t + '</span>' +
      '</div>';
    }).join("");

    return (
      '<div class="call-rec" data-cand="' + c.id + '">' +
        '<button class="rec-play-btn" id="recBtn-' + c.id + '" data-action="toggle-recording" data-id="' + c.id + '" aria-label="Play AI screening call">&#9658;</button>' +
        '<div class="rec-mid">' +
          '<div class="rec-track"><div class="rec-fill" id="recFill-' + c.id + '"></div></div>' +
          '<div class="rec-time" id="recTime-' + c.id + '">0:00 / ' + fmtTime(dur) + '</div>' +
        '</div>' +
        '<button class="rec-transcript-btn" data-action="toggle-transcript" data-id="' + c.id + '">Transcript</button>' +
      '</div>' +
      '<div class="rec-transcript" id="transcript-' + c.id + '" style="display:none;">' + transcriptLines + '</div>'
    );
  }

  // ---------------- Candidates ----------------
  function renderCandidates() {
    var st = S.get();
    var batch = S.currentBatch();
    var exhausted = S.batchExhausted();
    var batchLabel = "Batch " + (st.batchIndex + 1) + " of 3";

    if (st.trialEnded) {
      return '<div class="card">' +
        '<p class="section-title">Trial complete</p>' +
        '<p class="section-sub">Candidate review ended for this trial. <a href="#/billing">See the full result &rarr;</a></p>' +
      '</div>';
    }

    if (exhausted && st.batchIndex >= 2) {
      return '<div class="locked-banner">You\'ve reviewed all 30 profiles included in this trial. <a href="#/billing">See what it found &rarr;</a></div>';
    }
    if (exhausted) {
      return '<div class="locked-banner">' +
        'That\'s all 10 profiles in ' + batchLabel + '. Your next batch unlocks on its usual daily schedule.<br/><br/>' +
        '<button class="btn primary" data-action="advance-batch">Simulate: next batch ready now</button>' +
      '</div>';
    }

    var cards = batch.map(function (c, i) {
      var decided = i < st.cursorInBatch;
      var isRelevant = st.relevantIds.indexOf(c.id) !== -1;
      var isRejected = st.rejectedIds.indexOf(c.id) !== -1;
      var isCurrent = i === st.cursorInBatch;

      var statusRow = "";
      if (isRelevant) {
        var called = st.calledIds.indexOf(c.id) !== -1;
        statusRow = '<div class="unlocked-row"><span>&#128274; Contact unlocked</span>' +
          (called ? '<span class="pill muted">Called</span>' : '<a href="#/calls" class="btn ghost" style="padding:6px 12px;font-size:11.5px;text-decoration:none;">Call via platform &rarr;</a>') +
        '</div>';
      } else if (isRejected) {
        statusRow = '<div class="unlocked-row" style="background:var(--bg);color:var(--muted);"><span>Marked not relevant</span></div>';
      }

      return (
        '<div class="cand-card ' + (decided ? "done" : "") + '">' +
          '<div class="cand-top">' +
            '<div><div class="cand-name">' + esc(c.name) + '</div><div class="cand-meta">' + c.age + 'y &middot; ' + c.area + ' (' + c.distanceKm + ' km) &middot; ' + c.experienceYears + ' yrs exp &middot; ' + c.education + '</div></div>' +
            '<span class="badge-ai">&#10024; AI-verified</span>' +
          '</div>' +
          '<div class="skills-row">' + c.skills.map(function (s) { return '<span class="skill-tag">' + s + '</span>'; }).join("") + '</div>' +
          '<div class="ai-facts">' +
            '<div class="ai-fact"><span class="dot2"></span><span><b>' + c.availability + '</b></span></div>' +
            '<div class="ai-fact"><span class="dot2"></span><span>Expects &#8377;' + c.payExpectationMin.toLocaleString("en-IN") + '&ndash;&#8377;' + c.payExpectationMax.toLocaleString("en-IN") + '</span></div>' +
            '<div class="ai-fact"><span class="dot2"></span><span>' + c.language + '</span></div>' +
          '</div>' +
          renderCallRecording(c) +
          (isCurrent ? '<div class="cand-actions">' +
            '<button class="btn outline-danger" data-action="mark-not-relevant" data-id="' + c.id + '">Not relevant</button>' +
            '<button class="btn success" data-action="mark-relevant" data-id="' + c.id + '">Relevant</button>' +
          '</div>' : "") +
          statusRow +
        '</div>'
      );
    }).join("");

    return (
      '<div>' +
        '<div class="batch-head">' +
          '<div><p class="section-title" style="margin-bottom:2px;">' + batchLabel + '</p><p class="section-sub" style="margin-bottom:0;">AI pre-screened by voice before you see them &mdash; mark Relevant to unlock contact.</p></div>' +
          '<span class="pill muted">' + st.cursorInBatch + '/10 reviewed this batch</span>' +
        '</div>' +
        '<div class="cand-grid">' + cards + '</div>' +
      '</div>'
    );
  }

  // ---------------- Calls ----------------
  function renderCalls() {
    var st = S.get();
    var pool = D.CANDIDATE_POOL;
    var byId = {};
    pool.forEach(function (c) { byId[c.id] = c; });

    var waiting = st.relevantIds.filter(function (id) { return st.calledIds.indexOf(id) === -1; });
    var called = st.relevantIds.filter(function (id) { return st.calledIds.indexOf(id) !== -1; });

    function row(id, status) {
      var c = byId[id];
      var tag = status === "waiting"
        ? '<button class="btn primary" data-action="open-call" data-id="' + id + '">Call via platform</button>'
        : (st.shortlistedIds.indexOf(id) !== -1
            ? '<span class="pill success">Shortlisted</span>'
            : (st.notFitIds.indexOf(id) !== -1 ? '<span class="pill muted">Not a fit</span>' : '<span class="pill warn">Awaiting decision</span>'));
      return '<div class="call-list-item"><div><div class="nm">' + c.name + '</div><div class="meta">' + c.area + ' &middot; ' + c.experienceYears + ' yrs exp</div></div>' + tag + '</div>';
    }

    return (
      '<div>' +
        '<div class="card" style="margin-bottom:18px;">' +
          '<p class="section-title">Ready to call</p>' +
          '<p class="section-sub">Masked, platform-only. No external number is ever shown &mdash; a call must connect to count toward your trial.</p>' +
          (waiting.length ? waiting.map(function (id) { return row(id, "waiting"); }).join("") : '<p class="hint">No unlocked candidates waiting right now &mdash; mark some Relevant on the <a href="#/candidates">Candidates</a> page first.</p>') +
        '</div>' +
        (called.length ? '<div class="card"><p class="section-title">Call history</p>' + called.map(function (id) { return row(id, "done"); }).join("") + '</div>' : "") +
        (st.callOverlayFor ? renderCallOverlay(byId[st.callOverlayFor]) : "") +
      '</div>'
    );
  }

  function renderCallOverlay(candidate) {
    var st = S.get();
    var phase = st.callPhase || "connecting"; // connecting | connected | shortlist
    if (phase === "shortlist") {
      return (
        '<div class="call-overlay">' +
          '<div class="shortlist-prompt">' +
            '<p class="section-title">How did the call go with ' + candidate.name + '?</p>' +
            '<p class="section-sub">Based on the actual conversation, not just the profile.</p>' +
            '<div class="row">' +
              '<button class="btn outline-danger" style="flex:1" data-action="call-not-fit" data-id="' + candidate.id + '">Not a fit</button>' +
              '<button class="btn success" style="flex:1" data-action="call-shortlist" data-id="' + candidate.id + '">Shortlist</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }
    return (
      '<div class="call-overlay"><div class="call-panel">' +
        '<div class="call-masked">&#128274; Platform call &middot; number masked</div>' +
        '<div class="call-avatar">' + candidate.name.charAt(0) + '</div>' +
        '<div style="font-size:17px;font-weight:700;">' + candidate.name + '</div>' +
        '<div style="font-size:13px;color:#9CA3AF;">' + (phase === "connecting" ? "Connecting…" : "Connected") + '</div>' +
        (phase === "connected" ? '<div class="call-timer" id="callTimerDisplay">' + fmtTime(st.callSeconds || 0) + '</div>' : "") +
        '<button class="call-end" data-action="end-call" data-id="' + candidate.id + '">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a1.003 1.003 0 01.01-1.42C3.34 8.78 7.46 7 12 7s8.66 1.78 11.7 4.66c.2.18.31.43.31.7 0 .27-.11.52-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.4 11.4 0 00-2.66-1.85.99.99 0 01-.56-.9v-3.1A17.4 17.4 0 0012 9z"/></svg>' +
        '</button>' +
      '</div></div>'
    );
  }

  // ---------------- Billing ----------------
  function renderBilling() {
    var st = S.get();
    var reviewed = st.reviewed, calls = st.calledIds.length, shortlisted = st.shortlistedIds.length;

    var heroText = st.trialEnded
      ? (st.trialEndReason === "shortlist_target" ? "You found " + D.SHORTLIST_TARGET + " strong candidates." : "Here's what your trial found.")
      : "Your trial is in progress.";

    var hireBlock = "";
    if (st.subscribed && !st.hireConfirmed) {
      hireBlock = '<div class="card" style="margin-top:18px;"><p class="section-title">Simulate a hire</p><p class="section-sub">For the prototype: confirm a hire to see the post-hire feedback loop.</p><button class="btn ghost" data-action="confirm-hire">Mark candidate as hired</button></div>';
    }
    if (st.hireConfirmed) {
      hireBlock = '<div class="card" style="margin-top:18px;"><p class="section-title">Hire confirmed</p><p class="section-sub">A rating request has been sent on the <a href="#/updates">Updates</a> feed.</p></div>';
    }

    return (
      '<div>' +
        '<div class="evidence-box">' +
          '<p class="section-title" style="margin-bottom:10px;">' + heroText + '</p>' +
          '<div class="evidence-row"><span>Profiles reviewed</span><span class="v">' + reviewed + ' / ' + D.TOTAL_ALLOCATION + '</span></div>' +
          '<div class="evidence-row"><span>Calls connected</span><span class="v">' + calls + '</span></div>' +
          '<div class="evidence-row"><span>Candidates shortlisted</span><span class="v">' + shortlisted + ' / ' + D.SHORTLIST_TARGET + '</span></div>' +
          '<div class="evidence-row"><span>Days used</span><span class="v">' + st.day + ' / ' + D.TRIAL_DAY_CAP + '</span></div>' +
        '</div>' +

        (st.subscribed
          ? '<div class="card"><p class="section-title">You\'re subscribed</p><p class="section-sub">&#8377;' + D.PLANS.trialRenewalAmount.toLocaleString("en-IN") + '/month. One flat fee, no commission on salary.</p></div>'
          : '<div class="card">' +
            '<p class="section-title">Continue hiring</p>' +
            '<p class="section-sub">One flat fee. No commission on salary, ever &mdash; not a staffing consultancy.</p>' +
            '<div class="plan-grid">' +
              planCard("Monthly", D.PLANS.monthly, "/month", ["100 candidate unlocks", "Boost job 3&times;", "Unlimited responses"]) +
              planCard("Yearly", D.PLANS.yearlyPerMonth, "/month, billed yearly", ["800 candidate unlocks", "Boost job 24&times;", "Most popular"], true) +
            '</div>' +
            '<button class="btn primary full" style="margin-top:16px;" data-action="subscribe">Subscribe &amp; keep hiring</button>' +
          '</div>'
        ) +
        hireBlock +
      '</div>'
    );
  }

  function planCard(name, price, suffix, feats, highlight) {
    return '<div class="plan-card ' + (highlight ? "highlight" : "") + '">' +
      '<div style="font-weight:700;font-size:13px;">' + name + (highlight ? ' <span class="pill success">Popular</span>' : "") + '</div>' +
      '<div class="plan-price">&#8377;' + price.toLocaleString("en-IN") + '<span style="font-size:12px;color:var(--muted);font-weight:500;">' + suffix + '</span></div>' +
      feats.map(function (f) { return '<div class="plan-feat">&#10003; ' + f + '</div>'; }).join("") +
    '</div>';
  }

  // ---------------- Updates (WhatsApp-style feed) ----------------
  function renderUpdates() {
    var st = S.get();
    var bubbles = st.updatesFeed.map(function (u) {
      return '<div class="wa-bubble">' + u.text + '</div>';
    }).join("");

    var ratingBlock = "";
    if (st.hireConfirmed && !st.hireRating) {
      ratingBlock = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">' +
        '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="great">&#11088; Great fit</button>' +
        '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="ok">&#11088; Okay so far</button>' +
        '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="bad">&#11088; Not working out</button>' +
      '</div>';
    }
    if (st.hireRating) {
      ratingBlock = '<div class="wa-bubble" style="color:#15803D;">Thanks for the rating &mdash; this feeds straight into matching for your next hire.</div>';
    }

    return (
      '<div>' +
        '<p class="section-sub" style="margin-bottom:16px;">This is what gets pushed to WhatsApp &mdash; the primary surface for the 67% of employers who never open the dashboard at all.</p>' +
        '<div class="wa-phone"><div class="wa-screen">' +
          '<div class="wa-head"><div class="wa-avatar">W</div><div class="wa-id"><strong>WorkIndia Hiring Assist</strong><span>online</span></div></div>' +
          '<div class="wa-body">' +
            (bubbles || '<div class="wa-empty">No updates yet &mdash; post a job to see this feed fill up.</div>') +
            ratingBlock +
          '</div>' +
        '</div></div>' +
      '</div>'
    );
  }

  // ---------------- Settings ----------------
  function renderSettings() {
    var st = S.get();
    return (
      '<div class="card view-narrow">' +
        '<p class="section-title">Account</p>' +
        '<p class="section-sub">' + (st.company || "—") + ' &middot; ' + (st.phone || "—") + '</p>' +
        '<div class="notice-box">This is a front-end-only prototype. Nothing here charges real money or calls a real candidate &mdash; all data lives in your browser\'s local storage.</div>' +
        '<button class="btn outline-danger" style="margin-top:16px;" data-action="reset-demo">Reset demo data</button>' +
      '</div>'
    );
  }

  global.WI_VIEWS = {
    search: renderJobSearch,
    count: renderCandidateCount,
    pricing: renderPricingTeaser,
    login: renderLoginStep,
    posting: renderJobPostingAI,
    hotleads: renderHotLeadsStep,
    dashboard: renderDashboard,
    candidates: renderCandidates,
    calls: renderCalls,
    billing: renderBilling,
    updates: renderUpdates,
    settings: renderSettings
  };
})(window);
