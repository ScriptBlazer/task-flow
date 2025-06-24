// action-type.js
// Handles action type rendering and logic

function loadCategory(projectName, categoryName, container) {
  var categoryTemplate = document.getElementById('category-template');
  var categoryEl = categoryTemplate.content.cloneNode(true).querySelector('.category');
  categoryEl.dataset.categoryName = categoryName;
  categoryEl.querySelector('.category-title').textContent = getCategoryEmoji(categoryName) + ' ' + categoryName;
  var deleteCategoryBtn = categoryEl.querySelector('.delete-category-btn');
  if (window.isReadOnlyUser && deleteCategoryBtn) {
    deleteCategoryBtn.disabled = true;
    deleteCategoryBtn.classList.add('disabled-btn');
  }
  deleteCategoryBtn.addEventListener('click', function() {
    if (window.isReadOnlyUser) return;
    showConfirmation('Are you sure you want to delete the category "' + categoryName + '"?', function() {
      db.collection('projects').doc(projectName).collection('categories').doc(categoryName).delete()
        .then(function() { categoryEl.remove(); });
    });
  });
  var toggleInput = categoryEl.querySelector('.toggle-completed-tasks');
  var toggleLabel = categoryEl.querySelector('.form-check-label');
  var toggleKey = 'toggleDone-' + projectName + '-' + categoryName;
  var shouldHideCompleted = localStorage.getItem(toggleKey) === 'true';
  toggleInput.checked = !shouldHideCompleted;
  toggleLabel.textContent = toggleInput.checked ? 'Hide completed' : 'Show completed';
  toggleInput.addEventListener('change', function() {
    var isChecked = toggleInput.checked;
    localStorage.setItem(toggleKey, !isChecked ? 'true' : 'false');
    toggleLabel.textContent = isChecked ? 'Hide completed' : 'Show completed';
    var tasks = categoryEl.querySelectorAll('.task.green');
    tasks.forEach(function(task) {
      task.style.display = isChecked ? '' : 'none';
    });
  });
  var actionTypesContainer = categoryEl.querySelector('.action-types-container');
  var addActionTypeForm = categoryEl.querySelector('.add-action-type-form');
  var actionTypeSelector = addActionTypeForm.querySelector('.action-type-selector');
  var addActionTypeBtn = addActionTypeForm.querySelector('.add-action-type-btn');
  var actionTypeExplainer = addActionTypeForm.querySelector('.explainer-text');
  ACTION_TYPES.forEach(function(at) {
    var option = document.createElement('option');
    option.value = at.key;
    option.textContent = at.label;
    actionTypeSelector.appendChild(option);
  });
  addActionTypeBtn.addEventListener('click', function() {
    if (window.isReadOnlyUser) return;
    var selectedActionTypeKey = actionTypeSelector.value;
    var actionType = ACTION_TYPES.find(function(at) { return at.key === selectedActionTypeKey; });
    var existingActionType = actionTypesContainer.querySelector('.action-type.' + selectedActionTypeKey);
    if (existingActionType) {
      actionTypeExplainer.textContent = 'This action type already exists in this category.';
      actionTypeExplainer.style.display = 'block';
      setTimeout(function() {
        actionTypeExplainer.style.display = 'none';
      }, 3000);
      return;
    } else {
      actionTypeExplainer.style.display = 'none';
    }
    if (actionType) {
      renderActionType(projectName, categoryName, actionType, actionTypesContainer);
    }
  });
  ACTION_TYPES.forEach(function(actionType) {
    db.collection('projects').doc(projectName).collection('categories').doc(categoryName).collection(actionType.key).get().then(function(snapshot) {
      if (!snapshot.empty) {
        var tasks = snapshot.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
        var actionTypeEl = renderActionType(projectName, categoryName, actionType, actionTypesContainer, tasks);
        if (shouldHideCompleted) {
          actionTypeEl.querySelectorAll('.task.green').forEach(function(task) {
            task.style.display = 'none';
          });
        }
      }
    });
  });
  container.appendChild(categoryEl);
}

function renderActionType(projectName, categoryName, actionType, container, tasks) {
  var actionTypeTemplate = document.getElementById('action-type-template');
  var actionTypeEl = actionTypeTemplate.content.cloneNode(true).querySelector('.action-type');
  actionTypeEl.classList.add(actionType.key);
  actionTypeEl.querySelector('.action-title').textContent = getActionEmoji(actionType.key) + ' ' + actionType.label;
  var removeActionBtn = actionTypeEl.querySelector('.remove-action-btn');
  removeActionBtn.addEventListener('click', function() {
    if (window.isReadOnlyUser) return;
    showConfirmation('Delete "' + actionType.label + '" section and all its tasks?', function() {
      var batch = db.batch();
      var collectionRef = db.collection('projects').doc(projectName).collection('categories').doc(categoryName).collection(actionType.key);
      collectionRef.get().then(function(snapshot) {
        snapshot.docs.forEach(function(doc) { batch.delete(doc.ref); });
        batch.commit().then(function() { actionTypeEl.remove(); });
      });
    });
  });
  var tasksContainer = actionTypeEl.querySelector('.tasks-container');
  if (tasks) {
    tasks.forEach(function(taskData) {
      renderTask(taskData, tasksContainer, projectName, categoryName, actionType.key);
    });
  }
  var addTaskForm = actionTypeEl.querySelector('.add-task-form');
  var addTaskInput = addTaskForm.querySelector('.task-input');
  if (window.isReadOnlyUser && addTaskInput) {
    addTaskInput.disabled = true;
    addTaskInput.classList.add('disabled-btn');
  }
  var addTaskExplainer = addTaskForm.querySelector('.add-task-explainer');
  addTaskExplainer.style.display = 'none';
  addTaskExplainer.style.color = 'white';
  addTaskForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (window.isReadOnlyUser) return;
    var taskInput = addTaskForm.querySelector('.task-input');
    var taskText = taskInput.value.trim();
    if (!taskText) {
      addTaskExplainer.textContent = 'Please enter a task name.';
      addTaskExplainer.style.display = 'block';
      setTimeout(function() {
        addTaskExplainer.style.display = 'none';
      }, 3000);
      return;
    }
    addTaskExplainer.textContent = '';
    addTaskExplainer.style.display = 'none';
    db.collection('projects').doc(projectName).collection('categories').doc(categoryName).collection(actionType.key).add({
      text: taskText,
      status: 'white',
      createdAt: Date.now()
    }).then(function(docRef) {
      renderTask({ id: docRef.id, text: taskText, status: 'white' }, tasksContainer, projectName, categoryName, actionType.key);
      taskInput.value = '';
    });
  });
  container.appendChild(actionTypeEl);
  return actionTypeEl;
} 