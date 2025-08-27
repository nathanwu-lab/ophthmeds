const state = {
  meds: [],
  selected: null,
  treatmentPlan: []
};

// Fallback data so the app works even when opened directly via file://
const DEFAULT_MEDS = [
  {
    name: 'Amoxicillin 500 mg',
    image: 'images/amoxicillin-500.png',
    aliases: ['Amox 500', 'Amoxicillin']
  },
  {
    name: 'Ibuprofen 200 mg',
    image: 'images/ibuprofen-200.png',
    aliases: ['Advil 200', 'Motrin 200', 'Ibuprofen']
  },
  {
    name: 'Metformin 500 mg',
    image: 'images/metformin-500.png',
    aliases: ['Glucophage 500', 'Metformin']
  }
];

const $ = (sel) => document.querySelector(sel);

function setToday() {
  const todayEl = $('#today');
  if (todayEl) {
    const d = new Date();
    todayEl.textContent = d.toLocaleDateString();
  }
}

async function loadMedications() {
  // Try to load from data/medications.json; if that fails (e.g., file:// CORS), fallback to DEFAULT_MEDS
  try {
    const res = await fetch('data/medications.json?_=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const list = await res.json();
    applyMedications(list);
  } catch (err) {
    console.warn('Using built-in medication list fallback. To customize, edit data/medications.json.', err);
    applyMedications(DEFAULT_MEDS);
  }
}

function applyMedications(list) {
  state.meds = Array.isArray(list) ? list : [];
  const dl = $('#medications');
  if (dl) {
    dl.innerHTML = '';
    state.meds.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.name;
      dl.appendChild(opt);
    });
  }
}

function findMedByName(name) {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  return (
    state.meds.find(
      (m) =>
        m.name.toLowerCase() === needle ||
        (m.aliases || []).some((a) => a.toLowerCase() === needle)
    ) || null
  );
}

function updateSelection(med) {
  state.selected = med;
  // Controls - add null checks to prevent errors
  const medNameEl = $('#medName');
  const medImageEl = $('#medImage');
  
  if (medNameEl) {
    medNameEl.textContent = med ? med.name : '';
  }
  
  if (medImageEl) {
    medImageEl.src = med && med.image ? med.image : '';
    medImageEl.alt = med ? med.name : 'Medication image';
  }
}

function addMedicationToPlan() {
  console.log('addMedicationToPlan called');
  console.log('state.selected:', state.selected);
  
  if (!state.selected) {
    console.log('No medication selected, showing alert');
    alert('Please select a medication first.');
    return;
  }

  const directions = $('#directions').value.trim();
  const instructions = $('#instructions').value.trim();
  const notes = $('#notes').value.trim();
  
  console.log('Form values:', { directions, instructions, notes });

  if (!directions && !instructions && !notes) {
    console.log('No form data, showing alert');
    alert('Please add at least directions, instructions, or notes before adding the medication.');
    return;
  }

  const medication = {
    id: Date.now(), // Simple unique ID
    name: state.selected.name,
    image: state.selected.image,
    directions: directions,
    instructions: instructions,
    notes: notes
  };
  
  console.log('Adding medication:', medication);

  state.treatmentPlan.push(medication);
  updateHandoutDisplay();
  clearMedicationForm();
  persist();
  
  console.log('Medication added successfully. Total in plan:', state.treatmentPlan.length);
}

function removeMedicationFromPlan(id) {
  state.treatmentPlan = state.treatmentPlan.filter(med => med.id !== id);
  updateHandoutDisplay();
  persist();
}

