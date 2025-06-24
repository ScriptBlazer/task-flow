console.log("Script loaded");

// --- Constants for Action Types and Status Classes ---
const ACTION_TYPES = [
  { key: "Fix", label: "Fix Bugs" },
  { key: "Add", label: "Add Features" },
  { key: "Update", label: "Update Existing Features" },
  { key: "Optional", label: "Optional Features" },
];

// === Status color mapping used to apply color classes to tasks ===
const STATUS_CLASSES = {
  white: "white",
  orange: "orange",
  green: "green",
};

// === Auth check: redirect to login page if user is not logged in ===
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    console.log("Logged in UID:", user.uid);
    const userDoc = await db.collection("users").doc(user.uid).get();
    const role = userDoc.data()?.role;
    console.log("User role:", role);
    window.isReadOnlyUser = role !== "admin";
    if (window.isReadOnlyUser) {
      applyReadOnlyMode();
      // Optionally, show a read-only banner
      const banner = document.createElement("div");
      banner.textContent =
        "Read-only mode: You do not have permission to make changes.";
      banner.className = "readonly-banner";
      document.body.appendChild(banner);
      // Debugging tip
      if (role !== "admin") {
        console.warn(
          'You are in read-only mode. Check your Firestore users collection: the document for this UID should have a field "role" with value "admin".'
        );
      }
    }
  }
});

// === Load everything once the page has fully loaded ===
document.addEventListener("DOMContentLoaded", () => {
  setupAddProjectForm();
  setupAddCategoryForm();

  const projectSelect = document.getElementById("project-select");
  projectSelect.classList.add("project-select");

  // Inject Delete Project button at the top right of the screen
  let deleteProjectBtn = document.querySelector(".delete-project-btn");
  if (!deleteProjectBtn) {
    deleteProjectBtn = document.createElement("button");
    deleteProjectBtn.className = "delete-project-btn";
    deleteProjectBtn.textContent = "Delete Project";
    document.body.appendChild(deleteProjectBtn);
  }

  deleteProjectBtn.addEventListener("click", () => {
    const selectedProject = projectSelect.value;
    if (!selectedProject) return;
    showProjectDeleteConfirmation(selectedProject);
  });

  // === Load all projects from Firestore ===
  db.collection("projects")
    .get()
    .then((snapshot) => {
      const projects = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        projects.push({
          id: doc.id,
          createdAt: data.createdAt || 0,
          updatedAt: data.updatedAt || data.createdAt || 0,
        });
      });

      // Sort by updatedAt descending
      projects.sort((a, b) => b.updatedAt - a.updatedAt);

      // Populate the project dropdown
      projects.forEach((project, index) => {
        const option = document.createElement("option");
        option.value = project.id;
        option.textContent = project.id;
        projectSelect.appendChild(option);
        if (index === 0) projectSelect.value = project.id;
      });

      // Automatically load categories for the most recent project
      if (projects.length > 0) {
        const latestProject = projects[0].id;
        const app = document.getElementById("app");
        app.classList.add("app");
        const scrollY = window.scrollY;
        app.innerHTML = "";
        window.scrollTo(0, scrollY);
        loadCategoriesForProject(latestProject, app);
      }
    });

  // === Handle project switching ===
  projectSelect.addEventListener("change", () => {
    const selectedProject = projectSelect.value;
    const app = document.getElementById("app");
    const scrollY = window.scrollY;
    app.innerHTML = "";
    window.scrollTo(0, scrollY);
    if (selectedProject) {
      loadCategoriesForProject(selectedProject, app);
    }
  });

  // Logout button logic
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      firebase
        .auth()
        .signOut()
        .then(() => {
          window.location.href = "login.html";
        });
    });
  }
});

// === Setup the "Add Project" form ===
function setupAddProjectForm() {
  const form = document.getElementById("add-project-form");
  const nameInput = document.getElementById("project-name");
  let explainer = document.createElement("span");
  explainer.className = "explainer-text";
  explainer.style.display = "none";
  nameInput.insertAdjacentElement("afterend", explainer);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      explainer.textContent = "Please enter a project name.";
      explainer.style.display = "block";
      return;
    }
    explainer.textContent = "";
    explainer.style.display = "none";

    // Ensure Firestore DB object is defined
    if (typeof db === "undefined") {
      console.error(
        "❌ Firestore 'db' is not defined. Check firebase-config.js."
      );
      return;
    }

    // Save new project to Firestore
    db.collection("projects")
      .doc(name)
      .set({
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .then(() => {
        console.log(`✅ Project "${name}" saved to Firestore.`);

        document.getElementById("project-name").value = "";

        // Add new project to dropdown immediately
        const projectSelect = document.getElementById("project-select");
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        projectSelect.insertBefore(option, projectSelect.firstChild);
        projectSelect.value = name;

        // Reload app view with the new project
        const app = document.getElementById("app");
        const scrollY = window.scrollY;
        app.innerHTML = "";
        window.scrollTo(0, scrollY);
        loadCategoriesForProject(name, app);
      })
      .catch((error) => {
        console.error("❌ Failed to save project to Firestore:", error);
      });
  });
}

