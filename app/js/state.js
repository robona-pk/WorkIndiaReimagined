/* WorkIndia Reimagined — app state.
   Persisted to localStorage so the app behaves like a real product
   across page reloads (per browser, per device — this is a
   front-end-only prototype, there is no server). */

(function (global) {
  "use strict";

  var STORAGE_KEY = "wi_reimagined_state_v1";

  function defaultState() {
    return {
      onboarded: false,
      sidebarCollapsed: false,   // left nav rail — collapsed to icons-only when true
      flowStep: "search",        // "search" | "count" (candidates+trial+login) | "posting" | "matching" (then straight to the dashboard)
      tourSeen: false,           // first-time guided tour of the dashboard — shown once, replayable from the dashboard
      searchRole: null,
      searchCity: null,
      draftJob: null,            // AI-suggested job spec, built on the posting step
      company: null,
      companyProfile: null,      // { industry, size, location }
      phone: null,
      showPaywall: false,
      job: null,                 // { title, city, area, salaryMin, salaryMax, openings }
      jobPostedAt: null,
      day: 1,
      batchIndex: 0,             // which batch of 10 is unlocked (0, 1, 2)
      cursorInBatch: 0,          // position within current batch, 0..9
      reviewed: 0,               // total profiles reviewed (relevant + not relevant)
      relevantIds: [],           // candidate ids marked relevant (contact unlocked)
      calledIds: [],             // candidate ids with a connected call
      shortlistedIds: [],        // candidate ids shortlisted
      rejectedIds: [],           // candidate ids marked not relevant
      notFitIds: [],             // candidate ids called but not a fit
      trialEnded: false,
      trialEndReason: null,      // "shortlist_target" | "allocation_exhausted" | "day_cap"
      subscribed: false,
      hireConfirmed: false,
      hireRating: null,
      hireBadPending: false,     // true once "Not working out" is picked but reason tags haven't been submitted yet
      hireBadTags: [],           // reason tags currently toggled, for the pending "bad" rating
      hireBadReasons: null,      // the submitted reason tags, once feedback is finalized
      hiredAt: null,             // ISO timestamp set the moment a hire is confirmed — feedback is only asked for after HIRE_FEEDBACK_DELAY_DAYS
      jobDetailsOpen: false,     // My Jobs card: whether the job row is expanded
      expandedPastJobId: null,   // My Jobs page: which closed-job row (from MOCK_PAST_JOBS) is expanded
      mockJobRatings: {},        // past-job id -> rating, once the feedback nudge is answered (overrides the seed data's default rating)
      mockJobBadPending: {},     // past-job id -> true while its "Not working out" reason tags are being picked
      mockJobBadTags: {},        // past-job id -> reason tags currently toggled
      mockJobBadReasons: {},     // past-job id -> submitted reason tags, once finalized
      updatesFeed: [],           // WhatsApp-style message log
      callDurations: {},         // candidateId -> seconds, recorded when a recruiter call ends
      profileOpenFor: null,      // candidateId whose profile overlay is open, or null
      liveCallRecordings: {},    // candidateId -> true once the recruiter's own mic audio was captured for that call
      transcriptStatus: {},      // candidateId -> "pending" | "done" | "empty" | "failed" — transcription of the saved call recording
      liveCallTranscripts: {},   // candidateId -> real text transcribed live from the recruiter's mic during that call (empty/absent if speech recognition wasn't available or caught nothing)
      micPermissionDenied: false, // true once the browser mic prompt has been denied/unsupported, so we stop re-asking
      billingTab: "single",      // "single" | "multi" — which pricing tab is showing on Trial & Billing
      subscribedTierId: null,    // e.g. "1m" | "3m" | "12m" — which plan tier they subscribed to
      subscribedGroup: null,     // "single" | "multi" — which tab that tier was chosen from
      paymentTierId: null,       // mock payment flow — set while the "Buy Now" modal is open
      paymentGroup: null,
      paymentStep: null,         // "method" | "processing" | "success"
      paymentMethod: null,       // "upi" | "card" | "netbanking"
      salesHelpRequested: false, // true once the Billing page's "talk to our team" prompt was used
      subscribedAt: null,        // ISO timestamp set the moment a plan is actually paid for
      candidateFilters: {        // Candidates page filter rail — narrows which cards show, doesn't touch the review queue itself
        verifiedOnly: false,     // Aadhaar/PAN verified candidates only
        activeCandidatesOnly: false, // hides anyone inactive on WorkIndia for 15+ days, to cut down on candidates who won't respond
        distance: "any",         // "any" | "5" | "10" | "15" | "20" (km)
        activeIn: "any",         // "any" | "1" | "3" | "7" | "15" | "30" | "60" (days) — finer-grained recency, separate from the toggle above
        experience: "any",       // "any" | "0-1" | "1-3" | "3-5"
        gender: "any",           // "any" | "Male" | "Female"
        english: "any"           // "any" | "Basic English" | "Fluent English"
      },
      candRailOpen: { distance: true, activeIn: true, experience: false, gender: false, english: false },
      // ---- Bulk Hiring (WhatsApp invites to suggested candidates) ----
      bulkCampaigns: [],         // [{ id, jobTitle, templateId, recipientIds, sentAt, day }]
      bulkStep: null,            // null (campaign list) | "audience" | "message" | "review"
      bulkSelected: [],          // suggested-candidate ids picked for the current draft
      bulkFilters: { distance: "10", activeIn: "15", verifiedOnly: false, gender: "any" },
      bulkTemplateId: "job_invite_hinglish",
      bulkViewCampaignId: null,  // campaign whose detail panel is open
      bulkDay: 1                 // simulated calendar day for bulk sending (separate from the trial's day counter)
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var merged = Object.assign(defaultState(), parsed);
      // candidateFilters/candRailOpen gain new keys over time; a shallow
      // Object.assign would let an older saved object hide the new ones,
      // so merge these two nested objects explicitly.
      merged.candidateFilters = Object.assign(defaultState().candidateFilters, parsed.candidateFilters || {});
      merged.candRailOpen = Object.assign(defaultState().candRailOpen, parsed.candRailOpen || {});
      merged.bulkFilters = Object.assign(defaultState().bulkFilters, parsed.bulkFilters || {});
      // A call can't still be in progress after a reload — don't reopen its overlay.
      merged.callOverlayFor = null;
      merged.callPhase = null;
      return merged;
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  var state = load();

  function pushUpdate(text) {
    state.updatesFeed.push({ text: text, at: new Date().toISOString() });
  }

  var Actions = {

    resetAll: function () {
      state = defaultState();
      save(state);
    },

    markTourSeen: function () {
      state.tourSeen = true;
      save(state);
    },

    setFlowStep: function (step) {
      state.flowStep = step;
      save(state);
    },

    submitSearch: function (role, city) {
      state.searchRole = role;
      state.searchCity = city;
      state.flowStep = "count";
      save(state);
    },

    verifyLogin: function (phone) {
      state.phone = phone;
      state.flowStep = "posting"; // straight to the job form — the "how this works" explainer lives inline on this step, not as its own screen
      save(state);
    },

    confirmJobPosting: function (jobDraft, companyProfile) {
      state.draftJob = jobDraft;
      state.companyProfile = companyProfile || null;
      state.flowStep = "matching";
      save(state);
    },

    startTrial: function (company) {
      Actions.postJob(company, state.phone, state.draftJob, state.companyProfile);
    },

    postJob: function (company, phone, job, companyProfile) {
      state.onboarded = true;
      state.company = company;
      state.companyProfile = companyProfile || state.companyProfile;
      state.phone = phone;
      state.job = job;
      state.jobPostedAt = new Date().toISOString();
      pushUpdate("Your job " + job.title + ", " + job.city + " is live! Candidates can see it now.");
      pushUpdate("Just so it's clear — your plan is a one-time flat fee. No commission on salary, ever.");
      pushUpdate("We're calling candidates near you right now to check who's actually available and a fit — your first verified batch is ready.");
      save(state);
    },

    currentBatch: function () {
      var start = state.batchIndex * global.WI_DATA.BATCH_SIZE;
      return global.WI_DATA.CANDIDATE_POOL.slice(start, start + global.WI_DATA.BATCH_SIZE);
    },

    currentCandidate: function () {
      var batch = Actions.currentBatch();
      return batch[state.cursorInBatch] || null;
    },

    batchExhausted: function () {
      return state.cursorInBatch >= global.WI_DATA.BATCH_SIZE;
    },

    markRelevant: function (candidateId) {
      state.relevantIds.push(candidateId);
      state.reviewed++;
      state.cursorInBatch++;
      maybeAdvanceDay();
      checkTrialEnd();
      save(state);
    },

    // One-tap Shortlist from a candidate card: shortlisting IS the unlock
    // (it counts toward the trial's SHORTLIST_TARGET contacts), so it also
    // records the profile as reviewed + relevant in one go. Any card can be
    // shortlisted, in any order — not just the next one in the batch.
    shortlistFromCard: function (candidateId) {
      if (state.shortlistedIds.indexOf(candidateId) !== -1) return true;
      if (!state.subscribed && (state.trialEnded || state.shortlistedIds.length >= global.WI_DATA.SHORTLIST_TARGET)) {
        state.showPaywall = true;
        save(state);
        return false;
      }
      if (state.relevantIds.indexOf(candidateId) === -1) {
        state.relevantIds.push(candidateId);
        state.reviewed++;
        state.cursorInBatch++;
        maybeAdvanceDay();
      }
      return Actions.shortlistCandidate(candidateId);
    },

    markNotRelevant: function (candidateId) {
      if (state.rejectedIds.indexOf(candidateId) !== -1 || state.relevantIds.indexOf(candidateId) !== -1) return;
      state.rejectedIds.push(candidateId);
      state.reviewed++;
      state.cursorInBatch++;
      maybeAdvanceDay();
      checkTrialEnd();
      save(state);
    },

    advanceBatch: function () {
      if (state.batchIndex < 2) {
        state.batchIndex++;
        state.cursorInBatch = 0;
        pushUpdate("Your next 10 candidates are ready to review.");
      }
      save(state);
    },

    connectCall: function (candidateId) {
      state.calledIds.push(candidateId);
      save(state);
    },

    // Called once a recruiter's own call (via "Call via platform") ends,
    // so the Calls tab can show real elapsed duration per candidate
    // instead of nothing.
    recordCallDuration: function (candidateId, seconds) {
      state.callDurations[candidateId] = seconds;
      save(state);
    },

    // Marks whether the recruiter's own mic audio was actually captured
    // for this call (see js/recorder.js). false means no recording exists
    // — the UI should say so plainly rather than play a stand-in clip.
    markLiveRecording: function (candidateId, captured) {
      state.liveCallRecordings[candidateId] = !!captured;
      save(state);
    },

    // Stores the real transcript captured live during this call (see
    // js/recorder.js). An empty string is stored as-is — "nothing was
    // transcribed" is meaningfully different from "no attempt was made" to
    // the UI, which only shows a transcript-based summary when this is non-empty.
    setCallTranscript: function (candidateId, text) {
      state.liveCallTranscripts[candidateId] = text || "";
      save(state);
    },

    setTranscriptStatus: function (candidateId, status) {
      state.transcriptStatus[candidateId] = status;
      save(state);
    },

    setMicPermissionDenied: function (denied) {
      state.micPermissionDenied = !!denied;
      save(state);
    },

    setBillingTab: function (tab) {
      state.billingTab = (tab === "multi") ? "multi" : "single";
      save(state);
    },

    requestSalesHelp: function () {
      if (state.salesHelpRequested) return;
      state.salesHelpRequested = true;
      pushUpdate("Got it — a WorkIndia specialist will call you shortly to help pick the right plan.");
      save(state);
    },

    // ---- Mock payment flow (no real money, no real gateway) ----
    // "Buy Now" opens a small modal: pick a method, pay, see it processed,
    // see it succeed — only then is the tier actually subscribed. This is
    // purely illustrative for the prototype/pitch, never a real charge.
    startPayment: function (tierId, group) {
      state.paymentTierId = tierId;
      state.paymentGroup = (group === "multi") ? "multi" : "single";
      state.paymentStep = "method";
      state.paymentMethod = null;
      save(state);
    },

    selectPaymentMethod: function (method) {
      state.paymentMethod = method;
      save(state);
    },

    // UPI shows a "scan to pay" QR step first (confirmQrScan moves it on
    // to processing); every other method goes straight to processing.
    beginPaymentProcessing: function () {
      if (!state.paymentMethod) return;
      state.paymentStep = (state.paymentMethod === "upi") ? "qr" : "processing";
      save(state);
    },

    confirmQrScan: function () {
      if (state.paymentStep !== "qr") return;
      state.paymentStep = "processing";
      save(state);
    },

    // Called once the simulated processing delay elapses — this is the
    // moment the tier actually becomes "bought."
    completePayment: function () {
      state.subscribed = true;
      state.subscribedTierId = state.paymentTierId;
      state.subscribedGroup = state.paymentGroup;
      state.subscribedAt = new Date().toISOString();
      state.paymentStep = "success";
      save(state);
    },

    closePaymentModal: function () {
      state.paymentTierId = null;
      state.paymentGroup = null;
      state.paymentStep = null;
      state.paymentMethod = null;
      save(state);
    },

    openCandidateProfile: function (candidateId) {
      state.profileOpenFor = candidateId;
      save(state);
    },

    closeCandidateProfile: function () {
      state.profileOpenFor = null;
      save(state);
    },

    // Returns true if the shortlist (contact unlock) succeeded, false if
    // the trial's already over and the paywall should be shown instead.
    // The unlock that reaches SHORTLIST_TARGET is itself allowed to
    // succeed — it's the one that ends the trial (see checkTrialEnd) —
    // only attempts AFTER that point are blocked.
    shortlistCandidate: function (candidateId) {
      if (state.shortlistedIds.indexOf(candidateId) !== -1) return true;
      if (!state.subscribed && (state.trialEnded || state.shortlistedIds.length >= global.WI_DATA.SHORTLIST_TARGET)) {
        state.showPaywall = true;
        save(state);
        return false;
      }
      state.shortlistedIds.push(candidateId);
      pushUpdate("Nice — you've unlocked " + state.shortlistedIds.length + " of " + global.WI_DATA.SHORTLIST_TARGET + " contacts included in your trial.");
      checkTrialEnd();
      save(state);
      return true;
    },

    markShortlisted: function (candidateId) {
      return Actions.shortlistCandidate(candidateId);
    },

    openPaywall: function () { state.showPaywall = true; save(state); },
    closePaywall: function () { state.showPaywall = false; save(state); },

    markNotFit: function (candidateId) {
      state.notFitIds.push(candidateId);
      save(state);
    },

    subscribe: function (tierId, group) {
      state.subscribed = true;
      if (tierId) state.subscribedTierId = tierId;
      if (group) state.subscribedGroup = (group === "multi") ? "multi" : "single";
      if (!state.subscribedAt) state.subscribedAt = new Date().toISOString();
      save(state);
    },

    confirmHire: function (candidateName) {
      state.hireConfirmed = true;
      state.hiredCandidateName = candidateName;
      state.hiredAt = new Date().toISOString();
      pushUpdate("Looks like " + candidateName + " joined — congrats on the hire! How has it gone so far?");
      save(state);
    },

    // "great"/"ok" finalize immediately. "bad" opens the reason-tag picker
    // instead — we want to know why before closing out the feedback loop.
    rateHire: function (rating) {
      if (rating === "bad") {
        state.hireBadPending = true;
        state.hireBadTags = [];
      } else {
        state.hireRating = rating;
      }
      save(state);
    },

    toggleHireBadTag: function (tag) {
      var i = state.hireBadTags.indexOf(tag);
      if (i === -1) state.hireBadTags.push(tag); else state.hireBadTags.splice(i, 1);
      save(state);
    },

    submitHireBadFeedback: function () {
      state.hireRating = "bad";
      state.hireBadReasons = state.hireBadTags.slice();
      state.hireBadPending = false;
      save(state);
    },

    toggleJobDetails: function () {
      state.jobDetailsOpen = !state.jobDetailsOpen;
      save(state);
    },

    togglePastJob: function (jobId) {
      state.expandedPastJobId = (state.expandedPastJobId === jobId) ? null : jobId;
      save(state);
    },

    rateMockJob: function (jobId, rating) {
      if (rating === "bad") {
        state.mockJobBadPending[jobId] = true;
        state.mockJobBadTags[jobId] = [];
      } else {
        state.mockJobRatings[jobId] = rating;
      }
      save(state);
    },

    toggleMockJobBadTag: function (jobId, tag) {
      var tags = state.mockJobBadTags[jobId] || (state.mockJobBadTags[jobId] = []);
      var i = tags.indexOf(tag);
      if (i === -1) tags.push(tag); else tags.splice(i, 1);
      save(state);
    },

    submitMockJobBadFeedback: function (jobId) {
      state.mockJobRatings[jobId] = "bad";
      state.mockJobBadReasons[jobId] = (state.mockJobBadTags[jobId] || []).slice();
      state.mockJobBadPending[jobId] = false;
      save(state);
    },

    setCandidateFilter: function (key, value) {
      state.candidateFilters[key] = value;
      save(state);
    },

    toggleVerifiedFilter: function () {
      state.candidateFilters.verifiedOnly = !state.candidateFilters.verifiedOnly;
      save(state);
    },

    clearCandidateFilters: function () {
      state.candidateFilters = { verifiedOnly: false, activeCandidatesOnly: false, distance: "any", activeIn: "any", experience: "any", gender: "any", english: "any" };
      save(state);
    },

    toggleActiveCandidatesFilter: function () {
      state.candidateFilters.activeCandidatesOnly = !state.candidateFilters.activeCandidatesOnly;
      save(state);
    },

    toggleCandRailGroup: function (key) {
      state.candRailOpen[key] = !state.candRailOpen[key];
      save(state);
    },

    // ---------------- Bulk Hiring ----------------
    // Daily limit ramps with how many days the account has been sending
    // (day 1 = first day a campaign went out), like Job Hai's 50/100/200/300.
    // Trial accounts get a flat BULK_TRIAL_TOTAL across the whole trial.
    bulkSendingDay: function () {
      var c = state.bulkCampaigns;
      if (!c.length) return 1;
      return Math.max(1, state.bulkDay - c[0].day + 1);
    },

    bulkSentToday: function () {
      return state.bulkCampaigns.filter(function (c) { return c.day === state.bulkDay; })
        .reduce(function (n, c) { return n + c.recipientIds.length; }, 0);
    },

    bulkSentTotal: function () {
      return state.bulkCampaigns.reduce(function (n, c) { return n + c.recipientIds.length; }, 0);
    },

    bulkTodayLimit: function () {
      var L = global.WI_DATA.BULK_DAILY_LIMITS;
      return L[Math.min(L.length - 1, Actions.bulkSendingDay() - 1)];
    },

    bulkRemaining: function () {
      if (!state.subscribed) return Math.max(0, global.WI_DATA.BULK_TRIAL_TOTAL - Actions.bulkSentTotal());
      return Math.max(0, Actions.bulkTodayLimit() - Actions.bulkSentToday());
    },

    // Everyone already invited to this job is excluded from new drafts —
    // a candidate never gets the same job invite twice.
    bulkInvitedIds: function () {
      var seen = {};
      state.bulkCampaigns.forEach(function (c) { c.recipientIds.forEach(function (id) { seen[id] = true; }); });
      return seen;
    },

    startBulkDraft: function () {
      state.bulkStep = "audience";
      state.bulkSelected = [];
      state.bulkViewCampaignId = null;
      save(state);
    },

    setBulkStep: function (step) {
      state.bulkStep = step || null;
      save(state);
    },

    cancelBulkDraft: function () {
      state.bulkStep = null;
      state.bulkSelected = [];
      save(state);
    },

    setBulkFilter: function (key, value) {
      state.bulkFilters[key] = value;
      save(state);
    },

    toggleBulkVerified: function () {
      state.bulkFilters.verifiedOnly = !state.bulkFilters.verifiedOnly;
      save(state);
    },

    toggleBulkCandidate: function (id) {
      var i = state.bulkSelected.indexOf(id);
      if (i !== -1) { state.bulkSelected.splice(i, 1); save(state); return true; }
      if (state.bulkSelected.length >= Actions.bulkRemaining()) return false;
      state.bulkSelected.push(id);
      save(state);
      return true;
    },

    setBulkSelection: function (ids) {
      state.bulkSelected = ids.slice(0, Actions.bulkRemaining());
      save(state);
    },

    setBulkTemplate: function (id) {
      state.bulkTemplateId = id;
      save(state);
    },

    sendBulkCampaign: function () {
      var n = Math.min(state.bulkSelected.length, Actions.bulkRemaining());
      if (!n) return null;
      var c = {
        id: "camp-" + (state.bulkCampaigns.length + 1),
        jobTitle: state.job ? state.job.title : "Your job",
        templateId: state.bulkTemplateId,
        recipientIds: state.bulkSelected.slice(0, n),
        sentAt: new Date().toISOString(),
        day: state.bulkDay
      };
      state.bulkCampaigns.push(c);
      state.bulkStep = null;
      state.bulkSelected = [];
      state.bulkViewCampaignId = c.id;
      pushUpdate("Your WhatsApp invite for " + c.jobTitle + " went out to " + n + " suggested candidates. Anyone who taps Interested gets the AI screening call first — those who pass show up in your Candidates.");
      save(state);
      return c;
    },

    viewBulkCampaign: function (id) {
      state.bulkViewCampaignId = (state.bulkViewCampaignId === id) ? null : id;
      save(state);
    },

    // Demo-only: sending runs on a simulated clock (st.bulkDay), so let the
    // presenter roll to the next day to show the limit ramping up.
    bulkNextDay: function () {
      state.bulkDay = state.bulkDay + 1;
      save(state);
    },

    toggleSidebar: function () {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      save(state);
    },

    get: function () { return state; }
  };

  function maybeAdvanceDay() {
    if (state.reviewed > 0 && state.reviewed % 10 === 0) {
      state.day = Math.min(global.WI_DATA.TRIAL_DAY_CAP, state.day + 1);
    }
  }

  // The trial ends on whichever of these comes first:
  //   - SHORTLIST_TARGET contacts unlocked (the primary, intended path —
  //     the recruiter got real value and converting is the next step)
  //   - the shown sample of profiles is fully reviewed (allocation_exhausted)
  //   - the 3-day window closes (day_cap)
  // Only a limited sample of the real local supply is ever shown in a
  // trial (see estimateCandidateCount) — this isn't the full database, so
  // exhausting it isn't itself a sign of abuse, just the trial doing its job.
  function checkTrialEnd() {
    if (state.trialEnded) return;
    if (!state.subscribed && state.shortlistedIds.length >= global.WI_DATA.SHORTLIST_TARGET) {
      state.trialEnded = true;
      state.trialEndReason = "shortlist_target";
    } else if (state.reviewed >= global.WI_DATA.TOTAL_ALLOCATION) {
      state.trialEnded = true;
      state.trialEndReason = "allocation_exhausted";
    } else if (state.day >= global.WI_DATA.TRIAL_DAY_CAP) {
      state.trialEnded = true;
      state.trialEndReason = "day_cap";
    }
  }

  global.WI_STATE = Actions;
})(window);
