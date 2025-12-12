let timer;
let seconds = 0;
let startTime = 0;
let isPaused = false;
let chartViewDate = new Date(); // التاريخ الحالي للعرض في الرسم

const display = document.getElementById('display');
const statusIndicator = document.getElementById('statusIndicator');
const fieldSelect = document.getElementById('fieldSelect');
const savedTimesDiv = document.getElementById('savedTimes');
const newTopicInput = document.getElementById('newTopic');
const dailyTotalEl = document.getElementById('dailyTotal');
const chartMonthLabel = document.getElementById('chartMonthLabel');

let savedTimes = JSON.parse(localStorage.getItem('studyTimes')) || {};
let savedOrder = JSON.parse(localStorage.getItem('studyOrder')) || [];
let globalTotal = JSON.parse(localStorage.getItem('globalTotalFocus')) || 0;
let dailyData = JSON.parse(localStorage.getItem('dailyData')) || { date: new Date().toDateString(), total: 0 };
let studyHistory = JSON.parse(localStorage.getItem('studyHistory')) || {};

let myChart;

function checkDailyReset() {
  const today = new Date().toDateString();
  if (dailyData.date !== today) {
    dailyData = { date: today, total: 0 };
    saveData();
  }
  dailyTotalEl.textContent = formatTime(dailyData.total);
}

function syncOrder() {
  const keys = Object.keys(savedTimes);
  keys.forEach(key => {
    if (!savedOrder.includes(key)) {
      savedOrder.push(key);
    }
  });
  savedOrder = savedOrder.filter(key => keys.includes(key));
  saveData();
}

function saveData() {
  localStorage.setItem('studyTimes', JSON.stringify(savedTimes));
  localStorage.setItem('studyOrder', JSON.stringify(savedOrder));
  localStorage.setItem('globalTotalFocus', JSON.stringify(globalTotal));
  localStorage.setItem('dailyData', JSON.stringify(dailyData));
  localStorage.setItem('studyHistory', JSON.stringify(studyHistory));
}

function updateSelect() {
  const currentSelection = fieldSelect.value;
  fieldSelect.innerHTML = '';
  
  savedOrder.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = topic;
    fieldSelect.appendChild(option);
  });

  const sep = document.createElement('option');
  sep.disabled = true;
  sep.textContent = '──────────';
  fieldSelect.appendChild(sep);

  const totalOption = document.createElement('option');
  totalOption.value = 'TOTAL_FOCUS_ALL';
  totalOption.textContent = '[ RESET SYSTEM_TOTAL ]';
  fieldSelect.appendChild(totalOption);

  const dailyOption = document.createElement('option');
  dailyOption.value = 'DAILY_FOCUS_RESET';
  dailyOption.textContent = '[ RESET DAILY_LOG ]';
  fieldSelect.appendChild(dailyOption);
  
  if(currentSelection) {
      fieldSelect.value = currentSelection;
  }
}