// === Setup the "Add Category" form ===
function setupAddCategoryForm() {
  const form = document.getElementById("add-category-form");
  form.classList.add("add-category-form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const categoryName = document.getElementById("category-name").value.trim();
    const categoryNameInput = document.getElementById("category-name");
    categoryNameInput.classList.add("category-name");
    const projectName = document.getElementById("project-select").value;

    // Add category under the selected project
    if (categoryName && projectName) {
      db.collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .set({ createdAt: Date.now() })
        .then(() => {
          document.getElementById("category-name").value = "";

          // Update updatedAt on project
          db.collection("projects").doc(projectName).update({
            updatedAt: Date.now(),
          });

          // Reload category list
          const app = document.getElementById("app");
          const scrollY = window.scrollY;
          app.innerHTML = "";
          window.scrollTo(0, scrollY);
          loadCategoriesForProject(projectName, app);
        })
        .catch((err) => {
          console.error("Error adding category:", err);
        });
    }
  });
}

// === Load all categories for the selected project ===
function loadCategoriesForProject(projectName, container) {
  const scrollY = window.scrollY;
  container.innerHTML = "";

  // Get all categories in the selected project
  db.collection("projects")
    .doc(projectName)
    .collection("categories")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const categoryName = doc.id;
        loadCategory(projectName, categoryName, container);
      });
      // Restore scroll after re-render
      window.scrollTo(0, scrollY);
      if (window.isReadOnlyUser) applyReadOnlyMode();
    });
}

