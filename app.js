// Storage helpers
function save(key, data) {
  try { localStorage.setItem('flowtab_' + key, JSON.stringify(data)); } catch(e) {}
}

function load(key, fallback) {
  try {
    var stored = localStorage.getItem('flowtab_' + key);
    return stored ? JSON.parse(stored) : fallback;
  } catch(e) { return fallback; }
}

// State
var settings = load('settings', { name: '', clockFormat: '12', bg: 'dark' });
var tasks = load('tasks', []);
var links = load('links', [
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: 'Reddit', url: 'https://reddit.com' },
  { name: 'Google', url: 'https://google.com' }
]);
var quickNote = load('note', '');
var focusStats = load('focus', { sessions: 0, totalMinutes: 0, lastDate: '' });

var timerMinutes = 25;
var timerSeconds = timerMinutes * 60;
var timerRunning = false;
var timerInterval = null;

var quotes = [
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Code is like humor. When you have to explain it, it's bad.",
  "First, solve the problem. Then, write the code.",
  "Simplicity is the soul of efficiency.",
  "Make it work, make it right, make it fast.",
  "The only way to do great work is to love what you do.",
  "Talk is cheap. Show me the code.",
  "It's not a bug, it's an undocumented feature.",
  "Weeks of coding can save hours of planning.",
  "Any fool can write code that a computer can understand.",
  "Done is better than perfect.",
  "Stay hungry, stay foolish."
];

// Clock
function updateClock() {
  var now = new Date();
  var hours = now.getHours();
  var minutes = now.getMinutes();
  var suffix = '';

  if (settings.clockFormat === '12') {
    suffix = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }

  var h = String(hours).padStart(2, '0');
  var m = String(minutes).padStart(2, '0');
  document.getElementById('clock').textContent = h + ':' + m + suffix;

  var dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  document.getElementById('dateDisplay').textContent = dateStr;
}

function updateGreeting() {
  var hour = new Date().getHours();
  var period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  var name = settings.name ? ', ' + settings.name : '';
  document.getElementById('greeting').textContent = 'Good ' + period + name;
}

// Tasks
function renderTasks() {
  var list = document.getElementById('taskList');
  list.innerHTML = '';

  var active = tasks.filter(function(t) { return !t.done; }).length;
  document.getElementById('taskCount').textContent = active;

  tasks.forEach(function(task, i) {
    var li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');

    var check = document.createElement('div');
    check.className = 'task-checkbox';
    check.addEventListener('click', function() {
      tasks[i].done = !tasks[i].done;
      save('tasks', tasks);
      renderTasks();
    });

    var text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    var del = document.createElement('button');
    del.className = 'task-delete';
    del.textContent = '×';
    del.addEventListener('click', function() {
      tasks.splice(i, 1);
      save('tasks', tasks);
      renderTasks();
    });

    li.appendChild(check);
    li.appendChild(text);
    li.appendChild(del);
    list.appendChild(li);
  });

  var hasDone = tasks.some(function(t) { return t.done; });
  document.getElementById('taskFooter').style.display = hasDone ? 'block' : 'none';
}

document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addTask();
});

function addTask() {
  var input = document.getElementById('taskInput');
  var text = input.value.trim();
  if (!text) return;
  tasks.unshift({ text: text, done: false });
  input.value = '';
  save('tasks', tasks);
  renderTasks();
}

document.getElementById('clearDone').addEventListener('click', function() {
  tasks = tasks.filter(function(t) { return !t.done; });
  save('tasks', tasks);
  renderTasks();
});

// Focus Timer
function updateTimerDisplay() {
  var m = Math.floor(timerSeconds / 60);
  var s = timerSeconds % 60;
  document.getElementById('timerDisplay').textContent =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function checkFocusDate() {
  var today = new Date().toDateString();
  if (focusStats.lastDate !== today) {
    focusStats.sessions = 0;
    focusStats.totalMinutes = 0;
    focusStats.lastDate = today;
    save('focus', focusStats);
  }
}

function updateFocusStats() {
  checkFocusDate();
  document.getElementById('sessionsToday').textContent = focusStats.sessions;
  document.getElementById('totalFocusTime').textContent = focusStats.totalMinutes + 'm';
}

document.getElementById('timerStartBtn').addEventListener('click', function() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    this.textContent = 'Start';
  } else {
    timerRunning = true;
    this.textContent = 'Pause';
    timerInterval = setInterval(function() {
      timerSeconds--;
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timerStartBtn').textContent = 'Start';
        timerSeconds = timerMinutes * 60;

        checkFocusDate();
        focusStats.sessions++;
        focusStats.totalMinutes += timerMinutes;
        save('focus', focusStats);
        updateFocusStats();

        if (Notification.permission === 'granted') {
          new Notification('FlowTab', { body: 'Focus session complete!' });
        }
      }
      updateTimerDisplay();
    }, 1000);
  }
});

