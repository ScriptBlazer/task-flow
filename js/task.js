// task.js
// Handles rendering, editing, and deleting tasks

function renderTask(taskData, container, projectName, categoryName, actionTypeKey) {
  var template = document.getElementById("task-template");
  var taskElement = template.content.cloneNode(true).querySelector(".task");
  var taskTextElement = taskElement.querySelector(".task-text");
  taskElement.dataset.taskId = taskData.id;
  var taskText = taskData.title || taskData.text;
  taskTextElement.textContent = taskText;
  taskElement.classList.add(taskData.status || "white");
  // Inline editing
  taskTextElement.addEventListener('click', function() {
    if (window.isReadOnlyUser) return;
    var input = document.createElement('input');
    input.type = 'text';
    input.value = taskTextElement.textContent;
    input.className = 'task-input';
    taskElement.insertBefore(input, taskTextElement);
    if (taskTextElement.parentElement === taskElement) {
      taskElement.removeChild(taskTextElement);
    }
    input.focus();
    var saveChanges = function() {
      var newText = input.value.trim();
      var taskRef = db.collection("projects").doc(projectName).collection("categories").doc(categoryName).collection(actionTypeKey).doc(taskData.id);
      if (newText && newText !== taskText) {
        taskRef.update({ text: newText, title: firebase.firestore.FieldValue.delete() }).then(function() {
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
    input.addEventListener('blur', saveChanges);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.removeEventListener('blur', saveChanges);
        if (input.parentElement === taskElement) {
          taskElement.insertBefore(taskTextElement, input);
          taskElement.removeChild(input);
        }
      }
    });
  });
  // Status options logic
  taskElement.querySelector(".status-options").addEventListener("click", function(e) {
    if (window.isReadOnlyUser) return;
    var selectedStatus = e.target.textContent.trim();
    var taskRef = db.collection("projects").doc(projectName).collection("categories").doc(categoryName).collection(actionTypeKey).doc(taskData.id);
    if (selectedStatus === "Delete") {
      showConfirmation("Are you sure you want to delete this task?", function() {
        taskRef.delete().then(function() { taskElement.remove(); });
      });
    } else {
      var statusMap = { "To Do": "white", "In Progress": "orange", "Done": "green" };
      var newStatus = statusMap[selectedStatus];
      taskRef.update({ status: newStatus }).then(function() {
        taskElement.className = "task " + newStatus;
        var toggle = document.querySelector('[data-category-name="' + categoryName + '"] .toggle-completed-tasks');
        if (newStatus === 'green' && toggle && !toggle.checked) {
          taskElement.style.display = 'none';
        } else {
          taskElement.style.display = '';
        }
      });
    }
  });
  container.appendChild(taskElement);
  return taskElement;
} 