// === Load one specific category within a project ===
function loadCategory(projectName, categoryName, container) {
  const categoryContainer = document.createElement("div");
  categoryContainer.className = "category";

  // Create heading wrapper (title + toggle + delete)
  const headingWrapper = document.createElement("div");
  headingWrapper.className = "heading-wrapper";

  // Category heading text
  const heading = document.createElement("h2");
  heading.textContent = `${getCategoryEmoji(categoryName)} ${categoryName}`;

  // Create toggle to show/hide completed tasks (state stored in localStorage)
  const toggleKey = `toggleDone-${projectName}-${categoryName}`;
  const completedVisible = localStorage.getItem(toggleKey) !== "true";

  // Bootstrap 5 form-switch toggle
  const toggleWrapper = document.createElement("div");
  toggleWrapper.className = "form-check form-switch mb-0";

  const toggleDoneInput = document.createElement("input");
  toggleDoneInput.className = "form-check-input";
  toggleDoneInput.type = "checkbox";
  toggleDoneInput.role = "switch";
  toggleDoneInput.id = `toggle-done-${projectName}-${categoryName}`;
  toggleDoneInput.checked = completedVisible;

  const toggleDoneLabel = document.createElement("label");
  toggleDoneLabel.className = "form-check-label toggle-done-label";
  toggleDoneLabel.setAttribute("for", toggleDoneInput.id);
  toggleDoneLabel.textContent = completedVisible
    ? "Hide completed tasks"
    : "Show completed tasks";

  toggleDoneInput.addEventListener("change", () => {
    const newCompletedVisible = toggleDoneInput.checked;
    localStorage.setItem(toggleKey, !newCompletedVisible); // store hideDone = !completedVisible
    toggleDoneLabel.textContent = newCompletedVisible
      ? "Hide completed tasks"
      : "Show completed tasks";
    // IN-PLACE: Hide/show green tasks in this category only
    const tasks = categoryContainer.querySelectorAll(".task");
    tasks.forEach((task) => {
      if (task.classList.contains("green")) {
        task.style.display = newCompletedVisible ? "" : "none";
      }
    });
  });

  toggleWrapper.appendChild(toggleDoneInput);
  toggleWrapper.appendChild(toggleDoneLabel);

  // Get all action types (Fix/Add/Update) and check if they have tasks
  const deleteCategoryBtn = document.createElement("button");
  deleteCategoryBtn.textContent = "🗑 Delete";
  deleteCategoryBtn.className = "delete-category-btn";
  deleteCategoryBtn.addEventListener("click", () => {
    showConfirmation(
      `Delete the entire category "${categoryName}" and all its tasks?`,
      () => {
        const categoryRef = db
          .collection("projects")
          .doc(projectName)
          .collection("categories")
          .doc(categoryName);
        Promise.all(
          ACTION_TYPES.map((type) =>
            categoryRef
              .collection(type.key)
              .get()
              .then((snapshot) =>
                Promise.all(snapshot.docs.map((doc) => doc.ref.delete()))
              )
          )
        ).then(() =>
          categoryRef
            .delete()
            .then(() => loadCategoriesForProject(projectName, container))
        );
      }
    );
  });

  headingWrapper.appendChild(heading);

  const rightControls = document.createElement("div");
  rightControls.style.display = "flex";
  rightControls.style.alignItems = "center";
  rightControls.appendChild(toggleWrapper);
  rightControls.appendChild(deleteCategoryBtn);

  headingWrapper.appendChild(rightControls);

  categoryContainer.appendChild(headingWrapper);

  // Helper to create and append an action type section
  function createActionTypeSection(key, label, hasTasks) {
    const actionDiv = document.createElement("div");
    actionDiv.className = `action-type ${key}`;

    // Create titleWrapper and its children in correct order
    const titleWrapper = document.createElement("div");
    titleWrapper.className = "action-title-wrapper";
    titleWrapper.style.position = "relative";

    const title = document.createElement("h3");
    title.className = "action-type-title";
    title.textContent = getActionEmoji(key) + " " + label;

    const removeActionBtn = document.createElement("button");
    removeActionBtn.className = "remove-action-btn";
    removeActionBtn.textContent = "❌";
    removeActionBtn.title = "Remove this action type";
    removeActionBtn.style.position = "absolute";
    removeActionBtn.style.top = "0";
    removeActionBtn.style.right = "0";
    removeActionBtn.addEventListener("click", () => {
      showConfirmation(
        "Are you sure you want to delete this action type and all its tasks?",
        () => {
          db.collection("projects")
            .doc(projectName)
            .collection("categories")
            .doc(categoryName)
            .collection(key)
            .get()
            .then((snapshot) => {
              const deletions = snapshot.docs.map((doc) => doc.ref.delete());
              return Promise.all(deletions);
            })
            .then(() => {
              categoryContainer.removeChild(actionDiv);
              db.collection("projects").doc(projectName).update({
                updatedAt: Date.now(),
              });
            })
            .catch((err) => {
              console.error("Error deleting action type tasks:", err);
            });
        }
      );
    });
    titleWrapper.appendChild(title);
    titleWrapper.appendChild(removeActionBtn);
    actionDiv.appendChild(titleWrapper);

    const form = document.createElement("form");
    form.className = "task-form";
    form.innerHTML = `
      <input type="text" class="task-input" placeholder="Task title..." required />
      <button type="submit" class="add-task-btn">Add Task</button>
    `;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const titleInput = form.querySelector("input").value.trim();
      const statusValue = "white";
      if (!titleInput) return;
      db.collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .collection(key)
        .add({
          title: titleInput,
          status: statusValue,
          createdAt: Date.now(),
        })
        .then((docRef) => {
          db.collection("projects").doc(projectName).update({
            updatedAt: Date.now(),
          });
          // IN-PLACE: Add the new task DOM node
          const newTask = document.createElement("div");
          newTask.className = `task white`;
          newTask.setAttribute("data-task-id", docRef.id);
          const titleSpan = document.createElement("span");
          titleSpan.className = "task-title";
          titleSpan.textContent = titleInput;
          titleSpan.style.flexGrow = "1";
          titleSpan.style.cursor = "pointer";
          titleSpan.style.marginRight = "10px";
          titleSpan.style.display = "inline-block";
          newTask.appendChild(titleSpan);
          // Copy statusOptions creation from above
          const statusOptions = document.createElement("div");
          statusOptions.className = "status-options";
          const makeStatusOption = (label, color) => {
            const btn = document.createElement("div");
            btn.className = `status-option ${color}`;
            btn.textContent = label;
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              db.collection("projects")
                .doc(projectName)
                .collection("categories")
                .doc(categoryName)
                .collection(key)
                .doc(docRef.id)
                .update({ status: color })
                .then(() => {
                  db.collection("projects").doc(projectName).update({
                    updatedAt: Date.now(),
                  });
                  // IN-PLACE: Update the task DOM node class
                  newTask.className = `task ${
                    STATUS_CLASSES[color] || "white"
                  }`;
                  // Hide/show if needed
                  if (!completedVisible && color === "green") {
                    newTask.style.display = "none";
                  } else {
                    newTask.style.display = "";
                  }
                });
            });
            return btn;
          };
          statusOptions.appendChild(makeStatusOption("In Progress", "orange"));
          statusOptions.appendChild(makeStatusOption("Done", "green"));
          statusOptions.appendChild(makeStatusOption("Unmark", "white"));
          const deleteBtn = document.createElement("div");
          deleteBtn.className = "status-option delete";
          deleteBtn.textContent = "Delete";
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            showConfirmation("Delete this task?", () => {
              db.collection("projects")
                .doc(projectName)
                .collection("categories")
                .doc(categoryName)
                .collection(key)
                .doc(docRef.id)
                .delete()
                .then(() => {
                  db.collection("projects").doc(projectName).update({
                    updatedAt: Date.now(),
                  });
                  newTask.remove();
                });
            });
          });
          statusOptions.appendChild(deleteBtn);
          newTask.appendChild(statusOptions);
          actionDiv.appendChild(newTask);
          form.querySelector("input").value = "";
        })
        .catch((err) => console.error("Error adding task:", err));
    });
    actionDiv.appendChild(form);
    categoryContainer.appendChild(actionDiv);

    // If hasTasks, fetch and display them
    if (hasTasks) {
      db.collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .collection(key)
        .orderBy("createdAt", "asc")
        .get()
        .then((snapshot) => {
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Render all tasks, but hide green if needed
            const task = document.createElement("div");
            task.className = `task ${STATUS_CLASSES[data.status] || "white"}`;
            task.setAttribute("data-task-id", doc.id);
            if (!completedVisible && data.status === "green") {
              task.style.display = "none";
            }
            const titleSpan = document.createElement("span");
            titleSpan.className = "task-title";
            titleSpan.textContent = data.title;
            titleSpan.style.flexGrow = "1";
            titleSpan.style.cursor = "pointer";
            titleSpan.style.marginRight = "10px";
            titleSpan.style.display = "inline-block";
            titleSpan.addEventListener("click", () => {
              if (window.isReadOnlyUser) return;
              const input = document.createElement("input");
              input.type = "text";
              input.className = "task-edit-input";
              input.value = data.title;
              input.style.flexGrow = "1";
              input.style.marginRight = "10px";
              input.style.width = "80%";
              input.addEventListener("blur", () => {
                const newTitle = input.value.trim();
                if (newTitle && newTitle !== data.title) {
                  doc.ref.update({ title: newTitle }).then(() => {
                    // Update the DOM in place instead of reloading
                    titleSpan.textContent = newTitle;
                    data.title = newTitle;
                    task.replaceChild(titleSpan, input);
                  });
                } else {
                  task.replaceChild(titleSpan, input);
                }
              });
              input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") input.blur();
              });
              task.replaceChild(input, titleSpan);
              input.focus();
            });
            task.appendChild(titleSpan);
            const statusOptions = document.createElement("div");
            statusOptions.className = "status-options";
            const makeStatusOption = (label, color) => {
              const btn = document.createElement("div");
              btn.className = `status-option ${color}`;
              btn.textContent = label;
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                doc.ref.update({ status: color }).then(() => {
                  db.collection("projects").doc(projectName).update({
                    updatedAt: Date.now(),
                  });
                  // IN-PLACE: Update the task DOM node class
                  const taskNode = actionDiv.querySelector(
                    `[data-task-id='${doc.id}']`
                  );
                  if (taskNode) {
                    taskNode.className = `task ${
                      STATUS_CLASSES[color] || "white"
                    }`;
                    // Hide/show if needed
                    if (!completedVisible && color === "green") {
                      taskNode.style.display = "none";
                    } else {
                      taskNode.style.display = "";
                    }
                  }
                });
              });
              return btn;
            };
            statusOptions.appendChild(
              makeStatusOption("In Progress", "orange")
            );
            statusOptions.appendChild(makeStatusOption("Done", "green"));
            statusOptions.appendChild(makeStatusOption("Unmark", "white"));
            const deleteBtn = document.createElement("div");
            deleteBtn.className = "status-option delete";
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              showConfirmation("Delete this task?", () => {
                doc.ref.delete().then(() => {
                  db.collection("projects").doc(projectName).update({
                    updatedAt: Date.now(),
                  });
                  task.remove();
                });
              });
            });
            statusOptions.appendChild(deleteBtn);
            task.appendChild(statusOptions);
            actionDiv.appendChild(task);
          });
        });
    }
  }

  // --- Begin Firestore query for each action type and dynamic action div creation ---
  const actionKeysToCheck = ACTION_TYPES.map(({ key }) => key);
  Promise.all(
    actionKeysToCheck.map((key) =>
      db
        .collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .collection(key)
        .get()
        .then((snapshot) => ({ key, hasTasks: !snapshot.empty }))
    )
  ).then((results) => {
    results.forEach(({ key, hasTasks }) => {
      const existing = categoryContainer.querySelector(`.action-type.${key}`);
      if (existing || !hasTasks) return;
      const { label } = ACTION_TYPES.find((type) => type.key === key);
      createActionTypeSection(key, label, true);
    });
  });
  // --- End Firestore query for each action type and dynamic action div creation ---

  // Begin replacement of ACTION_TYPES.forEach block with dropdown to add action types
  const actionTypeSelector = document.createElement("select");
  actionTypeSelector.className = "action-type-selector";
  actionTypeSelector.innerHTML = ACTION_TYPES.map(
    ({ key, label }) => `<option value="${key}">${label}</option>`
  ).join("");

  const addActionTypeBtn = document.createElement("button");
  addActionTypeBtn.textContent = "Add Action Type";
  addActionTypeBtn.className = "add-action-type-btn";

  // Explainer for action type errors
  let actionTypeExplainer = document.createElement("span");
  actionTypeExplainer.className = "explainer-text";
  actionTypeExplainer.style.display = "none";
  let actionTypeExplainerTimeout = null;

  const actionControls = document.createElement("div");
  actionControls.className = "action-controls";
  actionControls.appendChild(actionTypeSelector);
  actionControls.appendChild(addActionTypeBtn);
  actionControls.appendChild(actionTypeExplainer);
  categoryContainer.appendChild(actionControls);

  addActionTypeBtn.addEventListener("click", () => {
    const key = actionTypeSelector.value;
    const { label } = ACTION_TYPES.find((type) => type.key === key);
    const existing = categoryContainer.querySelector(`.action-type.${key}`);
    if (existing) {
      actionTypeExplainer.textContent = `${label} action type already exists in this category.`;
      actionTypeExplainer.style.display = "block";
      if (actionTypeExplainerTimeout) clearTimeout(actionTypeExplainerTimeout);
      actionTypeExplainerTimeout = setTimeout(() => {
        actionTypeExplainer.textContent = "";
        actionTypeExplainer.style.display = "none";
      }, 5000);
      return;
    }
    actionTypeExplainer.textContent = "";
    actionTypeExplainer.style.display = "none";
    if (actionTypeExplainerTimeout) clearTimeout(actionTypeExplainerTimeout);
    // Create a new action type section (with no tasks yet)
    createActionTypeSection(key, label, false);
  });

  actionTypeSelector.addEventListener("change", () => {
    actionTypeExplainer.textContent = "";
    actionTypeExplainer.style.display = "none";
    if (actionTypeExplainerTimeout) clearTimeout(actionTypeExplainerTimeout);
  });

  container.appendChild(categoryContainer);
  if (window.isReadOnlyUser) applyReadOnlyMode();
}

