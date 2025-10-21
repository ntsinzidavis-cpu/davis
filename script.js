// Client-side image upload + preview
(function () {
  const fileInput = document.getElementById('image-file');
  const preview = document.getElementById('image-preview');
  const uploadBtn = document.getElementById('upload-btn');
  const progressWrap = document.querySelector('.progress-wrap');
  const progress = document.getElementById('upload-progress');
  const status = document.getElementById('upload-status');

  if (!fileInput) return; // nothing to do on non-upload pages

  let selectedFile = null;

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      preview.style.display = 'none';
      uploadBtn.disabled = true;
      return;
    }

    if (!f.type.startsWith('image/')) {
      alert('Please select an image file.');
      fileInput.value = '';
      return;
    }

    selectedFile = f;
    const url = URL.createObjectURL(f);
    preview.src = url;
    preview.style.display = 'block';
    uploadBtn.disabled = false;
  });

  uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    uploadBtn.disabled = true;
    progressWrap.style.display = 'block';
    status.textContent = 'Starting...';

    const form = new FormData();
    form.append('image', selectedFile);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-image', true);

      xhr.upload.addEventListener('progress', (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          progress.value = pct;
          status.textContent = pct + '%';
        }
      });

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            status.textContent = 'Upload complete';
            const res = JSON.parse(xhr.responseText || '{}');
            if (res.url) {
              // show uploaded image URL or set it on a student card; for demo we'll just update preview src
              preview.src = res.url;
            }
          } else {
            status.textContent = 'Upload failed: ' + xhr.status;
            uploadBtn.disabled = false;
          }
        }
      };

      xhr.send(form);
    } catch (err) {
      console.error(err);
      status.textContent = 'Error uploading';
      uploadBtn.disabled = false;
    }
  });
})();

// Client-side search for student profiles
(function () {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const form = document.getElementById('search-form');
  if (!input) return;

  // Build index from profile cards
  const cards = Array.from(document.querySelectorAll('.profile-card'));
  const index = cards.map(card => {
    const nameEl = card.querySelector('h3');
    const name = nameEl ? nameEl.textContent.trim() : '';
    const classEl = card.querySelector('.student-class');
    const className = classEl ? classEl.textContent.trim() : '';
    const text = card.textContent.replace(/\s+/g, ' ').toLowerCase();
    return { card, name, className, text };
  });

  let open = false;

  function clearResults() {
    results.innerHTML = '';
    results.style.display = 'none';
    open = false;
  }

  function showResults(list) {
    results.innerHTML = '';
    if (!list.length) {
      results.style.display = 'none';
      open = false;
      return;
    }
    list.slice(0, 8).forEach(item => {
      const div = document.createElement('div');
      div.className = 'search-item';
      div.tabIndex = 0;
      div.textContent = item.name;
      div.addEventListener('click', () => selectProfile(item));
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') selectProfile(item);
      });
      results.appendChild(div);
    });
    results.style.display = 'block';
    open = true;
  }

  function selectProfile(item) {
    clearResults();
    input.value = item.name;
    // scroll to card and highlight
    item.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    item.card.classList.add('highlight');
    setTimeout(() => item.card.classList.remove('highlight'), 2500);
  }

  input.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return clearResults();
    const matches = index.filter(it => it.name.toLowerCase().includes(q) || it.text.includes(q));
    showResults(matches);
  });

  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) clearResults();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    const first = index.find(it => it.name.toLowerCase().includes(q) || it.text.includes(q));
    if (first) selectProfile(first);
  });
})();

