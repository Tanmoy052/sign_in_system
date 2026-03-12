// frontend/js/auth.js

const API_BASE_URL = "http://localhost:5001/api/auth";

const showStatus = (elementId, message, isError = false) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
  el.classList.toggle("error", isError);
  el.classList.toggle("success", !isError);
};

const clearStatus = (elementId) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = "";
  el.classList.remove("visible", "error", "success");
};

const getQueryParam = (name) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

const saveToken = (token) => localStorage.setItem("authToken", token);
const getToken = () => localStorage.getItem("authToken");
const removeToken = () => localStorage.removeItem("authToken");

const saveResetToken = (token) => localStorage.setItem("resetToken", token);
const getResetToken = () => localStorage.getItem("resetToken");
const removeResetToken = () => localStorage.removeItem("resetToken");

// Global Password Toggle
const setupPasswordToggles = () => {
  const toggles = document.querySelectorAll(".password-toggle");
  toggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const container = btn.closest(".password-container");
      const input = container.querySelector("input");
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";

      // Toggle SVG icon (optional: you can swap the path here)
      if (isPassword) {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
        `;
      } else {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        `;
      }
    });
  });
};

// SIGNUP
const initSignupPage = () => {
  setupPasswordToggles();
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("signup-status");

    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!username || !email || !password) {
      showStatus("signup-status", "All fields are required.", true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        showStatus("signup-status", data.message || "Signup failed.", true);
        return;
      }

      showStatus("signup-status", data.message || "Signup successful.", false);
      setTimeout(() => {
        window.location.href = `verify-otp.html?email=${encodeURIComponent(
          data.email || email,
        )}&type=signup`;
      }, 400);
    } catch (err) {
      console.error(err);
      showStatus(
        "signup-status",
        "Cannot reach server. Is the backend running? Open a terminal, run: cd backend && npm start",
        true,
      );
    }
  });
};

// LOGIN
const initLoginPage = () => {
  setupPasswordToggles();
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("login-status");

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
      showStatus("login-status", "Email and password are required.", true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        showStatus("login-status", data.message || "Login failed.", true);
        return;
      }

      if (data.token) {
        saveToken(data.token);
      }

      showStatus("login-status", data.message || "Login successful.", false);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 400);
    } catch (err) {
      console.error(err);
      showStatus("login-status", "Network error. Please try again.", true);
    }
  });
};

// VERIFY OTP (signup or reset)
const initVerifyOtpPage = () => {
  const form = document.getElementById("verify-otp-form");
  if (!form) return;

  const emailField = document.getElementById("verify-email");
  const emailFromQuery = getQueryParam("email");
  const type = getQueryParam("type") || "signup";

  if (emailField && emailFromQuery) {
    emailField.value = emailFromQuery;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("verify-otp-status");

    const email = form.email.value.trim();
    const otp = form.otp.value.trim();

    if (!email || !otp) {
      showStatus("verify-otp-status", "Email and OTP are required.", true);
      return;
    }

    const endpoint = type === "reset" ? "verify-reset-otp" : "verify-otp";

    try {
      const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        showStatus(
          "verify-otp-status",
          data.message || "OTP verification failed.",
          true,
        );
        return;
      }

      if (type === "reset" && data.resetToken) {
        saveResetToken(data.resetToken);
        showStatus(
          "verify-otp-status",
          "OTP verified. Redirecting to reset password...",
          false,
        );
        setTimeout(() => {
          window.location.href = "reset-password.html";
        }, 400);
        return;
      }

      showStatus(
        "verify-otp-status",
        data.message || "OTP verified successfully.",
        false,
      );
      setTimeout(() => {
        window.location.href = "login.html";
      }, 400);
    } catch (err) {
      console.error(err);
      showStatus("verify-otp-status", "Network error. Please try again.", true);
    }
  });
};

// FORGOT PASSWORD
const initForgotPasswordPage = () => {
  const form = document.getElementById("forgot-password-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("forgot-status");

    const email = form.email.value.trim();
    if (!email) {
      showStatus("forgot-status", "Email is required.", true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        showStatus(
          "forgot-status",
          data.message || "Failed to send OTP.",
          true,
        );
        return;
      }

      showStatus(
        "forgot-status",
        data.message || "OTP sent. Redirecting...",
        false,
      );
      setTimeout(() => {
        window.location.href = `verify-otp.html?email=${encodeURIComponent(
          data.email || email,
        )}&type=reset`;
      }, 400);
    } catch (err) {
      console.error(err);
      showStatus("forgot-status", "Network error. Please try again.", true);
    }
  });
};

// RESET PASSWORD
const initResetPasswordPage = () => {
  setupPasswordToggles();
  const form = document.getElementById("reset-password-form");
  if (!form) return;

  const resetToken = getResetToken();
  if (!resetToken) {
    window.location.href = "forgot-password.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("reset-status");

    const newPassword = form.newPassword.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    if (!newPassword || !confirmPassword) {
      showStatus("reset-status", "All fields are required.", true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showStatus("reset-status", "Passwords do not match.", true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        showStatus(
          "reset-status",
          data.message || "Password reset failed.",
          true,
        );
        return;
      }

      removeResetToken();
      showStatus(
        "reset-status",
        data.message || "Password reset successful. Redirecting...",
        false,
      );
      setTimeout(() => {
        window.location.href = "login.html";
      }, 400);
    } catch (err) {
      console.error(err);
      showStatus("reset-status", "Network error. Please try again.", true);
    }
  });
};

// INDEX (dashboard-like, protected)
const initIndexPage = async () => {
  const token = getToken();
  const welcomeEl = document.getElementById("dashboard-welcome");
  const subtitleEl = document.getElementById("dashboard-subtitle");
  const statusEl = document.getElementById("dashboard-status");
  const logoutBtn = document.getElementById("logout-button");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      removeToken();
      window.location.href = "login.html";
    });
  }

  try {
    const res = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      if (statusEl)
        statusEl.textContent = data.message || "Failed to load dashboard.";
      if (res.status === 401 || res.status === 403) {
        removeToken();
        setTimeout(() => (window.location.href = "login.html"), 400);
      }
      return;
    }

    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${data.user.username}!`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `You signed up with ${data.user.email}`;
    }
    if (statusEl) statusEl.textContent = data.message || "";
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent = "Network error while loading dashboard.";
    }
  }
};

// ROUTER
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  switch (page) {
    case "signup":
      initSignupPage();
      break;
    case "login":
      initLoginPage();
      break;
    case "verify-otp":
      initVerifyOtpPage();
      break;
    case "forgot-password":
      initForgotPasswordPage();
      break;
    case "reset-password":
      initResetPasswordPage();
      break;
    case "index":
      initIndexPage();
      break;
    default:
      break;
  }
});