function getActionEmoji(key) {
  switch (key) {
    case "Fix":
      return "🛠";
    case "Add":
      return "✚";
    case "Update":
      return "🔄";
    case "Optional":
      return "✨";
    default:
      return "";
  }
}

function getCategoryEmoji(name) {
  name = name.toLowerCase();

  if (
    name.includes("drive") ||
    name.includes("driver") ||
    name.includes("driving") ||
    name.includes("car") ||
    name.includes("cars")
  )
    return "🚗";

  if (
    name.includes("shuttle") ||
    name.includes("shuttles") ||
    name.includes("bus") ||
    name.includes("buses") ||
    name.includes("transport") ||
    name.includes("transportation")
  )
    return "🚐";

  if (
    name.includes("hotel") ||
    name.includes("hotels") ||
    name.includes("guest") ||
    name.includes("guests") ||
    name.includes("room") ||
    name.includes("rooms")
  )
    return "🏨";

  if (
    name.includes("expense") ||
    name.includes("expenses") ||
    name.includes("spend") ||
    name.includes("cost")
  )
    return "💰";

  if (
    name.includes("billing") ||
    name.includes("bills") ||
    name.includes("invoice") ||
    name.includes("invoices") ||
    name.includes("payment") ||
    name.includes("payments")
  )
    return "🧾";

  if (
    name.includes("general") ||
    name.includes("settings") ||
    name.includes("setup") ||
    name.includes("config")
  )
    return "⚙️";

  return "📁";
}

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

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("open");
}

