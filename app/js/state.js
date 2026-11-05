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
      flowStep: "search",        // "search" | "count" (candidates+trial+login) | "posting" | "matching" | "hotleads"
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
      updatesFeed: [],           // WhatsApp-style message log
      callDurations: {},         // candidateId -> seconds, recorded when a recruiter call ends
      profileOpenFor: null,      // candidateId whose profile overlay is open, or null
      liveCallRecordings: {},    // candidateId -> true once the recruiter's own mic audio was captured for that call
      micPermissionDenied: false, // true once the browser mic prompt has been denied/unsupported, so we stop re-asking
      billingTab: "single",      // "single" | "multi" — which pricing tab is showing on Trial & Billing
      subscribedTierId: null,    // e.g. "1m" | "3m" | "12m" — which plan tier they subscribed to
      subscribedGroup: null,     // "single" | "multi" — which tab that tier was chosen from
      paymentTierId: null,       // mock payment flow — set while the "Buy Now" modal is open
      paymentGroup: null,
      paymentStep: null,         // "method" | "processing" | "success"
      paymentMethod: null,       // "upi" | "card" | "netbanking"
      salesHelpRequested: false, // true once the Billing page's "talk to our team" prompt was used
      subscribedAt: null        // ISO timestamp set the moment a plan is actually paid for
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
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
      state.flowStep = "posting";
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

    markNotRelevant: function (candidateId) {
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
      pushUpdate("Looks like " + candidateName + " joined — congrats on the hire! How has it gone so far?");
      save(state);
    },

    rateHire: function (rating) {
      state.hireRating = rating;
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
  //   - the 7-day window closes (day_cap)
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