document.getElementById('timerResetBtn').addEventListener('click', function() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = timerMinutes * 60;
  document.getElementById('timerStartBtn').textContent = 'Start';
  updateTimerDisplay();
});

document.querySelectorAll('.preset-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.preset-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    timerMinutes = parseInt(this.dataset.minutes);
    timerSeconds = timerMinutes * 60;
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('timerStartBtn').textContent = 'Start';
    updateTimerDisplay();
  });
});

// Quick Links
function renderLinks() {
  var grid = document.getElementById('linksGrid');
  grid.innerHTML = '';

  links.forEach(function(link, i) {
    var a = document.createElement('a');
    a.className = 'link-item';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';

    var initial = link.name.charAt(0).toUpperCase();
    a.innerHTML = '<div class="link-icon">' + initial + '</div>' +
      '<span class="link-name">' + link.name + '</span>' +
      '<button class="link-remove">&times;</button>';

    a.querySelector('.link-remove').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      links.splice(i, 1);
      save('links', links);
      renderLinks();
    });

    grid.appendChild(a);
  });
}

document.getElementById('addLinkBtn').addEventListener('click', function() {
  document.getElementById('addLinkForm').style.display = 'flex';
});

document.getElementById('cancelLinkBtn').addEventListener('click', function() {
  document.getElementById('addLinkForm').style.display = 'none';
  document.getElementById('linkName').value = '';
  document.getElementById('linkUrl').value = '';
});

document.getElementById('saveLinkBtn').addEventListener('click', function() {
  var name = document.getElementById('linkName').value.trim();
  var url = document.getElementById('linkUrl').value.trim();
  if (!name || !url) return;
  if (!url.startsWith('http')) url = 'https://' + url;
  links.push({ name: name, url: url });
  save('links', links);
  renderLinks();
  document.getElementById('addLinkForm').style.display = 'none';
  document.getElementById('linkName').value = '';
  document.getElementById('linkUrl').value = '';
});

// Quick Note
var noteEl = document.getElementById('quickNote');
noteEl.value = quickNote;

var saveTimeout;
noteEl.addEventListener('input', function() {
  var indicator = document.getElementById('saveIndicator');
  indicator.textContent = 'Saving...';
  indicator.classList.add('saving');

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(function() {
    save('note', noteEl.value);
    indicator.textContent = 'Saved';
    indicator.classList.remove('saving');
  }, 500);
});

// Quote
function showQuote() {
  var idx = Math.floor(Math.random() * quotes.length);
  document.getElementById('quoteDisplay').textContent = '"' + quotes[idx] + '"';
}

// Settings
document.getElementById('settingsBtn').addEventListener('click', function() {
  document.getElementById('settingsPanel').style.display = 'block';
  document.getElementById('userName').value = settings.name;
});

function closeSettings() {
  document.getElementById('settingsPanel').style.display = 'none';
}

document.getElementById('settingsClose').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', closeSettings);

document.getElementById('userName').addEventListener('input', function() {
  settings.name = this.value;
  save('settings', settings);
  updateGreeting();
});

document.querySelectorAll('.toggle-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.toggle-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    settings.clockFormat = this.dataset.format;
    save('settings', settings);
    updateClock();
  });
});

document.querySelectorAll('.color-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.color-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    settings.bg = this.dataset.bg;
    save('settings', settings);
    applyBg();
  });
});

document.getElementById('resetAllBtn').addEventListener('click', function() {
  try {
    Object.keys(localStorage).forEach(function(key) {
      if (key.startsWith('flowtab_')) localStorage.removeItem(key);
    });
  } catch(e) {}
  location.reload();
});

function applyBg() {
  document.body.className = '';
  if (settings.bg !== 'dark') {
    document.body.classList.add('bg-' + settings.bg);
  }
}

// Init
function init() {
  applyBg();
  updateClock();
  updateGreeting();
  renderTasks();
  renderLinks();
  updateTimerDisplay();
  updateFocusStats();
  showQuote();

  setInterval(updateClock, 1000);
  setInterval(updateGreeting, 60000);

  if (settings.clockFormat === '24') {
    document.querySelectorAll('.toggle-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.format === '24');
    });
  }

  document.querySelectorAll('.color-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.bg === settings.bg);
  });

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

init();
