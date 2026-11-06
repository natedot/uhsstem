// Leaders Hub form (only loaded on leaders.html).
// Requests go straight to the Apps Script web app (apps-script/Code.gs → doPost) without any Google
// sign-in attached, so the Google account a device is signed into can't block the form.

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysDq5um3VDU4LjH4Bnhhw3-myMZpQP-RjdVgUwbBjKF1cj2Ygu3Jdu3scMWyQJ2uEZ/exec';

// Schools shown in both dropdowns. The value must match the school's tab name in the sheet exactly.
const SCHOOLS = [
    ['Sifton', 'Sifton'],
    ['Emerald', 'Emerald'],
    ['Mill Plain k-2 ', 'Mill Plain K-2'],
    ['Mill Plain 3-5', 'Mill Plain 3-5'],
    ['CV', 'CV'],
    ['Pioneer', 'Pioneer'],
    ['Harmony 3-5', 'Harmony 3-5'],
    ['Har K-2', 'Har K-2'],
    ['Illahee Orr', 'Illahee Orr'],
    ['Illahee Boehi', 'Illahee Boehi'],
    ['Burnt Bridge Creek', 'Burnt Bridge Creek'],
    ['Spanish STEM', 'Spanish STEM']
];

let leaderPassword = ''; // Sent with every submission so the server can re-check it
const $ = id => document.getElementById(id);
const experimentsContainer = $('experimentsContainer');
const namesList = $('namesList');

// Sends { action, payload } to the script and returns its result.
// No custom headers and credentials: 'omit', so the browser sends it as a plain anonymous request.
async function callScript(action, payload) {
    let response;
    try {
        response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action, payload }), credentials: 'omit' });
    } catch (err) {
        throw new Error('Could not reach the spreadsheet. Check your internet connection and try again.');
    }
    if (!response.ok) throw new Error(`The spreadsheet server returned an error (${response.status}). Please try again.`);
    return (await response.json()).result;
}

function clone(id) {
    return $(id).content.firstElementChild.cloneNode(true);
}

function setStatus(el, ok, message) {
    el.className = 'status ' + (ok ? 'ok' : 'err');
    el.textContent = message;
}

// Disables a submit button while a request is running, then restores its label
async function busy(btn, task) {
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Processing...';
    try { return await task(); } finally { btn.disabled = false; btn.textContent = label; }
}

// Shows exactly what was sent, so the leader can double-check it. `items` is a list of [heading, [detail lines]].
function showSummary(box, title, items) {
    box.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = title;
    const list = document.createElement('ul');
    items.forEach(([heading, lines]) => {
        const li = document.createElement('li');
        li.textContent = heading;
        const sub = document.createElement('ul');
        lines.forEach(line => {
            const subLi = document.createElement('li');
            subLi.textContent = line;
            sub.appendChild(subLi);
        });
        li.appendChild(sub);
        list.appendChild(li);
    });
    box.append(h, list);
    box.hidden = false;
}

// --- Unlock screen ---
$('lockScreen').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = $('pwInput').value;
    const lockStatus = $('lockStatus');
    lockStatus.textContent = '';
    try {
        const ok = await busy($('unlockBtn'), () => callScript('verifyPassword', pw));
        if (ok === true) {
            leaderPassword = pw;
            $('lockScreen').hidden = true;
            $('hub').hidden = false;
        } else {
            setStatus(lockStatus, false, typeof ok === 'string' ? ok : 'Incorrect password.');
            $('pwInput').select();
        }
    } catch (err) {
        setStatus(lockStatus, false, err.message);
    }
});

// --- Tabs ---
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => {
            const selected = t === tab;
            t.setAttribute('aria-selected', selected);
            $(t.dataset.panel).hidden = !selected;
        });
    });
});

// --- Materials request ---
function addMaterial(card) {
    card.querySelector('.materials-list').appendChild(clone('materialTemplate'));
}

function addExperiment() {
    const card = clone('experimentTemplate');
    addMaterial(card);
    experimentsContainer.appendChild(card);
}

$('addExpBtn').addEventListener('click', addExperiment);

