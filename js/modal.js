// modal.js
// Handles all modal/confirmation dialogs

function showConfirmation(message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);
  overlay.style.display = "flex";

  const modal = document.createElement("div");
  modal.className = "custom-modal";

  const msg = document.createElement("p");
  msg.textContent = message;

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "confirm";
  confirmBtn.textContent = "Yes, delete";
  confirmBtn.addEventListener("click", () => {
    onConfirm();
    document.body.removeChild(overlay);
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  modal.appendChild(msg);
  modal.appendChild(confirmBtn);
  modal.appendChild(cancelBtn);
  overlay.appendChild(modal);
}

// Project delete modal (special case)
function showProjectDeleteConfirmation(projectName) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);
  overlay.style.display = "flex";

  const modal = document.createElement("div");
  modal.className = "custom-modal custom-wide";

  const bigWarning = document.createElement("div");
  bigWarning.className = "modal-warning";
  bigWarning.textContent = `You are about to delete project "${projectName}"!`;

  const info = document.createElement("div");
  info.className = "modal-info";
  info.textContent =
    "There is NO WAY to retrieve this information once deleted.";

  const inputLabel = document.createElement("div");
  inputLabel.className = "modal-label";
  inputLabel.textContent = 'Type "Delete" to confirm:';

  const input = document.createElement("input");
  input.type = "text";
  input.className = "modal-input";

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "confirm";
  confirmBtn.textContent = "Delete";
  confirmBtn.disabled = true;

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel";
  cancelBtn.textContent = "Cancel";

  input.addEventListener("input", () => {
    confirmBtn.disabled = input.value !== "Delete";
  });

  confirmBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    // Project deletion logic should be handled outside
  });

  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  modal.appendChild(bigWarning);
  modal.appendChild(info);
  modal.appendChild(inputLabel);
  modal.appendChild(input);
  modal.appendChild(confirmBtn);
  modal.appendChild(cancelBtn);
  overlay.appendChild(modal);
}
