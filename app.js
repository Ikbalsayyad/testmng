// ================== CONFIGURATION ==================
// Available classes - You can add more classes here as needed
const AVAILABLE_CLASSES = [
  { 
    id: 'c1', 
    label: 'Robotics Level 1: Foundations', 
    val: "{ title: 'Robotics Level 1: Foundations', description: 'Master the fundamentals of robotics, sensors, and basic programming', image: 'https://images.pexels.com/photos/2085831/pexels-photo-2085831.jpeg?auto=compress&cs=tinysrgb&w=800' }" 
  },
  { 
    id: 'c2', 
    label: 'Robotics Level 2: Mechanisms', 
    val: "{ title: 'Robotics Level 2: Mechanisms', description: 'Explore mechanical systems, actuators, and motion control', image: 'https://images.pexels.com/photos/8566472/pexels-photo-8566472.jpeg?auto=compress&cs=tinysrgb&w=800' }" 
  },
  { 
    id: 'c3',
    label: 'Robotics Level 3: Electronics',
    val: "{ title: 'Robotics Level 3: Electronics', description: 'Deep dive into circuits, microcontrollers, and electronic systems', image: 'https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg?auto=compress&cs=tinysrgb&w=800' }"
  },
  { 
    id: 'c4',
    label: 'Robotics Level 4: Programming',
    val: "{ title: 'Robotics Level 4: Programming', description: 'Advanced programming techniques for autonomous systems', image: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=800' }"
  },
  { 
    id: 'c5',
    label: 'Robotics Level 5: AI Integration',
    val: "{ title: 'Robotics Level 5: AI Integration', description: 'Integrate artificial intelligence and machine learning into robots', image: 'https://images.pexels.com/photos/8566473/pexels-photo-8566473.jpeg?auto=compress&cs=tinysrgb&w=800' }"
  },
  {
    id: 'c6',
    label: 'Robotics Level 6: Computer Vision',
    val: "{ title: 'Robotics Level 6: Computer Vision', description: 'Implement vision systems and image processing algorithms', image: 'https://images.pexels.com/photos/2599247/pexels-photo-2599247.jpeg?auto=compress&cs=tinysrgb&w=800' }"
  },
  {
    id: 'c7',
    label: 'Robotics Level 7: Advanced Systems',
    val: "{ title: 'Robotics Level 7: Advanced Systems', description: 'Build complex multi-robot systems and swarm intelligence', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800' }"
  },
  {
    id: 'c8',
    label: 'Robotics Level 8: Industry Applications',
    val: "{ title: 'Robotics Level 8: Industry Applications', description: 'Real-world robotics applications in manufacturing and automation', image: 'https://images.pexels.com/photos/1472443/pexels-photo-1472443.jpeg?auto=compress&cs=tinysrgb&w=800' }"
  }
];

// API Base URL
const API_BASE = '/api';

// ================== STATE ==================
let users = [];
let currentUser = null;
let deleteUserId = null;
let authToken = null;
let adminUser = null;

// ================== AUTH FUNCTIONS ==================

function getAuthToken() {
  return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
}

function getAdminUser() {
  const user = localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser');
  return user ? JSON.parse(user) : null;
}

function setAuth(token, user, remember = false) {
  authToken = token;
  adminUser = user;
  
  if (remember) {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
  } else {
    sessionStorage.setItem('adminToken', token);
    sessionStorage.setItem('adminUser', JSON.stringify(user));
  }
}

function clearAuth() {
  authToken = null;
  adminUser = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminUser');
}

async function checkAuth() {
  const token = getAuthToken();
  
  if (!token) {
    redirectToLogin();
    return false;
  }
  
  authToken = token;
  adminUser = getAdminUser();
  
  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      clearAuth();
      redirectToLogin();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    clearAuth();
    redirectToLogin();
    return false;
  }
}

function redirectToLogin() {
  window.location.href = '/login.html';
}

function logout() {
  clearAuth();
  redirectToLogin();
}

// Auth header for API calls
function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// ================== DOM ELEMENTS ==================
const elements = {
  // Views
  usersView: document.getElementById('users-view'),
  classesView: document.getElementById('classes-view'),
  
  // Containers
  usersContainer: document.getElementById('users-container'),
  classesContainer: document.getElementById('classes-container'),
  
  // Header
  pageTitle: document.getElementById('page-title'),
  userCount: document.getElementById('user-count'),
  addUserBtn: document.getElementById('add-user-btn'),
  
  // Search
  searchInput: document.getElementById('search-input'),
  
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  
  // Modal
  userModal: document.getElementById('user-modal'),
  modalTitle: document.getElementById('modal-title'),
  userForm: document.getElementById('user-form'),
  userId: document.getElementById('user-id'),
  username: document.getElementById('username'),
  fullname: document.getElementById('fullname'),
  age: document.getElementById('age'),
  password: document.getElementById('password'),
  classToggles: document.getElementById('class-toggles'),
  submitText: document.getElementById('submit-text'),
  modalClose: document.getElementById('modal-close'),
  cancelBtn: document.getElementById('cancel-btn'),
  togglePassword: document.getElementById('toggle-password'),
  
  // Delete Modal
  deleteModal: document.getElementById('delete-modal'),
  deleteUsername: document.getElementById('delete-username'),
  deleteModalClose: document.getElementById('delete-modal-close'),
  deleteCancel: document.getElementById('delete-cancel'),
  deleteConfirm: document.getElementById('delete-confirm'),
  
  // Toast
  toastContainer: document.getElementById('toast-container'),
  
  // Loading
  loading: document.getElementById('loading')
};

