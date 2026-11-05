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

  // Real (synthesized placeholder) call-recording audio exists for the
  // first 3 candidates only — one Hindi, one Kannada, one English, so
  // recruiters hear actual voices in at least one of each. AUDIO_MANIFEST
  // is loaded separately from audio/manifest.json at runtime (see data.js
  // bottom) and merged in before CANDIDATE_POOL is exposed.
  var AUDIO_OVERRIDES = {
    "cand-1": { name: "Suresh Kumar", role: "Delivery Executive", city: "Mumbai", lang: "Hindi" },
    "cand-2": { name: "Pooja M.", role: "Retail Associate", city: "Bengaluru", lang: "Kannada" },
    "cand-3": { name: "Altaf Raza", role: "Security Guard", city: "Delhi NCR", lang: "English" }
  };

  var CALL_AUDIO = {
    "cand-1": {
      "lang": "hi",
      "file": "audio/cand-1.mp3",
      "duration": 34.71,
      "lines": [
        {
          "who": "ai",
          "t": "नमस्ते, मैं वर्क इंडिया से बोल रहा हूँ। क्या आप डिलीवरी एग्जीक्यूटिव की नौकरी के लिए उपलब्ध हैं?",
          "t_en": "Hi, this is WorkIndia calling. Are you available for the Delivery Executive job?",
          "start": 0.0,
          "end": 9.75
        },
        {
          "who": "candidate",
          "t": "हाँ जी, मैं उपलब्ध हूँ।",
          "t_en": "Yes, I'm available.",
          "start": 10.15,
          "end": 12.82
        },
        {
          "who": "ai",
          "t": "आप कब से शुरू कर सकते हैं?",
          "t_en": "When can you start?",
          "start": 13.37,
          "end": 16.71
        },
        {
          "who": "candidate",
          "t": "मैं कल से शुरू कर सकता हूँ।",
          "t_en": "I can start from tomorrow.",
          "start": 17.11,
          "end": 20.31
        },
        {
          "who": "ai",
          "t": "आपकी सैलरी की उम्मीद क्या है?",
          "t_en": "What's your salary expectation?",
          "start": 20.86,
          "end": 24.4
        },
        {
          "who": "candidate",
          "t": "सोलह हज़ार से अठारह हज़ार रुपये महीना।",
          "t_en": "Sixteen to eighteen thousand rupees a month.",
          "start": 24.81,
          "end": 28.96
        },
        {
          "who": "ai",
          "t": "धन्यवाद, मैं यह जानकारी एम्प्लॉयर को भेज दूंगा।",
          "t_en": "Thank you, I'll pass this on to the employer.",
          "start": 29.51,
          "end": 34.31
        }
      ]
    },
    "cand-2": {
      "lang": "kn",
      "file": "audio/cand-2.mp3",
      "duration": 37.37,
      "lines": [
        {
          "who": "ai",
          "t": "ನಮಸ್ಕಾರ, ನಾನು ವರ್ಕ್ ಇಂಡಿಯಾದಿಂದ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನೀವು ರಿಟೇಲ್ ಅಸೋಸಿಯೇಟ್ ಹುದ್ದೆಗೆ ಲಭ್ಯವಿದ್ದೀರಾ?",
          "t_en": "Hello, this is WorkIndia calling. Are you available for the Retail Associate role?",
          "start": 0.0,
          "end": 10.06
        },
        {
          "who": "candidate",
          "t": "ಹೌದು, ನಾನು ಲಭ್ಯವಿದ್ದೇನೆ.",
          "t_en": "Yes, I'm available.",
          "start": 10.46,
          "end": 13.38
        },
        {
          "who": "ai",
          "t": "ನೀವು ಯಾವಾಗ ಕೆಲಸ ಪ್ರಾರಂಭಿಸಬಹುದು?",
          "t_en": "When can you start?",
          "start": 13.93,
          "end": 18.03
        },
        {
          "who": "candidate",
          "t": "ನಾನು ಸೋಮವಾರದಿಂದ ಪ್ರಾರಂಭಿಸಬಹುದು.",
          "t_en": "I can start from Monday.",
          "start": 18.43,
          "end": 22.06
        },
        {
          "who": "ai",
          "t": "ನಿಮ್ಮ ಸಂಬಳದ ನಿರೀಕ್ಷೆ ಏನು?",
          "t_en": "What's your salary expectation?",
          "start": 22.61,
          "end": 25.73
        },
        {
          "who": "candidate",
          "t": "ಹದಿನೈದು ಸಾವಿರದಿಂದ ಹದಿನೆಂಟು ಸಾವಿರ ರೂಪಾಯಿ.",
          "t_en": "Fifteen to eighteen thousand rupees.",
          "start": 26.13,
          "end": 30.64
        },
        {
          "who": "ai",
          "t": "ಧನ್ಯವಾದಗಳು, ನಾನು ಇದನ್ನು ಉದ್ಯೋಗದಾತರಿಗೆ ತಿಳಿಸುತ್ತೇನೆ.",
          "t_en": "Thank you, I'll let the employer know.",
          "start": 31.19,
          "end": 36.96
        }
      ]
    },
    "cand-3": {
      "lang": "en",
      "file": "audio/cand-3.mp3",
      "duration": 21.84,
      "lines": [
        {
          "who": "ai",
          "t": "Hi, this is WorkIndia calling on behalf of an employer hiring for a Security Guard role. Are you available?",
          "t_en": "Hi, this is WorkIndia calling on behalf of an employer hiring for a Security Guard role. Are you available?",
          "start": 0.0,
          "end": 6.54
        },
        {
          "who": "candidate",
          "t": "Yes sir, I am available.",
          "t_en": "Yes sir, I am available.",
          "start": 6.94,
          "end": 8.57
        },
        {
          "who": "ai",
          "t": "When can you start?",
          "t_en": "When can you start?",
          "start": 9.13,
          "end": 10.09
        },
        {
          "who": "candidate",
          "t": "I can start from tomorrow.",
          "t_en": "I can start from tomorrow.",
          "start": 10.49,
          "end": 11.77
        },
        {
          "who": "ai",
          "t": "What salary are you expecting?",
          "t_en": "What salary are you expecting?",
          "start": 12.32,
          "end": 14.1
        },
        {
          "who": "candidate",
          "t": "Around fourteen to seventeen thousand rupees per month.",
          "t_en": "Around fourteen to seventeen thousand rupees per month.",
          "start": 14.49,
          "end": 17.63
        },
        {
          "who": "ai",
          "t": "Great, thank you. I'll pass this on to the employer.",
          "t_en": "Great, thank you. I'll pass this on to the employer.",
          "start": 18.18,
          "end": 21.44
        }
      ]
    }
  };


  // A one-line, templated "call summary" for the Calls tab's Summary CTA —
  // built from the data already captured about the candidate plus whatever
  // decision the recruiter has recorded so far, so it reads like a real
  // post-call note rather than a static blurb.
  function buildRecruiterCallSummary(candidate, decision) {
    var payStr = "₹" + candidate.payExpectationMin.toLocaleString("en-IN") + "–₹" + candidate.payExpectationMax.toLocaleString("en-IN");
    var base = candidate.name + " confirmed they're " + candidate.availability.toLowerCase() +
      ", expects " + payStr + "/month for " + candidate.skills[0].toLowerCase() + ", " + candidate.distanceKm + " km from the job location.";
    if (decision === "shortlisted") return base + " Good fit on paper and on the call — shortlisted.";
    if (decision === "notFit") return base + " Didn't line up on fit after talking it through — marked not a fit.";
    return base + " Awaiting a shortlist decision.";
  }

  function buildCandidatePool(count) {
    var rnd = seededRandom(42);
    var pool = [];
    for (var i = 0; i < count; i++) {
      var exp = 1 + Math.floor(rnd() * 5);
      var distKm = (1 + rnd() * 6).toFixed(1);
      var payMin = 13000 + Math.floor(rnd() * 5) * 1000;
      var payMax = payMin + 2000;
      var skills = [pick(SKILLS_POOL, rnd), pick(SKILLS_POOL, rnd), pick(SKILLS_POOL, rnd)];
      var name = pick(FIRST_NAMES, rnd) + " " + pick(LAST_INITIALS, rnd) + ".";
      var area = pick(AREAS, rnd);
      var language = pick(LANG_PROFILES, rnd);
      var availability = pick(AVAIL, rnd);
      var primarySkill = skills[0];

      var transcript = [
        { who: "ai", t: "Hi, this is WorkIndia calling on behalf of an employer hiring for " + primarySkill + " near " + area + ". Do you have a minute?" },
        { who: "candidate", t: "Yes, tell me." },
        { who: "ai", t: "Are you currently looking for work, and when could you start?" },
        { who: "candidate", t: availability.replace("Available ", "I can start ").toLowerCase() + "." },
        { who: "ai", t: "What salary are you expecting per month?" },
        { who: "candidate", t: "Around ₹" + payMin.toLocaleString("en-IN") + " to ₹" + payMax.toLocaleString("en-IN") + "." },
        { who: "ai", t: "And you're comfortable travelling to " + area + " for this role?" },
        { who: "candidate", t: "Yes, that's fine, it's close to where I stay." },
        { who: "ai", t: "Great — thanks, I'll pass this on to the employer." }
      ];

      var id = "cand-" + (i + 1);
      var override = AUDIO_OVERRIDES[id];
      var audio = CALL_AUDIO[id];

      pool.push({
        id: id,
        name: override ? override.name : name,
        age: 21 + Math.floor(rnd() * 20),
        area: override ? override.city : area,
        distanceKm: distKm,
        experienceYears: exp,
        education: rnd() < 0.7 ? "< 10th Pass" : "10th Pass",
        skills: skills,
        language: override ? override.lang + " (real sample recording)" : language,
        availability: availability,
        payExpectationMin: payMin,
        payExpectationMax: payMax,
        aiCallSummary: "AI confirmed availability and pay fit by voice call before this profile was shown.",
        aiScreenPassed: true,
        callDurationSec: audio ? Math.ceil(audio.duration) : 38 + Math.floor(rnd() * 25),
        callTranscript: audio ? audio.lines : transcript,
        audioFile: audio ? audio.file : null,
        audioLang: audio ? audio.lang : null
      });
    }
    return pool;
  }

  // Mirrors the real WorkIndia employer pricing page (both the Single Hire
  // and Multi Hires tabs) — real tier names, prices, unlock counts and
  // feature lines, not invented numbers.
  var PLANS = {
    trialDueToday: 1,
    trialRenewalAmount: 2499,
    singleHire: {
      label: "Single Hire",
      tagline: "Hire for One Role at a time.",
      tiers: [
        {
          id: "trial", name: "3-Day Trial", badge: "Limited Access",
          priceLabel: "Just ₹1", priceSub: "then ₹2,499/m, cancel trial anytime.",
          reach: "limited", jobsActive: 1, unlocks: 5, boosts: 0, validDays: 3,
          note: "3-Day Trial then renews to 1 month plan",
          cancelNote: "Cancel your trial anytime within 3 days at no cost.",
          purpose: "Try it out, no commitment"
        },
        { id: "1m", name: "1 Month", perMonth: 2499, payUpfront: 2499, reach: "high", jobsActive: 1, unlocks: 100, boosts: 3, validDays: 30, note: null, purpose: "One urgent, one-off hire" },
        { id: "3m", name: "3 Months Plan", perMonth: 1666, payUpfront: 4999, reach: "high", jobsActive: 1, unlocks: 300, boosts: 9, validDays: 90, note: "Get 5 extra days", purpose: "Hiring in bulk this quarter" },
        { id: "12m", name: "1 Year Plan", perMonth: 916, payUpfront: 11000, reach: "high", jobsActive: 1, unlocks: 800, boosts: 24, validDays: 365, note: "Get 7 extra days", popular: true, purpose: "Seasonal or year-round hiring" }
      ]
    },
    multiHire: {
      label: "Multi Hires",
      saveBadge: "Save 52%",
      tagline: "Hire for Many Roles together.",
      tiers: [
        { id: "1m", name: "1 Month Plan", perMonth: 4999, payUpfront: null, reach: "high", jobsActive: 3, unlocks: 400, boosts: 10, validDays: 30, note: null, popular: true, purpose: "A quick hiring sprint, many roles" },
        { id: "3m", name: "3 Months Plan", perMonth: 3066, payUpfront: 9200, reach: "high", jobsActive: 3, unlocks: 900, boosts: 27, validDays: 90, note: null, purpose: "Hiring in bulk this quarter" },
        { id: "12m", name: "1 Year Plan", perMonth: 1750, payUpfront: 21000, reach: "high", jobsActive: 3, unlocks: 2400, boosts: 72, validDays: 365, note: null, purpose: "Seasonal or ongoing hiring, all year" }
      ]
    }
  };
  // Flat alias (paid tiers only, Single Hire) for the compact in-flow
  // paywall modal shown the moment the trial's 5 unlocks run out.
  PLANS.tiers = PLANS.singleHire.tiers.filter(function (t) { return t.id !== "trial"; });

  var ROLE_SUGGESTIONS = ["Delivery Executive", "Driver", "Security Guard", "Telecaller", "Retail Associate",
    "Warehouse Picker", "Housekeeping Staff", "Field Sales Executive", "Technician", "Back Office Executive"];

  var CITY_SUGGESTIONS = ["Mumbai", "Delhi NCR", "Bengaluru", "Hyderabad", "Pune", "Kolkata", "Chennai", "Ahmedabad"];

  // Deterministic pseudo-count so the same role+city always shows the same
  // number within a session, without pretending to query a real database.
  function estimateCandidateCount(role, city) {
    var str = (role || "") + "|" + (city || "");
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
    return 8000 + (h % 37000);
  }

  // A rough, explainable AI-generated job spec from just a role + city —
  // mirrors the one genuinely useful bit of the real platform's posting flow.
  function suggestJobSpec(role) {
    var r = (role || "").toLowerCase();
    var spec = {
      experience: "0–2 years",
      education: "No minimum",
      gender: "Any",
      english: "Not required",
      distanceKm: 8,
      salaryMin: 14000,
      salaryMax: 19000
    };
    if (r.indexOf("security") !== -1) { spec.gender = "Male preferred"; spec.salaryMin = 13000; spec.salaryMax = 17000; }
    if (r.indexOf("telecaller") !== -1 || r.indexOf("sales") !== -1) { spec.english = "Basic English"; spec.education = "10th pass"; spec.salaryMin = 15000; spec.salaryMax = 22000; }
    if (r.indexOf("driver") !== -1) { spec.experience = "1–3 years"; spec.distanceKm = 12; }
    if (r.indexOf("back office") !== -1 || r.indexOf("technician") !== -1) { spec.education = "12th pass"; spec.salaryMin = 16000; spec.salaryMax = 24000; }
    return spec;
  }

  var CATEGORIES = [
    { name: "Delivery", icon: "🛵", role: "Delivery Executive" },
    { name: "Retail", icon: "🛍️", role: "Retail Associate" },
    { name: "Hospitality", icon: "🍽️", role: "Housekeeping Staff" },
    { name: "Telecalling", icon: "📞", role: "Telecaller" },
    { name: "Sales", icon: "📈", role: "Field Sales Executive" },
    { name: "Back office", icon: "🗂️", role: "Back Office Executive" },
    { name: "Drivers", icon: "🚗", role: "Driver" },
    { name: "Security", icon: "🛡️", role: "Security Guard" },
    { name: "Housekeeping", icon: "🧹", role: "Housekeeping Staff" },
    { name: "Technicians", icon: "🔧", role: "Technician" }
  ];

  // Past jobs this employer has already closed out, shown on My Jobs below
  // the current open role so the hire -> 3-month feedback nudge has real
  // history to sit alongside, not just one job. hiredDaysAgo is fixed per
  // entry (not wall-clock) so the "waited X / Y days" math stays stable
  // across a demo session; most are past the 90-day gate, one is still
  // waiting, and one already has feedback recorded.
  var MOCK_PAST_JOBS = [
    {
      id: "pj1", title: "Delivery Executive", city: "Mumbai", area: "Andheri East",
      salaryMin: 16000, salaryMax: 21000, openings: 4,
      postedDaysAgo: 158, hiredDaysAgo: 142, candidateName: "Rahul Jadhav",
      rating: "great"
    },
    {
      id: "pj2", title: "Telecaller", city: "Pune", area: "Hinjewadi",
      salaryMin: 14000, salaryMax: 18000, openings: 2,
      postedDaysAgo: 134, hiredDaysAgo: 119, candidateName: "Sneha Kulkarni",
      rating: null
    },
    {
      id: "pj3", title: "Security Guard", city: "Bengaluru", area: "Whitefield",
      salaryMin: 15000, salaryMax: 19000, openings: 3,
      postedDaysAgo: 121, hiredDaysAgo: 108, candidateName: "Manjunath Gowda",
      rating: "ok"
    },
    {
      id: "pj4", title: "Field Sales Executive", city: "Delhi", area: "Laxmi Nagar",
      salaryMin: 18000, salaryMax: 25000, openings: 2,
      postedDaysAgo: 97, hiredDaysAgo: 94, candidateName: "Vikas Chaudhary",
      rating: null
    },
    {
      id: "pj5", title: "Warehouse Picker", city: "Mumbai", area: "Bhiwandi",
      salaryMin: 13500, salaryMax: 17000, openings: 5,
      postedDaysAgo: 61, hiredDaysAgo: 48, candidateName: "Suresh Patil",
      rating: null // still inside the 90-day window — shows the waiting state
    },
    {
      id: "pj6", title: "Housekeeping Staff", city: "Pune", area: "Kothrud",
      salaryMin: 12000, salaryMax: 15000, openings: 1,
      postedDaysAgo: 203, hiredDaysAgo: 188, candidateName: "Meenal Shinde",
      rating: "great"
    }
  ];

  global.WI_DATA = {
    CANDIDATE_POOL: buildCandidatePool(30),
    BATCH_SIZE: 10,
    TOTAL_ALLOCATION: 30,
    SHORTLIST_TARGET: 5,
    TRIAL_DAY_CAP: 7,
    HIRE_FEEDBACK_DELAY_DAYS: 90, // how long after a hire we wait before asking for feedback
    PLANS: PLANS,
    ROLE_SUGGESTIONS: ROLE_SUGGESTIONS,
    CITY_SUGGESTIONS: CITY_SUGGESTIONS,
    CATEGORIES: CATEGORIES,
    MOCK_PAST_JOBS: MOCK_PAST_JOBS,
    estimateCandidateCount: estimateCandidateCount,
    suggestJobSpec: suggestJobSpec,
    buildRecruiterCallSummary: buildRecruiterCallSummary
  };
})(window);
