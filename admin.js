const state = window.HSIPAContent.load();
const statusElement = document.querySelector("#admin-status");
let statusTimer;

function makeId(value) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
}

function initials(value) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function save(message) {
  try {
    window.HSIPAContent.save(state);
    statusElement.textContent = message;
    statusElement.classList.add("visible");
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => statusElement.classList.remove("visible"), 5000);
    return true;
  } catch {
    statusElement.textContent = "That image may be too large for browser storage. Try a smaller file.";
    statusElement.classList.add("visible");
    return false;
  }
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value || "";
  return element.innerHTML;
}

function imageFromFile(file) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const limit = 900;
        const ratio = Math.min(1, limit / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function setFormMode(type, item) {
  const config = configs[type];
  const editing = Boolean(item);
  config.form.querySelector("h3").textContent = editing ? config.editTitle : config.addTitle;
  config.form.querySelector(".submit-record").textContent = editing ? config.updateLabel : config.addLabel;
}

function clearForm(type) {
  const config = configs[type];
  config.form.reset();
  config.form.elements.id.value = "";
  setFormMode(type, null);
}

function renderRecords(type, recordsId) {
  const container = document.querySelector(`#${recordsId}`);
  const records = state[type];
  container.innerHTML = records.length ? records.map((item) => {
    const name = item.name || item.school;
    const detail = item.role || item.leader || item.description;
    const image = item.logo || item.photo;
    const preview = image
      ? `<img class="record-preview" src="${image}" alt="">`
      : `<span class="record-preview">${initials(name)}</span>`;
    return `<article class="record">${preview}<div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(detail)}</span></div><div class="record-actions"><button class="record-action" type="button" data-action="edit" data-type="${type}" data-id="${item.id}">Edit</button><button class="record-action danger" type="button" data-action="remove" data-type="${type}" data-id="${item.id}">Remove</button></div></article>`;
  }).join("") : "<p>No entries yet.</p>";
}

function renderAll() {
  renderRecords("partners", "partner-records");
  renderRecords("team", "team-records");
  renderRecords("chapters", "chapter-records");
  document.querySelector("#show-chapters").checked = Boolean(state.showChapters);
}

const configs = {
  partners: { form: document.querySelector("#partner-form"), singular: "partner", imageKey: "logo", fields: ["name", "description", "url"], addTitle: "Add partner", editTitle: "Edit partner", addLabel: "Add partner", updateLabel: "Update partner" },
  team: { form: document.querySelector("#team-form"), singular: "team member", imageKey: "photo", fields: ["name", "role", "bio", "url"], addTitle: "Add team member", editTitle: "Edit team member", addLabel: "Add team member", updateLabel: "Update team member" },
  chapters: { form: document.querySelector("#chapter-admin-form"), singular: "chapter", fields: ["school", "state", "leader", "description", "contactEmail", "url", "actionLabel"], addTitle: "Add chapter", editTitle: "Edit chapter", addLabel: "Add chapter", updateLabel: "Update chapter" }
};

Object.entries(configs).forEach(([type, config]) => {
  config.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(config.form);
      const existingId = formData.get("id");
      const existing = state[type].find((item) => item.id === existingId);
      const primary = formData.get(type === "chapters" ? "school" : "name");
      const item = { id: existingId || makeId(primary) };
      config.fields.forEach((field) => { item[field] = String(formData.get(field) || "").trim(); });
      if (config.imageKey) {
        const file = config.form.elements.image.files[0];
        item[config.imageKey] = file ? await imageFromFile(file) : (existing?.[config.imageKey] || "");
      }
      const index = state[type].findIndex((record) => record.id === item.id);
      if (index >= 0) state[type][index] = item;
      else state[type].push(item);
      if (!save(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} saved. The homepage will show the change after refresh.`)) return;
      clearForm(type);
      renderAll();
    } catch {
      statusElement.textContent = "This record could not be saved. Check the fields and try a smaller image.";
      statusElement.classList.add("visible");
    }
  });
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, type, id } = button.dataset;
  const config = configs[type];
  const item = state[type].find((record) => record.id === id);
  if (!item) return;
  if (action === "remove") {
    if (!window.confirm(`Remove ${item.name || item.school}?`)) return;
    state[type] = state[type].filter((record) => record.id !== id);
    save("Entry removed.");
    clearForm(type);
    renderAll();
    return;
  }
  clearForm(type);
  config.form.elements.id.value = item.id;
  config.fields.forEach((field) => { config.form.elements[field].value = item[field] || ""; });
  setFormMode(type, item);
  config.form.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelectorAll(".cancel-edit").forEach((button) => {
  button.addEventListener("click", () => {
    const type = Object.keys(configs).find((key) => configs[key].form === button.closest("form"));
    clearForm(type);
  });
});

document.querySelectorAll(".new-record").forEach((button) => {
  button.addEventListener("click", () => {
    const type = Object.keys(configs).find((key) => configs[key].form.id === button.dataset.form);
    clearForm(type);
    configs[type].form.scrollIntoView({ behavior: "smooth", block: "center" });
    const firstField = configs[type].form.querySelector("input:not([type=hidden])");
    firstField.focus();
  });
});

document.querySelector("#show-chapters").addEventListener("change", (event) => {
  state.showChapters = event.target.checked;
  save(state.showChapters ? "Chapter directory is now visible on this browser." : "Chapter directory is now hidden.");
});

document.querySelector("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "hsipa-content-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
  save("Backup exported.");
});

document.querySelector("#import-input").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.partners) || !Array.isArray(imported.team) || !Array.isArray(imported.chapters)) throw new Error();
    Object.assign(state, imported);
    save("Backup imported. Refresh the homepage to see the update.");
    renderAll();
  } catch {
    statusElement.textContent = "That file is not a valid HSIPA content backup.";
    statusElement.classList.add("visible");
  }
  event.target.value = "";
});

document.querySelector("#reset-button").addEventListener("click", () => {
  if (!window.confirm("Restore the original partners, team, and chapter records?")) return;
  Object.assign(state, window.HSIPAContent.reset());
  Object.keys(configs).forEach(clearForm);
  renderAll();
  save("Original content restored.");
});

renderAll();