// Top achiever computation
(function () {
  const topEl = document.getElementById('top-achiever');
  if (!topEl) return;
  const content = topEl.querySelector('.top-content');
  const refreshBtn = document.getElementById('top-refresh');

  function computeTop() {
    const cards = Array.from(document.querySelectorAll('.profile-card'));
    if (!cards.length) {
      content.innerHTML = 'No profiles available.';
      return;
    }

    let best = null;
    let bestCount = -1;

    cards.forEach(card => {
      const nameEl = card.querySelector('h3');
      const name = nameEl ? nameEl.textContent.trim() : 'Unnamed';
      const achievements = card.querySelectorAll('ul > li');
      const count = achievements ? achievements.length : 0;
      if (count > bestCount) {
        bestCount = count;
        best = { name, count, card };
      }
    });

    if (!best) {
      content.innerHTML = 'No achievements found.';
      return;
    }

  const classInfo = best.card.querySelector('.student-class');
  const classText = classInfo ? ` - ${classInfo.textContent}` : '';
  content.innerHTML = `<strong>${best.name}</strong>${classText} — ${best.count} achievement${best.count === 1 ? '' : 's'}`;
    // Add a quick action to jump to the profile
    const goto = document.createElement('button');
    goto.textContent = 'View Profile';
    goto.addEventListener('click', () => {
      best.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      best.card.classList.add('highlight');
      setTimeout(() => best.card.classList.remove('highlight'), 2500);
    });
    // clear old button(s)
    const prev = content.querySelector('button');
    if (prev) prev.remove();
    content.appendChild(goto);
  }

  computeTop();
  refreshBtn && refreshBtn.addEventListener('click', computeTop);
})();

// Sports management (client-side, persisted in localStorage)
(function () {
  const SPORTS = ['football', 'volleyball', 'basketball', 'swimming'];
  const storageKey = 'kda_sports_players_v1';

  const form = document.getElementById('add-player-form');
  const nameInput = document.getElementById('player-name');
  const classInput = document.getElementById('player-class');
  const sportSelect = document.getElementById('player-sport');
  const listsWrap = document.getElementById('sports-lists');
  const bestContent = document.getElementById('best-class-content');
  const bestRefresh = document.getElementById('best-refresh');

  if (!form || !listsWrap) return;

  function loadPlayers() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse players', e);
      return [];
    }
  }

  function savePlayers(players) {
    localStorage.setItem(storageKey, JSON.stringify(players));
  }

  function renderLists() {
    const players = loadPlayers();
    listsWrap.innerHTML = '';
    SPORTS.forEach(s => {
      const box = document.createElement('div');
      box.className = 'sport-box';
      const title = document.createElement('h4');
      title.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      box.appendChild(title);
      const ul = document.createElement('ul');
      const forSport = players.filter(p => p.sport === s);
      forSport.forEach((p, idx) => {
        const li = document.createElement('li');
        li.textContent = `${p.name} — ${p.className}`;
        const rm = document.createElement('button');
        rm.textContent = 'Remove';
        rm.className = 'small-btn';
        rm.addEventListener('click', () => {
          removePlayer(p.id);
        });
        li.appendChild(rm);
        ul.appendChild(li);
      });
      if (!forSport.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No players yet';
        box.appendChild(empty);
      } else {
        box.appendChild(ul);
      }
      listsWrap.appendChild(box);
    });
    updateBestClass();
  }

  function addPlayer(name, className, sport) {
    const players = loadPlayers();
    const id = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    players.push({ id, name, className, sport });
    savePlayers(players);
    renderLists();
  }

  function removePlayer(id) {
    let players = loadPlayers();
    players = players.filter(p => p.id !== id);
    savePlayers(players);
    renderLists();
  }

  function updateBestClass() {
    const players = loadPlayers();
    if (!players.length) {
      bestContent.textContent = 'No players registered.';
      return;
    }
    // Count players per class
    const counts = {};
    players.forEach(p => {
      counts[p.className] = (counts[p.className] || 0) + 1;
    });
    let best = null;
    let bestCount = -1;
    for (const cls in counts) {
      if (counts[cls] > bestCount) {
        best = cls; bestCount = counts[cls];
      }
    }
    bestContent.textContent = `${best} — ${bestCount} player${bestCount === 1 ? '' : 's'}`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const className = classInput.value.trim();
    const sport = sportSelect.value;
    if (!name || !className || !sport) return;
    addPlayer(name, className, sport);
    nameInput.value = '';
    classInput.value = '';
    sportSelect.selectedIndex = 0;
  });

  bestRefresh && bestRefresh.addEventListener('click', updateBestClass);

  // initial render
  renderLists();
})();

