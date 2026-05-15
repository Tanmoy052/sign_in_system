// frontend/js/auth.js
/**
 * Production-grade Authentication Client
 * Handles API communication, token management, and UI state.
 */

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001/api/auth"
    : "https://sign-in-system-wnqf.onrender.com/api/auth";

// --- Utility Functions ---

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

const getQueryParam = (name) => new URLSearchParams(window.location.search).get(name);

// Token Management
const auth = {
  setToken: (token) => localStorage.setItem("authToken", token),
  getToken: () => localStorage.getItem("authToken"),
  removeToken: () => localStorage.removeItem("authToken"),
  setResetToken: (token) => localStorage.setItem("resetToken", token),
  getResetToken: () => localStorage.getItem("resetToken"),
  removeResetToken: () => localStorage.removeItem("resetToken"),
};

// UI Helpers
const setLoading = (buttonId, isLoading) => {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || "Submit";
    btn.disabled = false;
  }
};

// --- Page Initializers ---

const setupPasswordToggles = () => {
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".password-container").querySelector("input");
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      
      btn.innerHTML = isPassword 
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;
    });
  });
};

const initSignupPage = () => {
  setupPasswordToggles();
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("signup-status");
    setLoading("signup-btn", true);

    const payload = {
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");

      showStatus("signup-status", "Account created! Redirecting to verification...");
      setTimeout(() => {
        window.location.href = `verify-otp.html?email=${encodeURIComponent(payload.email)}&type=signup`;
      }, 1500);
    } catch (err) {
      showStatus("signup-status", err.message, true);
    } finally {
      setLoading("signup-btn", false);
    }
  });
};

const initLoginPage = () => {
  setupPasswordToggles();
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("login-status");
    setLoading("login-btn", true);

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.value.trim(),
          password: form.password.value.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      if (data.token) auth.setToken(data.token);
      showStatus("login-status", "Success! Redirecting to dashboard...");
      setTimeout(() => (window.location.href = "index.html"), 1000);
    } catch (err) {
      showStatus("login-status", err.message, true);
    } finally {
      setLoading("login-btn", false);
    }
  });
};

const initVerifyOtpPage = () => {
  const form = document.getElementById("verify-otp-form");
  if (!form) return;

  const email = getQueryParam("email");
  const type = getQueryParam("type") || "signup";
  const resendBtn = document.getElementById("resend-otp-btn");
  
  if (email) document.getElementById("verify-email").value = email;

  // Resend Timer
  let seconds = 60;
  const startTimer = () => {
    resendBtn.disabled = true;
    const timer = setInterval(() => {
      seconds--;
      document.getElementById("resend-timer").textContent = `(${seconds}s)`;
      if (seconds <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        document.getElementById("resend-timer").textContent = "";
        seconds = 60;
      }
    }, 1000);
  };
  startTimer();

  resendBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showStatus("verify-otp-status", "New OTP sent!");
      startTimer();
    } catch (err) {
      showStatus("verify-otp-status", err.message, true);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("verify-otp-status");
    setLoading("verify-btn", true);

    const endpoint = type === "reset" ? "verify-reset-otp" : "verify-otp";

    try {
      const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.value.trim(),
          otp: form.otp.value.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (type === "reset") {
        auth.setResetToken(data.resetToken);
        showStatus("verify-otp-status", "Verified! Proceed to reset password.");
        setTimeout(() => (window.location.href = "reset-password.html"), 1000);
      } else {
        showStatus("verify-otp-status", "Email verified! You can now log in.");
        setTimeout(() => (window.location.href = "login.html"), 1500);
      }
    } catch (err) {
      showStatus("verify-otp-status", err.message, true);
    } finally {
      setLoading("verify-btn", false);
    }
  });
};

const initForgotPasswordPage = () => {
  const form = document.getElementById("forgot-password-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus("forgot-status");
    setLoading("forgot-btn", true);

    const email = form.email.value.trim();
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showStatus("forgot-status", "Reset OTP sent! Redirecting...");
      setTimeout(() => {
        window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}&type=reset`;
      }, 1500);
    } catch (err) {
      showStatus("forgot-status", err.message, true);
    } finally {
      setLoading("forgot-btn", false);
    }
  });
};

const initResetPasswordPage = () => {
  setupPasswordToggles();
  const form = document.getElementById("reset-password-form");
  if (!form) return;

  const resetToken = auth.getResetToken();
  if (!resetToken) {
    window.location.href = "forgot-password.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.newPassword.value !== form.confirmPassword.value) {
      return showStatus("reset-status", "Passwords do not match.", true);
    }

    setLoading("reset-btn", true);
    try {
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword: form.newPassword.value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      auth.removeResetToken();
      showStatus("reset-status", "Password reset successful! Redirecting...");
      setTimeout(() => (window.location.href = "login.html"), 1500);
    } catch (err) {
      showStatus("reset-status", err.message, true);
    } finally {
      setLoading("reset-btn", false);
    }
  });
};

const initIndexPage = async () => {
  const token = auth.getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("logout-button")?.addEventListener("click", () => {
    auth.removeToken();
    window.location.href = "login.html";
  });

  try {
    const res = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    
    if (!res.ok) {
      if (res.status === 401) {
        auth.removeToken();
        window.location.href = "login.html";
      }
      throw new Error(data.message);
    }

    const { user } = data.data;
    document.getElementById("dashboard-welcome").textContent = `Welcome, ${user.username}!`;
    document.getElementById("dashboard-subtitle").textContent = `Registered Email: ${user.email}`;
    document.getElementById("dashboard-status").textContent = "Your account is secure and verified.";
  } catch (err) {
    document.getElementById("dashboard-status").textContent = "Session expired. Please log in again.";
    auth.removeToken();
    setTimeout(() => (window.location.href = "login.html"), 2000);
  }
};

// --- Router ---
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  switch (page) {
    case "signup": initSignupPage(); break;
    case "login": initLoginPage(); break;
    case "verify-otp": initVerifyOtpPage(); break;
    case "forgot-password": initForgotPasswordPage(); break;
    case "reset-password": initResetPasswordPage(); break;
    case "index": initIndexPage(); break;
  }
});
