const tableBody = document.getElementById("changes-table");
const modal = document.getElementById("modal");
const form = document.getElementById("change-form");
const formError = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

const priorityClasses = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700"
};

const statusClasses = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700"
};

function shortId(id) {
  return id ? id.substring(0, 8) : "-";
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function openModal() {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  form.reset();
  formError.classList.add("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

async function loadChanges() {
  try {
    const res = await fetch("/api/GetChanges");
    if (!res.ok) throw new Error("Failed to load changes");
    const changes = await res.json();
    renderTable(changes);
    updateStats(changes);
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center text-red-500">
          Failed to load change requests. Make sure the API is running.
        </td>
      </tr>`;
  }
}

function updateStats(changes) {
  document.getElementById("stat-total").textContent = changes.length;
  document.getElementById("stat-pending").textContent = changes.filter((c) => c.status === "Pending").length;
  document.getElementById("stat-approved").textContent = changes.filter((c) => c.status === "Approved").length;
}

function renderTable(changes) {
  if (changes.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center text-gray-400">
          No change requests yet. Click "New Change Request" to get started.
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = changes
    .map(
      (c) => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4 text-sm font-mono text-gray-500">${escapeHtml(shortId(c.id))}</td>
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${escapeHtml(c.title)}</td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityClasses[c.priority] || "bg-gray-100 text-gray-700"}">
          ${escapeHtml(c.priority)}
        </span>
      </td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[c.status] || "bg-gray-100 text-gray-700"}">
          ${escapeHtml(c.status)}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">${formatDate(c.createdAt)}</td>
      <td class="px-6 py-4">
        ${
          c.status === "Pending"
            ? `<button data-id="${escapeAttr(c.id)}" class="complete-btn inline-flex items-center gap-1 text-sm font-medium text-azure-600 hover:text-azure-700 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Complete
              </button>`
            : `<span class="text-sm text-gray-400">Done</span>`
        }
      </td>
    </tr>`
    )
    .join("");

  document.querySelectorAll(".complete-btn").forEach((btn) => {
    btn.addEventListener("click", () => completeChange(btn.dataset.id));
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function submitChange(event) {
  event.preventDefault();
  formError.classList.add("hidden");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const title = document.getElementById("title").value.trim();
  const impact = document.getElementById("impact").value;
  const urgency = document.getElementById("urgency").value;

  try {
    const res = await fetch("/api/AddChange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, impact, urgency })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to submit change request");
    }

    closeModal();
    await loadChanges();
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Request";
  }
}

async function completeChange(id) {
  try {
    const res = await fetch("/api/CompleteChange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to complete change request");
    }

    await loadChanges();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

loadChanges();
