
function showToast(message, duration = 3000) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-message");

    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, duration);
}



document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('event-form');
  const eventList = document.getElementById('event-preview');
  const downloadBtn = document.getElementById('download-btn');
  const clearBtn = document.getElementById('clear-btn');
  const isSerial = document.getElementById('is-serial');
  const patternSection = document.getElementById('pattern-section');
  const patternType = document.getElementById('pattern-type');
  const linearOptions = document.getElementById('linear-options');

  const cal = ics();
  let events = [];

  const saveToLocalStorage = () => {
    localStorage.setItem('relationshipEvents', JSON.stringify(events));
  };

  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem('relationshipEvents');
    if (stored) {
      events = JSON.parse(stored);
      updatePreview();
    showToast('Event added successfully!');
    showToast("💖 Event added!");
    }
  };

  const updatePreview = () => {
    eventList.innerHTML = '';
    if (events.length === 0) {
      eventList.innerHTML = '<p class="text-center text-gray-500">No events added yet.</p>';
      return;
    }

    events.forEach((event, index) => {
      const endInfo = event.pattern === 'linear' && event.until ? ` until ${event.until}` : '';
      const label = event.pattern === 'exponential' ? 'exponential' : event.pattern === 'linear' ? 'linear' : 'single';
      const el = document.createElement('div');
      el.className = 'flex justify-between items-center bg-[#f2e2cd] p-3 mb-2 rounded-xl shadow';
      el.innerHTML = `
        <span>${event.title} (${label}${endInfo})</span>
        <button data-index="\${index}" class="remove-btn text-red-600 font-bold">✕</button>
      `;
      eventList.appendChild(el);
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        events.splice(index, 1);
        saveToLocalStorage();
        updatePreview();
    showToast('Event added successfully!');
    showToast("💖 Event added!");
      });
    });
  };

  const generateEventInstances = (entry) => {
    const output = [];
    const baseDate = new Date(entry.start);
    const interval = parseInt(entry.interval || 0);
    const endDate = entry.until ? new Date(entry.until) : null;

    if (entry.pattern === 'linear') {
      let current = new Date(baseDate);
      while (!endDate || current <= endDate) {
        const end = new Date(current);
        end.setHours(end.getHours() + 1);
        output.push({
          title: entry.title,
          description: entry.description,
          location: entry.location,
          start: current.toISOString(),
          end: end.toISOString()
        });
        current.setDate(current.getDate() + interval);
      }
    } else if (entry.pattern === 'exponential') {
      const pattern = [
        { times: 4, interval: 7 },
        { times: 8, interval: 30 },
        { times: 3, interval: 365 }
      ];
      let current = new Date(baseDate);
      for (const step of pattern) {
        for (let i = 0; i < step.times; i++) {
          const evStart = new Date(current);
          const evEnd = new Date(evStart);
          evEnd.setHours(evEnd.getHours() + 1);
          output.push({
            title: entry.title,
            description: entry.description,
            location: entry.location,
            start: evStart.toISOString(),
            end: evEnd.toISOString()
          });
          current.setDate(current.getDate() + step.interval);
        }
      }
    } else {
      const end = new Date(baseDate);
      end.setHours(end.getHours() + 1);
      output.push({
        title: entry.title,
        description: entry.description,
        location: entry.location,
        start: baseDate.toISOString(),
        end: end.toISOString()
      });
    }

    return output;
  };

  isSerial.addEventListener('change', () => {
    patternSection.classList.toggle('hidden', !isSerial.checked);
  });

  patternType.addEventListener('change', () => {
    const isLinear = patternType.value === 'linear';
    linearOptions.classList.toggle('hidden', !isLinear);
    linearOptions.classList.toggle('hidden', patternType.value !== 'linear');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const start = document.getElementById('start-date').value;
    let title = document.getElementById('custom-event').value.trim();
    const pattern = isSerial.checked ? patternType.value : 'single';

    if (!title) {
      title = pattern === 'linear'
        ? '💞 Our Monthly Ritual'
        : pattern === 'exponential'
        ? '📈 Growing Together'
        : '💘 A Special Day';
    }

    const entry = {
      title,
      description: `Event: ${title}`,
      location: 'Somewhere nice',
      start,
      pattern
    };

    if (pattern === 'linear') {
      entry.interval = document.getElementById('linear-interval').value;
      entry.until = document.getElementById('linear-end').value;
    }

    events.push(entry);
    saveToLocalStorage();
    updatePreview();
    showToast('Event added successfully!');
    showToast("💖 Event added!");
    form.reset();
    patternSection.classList.add('hidden');
    linearOptions.classList.remove('hidden');
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all events?')) {
      events = [];
      localStorage.removeItem('relationshipEvents');
      updatePreview();
    showToast('Event added successfully!');
    showToast("💖 Event added!");
    }
  });

  downloadBtn.addEventListener('click', () => {
    events.forEach(entry => {
      const instances = generateEventInstances(entry);
      instances.forEach(ev => {
        const format = (dateStr) => {
          const date = new Date(dateStr);
          const y = date.getFullYear();
          const m = ('0' + (date.getMonth() + 1)).slice(-2);
          const d = ('0' + date.getDate()).slice(-2);
          const h = ('0' + date.getHours()).slice(-2);
          const min = ('0' + date.getMinutes()).slice(-2);
          return `${y}-${m}-${d} ${h}:${min}`;
        };
        cal.addEvent(ev.title, ev.description, ev.location, format(ev.start), format(ev.end));
      });
    });
    cal.download('Relationship_Calendar');
  });

  loadFromLocalStorage();
});
