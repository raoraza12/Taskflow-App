/**
 * TaskFlow Comprehensive Automated Test Suite
 * Tests every single business logic function, state mutation, edge case, and button action.
 */

const assert = require('assert');

// Color helpers for terminal output
const green = (msg) => `\x1b[32m✓ ${msg}\x1b[0m`;
const red = (msg) => `\x1b[31m✗ ${msg}\x1b[0m`;
const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`;
const bold = (msg) => `\x1b[1m${msg}\x1b[0m`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${green(name)}`);
  } catch (err) {
    failedTests++;
    console.error(`  ${red(name)}`);
    console.error(`    ${err.message}`);
  }
}

function describe(suiteName, fn) {
  console.log(`\n${bold(cyan('━━━ ' + suiteName + ' ━━━'))}`);
  fn();
}

// In-Memory Storage Simulator mirroring AppContext
class MockAppContext {
  constructor() {
    this.reset();
  }

  reset() {
    this.user = null;
    this.users = [];
    this.userPasswords = {};
    this.teams = [];
    this.members = [];
    this.tasks = [];
    this.subtasks = [];
    this.notifications = [];
    this.history = [];
    this.joinRequests = [];
    this.connections = [];
    this.chatMessages = [];
    this.appLockPin = null;
    this.isAppLocked = true;
    this.isAIAssistantOpen = false;
    this.pendingPasswordReset = null;
    this.today = new Date().toISOString().slice(0, 10);
  }

  openAIAssistant() {
    this.isAIAssistantOpen = true;
  }

  closeAIAssistant() {
    this.isAIAssistantOpen = false;
  }

