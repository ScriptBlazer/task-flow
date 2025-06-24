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
  let explainer = form.querySelector('.project-name-explainer');
  explainer.style.display = "none";
  explainer.style.color = "white";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      explainer.textContent = "Please enter a project name.";
      explainer.style.display = "block";
      setTimeout(() => {
        explainer.style.display = "none";
      }, 3000);
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
  const categoryNameInput = document.getElementById("category-name");
  const explainer = form.querySelector('.category-name-explainer');
  explainer.style.display = "none";
  explainer.style.color = "#b94a48";

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const categoryName = categoryNameInput.value.trim();
    if (!categoryName) {
      explainer.textContent = "Please enter a category name.";
      explainer.style.display = "block";
      setTimeout(() => {
        explainer.style.display = "none";
      }, 3000);
      return;
    }
    explainer.textContent = "";
    explainer.style.display = "none";
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
    });
}

function renderTask(
  taskData,
  container,
  projectName,
  categoryName,
  actionTypeKey
) {
  const template = document.getElementById("task-template");
  const taskElement = template.content.cloneNode(true).querySelector(".task");
  const taskTextElement = taskElement.querySelector(".task-text");

  taskElement.dataset.taskId = taskData.id;
  const taskText = taskData.title || taskData.text;
  taskTextElement.textContent = taskText;
  taskElement.classList.add(taskData.status || "white");

  // Add back inline editing
  taskTextElement.addEventListener("click", () => {
    if (window.isReadOnlyUser) return;

    const input = document.createElement("input");
    input.type = "text";
    input.value = taskTextElement.textContent;
    input.className = "task-input"; // Use existing class for styling
    taskElement.insertBefore(input, taskTextElement);
    if (taskTextElement.parentElement === taskElement) {
      taskElement.removeChild(taskTextElement);
    }
    input.focus();

    const saveChanges = () => {
      const newText = input.value.trim();
      const taskRef = db
        .collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .collection(actionTypeKey)
        .doc(taskData.id);

      if (newText && newText !== taskText) {
        taskRef
          .update({
            text: newText,
            title: firebase.firestore.FieldValue.delete(),
          })
          .then(() => {
            taskTextElement.textContent = newText;
            taskData.text = newText;
            delete taskData.title;
            if (input.parentElement === taskElement) {
              taskElement.insertBefore(taskTextElement, input);
              taskElement.removeChild(input);
            }
          });
      } else {
        if (input.parentElement === taskElement) {
          taskElement.insertBefore(taskTextElement, input);
          taskElement.removeChild(input);
        }
      }
    };

    input.addEventListener("blur", saveChanges);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      } else if (e.key === "Escape") {
        input.removeEventListener("blur", saveChanges);
        if (input.parentElement === taskElement) {
          taskElement.insertBefore(taskTextElement, input);
          taskElement.removeChild(input);
        }
      }
    });
  });

  // Status options logic
  taskElement
    .querySelector(".status-options")
    .addEventListener("click", (e) => {
      if (window.isReadOnlyUser) return;
      const selectedStatus = e.target.textContent.trim();
      const taskRef = db
        .collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .collection(actionTypeKey)
        .doc(taskData.id);

      if (selectedStatus === "Delete") {
        showConfirmation("Are you sure you want to delete this task?", () => {
          taskRef.delete().then(() => taskElement.remove());
        });
      } else {
        const statusMap = {
          "To Do": "white",
          "In Progress": "orange",
          Done: "green",
        };
        const newStatus = statusMap[selectedStatus];
        taskRef.update({ status: newStatus }).then(() => {
          taskElement.className = `task ${newStatus}`;
          // Respect the hide completed toggle
          const toggle = document.querySelector(
            `[data-category-name=\"${categoryName}\"] .toggle-completed-tasks`
          );
          if (newStatus === "green" && toggle && !toggle.checked) {
            taskElement.style.display = "none";
          } else {
            taskElement.style.display = "";
          }
        });
      }
    });

  container.appendChild(taskElement);
  return taskElement;
}