// ================== UTILITY FUNCTIONS ==================
function showLoading(show = true) {
  elements.loading.classList.toggle('active', show);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 
               type === 'error' ? 'exclamation-circle' : 'exclamation-triangle';
  
  toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
    <button class="toast-close"><i class="fas fa-times"></i></button>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
  
  // Manual close
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getClassLabel(classVal) {
  // Extract title from the class value string
  const match = classVal.match(/title:\s*'([^']+)'/);
  return match ? match[1] : classVal.slice(0, 30) + '...';
}

// ================== API FUNCTIONS ==================
async function fetchUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders()
    });
    
    if (response.status === 401) {
      clearAuth();
      redirectToLogin();
      return;
    }
    
    const data = await response.json();
    if (data.success) {
      users = data.users;
      renderUsers();
    }
  } catch (error) {
    showToast('Failed to fetch users', 'error');
    console.error('Fetch users error:', error);
  }
}

async function createUser(userData) {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    if (response.status === 401) {
      clearAuth();
      redirectToLogin();
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      showToast('User created successfully');
      closeModal();
      fetchUsers();
    } else {
      showToast(data.message || 'Failed to create user', 'error');
    }
  } catch (error) {
    showToast('Failed to create user', 'error');
    console.error('Create user error:', error);
  } finally {
    showLoading(false);
  }
}

async function updateUser(userId, userData) {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    if (response.status === 401) {
      clearAuth();
      redirectToLogin();
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      showToast('User updated successfully');
      closeModal();
      fetchUsers();
    } else {
      showToast(data.message || 'Failed to update user', 'error');
    }
  } catch (error) {
    showToast('Failed to update user', 'error');
    console.error('Update user error:', error);
  } finally {
    showLoading(false);
  }
}

async function deleteUser(userId) {
  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (response.status === 401) {
      clearAuth();
      redirectToLogin();
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      showToast('User deleted successfully');
      closeDeleteModal();
      fetchUsers();
    } else {
      showToast(data.message || 'Failed to delete user', 'error');
    }
  } catch (error) {
    showToast('Failed to delete user', 'error');
    console.error('Delete user error:', error);
  } finally {
    showLoading(false);
  }
}

// ================== RENDER FUNCTIONS ==================
function renderUsers(filterText = '') {
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(filterText.toLowerCase()) ||
    user.fullname.toLowerCase().includes(filterText.toLowerCase())
  );
  
  elements.userCount.textContent = `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`;
  
  if (filteredUsers.length === 0) {
    elements.usersContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users-slash"></i>
        <h3>No users found</h3>
        <p>${filterText ? 'Try a different search term' : 'Click "Add User" to get started'}</p>
      </div>
    `;
    return;
  }
  
  elements.usersContainer.innerHTML = filteredUsers.map(user => `
    <div class="user-card" data-id="${user._id}">
      <div class="user-header">
        <div class="user-avatar">${getInitials(user.fullname)}</div>
        <div class="user-actions">
          <button class="edit-btn" title="Edit User">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-btn" title="Delete User">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="user-info">
        <h3>${user.fullname}</h3>
        <p>@${user.username}</p>
        <p>Age: ${user.age || 'N/A'}</p>
      </div>
      <div class="user-classes">
        <h4>Assigned Classes</h4>
        <div class="class-tags">
          ${user.classes && user.classes.length > 0 
            ? user.classes.map(c => `<span class="class-tag">${getClassLabel(c)}</span>`).join('')
            : '<span class="class-tag none">No classes assigned</span>'
          }
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to cards
  elements.usersContainer.querySelectorAll('.user-card').forEach(card => {
    const userId = card.dataset.id;
    
    card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(userId));
    card.querySelector('.delete-btn').addEventListener('click', () => openDeleteModal(userId));
  });
}

function renderClasses() {
  elements.classesContainer.innerHTML = AVAILABLE_CLASSES.map(cls => `
    <div class="class-card">
      <h3>${cls.label}</h3>
      <p>Class ID: <span class="class-id">${cls.id}</span></p>
      <p>This class can be assigned to users via the toggle switches in the user editor.</p>
    </div>
  `).join('');
}

