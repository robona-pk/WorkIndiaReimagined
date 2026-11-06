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

  function daysSince(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  }

  function relativeDaysLabel(iso) {
    var d = daysSince(iso);
    if (d <= 0) return "Posted today";
    if (d === 1) return "Posted 1 day ago";
    return "Posted " + d + " days ago";
  }

  function hireRatingLabel(r) {
    return r === "great" ? "Great fit" : r === "ok" ? "Okay so far" : "Not working out";
  }

  // Shown once "Not working out" is picked, before the rating is final —
  // we want the reason, not just the verdict, so the next match can
  // actually avoid it. toggleAction/submitAction are data-action names;
  // jobId is null for the single current-job flow, or a past-job id.
  function renderBadReasonPicker(selectedTags, toggleAction, submitAction, jobId) {
    selectedTags = selectedTags || [];
    var jobAttr = jobId ? ' data-job-id="' + jobId + '"' : '';
    var chips = (D.HIRE_BAD_REASONS || []).map(function (tag) {
      var active = selectedTags.indexOf(tag) !== -1;
      return '<button type="button" class="reason-tag' + (active ? ' selected' : '') + '" data-action="' + toggleAction + '"' + jobAttr + ' data-tag="' + esc(tag) + '">' + (active ? '&#10003; ' : '') + esc(tag) + '</button>';
    }).join("");
    return (
      '<div class="job-feedback-cta">' +
        '<p class="section-sub" style="margin-bottom:8px;">Sorry to hear that. What went wrong? Select all that apply.</p>' +
        '<div class="reason-tag-grid">' + chips + '</div>' +
        '<button class="btn ghost" style="margin-top:10px;padding:7px 14px;font-size:11.5px;" data-action="' + submitAction + '"' + jobAttr + '>Submit feedback</button>' +
      '</div>'
    );
  }

  // Appended under a finalized "bad" rating's done-state, showing which
  // reason tags were submitted (nothing rendered for great/ok or if no
  // reasons were picked).
  function renderBadReasonsLine(rating, reasons) {
    if (rating !== "bad" || !reasons || !reasons.length) return "";
    return '<div class="job-feedback-reasons">' + reasons.map(function (t) { return '<span class="reason-tag-chip">' + esc(t) + '</span>'; }).join("") + '</div>';
  }

  // ---------------- Step 1: job search ----------------
  function renderJobSearch() {
    return (
      '<div class="onb-wrap flow-step">' +
        '<div class="flow-progress">Step 1 of 3 &middot; Find your candidates</div>' +
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

  // ---------------- Step 2: candidate count + trial (left) & login (right), one screen ----------------
  // A short count-up loader reveals the trial/pricing card in place on the
  // left; the login form sits on the right from the start — one screen,
  // one action (verify & continue), instead of count → pricing → login as
  // three separate clicks.
  function renderCandidateCount() {
    var st = S.get();
    var count = D.estimateCandidateCount(st.searchRole, st.searchCity);
    return (
      '<div class="onb-wrap flow-step split-step" data-count-target="' + count + '">' +
        '<div class="flow-progress">Step 2 of 3 &middot; Candidates &amp; login</div>' +
        '<div class="split-grid">' +

          '<div class="split-col">' +
            '<div class="card split-card">' +
              '<div class="count-hero">' +
                '<div class="count-num" id="countNum">0</div>' +
                '<p class="count-label">candidates found for <b>' + esc(st.searchRole) + '</b> near <b>' + esc(st.searchCity) + '</b></p>' +
              '</div>' +
              '<div class="split-divider"></div>' +
              '<div class="reveal-after-count" id="pricingReveal" style="opacity:0;">' +
                '<div class="price-hero">' +
                  '<div class="price-rupee">&#8377;' + D.PLANS.trialDueToday + '</div>' +
                  '<p class="price-label">to start hiring today</p>' +
                '</div>' +
                '<ul class="land-list">' +
                  '<li>AI calls and screens candidates by voice before you see them</li>' +
                  '<li>Hot leads matched to your job &mdash; call via platform, your number stays private</li>' +
                '</ul>' +
                '<div class="flat-fee-note">Renews at &#8377;' + D.PLANS.trialRenewalAmount.toLocaleString("en-IN") + '/month only if you continue &mdash; one flat fee, no commission on salary.</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="split-col">' +
            '<div class="card split-card">' +
              '<p class="section-title">Verify your number</p>' +
              '<p class="section-sub">No email signup, no password &mdash; just OTP.</p>' +
              '<form id="loginForm">' +
                '<div class="field"><label>Mobile number</label><input name="phone" type="tel" placeholder="98765 43210" value="9353248620" maxlength="10" required></div>' +
                '<div class="field"><label>OTP</label><input name="otp" type="text" placeholder="Auto-filled for this demo" value="1234" required></div>' +
                '<button type="submit" class="btn primary full">Verify &amp; start hiring @ &#8377;' + D.PLANS.trialDueToday + ' &rarr;</button>' +
              '</form>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>'
    );
  }

  // A numbered stepper — the current step filled and glowing, the rest
  // outlined — showing the whole loop (post -> AI screens -> you review ->
  // hire) in one glance. Folded directly into the posting step (not its
  // own screen) so a recruiter understands why "AI already called 3
  // candidates" shows up later, without adding to the onboarding step
  // count. Chosen over four other treatments prototyped separately.
  function renderHowItWorksStrip() {
    var steps = [
      { icon: "&#128221;", label: "Post job" },
      { icon: "&#128222;", label: "AI screens candidates" },
      { icon: "&#9989;", label: "You see relevant matches" },
      { icon: "&#129309;", label: "Unlock contact &amp; hire" }
    ];
    return '<div class="hiw-stepper"><div class="hiw-stepper-row">' +
      steps.map(function (s, i) {
        var current = i === 0;
        return (
          '<div class="hiw-node' + (current ? ' current' : '') + '">' +
            (i < steps.length - 1 ? '<div class="hiw-line"></div>' : '') +
            '<div class="hiw-circle">' + s.icon + '</div>' +
            '<div class="hiw-label">' + s.label + '</div>' +
            (current ? '<span class="hiw-tag">You&rsquo;re here</span>' : '') +
          '</div>'
        );
      }).join('') +
    '</div></div>';
  }

  // ---------------- Step 3: job + company, one step, with a progress bar ----------------
  // Condensed on purpose: a hiring manager in a hurry shouldn't read a page
  // of instructions. Chips instead of paragraphs, icons instead of labels
  // wherever a glance says more than a sentence. Company profile fields are
  // folded into the same step instead of a separate screen.
  function renderJobPostingAI() {
    var st = S.get();
    var spec = D.suggestJobSpec(st.searchRole);
    return (
      '<div class="onb-wrap flow-step" style="max-width:640px;">' +
        renderHowItWorksStrip() +
        '<div class="post-progress-head">' +
          '<div class="post-progress-label"><span>Almost live</span><span id="postPct">60%</span></div>' +
          '<div class="progress-bar-track"><div class="progress-bar-fill" id="postProgressFill" style="width:60%"></div></div>' +
        '</div>' +
        '<form id="postingForm" class="card">' +
          '<div class="ai-badge-row">&#10024; AI-drafted for ' + esc(st.searchRole) + ' &middot; ' + esc(st.searchCity) + '</div>' +

          '<div class="field-mini-label">Your company</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1.3"><input name="company" type="text" placeholder="Company name" value="Kapoor Logistics" required></div>' +
            '<div class="field" style="flex:1"><select name="industry">' +
              ['Logistics', 'Retail', 'Hospitality', 'BPO / Telecalling', 'Manufacturing', 'Other'].map(function (o) { return '<option' + (o === "Logistics" ? ' selected' : '') + '>' + o + '</option>'; }).join("") +
            '</select></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1"><select name="companySize">' +
              ['1–10 employees', '11–50 employees', '51–200 employees', '200+ employees'].map(function (o) { return '<option>' + o + '</option>'; }).join("") +
            '</select></div>' +
            '<div class="field" style="flex:1"><input name="companyLocation" type="text" placeholder="Office location" value="' + esc(st.searchCity) + '"></div>' +
          '</div>' +

          '<div class="field-mini-label">Job requirements</div>' +
          '<div class="chip-field-row">' +
            chipField("experience", spec.experience, ["0–1 years", "0–2 years", "1–3 years", "3–5 years"]) +
            chipField("education", spec.education, ["No minimum", "10th pass", "12th pass", "Graduate"]) +
          '</div>' +
          '<div class="chip-field-row">' +
            chipField("gender", spec.gender, ["Any", "Male preferred", "Female preferred"]) +
            chipField("english", spec.english, ["Not required", "Basic English", "Fluent English"]) +
          '</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1"><label>Salary &#8377;/month</label>' +
              '<div class="row" style="gap:6px;"><input name="salaryMin" type="number" value="' + spec.salaryMin + '" style="width:50%"> <input name="salaryMax" type="number" value="' + spec.salaryMax + '" style="width:50%"></div>' +
            '</div>' +
            '<div class="field" style="flex:1"><label>Openings</label><input name="openings" type="number" value="2" required></div>' +
          '</div>' +

          '<label class="id-verify-toggle">' +
            '<input type="checkbox" name="idVerificationRequired">' +
            '<span class="id-verify-toggle-title">Require Aadhaar/PAN verification to apply</span>' +
          '</label>' +

          '<button type="submit" class="btn primary full">Make job live &rarr;</button>' +
        '</form>' +
      '</div>'
    );
  }

  function chipField(name, selected, options) {
    return '<div class="field" style="flex:1">' +
      '<input type="hidden" name="' + name + '" value="' + esc(selected) + '">' +
      '<div class="chip-opts" data-chip-group="' + name + '">' +
        options.map(function (o) {
          return '<button type="button" class="chip-opt' + (o === selected ? ' active' : '') + '" data-chip-value="' + esc(o) + '">' + o + '</button>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  // ---------------- Step: matching loader (auto-advances) ----------------
  function renderMatchingLoader() {
    return (
      '<div class="onb-wrap flow-step" style="text-align:center;">' +
        '<div class="match-spinner"></div>' +
        '<h1 class="onb-title" style="margin-top:22px;">Finding relevant matches for your requirement&hellip;</h1>' +
        '<p class="onb-sub">AI is calling candidates nearby right now to confirm availability and pay fit.</p>' +
      '</div>'
    );
  }

  // ---------------- Step: hot leads (dashboard of leads relevant to this job) ----------------
  function renderHotLeadsStep() {
    var leads = D.CANDIDATE_POOL.slice(0, 3);
    return (
      '<div class="onb-wrap flow-step" style="max-width:600px;">' +
        '<div class="flow-progress">Your job is live &middot; hot leads ready</div>' +
        '<h1 class="onb-title">AI already called 3 candidates for you</h1>' +
        '<p class="onb-sub">Listen to the real screening call before you commit to a full batch.</p>' +
        leads.map(function (c) { return renderLeadCard(c); }).join("") +
        '<button class="btn primary full" data-action="start-trial">Start my trial &amp; review all candidates &rarr;</button>' +
      '</div>'
    );
  }

  // ---------------- Naukri-style rich candidate/lead card ----------------
  function avatarInitials(name) {
    var parts = String(name).split(" ");
    return (parts[0] ? parts[0][0] : "") + (parts[1] ? parts[1][0] : "");
  }

  function renderLeadCard(c) {
    return (
      '<div class="lead-card">' +
        '<div class="lead-top">' +
          '<div class="lead-avatar">' + avatarInitials(c.name) + '</div>' +
          '<div class="lead-id">' +
            '<div class="lead-name">' + esc(c.name) + ' <span class="badge-ai">&#10024; AI-verified</span></div>' +
            '<div class="lead-meta">' + c.age + ' yrs &middot; ' + c.experienceYears + ' yrs exp &middot; ' + c.area + ' (' + c.distanceKm + ' km away)</div>' +
          '</div>' +
        '</div>' +
        '<div class="skills-row">' + c.skills.map(function (s) { return '<span class="skill-tag">' + s + '</span>'; }).join("") + '</div>' +
        '<div class="ai-facts">' +
          '<div class="ai-fact"><span class="dot2"></span><span><b>' + c.availability + '</b></span></div>' +
          '<div class="ai-fact"><span class="dot2"></span><span>Expects &#8377;' + c.payExpectationMin.toLocaleString("en-IN") + '&ndash;&#8377;' + c.payExpectationMax.toLocaleString("en-IN") + '</span></div>' +
          '<div class="ai-fact"><span class="dot2"></span><span>' + c.language + '</span></div>' +
        '</div>' +
        renderCallRecording(c) +
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
          : "Your 3-day trial window is up.";
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
  // c.audioFile set (cand-1/2/3 only) → a real <audio> element with actual
  // synthesized speech (Hindi / Kannada / English placeholder voices) drives
  // playback and the transcript highlight is synced to real audio.currentTime.
  // Everyone else keeps the simulated progress-bar playback.
  function renderCallRecording(c) {
    var dur = c.callDurationSec || 45;
    var isReal = !!c.audioFile;
    var transcriptLines = (c.callTranscript || []).map(function (line, idx) {
      var translation = (isReal && line.t_en && line.t_en !== line.t) ? '<span class="rec-translit">' + line.t_en + '</span>' : "";
      return '<div class="rec-line ' + line.who + '" id="recline-' + c.id + '-' + idx + '">' +
        '<span class="rec-who">' + (line.who === "ai" ? "AI" : c.name.split(" ")[0]) + '</span>' +
        '<span class="rec-text">' + line.t + translation + '</span>' +
      '</div>';
    }).join("");

    var langBadge = isReal ? '<span class="lang-badge">&#127908; ' + c.audioLang.toUpperCase() + ' &middot; real audio sample</span>' : "";

    return (
      '<div class="call-rec" data-cand="' + c.id + '">' +
        '<button class="rec-play-btn" id="recBtn-' + c.id + '" data-action="toggle-recording" data-id="' + c.id + '" aria-label="Play AI screening call">&#9658;</button>' +
        '<div class="rec-mid">' +
          '<div class="rec-track"><div class="rec-fill" id="recFill-' + c.id + '"></div></div>' +
          '<div class="rec-time" id="recTime-' + c.id + '">0:00 / ' + fmtTime(dur) + '</div>' +
        '</div>' +
        '<button class="rec-transcript-btn" data-action="toggle-transcript" data-id="' + c.id + '">Transcript</button>' +
      '</div>' +
      langBadge +
      (isReal ? '<audio id="recAudio-' + c.id + '" src="' + c.audioFile + '" preload="none"></audio>' : "") +
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
      return '<div class="locked-banner">You\'ve reviewed all ' + D.TOTAL_ALLOCATION + ' profiles included in this trial. <a href="#/billing">See what it found &rarr;</a></div>';
    }
    if (exhausted) {
      return '<div class="locked-banner">' +
        'That\'s all 10 profiles in ' + batchLabel + '. Your next batch unlocks on its usual daily schedule.<br/><br/>' +
        '<button class="btn primary" data-action="advance-batch">Simulate: next batch ready now</button>' +
      '</div>';
    }

    var filters = st.candidateFilters;
    var shownCount = 0;
    var cards = batch.map(function (c, i) {
      if (!candidateMatchesFilters(c, filters)) return null;
      shownCount++;

      var decided = i < st.cursorInBatch;
      var isRelevant = st.relevantIds.indexOf(c.id) !== -1;
      var isRejected = st.rejectedIds.indexOf(c.id) !== -1;
      var isCurrent = i === st.cursorInBatch;

      var isShortlisted = st.shortlistedIds.indexOf(c.id) !== -1;
      var statusRow = "";
      if (isRelevant) {
        var called = st.calledIds.indexOf(c.id) !== -1;
        statusRow = '<div class="unlocked-row"><span>&#128274; Contact unlocked</span>' +
          (called ? '<span class="pill muted">Called</span>' : '<a href="#/calls" class="btn ghost" style="padding:6px 12px;font-size:11.5px;text-decoration:none;">Call via platform &rarr;</a>') +
        '</div>' +
        (isShortlisted
          ? '<div class="unlocked-row" style="background:var(--success-light);color:var(--success);"><span>&#11088; Shortlisted</span></div>'
          : '<button class="btn outline-shortlist full" data-action="shortlist-from-card" data-id="' + c.id + '">&#11088; Shortlist candidate</button>'
        );
      } else if (isRejected) {
        statusRow = '<div class="unlocked-row" style="background:var(--bg);color:var(--muted);"><span>Marked not relevant</span></div>';
      }

      return (
        '<div class="cand-card ' + (decided ? "done" : "") + '">' +
          '<div class="cand-top">' +
            '<div><div class="cand-name">' + esc(c.name) + '</div><div class="cand-meta">' + c.age + 'y &middot; ' + c.gender + ' &middot; ' + c.area + ' (' + c.distanceKm + ' km) &middot; ' + c.experienceYears + ' yrs exp &middot; ' + c.education + '</div></div>' +
            '<div class="cand-badges">' +
              '<span class="badge-ai">&#10024; AI-verified</span>' +
              (c.verified ? '<span class="badge-id-verified" title="Aadhaar/PAN verified">&#128274; ID Verified</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="skills-row">' + c.skills.map(function (s) { return '<span class="skill-tag">' + s + '</span>'; }).join("") + '</div>' +
          '<div class="ai-facts">' +
            '<div class="ai-fact"><span class="dot2"></span><span><b>' + c.availability + '</b></span></div>' +
            '<div class="ai-fact"><span class="dot2"></span><span>Expects &#8377;' + c.payExpectationMin.toLocaleString("en-IN") + '&ndash;&#8377;' + c.payExpectationMax.toLocaleString("en-IN") + '</span></div>' +
            '<div class="ai-fact"><span class="dot2"></span><span>' + c.language + ' &middot; ' + c.englishLevel + '</span></div>' +
          '</div>' +
          renderCallRecording(c) +
          (isCurrent ? '<div class="cand-actions">' +
            '<button class="btn outline-danger" data-action="mark-not-relevant" data-id="' + c.id + '">Not relevant</button>' +
            '<button class="btn success" data-action="mark-relevant" data-id="' + c.id + '">Relevant</button>' +
          '</div>' : "") +
          statusRow +
        '</div>'
      );
    }).filter(function (html) { return html; }).join("");

    var filtersActive = filters.verifiedOnly || filters.activeCandidatesOnly || filters.distance !== "any" || filters.activeIn !== "any" ||
      filters.experience !== "any" || filters.gender !== "any" || filters.english !== "any";
    var emptyState = (!cards && filtersActive)
      ? '<div class="locked-banner">No candidates in this batch match your filters. <button class="btn ghost" style="margin-left:8px;padding:6px 12px;font-size:11.5px;" data-action="clear-cand-filters">Clear filters</button></div>'
      : "";

    return (
      '<div class="candidates-layout">' +
        renderCandidateRail(st, shownCount, batch.length) +
        '<div class="cand-main">' +
          '<div class="batch-head">' +
            '<div><p class="section-title" style="margin-bottom:2px;">' + batchLabel + '</p><p class="section-sub" style="margin-bottom:0;">AI pre-screened by voice before you see them &mdash; mark Relevant to unlock contact.</p></div>' +
            '<span class="pill muted">' + st.cursorInBatch + '/10 reviewed this batch</span>' +
          '</div>' +
          '<div class="trial-shortlist-note">You can shortlist up to <b>' + D.SHORTLIST_TARGET + ' candidates</b> on this trial &middot; ' + st.shortlistedIds.length + '/' + D.SHORTLIST_TARGET + ' used</div>' +
          (emptyState || '<div class="cand-grid">' + cards + '</div>') +
        '</div>' +
        (st.showPaywall ? renderPaywall() : "") +
        (st.paymentStep ? renderPaymentModal() : "") +
      '</div>'
    );
  }

  // Narrows which cards in the current batch are shown. Doesn't touch the
  // review queue/cursor itself — a filtered-out candidate stays wherever
  // it is in the sequence, it's just not rendered right now.
  function candidateMatchesFilters(c, f) {
    if (f.verifiedOnly && !c.verified) return false;
    if (f.activeCandidatesOnly && c.lastActiveDaysAgo > 15) return false;
    if (f.distance !== "any" && c.distanceKm > Number(f.distance)) return false;
    if (f.activeIn !== "any" && c.lastActiveDaysAgo > Number(f.activeIn)) return false;
    if (f.experience !== "any") {
      if (f.experience === "0-1" && c.experienceYears > 1) return false;
      if (f.experience === "1-3" && (c.experienceYears < 1 || c.experienceYears > 3)) return false;
      if (f.experience === "3-5" && c.experienceYears < 3) return false;
    }
    if (f.gender !== "any" && c.gender !== f.gender) return false;
    if (f.english !== "any" && c.englishLevel !== f.english) return false;
    return true;
  }

  // Left filter rail — mirrors the real WorkIndia Database tab's layout:
  // a sticky sidebar of collapsible radio-group filters plus a prominent
  // toggle at the top, instead of a horizontal chip bar fighting for room.
  function renderCandidateRail(st, shownCount, totalCount) {
    var f = st.candidateFilters;
    var open = st.candRailOpen;
    var activeCount = (f.verifiedOnly ? 1 : 0) + (f.activeCandidatesOnly ? 1 : 0) + (f.distance !== "any" ? 1 : 0) + (f.activeIn !== "any" ? 1 : 0) +
      (f.experience !== "any" ? 1 : 0) + (f.gender !== "any" ? 1 : 0) + (f.english !== "any" ? 1 : 0);

    return (
      '<aside class="cand-rail">' +
        '<div class="cand-rail-head">' +
          '<div><span class="cand-rail-title">All Filters</span><span class="cand-rail-count">' + shownCount + ' of ' + totalCount + ' shown</span></div>' +
          (activeCount ? '<button type="button" class="cand-filter-clear" data-action="clear-cand-filters">Clear all</button>' : '') +
        '</div>' +

        '<button type="button" class="cand-rail-verified' + (f.verifiedOnly ? ' active' : '') + '" data-action="toggle-verified-filter">' +
          '<span class="verified-filter-check">' + (f.verifiedOnly ? '&#10003;' : '') + '</span>' +
          '<span class="cand-rail-verified-text"><span class="t">&#128274; Verified profiles only</span><span class="s">Aadhaar/PAN verified candidates</span></span>' +
        '</button>' +

        '<button type="button" class="cand-rail-verified' + (f.activeCandidatesOnly ? ' active' : '') + '" data-action="toggle-active-candidates-filter">' +
          '<span class="verified-filter-check">' + (f.activeCandidatesOnly ? '&#10003;' : '') + '</span>' +
          '<span class="cand-rail-verified-text"><span class="t">&#9889; Active candidates only</span><span class="s">Active on WorkIndia in the last 15 days</span></span>' +
        '</button>' +

        candRailGroup("distance", "Distance", open.distance, f.distance !== "any", [
          candRailOption("distance", "any", "Anywhere in the city", f.distance),
          candRailOption("distance", "5", "Within 5 km", f.distance),
          candRailOption("distance", "10", "Within 10 km", f.distance),
          candRailOption("distance", "15", "Within 15 km", f.distance),
          candRailOption("distance", "20", "Within 20 km", f.distance)
        ]) +

        candRailGroup("activeIn", "Candidate Active In", open.activeIn, f.activeIn !== "any", [
          candRailOption("activeIn", "any", "Show all", f.activeIn),
          candRailOption("activeIn", "1", "1 Day", f.activeIn),
          candRailOption("activeIn", "3", "3 Days", f.activeIn),
          candRailOption("activeIn", "7", "7 Days", f.activeIn),
          candRailOption("activeIn", "15", "15 Days", f.activeIn),
          candRailOption("activeIn", "30", "1 Month", f.activeIn)
        ]) +

        candRailGroup("experience", "Experience", open.experience, f.experience !== "any", [
          candRailOption("experience", "any", "Any", f.experience),
          candRailOption("experience", "0-1", "0&ndash;1 yrs", f.experience),
          candRailOption("experience", "1-3", "1&ndash;3 yrs", f.experience),
          candRailOption("experience", "3-5", "3+ yrs", f.experience)
        ]) +

        candRailGroup("gender", "Gender", open.gender, f.gender !== "any", [
          candRailOption("gender", "any", "Any", f.gender),
          candRailOption("gender", "Male", "Male", f.gender),
          candRailOption("gender", "Female", "Female", f.gender)
        ]) +

        candRailGroup("english", "English", open.english, f.english !== "any", [
          candRailOption("english", "any", "Any", f.english),
          candRailOption("english", "Basic English", "Basic English", f.english),
          candRailOption("english", "Fluent English", "Fluent English", f.english)
        ]) +
      '</aside>'
    );
  }

  function candRailGroup(key, label, isOpen, hasActive, optionsHtml) {
    return (
      '<div class="cand-rail-group' + (isOpen ? ' open' : '') + '">' +
        '<button type="button" class="cand-rail-group-head" data-action="toggle-cand-rail-group" data-key="' + key + '">' +
          '<span>' + label + (hasActive ? '<span class="cand-rail-badge">1</span>' : '') + '</span>' +
          '<span class="cand-rail-chev">&#9662;</span>' +
        '</button>' +
        '<div class="cand-rail-body">' + optionsHtml.join('') + '</div>' +
      '</div>'
    );
  }

  function candRailOption(key, value, label, current) {
    var checked = current === value;
    return (
      '<label class="cand-rail-option">' +
        '<input type="radio" name="cand-rail-' + key + '"' + (checked ? ' checked' : '') +
          ' data-action="set-cand-filter" data-key="' + key + '" data-value="' + esc(value) + '">' +
        '<span>' + label + '</span>' +
      '</label>'
    );
  }

  // ---------------- Paywall modal (shown past the trial shortlist cap) ----------------
  function renderPaywall() {
    var tiers = D.PLANS.tiers;
    return (
      '<div class="call-overlay" data-action-bg="close-paywall">' +
        '<div class="paywall-panel">' +
          '<button class="paywall-close" data-action="close-paywall" aria-label="Close">&times;</button>' +
          '<p class="section-title">You\'ve used all ' + D.SHORTLIST_TARGET + ' trial contact unlocks</p>' +
          '<p class="section-sub" style="margin-bottom:18px;">Keep hiring beyond the trial with a flat-fee plan &mdash; no commission on salary, ever.</p>' +
          '<div class="paywall-grid">' +
            tiers.map(function (t) {
              return '<div class="paywall-card' + (t.popular ? " popular" : "") + '">' +
                (t.popular ? '<div class="paywall-pop">&#9733; Most Popular</div>' : "") +
                '<div class="paywall-name">' + t.name + '</div>' +
                '<div class="paywall-price">&#8377;' + t.perMonth.toLocaleString("en-IN") + '<span>/month</span></div>' +
                '<div class="paywall-upfront">Pay upfront: &#8377;' + t.payUpfront.toLocaleString("en-IN") + '</div>' +
                '<button class="btn ' + (t.popular ? "primary" : "ghost") + ' full" data-action="subscribe-tier" data-id="' + t.id + '" data-group="single" style="margin:10px 0 12px;">Start immediately</button>' +
                '<ul class="paywall-feats">' +
                  '<li>Unlock ' + t.unlocks + ' candidate profiles</li>' +
                  '<li>Boost job up to ' + t.boosts + ' times</li>' +
                  '<li>Valid for ' + t.validDays + ' days' + (t.note ? ' &middot; ' + t.note : '') + '</li>' +
                '</ul>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function findTier(group, tierId) {
    var g = group === "multi" ? D.PLANS.multiHire : D.PLANS.singleHire;
    return g.tiers.filter(function (t) { return t.id === tierId; })[0] || null;
  }

  function paymentMethodLabel(m) {
    if (m === "upi") return "UPI";
    if (m === "card") return "card";
    if (m === "netbanking") return "netbanking";
    return "your selected method";
  }

  // ---------------- Mock payment modal ----------------
  // Purely illustrative — no real gateway, no real charge. Walks through
  // picking a method, a brief "processing" beat, then success; the tier
  // only actually becomes subscribed once that beat completes (see
  // Actions.completePayment), not the moment "Buy Now" is clicked.
  function renderPaymentModal() {
    var st = S.get();
    var tier = findTier(st.paymentGroup, st.paymentTierId);
    if (!tier) return "";
    var amount = tier.payUpfront ? tier.payUpfront : (tier.priceLabel ? 1 : tier.perMonth);
    var amountLabel = "&#8377;" + amount.toLocaleString("en-IN");

    if (st.paymentStep === "success") {
      return (
        '<div class="call-overlay">' +
          '<div class="payment-panel">' +
            '<div class="payment-success-check">&#10003;</div>' +
            '<p class="section-title" style="margin:10px 0 4px;">Payment successful</p>' +
            '<p class="section-sub" style="margin-bottom:18px;">You&rsquo;re now on the <b>' + esc(tier.name) + '</b> plan.</p>' +
            '<button class="btn primary full" data-action="close-payment-modal">Continue</button>' +
          '</div>' +
        '</div>'
      );
    }

    if (st.paymentStep === "processing") {
      return (
        '<div class="call-overlay">' +
          '<div class="payment-panel">' +
            '<div class="match-spinner" style="margin-top:6px;"></div>' +
            '<p class="section-title" style="margin:16px 0 4px;">Processing your payment&hellip;</p>' +
            '<p class="section-sub">Paying ' + amountLabel + ' via ' + paymentMethodLabel(st.paymentMethod) + '. Don&rsquo;t close this window.</p>' +
          '</div>' +
        '</div>'
      );
    }

    if (st.paymentStep === "qr") {
      return (
        '<div class="call-overlay">' +
          '<div class="payment-panel">' +
            '<button class="paywall-close" data-action="close-payment-modal" aria-label="Close">&times;</button>' +
            '<p class="section-title" style="margin-bottom:2px;">Scan to pay</p>' +
            '<p class="payment-amount">' + amountLabel + '</p>' +
            '<div class="qr-box">' + renderFakeQr(tier.id + "|" + st.paymentTierId) + '</div>' +
            '<p class="qr-upi-id">pay.workindia@upi</p>' +
            '<p class="section-sub" style="margin-bottom:16px;">Open any UPI app &mdash; Google Pay, PhonePe, Paytm &mdash; and scan this code to pay.</p>' +
            '<button class="btn primary full" data-action="confirm-qr-scan">I&rsquo;ve scanned &amp; paid</button>' +
            '<p class="payment-note">&#128274; This is a prototype &mdash; no real payment is made. Click above to simulate a completed scan.</p>' +
          '</div>' +
        '</div>'
      );
    }

    var methods = [
      { id: "upi", icon: "&#128241;", label: "UPI", sub: "Google Pay, PhonePe, Paytm &amp; more" },
      { id: "card", icon: "&#128179;", label: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay" },
      { id: "netbanking", icon: "&#127974;", label: "Netbanking", sub: "All major banks" }
    ];
    return (
      '<div class="call-overlay" data-action-bg="close-payment-modal">' +
        '<div class="payment-panel">' +
          '<button class="paywall-close" data-action="close-payment-modal" aria-label="Close">&times;</button>' +
          '<p class="section-title" style="margin-bottom:2px;">' + esc(tier.name) + '</p>' +
          '<p class="payment-amount">' + amountLabel + '</p>' +
          '<p class="section-sub" style="margin-bottom:16px;">Choose a payment method</p>' +
          methods.map(function (m) {
            var selected = st.paymentMethod === m.id;
            return '<button type="button" class="payment-method-row' + (selected ? ' selected' : '') + '" data-action="select-payment-method" data-id="' + m.id + '">' +
              '<span class="payment-method-icon">' + m.icon + '</span>' +
              '<span class="payment-method-text"><span class="payment-method-label">' + m.label + '</span><span class="payment-method-sub">' + m.sub + '</span></span>' +
              '<span class="payment-method-radio' + (selected ? ' checked' : '') + '"></span>' +
            '</button>';
          }).join("") +
          '<button class="btn primary full" style="margin-top:16px;" data-action="pay-now"' + (st.paymentMethod ? '' : ' disabled') + '>' +
            (st.paymentMethod === "upi" ? "Generate QR" : "Pay " + amountLabel) +
          '</button>' +
          '<p class="payment-note">&#128274; This is a prototype &mdash; no real payment is made.</p>' +
        '</div>' +
      '</div>'
    );
  }

  // Deterministic fake QR grid (purely visual, never a real payment code) —
  // seeded off the tier so it looks stable rather than flickering per render.
  function renderFakeQr(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) { h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
    var rnd = function () { h = (h * 9301 + 49297) % 233280; return h / 233280; };
    var SIZE = 11;
    var cells = "";
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var inFinder = (r < 3 && c < 3) || (r < 3 && c >= SIZE - 3) || (r >= SIZE - 3 && c < 3);
        var on;
        if (inFinder) {
          var fr = r < 3 ? r : SIZE - 1 - r, fc = c < 3 ? c : SIZE - 1 - c;
          on = (fr === 0 || fr === 2 || fc === 0 || fc === 2) ? true : (fr === 1 && fc === 1);
        } else {
          on = rnd() > 0.52;
        }
        cells += '<span class="qr-cell' + (on ? ' on' : '') + '"></span>';
      }
    }
    return '<div class="qr-grid">' + cells + '</div>';
  }

  // ---------------- Calls ----------------
  function renderCalls() {
    var st = S.get();
    var pool = D.CANDIDATE_POOL;
    var byId = {};
    pool.forEach(function (c) { byId[c.id] = c; });

    var waiting = st.relevantIds.filter(function (id) { return st.calledIds.indexOf(id) === -1; });
    var called = st.relevantIds.filter(function (id) { return st.calledIds.indexOf(id) !== -1; });

    function nameLink(c) {
      return '<button type="button" class="cl-name-link" data-action="view-profile" data-id="' + c.id + '">' + esc(c.name) + '</button>';
    }

    function waitingRow(id) {
      var c = byId[id];
      return (
        '<div class="call-list-item">' +
          '<div><div class="nm">' + nameLink(c) + '</div><div class="meta">' + c.area + ' &middot; ' + c.experienceYears + ' yrs exp</div></div>' +
          '<button class="btn primary" data-action="open-call" data-id="' + id + '">Call via platform</button>' +
        '</div>'
      );
    }

    // A completed call: duration, playback of the recruiter's OWN voice —
    // captured live via the mic while the call was connected (see
    // js/recorder.js) — and a Summary CTA with a one-line post-call note
    // built from the candidate's data + decision so far. If mic capture
    // didn't happen (denied, unsupported, or a call made before this
    // feature existed), we say so plainly rather than play a stand-in clip.
    function doneRow(id) {
      var c = byId[id];
      var decision = st.shortlistedIds.indexOf(id) !== -1 ? "shortlisted"
        : (st.notFitIds.indexOf(id) !== -1 ? "notFit" : "pending");
      var tag = decision === "shortlisted" ? '<span class="pill success">Shortlisted</span>'
        : (decision === "notFit" ? '<span class="pill muted">Not a fit</span>' : '<span class="pill warn">Awaiting decision</span>');
      var durSec = st.callDurations[id];
      if (durSec === undefined) durSec = 60 + (id.charCodeAt(id.length - 1) * 7) % 180; // fallback for pre-existing demo state
      var hasRecording = !!(st.liveCallRecordings && st.liveCallRecordings[id]);
      // Prefer the real transcript captured live from the recruiter's mic
      // during this call (see js/recorder.js) over any derived text — this
      // is literally what was said, not a guess at what probably was.
      // Browsers without SpeechRecognition (or a call made before this
      // existed) fall back to the old decision-based line, labeled as such.
      var transcript = (st.liveCallTranscripts && st.liveCallTranscripts[id]) || "";
      var summaryLabel, summary;
      if (transcript) {
        summaryLabel = "Transcript of this call (captured live)";
        summary = transcript;
      } else {
        summaryLabel = window.WI_RECORDER && window.WI_RECORDER.transcriptionSupported()
          ? "No speech was picked up on this call &mdash; not a transcript:"
          : "This browser can&rsquo;t transcribe calls live &mdash; not a transcript:";
        summary = D.buildRecruiterCallSummary(c, decision);
      }

      var callRow = hasRecording
        ? ('<button type="button" class="cl-mini-play" id="rcallBtn-' + id + '" data-action="toggle-rcall" data-id="' + id + '" aria-label="Play your recorded call">&#9658;</button>' +
           '<span class="cl-duration" id="rcallTime-' + id + '">00:00 / ' + fmtTime(durSec) + '</span>' +
           '<span class="cl-call-dur-total">&middot; your voice, recorded live on this call</span>' +
           '<audio id="rcallAudio-' + id + '" data-rcall="' + id + '" preload="none"></audio>')
        : ('<span class="cl-no-recording">No recording captured for this call' +
           (st.micPermissionDenied ? ' &mdash; mic access wasn&rsquo;t granted.' : '.') + '</span>' +
           '<span class="cl-call-dur-total">&middot; call lasted ' + fmtTime(durSec) + '</span>');

      return (
        '<div class="call-list-item call-list-item-done">' +
          '<div class="cl-top-row">' +
            '<div><div class="nm">' + nameLink(c) + '</div><div class="meta">' + c.area + ' &middot; ' + c.experienceYears + ' yrs exp</div></div>' +
            tag +
          '</div>' +
          '<div class="cl-call-row">' + callRow +
            '<button type="button" class="btn ghost cl-summary-btn" data-action="toggle-summary" data-id="' + id + '">Summary</button>' +
          '</div>' +
          '<div class="cl-summary-box" id="rcallSummary-' + id + '" style="display:none;">' +
            '<div class="cl-summary-label">' + summaryLabel + '</div>' +
            esc(summary) +
          '</div>' +
        '</div>'
      );
    }

    // Once the trial has ended (contact unlocks used up, sample exhausted,
    // or the 3-day window closed), no new calls can be placed — only past
    // call history stays reviewable. Mirrors the gate on the Candidates tab.
    var readyCard = st.trialEnded
      ? '<div class="card" style="margin-bottom:18px;"><p class="section-title">Trial complete</p><p class="section-sub">Calling is part of the paid plan now. <a href="#/billing">See what your trial found &rarr;</a></p></div>'
      : ('<div class="card" style="margin-bottom:18px;">' +
          '<p class="section-title">Ready to call</p>' +
          '<p class="section-sub">Masked, platform-only. No external number is ever shown &mdash; a call must connect to count toward your trial.</p>' +
          (waiting.length ? waiting.map(waitingRow).join("") : '<p class="hint">No unlocked candidates waiting right now &mdash; mark some Relevant on the <a href="#/candidates">Candidates</a> page first.</p>') +
        '</div>');

    return (
      '<div>' +
        readyCard +
        (called.length ? '<div class="card"><p class="section-title">Call history</p><p class="section-sub">Tap a name to open the full profile. Each call has its own recording and a quick summary.</p>' + called.map(doneRow).join("") + '</div>' : "") +
        (st.callOverlayFor ? renderCallOverlay(byId[st.callOverlayFor]) : "") +
        (st.profileOpenFor ? renderCandidateProfileOverlay(byId[st.profileOpenFor]) : "") +
        (st.showPaywall ? renderPaywall() : "") +
        (st.paymentStep ? renderPaymentModal() : "") +
      '</div>'
    );
  }

  // Full candidate profile, reachable by clicking a name anywhere in the
  // Calls tab. Shows everything known about the candidate plus whichever
  // call recordings exist for them (AI screening call and/or the
  // recruiter's own call), so "redirected to the candidate's profile"
  // doesn't just repeat what the list row already showed.
  function renderCandidateProfileOverlay(c) {
    if (!c) return "";
    var payStr = "&#8377;" + c.payExpectationMin.toLocaleString("en-IN") + "&ndash;&#8377;" + c.payExpectationMax.toLocaleString("en-IN");
    return (
      '<div class="call-overlay" data-action-bg="close-profile">' +
        '<div class="profile-panel">' +
          '<button class="paywall-close" data-action="close-profile" aria-label="Close">&times;</button>' +
          '<div class="profile-head">' +
            '<div class="profile-avatar">' + avatarInitials(c.name) + '</div>' +
            '<div>' +
              '<p class="profile-name">' + esc(c.name) + '</p>' +
              '<p class="profile-sub">' + c.age + ' yrs &middot; ' + c.experienceYears + ' yrs exp &middot; ' + esc(c.area) + ' (' + c.distanceKm + ' km away)</p>' +
            '</div>' +
          '</div>' +
          '<div class="profile-grid">' +
            '<div><span class="pl">Availability</span><span class="pv">' + esc(c.availability) + '</span></div>' +
            '<div><span class="pl">Pay expectation</span><span class="pv">' + payStr + '/month</span></div>' +
            '<div><span class="pl">Education</span><span class="pv">' + esc(c.education) + '</span></div>' +
            '<div><span class="pl">Language</span><span class="pv">' + esc(c.language) + '</span></div>' +
          '</div>' +
          '<p class="field-mini-label" style="margin-top:14px;">Skills</p>' +
          '<div class="chip-opts" style="pointer-events:none;">' + c.skills.map(function (s) { return '<span class="chip-opt active" style="cursor:default;">' + esc(s) + '</span>'; }).join("") + '</div>' +
          '<p class="field-mini-label" style="margin-top:16px;">AI screening call</p>' +
          renderCallRecording(c) +
        '</div>' +
      '</div>'
    );
  }

  function renderCallOverlay(candidate) {
    var st = S.get();
    var phase = st.callPhase || "connecting"; // requesting-mic | mic-blocked | connecting | connected | shortlist
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

    // Every platform call is recorded, so mic access is required before the
    // call can actually be placed — it isn't an optional nicety the call
    // proceeds without.
    if (phase === "requesting-mic") {
      return (
        '<div class="call-overlay"><div class="call-panel">' +
          '<div class="call-avatar">' + candidate.name.charAt(0) + '</div>' +
          '<div style="font-size:17px;font-weight:700;">' + candidate.name + '</div>' +
          '<div style="font-size:13px;color:#9CA3AF;">Requesting microphone access&hellip;</div>' +
          '<p class="section-sub" style="max-width:260px;">Allow mic access in the browser prompt to continue &mdash; every platform call is recorded.</p>' +
          '<button class="btn ghost" data-action="cancel-call">Cancel</button>' +
        '</div></div>'
      );
    }
    if (phase === "mic-blocked") {
      return (
        '<div class="call-overlay"><div class="call-panel">' +
          '<div class="call-avatar" style="background:var(--danger);">&#128263;</div>' +
          '<p class="section-title" style="color:#fff;margin:0;">Mic access needed to call</p>' +
          '<p class="section-sub" style="max-width:280px;">WorkIndia records every call with ' + candidate.name + ' for your reference. Allow microphone access in your browser to place the call.</p>' +
          '<div class="row">' +
            '<button class="btn ghost" style="flex:1" data-action="cancel-call">Cancel</button>' +
            '<button class="btn primary" style="flex:1" data-action="retry-mic-call" data-id="' + candidate.id + '">Try again</button>' +
          '</div>' +
        '</div></div>'
      );
    }

    return (
      '<div class="call-overlay"><div class="call-panel">' +
        '<div class="call-masked">&#128274; Platform call &middot; number masked</div>' +
        '<div class="call-avatar">' + candidate.name.charAt(0) + '</div>' +
        '<div style="font-size:17px;font-weight:700;">' + candidate.name + '</div>' +
        '<div style="font-size:13px;color:#9CA3AF;">' + (phase === "connecting" ? "Connecting…" : "Connected") + '</div>' +
        (phase === "connected" ? '<div class="call-timer" id="callTimerDisplay">' + fmtTime(st.callSeconds || 0) + '</div>' : "") +
        (phase === "connected"
          ? '<div class="call-rec-indicator"><span class="call-rec-dot"></span>Recording your voice for this call</div>'
          : "") +
        '<button class="call-end" data-action="end-call" data-id="' + candidate.id + '">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a1.003 1.003 0 01.01-1.42C3.34 8.78 7.46 7 12 7s8.66 1.78 11.7 4.66c.2.18.31.43.31.7 0 .27-.11.52-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.4 11.4 0 00-2.66-1.85.99.99 0 01-.56-.9v-3.1A17.4 17.4 0 0012 9z"/></svg>' +
        '</button>' +
      '</div></div>'
    );
  }

  // ---------------- Billing ----------------
  // My Jobs (status + hire/feedback), the trust ticker, trial/plan
  // progress, the Single Hire / Multi Hires plan grid, and a sidebar
  // (trust reasons, FAQ, talk-to-sales) that build confidence right
  // where a recruiter decides whether to pay.
  function renderBilling() {
    var st = S.get();
    var reviewed = st.reviewed, calls = st.calledIds.length, shortlisted = st.shortlistedIds.length;

    var heroText = st.trialEnded
      ? (st.trialEndReason === "shortlist_target" ? "You found " + D.SHORTLIST_TARGET + " strong candidates." : "Here's what your trial found.")
      : "Your trial is in progress.";

    var plansBlock;
    if (st.subscribed) {
      var subGroup = st.subscribedGroup === "multi" ? D.PLANS.multiHire : D.PLANS.singleHire;
      var subTier = subGroup.tiers.filter(function (t) { return t.id === st.subscribedTierId; })[0];
      var validDays = subTier ? subTier.validDays : 30;
      var daysElapsed = st.subscribedAt ? Math.floor((Date.now() - new Date(st.subscribedAt).getTime()) / 86400000) : 0;
      var daysLeft = Math.max(0, validDays - daysElapsed);
      var pctElapsed = Math.max(0, Math.min(100, Math.round((daysElapsed / validDays) * 100)));
      var unlocksIncluded = subTier ? subTier.unlocks : null;

      plansBlock = '<div class="card active-plan-card">' +
        '<span class="plan-active-badge">&#9679; Active plan</span>' +
        '<p class="section-title" style="margin:8px 0 2px;">' + esc(subTier ? subTier.name : "Your plan") + ' <span class="plan-active-group">&middot; ' + (subGroup === D.PLANS.multiHire ? "Multi Hires" : "Single Hire") + '</span></p>' +
        '<p class="section-sub" style="margin-bottom:16px;">' + (subTier && subTier.perMonth ? '&#8377;' + subTier.perMonth.toLocaleString("en-IN") + '/month &mdash; ' : '') + 'One flat fee, no commission on salary.</p>' +
        '<div class="plan-validity">' +
          '<div class="plan-validity-row"><span>' + daysLeft + ' of ' + validDays + ' days left</span><span>' + pctElapsed + '% used</span></div>' +
          '<div class="plan-validity-bar"><div class="plan-validity-fill" style="width:' + pctElapsed + '%;"></div></div>' +
        '</div>' +
        '<div class="plan-usage-grid">' +
          planUsageStat("Candidates unlocked", shortlisted + (unlocksIncluded ? " / " + unlocksIncluded.toLocaleString("en-IN") : "")) +
          planUsageStat("Profiles shortlisted", shortlisted) +
          planUsageStat("Profiles reviewed", reviewed) +
          planUsageStat("Calls connected", calls) +
          planUsageStat("Jobs active", subTier ? subTier.jobsActive : 1) +
        '</div>' +
      '</div>';
    } else {
      var activeGroup = st.billingTab === "multi" ? D.PLANS.multiHire : D.PLANS.singleHire;
      plansBlock = '<div class="card">' +
        '<p class="section-title">Continue hiring</p>' +
        '<p class="section-sub">' + esc(activeGroup.tagline) + ' One flat fee &mdash; no commission on salary, ever.</p>' +
        '<div class="promo-banner">&#127881; Limited-time offer &mdash; get up to 7 extra days free on any plan you buy now.</div>' +
        '<div class="billing-tabs">' +
          '<button type="button" class="billing-tab' + (st.billingTab !== "multi" ? ' active' : '') + '" data-action="set-billing-tab" data-id="single">Single Hire</button>' +
          '<button type="button" class="billing-tab' + (st.billingTab === "multi" ? ' active' : '') + '" data-action="set-billing-tab" data-id="multi">Multi Hires <span class="billing-tab-save">' + D.PLANS.multiHire.saveBadge + '</span></button>' +
        '</div>' +
        '<div class="plan-grid plan-grid-wide">' + activeGroup.tiers.map(function (t) { return renderPlanTier(t, st.billingTab); }).join("") + '</div>' +
      '</div>';
    }

    var EMP_CHIPS = [
      ["zomato", "#E23744"], ["DMart", "#1B6E3C"], ["Flipkart", "#047BFF"], ["rapido", "#F7B500"],
      ["Justdial", "#C3002F"], ["Cars24", "#EA580C"], ["Uni Cards", "#1757D6"], ["ShopForChange", "#1F7A4D"]
    ];
    var chipsHtml = EMP_CHIPS.map(function (c) { return '<span class="emp-chip" style="--b:' + c[1] + ';">' + c[0] + '</span>'; }).join("");
    var tickerBlock = '<div class="card billing-ticker">' +
      '<div class="billing-ticker-label">Hiring teams who&rsquo;ve found staff through WorkIndia</div>' +
      '<div class="ticker-mask"><div class="ticker-track">' + chipsHtml + chipsHtml + '</div></div>' +
    '</div>';

    var sidebar = '<div class="billing-sidebar">' +
      '<div class="side-card">' +
        '<div class="side-card-title">Why employers trust WorkIndia</div>' +
        '<div class="trust-list">' +
          trustItem("&#9989;", "Verified &amp; active profiles", "Every candidate shown has been screened and confirmed available &mdash; not stale leads.") +
          trustItem("&#8377;", "No commission, ever", "One flat fee whatever the salary.") +
          trustItem("&#128274;", "Number stays private", "Calls run through the platform, never your personal number.") +
          trustItem("&#127911;", "Every call recorded", "Play back any screening call, any time.") +
          trustItem("&#10060;", "Cancel anytime", "No lock-in beyond the plan you pick.") +
        '</div>' +
      '</div>' +
      '<div class="side-card">' +
        '<div class="side-card-title">Common questions</div>' +
        faqItem("What happens after the trial?", "You keep everything you've already unlocked &mdash; new unlocks need a plan.") +
        faqItem("Will my number ever be shared?", "No &mdash; every call runs through the platform.") +
        faqItem("Can I switch plans later?", "Yes, upgrade or add jobs anytime, no lock-in.") +
      '</div>' +
      '<div class="side-card">' +
        '<div class="side-card-title">Not sure which plan fits?</div>' +
        (st.salesHelpRequested
          ? '<div class="sales-help-done">&#10003; We\'ll be in touch shortly.</div>'
          : ('<div class="sales-help-sub">Tell us how you hire and we\'ll point you to the right one.</div>' +
             '<button class="btn ghost full" data-action="request-sales-help">Talk to our team</button>')) +
      '</div>' +
    '</div>';

    var evidenceBlock = st.subscribed ? "" : (
      '<div class="evidence-box">' +
        '<p class="section-title" style="margin-bottom:10px;">' + heroText + '</p>' +
        '<div class="evidence-row"><span>Profiles reviewed</span><span class="v">' + reviewed + ' / ' + D.TOTAL_ALLOCATION + '</span></div>' +
        '<div class="evidence-row"><span>Calls connected</span><span class="v">' + calls + '</span></div>' +
        '<div class="evidence-row"><span>Candidates shortlisted</span><span class="v">' + shortlisted + ' / ' + D.SHORTLIST_TARGET + '</span></div>' +
        '<div class="evidence-row"><span>Days used</span><span class="v">' + st.day + ' / ' + D.TRIAL_DAY_CAP + '</span></div>' +
      '</div>'
    );

    return (
      '<div>' +
        tickerBlock +
        evidenceBlock +
        '<div class="billing-layout">' +
          plansBlock +
          sidebar +
        '</div>' +
        (st.paymentStep ? renderPaymentModal() : "") +
      '</div>'
    );
  }

  // ---------------- My Jobs (own top-level section) ----------------
  function renderJobsPage() {
    var st = S.get();
    var currentBlock = st.job
      ? renderMyJobs(st)
      : '<div class="card"><p class="section-title">No job posted yet</p><p class="section-sub">Once you post a job it&rsquo;ll show up here with its status, requirements, and hire &amp; feedback tracking.</p></div>';

    var pastJobs = D.MOCK_PAST_JOBS || [];
    var pastBlock = pastJobs.length
      ? ('<div class="card my-jobs-card" style="margin-top:14px;">' +
          '<p class="section-title" style="margin-bottom:4px;">Past Hires</p>' +
          '<p class="section-sub" style="margin-bottom:12px;">Roles you&rsquo;ve closed out through WorkIndia &mdash; we check in ' + D.HIRE_FEEDBACK_DELAY_DAYS + ' days after each hire to see how it&rsquo;s working out.</p>' +
          pastJobs.map(function (pj) { return renderPastJobRow(st, pj); }).join("") +
        '</div>')
      : "";

    return currentBlock + pastBlock;
  }

  // A closed, already-hired role from the mock hiring history. Mirrors
  // renderMyJobs' row/expand/feedback pattern but keyed by job id, since
  // this prototype can show several past hires at once instead of one.
  function renderPastJobRow(st, pj) {
    var expanded = st.expandedPastJobId === pj.id;
    var rating = st.mockJobRatings.hasOwnProperty(pj.id) ? st.mockJobRatings[pj.id] : pj.rating;
    var waited = pj.hiredDaysAgo;
    var delay = D.HIRE_FEEDBACK_DELAY_DAYS;

    var detailBlock = expanded
      ? ('<div class="job-detail-grid">' +
          jobDetailCell("Hired", esc(pj.candidateName)) +
          jobDetailCell("Area", pj.area || "&mdash;") +
          jobDetailCell("City", pj.city || "&mdash;") +
          jobDetailCell("Openings", pj.openings) +
          jobDetailCell("Posted", relativeDaysLabel(daysAgoIso(pj.postedDaysAgo))) +
          jobDetailCell("Hired on", relativeDaysLabel(daysAgoIso(pj.hiredDaysAgo))) +
        '</div>')
      : "";

    var actionsBlock;
    if (rating) {
      actionsBlock = '<div class="job-feedback-done">&#10003; Feedback recorded for ' + esc(pj.candidateName) + ': <b>' + hireRatingLabel(rating) + '</b></div>' + renderBadReasonsLine(rating, st.mockJobBadReasons[pj.id]);
    } else if (st.mockJobBadPending[pj.id]) {
      actionsBlock = renderBadReasonPicker(st.mockJobBadTags[pj.id], "toggle-mock-bad-tag", "submit-mock-bad-feedback", pj.id);
    } else if (waited >= delay) {
      actionsBlock = '<div class="job-feedback-cta">' +
        '<p class="section-sub" style="margin-bottom:8px;">' + esc(pj.candidateName) + ' has been onboard ' + delay + '+ days &mdash; was the hire a good fit?</p>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-mock-job" data-job-id="' + pj.id + '" data-rating="great">&#11088; Great fit</button>' +
          '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-mock-job" data-job-id="' + pj.id + '" data-rating="ok">&#11088; Okay so far</button>' +
          '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-mock-job" data-job-id="' + pj.id + '" data-rating="bad">&#11088; Not working out</button>' +
        '</div>' +
      '</div>';
    } else {
      actionsBlock = '<div class="job-feedback-wait"><b>' + esc(pj.candidateName) + '</b> was hired for this role. We check in ' + delay + ' days after a hire &mdash; ' + (delay - waited) + ' to go.</div>';
    }

    return (
      '<div class="job-row' + (expanded ? ' expanded' : '') + '" data-action="toggle-past-job" data-id="' + pj.id + '" style="margin-top:10px;">' +
        '<div class="job-row-main">' +
          '<span class="job-status-badge closed">&#9679; Closed &middot; Hired</span>' +
          '<div class="job-row-title">' + esc(pj.title) + '</div>' +
          '<div class="job-row-sub">' + esc(pj.area || pj.city || "") + ' &middot; &#8377;' + Number(pj.salaryMin).toLocaleString("en-IN") + '&ndash;&#8377;' + Number(pj.salaryMax).toLocaleString("en-IN") + ' &middot; ' + esc(pj.openings) + ' openings &middot; ' + relativeDaysLabel(daysAgoIso(pj.postedDaysAgo)) +
          '</div>' +
        '</div>' +
        '<span class="job-row-chevron">' + (expanded ? "&#9650;" : "&#9660;") + '</span>' +
      '</div>' +
      detailBlock +
      '<div class="job-actions">' + actionsBlock + '</div>'
    );
  }

  function daysAgoIso(days) {
    return new Date(Date.now() - days * 86400000).toISOString();
  }

  // One job row (this prototype only tracks one job at a time) with its
  // status, expandable requirement details, and the hire -> 3-month
  // feedback-gate flow folded in rather than living as a separate card.
  function renderMyJobs(st) {
    var job = st.job;
    if (!job) return "";
    var spec = st.draftJob || {};
    var isOpen = !st.hireConfirmed;
    var expanded = !!st.jobDetailsOpen;

    var statusBadge = isOpen
      ? '<span class="job-status-badge open">&#9679; Open</span>'
      : '<span class="job-status-badge closed">&#9679; Closed &middot; Hired</span>';

    var detailBlock = expanded
      ? ('<div class="job-detail-grid">' +
          jobDetailCell("Experience", spec.experience || "Not specified") +
          jobDetailCell("Education", spec.education || "Not specified") +
          jobDetailCell("Gender", spec.gender || "Any") +
          jobDetailCell("English", spec.english || "Not required") +
          jobDetailCell("Area", job.area || "&mdash;") +
          jobDetailCell("City", job.city || "&mdash;") +
          jobDetailCell("ID verification", job.idVerificationRequired ? "&#128274; Required to apply" : "Not required") +
        '</div>')
      : "";

    var actionsBlock;
    if (isOpen) {
      actionsBlock = '<button class="btn ghost" data-action="confirm-hire">Mark as hired</button>';
    } else if (st.hireRating) {
      actionsBlock = '<div class="job-feedback-done">&#10003; Feedback recorded for ' + esc(st.hiredCandidateName || "this hire") + ': <b>' + hireRatingLabel(st.hireRating) + '</b></div>' + renderBadReasonsLine(st.hireRating, st.hireBadReasons);
    } else if (st.hireBadPending) {
      actionsBlock = renderBadReasonPicker(st.hireBadTags, "toggle-hire-bad-tag", "submit-hire-bad-feedback", null);
    } else {
      var waited = daysSince(st.hiredAt);
      var delay = D.HIRE_FEEDBACK_DELAY_DAYS;
      if (waited >= delay) {
        actionsBlock = '<div class="job-feedback-cta">' +
          '<p class="section-sub" style="margin-bottom:8px;">' + esc(st.hiredCandidateName || "Your hire") + ' has been onboard ' + delay + '+ days &mdash; how&rsquo;s it going?</p>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
            '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="great">&#11088; Great fit</button>' +
            '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="ok">&#11088; Okay so far</button>' +
            '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="bad">&#11088; Not working out</button>' +
          '</div>' +
        '</div>';
      } else {
        actionsBlock = '<div class="job-feedback-wait"><b>' + esc(st.hiredCandidateName || "Candidate") + '</b> was hired for this role. We check in ' + delay + ' days after a hire &mdash; ' + (delay - waited) + ' to go.</div>';
      }
    }

    return (
      '<div class="card my-jobs-card">' +
        '<p class="section-title" style="margin-bottom:12px;">My Jobs</p>' +
        '<div class="job-row' + (expanded ? ' expanded' : '') + '" data-action="toggle-job-details">' +
          '<div class="job-row-main">' +
            statusBadge +
            '<div class="job-row-title">' + esc(job.title) + '</div>' +
            '<div class="job-row-sub">' + esc(job.area || job.city || "") + ' &middot; &#8377;' + Number(job.salaryMin).toLocaleString("en-IN") + '&ndash;&#8377;' + Number(job.salaryMax).toLocaleString("en-IN") + ' &middot; ' + esc(job.openings) + ' openings &middot; ' + relativeDaysLabel(st.jobPostedAt) +
            '</div>' +
          '</div>' +
          '<span class="job-row-chevron">' + (expanded ? "&#9650;" : "&#9660;") + '</span>' +
        '</div>' +
        detailBlock +
        '<div class="job-actions">' + actionsBlock + '</div>' +
      '</div>'
    );
  }

  function jobDetailCell(label, value) {
    return '<div class="job-detail-cell"><div class="job-detail-l">' + label + '</div><div class="job-detail-v">' + esc(value) + '</div></div>';
  }

  function pad2(n) { n = String(n); return n.length < 2 ? "0" + n : n; }

  function trustItem(icon, title, sub) {
    return '<div class="trust-item"><div class="trust-icon">' + icon + '</div><div><div class="trust-item-title">' + title + '</div><div class="trust-item-sub">' + sub + '</div></div></div>';
  }

  function faqItem(q, a) {
    return '<div class="faq-item"><div class="faq-q">' + q + '</div><div class="faq-a">' + a + '</div></div>';
  }

  function planUsageStat(label, value) {
    return '<div class="plan-usage-stat"><div class="plan-usage-v">' + value + '</div><div class="plan-usage-l">' + label + '</div></div>';
  }

  // One pricing tier card. Deliberately short: a "best for" purpose tag
  // tells a recruiter which plan fits their hiring pattern at a glance,
  // and only the 2-3 numbers that actually differ between tiers are
  // spelled out — no repeated boilerplate line across all four cards.
  function renderPlanTier(tier, group) {
    var isTrial = tier.id === "trial";
    var feats = [];
    feats.push(tier.unlocks.toLocaleString("en-IN") + " candidate unlocks");
    if (tier.boosts > 0) feats.push(tier.boosts + " job boosts");
    feats.push("Valid " + tier.validDays + " days");

    var priceBlock = isTrial
      ? ('<div class="plan-price">' + tier.priceLabel + '</div><div class="plan-price-sub">' + tier.priceSub + '</div>')
      : ('<div class="plan-price">&#8377;' + tier.perMonth.toLocaleString("en-IN") + '<span class="plan-price-unit">/month</span></div>' +
         (tier.payUpfront ? '<div class="plan-price-sub">Pay Upfront: &#8377;' + tier.payUpfront.toLocaleString("en-IN") + '</div>' : ''));

    return (
      '<div class="plan-card' + (tier.popular ? ' highlight' : '') + '">' +
        (tier.popular ? '<div class="plan-ribbon">&#9733; Most Popular</div>' : '') +
        (tier.badge ? '<div class="plan-badge">' + tier.badge + '</div>' : '') +
        '<div class="plan-name">' + esc(tier.name) + '</div>' +
        (tier.purpose ? '<div class="plan-purpose">&#127919; Best for: ' + esc(tier.purpose) + '</div>' : '') +
        priceBlock +
        '<button class="btn ' + (tier.popular ? "primary" : "ghost") + ' full" style="margin:12px 0 14px;" data-action="subscribe-tier" data-id="' + tier.id + '" data-group="' + group + '">' + (isTrial ? "Start Trial Now" : "Buy Now") + '</button>' +
        feats.map(function (f) { return '<div class="plan-feat">&#10003; ' + f + '</div>'; }).join("") +
        (tier.note ? '<div class="plan-note">' + tier.note + '</div>' : '') +
        (tier.cancelNote ? '<div class="plan-cancel-note">' + tier.cancelNote + '</div>' : '') +
      '</div>'
    );
  }

  // ---------------- Updates (WhatsApp-style feed) ----------------
  function renderUpdates() {
    var st = S.get();
    var bubbles = st.updatesFeed.map(function (u) {
      return '<div class="wa-bubble">' + u.text + '</div>';
    }).join("");

    var ratingBlock = "";
    if (st.hireBadPending) {
      ratingBlock = renderBadReasonPicker(st.hireBadTags, "toggle-hire-bad-tag", "submit-hire-bad-feedback", null);
    } else if (st.hireConfirmed && !st.hireRating) {
      if (daysSince(st.hiredAt) >= D.HIRE_FEEDBACK_DELAY_DAYS) {
        ratingBlock = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">' +
          '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="great">&#11088; Great fit</button>' +
          '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="ok">&#11088; Okay so far</button>' +
          '<button class="btn ghost" style="padding:7px 12px;font-size:11.5px;" data-action="rate-hire" data-rating="bad">&#11088; Not working out</button>' +
        '</div>';
      } else {
        ratingBlock = '<div class="wa-bubble">We check in ' + D.HIRE_FEEDBACK_DELAY_DAYS + ' days after a hire &mdash; ' + (D.HIRE_FEEDBACK_DELAY_DAYS - daysSince(st.hiredAt)) + ' to go.</div>';
      }
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
    posting: renderJobPostingAI,
    matching: renderMatchingLoader,
    hotleads: renderHotLeadsStep,
    dashboard: renderDashboard,
    jobs: renderJobsPage,
    candidates: renderCandidates,
    calls: renderCalls,
    billing: renderBilling,
    updates: renderUpdates,
    settings: renderSettings
  };
})(window);