// Academics: track student scores and compute top performers and class averages
(function () {
  const studentsSelect = document.getElementById('score-student');
  const scoreForm = document.getElementById('score-form');
  const scoreClassInput = document.getElementById('score-class');
  const scoreValueInput = document.getElementById('score-value');
  const topList = document.getElementById('top-performers');
  const classAveragesList = document.getElementById('class-averages');
  const classBestList = document.getElementById('class-best-scorers');

  if (!scoreForm) return;

  const SCORE_KEY = 'kda_academics_scores_v1';

  function loadScores() {
    try { return JSON.parse(localStorage.getItem(SCORE_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveScores(list) { localStorage.setItem(SCORE_KEY, JSON.stringify(list)); }

  // Populate student selector from profile cards (works for <select> or leaves <input> alone)
  function populateStudents() {
    const cards = Array.from(document.querySelectorAll('.profile-card'));
    if (!studentsSelect) return;
    if (studentsSelect.tagName === 'SELECT') {
      studentsSelect.innerHTML = '';
      // add a blank option first
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '-- select student --';
      studentsSelect.appendChild(blank);
      cards.forEach(card => {
        const name = (card.querySelector('h3') || {}).textContent || '';
        if (!name) return;
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        studentsSelect.appendChild(option);
      });
    } else {
      // input: nothing to populate; keep free-text entry
    }
  }

  function renderAcademics() {
    const scores = loadScores();
    // Top performers (average score)
    const map = {};
    scores.forEach(s => {
      if (!map[s.student]) map[s.student] = [];
      map[s.student].push(s.score);
    });
    const averages = Object.keys(map).map(name => {
      const arr = map[name];
      const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
      return { name, avg };
    }).sort((a,b)=>b.avg - a.avg);

    topList.innerHTML = '';
    averages.slice(0,10).forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} — ${p.avg.toFixed(2)}`;
      topList.appendChild(li);
    });

    // Class averages
    const classMap = {};
    scores.forEach(s => {
      classMap[s.className] = classMap[s.className] || [];
      classMap[s.className].push(s.score);
    });
    classAveragesList.innerHTML = '';
    Object.keys(classMap).forEach(cls => {
      const arr = classMap[cls];
      const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
      const li = document.createElement('li');
      li.textContent = `${cls}: ${avg.toFixed(2)}`;
      classAveragesList.appendChild(li);
    });

    // Best scorer per class (highest average within that class)
    if (classBestList) {
      classBestList.innerHTML = '';
      // Build per-class per-student score lists
      const classStudentMap = {};
      scores.forEach(s => {
        classStudentMap[s.className] = classStudentMap[s.className] || {};
        classStudentMap[s.className][s.student] = classStudentMap[s.className][s.student] || [];
        classStudentMap[s.className][s.student].push(s.score);
      });
      const classes = Object.keys(classStudentMap);
      if (!classes.length) {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = 'No scores yet.';
        classBestList.appendChild(li);
      } else {
        classes.forEach(cls => {
          const students = classStudentMap[cls];
          let bestStudent = null;
          let bestAvg = -Infinity;
          Object.keys(students).forEach(st => {
            const arr = students[st];
            const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
            if (avg > bestAvg) {
              bestAvg = avg; bestStudent = st;
            }
          });
          const li = document.createElement('li');
          if (bestStudent === null) {
            li.textContent = `${cls}: —`;
          } else {
            li.textContent = `${cls}: ${bestStudent} — ${bestAvg.toFixed(2)}`;
          }
          classBestList.appendChild(li);
        });
      }
    }
  }

  scoreForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const student = studentsSelect.value;
    const className = scoreClassInput.value.trim();
    const score = parseFloat(scoreValueInput.value);
    if (!student || !className || Number.isNaN(score)) return;
    const scores = loadScores();
    scores.push({ student, className, score, ts: Date.now() });
    saveScores(scores);
    scoreValueInput.value = '';
    renderAcademics();
  });

  populateStudents();
  renderAcademics();
})();

// Profile photo management (per-profile, localStorage-backed)
(function () {
  const KEY = 'kda_profile_photos_v1';
  function loadMap() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveMap(m) { localStorage.setItem(KEY, JSON.stringify(m)); }

  const cards = Array.from(document.querySelectorAll('.profile-card'));
  if (!cards.length) return;
  const map = loadMap();

  cards.forEach(card => {
    const nameEl = card.querySelector('h3');
    const name = nameEl ? nameEl.textContent.trim() : '';
    const imgEl = card.querySelector('img');
    const profileLink = card.querySelector('a[href]');
    // prefer a stable key: profile href if present, otherwise student name
    const key = profileLink ? profileLink.getAttribute('href') : (name || ('profile-' + Array.from(cards).indexOf(card)));
    // preserve original src as fallback
    const originalSrc = imgEl ? imgEl.getAttribute('src') : '';

    // create controls container
    const controls = document.createElement('div');
    controls.className = 'photo-controls';
    controls.style.marginTop = '8px';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '8px';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.padding = '4px';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save Photo';
    saveBtn.style.padding = '6px 8px';
    saveBtn.style.borderRadius = '6px';
    saveBtn.style.background = '#0a74da';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.style.padding = '6px 8px';
    removeBtn.style.borderRadius = '6px';
    removeBtn.style.background = '#eee';
    removeBtn.style.border = '1px solid #ccc';

    const preview = document.createElement('img');
    preview.style.width = '48px';
    preview.style.height = '48px';
    preview.style.objectFit = 'cover';
    preview.style.borderRadius = '6px';
    preview.style.display = 'none';

    controls.appendChild(fileInput);
    controls.appendChild(saveBtn);
    controls.appendChild(removeBtn);
    controls.appendChild(preview);
    card.appendChild(controls);

    // If a stored photo exists, use it
    if (map[key] && imgEl) {
      imgEl.src = map[key];
    }

    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) {
        preview.style.display = 'none';
        return;
      }
      preview.src = URL.createObjectURL(f);
      preview.style.display = 'block';
    });

    saveBtn.addEventListener('click', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) {
        alert('Please select a photo first');
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        const data = ev.target.result;
        map[key] = data;
        saveMap(map);
        if (imgEl) imgEl.src = data;
        // cleanup preview and input
        preview.style.display = 'none';
        try { fileInput.value = ''; } catch (e) {}
      };
      reader.readAsDataURL(f);
    });

    removeBtn.addEventListener('click', () => {
      if (!map[key]) {
        // nothing to remove
        if (imgEl) imgEl.src = originalSrc || '';
        return;
      }
      if (!confirm('Remove saved photo for this student?')) return;
      delete map[key];
      saveMap(map);
      if (imgEl) imgEl.src = originalSrc || '';
    });
  });
})();

// Site logo management (local only)
(function () {
  const KEY = 'kda_site_logo_v1';
  const file = document.getElementById('logo-file');
  const saveBtn = document.getElementById('logo-save');
  const removeBtn = document.getElementById('logo-remove');
  const preview = document.getElementById('logo-preview');
  if (!file || !saveBtn || !removeBtn) return;

  function load() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(dataUrl) { localStorage.setItem(KEY, dataUrl); }
  function removeSite() { localStorage.removeItem(KEY); }

  function applyLogo(dataUrl) {
    const els = Array.from(document.querySelectorAll('.site-logo'));
    els.forEach(el => {
      if (dataUrl) el.src = dataUrl;
      else {
        // if no dataUrl, try to restore original from data-orig attribute or leave as-is
        const orig = el.getAttribute('data-orig-src');
        if (orig) el.src = orig;
      }
    });
  }

  // set data-orig-src on existing logos so we can restore
  document.querySelectorAll('.site-logo').forEach(el => {
    if (!el.getAttribute('data-orig-src')) el.setAttribute('data-orig-src', el.getAttribute('src') || '');
  });

  // initialize from storage
  const saved = load();
  if (saved) {
    applyLogo(saved);
  }

  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) { preview.style.display = 'none'; saveBtn.disabled = true; return; }
    preview.src = URL.createObjectURL(f);
    preview.style.display = 'block';
    saveBtn.disabled = false;
  });

  saveBtn.addEventListener('click', () => {
    const f = file.files && file.files[0];
    if (!f) return alert('Select a logo file first');
    const reader = new FileReader();
    reader.onload = function (ev) {
      const data = ev.target.result;
      save(data);
      applyLogo(data);
      preview.style.display = 'none';
      try { file.value = ''; } catch (e) {}
      saveBtn.disabled = true;
    };
    reader.readAsDataURL(f);
  });

  removeBtn.addEventListener('click', () => {
    if (!confirm('Remove saved site logo and restore original?')) return;
    removeSite();
    applyLogo(null);
  });
})();

// Academics updates / announcements (local only)
(function () {
  const form = document.getElementById('update-form');
  const textarea = document.getElementById('update-text');
  const listEl = document.getElementById('updates-list');
  const clearBtn = document.getElementById('update-clear');
  if (!form || !textarea || !listEl) return;

  const KEY = 'kda_academics_updates_v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function save(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

  function render() {
    const items = load().slice().reverse(); // newest first
    listEl.innerHTML = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No updates yet.';
      listEl.appendChild(li);
      return;
    }
    items.forEach(it => {
      const li = document.createElement('li');
      li.style.border = '1px solid #eee';
      li.style.padding = '8px';
      li.style.borderRadius = '6px';
      const text = document.createElement('div');
      text.textContent = it.text;
      const meta = document.createElement('div');
      meta.style.fontSize = '12px';
      meta.style.color = '#666';
      meta.textContent = new Date(it.ts).toLocaleString();
      li.appendChild(text);
      li.appendChild(meta);
      listEl.appendChild(li);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = textarea.value.trim();
    if (!t) return;
    const items = load();
    items.push({ text: t, ts: Date.now() });
    save(items);
    textarea.value = '';
    render();
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all local updates? This cannot be undone.')) return;
    save([]);
    render();
  });

  // initial render
  render();
})();

// Function to handle adding a new student profile
function addNewStudentProfile(name, studentClass, achievementsText) {
    const profilesContainer = document.querySelector('.profiles');
    if (!profilesContainer) return;

    // Convert comma-separated string to an array of list items
    const achievementsArray = achievementsText.split(',').map(a => a.trim()).filter(a => a.length > 0);
    const achievementsList = achievementsArray.map(achievement => `<li>${achievement}</li>`).join('');

    // Create a unique, simple profile link (e.g., lowercase, hyphenated name)
    const profileSlug = name.toLowerCase().replace(/\s+/g, '-');
    
    // Create the new profile card element
    const newProfileCard = document.createElement('div');
    newProfileCard.classList.add('profile-card');
    
    // Set a placeholder image for the new student
    const placeholderImage = "student-placeholder.png"; // You may need to create this image or use a generic one

    newProfileCard.innerHTML = `
        <img src="${placeholderImage}" alt="Student Photo Placeholder">
        <h3>${name}</h3>
        <p class="student-class">${studentClass}</p>
        <p>Verified Successes:</p>
        <ul>
            ${achievementsList}
        </ul>
        <a href="profiles/${profileSlug}.html">View Permanent Profile</a>
    `;

    // Insert the new card at the beginning of the profiles list (or append, based on preference)
    profilesContainer.prepend(newProfileCard);
}

// Event listener for the "Add New Student" form
document.addEventListener('DOMContentLoaded', () => {
    const addStudentForm = document.getElementById('add-student-form');
    const addStudentMessage = document.getElementById('add-student-message');

    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Stop the form from submitting normally

            const name = document.getElementById('student-name').value.trim();
            const studentClass = document.getElementById('student-class').value.trim();
            const achievements = document.getElementById('student-achievements').value.trim();

            if (name && studentClass && achievements) {
                addNewStudentProfile(name, studentClass, achievements);
                
                // Provide user feedback and reset the form
                addStudentMessage.textContent = `✅ Successfully added profile for ${name}! (Note: This is temporary, as a real server is needed for permanent storage).`;
                addStudentForm.reset(); 
                
                // Clear the message after a few seconds
                setTimeout(() => {
                    addStudentMessage.textContent = '';
                }, 5000);

            } else {
                addStudentMessage.textContent = '❌ Please fill in all fields.';
            }
        });
    }
    // ... (Your existing script.js code follows here) ...
});
// Function to handle adding a new student profile
function addNewStudentProfile(name, studentClass, achievementsText, imageUrl) {
    const profilesContainer = document.querySelector('.profiles');
    if (!profilesContainer) return;

    // Convert comma-separated string to an array of list items
    const achievementsArray = achievementsText.split(',').map(a => a.trim()).filter(a => a.length > 0);
    const achievementsList = achievementsArray.map(achievement => `<li>${achievement}</li>`).join('');

    // Use the generated image URL or a placeholder if none was provided
    const studentImageUrl = imageUrl || "student-placeholder.png"; 
    
    // Create a unique, simple profile link (e.g., lowercase, hyphenated name)
    const profileSlug = name.toLowerCase().replace(/\s+/g, '-');
    
    // Create the new profile card element
    const newProfileCard = document.createElement('div');
    newProfileCard.classList.add('profile-card');
    
    newProfileCard.innerHTML = `
        <img src="${studentImageUrl}" alt="Student Photo for ${name}">
        <h3>${name}</h3>
        <p class="student-class">${studentClass}</p>
        <p>Verified Successes:</p>
        <ul>
            ${achievementsList}
        </ul>
        <a href="profiles/${profileSlug}.html">View Permanent Profile</a>
    `;

    // Insert the new card at the beginning of the profiles list
    profilesContainer.prepend(newProfileCard);
}

// Event listener for the "Add New Student" form
document.addEventListener('DOMContentLoaded', () => {
    const addStudentForm = document.getElementById('add-student-form');
    const addStudentMessage = document.getElementById('add-student-message');

    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Stop the form from submitting normally

            const name = document.getElementById('student-name').value.trim();
            const studentClass = document.getElementById('student-class').value.trim();
            const achievements = document.getElementById('student-achievements').value.trim();
            const photoInput = document.getElementById('student-photo');
            const file = photoInput.files[0]; // Get the selected file

            if (!name || !studentClass || !achievements) {
                addStudentMessage.textContent = '❌ Please fill in the required Name, Class, and Achievements fields.';
                return;
            }

            // Check if a file was selected
            if (file) {
                const reader = new FileReader();
                
                // This function runs once the file is fully loaded
                reader.onload = function(e) {
                    const imageUrl = e.target.result; // This is the Data URL for the image
                    
                    // Call the function to create and display the new card
                    addNewStudentProfile(name, studentClass, achievements, imageUrl);
                    
                    // Provide feedback and reset the form
                    addStudentMessage.textContent = `✅ Profile for ${name} added with photo!`;
                    addStudentForm.reset(); 
                    
                    setTimeout(() => {
                        addStudentMessage.textContent = '';
                    }, 5000);
                };
                
                // Read the file as a Data URL (Base64 encoded string)
                reader.readAsDataURL(file);

            } else {
                // If no file, add the profile using the default placeholder image
                addNewStudentProfile(name, studentClass, achievements, null);
                
                // Provide feedback and reset the form
                addStudentMessage.textContent = `✅ Profile for ${name} added (no photo selected).`;
                addStudentForm.reset(); 
                
                setTimeout(() => {
                    addStudentMessage.textContent = '';
                }, 5000);
            }
        });
    }
    // ... (Your other existing script.js code follows here) ...
});
// Inside the addNewStudentProfile function in script.js:
    newProfileCard.innerHTML = `
        <img src="${studentImageUrl}" alt="Student Photo for ${name}"> 
        <h3>${name}</h3>
        <p class="student-class">${studentClass}</p>
        `;
        document.addEventListener('DOMContentLoaded', () => {
    const photoInput = document.getElementById('student-photo');
    const photoPreview = document.getElementById('student-photo-preview');

    if (photoInput) {
        photoInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            
            if (file) {
                // Create a FileReader to read the file content
                const reader = new FileReader();

                // Set up the reader to run when the file is loaded
                reader.onload = function(e) {
                    // Set the image source to the result of the read operation
                    photoPreview.src = e.target.result;
                    // Make the image visible
                    photoPreview.style.display = 'block'; 
                };

                // Read the file as a Data URL (which is a base64 string)
                reader.readAsDataURL(file);
            } else {
                // If no file is selected (e.g., user cancels), hide the preview
                photoPreview.src = '';
                photoPreview.style.display = 'none';
            }
        });
    }
});
// =================================================================
// 🌟 NEW JAVASCRIPT FOR CLASS FILTERING 🌟
// (Add this to your existing script.js file)
// =================================================================

// 1. Storage for players (Must be defined globally or loaded from storage)
// This is a dummy array to show the logic. You'll need to integrate it 
// with your actual player storage/loading mechanism.
let players = [
    { name: "John Doe", class: "10A", sport: "football" },
    { name: "Jane Smith", class: "10A", sport: "volleyball" },
    { name: "Mike Johnson", class: "11B", sport: "basketball" },
    { name: "Anna Lee", class: "10A", sport: "swimming" },
    { name: "Sam Wilson", class: "9C", sport: "football" },
];

// Helper function to render a single list of players
function renderPlayerList(title, playersList, targetElementId) {
    const targetDiv = document.getElementById(targetElementId);
    if (!targetDiv) return;

    let html = `<h3>${title} (${playersList.length} players)</h3>`;
    
    // Group players by class for separation
    const playersByClass = playersList.reduce((acc, player) => {
        const playerClass = player.class.toUpperCase();
        if (!acc[playerClass]) {
            acc[playerClass] = [];
        }
        acc[playerClass].push(player);
        return acc;
    }, {});

    // Render HTML for each class group
    for (const className in playersByClass) {
        html += `
            <div style="border: 1px solid #ccc; padding: 10px; margin-top: 10px; border-radius: 4px;">
                <h4>CLASS: ${className}</h4>
                <ul style="list-style-type: none; padding-left: 0;">
        `;
        playersByClass[className].forEach(player => {
            html += `
                <li style="margin-bottom: 5px; background: #eee; padding: 5px; border-left: 3px solid #0a74da;">
                    ${player.name} (${player.sport})
                </li>
            `;
        });
        html += `
                </ul>
            </div>
        `;
    }
    
    targetDiv.innerHTML = html;
}

// Function to filter players and render the filtered list
function filterAndRenderPlayersByClass(targetClass) {
    const filteredListsDiv = document.getElementById('class-filtered-lists');
    
    // Clear previous results
    filteredListsDiv.innerHTML = '';
    
    if (!targetClass) {
        filteredListsDiv.innerHTML = '<p>Please enter a class to filter.</p>';
        return;
    }

    const normalizedTargetClass = targetClass.toUpperCase().trim();
    
    // 1. Filter: Players in the specified class
    const inClass = players.filter(p => p.class.toUpperCase() === normalizedTargetClass);
    
    // 2. Filter: Players NOT in the specified class
    const outOfClass = players.filter(p => p.class.toUpperCase() !== normalizedTargetClass);

    // Render the two separated groups
    if (inClass.length > 0) {
        renderPlayerList(`Players in Class: ${normalizedTargetClass}`, inClass, 'class-filtered-lists');
    } else {
        filteredListsDiv.innerHTML += `<p>No players found in Class: ${normalizedTargetClass}</p>`;
    }
    
    // Render the "Others" list in a separate container (or just append to the main one)
    if (outOfClass.length > 0) {
        // Create a temporary div to render the 'others' list
        const othersDiv = document.createElement('div');
        othersDiv.style.marginTop = '20px';
        filteredListsDiv.appendChild(othersDiv);
        
        renderPlayerList('Other Players (Not in ' + normalizedTargetClass + ')', outOfClass, othersDiv.id = 'others-list');
    }
}


// Event listeners for the new buttons
document.addEventListener('DOMContentLoaded', () => {
    const filterButton = document.getElementById('filter-class-button');
    const showAllButton = document.getElementById('show-all-button');
    const filterInput = document.getElementById('filter-class-input');
    
    // Initial rendering of all players (optional, if you want them visible by default)
    // renderPlayerList('All KDA Sports Players', players, 'sports-lists');


    if (filterButton) {
        filterButton.addEventListener('click', (e) => {
            e.preventDefault();
            const classValue = filterInput.value;
            filterAndRenderPlayersByClass(classValue);
        });
    }
    
    // Function to render all players (similar to the filter function but without filtering)
    if (showAllButton) {
        showAllButton.addEventListener('click', (e) => {
            e.preventDefault();
            const filteredListsDiv = document.getElementById('class-filtered-lists');
            filteredListsDiv.innerHTML = ''; // Clear the filtered area
            renderPlayerList('All KDA Sports Players (Grouped by Class)', players, 'class-filtered-lists');
        });
    }
});

// NOTE: You must also ensure that your player adding logic updates the 'players' array
// and re-runs the rendering functions for all lists to stay updated.