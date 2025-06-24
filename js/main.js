// main.js
// Entry point: bootstraps the app and sets up event listeners

document.addEventListener("DOMContentLoaded", function() {
  setupAuth();
  setupLogoutButton();
  setupAddProjectForm();
  setupProjectDropdown();
  setupDeleteProjectButton();
  setupAddCategoryForm();
});

// Emoji helpers
function getActionEmoji(key) {
  key = key.toLowerCase();
  if (key.includes("fix")) return "🛠";
  if (key.includes("add")) return "✨";
  if (key.includes("update")) return "🔄";
  if (key.includes("optional")) return "💡";
  return "➡️";
}

function getCategoryEmoji(name) {
  name = name.toLowerCase();
  if (name.includes("drive") || name.includes("driver") || name.includes("driving") || name.includes("car") || name.includes("cars")) return "🚗";
  if (name.includes("shuttle") || name.includes("shuttles") || name.includes("bus") || name.includes("buses") || name.includes("transport") || name.includes("transportation")) return "🚐";
  if (name.includes("hotel") || name.includes("hotels") || name.includes("guest") || name.includes("guests") || name.includes("room") || name.includes("rooms")) return "🏨";
  if (name.includes("expense") || name.includes("expenses") || name.includes("spend") || name.includes("cost")) return "💰";
  if (name.includes("billing") || name.includes("bills") || name.includes("invoice") || name.includes("invoices") || name.includes("payment") || name.includes("payments")) return "🧾";
  if (name.includes("general") || name.includes("settings") || name.includes("setup") || name.includes("config")) return "⚙️";
  return "📁";
} 