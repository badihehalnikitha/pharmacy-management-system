const $ = id => document.getElementById(id);
let currentUser = null, medicines = [], cart = [], authMode = 'login';

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}
function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}
function money(n) { return '₹' + Number(n).toFixed(2); }
function dateOnly(d) { return String(d).slice(0, 10); }
function showView(view) {
  $('ordersView').classList.toggle('hidden', view !== 'orders');
  $('adminView').classList.toggle('hidden', view !== 'admin');
  $('catalog').classList.toggle('hidden', view !== 'shop');
  $('contactView').classList.toggle('hidden', view !== 'contact');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'orders') loadOrders();
  if (view === 'admin') loadAdmin();
}
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

async function loadMedicines() {
  try {
    medicines = await api('/api/medicines?q=' + encodeURIComponent($('searchInput').value || ''));
    renderMedicines();
  } catch (e) { $('medicineGrid').innerHTML = `<p class="muted">${e.message}</p>`; }
}
function renderMedicines() {
  const today = new Date().toISOString().slice(0, 10);
  if (!medicines.length) { $('medicineGrid').innerHTML = '<p class="muted">No medicines found.</p>'; return; }
  $('medicineGrid').innerHTML = medicines.map(m => {
    const expired = dateOnly(m.expiry_date) < today, unavailable = expired || Number(m.stock) < 1;
    return `<article class="medicine-card">
      <div class="med-art">✚</div><span class="tag">${escapeHtml(m.category || 'General')}</span>
      <h3>${escapeHtml(m.medicine_name)}</h3><p class="manufacturer">${escapeHtml(m.manufactures || '')}</p>
      <div class="med-meta"><span class="price">${money(m.price)}</span><span class="stock">${m.stock} in stock</span></div>
      <div class="expiry">${expired ? 'Expired' : 'Expiry: ' + dateOnly(m.expiry_date)}</div>
      <button class="btn btn-primary" ${unavailable ? 'disabled' : ''} onclick="addToCart(${m.medicine_id})">${expired ? 'Expired' : unavailable ? 'Out of stock' : 'Add to cart'}</button>
    </article>`;
  }).join('');
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
$('searchInput').addEventListener('input', loadMedicines);

function addToCart(id) {
  const med = medicines.find(m => m.medicine_id === id);
  if (!med) return;
  const existing = cart.find(x => x.medicine_id === id);
  if (existing) {
    if (existing.quantity >= med.stock) return toast('You have added all available stock.');
    existing.quantity++;
  } else cart.push({ medicine_id: id, quantity: 1 });
  updateCart(); toast('Added to your cart.');
}
function updateCart() {
  $('cartCount').textContent = cart.reduce((s, x) => s + x.quantity, 0);
  const rows = cart.map(x => {
    const m = medicines.find(y => y.medicine_id === x.medicine_id);
    if (!m) return '';
    return `<div class="cart-row"><div><strong>${escapeHtml(m.medicine_name)}</strong><small>${money(m.price)} each</small></div>
      <div class="qty-controls"><button onclick="changeQty(${x.medicine_id},-1)">−</button>${x.quantity}<button onclick="changeQty(${x.medicine_id},1)">+</button></div>
      <strong>${money(m.price*x.quantity)}</strong></div>`;
  }).join('');
  $('cartItems').innerHTML = rows || '<p class="muted">Your cart is empty.</p>';
  const total = cart.reduce((sum, x) => { const m=medicines.find(y=>y.medicine_id===x.medicine_id); return sum+(m?Number(m.price)*x.quantity:0); },0);
  $('cartTotal').textContent = money(total);
}
function changeQty(id, delta) {
  const item = cart.find(x => x.medicine_id === id), med = medicines.find(x => x.medicine_id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity < 1) cart = cart.filter(x => x.medicine_id !== id);
  if (med && item.quantity > med.stock) item.quantity = med.stock;
  updateCart();
}
$('cartFab').addEventListener('click', () => { updateCart(); $('cartOverlay').classList.remove('hidden'); });
$('checkoutBtn').addEventListener('click', async () => {
  if (!currentUser) { $('cartOverlay').classList.add('hidden'); openAuth('login'); return toast('Please log in to place your order.'); }
  if (!cart.length) return toast('Your cart is empty.');
  try {
    const result = await api('/api/orders', { method:'POST', body:{items:cart} });
    cart=[]; updateCart(); $('cartOverlay').classList.add('hidden'); await loadMedicines();
    toast(`Order #${result.order_id} placed successfully.`); showView('orders');
  } catch(e) { toast(e.message); await loadMedicines(); }
});

function openAuth(mode) {
  authMode = mode; $('authTitle').textContent = mode === 'login' ? 'Login' : 'Create account';
  $('authSubmit').textContent = mode === 'login' ? 'Login' : 'Create account';
  $('nameField').classList.toggle('hidden', mode === 'login');
  $('phoneField').classList.toggle('hidden', mode === 'login');
  $('authPassword').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('switchAuth').innerHTML = mode === 'login' ? 'New here? <button type="button" id="switchAuthBtn">Create an account</button>' : 'Already registered? <button type="button" id="switchAuthBtn">Login</button>';
  $('switchAuthBtn').onclick = () => openAuth(mode === 'login' ? 'register' : 'login');
  $('authOverlay').classList.remove('hidden');
}
$('loginOpen').onclick = () => openAuth('login');
$('registerOpen').onclick = () => openAuth('register');
$('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = { email:$('authEmail').value, password:$('authPassword').value };
  if (authMode === 'register') Object.assign(body,{name:$('authName').value,phone:$('authPhone').value});
  try {
    const result = await api('/api/' + (authMode === 'login' ? 'login' : 'register'), {method:'POST',body});
    currentUser=result.user; $('authOverlay').classList.add('hidden'); updateAccount(); toast(result.message);
  } catch(err) { toast(err.message); }
});
async function updateAccount() {
  if (!currentUser) {
    $('accountArea').innerHTML = '<button class="btn btn-outline" id="loginOpen">Login</button><button class="btn btn-primary" id="registerOpen">Sign up</button>';
    $('loginOpen').onclick=()=>openAuth('login'); $('registerOpen').onclick=()=>openAuth('register');
    $('ordersNav').hidden=true; $('adminNav').hidden=true; return;
  }
  $('accountArea').innerHTML = `<span style="font-size:12px;align-self:center;color:var(--dark)">Hi, ${escapeHtml(currentUser.name)}</span><button class="btn btn-outline" id="logoutBtn">Logout</button>`;
  $('logoutBtn').onclick=async()=>{await api('/api/logout',{method:'POST'});currentUser=null;updateAccount();showView('shop');toast('Logged out.');};
  $('ordersNav').hidden=false; $('adminNav').hidden=currentUser.role!=='admin';
}

