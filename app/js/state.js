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
      flowStep: "search",        // "search" | "count" | "login" | "posting" | "matching" | "hotleads"
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
      updatesFeed: []            // WhatsApp-style message log
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

    // Returns true if the shortlist succeeded, false if it hit the trial
    // cap and the paywall should be shown instead.
    shortlistCandidate: function (candidateId) {
      if (state.shortlistedIds.indexOf(candidateId) !== -1) return true;
      if (!state.subscribed && state.shortlistedIds.length >= global.WI_DATA.SHORTLIST_TARGET) {
        state.showPaywall = true;
        save(state);
        return false;
      }
      state.shortlistedIds.push(candidateId);
      pushUpdate("Nice — you've shortlisted " + state.shortlistedIds.length + " of " + global.WI_DATA.SHORTLIST_TARGET + " candidates included in your trial.");
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

    subscribe: function () {
      state.subscribed = true;
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

  // Reaching the 3-shortlist trial cap does NOT end the trial by itself —
  // the hiring manager can keep reviewing; trying to shortlist a 4th is
  // what surfaces the paywall (see Actions.shortlistCandidate). The trial
  // only auto-ends on allocation or day-cap, same as before.
  function checkTrialEnd() {
    if (state.trialEnded) return;
    if (state.reviewed >= global.WI_DATA.TOTAL_ALLOCATION) {
      state.trialEnded = true;
      state.trialEndReason = "allocation_exhausted";
    } else if (state.day >= global.WI_DATA.TRIAL_DAY_CAP) {
      state.trialEnded = true;
      state.trialEndReason = "day_cap";
    }
  }

  global.WI_STATE = Actions;
})(window);