function formatTime(sec) {
  const h = Math.floor(sec/3600).toString().padStart(2,'0');
  const m = Math.floor((sec%3600)/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function initChart() {
  const ctx = document.getElementById('studyChart').getContext('2d');
  myChart = new Chart(ctx, {
    type: 'line', 
    data: {
      labels: [],
      datasets: [{
        label: 'HOURS',
        data: [],
        borderColor: '#00ffcc', 
        backgroundColor: '#00ffcc', 
        borderWidth: 2,
        tension: 0, 
        pointRadius: 4, 
        pointBackgroundColor: '#fff', 
        pointBorderColor: '#00ffcc',
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true, 
          suggestedMax: 10,
          ticks: { stepSize: 1, color: '#8892b0', font: {family: 'VT323', size: 14} },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: { 
          ticks: { color: '#8892b0', font: {family: 'VT323', size: 14} },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function updateChart() {
  if (!myChart) return;

  const viewYear = chartViewDate.getFullYear();
  const viewMonth = chartViewDate.getMonth();
  
  // تحديث عنوان الشهر
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  chartMonthLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;

  // إنشاء كل أيام الشهر المختار
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const labels = [];
  const dataPoints = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const tempDate = new Date(viewYear, viewMonth, d);
    const dateStr = tempDate.toDateString();
    
    labels.push(d); // رقم اليوم فقط
    const seconds = studyHistory[dateStr] || 0;
    dataPoints.push((seconds / 3600).toFixed(2));
  }

  myChart.data.labels = labels;
  myChart.data.datasets[0].data = dataPoints;
  myChart.update();
}

// أزرار التحكم بالرسم البياني
document.getElementById('prevMonthBtn').addEventListener('click', () => {
  chartViewDate.setMonth(chartViewDate.getMonth() - 1);
  updateChart();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
  chartViewDate.setMonth(chartViewDate.getMonth() + 1);
  updateChart();
});


function updateSavedTimes() {
  savedTimesDiv.innerHTML = ''; 
  savedOrder.forEach(field => {
    const div = document.createElement('div');
    div.classList.add('task-item');
    div.setAttribute('draggable', 'true');
    div.setAttribute('data-topic', field);
    div.innerHTML = `<span>> ${field}</span> <span>${formatTime(savedTimes[field])}</span>`;
    
    div.addEventListener('dragstart', () => { div.classList.add('dragging'); });
    div.addEventListener('dragend', () => { div.classList.remove('dragging'); updateOrderFromDOM(); });

    savedTimesDiv.appendChild(div);
  });
  
  document.getElementById('grandTotal').textContent = formatTime(globalTotal);
  checkDailyReset();
  updateChart();
}

function updateOrderFromDOM() {
    const items = savedTimesDiv.querySelectorAll('.task-item');
    savedOrder = [];
    items.forEach(item => {
        savedOrder.push(item.getAttribute('data-topic'));
    });
    saveData();
    updateSelect();
    updateChart();
}

savedTimesDiv.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(savedTimesDiv, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
        savedTimesDiv.appendChild(draggable);
    } else {
        savedTimesDiv.insertBefore(draggable, afterElement);
    }
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

syncOrder();
checkDailyReset();
initChart();
updateSelect();
updateSavedTimes();

document.getElementById('addTopicBtn').addEventListener('click', () => {
  const topic = newTopicInput.value.trim();
  if (topic && !savedTimes[topic] && !topic.includes('RESET')) {
    savedTimes[topic] = 0;
    savedOrder.push(topic);
    saveData();
    updateSelect();
    updateSavedTimes();
    newTopicInput.value = '';
  }
});

document.getElementById('removeTopicBtn').addEventListener('click', () => {
  const topic = fieldSelect.value;
  if (topic.includes('RESET') || topic.includes('──')) return;
  if (topic) {
    delete savedTimes[topic];
    savedOrder = savedOrder.filter(t => t !== topic);
    saveData();
    updateSelect();
    updateSavedTimes();
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  const field = fieldSelect.value;
  if(field.includes('RESET') || field.includes('──')) return;

  if (!timer) {
    checkDailyReset(); 
    statusIndicator.textContent = "RUNNING...";
    statusIndicator.style.color = "#00ff00";
    isPaused = false;
    
    // حساب وقت البداية بناء على الثواني المتراكمة حاليا
    startTime = Date.now() - (seconds * 1000);
    
    timer = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      seconds = Math.floor(diff / 1000);
      display.textContent = formatTime(seconds);
    }, 1000);
  }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    isPaused = true;
    statusIndicator.textContent = "SUSPENDED";
    statusIndicator.style.color = "#ffa500";
  }
});

document.getElementById('stopBtn').addEventListener('click', () => {
  if (timer || isPaused) {
    clearInterval(timer);
    timer = null;
    isPaused = false;
    statusIndicator.textContent = "HALTED";
    statusIndicator.style.color = "#ff0000";

    const field = fieldSelect.value;
    if (field && !field.includes('RESET')) {
      savedTimes[field] += seconds;
      globalTotal += seconds;
      dailyData.total += seconds;
      
      const todayKey = new Date().toDateString();
      if (!studyHistory[todayKey]) studyHistory[todayKey] = 0;
      studyHistory[todayKey] += seconds;

      saveData();
      updateSavedTimes();
    }
    seconds = 0;
    display.textContent = "00:00:00";
  }
});

document.getElementById('resetBtn').addEventListener('click', () => {
  const field = fieldSelect.value;
  if (field === 'TOTAL_FOCUS_ALL') {
    globalTotal = 0;
  } else if (field === 'DAILY_FOCUS_RESET') {
    dailyData.total = 0;
  } else if (field && !field.includes('──')) {
    savedTimes[field] = 0;
  }
  saveData();
  updateSavedTimes();
});