import { connectSocket, sendMessage, disconnectSocket } from './socket.js';

const API_ORDERS = '/api/orders';

const ordersTableBody = document.getElementById('orders-table-body');
const filterForm = document.getElementById('filter-form');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const clearFiltersBtn = document.getElementById('clear-filters');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');
const notificationsContainer = document.getElementById('notifications');
const chatContainer = document.getElementById('chat-container');
const chatCloseBtn = chatContainer.querySelector('#chat-close-btn');
const chatMessages = chatContainer.querySelector('#chat-messages');
const chatForm = chatContainer.querySelector('#chat-form');
const chatInput = chatContainer.querySelector('#chat-input');
const modal = document.getElementById('order-details-modal');
const modalContent = document.getElementById('order-details-content');
const modalCloseBtn = document.getElementById('close-order-details');

let currentPage = 1;
const pageSize = 10;
let totalPages = 1;
let currentFilters = { search: '', status: '' };
let activeOrderId = null;

modalCloseBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
  modalContent.innerHTML = '';
});

function showNotification(message, type = 'success', duration = 3000) {
  const notif = document.createElement('div');
  notif.textContent = message;
  notif.className = `mb-2 px-4 py-2 rounded shadow text-white ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
  notificationsContainer.appendChild(notif);
  setTimeout(() => notif.remove(), duration);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function createOrderRow(order) {
  const tr = document.createElement('tr');
  tr.className = 'border-b hover:bg-gray-50';
  tr.innerHTML = `
    <td class="p-2">${order.orderId}</td>
    <td class="p-2">${order.clientName || order.clientEmail || 'N/A'}</td>
    <td class="p-2">${order.total.toFixed(2)} €</td>
    <td class="p-2 capitalize">${order.status}</td>
    <td class="p-2">${formatDate(order.createdAt)}</td>
    <td class="p-2 space-x-2">
      <button class="btn-view px-2 py-1 bg-blue-500 text-white rounded" data-id="${order.orderId}">Voir</button>
      <button class="btn-update-status px-2 py-1 bg-green-500 text-white rounded" data-id="${order.orderId}">Confirmer</button>
      <button class="btn-cancel px-2 py-1 bg-red-500 text-white rounded" data-id="${order.orderId}">Annuler</button>
      <button class="btn-chat px-2 py-1 bg-gray-500 text-white rounded" data-id="${order.orderId}">Chat</button>
    </td>`;
  return tr;
}

async function fetchOrders() {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({
    page: currentPage,
    limit: pageSize,
    ...(currentFilters.search && { search: currentFilters.search }),
    ...(currentFilters.status && { status: currentFilters.status }),
  });

  try {
    const res = await fetch(`${API_ORDERS}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Erreur chargement commandes');
    const data = await res.json();
    totalPages = data.totalPages || 1;
    renderOrders(data.orders || []);
    updatePaginationButtons();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

function renderOrders(orders) {
  ordersTableBody.innerHTML = orders.length
    ? orders.map(createOrderRow).map(row => row.outerHTML).join('')
    : `<tr><td colspan="6" class="p-4 text-center text-gray-500">Aucune commande trouvée</td></tr>`;
}

function updatePaginationButtons() {
  currentPageSpan.textContent = `Page ${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

prevPageBtn.onclick = () => { if (currentPage > 1) { currentPage--; fetchOrders(); } };
nextPageBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; fetchOrders(); } };

filterForm.onsubmit = (e) => {
  e.preventDefault();
  currentFilters = {
    search: searchInput.value.trim(),
    status: statusFilter.value,
  };
  currentPage = 1;
  fetchOrders();
};

clearFiltersBtn.onclick = () => {
  searchInput.value = '';
  statusFilter.value = '';
  currentFilters = { search: '', status: '' };
  currentPage = 1;
  fetchOrders();
};

ordersTableBody.onclick = async (e) => {
  const target = e.target;
  const id = target.dataset.id;
  if (!id) return;
  if (target.classList.contains('btn-view')) showOrderDetails(id);
  if (target.classList.contains('btn-update-status') && confirm(`Confirmer commande ${id} ?`)) await updateOrderStatus(id, 'confirmed');
  if (target.classList.contains('btn-cancel') && confirm(`Annuler commande ${id} ?`)) await updateOrderStatus(id, 'cancelled');
  if (target.classList.contains('btn-chat')) openChat(id);
};

async function updateOrderStatus(orderId, newStatus) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_ORDERS}/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('Erreur mise à jour statut');
    showNotification(`Commande ${orderId} mise à jour: ${newStatus}`);
    fetchOrders();
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

async function showOrderDetails(orderId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur chargement des détails');
    const order = await res.json();

    modalContent.innerHTML = `
      <p><strong>ID:</strong> ${order.orderId}</p>
      <p><strong>Client:</strong> ${order.clientName || order.clientEmail || 'N/A'}</p>
      <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
      <p><strong>Statut:</strong> ${order.status}</p>
      <p><strong>Total:</strong> ${order.total.toFixed(2)} €</p>
      <p><strong>Adresse:</strong> ${order.address || 'N/A'}</p>
      <p><strong>Plats:</strong></p>
      <ul class="list-disc ml-6">${order.items.map(item => `<li>${item.name} x${item.quantity} — ${item.price.toFixed(2)} €</li>`).join('')}</ul>
      <p><strong>Commentaires:</strong> ${order.comments || 'Aucun'}</p>`;
    modal.classList.remove('hidden');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

function openChat(orderId) {
  if (activeOrderId) {
    disconnectSocket();
    chatMessages.innerHTML = '';
  }
  activeOrderId = orderId;
  chatContainer.classList.remove('hidden');
  connectSocket(orderId);
}

chatCloseBtn.onclick = () => {
  disconnectSocket();
  chatContainer.classList.add('hidden');
  chatMessages.innerHTML = '';
  activeOrderId = null;
};

chatForm.onsubmit = (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg || !activeOrderId) return;
  sendMessage({ orderId: activeOrderId, message: msg });
  appendChatMessage({ from: 'admin', message: msg });
  chatInput.value = '';
};

function appendChatMessage({ from, message }) {
  const div = document.createElement('div');
  div.className = `mb-2 p-2 rounded max-w-xs ${from === 'admin' ? 'bg-blue-100 self-end text-right' : 'bg-gray-200 self-start'}`;
  div.textContent = message;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.addEventListener('socketMessage', (e) => {
  const { orderId: msgOrderId, message } = e.detail;
  if (msgOrderId !== activeOrderId) return;
  appendChatMessage({ from: 'client', message });
});

fetchOrders();
