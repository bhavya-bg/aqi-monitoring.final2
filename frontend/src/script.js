function switchTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("login-form").style.display = isLogin ? "" : "none";
  document.getElementById("signup-form").style.display = isLogin ? "none" : "";
  document.getElementById("tab-login").classList.toggle("active", isLogin);
  document.getElementById("tab-signup").classList.toggle("active", !isLogin);
  clearMsg();
}

function showMsg(text, type) {
  const el = document.getElementById("msg");
  el.innerHTML = text;
  el.className = "message " + type;
  el.style.display = "flex";
}

function clearMsg() {
  const el = document.getElementById("msg");
  el.style.display = "none";
}

function togglePw(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

/* LOGIN */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      showMsg("Login successful!", "success");
    } else {
      showMsg(data.message, "error");
    }
  } catch {
    showMsg("Server error", "error");
  }
}

/* SIGNUP */
async function handleSignup(e) {
  e.preventDefault();

  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const res = await fetch("http://localhost:5000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      showMsg("Signup successful!", "success");
    } else {
      showMsg(data.message, "error");
    }
  } catch {
    showMsg("Server error", "error");
  }
}