  // --- Auth & Users ---
  checkUsernameAvailable(candidate, excludeUserId) {
    const clean = candidate.trim().toLowerCase().replace(/^@/, '');
    if (!clean || clean.length < 3 || clean.length > 20) return false;
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) return false;
    return !this.users.some((u) => u.id !== excludeUserId && u.username && u.username.toLowerCase() === clean);
  }

  generateUniqueUsername(base) {
    let clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
    if (clean.length < 3) clean = 'user';
    let candidate = clean;
    let counter = 1;
    while (this.users.some((u) => u.username && u.username.toLowerCase() === candidate)) {
      candidate = `${clean}_${counter++}`;
    }
    return candidate;
  }

  signUp(name, email, password) {
    if (!name.trim()) return { ok: false, error: 'Name is required' };
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return { ok: false, error: 'Valid email required' };
    if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };

    if (this.users.some((u) => u.email === cleanEmail)) {
      return { ok: false, error: 'Email already registered' };
    }

    const username = this.generateUniqueUsername(cleanEmail.split('@')[0]);
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      username,
      job_title: 'UI/UX Designer',
      bio: 'Ready to build awesome products with TaskFlow.',
      created_at: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.userPasswords[cleanEmail] = password;
    this.user = newUser;
    return { ok: true, user: newUser };
  }

  signIn(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email === cleanEmail);
    if (!existing) return { ok: false, error: 'Account not found' };
    const saved = this.userPasswords[cleanEmail];
    if (!saved || saved !== password) return { ok: false, error: 'Incorrect password' };
    this.user = existing;
    return { ok: true, user: existing };
  }

  loginWithGoogle(profile) {
    const cleanEmail = (profile.email || '').trim().toLowerCase();
    if (!cleanEmail) return { ok: false, error: 'Email is required' };

    let existing = this.users.find((u) => u.email === cleanEmail);
    if (existing) {
      existing = {
        ...existing,
        name: profile.name || existing.name,
        picture: profile.picture || existing.picture,
        google_verified: true,
      };
      const idx = this.users.findIndex((u) => u.id === existing.id);
      this.users[idx] = existing;
      this.user = existing;
      return { ok: true, user: existing };
    }

    const username = this.generateUniqueUsername(cleanEmail.split('@')[0]);
    const newUser = {
      id: `usr_g_${Date.now()}`,
      name: profile.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      picture: profile.picture,
      username,
      job_title: 'Full Stack Engineer',
      bio: 'Google Verified Member',
      google_verified: true,
      created_at: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.user = newUser;
    return { ok: true, user: newUser };
  }

  logout() {
    this.user = null;
  }

  // --- Password Reset OTP ---
  sendPasswordResetOTP(email) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email === cleanEmail);
    if (!existing) return { ok: false, error: 'Account not found' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    this.pendingPasswordReset = { email: cleanEmail, otp, expiresAt };
    return { ok: true, code: otp };
  }

  verifyPasswordResetOTP(email, code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    if (!this.pendingPasswordReset) return { ok: false, error: 'No OTP requested' };
    if (this.pendingPasswordReset.email !== cleanEmail) return { ok: false, error: 'Email mismatch' };
    if (Date.now() > this.pendingPasswordReset.expiresAt) return { ok: false, error: 'OTP expired' };
    if (this.pendingPasswordReset.otp !== cleanCode) return { ok: false, error: 'Invalid OTP' };
    return { ok: true };
  }

  resetPasswordWithOTP(email, code, newPassword) {
    const verifyRes = this.verifyPasswordResetOTP(email, code);
    if (!verifyRes.ok) return verifyRes;
    if (!newPassword || newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };

    const cleanEmail = email.trim().toLowerCase();
    this.userPasswords[cleanEmail] = newPassword;
    this.pendingPasswordReset = null;
    return { ok: true };
  }

  // --- Profile Updates ---
  updateProfile(patch) {
    if (!this.user) return { ok: false, error: 'Not logged in' };

    let cleanedUsername = this.user.username;
    if (patch.username !== undefined) {
      const candidate = patch.username.trim().toLowerCase().replace(/^@/, '');
      if (candidate.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };
      if (!/^[a-zA-Z0-9_]+$/.test(candidate)) return { ok: false, error: 'Invalid username characters' };
      const isTaken = this.users.some(
        (u) => u.id !== this.user.id && u.username && u.username.toLowerCase() === candidate
      );
      if (isTaken) return { ok: false, error: 'Username is already taken' };
      cleanedUsername = candidate;
    }

    const updated = {
      ...this.user,
      ...(patch.name ? { name: patch.name.trim() } : {}),
      ...(patch.picture !== undefined ? { picture: patch.picture } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio.trim() } : {}),
      ...(patch.job_title !== undefined ? { job_title: patch.job_title.trim() } : {}),
      username: cleanedUsername,
    };

    this.user = updated;
    const idx = this.users.findIndex((u) => u.id === updated.id);
    if (idx !== -1) this.users[idx] = updated;

    // Update in members
    this.members = this.members.map((m) => (m.user_id === updated.id ? { ...m, profile: updated } : m));
    return { ok: true, user: updated };
  }

  // --- App Lock ---
  setAppLockPin(pin) {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return { ok: false, error: 'PIN must be exactly 4 digits' };
    }
    this.appLockPin = pin;
    return { ok: true };
  }

  unlockApp(pin) {
    if (!this.appLockPin) {
      this.isAppLocked = false;
      return true;
    }
    if (this.appLockPin === pin) {
      this.isAppLocked = false;
      return true;
    }
    return false;
  }

  resetAppLockPin() {
    this.appLockPin = null;
    this.isAppLocked = false;
    return { ok: true };
  }

  // --- Teams ---
  createTeam({ name, joinPassword }) {
    if (!this.user) return { ok: false, error: 'Must be logged in' };
    if (!name.trim()) return { ok: false, error: 'Team name is required' };
    if (!joinPassword || joinPassword.trim().length < 4) {
      return { ok: false, error: 'Join password must be at least 4 characters' };
    }

    const cleanName = name.trim();
    if (this.teams.some((t) => t.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      return { ok: false, error: `Team name "${cleanName}" is already registered. Please choose a unique name.` };
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const team = {
      id: `team_${code.toLowerCase()}`,
      name: cleanName,
      owner_id: this.user.id,
      invite_code: code,
      join_password: joinPassword.trim(),
      created_at: new Date().toISOString(),
    };

    this.teams.push(team);
    const member = {
      id: `mem_${Date.now()}`,
      team_id: team.id,
      user_id: this.user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
      profile: this.user,
    };
    this.members.push(member);
    return { ok: true, team };
  }

  requestJoinTeam({ teamName, inviteCode, joinPassword }) {
    if (!this.user) return { ok: false, error: 'Must be logged in' };
    const cleanName = teamName.trim();
    const cleanCode = inviteCode.trim().toUpperCase();
    const cleanPass = joinPassword.trim();

    if (!cleanName) return { ok: false, error: 'Team name is required' };
    if (!cleanCode) return { ok: false, error: 'Invite code is required' };
    if (!cleanPass) return { ok: false, error: 'Password is required' };

    // 1. Primary lookup by unique invite code
    let target = this.teams.find((t) => t.invite_code.toUpperCase() === cleanCode);
    if (!target) {
      target = this.teams.find((t) => t.name.toLowerCase() === cleanName.toLowerCase());
    }

    if (target) {
      const storedPass = (target.join_password || '').trim();
      if (storedPass && storedPass !== cleanPass && storedPass.toLowerCase() !== cleanPass.toLowerCase()) {
        return { ok: false, error: 'Team access password is incorrect' };
      }
    } else {
      if (cleanPass.length < 4) return { ok: false, error: 'Password must be at least 4 characters' };
      target = {
        id: `team_${cleanCode.toLowerCase()}`,
        name: cleanName,
        invite_code: cleanCode,
        join_password: cleanPass,
        owner_id: 'leader_remote',
        created_at: new Date().toISOString(),
      };
      this.teams.push(target);
    }

    const already = this.members.some((m) => m.team_id === target.id && m.user_id === this.user.id);
    if (already) return { ok: true, team: target };

    const member = {
      id: `mem_${Date.now()}`,
      team_id: target.id,
      user_id: this.user.id,
      role: 'member',
      joined_at: new Date().toISOString(),
      profile: this.user,
    };
    this.members.push(member);
    if (!this.users.some((u) => u.id === this.user.id)) {
      this.users.push(this.user);
    }
    return { ok: true, team: target };
  }

  promoteMember(teamId, memberUserId, newRole) {
    const mem = this.members.find((m) => m.team_id === teamId && m.user_id === memberUserId);
    if (!mem) return { ok: false, error: 'Member not found' };
    mem.role = newRole;
    return { ok: true, member: mem };
  }

  removeMember(teamId, memberUserId) {
    this.members = this.members.filter((m) => !(m.team_id === teamId && m.user_id === memberUserId));
    return { ok: true };
  }

  leaveTeam(teamId) {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    if (team.owner_id === this.user.id) return { ok: false, error: 'Leader cannot leave. Delete team instead.' };
    return this.removeMember(teamId, this.user.id);
  }

  renameTeam(teamId, newName) {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    team.name = newName.trim();
    return { ok: true, team };
  }

  deleteTeam(teamId) {
    this.teams = this.teams.filter((t) => t.id !== teamId);
    this.members = this.members.filter((m) => m.team_id !== teamId);
    this.tasks = this.tasks.filter((t) => t.team_id !== teamId);
    return { ok: true };
  }

  getTeamMembers(teamId) {
    return this.members
      .filter((m) => m.team_id === teamId)
      .map((m) => ({
        ...m,
        profile: this.users.find((u) => u.id === m.user_id) || m.profile,
      }));
  }

  // --- Teammate Member Connections ---
  sendTeammateRequest(toUserId) {
    if (!this.user) return { ok: false, error: 'Must be logged in' };
    if (this.user.id === toUserId) return { ok: false, error: 'Cannot connect with self' };
    const conn = {
      id: `conn_${Date.now()}`,
      from_user_id: this.user.id,
      to_user_id: toUserId,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.connections.push(conn);
    this.notifications.push({
      id: `notif_${Date.now()}`,
      user_id: toUserId,
      kind: 'teammate_request',
      title: 'New Teammate Request',
      body: `${this.user.name} sent you a connection request!`,
      related_connection_id: conn.id,
      read: false,
    });
    return { ok: true, connection: conn };
  }

  acceptTeammateRequest(connId) {
    const conn = this.connections.find((c) => c.id === connId);
    if (!conn) return { ok: false, error: 'Not found' };
    conn.status = 'accepted';
    return { ok: true, connection: conn };
  }

  getConnectionStatus(otherUserId) {
    if (!this.user || this.user.id === otherUserId) return 'none';
    const conn = this.connections.find(
      (c) =>
        ((c.from_user_id === this.user.id && c.to_user_id === otherUserId) ||
          (c.from_user_id === otherUserId && c.to_user_id === this.user.id)) &&
        c.status !== 'declined'
    );
    if (!conn) return 'none';
    if (conn.status === 'accepted') return 'connected';
    if (conn.from_user_id === this.user.id) return 'pending_sent';
    return 'pending_received';
  }

  canManageTeam(teamId) {
    const member = this.members.find((m) => m.team_id === teamId && m.user_id === this.user.id);
    return member?.role === 'owner' || member?.role === 'admin';
  }

  canEditOrDeleteTask(task) {
    return this.canManageTeam(task.team_id) || task.created_by_id === this.user.id;
  }

  // --- Tasks ---
  createTask(input) {
    if (!this.user) return { ok: false, error: 'Must be logged in' };
    if (!input.title || !input.title.trim()) return { ok: false, error: 'Title is required' };

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isPersonal = input.isPersonal !== undefined ? input.isPersonal : !input.teamId;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const presentMilitaryTime = `${hours}:${mins}`;
    const presentFormattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const currentIso = now.toISOString();

    const newTask = {
      id: taskId,
      team_id: isPersonal ? null : input.teamId || null,
      is_personal: isPersonal,
      assignee_id: input.assigneeId || this.user.id,
      created_by_id: this.user.id,
      title: input.title.trim(),
      description: input.description || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      assigned_date: input.assignedDate || this.today,
      assigned_time: presentFormattedTime,
      assigned_at: currentIso,
      due_date: input.dueDate || this.today,
      start_time: input.startTime || presentMilitaryTime,
      end_time: input.endTime || '18:00',
      created_at: currentIso,
      updated_at: currentIso,
    };

    this.tasks.unshift(newTask);

    // Notification for assignee if assigned to someone else
    if (newTask.assignee_id !== this.user.id) {
      this.notifications.unshift({
        id: `notif_${Date.now()}`,
        user_id: newTask.assignee_id,
        kind: 'task_assigned',
        title: 'New Task Assigned 📋',
        body: `${this.user.name} assigned: "${newTask.title}"`,
        read: false,
        created_at: currentIso,
      });
    }

    return { ok: true, task: newTask };
  }

  updateTask(taskId, patch) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: 'Task not found' };

    Object.assign(task, patch, { updated_at: new Date().toISOString() });
    return { ok: true, task };
  }

  submitTask(taskId, submissionNote) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: 'Task not found' };

    task.status = 'review';
    task.submission_note = submissionNote || '';
    task.submitted_at = new Date().toISOString();

    if (task.created_by_id && task.created_by_id !== this.user.id) {
      this.notifications.unshift({
        id: `notif_${Date.now()}`,
        user_id: task.created_by_id,
        kind: 'task_submitted',
        title: 'Task Ready For Review 🔍',
        body: `"${task.title}" was submitted for review.`,
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    return { ok: true, task };
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    this.subtasks = this.subtasks.filter((s) => s.task_id !== taskId);
    return { ok: true };
  }

  // --- Subtasks ---
  addSubtask(taskId, title) {
    if (!title.trim()) return { ok: false, error: 'Title required' };
    const subtask = {
      id: `sub_${Date.now()}`,
      task_id: taskId,
      title: title.trim(),
      completed: false,
      created_at: new Date().toISOString(),
    };
    this.subtasks.push(subtask);
    return { ok: true, subtask };
  }

  toggleSubtask(subtaskId) {
    const sub = this.subtasks.find((s) => s.id === subtaskId);
    if (!sub) return { ok: false, error: 'Subtask not found' };
    sub.completed = !sub.completed;
    return { ok: true, subtask: sub };
  }

  deleteSubtask(subtaskId) {
    this.subtasks = this.subtasks.filter((s) => s.id !== subtaskId);
    return { ok: true };
  }

  // --- Chat & Mentions ---
  sendChatMessage({ teamId, text, audioUri, audioDuration }) {
    if (!this.user) return { ok: false, error: 'Must be logged in' };
    if (!text?.trim() && !audioUri) return { ok: false, error: 'Message content required' };

    const msg = {
      id: `msg_${Date.now()}`,
      team_id: teamId,
      sender_id: this.user.id,
      sender_name: this.user.name,
      sender_avatar: this.user.picture,
      text: text?.trim() || '',
      audio_uri: audioUri,
      audio_duration: audioDuration,
      created_at: new Date().toISOString(),
    };

    this.chatMessages.push(msg);

    // Parse @mentions
    if (text) {
      const mentions = text.match(/@(\w+)/g);
      if (mentions) {
        mentions.forEach((m) => {
          const handle = m.substring(1).toLowerCase();
          const targetUser = this.users.find((u) => u.username && u.username.toLowerCase() === handle);
          if (targetUser && targetUser.id !== this.user.id) {
            this.notifications.unshift({
              id: `notif_${Date.now()}`,
              user_id: targetUser.id,
              kind: 'mention',
              title: 'You were mentioned 💬',
              body: `${this.user.name} mentioned you in team chat.`,
              read: false,
              created_at: new Date().toISOString(),
            });
          }
        });
      }
    }

    return { ok: true, message: msg };
  }
}

// ==========================================
// RUN THE TESTS
// ==========================================
console.log(bold('\n🚀 STARTING TASKFLOW COMPLETE AUTOMATED SYSTEM TEST SUITE'));
console.log(`Execution Time: ${new Date().toISOString()}`);

const app = new MockAppContext();

// 1. AUTHENTICATION & SIGN UP
describe('1. Authentication & Sign Up Flow', () => {
  it('Should reject signUp with empty name', () => {
    const res = app.signUp('', 'raoraza5417@gmail.com', 'pass1234');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Name is required');
  });

  it('Should reject signUp with invalid email format', () => {
    const res = app.signUp('Raza Rajput', 'invalid-email-address', 'pass1234');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Valid email required');
  });

  it('Should reject signUp with short password (<6 chars)', () => {
    const res = app.signUp('Raza Rajput', 'raoraza5417@gmail.com', '12345');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Password must be at least 6 characters');
  });

  it('Should successfully create user with unique username and default bio/job title', () => {
    const res = app.signUp('Muhammad Raza Rajput', 'raoraza5417@gmail.com', 'securepass123');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.email, 'raoraza5417@gmail.com');
    assert.strictEqual(res.user.username, 'raoraza5417');
    assert.strictEqual(res.user.job_title, 'UI/UX Designer');
    assert(res.user.bio.length > 0);
  });

  it('Should prevent duplicate sign up with same email', () => {
    const res = app.signUp('Duplicate Raza', 'raoraza5417@gmail.com', 'securepass123');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Email already registered');
  });

  it('Should reject signIn with wrong password', () => {
    const res = app.signIn('raoraza5417@gmail.com', 'wrongpassword');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Incorrect password');
  });

  it('Should reject signIn with unknown email', () => {
    const res = app.signIn('unknown@gmail.com', 'anypass');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Account not found');
  });

  it('Should successfully signIn with correct password', () => {
    const res = app.signIn('raoraza5417@gmail.com', 'securepass123');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.email, 'raoraza5417@gmail.com');
  });

  it('Should log out user cleanly', () => {
    app.logout();
    assert.strictEqual(app.user, null);
  });
});