// Custom modal for project deletion
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
  info.textContent =
    "There is NO WAY to retrieve this information once deleted.";

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
    // Proceed with deletion (same logic as before)
    db.collection("projects")
      .doc(projectName)
      .collection("categories")
      .get()
      .then((catSnap) => {
        const catDeletes = [];
        catSnap.forEach((catDoc) => {
          const catName = catDoc.id;
          const categoryRef = db
            .collection("projects")
            .doc(projectName)
            .collection("categories")
            .doc(catName);
          const actionTypeDeletes = ACTION_TYPES.map(({ key }) =>
            categoryRef
              .collection(key)
              .get()
              .then((actionSnap) =>
                Promise.all(actionSnap.docs.map((doc) => doc.ref.delete()))
              )
          );
          catDeletes.push(
            Promise.all(actionTypeDeletes).then(() => categoryRef.delete())
          );
        });
        Promise.all(catDeletes).then(() => {
          db.collection("projects")
            .doc(projectName)
            .delete()
            .then(() => {
              // Remove from dropdown
              const projectSelect = document.getElementById("project-select");
              const option = Array.from(projectSelect.options).find(
                (opt) => opt.value === projectName
              );
              if (option) option.remove();
              // Reload UI
              if (projectSelect.options.length > 0) {
                projectSelect.value = projectSelect.options[0].value;
                const app = document.getElementById("app");
                app.innerHTML = "";
                loadCategoriesForProject(projectSelect.value, app);
              } else {
                const app = document.getElementById("app");
                app.innerHTML =
                  "<p>No projects found. Please add a project.</p>";
              }
            });
        });
      });
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

