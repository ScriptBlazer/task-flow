// task.js
// Handles rendering, editing, and deleting tasks

function renderTask(
  taskData,
  container,
  projectName,
  categoryName,
  actionTypeKey
) {
  var template = document.getElementById("task-template");
  var taskElement = template.content.cloneNode(true).querySelector(".task");
  var taskTextElement = taskElement.querySelector(".task-text");
  var editBtn = taskElement.querySelector(".edit-task-btn");
  taskElement.dataset.taskId = taskData.id;
  var taskText = taskData.title || taskData.text;
  taskTextElement.textContent = taskText;
  taskElement.classList.add(taskData.status || "white");

  function startEditing() {
    if (window.isReadOnlyUser) return;
    var input = document.createElement("input");
    input.type = "text";
    input.value = taskTextElement.textContent;
    input.className = "task-input";
    taskElement.insertBefore(input, taskTextElement);
    if (taskTextElement.parentElement === taskElement) {
      taskElement.removeChild(taskTextElement);
    }
    input.focus();
    var saveChanges = function () {
      var newText = input.value.trim();
      var taskRef = db
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
          .then(function () {
            // Update parent project's updatedAt
            db.collection("projects")
              .doc(projectName)
              .update({ updatedAt: Date.now() });
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
    input.addEventListener("keydown", function (e) {
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
  }

  // Only allow editing by clicking the edit icon on mobile (<=900px), and by clicking the text on desktop (>450px)
  taskTextElement.addEventListener("click", function (e) {
    if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) {
      // On mobile, do not allow editing by clicking the text
      return;
    }
    startEditing();
  });

  if (editBtn) {
    editBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (
        window.matchMedia &&
        window.matchMedia("(max-width: 900px)").matches
      ) {
        startEditing();
      }
    });
  }

  // Status options logic
  taskElement
    .querySelector(".status-options")
    .addEventListener("click", function (e) {
      if (window.isReadOnlyUser) return;
      var selectedStatus = e.target.textContent.trim();
      var taskRef = db
        .collection("projects")
        .doc(projectName)
        .collection("categories")
        .doc(categoryName)
        .collection(actionTypeKey)
        .doc(taskData.id);
      if (selectedStatus === "Delete") {
        showConfirmation(
          "Are you sure you want to delete this task?",
          function () {
            taskRef.delete().then(function () {
              taskElement.remove();
            });
          }
        );
      } else {
        var statusMap = {
          "To Do": "white",
          "In Progress": "orange",
          Done: "green",
        };
        var newStatus = statusMap[selectedStatus];
        taskRef.update({ status: newStatus }).then(function () {
          // Update parent project's updatedAt
          db.collection("projects")
            .doc(projectName)
            .update({ updatedAt: Date.now() });
          taskElement.className = "task " + newStatus;
          var toggle = document.querySelector(
            '[data-category-name="' +
              categoryName +
              '"] .toggle-completed-tasks'
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