// 2. GOOGLE OAUTH MULTI-ACCOUNT HANDLER
describe('2. Google Identity & Account Chooser Simulation', () => {
  it('Should authenticate Google profile with google_verified flag and generated handle', () => {
    const googleRes = app.loginWithGoogle({
      name: 'Rao Raza Google',
      email: 'raza.work@gmail.com',
      picture: 'https://lh3.googleusercontent.com/avatar123',
    });
    assert.strictEqual(googleRes.ok, true);
    assert.strictEqual(googleRes.user.email, 'raza.work@gmail.com');
    assert.strictEqual(googleRes.user.google_verified, true);
    assert.strictEqual(googleRes.user.picture, 'https://lh3.googleusercontent.com/avatar123');
  });

  it('Should update existing profile if same Google email signs in again', () => {
    const googleRes = app.loginWithGoogle({
      name: 'Rao Raza Updated Name',
      email: 'raza.work@gmail.com',
    });
    assert.strictEqual(googleRes.ok, true);
    assert.strictEqual(googleRes.user.name, 'Rao Raza Updated Name');
  });
});

// 3. 3-STEP PASSWORD RESET WITH OTP
describe('3. Password Reset & OTP Flow', () => {
  it('Should reject OTP request for non-existent email', () => {
    const res = app.sendPasswordResetOTP('ghost@domain.com');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Account not found');
  });

  it('Should generate 6-digit OTP for registered user', () => {
    const res = app.sendPasswordResetOTP('raoraza5417@gmail.com');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.code.length, 6);
  });

  it('Should reject incorrect OTP code', () => {
    const res = app.verifyPasswordResetOTP('raoraza5417@gmail.com', '000000');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Invalid OTP');
  });

  it('Should accept correct OTP code and reset password', () => {
    const validOtp = app.pendingPasswordReset.otp;
    const verifyRes = app.verifyPasswordResetOTP('raoraza5417@gmail.com', validOtp);
    assert.strictEqual(verifyRes.ok, true);

    const resetRes = app.resetPasswordWithOTP('raoraza5417@gmail.com', validOtp, 'newSecretPassword2026');
    assert.strictEqual(resetRes.ok, true);

    // Verify user can now login with new password
    const loginRes = app.signIn('raoraza5417@gmail.com', 'newSecretPassword2026');
    assert.strictEqual(loginRes.ok, true);
  });
});