// Helper to disable all interactive elements except project switching, toggle-done-btn, and logout
function applyReadOnlyMode() {
  // Disable all standard form elements except project switching, toggle-done-btn, completed-tasks toggle, and logout
  document.querySelectorAll("input, button, select, textarea").forEach((el) => {
    // Allow project-select, toggle-done-btn, completed-tasks toggle (form-check-input), hamburger, and logout
    if (
      el.id !== "project-select" &&
      !el.classList.contains("toggle-done-btn") &&
      el.id !== "logout-btn" &&
      !el.classList.contains("form-check-input") && // allow completed-tasks toggle
      !el.classList.contains("hamburger")
    ) {
      el.disabled = true;
    }
  });

  // Block clicks on task controls and visually indicate disabled
  document
    .querySelectorAll(
      ".status-option, .remove-action-btn, .delete-category-btn, .task-title, .delete-project-btn"
    )
    .forEach((el) => {
      // Only apply styling to elements that are not logout
      if (el.id !== "logout-btn") {
        el.style.pointerEvents = "none";
        el.style.opacity = "0.5"; // visually indicate disabled
        el.style.cursor = "not-allowed";
      }
    });
}

// Block all form submissions for read-only users
// and block clicks on buttons and custom controls
// Only allow project-select dropdown, toggle-done-btn, completed-tasks toggle, sidebar-toggle, hamburger, and logout-btn

document.addEventListener(
  "submit",
  function (e) {
    if (window.isReadOnlyUser) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  },
  true
);

document.addEventListener(
  "click",
  function (e) {
    if (window.isReadOnlyUser) {
      // Allow project-select, toggle-done-btn, sidebar-toggle, hamburger, completed-tasks toggle, and logout-btn (including children)
      if (
        e.target.id !== "project-select" &&
        !e.target.classList.contains("sidebar-toggle") &&
        !e.target.closest(".hamburger") &&
        !e.target.closest("#logout-btn") &&
        !e.target.closest(".toggle-done-btn") &&
        !e.target.closest(".form-check-input") && // allow completed-tasks toggle
        !e.target.closest(".hamburger")
      ) {
        if (
          e.target.tagName === "BUTTON" ||
          e.target.classList.contains("status-option") ||
          e.target.classList.contains("remove-action-btn") ||
          e.target.classList.contains("delete-category-btn")
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    }
  },
  true
);
