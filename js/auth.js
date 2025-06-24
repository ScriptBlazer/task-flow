// auth.js
// Handles authentication state and logout

function setupAuth() {
  firebase.auth().onAuthStateChanged(async function(user) {
    if (user) {
      console.log("Logged in UID:", user.uid);
      const userDoc = await db.collection("users").doc(user.uid).get();
      const role = userDoc.data()?.role;
      console.log("User role:", role);
      window.isReadOnlyUser = role !== "admin";
      if (window.isReadOnlyUser) {
        applyReadOnlyMode();
        // Optionally, show a read-only banner
        var banner = document.createElement("div");
        banner.textContent = "Read-only mode: You do not have permission to make changes.";
        banner.className = "readonly-banner";
        document.body.appendChild(banner);
        if (role !== "admin") {
          console.warn('You are in read-only mode. Check your Firestore users collection: the document for this UID should have a field "role" with value "admin".');
        }
      }
    } else {
      window.location.href = "login.html";
    }
  });
}

function setupLogoutButton() {
  var logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
      firebase.auth().signOut().then(function() {
        window.location.href = "login.html";
      });
    });
  }
}

function applyReadOnlyMode() {
  // Disable all delete buttons with standard disabled style
  document.querySelectorAll('.delete-project-btn, .delete-category-btn, .remove-action-btn, .delete-task-btn, .delete-btn').forEach(function(btn) {
    btn.disabled = true;
    btn.classList.add('disabled-btn');
  });

  // Disable all other standard form elements except project switching, toggle-done-btn, completed-tasks toggle, hamburger, and logout
  document.querySelectorAll('input, button, select, textarea').forEach(function(el) {
    if (
      el.id !== "project-select" &&
      !el.classList.contains("toggle-done-btn") &&
      el.id !== "logout-btn" &&
      !el.classList.contains("form-check-input") && // allow completed-tasks toggle
      !el.classList.contains("hamburger") &&
      el.id !== "logout-btn"
    ) {
      el.disabled = true;
      el.classList.add('disabled-btn');
    } else {
      el.disabled = false;
      el.classList.remove('disabled-btn');
    }
  });

  // Block clicks on task controls and visually indicate disabled
  document
    .querySelectorAll(
      ".status-option, .remove-action-btn, .delete-category-btn, .task-title, .delete-project-btn"
    )
    .forEach(function(el) {
      if (el.id !== "logout-btn" && !el.classList.contains("hamburger")) {
        el.style.pointerEvents = "none";
        el.style.opacity = "0.5";
        el.style.cursor = "not-allowed";
      } else {
        el.style.pointerEvents = "auto";
        el.style.opacity = "";
        el.style.cursor = "pointer";
      }
    });

  // Ensure hamburger and logout button are always enabled and clickable
  var hamburger = document.querySelector('.hamburger');
  if (hamburger) {
    hamburger.disabled = false;
    hamburger.classList.remove('disabled-btn');
    hamburger.style.pointerEvents = 'auto';
    hamburger.style.opacity = '';
    hamburger.style.cursor = 'pointer';
  }
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.disabled = false;
    logoutBtn.classList.remove('disabled-btn');
    logoutBtn.style.pointerEvents = 'auto';
    logoutBtn.style.opacity = '';
    logoutBtn.style.cursor = 'pointer';
  }

  // Disable all add-task forms (inputs and buttons) and inline task editing
  document.querySelectorAll('.add-task-form input, .add-task-form button, .task-input').forEach(function(el) {
    el.disabled = true;
    el.classList.add('disabled-btn');
  });

  // FINAL: Ensure ALL hamburger buttons are enabled and clickable, and their parents allow pointer events
  document.querySelectorAll('.hamburger').forEach(function(hamburger) {
    // Enable all parent elements for pointer events
    let el = hamburger;
    while (el) {
      if (el.style) el.style.pointerEvents = 'auto';
      el = el.parentElement;
    }
    hamburger.disabled = false;
    hamburger.classList.remove('disabled-btn');
    hamburger.style.pointerEvents = 'auto';
    hamburger.style.opacity = '';
    hamburger.style.cursor = 'pointer';
    hamburger.style.zIndex = '2000';
    // Re-attach click event
    hamburger.onclick = function() {
      if (typeof toggleSidebar === 'function') toggleSidebar();
    };
  });
}

// Add sidebar toggle for hamburger menu
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
} 