function updateTreatmentPlanDisplay() {
  const container = $('#medicationList');
  
  if (container) {
    if (state.treatmentPlan.length === 0) {
      container.innerHTML = '<div class="empty-state">No medications added yet. Select a medication above and click "Add Medication to Plan".</div>';
      return;
    }

    container.innerHTML = state.treatmentPlan.map(med => `
      <div class="med-card">
        <div class="med-card-header">
          <img src="${med.image}" alt="${med.name}" />
          <div class="med-card-name">${med.name}</div>
          <button class="remove-med" onclick="removeMedicationFromPlan(${med.id})" title="Remove">×</button>
        </div>
        <div class="med-card-content">
          ${med.directions ? `<div><strong>Directions:</strong> ${med.directions}</div>` : ''}
          ${med.instructions ? `<div><strong>Instructions:</strong> ${med.instructions}</div>` : ''}
          ${med.notes ? `<div><strong>Notes:</strong> ${med.notes}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
}

function updateHandoutDisplay() {
  const container = $('#handoutContent');
  
  if (state.treatmentPlan.length === 0) {
    container.innerHTML = '<div class="empty-handout"><p>Add medications to see your treatment plan here.</p></div>';
    return;
  }

  console.log('Updating handout display with', state.treatmentPlan.length, 'medications');
  
  container.innerHTML = state.treatmentPlan.map(med => `
    <div class="handout-medication">
      <div class="handout-header">
        <img src="${med.image}" alt="${med.name}" />
        <div class="handout-content-right">
          <div class="handout-med">${med.name}</div>
          
          ${med.directions ? `
            <div class="handout-block">
              <div class="block-title">Directions:</div>
              <div class="block-body">${med.directions}</div>
            </div>
          ` : ''}
          
          ${med.instructions ? `
            <div class="handout-block">
              <div class="block-title">Instructions:</div>
              <div class="block-body">${med.instructions}</div>
            </div>
          ` : ''}
          
          ${med.notes ? `
            <div class="handout-block">
              <div class="block-title">Notes:</div>
              <div class="block-body">${med.notes}</div>
            </div>
          ` : ''}
        </div>
        <button class="remove-med-handout" onclick="removeMedicationFromPlan(${med.id})" title="Remove" style="background: red; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; position: absolute; top: 8px; right: 8px; cursor: pointer; font-size: 18px; font-weight: bold; z-index: 1000;">×</button>
      </div>
    </div>
  `).join('');
  
  console.log('Handout HTML updated');
}

function clearMedicationForm() {
  const medSearchEl = $('#medSearch');
  const directionsEl = $('#directions');
  const instructionsEl = $('#instructions');
  const notesEl = $('#notes');

  if (medSearchEl) {
    medSearchEl.value = '';
  }
  if (directionsEl) {
    directionsEl.value = '';
  }
  if (instructionsEl) {
    instructionsEl.value = '';
  }
  if (notesEl) {
    notesEl.value = '';
  }
  updateSelection(null);
}

function clearAll() {
  state.treatmentPlan = [];
  updateHandoutDisplay();
  clearMedicationForm();
  try {
    localStorage.removeItem('handoutDraft');
  } catch {}
}

function persist() {
  const payload = {
    treatmentPlan: state.treatmentPlan
  };
  try {
    localStorage.setItem('handoutDraft', JSON.stringify(payload));
  } catch {}
}

function restore() {
  try {
    const raw = localStorage.getItem('handoutDraft');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.treatmentPlan && Array.isArray(d.treatmentPlan)) {
      state.treatmentPlan = d.treatmentPlan;
      updateHandoutDisplay();
    }
  } catch {}
}

function bind() {
  console.log('Binding events...');
  
  const medSearchEl = $('#medSearch');
  if (medSearchEl) {
    medSearchEl.addEventListener('change', (e) => {
      console.log('Medication search changed:', e.target.value);
      const med = findMedByName(e.target.value);
      updateSelection(med);
    });
  }
  
  const addBtn = $('#addMedBtn');
  console.log('Add button found:', addBtn);
  
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      console.log('Add button clicked!');
      addMedicationToPlan();
    });
  } else {
    console.error('Add button not found!');
  }
  
  const clearBtn = $('#clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAll);
  }

  const printBtn = $('#printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (state.treatmentPlan.length === 0) {
        if (!confirm('No medications in treatment plan. Print anyway?')) return;
      }
      window.print();
    });
  }
  
  console.log('Events bound successfully');
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, starting app...');
  setToday();
  bind();
  const medSearchEl = $('#medSearch');
  if (medSearchEl) {
    medSearchEl.focus();
  }
  await loadMedications();
  restore();
  console.log('App initialization complete');
});


