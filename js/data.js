/* WorkIndia Reimagined — mock data layer.
   No backend here: this generates a realistic, deterministic candidate
   pool and plan data so the app behaves consistently across refreshes
   within one browser (state persists via localStorage, see state.js). */

(function (global) {
  "use strict";

  var FIRST_NAMES = ["Murgan", "Tejas", "Imran", "Suresh", "Ramesh", "Vikas", "Altaf", "Deepak",
    "Ganesh", "Faizal", "Pravin", "Ashok", "Rakesh", "Shankar", "Irfan", "Mahesh",
    "Sanjay", "Vinod", "Akram", "Dilip", "Naresh", "Rafiq", "Santosh", "Bablu",
    "Yogesh", "Haroon", "Kiran", "Manoj", "Salim", "Devendra"];
  var LAST_INITIALS = ["V", "B", "K", "P", "S", "R", "M", "D", "N", "T"];
  var AREAS = ["Chunabhatti", "Dadar East", "Mahim Junction East", "Kurla West", "Andheri East",
    "Vikhroli", "Govandi", "Chembur", "Byculla", "Sion", "Wadala", "Ghatkopar"];
  var SKILLS_POOL = ["Bike Riding", "Auto Driver", "Company Driver", "Uber Driver", "Rapido Driver",
    "Ola Driver", "Last Mile Delivery", "Cleaning", "Tempo Driver", "Patient Care"];
  var LANG_PROFILES = [
    "Comfortable in Hindi, basic English",
    "Comfortable in Hindi & English",
    "Comfortable in Hindi, Marathi, basic English",
    "Comfortable in Hindi only, limited English",
    "Comfortable in Hindi, Marathi & English"
  ];
  var AVAIL = ["Available immediately", "Available from tomorrow", "Available from Monday", "Available within 3 days"];

  function seededRandom(seed) {
    var s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }

  function buildCandidatePool(count) {
    var rnd = seededRandom(42);
    var pool = [];
    for (var i = 0; i < count; i++) {
      var exp = 1 + Math.floor(rnd() * 5);
      var distKm = (1 + rnd() * 6).toFixed(1);
      var payMin = 13000 + Math.floor(rnd() * 5) * 1000;
      var payMax = payMin + 2000;
      var skills = [pick(SKILLS_POOL, rnd), pick(SKILLS_POOL, rnd), pick(SKILLS_POOL, rnd)];
      pool.push({
        id: "cand-" + (i + 1),
        name: pick(FIRST_NAMES, rnd) + " " + pick(LAST_INITIALS, rnd) + ".",
        age: 21 + Math.floor(rnd() * 20),
        area: pick(AREAS, rnd),
        distanceKm: distKm,
        experienceYears: exp,
        education: rnd() < 0.7 ? "< 10th Pass" : "10th Pass",
        skills: skills,
        language: pick(LANG_PROFILES, rnd),
        availability: pick(AVAIL, rnd),
        payExpectationMin: payMin,
        payExpectationMax: payMax,
        aiCallSummary: "AI confirmed availability and pay fit by voice call before this profile was shown.",
        aiScreenPassed: true
      });
    }
    return pool;
  }

  var PLANS = {
    trialDueToday: 1,
    trialRenewalAmount: 2948,
    monthly: 2499,
    quarterlyPerMonth: 1666,
    yearlyPerMonth: 916
  };

  global.WI_DATA = {
    CANDIDATE_POOL: buildCandidatePool(30),
    BATCH_SIZE: 10,
    TOTAL_ALLOCATION: 30,
    SHORTLIST_TARGET: 3,
    TRIAL_DAY_CAP: 7,
    PLANS: PLANS
  };
})(window);
