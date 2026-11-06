(function () {
  "use strict";

  // Mobile nav toggle — simple reveal of the primary links as a dropdown.
  var toggle = document.getElementById("navToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var links = document.querySelector(".nav-links");
      var login = document.querySelector(".nav-login");
      [links, login].forEach(function (el) {
        if (!el) return;
        el.style.display = (el.style.display === "flex" || el.style.display === "block") ? "none" : "flex";
      });
      document.querySelector(".nav-links").style.flexDirection = "column";
      document.querySelector(".nav-links").style.position = "absolute";
      document.querySelector(".nav-links").style.top = "68px";
      document.querySelector(".nav-links").style.left = "0";
      document.querySelector(".nav-links").style.right = "0";
      document.querySelector(".nav-links").style.background = "#fff";
      document.querySelector(".nav-links").style.padding = "16px 24px";
      document.querySelector(".nav-links").style.borderBottom = "1px solid #E6E8EC";
    });
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    q.addEventListener("click", function () {
      var wasOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (open) { open.classList.remove("open"); });
      if (!wasOpen) item.classList.add("open");
    });
  });

  // Hero search — the job search IS the entry point into the app. Submitting
  // takes the role + city straight into the app at the candidate-count step
  // (which is also where the phone-number/OTP form lives), skipping its own
  // separate search screen entirely. Leaving role/city blank and submitting
  // anyway is a valid way in too — it should land the visitor on that same
  // phone-number screen rather than blocking them, so empty fields fall back
  // to representative defaults instead of stopping the redirect.
  var form = document.getElementById("hero-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var role = document.getElementById("heroRole").value.trim() || "Delivery Executive";
      var city = document.getElementById("heroCity").value.trim() || "Mumbai";
      window.location.href = "app/?role=" + encodeURIComponent(role) + "&city=" + encodeURIComponent(city);
    });
  }
})();
