(function () {
  "use strict";

  var state = {
    step: 1,
    reviewed: 0,
    relevant: 0,
    callsConnected: 0,
    shortlisted: 0,
    day: 1,
    currentCandidateDecided: false,
    callActive: false,
    callSeconds: 0,
    callTimer: null,
    callConnected: false,
    lastCallShortlisted: null
  };

  var CANDIDATES = [
    { name: "Murgan S.", age: 27, exp: "2 yrs delivery", dist: "3.8 km", pay: "Expects ₹16,000–₹18,000", lang: "Comfortable in Hindi, basic English", avail: "Available from tomorrow" },
    { name: "Tejas B.", age: 28, exp: "2 yrs delivery", dist: "1.5 km", pay: "Expects ₹15,000–₹17,000", lang: "Comfortable in Hindi &amp; English", avail: "Available immediately" },
    { name: "Imran K.", age: 24, exp: "1 yr delivery", dist: "4.2 km", pay: "Expects ₹14,000–₹16,000", lang: "Comfortable in Hindi, basic English", avail: "Available from Monday" }
  ];

  function candidateIndex() { return state.reviewed % CANDIDATES.length; }
  function currentCandidate() { return CANDIDATES[candidateIndex()]; }

  function escapeNone(s) { return s; }

  // ---------------- Screen renderers ----------------

  function renderScreen1() {
    return (
      '<div class="scr wa">' +
        '<div class="wa-head">' +
          '<svg class="wa-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>' +
          '<div class="wa-avatar">W</div>' +
          '<div class="wa-id"><strong>WorkIndia Hiring Assist</strong><span>online</span></div>' +
        '</div>' +
        '<div class="wa-body">' +
          '<div class="wa-date">Today</div>' +
          '<div class="wa-bubble">Your job <b>Delivery Executive, Mumbai</b> is live! 🎉<br/>Candidates can see it now — expect your first calls within a few hours.<div class="wa-time">9:02 AM</div></div>' +
          '<div class="wa-bubble">Just so it’s clear — your plan is a <b>one-time flat fee</b>. No commission on salary, no percentage cut. You only ever pay what’s on your plan.<div class="wa-time">9:02 AM</div></div>' +
          '<div class="wa-bubble">We’re calling candidates near you right now to check who’s actually available and a fit — you’ll see your first verified profile shortly.<div class="wa-time">9:03 AM</div></div>' +
        '</div>' +
        '<div class="wa-input"><div class="msg">Message</div><div class="send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B141A" stroke-width="2.4"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg></div></div>' +
      '</div>'
    );
  }

  function renderScreen2() {
    var c = currentCandidate();
    var decided = state.currentCandidateDecided;
    return (
      '<div class="scr app">' +
        '<div class="app-head"><div class="title">Candidate review</div><div class="sub">Profile ' + (state.reviewed + 1) + ' of 30 in this trial</div></div>' +
        '<div class="app-body">' +
          '<div class="candidate-card">' +
            '<span class="ai-tag">✨ AI-verified by voice call</span>' +
            '<div class="name-row"><span class="name">' + c.name + '</span><span class="meta">' + c.age + 'y · ' + c.dist + '</span></div>' +
            '<div class="meta">' + c.exp + '</div>' +
            '<div class="ai-facts">' +
              '<div class="ai-fact"><span class="dot"></span><b>' + c.avail + '</b></div>' +
              '<div class="ai-fact"><span class="dot"></span><b>' + c.pay + '</b></div>' +
              '<div class="ai-fact"><span class="dot"></span><b>' + c.lang + '</b></div>' +
            '</div>' +
            '<div class="card-actions">' +
              '<button class="btn not-relevant" id="btnNotRelevant" ' + (decided ? "disabled" : "") + '>Not relevant</button>' +
              '<button class="btn relevant" id="btnRelevant" ' + (decided ? "disabled" : "") + '>Relevant</button>' +
            '</div>' +
            (decided ? '<div class="unlock-note" style="margin-top:12px;">Contact unlocked — go to Call &amp; Shortlist →</div>' : '') +
          '</div>' +
          '<div class="progress-stat-row">' +
            '<div class="progress-stat"><div class="n">' + state.reviewed + '/30</div><div class="l">reviewed</div></div>' +
            '<div class="progress-stat"><div class="n">' + state.relevant + '</div><div class="l">marked relevant</div></div>' +
            '<div class="progress-stat"><div class="n">Day ' + state.day + '/7</div><div class="l">of trial</div></div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderScreen3() {
    var c = currentCandidate();
    if (!state.callConnected) {
      return (
        '<div class="scr">' +
          '<div class="call-screen">' +
            '<div class="call-masked">🔒 Platform call · number masked</div>' +
            '<div class="call-avatar">' + c.name.charAt(0) + '</div>' +
            '<div style="font-size:17px;font-weight:700;">' + c.name + '</div>' +
            '<div class="call-status">' + (state.callActive ? "Connecting…" : "Ready to call") + '</div>' +
            (state.callActive ?
              '<div class="call-timer">' + fmtTime(state.callSeconds) + '</div>' :
              '<button class="btn primary" id="btnStartCall" style="padding:14px 28px;">Call via platform</button>') +
          '</div>' +
        '</div>'
      );
    }
    if (state.lastCallShortlisted === null) {
      return (
        '<div class="scr app">' +
          '<div class="app-head"><div class="title">Call ended</div><div class="sub">Connected · ' + fmtTime(state.callSeconds) + '</div></div>' +
          '<div class="app-body">' +
            '<div class="shortlist-box">' +
              '<h4>How did the call go with ' + c.name + '?</h4>' +
              '<p>This is the judgment that actually matters — based on talking to them, not just their profile.</p>' +
              '<div class="card-actions">' +
                '<button class="btn not-relevant" id="btnNoShortlist">Not a fit</button>' +
                '<button class="btn relevant" id="btnShortlist">Shortlist</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }
    return (
      '<div class="scr app">' +
        '<div class="app-head"><div class="title">Noted</div><div class="sub">Trial progress updated</div></div>' +
        '<div class="app-body">' +
          '<div class="unlock-note" style="background:' + (state.lastCallShortlisted ? 'var(--success-light)' : 'var(--bg)') + ';color:' + (state.lastCallShortlisted ? 'var(--success)' : 'var(--muted)') + ';">' +
            (state.lastCallShortlisted ? c.name + " shortlisted — " + state.shortlisted + " of 3 needed to complete this trial." : c.name + " marked not a fit. On to the next profile.") +
          '</div>' +
          '<button class="btn primary full" id="btnNextCandidate">Next candidate →</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderScreen4() {
    var reviewPct = Math.min(100, (state.reviewed / 30) * 100);
    var shortlistPct = Math.min(100, (state.shortlisted / 3) * 100);
    return (
      '<div class="scr app">' +
        '<div class="app-head"><div class="title">Trial progress</div><div class="sub">Delivery Executive · Mumbai · Day ' + state.day + ' of 7</div></div>' +
        '<div class="app-body">' +
          '<div class="progress-stat-row">' +
            '<div class="progress-stat"><div class="n">' + state.reviewed + '/30</div><div class="l">profiles reviewed</div></div>' +
            '<div class="progress-stat"><div class="n">' + state.shortlisted + '/3</div><div class="l">shortlisted</div></div>' +
            '<div class="progress-stat"><div class="n">' + state.callsConnected + '</div><div class="l">calls connected</div></div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Shortlist progress — trial ends at 3</div>' +
            '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + shortlistPct + '%"></div></div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Profile allocation used — 30 included in this trial</div>' +
            '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + reviewPct + '%;background:var(--muted);"></div></div>' +
          '</div>' +
          '<div class="progress-list">' +
            listItem("Job posted &amp; live", true) +
            listItem("First candidate reviewed", state.reviewed > 0) +
            listItem("First contact unlocked", state.relevant > 0) +
            listItem("First call connected", state.callsConnected > 0) +
            listItem("3 candidates shortlisted", state.shortlisted >= 3) +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function listItem(label, done) {
    return '<div class="progress-item ' + (done ? "done" : "") + '">' + (done ? "✓" : "○") + '&nbsp; ' + label + '</div>';
  }

  function renderScreen5() {
    var complete = state.shortlisted >= 3;
    return (
      '<div class="scr app">' +
        '<div class="conv-hero">' +
          '<div class="big">' + (complete ? "You’ve found 3 strong candidates" : "Here’s what your trial found") + '</div>' +
          '<div class="small">' + (complete ? "Keep hiring at this rate?" : "Reviewed " + state.reviewed + " of 30 included profiles") + '</div>' +
        '</div>' +
        '<div class="app-body">' +
          '<div class="conv-evidence">' +
            '<div class="conv-row"><span>Profiles reviewed</span><span class="v">' + state.reviewed + ' / 30</span></div>' +
            '<div class="conv-row"><span>Calls connected</span><span class="v">' + state.callsConnected + '</span></div>' +
            '<div class="conv-row"><span>Candidates shortlisted</span><span class="v">' + state.shortlisted + ' / 3</span></div>' +
            '<div class="conv-row"><span>Days used</span><span class="v">' + state.day + ' / 7</span></div>' +
          '</div>' +
          '<button class="btn primary full">Continue hiring — ₹2,948/month</button>' +
          '<div style="font-size:11.5px;color:var(--muted);text-align:center;">One flat fee. No commission on salary, ever.</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderScreen6() {
    return (
      '<div class="scr wa">' +
        '<div class="wa-head">' +
          '<svg class="wa-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>' +
          '<div class="wa-avatar">W</div>' +
          '<div class="wa-id"><strong>WorkIndia Hiring Assist</strong><span>online</span></div>' +
        '</div>' +
        '<div class="wa-body">' +
          '<div class="wa-date">12 days later</div>' +
          '<div class="wa-bubble">Hi! Looks like <b>Tejas B.</b> joined as your Delivery Executive on the 18th — congrats on the hire! 🎉<div class="wa-time">11:20 AM</div></div>' +
          '<div class="wa-bubble">Quick one — how has it gone so far? This helps us show better-matched candidates to employers hiring for similar roles.<div class="wa-time">11:20 AM</div></div>' +
          '<div class="wa-bubble" style="display:flex;gap:8px;flex-wrap:wrap;background:transparent;padding:0;box-shadow:none;">' +
            '<span style="background:#202C33;padding:8px 14px;border-radius:999px;font-size:12.5px;">⭐️⭐️⭐️⭐️⭐️ Great fit</span>' +
            '<span style="background:#202C33;padding:8px 14px;border-radius:999px;font-size:12.5px;">⭐️⭐️⭐️ Okay so far</span>' +
            '<span style="background:#202C33;padding:8px 14px;border-radius:999px;font-size:12.5px;">⭐️ Not working out</span>' +
          '</div>' +
        '</div>' +
        '<div class="wa-input"><div class="msg">Message</div><div class="send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B141A" stroke-width="2.4"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg></div></div>' +
      '</div>'
    );
  }

  var RENDERERS = { 1: renderScreen1, 2: renderScreen2, 3: renderScreen3, 4: renderScreen4, 5: renderScreen5, 6: renderScreen6 };

  var ANNOTATIONS = {
    1: {
      title: "Job live + the flat-fee line",
      body: "WhatsApp, not the dashboard, is the first touchpoint — because 67% of agent-posted employers never open the platform at all. The flat-fee line is new: several interviewed employers assumed WorkIndia charges a placement commission like a staffing consultancy. One short sentence kills that assumption before a sales call has to.",
      evidence: "<strong>Evidence:</strong> ANN activation data (67% never-open); employer interviews on pricing-model confusion."
    },
    2: {
      title: "AI-screened candidate, not a raw resume",
      body: "An AI voice call already confirmed availability, pay expectation, location and language before the employer ever sees this card. Marking “Relevant” unlocks the contact — nothing is revealed for free. This replaces a swipe-style review WorkIndia already tried and shelved: employers couldn’t judge fit from static fields alone without talking to the candidate first.",
      evidence: "<strong>Evidence:</strong> prior internal UAT failure on profile-only relevance judgment; live walkthrough showed today's single-click unlock has no relevance gate at all."
    },
    3: {
      title: "Platform-only call, then an honest shortlist",
      body: "No number is ever shown — calls route through the platform, masked, the way Uber routes rider–driver calls. A call only counts once it connects. The “Shortlisted” judgment comes after the actual conversation, which is a stronger signal than a profile-level “relevant” mark ever could be.",
      evidence: "<strong>Evidence:</strong> extends the same call-quality methodology already used on 12,541 sales calls to the hiring calls themselves."
    },
    4: {
      title: "Progress toward a hire, not a countdown to a bill",
      body: "Today's dashboard shows calls received and days left — numbers the employer doesn't actually care about. This shows the number that predicts whether they'll pay: shortlisted candidates. The profile-allocation bar is the honest version of today's database page, which shows 197,348 candidates against 5 you can actually touch.",
      evidence: "<strong>Evidence:</strong> live walkthrough of the Database tab's unlock ratio; built-in Responses-tab outcome fields (Interviewed/Hired/Rejected) that exist today but aren't surfaced as progress."
    },
    5: {
      title: "A conversion ask with the evidence attached",
      body: "The autopay mandate itself stays — that's a deliberate, non-negotiable business constraint. What changes is what the employer sees at the renewal moment: the actual result of their trial, not a silent charge. This is the difference between a bill that feels sprung on someone and an upgrade they can see the case for.",
      evidence: "<strong>Evidence:</strong> 91% of ₹1-trial first-time payers cancel autopay, most within an hour — the signal that the mandate currently lands as a surprise, not as a validated decision."
    },
    6: {
      title: "The feedback loop that doesn't exist today",
      body: "Once a hire is confirmed, WorkIndia asks the employer to rate it. This is the one piece of this whole design with no current equivalent anywhere on the platform — there is currently no feedback loop connecting a hire's outcome back to candidate quality or match data.",
      evidence: "<strong>Evidence:</strong> explicitly confirmed as a current gap — no post-hire quality check-in exists today."
    }
  };

  function fmtTime(s) {
    var m = Math.floor(s / 60);
    var ss = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
  }

  function render() {
    document.querySelectorAll(".step-pill").forEach(function (btn) {
      btn.classList.toggle("active", Number(btn.dataset.step) === state.step);
    });

    var root = document.getElementById("screen-root");
    root.innerHTML = RENDERERS[state.step]();

    var a = ANNOTATIONS[state.step];
    document.getElementById("annotation-root").innerHTML =
      "<h3>" + a.title + "</h3><p>" + a.body + "</p><div class=\"ev\">" + a.evidence + "</div>";

    attachHandlers();

    document.getElementById("prevStep").disabled = state.step === 1;
    document.getElementById("nextStep").disabled = state.step === 6;
  }

  function attachHandlers() {
    var btnRelevant = document.getElementById("btnRelevant");
    var btnNotRelevant = document.getElementById("btnNotRelevant");
    if (btnRelevant) btnRelevant.addEventListener("click", function () {
      state.relevant++;
      state.currentCandidateDecided = true;
      render();
    });
    if (btnNotRelevant) btnNotRelevant.addEventListener("click", function () {
      state.reviewed++;
      state.currentCandidateDecided = false;
      if (state.reviewed % 10 === 0) state.day = Math.min(7, state.day + 1);
      render();
    });

    var btnStartCall = document.getElementById("btnStartCall");
    if (btnStartCall) btnStartCall.addEventListener("click", function () {
      state.callActive = true;
      render();
      setTimeout(function () {
        state.callConnected = true;
        state.callsConnected++;
        state.callSeconds = 42;
        render();
      }, 900);
    });

    var btnShortlist = document.getElementById("btnShortlist");
    var btnNoShortlist = document.getElementById("btnNoShortlist");
    if (btnShortlist) btnShortlist.addEventListener("click", function () {
      state.shortlisted++;
      state.lastCallShortlisted = true;
      render();
    });
    if (btnNoShortlist) btnNoShortlist.addEventListener("click", function () {
      state.lastCallShortlisted = false;
      render();
    });

    var btnNextCandidate = document.getElementById("btnNextCandidate");
    if (btnNextCandidate) btnNextCandidate.addEventListener("click", function () {
      state.reviewed++;
      if (state.reviewed % 10 === 0) state.day = Math.min(7, state.day + 1);
      state.currentCandidateDecided = false;
      state.callActive = false;
      state.callConnected = false;
      state.lastCallShortlisted = null;
      state.step = state.shortlisted >= 3 ? 5 : 2;
      render();
    });
  }

  function resetDemo() {
    state.step = 1;
    state.reviewed = 0;
    state.relevant = 0;
    state.callsConnected = 0;
    state.shortlisted = 0;
    state.day = 1;
    state.currentCandidateDecided = false;
    state.callActive = false;
    state.callSeconds = 0;
    state.callConnected = false;
    state.lastCallShortlisted = null;
    render();
  }

  document.querySelectorAll(".step-pill").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.step = Number(btn.dataset.step);
      render();
    });
  });
  document.getElementById("prevStep").addEventListener("click", function () {
    if (state.step > 1) { state.step--; render(); }
  });
  document.getElementById("nextStep").addEventListener("click", function () {
    if (state.step < 6) { state.step++; render(); }
  });
  document.getElementById("resetDemo").addEventListener("click", resetDemo);

  render();
})();
