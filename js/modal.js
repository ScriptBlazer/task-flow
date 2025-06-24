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
  modal.className = "custom-modal";
  modal.style.maxWidth = "600px";
  modal.style.width = "90%";

  const bigWarning = document.createElement("div");
  bigWarning.style.fontSize = "2rem";
  bigWarning.style.fontWeight = "bold";
  bigWarning.style.color = "red";
  bigWarning.style.marginBottom = "1.5rem";
  bigWarning.style.textAlign = "center";
  bigWarning.textContent = `You are about to delete project "${projectName}"!`;

  const info = document.createElement("div");
  info.style.fontSize = "1.2rem";
  info.style.marginBottom = "1.5rem";
  info.style.textAlign = "center";
  info.textContent = "There is NO WAY to retrieve this information once deleted.";

  const inputLabel = document.createElement("div");
  inputLabel.style.fontSize = "1rem";
  inputLabel.style.marginBottom = "0.5rem";
  inputLabel.textContent = 'Type "Delete" to confirm:';

  const input = document.createElement("input");
  input.type = "text";
  input.style.fontSize = "1.2rem";
  input.style.padding = "0.5rem";
  input.style.marginBottom = "1rem";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "confirm";
  confirmBtn.textContent = "Delete";
  confirmBtn.disabled = true;
  confirmBtn.style.fontSize = "1.2rem";
  confirmBtn.style.padding = "0.75rem 2rem";
  confirmBtn.style.margin = "1rem 0.5rem 0 0.5rem";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.fontSize = "1.2rem";
  cancelBtn.style.padding = "0.75rem 2rem";
  cancelBtn.style.margin = "1rem 0.5rem 0 0.5rem";

  input.addEventListener("input", () => {
    confirmBtn.disabled = input.value !== "Delete";
  });

  confirmBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    // Project deletion logic should be handled in the main file for clarity
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