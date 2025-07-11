const components = [
  { id: "sidebar-container", url: "/sidebar.html" },
  { id: "filters-container", url: "/filters.html" },
  { id: "orders-table-container", url: "/orders-table.html" },
  { id: "pagination-container", url: "/pagination.html" },
  { id: "notifications-container", url: "/notifications.html" },
  { id: "chat-container", url: "/chat.html" },
];

async function loadComponents() {
  for (const comp of components) {
    const container = document.getElementById(comp.id);
    if (!container) {
      console.error(`Conteneur #${comp.id} introuvable dans le HTML`);
      continue;
    }

    try {
      const res = await fetch(comp.url);
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const html = await res.text();
      container.innerHTML = html;
    } catch (err) {
      console.error(`Erreur chargement composant ${comp.url} :`, err);
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponents();
  await import("./main.js");
});
