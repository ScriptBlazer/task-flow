// category.js
// Handles category CRUD and rendering

function setupAddCategoryForm() {
  var form = document.getElementById("add-category-form");
  form.classList.add("add-category-form");
  var categoryNameInput = document.getElementById("category-name");
  var explainer = form.querySelector('.category-name-explainer');
  explainer.style.display = "none";
  explainer.style.color = "#b94a48";

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    var categoryName = categoryNameInput.value.trim();
    if (!categoryName) {
      explainer.textContent = "Please enter a category name.";
      explainer.style.display = "block";
      setTimeout(function() {
        explainer.style.display = "none";
      }, 3000);
      return;
    }
    explainer.textContent = "";
    explainer.style.display = "none";
    var projectName = document.getElementById("project-select").value;
    if (categoryName && projectName) {
      db.collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .set({ createdAt: Date.now() })
        .then(function() {
          document.getElementById("category-name").value = "";
          db.collection("projects").doc(projectName).update({
            updatedAt: Date.now(),
          });
          var app = document.getElementById("app");
          var scrollY = window.scrollY;
          app.innerHTML = "";
          window.scrollTo(0, scrollY);
          loadCategoriesForProject(projectName, app);
        })
        .catch(function(err) {
          console.error("Error adding category:", err);
        });
    }
  });
}

function loadCategoriesForProject(projectName, container) {
  var scrollY = window.scrollY;
  container.innerHTML = "";
  db.collection("projects")
    .doc(projectName)
    .collection("categories")
    .get()
    .then(function(snapshot) {
      snapshot.forEach(function(doc) {
        var categoryName = doc.id;
        loadCategory(projectName, categoryName, container);
      });
      window.scrollTo(0, scrollY);
    });
}

// loadCategory will be defined in action-type.js for dependency reasons 