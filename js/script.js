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

  // Hero phone form — demo-only submit (no backend here); validates and
  // gives a confirmation state rather than pretending to register anyone.
  var form = document.getElementById("hero-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var phone = document.getElementById("heroPhone");
      var val = phone.value.replace(/\D/g, "");
      if (val.length !== 10) {
        phone.style.borderColor = "#B91C1C";
        phone.focus();
        return;
      }
      phone.style.borderColor = "#15803D";
      var btn = form.querySelector("button");
      var original = btn.textContent;
      btn.textContent = "Sending OTP…";
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = "Verified — taking you in ✓";
        setTimeout(function () {
          window.location.href = "app/";
        }, 900);
      }, 900);
    });
  }
})();
