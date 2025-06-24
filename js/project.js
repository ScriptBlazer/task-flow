// project.js
// Handles project CRUD and selection

function setupAddProjectForm() {
  var form = document.getElementById("add-project-form");
  var nameInput = document.getElementById("project-name");
  var explainer = form.querySelector('.project-name-explainer');
  explainer.style.display = "none";
  explainer.style.color = "white";

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    if (!name) {
      explainer.textContent = "Please enter a project name.";
      explainer.style.display = "block";
      setTimeout(function() {
        explainer.style.display = "none";
      }, 3000);
      return;
    }
    explainer.textContent = "";
    explainer.style.display = "none";

    if (typeof db === "undefined") {
      console.error("❌ Firestore 'db' is not defined. Check firebase-config.js.");
      return;
    }

    db.collection("projects")
      .doc(name)
      .set({
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .then(function() {
        document.getElementById("project-name").value = "";
        var projectSelect = document.getElementById("project-select");
        var option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        projectSelect.insertBefore(option, projectSelect.firstChild);
        projectSelect.value = name;
        var app = document.getElementById("app");
        var scrollY = window.scrollY;
        app.innerHTML = "";
        window.scrollTo(0, scrollY);
        loadCategoriesForProject(name, app);
      })
      .catch(function(error) {
        console.error("❌ Failed to save project to Firestore:", error);
      });
  });
}

function setupProjectDropdown() {
  var projectSelect = document.getElementById("project-select");
  projectSelect.classList.add("project-select");

  db.collection("projects")
    .get()
    .then(function(snapshot) {
      var projects = [];
      snapshot.forEach(function(doc) {
        var data = doc.data();
        projects.push({
          id: doc.id,
          createdAt: data.createdAt || 0,
          updatedAt: data.updatedAt || data.createdAt || 0,
        });
      });
      projects.sort(function(a, b) { return b.updatedAt - a.updatedAt; });
      projects.forEach(function(project, index) {
        var option = document.createElement("option");
        option.value = project.id;
        option.textContent = project.id;
        projectSelect.appendChild(option);
        if (index === 0) projectSelect.value = project.id;
      });
      if (projects.length > 0) {
        var latestProject = projects[0].id;
        var app = document.getElementById("app");
        app.classList.add("app");
        var scrollY = window.scrollY;
        app.innerHTML = "";
        window.scrollTo(0, scrollY);
        loadCategoriesForProject(latestProject, app);
      }
    });

  projectSelect.addEventListener("change", function() {
    var selectedProject = projectSelect.value;
    var app = document.getElementById("app");
    var scrollY = window.scrollY;
    app.innerHTML = "";
    window.scrollTo(0, scrollY);
    if (selectedProject) {
      loadCategoriesForProject(selectedProject, app);
    }
  });
}

function setupDeleteProjectButton() {
  var deleteProjectBtn = document.querySelector(".delete-project-btn");
  if (!deleteProjectBtn) {
    deleteProjectBtn = document.createElement("button");
    deleteProjectBtn.className = "delete-project-btn";
    deleteProjectBtn.textContent = "Delete Project";
    document.body.appendChild(deleteProjectBtn);
  }
  deleteProjectBtn.addEventListener("click", function() {
    var projectSelect = document.getElementById("project-select");
    var selectedProject = projectSelect.value;
    if (!selectedProject) return;
    showProjectDeleteConfirmation(selectedProject);
  });
} 