// One listener handles every card's add/remove buttons
experimentsContainer.addEventListener('click', e => {
    const action = e.target.dataset.action;
    const card = e.target.closest('.experiment-card');
    if (action === 'add-material') {
        addMaterial(card);
    } else if (action === 'remove-row') {
        if (card.querySelectorAll('.material-row').length > 1) e.target.parentElement.remove();
        else alert('Each experiment needs at least one material!');
    } else if (action === 'remove-card') {
        if (experimentsContainer.children.length > 1) card.remove();
        else alert('You must request materials for at least one experiment!');
    }
});

// Enter never submits by accident: in an experiment name it jumps to the first material,
// in a material row it adds a new row
$('requestForm').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    const card = e.target.closest('.experiment-card');
    if (!card) return;
    if (e.target.classList.contains('exp-name')) {
        card.querySelector('.mat-name').focus();
    } else {
        addMaterial(card);
        const names = card.querySelectorAll('.mat-name');
        names[names.length - 1].focus();
    }
});

$('requestForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const status = $('status');
    $('summary').hidden = true;

    const payload = {
        schoolName: form.schoolName.value,
        password: leaderPassword,
        experiments: Array.from(experimentsContainer.children, card => ({
            name: card.querySelector('.exp-name').value,
            materials: Array.from(card.querySelectorAll('.material-row'), row => ({
                name: row.querySelector('.mat-name').value,
                qty: row.querySelector('.mat-qty').value,
                notes: row.querySelector('.mat-notes').value
            }))
        }))
    };

    try {
        const res = await busy($('submitBtn'), () => callScript('processForm', payload));
        if (res !== 'Success') return setStatus(status, false, res);
        setStatus(status, true, 'Success! Data sorted into the spreadsheet.');
        showSummary($('summary'), `Submitted for ${payload.schoolName}:`, payload.experiments.map(exp => [
            exp.name,
            exp.materials.filter(m => m.name.trim()).map(m => `${m.name} — ${m.qty}` + (m.notes ? ` (${m.notes})` : ''))
        ]));
        // Start fresh: clear the school and go back to one empty experiment
        form.reset();
        experimentsContainer.innerHTML = '';
        addExperiment();
    } catch (err) {
        setStatus(status, false, err.message);
    }
});

// --- Feedback / attendance ---
function addName() {
    const row = clone('nameTemplate');
    namesList.appendChild(row);
    return row.querySelector('input');
}

function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resetFeedbackForm() {
    $('feedbackForm').reset();
    $('fbDate').value = todayString();
    namesList.innerHTML = '';
    addName();
}

$('addNameBtn').addEventListener('click', () => addName().focus());

namesList.addEventListener('click', e => {
    if (e.target.dataset.action !== 'remove-name') return;
    if (namesList.children.length > 1) e.target.parentElement.remove();
    else alert('Please list at least one person!');
});

// Enter in a name box adds the next person instead of submitting
$('feedbackForm').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    if (e.target.classList.contains('person-name')) addName().focus();
});

$('feedbackForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const status = $('fbStatus');
    $('fbSummary').hidden = true;

    const payload = {
        password: leaderPassword,
        schoolName: form.schoolName.value,
        sessionDate: form.sessionDate.value,
        attendees: Array.from(namesList.querySelectorAll('.person-name'), i => i.value),
        wentWell: form.wentWell.value,
        didntGoWell: form.didntGoWell.value,
        improve: form.improve.value
    };

    try {
        const res = await busy($('fbSubmitBtn'), () => callScript('submitFeedback', payload));
        if (res !== 'Success') return setStatus(status, false, res);
        setStatus(status, true, 'Thank you! Feedback saved to the spreadsheet.');
        const names = payload.attendees.filter(n => n.trim());
        showSummary($('fbSummary'), `Feedback for ${payload.schoolName} (${payload.sessionDate}):`, [
            [`Attendance (${names.length})`, names],
            ['What went well', [payload.wentWell]],
            ["What didn't go well", [payload.didntGoWell]],
            ['How can we improve', [payload.improve]]
        ]);
        resetFeedbackForm();
    } catch (err) {
        setStatus(status, false, err.message);
    }
});

// --- Start-up ---
document.querySelectorAll('.school-select').forEach(select => {
    select.innerHTML = '<option value="" disabled selected>Select a location...</option>';
    SCHOOLS.forEach(([value, label]) => select.add(new Option(label, value)));
});
resetFeedbackForm();
addExperiment(); // Start with one experiment card