async function loadOrders() {
  try {
    const rows=await api('/api/orders');
    $('ordersList').innerHTML=rows.length ? rows.map(o=>`<article class="order-card"><header><strong>Order #${o.order_id}</strong><span class="status">${escapeHtml(o.satus)}</span></header><p>${escapeHtml(o.items || '')}</p><p>${dateOnly(o.order_date)} · ${money(o.total_amount)}</p></article>`).join('') : '<p class="muted">No orders yet.</p>';
  } catch(e) {$('ordersList').innerHTML=`<p class="muted">${e.message}</p>`;}
}
async function loadAdmin() {
  if (!currentUser || currentUser.role!=='admin') return;
  const [meds,orders]=await Promise.all([api('/api/medicines'),api('/api/orders')]);
  medicines=meds; renderMedicines();
  $('adminInventory').innerHTML=`<table><thead><tr><th>Medicine</th><th>Price</th><th>Stock</th><th>Expiry</th><th>Actions</th></tr></thead><tbody>${meds.map(m=>`<tr><td>${escapeHtml(m.medicine_name)}</td><td>${money(m.price)}</td><td>${m.stock}</td><td>${dateOnly(m.expiry_date)}</td><td><button class="btn btn-outline" onclick="editMedicine(${m.medicine_id})">Edit</button><button class="btn btn-outline" onclick="deleteMedicine(${m.medicine_id})">Delete</button></td></tr>`).join('')}</tbody></table>`;
  $('adminOrders').innerHTML=orders.length?`<table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>${orders.map(o=>`<tr><td>#${o.order_id}<br>${dateOnly(o.order_date)}</td><td>${escapeHtml(o.customer_name)}</td><td>${escapeHtml(o.items||'')}</td><td>${money(o.total_amount)}</td><td>${escapeHtml(o.satus)}</td><td><select id="status-${o.order_id}"><option ${o.satus==='Pending'?'selected':''}>Pending</option><option ${o.satus==='Confirmed'?'selected':''}>Confirmed</option><option ${o.satus==='Processing'?'selected':''}>Processing</option><option ${o.satus==='Delivered'?'selected':''}>Delivered</option><option ${o.satus==='Cancelled'?'selected':''}>Cancelled</option></select><button class="btn btn-primary" onclick="updateStatus(${o.order_id})">Save</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No customer orders yet.</p>';
}
function editMedicine(id) {
  const m=medicines.find(x=>x.medicine_id===id); if(!m)return;
  $('medicineId').value=m.medicine_id; $('medName').value=m.medicine_name; $('medCategory').value=m.category;
  $('medManufacturer').value=m.manufactures; $('medPrice').value=m.price; $('medStock').value=m.stock; $('medExpiry').value=dateOnly(m.expiry_date);
  $('medicineFormTitle').textContent='Edit medicine'; $('medicineForm').scrollIntoView({behavior:'smooth'});
}
function clearMedicineForm() {$('medicineForm').reset();$('medicineId').value='';$('medicineFormTitle').textContent='Add a medicine';}
$('cancelEdit').onclick=clearMedicineForm;
$('medicineForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('medicineId').value;
  const body={medicine_name:$('medName').value,category:$('medCategory').value,manufactures:$('medManufacturer').value,price:$('medPrice').value,stock:$('medStock').value,expiry_date:$('medExpiry').value};
  try{await api(id?'/api/medicines/'+id:'/api/medicines',{method:id?'PUT':'POST',body});clearMedicineForm();toast('Medicine saved.');await loadAdmin();}catch(err){toast(err.message);}
});
async function deleteMedicine(id){if(!confirm('Delete this medicine from inventory?'))return;try{await api('/api/medicines/'+id,{method:'DELETE'});toast('Medicine deleted.');await loadAdmin();}catch(e){toast(e.message);}}
async function updateStatus(id){try{await api('/api/orders/'+id+'/status',{method:'PATCH',body:{satus:$('status-'+id).value}});toast('Order status updated.');await loadAdmin();}catch(e){toast(e.message);}}

document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).classList.add('hidden')));
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.add('hidden');}));
(async function init(){
  try{const result=await api('/api/me');currentUser=result.user;updateAccount();}catch(e){}
  await loadMedicines();updateCart();
})();