function renderClassToggles(selectedClasses = []) {
  elements.classToggles.innerHTML = AVAILABLE_CLASSES.map(cls => {
    const isSelected = selectedClasses.includes(cls.val);
    return `
      <div class="class-toggle-item ${isSelected ? 'active' : ''}">
        <div class="class-toggle-label">
          <h4>${cls.label}</h4>
          <p>ID: ${cls.id}</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" data-class-val="${cls.val}" ${isSelected ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }).join('');
  
  // Add change listeners to update active state
  elements.classToggles.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      this.closest('.class-toggle-item').classList.toggle('active', this.checked);
    });
  });
}

// ================== MODAL FUNCTIONS ==================
function openModal(editMode = false) {
  elements.modalTitle.textContent = editMode ? 'Edit User' : 'Add New User';
  elements.submitText.textContent = editMode ? 'Update User' : 'Save User';
  elements.userModal.classList.add('active');
  
  if (!editMode) {
    elements.userForm.reset();
    elements.userId.value = '';
    renderClassToggles([]);
  }
}

function closeModal() {
  elements.userModal.classList.remove('active');
  elements.userForm.reset();
  currentUser = null;
}

function openEditModal(userId) {
  currentUser = users.find(u => u._id === userId);
  if (!currentUser) return;
  
  elements.userId.value = currentUser._id;
  elements.username.value = currentUser.username;
  elements.fullname.value = currentUser.fullname;
  elements.age.value = currentUser.age || '';
  elements.password.value = '';
  elements.username.disabled = true;
  
  renderClassToggles(currentUser.classes || []);
  openModal(true);
}

function openDeleteModal(userId) {
  const user = users.find(u => u._id === userId);
  if (!user) return;
  
  deleteUserId = userId;
  elements.deleteUsername.textContent = user.username;
  elements.deleteModal.classList.add('active');
}

function closeDeleteModal() {
  elements.deleteModal.classList.remove('active');
  deleteUserId = null;
}

// ================== EVENT LISTENERS ==================
function initEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    });
  }
  
  // Add user button
  elements.addUserBtn.addEventListener('click', () => {
    elements.username.disabled = false;
    openModal(false);
  });
  
  // Modal close buttons
  elements.modalClose.addEventListener('click', closeModal);
  elements.cancelBtn.addEventListener('click', closeModal);
  
  // Delete modal buttons
  elements.deleteModalClose.addEventListener('click', closeDeleteModal);
  elements.deleteCancel.addEventListener('click', closeDeleteModal);
  elements.deleteConfirm.addEventListener('click', () => {
    if (deleteUserId) deleteUser(deleteUserId);
  });
  
  // Close modals on overlay click
  elements.userModal.addEventListener('click', (e) => {
    if (e.target === elements.userModal) closeModal();
  });
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) closeDeleteModal();
  });
  
  // Toggle password visibility
  elements.togglePassword.addEventListener('click', () => {
    const type = elements.password.type === 'password' ? 'text' : 'password';
    elements.password.type = type;
    elements.togglePassword.querySelector('i').className = 
      type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
  });
  
  // Form submit
  elements.userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get selected classes
    const selectedClasses = [];
    elements.classToggles.querySelectorAll('input:checked').forEach(checkbox => {
      selectedClasses.push(checkbox.dataset.classVal);
    });
    
    const userData = {
      username: elements.username.value.trim(),
      fullname: elements.fullname.value.trim(),
      age: parseInt(elements.age.value) || 0,
      classes: selectedClasses
    };
    
    // Only include password if provided
    if (elements.password.value) {
      userData.password = elements.password.value;
    }
    
    if (elements.userId.value) {
      updateUser(elements.userId.value, userData);
    } else {
      if (!userData.password) {
        userData.password = '123456789'; // Default password
      }
      createUser(userData);
    }
  });
  
  // Search
  elements.searchInput.addEventListener('input', (e) => {
    renderUsers(e.target.value);
  });
  
  // Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      
      // Update active nav
      elements.navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Show correct view
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`${view}-view`).classList.add('active');
      
      // Update header
      elements.pageTitle.textContent = view === 'users' ? 'User Management' : 'Available Classes';
      elements.addUserBtn.style.display = view === 'users' ? 'inline-flex' : 'none';
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
    }
  });
}

// ================== INITIALIZATION ==================
async function init() {
  // Check authentication first
  showLoading(true);
  const isAuthed = await checkAuth();
  
  if (!isAuthed) {
    return; // Will redirect to login
  }
  
  // Update user info in sidebar
  updateUserInfo();
  
  initEventListeners();
  renderClasses();
  await fetchUsers();
  showLoading(false);
}

function updateUserInfo() {
  const user = getAdminUser();
  if (user) {
    const userInfoSidebar = document.querySelector('.user-info-sidebar');
    if (userInfoSidebar) {
      userInfoSidebar.querySelector('.user-name').textContent = user.username;
      userInfoSidebar.querySelector('.user-role').textContent = user.role || 'Admin';
    }
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
