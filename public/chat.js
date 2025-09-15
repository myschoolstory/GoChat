const client = insforge.createClient({ baseUrl: 'https://smucinv7.us-east.insforge.app' });
let currentUser = null;
let currentProfile = null;

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const nicknameInput = document.getElementById('nickname');
const userInfo = document.getElementById('user-info');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  const nickname = nicknameInput.value;

  let authRes = await client.auth.signInWithPassword({ email, password });
  if (authRes.error) {
    authRes = await client.auth.signUp({ email, password });
    if (authRes.error) {
      alert('Login/Register failed: ' + authRes.error.message);
      return;
    }
  }
  currentUser = authRes.data.user;
  if (nickname) {
    await client.auth.setProfile({ nickname });
  }
  const profileRes = await client.auth.getCurrentUser();
  currentProfile = profileRes.data.profile;
  userInfo.innerText = `Logged in as: ${currentProfile.nickname || currentUser.email}`;
  userInfo.style.display = 'block';
  loginForm.style.display = 'none';
  messageInput.disabled = false;
  sendBtn.disabled = false;
  loadMessages();
  startPolling();
});

sendBtn.addEventListener('click', async () => {
  const content = messageInput.value.trim();
  if (!content) return;
  sendBtn.disabled = true;
  await client.database.from('messages').insert([
    { user_id: currentUser.id, content }
  ]).select().single();
  messageInput.value = '';
  sendBtn.disabled = false;
  loadMessages();
});

async function loadMessages() {
  const res = await client.database
    .from('messages')
    .select('*, users!inner(nickname,avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50);
  messagesDiv.innerHTML = '';
  if (res.data) {
    res.data.reverse().forEach(msg => {
      const div = document.createElement('div');
      div.className = 'msg';
      div.innerHTML = `<span class="msg-user">${msg.users?.nickname || 'User'}</span>: <span class="msg-content">${msg.content}</span>`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

let pollInterval = null;
function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadMessages, 2000);
}