function loadCategory(projectName, categoryName, container) {
  const categoryTemplate = document.getElementById("category-template");
  const categoryEl = categoryTemplate.content
    .cloneNode(true)
    .querySelector(".category");

  categoryEl.dataset.categoryName = categoryName;
  categoryEl.querySelector(".category-title").textContent = `${getCategoryEmoji(
    categoryName
  )} ${categoryName}`;

  const deleteCategoryBtn = categoryEl.querySelector(".delete-category-btn");
  deleteCategoryBtn.addEventListener("click", () => {
    if (window.isReadOnlyUser) return;
    showConfirmation(
      `Are you sure you want to delete the category "${categoryName}"?`,
      () => {
        db.collection("projects")
          .doc(projectName)
          .collection("categories")
          .doc(categoryName)
          .delete()
          .then(() => categoryEl.remove());
      }
    );
  });

  // "Hide completed tasks" toggle logic
  const toggleInput = categoryEl.querySelector(".toggle-completed-tasks");
  const toggleLabel = categoryEl.querySelector(".form-check-label");
  const toggleKey = `toggleDone-${projectName}-${categoryName}`;
  const shouldHideCompleted = localStorage.getItem(toggleKey) === "true";

  toggleInput.checked = !shouldHideCompleted;
  toggleLabel.textContent = toggleInput.checked
    ? "Hide completed"
    : "Show completed";

  toggleInput.addEventListener("change", () => {
    const isChecked = toggleInput.checked;
    localStorage.setItem(toggleKey, !isChecked ? "true" : "false");
    toggleLabel.textContent = isChecked ? "Hide completed" : "Show completed";
    const tasks = categoryEl.querySelectorAll(".task.green");
    tasks.forEach((task) => {
      task.style.display = isChecked ? "" : "none";
    });
  });

  const actionTypesContainer = categoryEl.querySelector(
    ".action-types-container"
  );
  const addActionTypeForm = categoryEl.querySelector(".add-action-type-form");
  const actionTypeSelector = addActionTypeForm.querySelector(
    ".action-type-selector"
  );
  const addActionTypeBtn = addActionTypeForm.querySelector(
    ".add-action-type-btn"
  );
  const actionTypeExplainer = addActionTypeForm.querySelector('.explainer-text');

  // Populate action type selector
  ACTION_TYPES.forEach((at) => {
    const option = document.createElement("option");
    option.value = at.key;
    option.textContent = at.label;
    actionTypeSelector.appendChild(option);
  });

  addActionTypeBtn.addEventListener("click", () => {
    if (window.isReadOnlyUser) return;
    const selectedActionTypeKey = actionTypeSelector.value;
    const actionType = ACTION_TYPES.find(
      (at) => at.key === selectedActionTypeKey
    );

    const existingActionType = actionTypesContainer.querySelector(
      `.action-type.${selectedActionTypeKey}`
    );
    if (existingActionType) {
      actionTypeExplainer.textContent = 'This action type already exists in this category.';
      actionTypeExplainer.style.display = 'block';
      setTimeout(() => {
        actionTypeExplainer.style.display = 'none';
      }, 3000);
      return;
    } else {
      actionTypeExplainer.style.display = 'none';
    }

    if (actionType) {
      renderActionType(
        projectName,
        categoryName,
        actionType,
        actionTypesContainer
      );
    }
  });

  ACTION_TYPES.forEach((actionType) => {
    db.collection("projects")
      .doc(projectName)
      .collection("categories")
      .doc(categoryName)
      .collection(actionType.key)
      .get()
      .then((snapshot) => {
        if (!snapshot.empty) {
          const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const actionTypeEl = renderActionType(
            projectName,
            categoryName,
            actionType,
            actionTypesContainer,
            tasks
          );
          // Hide completed tasks on initial load
          if (shouldHideCompleted) {
            actionTypeEl.querySelectorAll(".task.green").forEach((task) => {
              task.style.display = "none";
            });
          }
        }
      });
  });

  container.appendChild(categoryEl);
}

function renderActionType(
  projectName,
  categoryName,
  actionType,
  container,
  tasks = []
) {
  const actionTypeTemplate = document.getElementById("action-type-template");
  const actionTypeEl = actionTypeTemplate.content
    .cloneNode(true)
    .querySelector(".action-type");

  actionTypeEl.classList.add(actionType.key);
  actionTypeEl.querySelector(".action-title").textContent = `${getActionEmoji(
    actionType.key
  )} ${actionType.label}`;

  const removeActionBtn = actionTypeEl.querySelector(".remove-action-btn");
  removeActionBtn.addEventListener("click", () => {
    if (window.isReadOnlyUser) return;
    showConfirmation(
      `Delete "${actionType.label}" section and all its tasks?`,
      () => {
        const batch = db.batch();
        const collectionRef = db
          .collection("projects")
          .doc(projectName)
          .collection("categories")
          .doc(categoryName)
          .collection(actionType.key);
        collectionRef.get().then((snapshot) => {
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          batch.commit().then(() => actionTypeEl.remove());
        });
      }
    );
  });

  const tasksContainer = actionTypeEl.querySelector(".tasks-container");
  tasks.forEach((taskData) => {
    renderTask(
      taskData,
      tasksContainer,
      projectName,
      categoryName,
      actionType.key
    );
  });

  const addTaskForm = actionTypeEl.querySelector('.add-task-form');
  const addTaskExplainer = addTaskForm.querySelector('.add-task-explainer');
  addTaskExplainer.style.display = 'none';
  addTaskExplainer.style.color = 'white';
  addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (window.isReadOnlyUser) return;
    const taskInput = addTaskForm.querySelector('.task-input');
    const taskText = taskInput.value.trim();
    if (!taskText) {
      addTaskExplainer.textContent = 'Please enter a task name.';
      addTaskExplainer.style.display = 'block';
      setTimeout(() => {
        addTaskExplainer.style.display = 'none';
      }, 3000);
      return;
    }
    addTaskExplainer.textContent = '';
    addTaskExplainer.style.display = 'none';
    db.collection("projects").doc(projectName).collection("categories").doc(categoryName).collection(actionType.key).add({
      text: taskText,
      status: 'white',
      createdAt: Date.now()
    }).then(docRef => {
      renderTask({ id: docRef.id, text: taskText, status: 'white' }, tasksContainer, projectName, categoryName, actionType.key);
      taskInput.value = '';
    });
  });

  container.appendChild(actionTypeEl);
  return actionTypeEl;
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