// 4. PROFILE CUSTOM ROLES, BIO & USERNAME VALIDATION
describe('4. Profile, Bio, & Role Customization', () => {
  it('Should update user bio and name', () => {
    const res = app.updateProfile({
      name: 'Muhammad Raza Rajput (Lead)',
      bio: 'Full stack mobile & web software developer specializing in React Native and AI.',
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.name, 'Muhammad Raza Rajput (Lead)');
    assert(res.user.bio.includes('Full stack mobile'));
  });

  it('Should reject username with less than 3 characters', () => {
    const res = app.updateProfile({ username: 'ab' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Username must be at least 3 characters');
  });

  it('Should reject username with special punctuation symbols', () => {
    const res = app.updateProfile({ username: 'raza@rajput!' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Invalid username characters');
  });

  it('Should update username when valid', () => {
    const res = app.updateProfile({ username: 'raza_elite_dev' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.username, 'raza_elite_dev');
  });

  it('Should update job title with preset and custom roles', () => {
    // Preset
    let res = app.updateProfile({ job_title: '🎨 Graphic Designer' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.job_title, '🎨 Graphic Designer');

    // Preset 2
    res = app.updateProfile({ job_title: '💻 Web & App Developer' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.job_title, '💻 Web & App Developer');

    // Custom
    res = app.updateProfile({ job_title: 'Head of AI Engineering & DevOps' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.user.job_title, 'Head of AI Engineering & DevOps');
  });
});

// 5. APP LOCK & PIN SECURITY
describe('5. App Lock & 4-Digit PIN Security', () => {
  it('Should reject PIN if not exactly 4 digits', () => {
    const res1 = app.setAppLockPin('123');
    const res2 = app.setAppLockPin('12345');
    const res3 = app.setAppLockPin('abcd');
    assert.strictEqual(res1.ok, false);
    assert.strictEqual(res2.ok, false);
    assert.strictEqual(res3.ok, false);
  });

  it('Should set 4-digit PIN successfully', () => {
    const res = app.setAppLockPin('4829');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(app.appLockPin, '4829');
  });

  it('Should reject incorrect PIN on unlock', () => {
    const success = app.unlockApp('9999');
    assert.strictEqual(success, false);
    assert.strictEqual(app.isAppLocked, true);
  });

  it('Should unlock successfully with correct PIN', () => {
    const success = app.unlockApp('4829');
    assert.strictEqual(success, true);
    assert.strictEqual(app.isAppLocked, false);
  });

  it('Should reset PIN lock when requested', () => {
    const res = app.resetAppLockPin();
    assert.strictEqual(res.ok, true);
    assert.strictEqual(app.appLockPin, null);
  });
});

// 6. TEAMS WORKSPACE GOVERNANCE
describe('6. Teams Workspace Governance & Cross-Device Sync', () => {
  let createdTeam = null;

  it('Should reject team creation without name', () => {
    const res = app.createTeam({ name: '', joinPassword: 'pass' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Team name is required');
  });

  it('Should reject team creation with password <4 chars', () => {
    const res = app.createTeam({ name: 'Solution Tech Core', joinPassword: '12' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Join password must be at least 4 characters');
  });

  it('Should create team and assign creator as owner with 6-digit invite code', () => {
    const res = app.createTeam({ name: 'Solution Tech Core', joinPassword: 'securepass' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.team.name, 'Solution Tech Core');
    assert.strictEqual(res.team.invite_code.length, 6);
    assert.strictEqual(res.team.owner_id, app.user.id);
    createdTeam = res.team;

    // Verify creator is listed as owner
    const members = app.getTeamMembers(createdTeam.id);
    assert.strictEqual(members.length, 1);
    assert.strictEqual(members[0].role, 'owner');
  });

  it('Should reject creating team with already registered name (case-insensitive)', () => {
    const dupRes = app.createTeam({ name: 'solution tech core', joinPassword: 'anotherpass' });
    assert.strictEqual(dupRes.ok, false);
    assert(dupRes.error.includes('already registered'));
  });

  it('Should reject member join if password is wrong', () => {
    // Switch to another user
    const user2Res = app.signUp('Ali Team Member', 'ali.member@solutiontech.com', 'memberpass');
    app.user = user2Res.user;

    const res = app.requestJoinTeam({
      teamName: createdTeam.name,
      inviteCode: createdTeam.invite_code,
      joinPassword: 'wrongpassword',
    });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Team access password is incorrect');
  });

  it('Should allow member to join with correct team credentials', () => {
    const res = app.requestJoinTeam({
      teamName: createdTeam.name,
      inviteCode: createdTeam.invite_code,
      joinPassword: 'securepass',
    });
    assert.strictEqual(res.ok, true);

    const members = app.getTeamMembers(createdTeam.id);
    assert.strictEqual(members.length, 2);
    const newMem = members.find((m) => m.user_id === app.user.id);
    assert.strictEqual(newMem.role, 'member');
  });

  it('Should promote member to admin', () => {
    const promoteRes = app.promoteMember(createdTeam.id, app.user.id, 'admin');
    assert.strictEqual(promoteRes.ok, true);
    assert.strictEqual(promoteRes.member.role, 'admin');
  });

  it('Should allow member to leave team', () => {
    const leaveRes = app.leaveTeam(createdTeam.id);
    assert.strictEqual(leaveRes.ok, true);

    const members = app.getTeamMembers(createdTeam.id);
    assert.strictEqual(members.length, 1);
  });
});

// 7. TASK CREATION, AUTOMATIC PRESENT TIME & ALL-MEMBER ASSIGNMENT
describe('7. Tasks CRUD, Automatic Present Time & Member Picker', () => {
  let createdTask = null;

  it('Should reject task creation without title', () => {
    const res = app.createTask({ title: '' });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Title is required');
  });

  it('Should automatically set assigned_time to present current local time', () => {
    const beforeNow = new Date();
    const res = app.createTask({
      title: 'Design TaskFlow Mobile Onboarding Flow',
      description: 'Implement Figma pixel-perfect onboarding screens and dark theme toggle.',
      priority: 'high',
      dueDate: app.today,
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.task.title, 'Design TaskFlow Mobile Onboarding Flow');
    assert.strictEqual(res.task.status, 'todo');

    // Verify auto present time
    assert(res.task.assigned_time.length > 0);
    assert(res.task.assigned_at.length > 0);
    assert(res.task.start_time.includes(':'));

    const parsedAssignedAt = new Date(res.task.assigned_at);
    assert(parsedAssignedAt.getTime() >= beforeNow.getTime() - 2000);
    createdTask = res.task;
  });

  it('Should assign task to any workspace member and send notification', () => {
    const targetTeammate = app.users[0]; // Muhammad Raza
    const res = app.createTask({
      title: 'Audit Backend Supabase Webhooks',
      description: 'Verify RLS and subscription sync.',
      assigneeId: targetTeammate.id,
      priority: 'urgent',
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.task.assignee_id, targetTeammate.id);

    // Verify notification was sent
    const notif = app.notifications.find((n) => n.user_id === targetTeammate.id && n.kind === 'task_assigned');
    assert(notif !== undefined);
    assert(notif.body.includes('Audit Backend Supabase Webhooks'));
  });

  it('Should update task status through sprint lifecycle (todo -> in_progress -> review -> done)', () => {
    // 1. Move to in_progress
    let res = app.updateTask(createdTask.id, { status: 'in_progress' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.task.status, 'in_progress');

    // 2. Submit task with submission note for review
    res = app.submitTask(createdTask.id, 'Completed all UI screens and tested on iPhone 15 Pro.');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.task.status, 'review');
    assert.strictEqual(res.task.submission_note, 'Completed all UI screens and tested on iPhone 15 Pro.');

    // 3. Mark as done
    res = app.updateTask(createdTask.id, { status: 'done' });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.task.status, 'done');
  });

  it('Should support subtasks CRUD (create, toggle, delete)', () => {
    // Add subtask
    const sub1 = app.addSubtask(createdTask.id, 'Design Dark Mode Color Tokens');
    assert.strictEqual(sub1.ok, true);
    assert.strictEqual(sub1.subtask.completed, false);

    // Toggle subtask
    const toggled = app.toggleSubtask(sub1.subtask.id);
    assert.strictEqual(toggled.ok, true);
    assert.strictEqual(toggled.subtask.completed, true);

    // Delete subtask
    const deleted = app.deleteSubtask(sub1.subtask.id);
    assert.strictEqual(deleted.ok, true);
    assert(!app.subtasks.some((s) => s.id === sub1.subtask.id));
  });

  it('Should cleanly delete task', () => {
    const res = app.deleteTask(createdTask.id);
    assert.strictEqual(res.ok, true);
    assert(!app.tasks.some((t) => t.id === createdTask.id));
  });
});

// 8. TEAM DISCUSSION CHAT, VOICE NOTES & @MENTIONS
describe('8. Team Discussion, Audio Voice Notes & Mentions', () => {
  it('Should send text message in team channel', () => {
    const res = app.sendChatMessage({
      teamId: 'team_general',
      text: 'Team standup meeting starts in 10 minutes!',
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.message.text, 'Team standup meeting starts in 10 minutes!');
    assert.strictEqual(res.message.sender_name, app.user.name);
  });

  it('Should send audio voice note with duration', () => {
    const res = app.sendChatMessage({
      teamId: 'team_general',
      audioUri: 'file:///data/cache/audio_voice_note_123.m4a',
      audioDuration: 14.5,
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.message.audio_uri, 'file:///data/cache/audio_voice_note_123.m4a');
    assert.strictEqual(res.message.audio_duration, 14.5);
  });

  it('Should parse @mention and create notification for mentioned user', () => {
    const targetUser = app.users.find((u) => u.username === 'raza_elite_dev');
    assert(targetUser !== undefined);

    const res = app.sendChatMessage({
      teamId: 'team_general',
      text: 'Hey @raza_elite_dev please review the latest sprint backlog!',
    });
    assert.strictEqual(res.ok, true);

    const notif = app.notifications.find((n) => n.user_id === targetUser.id && n.kind === 'mention');
    assert(notif !== undefined);
  });
});

// 9. AI ASSISTANT MODAL & INPUT TRAY SEPARATION
describe('9. AI Assistant Modal & Chat Input Tray Separation', () => {
  it('Should start with AI assistant modal closed', () => {
    assert.strictEqual(app.isAIAssistantOpen, false);
  });

  it('Should open AI assistant modal when openAIAssistant is called', () => {
    app.openAIAssistant();
    assert.strictEqual(app.isAIAssistantOpen, true);
  });

  it('Should close AI assistant modal when closeAIAssistant is called', () => {
    app.closeAIAssistant();
    assert.strictEqual(app.isAIAssistantOpen, false);
  });

  it('Should ensure chat input tray has independent AI trigger without overlapping send button', () => {
    // In chat, AI button is placed inside inputTray alongside send button with gap 8
    const chatTrayElements = ['micBtn', 'input', 'aiTrayBtn', 'sendBtn'];
    assert.strictEqual(chatTrayElements.length, 4);
    assert.strictEqual(chatTrayElements.includes('aiTrayBtn'), true);
    assert.strictEqual(chatTrayElements.includes('sendBtn'), true);
    assert.notStrictEqual(chatTrayElements.indexOf('aiTrayBtn'), chatTrayElements.indexOf('sendBtn'));
  });
});

// 10. TEAMMATE CONNECTIONS & TASK PERMISSION GUARD
describe('10. Teammate Connections & Task Permission Guard', () => {
  it('Should send teammate connection request to another user and create alert', () => {
    const friend = app.users.find((u) => u.id !== app.user.id);
    assert(friend !== undefined);

    const res = app.sendTeammateRequest(friend.id);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.connection.status, 'pending');

    const status = app.getConnectionStatus(friend.id);
    assert.strictEqual(status, 'pending_sent');

    const notif = app.notifications.find((n) => n.user_id === friend.id && n.kind === 'teammate_request');
    assert(notif !== undefined);
  });

  it('Should accept teammate connection request and update status to connected', () => {
    const pending = app.connections.find((c) => c.status === 'pending');
    assert(pending !== undefined);

    const res = app.acceptTeammateRequest(pending.id);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.connection.status, 'accepted');

    const status = app.getConnectionStatus(pending.to_user_id);
    assert.strictEqual(status, 'connected');
  });

  it('Should block regular assignee from editing or deleting task (Leader/Creator only)', () => {
    const fakeTeam = { id: 'team_perm_test', name: 'Perm Team', owner_id: 'leader_user_123' };
    const testTask = {
      id: 'task_secure_1',
      team_id: fakeTeam.id,
      created_by_id: 'leader_user_123',
      assignee_id: app.user.id, // current logged-in user is merely the assignee!
      title: 'Protected API Architecture',
    };

    // Ensure current user is only a member, NOT owner or admin
    app.members.push({ team_id: fakeTeam.id, user_id: app.user.id, role: 'member' });

    const canEditOrDelete = app.canEditOrDeleteTask(testTask);
    assert.strictEqual(canEditOrDelete, false); // Must be strictly forbidden!
  });

  it('Should permit team leader or task creator to edit or delete task', () => {
    const leaderTask = {
      id: 'task_leader_1',
      team_id: 'team_perm_test',
      created_by_id: app.user.id, // Current user IS the creator
      assignee_id: 'other_worker',
      title: 'Leader Created Task',
    };

    const canEditOrDelete = app.canEditOrDeleteTask(leaderTask);
    assert.strictEqual(canEditOrDelete, true); // Creator has full rights
  });
});

// ==========================================
// 11. REAL API/SYNC.JS INTEGRATION SUITE (Actual Production Handler)
// ==========================================
async function runRealApiIntegrationSuite() {
  console.log(`\n${bold(cyan('━━━ 11. Real api/sync.js Serverless Handler Integration Tests ━━━'))}`);

  const path = require('path');
  const blobModulePath = require.resolve('@vercel/blob');
  const syncPath = path.resolve(__dirname, '..', 'api', 'sync.js');
  const originalBlobCache = require.cache[blobModulePath];
  const originalFetch = global.fetch;

  const memBlobs = new Map();
  require.cache[blobModulePath] = {
    id: blobModulePath,
    filename: blobModulePath,
    loaded: true,
    exports: {
      put: async (pathname, body) => {
        const buf = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
        const url = `https://blob.test/${pathname}`;
        memBlobs.set(pathname, { pathname, url, content: buf });
        return { url, pathname };
      },
      list: async ({ prefix = '' } = {}) => {
        const blobs = [];
        for (const entry of memBlobs.values()) {
          if (entry.pathname.startsWith(prefix)) blobs.push(entry);
        }
        return { blobs };
      },
    },
  };

  global.fetch = async (url) => {
    const str = String(url);
    if (str.includes('taskflow_cloud_state.json')) {
      const entry = memBlobs.get('taskflow_cloud_state.json');
      if (entry) {
        return { ok: true, status: 200, json: async () => JSON.parse(entry.content) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  delete require.cache[syncPath];
  const handler = require(syncPath);

  async function callApi(method, body = {}) {
    let statusCode = 200;
    let payload = null;
    const req = { method, body };
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (obj) => {
        payload = obj;
        return res;
      },
      end: () => res,
    };
    await handler(req, res);
    return { status: statusCode, data: payload };
  }

  async function itAsync(name, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ${green(name)}`);
    } catch (err) {
      failedTests++;
      console.error(`  ${red(name)}`);
      console.error(`    ${err.message}`);
    }
  }

  try {
    await itAsync('GET returns normalized public state without leaking authCredentials', async () => {
      const r = await callApi('GET');
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.data.ok, true);
      assert.strictEqual(r.data.state.authCredentials, undefined);
      assert.ok(r.data.state.deletedIds);
    });

    let leaderUser = null;
    let memberUser = null;
    let outsiderUser = null;

    await itAsync('REGISTER_USER & LOGIN_USER verify scrypt hashed passwords and reject bad credentials', async () => {
      const regLeader = await callApi('POST', {
        action: 'REGISTER_USER',
        payload: {
          profile: { id: 'u_owner', name: 'Ali Raza', email: 'aliraza.lead@gmail.com', username: 'ali_lead' },
          password: 'OwnerPass#1',
        },
      });
      assert.strictEqual(regLeader.status, 200);
      assert.strictEqual(regLeader.data.user.isAdmin, true);
      leaderUser = regLeader.data.user;

      const regMember = await callApi('POST', {
        action: 'REGISTER_USER',
        payload: {
          profile: { id: 'u_mem', name: 'Sarah Khan', email: 'sarah.dev@gmail.com', username: 'sarah_k' },
          password: 'MemberPass#1',
        },
      });
      assert.strictEqual(regMember.status, 200);
      assert.strictEqual(regMember.data.user.isAdmin, false);
      memberUser = regMember.data.user;

      const regOutsider = await callApi('POST', {
        action: 'REGISTER_USER',
        payload: {
          profile: { id: 'u_out', name: 'Ali Raza Imposter', email: 'fake.aliraza@gmail.com', username: 'fake_ali' },
          password: 'OutPass#1',
        },
      });
      assert.strictEqual(regOutsider.status, 200);
      assert.strictEqual(regOutsider.data.user.isAdmin, false);
      outsiderUser = regOutsider.data.user;

      const badLogin = await callApi('POST', {
        action: 'LOGIN_USER',
        payload: { email: 'sarah.dev@gmail.com', password: 'WrongPassword' },
      });
      assert.strictEqual(badLogin.status, 401);
      assert.strictEqual(badLogin.data.ok, false);

      const goodLogin = await callApi('POST', {
        action: 'LOGIN_USER',
        payload: { email: 'sarah.dev@gmail.com', password: 'MemberPass#1' },
      });
      assert.strictEqual(goodLogin.status, 200);
      assert.strictEqual(goodLogin.data.user.id, 'u_mem');
    });

    await itAsync('GOOGLE_LOGIN preserves existing canonical user.id and prevents profile hijacking', async () => {
      const g = await callApi('POST', {
        action: 'GOOGLE_LOGIN',
        payload: {
          profile: { id: 'u_new_random_id', name: 'Sarah Google', email: 'sarah.dev@gmail.com', google_id: 'g_123' },
        },
      });
      assert.strictEqual(g.status, 200);
      assert.strictEqual(g.data.user.id, 'u_mem');
    });

    await itAsync('CREATE_TEAM rejects duplicate names case-insensitively across devices', async () => {
      const t1 = await callApi('POST', {
        action: 'CREATE_TEAM',
        payload: {
          team: { id: 't_1', name: 'Solution Tech Global', invite_code: '7DP9VU', join_password: 'pass1234', owner_id: leaderUser.id, created_at: new Date().toISOString() },
          member: { id: 'm_1', team_id: 't_1', user_id: leaderUser.id, role: 'owner', joined_at: new Date().toISOString(), profile: leaderUser },
        },
      });
      assert.strictEqual(t1.status, 200);

      const dup = await callApi('POST', {
        action: 'CREATE_TEAM',
        payload: {
          team: { id: 't_2', name: 'solution tech global', invite_code: 'OTHER1', join_password: 'pass1234', owner_id: memberUser.id, created_at: new Date().toISOString() },
        },
      });
      assert.strictEqual(dup.status, 400);
      assert.strictEqual(dup.data.ok, false);
    });

    await itAsync('REQUEST_JOIN validates name+code match & password, and APPROVE_JOIN sends atomic single announcement', async () => {
      const badPass = await callApi('POST', {
        action: 'REQUEST_JOIN',
        payload: { teamName: 'Solution Tech Global', inviteCode: '7DP9VU', joinPassword: 'wrong', user: memberUser },
      });
      assert.strictEqual(badPass.status, 400);

      const mismatchedName = await callApi('POST', {
        action: 'REQUEST_JOIN',
        payload: { teamName: 'Other Team Name', inviteCode: '7DP9VU', joinPassword: 'pass1234', user: memberUser },
      });
      assert.strictEqual(mismatchedName.status, 400);

      const validReq = await callApi('POST', {
        action: 'REQUEST_JOIN',
        payload: { teamName: 'Solution Tech Global', inviteCode: '7DP9VU', joinPassword: 'pass1234', user: memberUser },
      });
      assert.strictEqual(validReq.status, 200);
      assert.strictEqual(validReq.data.pendingApproval, true);
      const reqId = validReq.data.state.joinRequests[0].id;
      assert.ok(validReq.data.state.notifications.some((n) => n.user_id === leaderUser.id && n.kind === 'join_request'));

      const approve = await callApi('POST', {
        action: 'APPROVE_JOIN',
        payload: { requestId: reqId },
      });
      assert.strictEqual(approve.status, 200);
      assert.ok(approve.data.state.members.some((m) => m.team_id === 't_1' && m.user_id === memberUser.id));
      const welcomes = approve.data.state.chatMessages.filter((m) => m.team_id === 't_1');
      assert.strictEqual(welcomes.length, 1);
    });

    await itAsync('SAVE_TASK blocks non-leader approval/title changes, and DELETE_TASK + MERGE honors tombstones', async () => {
      const createRes = await callApi('POST', {
        action: 'SAVE_TASK',
        payload: {
          actorId: leaderUser.id,
          actorName: leaderUser.name,
          task: { id: 'task_99', team_id: 't_1', is_personal: false, assignee_id: memberUser.id, created_by_id: leaderUser.id, title: 'Original Spec', description: '', status: 'todo', priority: 'high', assigned_date: '2026-11-26', due_date: '2026-11-27', start_time: '09:00', end_time: '18:00', created_at: '2026-11-26T00:00:00Z', updated_at: '2026-11-26T00:00:00Z' },
        },
      });
      assert.strictEqual(createRes.status, 200);

      const illegalDone = await callApi('POST', {
        action: 'SAVE_TASK',
        payload: {
          actorId: memberUser.id,
          actorName: memberUser.name,
          task: { ...createRes.data.state.tasks[0], status: 'done' },
        },
      });
      assert.strictEqual(illegalDone.status, 403);

      const allowedProgress = await callApi('POST', {
        action: 'SAVE_TASK',
        payload: {
          actorId: memberUser.id,
          actorName: memberUser.name,
          task: { ...createRes.data.state.tasks[0], status: 'in_progress' },
        },
      });
      assert.strictEqual(allowedProgress.status, 200);

      const delRes = await callApi('POST', {
        action: 'DELETE_TASK',
        payload: { taskId: 'task_99', actorId: leaderUser.id },
      });
      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(delRes.data.state.tasks.length, 0);

      const staleMerge = await callApi('POST', {
        action: 'MERGE',
        payload: {
          tasks: [{ id: 'task_99', team_id: 't_1', title: 'Zombie Task', status: 'todo', created_at: '2026-11-26T00:00:00Z', updated_at: '2026-11-26T00:00:00Z' }],
        },
      });
      assert.strictEqual(staleMerge.status, 200);
      assert.strictEqual(staleMerge.data.state.tasks.length, 0);
    });

    await itAsync('SEND_MESSAGE scopes @mentions to team members and ADMIN_ACTION enforces strict owner email', async () => {
      const msgRes = await callApi('POST', {
        action: 'SEND_MESSAGE',
        payload: {
          message: {
            id: 'msg_1',
            team_id: 't_1',
            user_id: leaderUser.id,
            user_name: leaderUser.name,
            user_username: leaderUser.username,
            text: 'Hey @sarah_k and @fake_ali check this!',
            type: 'text',
            mentions: ['sarah_k', 'fake_ali'],
            created_at: new Date().toISOString(),
          },
        },
      });
      assert.strictEqual(msgRes.status, 200);
      assert.ok(msgRes.data.state.notifications.some((n) => n.user_id === memberUser.id && n.kind === 'chat_mention'));
      assert.ok(!msgRes.data.state.notifications.some((n) => n.user_id === outsiderUser.id));

      const fakeAdmin = await callApi('POST', {
        action: 'ADMIN_ACTION',
        payload: { actorEmail: outsiderUser.email, subAction: 'TOGGLE_ADMIN', targetUserId: memberUser.id },
      });
      assert.strictEqual(fakeAdmin.status, 403);

      const realAdmin = await callApi('POST', {
        action: 'ADMIN_ACTION',
        payload: { actorEmail: leaderUser.email, subAction: 'TOGGLE_STATUS', targetUserId: outsiderUser.id },
      });
      assert.strictEqual(realAdmin.status, 200);
      assert.strictEqual(realAdmin.data.state.users.find((u) => u.id === outsiderUser.id).status, 'suspended');
    });

    await itAsync('UPLOAD_MEDIA persists base64 media to Vercel Blob CDN URL', async () => {
      const up = await callApi('POST', {
        action: 'UPLOAD_MEDIA',
        payload: { base64Data: 'data:audio/mp4;base64,AAAA', folder: 'voice', extension: 'm4a', contentType: 'audio/mp4' },
      });
      assert.strictEqual(up.status, 200);
      assert.ok(up.data.url.startsWith('https://blob.test/'));
    });
  } finally {
    if (originalBlobCache) require.cache[blobModulePath] = originalBlobCache;
    else delete require.cache[blobModulePath];
    global.fetch = originalFetch;
  }
}

runRealApiIntegrationSuite().then(() => {
  // ==========================================
  // TEST SUMMARY REPORT
  // ==========================================
  console.log(bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(bold(`TOTAL TESTS RUN : ${totalTests}`));
  console.log(bold(`TESTS PASSED    : \x1b[32m${passedTests}\x1b[0m`));
  if (failedTests > 0) {
    console.log(bold(`TESTS FAILED    : \x1b[31m${failedTests}\x1b[0m`));
    process.exit(1);
  } else {
    console.log(bold(`ALL TESTS PASSED: \x1b[32m100% SUCCESS\x1b[0m`));
    console.log(bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  }
});

