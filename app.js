console.log("Script loaded");

// --- Constants for Action Types and Status Classes ---
const ACTION_TYPES = [
  { key: "Fix", label: "Fix Bugs" },
  { key: "Add", label: "Add Features" },
  { key: "Update", label: "Update Existing Features" },
];

// === Status color mapping used to apply color classes to tasks ===
const STATUS_CLASSES = {
  white: "white",
  orange: "orange",
  green: "green",
};

// === Auth check: redirect to login page if user is not logged in ===
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

// === Load everything once the page has fully loaded ===
document.addEventListener("DOMContentLoaded", () => {
  setupAddProjectForm();
  setupAddCategoryForm();

  const projectSelect = document.getElementById("project-select");

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
});

// === Setup the "Add Project" form ===
function setupAddProjectForm() {
  document
    .getElementById("add-project-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("project-name");
      nameInput.classList.add("project-name-input");
      const name = nameInput.value.trim();

      if (!name) {
        console.warn("⚠️ No project name entered.");
        return;
      }

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

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const categoryName = document.getElementById("category-name").value.trim();
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
  const hideDone = localStorage.getItem(toggleKey) === "true";
  const toggleDoneLabel = document.createElement("span");
  toggleDoneLabel.className = "toggle-done-label";
  toggleDoneLabel.textContent = hideDone
    ? "Show completed tasks"
    : "Hide completed tasks";

  const toggleDoneBtn = document.createElement("button");
  toggleDoneBtn.className = "toggle-done-btn";
  if (hideDone) toggleDoneBtn.classList.add("active");

  toggleDoneBtn.addEventListener("click", () => {
    const newHide = !toggleDoneBtn.classList.contains("active");
    localStorage.setItem(toggleKey, newHide);
    toggleDoneBtn.classList.toggle("active");
    toggleDoneLabel.textContent = newHide
      ? "Show completed tasks"
      : "Hide completed tasks";

    // Reload only this category
    const scrollY = window.scrollY;
    categoryContainer.remove(); // remove current display
    loadCategory(projectName, categoryName, container); // reload this category
    window.scrollTo(0, scrollY);
  });

  // Get all action types (Fix/Add/Update) and check if they have tasks
  const deleteCategoryBtn = document.createElement("button");
  deleteCategoryBtn.textContent = "🗑 Delete";
  deleteCategoryBtn.className = "delete-category-btn";
  deleteCategoryBtn.style.marginLeft = "8px";
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
  rightControls.appendChild(toggleDoneLabel);
  rightControls.appendChild(toggleDoneBtn);
  rightControls.appendChild(deleteCategoryBtn);

  headingWrapper.appendChild(rightControls);

  categoryContainer.appendChild(headingWrapper);

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
          .then(() => {
            db.collection("projects").doc(projectName).update({
              updatedAt: Date.now(),
            });
            loadCategoriesForProject(projectName, container);
          })
          .catch((err) => console.error("Error adding task:", err));
      });

      actionDiv.appendChild(form);
      categoryContainer.appendChild(actionDiv);

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
            if (hideDone && data.status === "green") return;
            const task = document.createElement("div");
            task.className = `task ${STATUS_CLASSES[data.status] || "white"}`;

            const titleSpan = document.createElement("span");
            titleSpan.className = "task-title";
            titleSpan.textContent = data.title;

            titleSpan.addEventListener("click", () => {
              const input = document.createElement("input");
              input.type = "text";
              input.className = "task-edit-input";
              input.value = data.title;

              input.addEventListener("blur", () => {
                const newTitle = input.value.trim();
                if (newTitle && newTitle !== data.title) {
                  doc.ref.update({ title: newTitle }).then(() => {
                    db.collection("projects").doc(projectName).update({
                      updatedAt: Date.now(),
                    });
                    loadCategoriesForProject(projectName, container);
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
                  loadCategoriesForProject(projectName, container);
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
                  loadCategoriesForProject(projectName, container);
                });
              });
            });

            statusOptions.appendChild(deleteBtn);
            task.appendChild(statusOptions);
            actionDiv.appendChild(task);
          });
        });
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
  addActionTypeBtn.style.marginLeft = "8px";

  addActionTypeBtn.addEventListener("click", () => {
    const key = actionTypeSelector.value;
    const { label } = ACTION_TYPES.find((type) => type.key === key);

    const existing = categoryContainer.querySelector(`.action-type.${key}`);
    if (existing) return;

    const actionDiv = document.createElement("div");
    actionDiv.className = `action-type ${key}`;

    // TITLE WRAPPER
    const titleWrapper = document.createElement("div");
    titleWrapper.className = "action-title-wrapper";
    titleWrapper.style.display = "flex";
    titleWrapper.style.justifyContent = "space-between";
    titleWrapper.style.alignItems = "center";

    // TITLE
    const title = document.createElement("h3");
    title.className = "action-type-title";
    title.textContent = getActionEmoji(key) + " " + label;

    // DELETE BUTTON
    const removeActionBtn = document.createElement("button");
    removeActionBtn.className = "remove-action-btn";
    removeActionBtn.textContent = "❌";
    removeActionBtn.title = "Remove this action type";
    removeActionBtn.style.background = "none";
    removeActionBtn.style.border = "none";
    removeActionBtn.style.cursor = "pointer";
    removeActionBtn.style.fontSize = "1.2em";
    removeActionBtn.style.marginLeft = "auto";

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

    // APPEND ELEMENTS
    titleWrapper.appendChild(title);
    titleWrapper.appendChild(removeActionBtn);
    actionDiv.appendChild(titleWrapper);

    // Then append other content like the form, task list, etc.
    categoryContainer.appendChild(actionDiv);

    const form = document.createElement("form");
    form.className = "task-form";
    form.style.marginTop = "5px";
    form.innerHTML = `
      <input type="text" class="task-input" placeholder="Task title..." required style="margin-right:5px;" />
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
        .then(() => {
          db.collection("projects").doc(projectName).update({
            updatedAt: Date.now(),
          });
          loadCategoriesForProject(projectName, container);
        })
        .catch((err) => console.error("Error adding task:", err));
    });

    actionDiv.appendChild(form);
    categoryContainer.appendChild(actionDiv);

    // Fetch and display existing tasks
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
          if (hideDone && data.status === "green") return;
          const task = document.createElement("div");
          task.className = `task ${STATUS_CLASSES[data.status] || "white"}`;
          const titleSpan = document.createElement("span");
          titleSpan.className = "task-title";
          titleSpan.textContent = data.title;
          titleSpan.style.flexGrow = "1";
          titleSpan.style.cursor = "pointer";
          titleSpan.style.marginRight = "10px";
          titleSpan.style.display = "inline-block";

          titleSpan.addEventListener("click", () => {
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
                  db.collection("projects").doc(projectName).update({
                    updatedAt: Date.now(),
                  });
                  loadCategoriesForProject(projectName, container);
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
                loadCategoriesForProject(projectName, container);
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
              doc.ref.delete().then(() => {
                db.collection("projects").doc(projectName).update({
                  updatedAt: Date.now(),
                });
                loadCategoriesForProject(projectName, container);
              });
            });
          });

          statusOptions.appendChild(deleteBtn);
          task.appendChild(statusOptions);
          actionDiv.appendChild(task);
        });
      });
  });

  const actionControls = document.createElement("div");
  actionControls.className = "action-controls";
  actionControls.appendChild(actionTypeSelector);
  actionControls.appendChild(addActionTypeBtn);
  categoryContainer.appendChild(actionControls);
  // End replacement

  container.appendChild(categoryContainer);
}

function getActionEmoji(key) {
  switch (key) {
    case "Fix":
      return "🛠";
    case "Add":
      return "✚";
    case "Update":
      return "🔄";
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

  const modal = document.createElement("div");
  modal.className = "modal";

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
  document.body.appendChild(overlay);
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("open");
}
