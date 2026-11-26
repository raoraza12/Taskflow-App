const { put, list } = require('@vercel/blob');
const crypto = require('crypto');

const BLOB_FILENAME = 'taskflow_cloud_state.json';
const DIRECT_BLOB_URL = 'https://md2eaxjhibirncd2.public.blob.vercel-storage.com/taskflow_cloud_state.json';
const SUPER_ADMIN_EMAIL = 'aliraza.lead@gmail.com';
const MAX_TOMBSTONES = 500;
const MAX_NOTIFICATIONS = 400;
const MAX_MESSAGES = 500;
const LEGACY_TEST_TEAM_IDS = new Set(['team_sprint_alpha', 'team_test1', 'team_7dp9vu']);
const LEGACY_TEST_USER_IDS = new Set(['user_1', 'user_friend_1', 'user_seed_sarah', 'user_seed_hamza', 'user_seed_zainab', 'user_seed_ali']);

function isLegacyTestTeam(t) {
  return !t || LEGACY_TEST_TEAM_IDS.has(t.id) || t.owner_id === 'leader_remote';
}

function isLegacyTestUser(u) {
  return !u || LEGACY_TEST_USER_IDS.has(u.id) || (u.email && u.email.toLowerCase() === 'zohaib@example.com');
}

function defaultDeletedIds() {
  return {
    teams: [],
    members: [],
    tasks: [],
    subtasks: [],
    messages: [],
  };
}

function createDefaultState() {
  return {
    teams: [],
    members: [],
    tasks: [],
    subtasks: [],
    chatMessages: [],
    joinRequests: [],
    connections: [],
    notifications: [],
    users: [],
    deletedIds: defaultDeletedIds(),
    authCredentials: {},
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeDeletedIds(raw) {
  const d = raw || {};
  return {
    teams: Array.isArray(d.teams) ? d.teams.slice(-MAX_TOMBSTONES) : [],
    members: Array.isArray(d.members) ? d.members.slice(-MAX_TOMBSTONES) : [],
    tasks: Array.isArray(d.tasks) ? d.tasks.slice(-MAX_TOMBSTONES) : [],
    subtasks: Array.isArray(d.subtasks) ? d.subtasks.slice(-MAX_TOMBSTONES) : [],
    messages: Array.isArray(d.messages) ? d.messages.slice(-MAX_TOMBSTONES) : [],
  };
}

function addTombstone(listArr, id) {
  if (!id) return listArr;
  if (listArr.includes(id)) return listArr;
  return [...listArr, id].slice(-MAX_TOMBSTONES);
}

function removeTombstone(listArr, id) {
  return listArr.filter((x) => x !== id);
}

function isStrictSuperAdminEmail(email) {
  return Boolean(email && String(email).trim().toLowerCase() === SUPER_ADMIN_EMAIL);
}

function hashPassword(password, existingSalt) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const derived = crypto.scryptSync(String(password), salt, 32);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

/**
 * Strip private authCredentials before returning state to clients.
 */
function toPublicState(state) {
  return {
    teams: state.teams || [],
    members: state.members || [],
    tasks: state.tasks || [],
    subtasks: state.subtasks || [],
    chatMessages: state.chatMessages || [],
    joinRequests: state.joinRequests || [],
    connections: state.connections || [],
    notifications: state.notifications || [],
    users: state.users || [],
    deletedIds: state.deletedIds || defaultDeletedIds(),
    lastUpdated: state.lastUpdated || new Date().toISOString(),
  };
}

function normalizeLoadedState(data) {
  const d = data || {};
  const deletedIds = normalizeDeletedIds(d.deletedIds);
  const delTeams = new Set(deletedIds.teams);
  const delMembers = new Set(deletedIds.members);
  const delTasks = new Set(deletedIds.tasks);
  const delSubtasks = new Set(deletedIds.subtasks);

  return {
    teams: (Array.isArray(d.teams) ? d.teams : []).filter((t) => !isLegacyTestTeam(t) && !delTeams.has(t.id)),
    members: (Array.isArray(d.members) ? d.members : []).filter((m) => m && !LEGACY_TEST_TEAM_IDS.has(m.team_id) && !LEGACY_TEST_USER_IDS.has(m.user_id) && !delMembers.has(`${m.team_id}_${m.user_id}`) && !delTeams.has(m.team_id)),
    tasks: (Array.isArray(d.tasks) ? d.tasks : []).filter((t) => t && !LEGACY_TEST_TEAM_IDS.has(t.team_id) && !delTasks.has(t.id) && (!t.team_id || !delTeams.has(t.team_id))),
    subtasks: (Array.isArray(d.subtasks) ? d.subtasks : []).filter((s) => s && !delSubtasks.has(s.id) && !delTasks.has(s.task_id)),
    chatMessages: (Array.isArray(d.chatMessages) ? d.chatMessages : []).filter((m) => m && !LEGACY_TEST_TEAM_IDS.has(m.team_id) && !String(m.id || '').startsWith('msg_seed_') && !delTeams.has(m.team_id)).slice(-MAX_MESSAGES),
    joinRequests: (Array.isArray(d.joinRequests) ? d.joinRequests : []).filter((r) => r && !LEGACY_TEST_TEAM_IDS.has(r.team_id) && !LEGACY_TEST_USER_IDS.has(r.user_id) && !delTeams.has(r.team_id)),
    connections: Array.isArray(d.connections) ? d.connections : [],
    notifications: (Array.isArray(d.notifications) ? d.notifications : []).filter((n) => n && !LEGACY_TEST_USER_IDS.has(n.user_id)).slice(0, MAX_NOTIFICATIONS),
    users: (Array.isArray(d.users) ? d.users : []).filter((u) => !isLegacyTestUser(u)),
    deletedIds,
    authCredentials: d.authCredentials && typeof d.authCredentials === 'object' ? d.authCredentials : {},
    lastUpdated: d.lastUpdated || new Date().toISOString(),
  };
}

async function getCloudState() {
  try {
    const directRes = await fetch(`${DIRECT_BLOB_URL}?t=${Date.now()}`);
    if (directRes.ok) {
      const data = await directRes.json();
      return normalizeLoadedState(data);
    }
  } catch (_) {}

  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    const targetBlob = blobs.find((b) => b.pathname === BLOB_FILENAME || b.pathname.endsWith(BLOB_FILENAME));
    if (!targetBlob || !targetBlob.url) {
      return createDefaultState();
    }
    const res = await fetch(`${targetBlob.url}?t=${Date.now()}`);
    if (!res.ok) return createDefaultState();
    const data = await res.json();
    return normalizeLoadedState(data);
  } catch (err) {
    console.error('getCloudState error:', err);
    return createDefaultState();
  }
}

async function flushExpoPushBatch(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages.slice(0, 100)),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (timer) clearTimeout(timer);
  } catch {
    // Best-effort remote push dispatch; in-app notifications are already persisted
  }
}

async function saveCloudState(state) {
  const pushBatch = Array.isArray(state._pushQueue) ? [...state._pushQueue] : [];
  state.lastUpdated = new Date().toISOString();
  state.notifications = (state.notifications || []).slice(0, MAX_NOTIFICATIONS);
  state.chatMessages = (state.chatMessages || []).slice(-MAX_MESSAGES);

  const persistable = { ...state };
  delete persistable._pushQueue;

  const jsonStr = JSON.stringify(persistable);
  await put(BLOB_FILENAME, jsonStr, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });

  if (pushBatch.length > 0) {
    await flushExpoPushBatch(pushBatch);
  }
  return persistable;
}

function canManageTeamInState(state, teamId, actorId) {
  if (!actorId) return false;
  const actorUser = (state.users || []).find((u) => u.id === actorId);
  if (actorUser && isStrictSuperAdminEmail(actorUser.email)) return true;
  if (!teamId) return false;
  const team = (state.teams || []).find((t) => t.id === teamId);
  if (team && team.owner_id === actorId) return true;
  const mem = (state.members || []).find((m) => m.team_id === teamId && m.user_id === actorId);
  return Boolean(mem && (mem.role === 'owner' || mem.role === 'admin'));
}

function queuePush(state, targetUserId, { title, body, data }) {
  if (!targetUserId) return;
  const recipient = (state.users || []).find((u) => u.id === targetUserId);
  const token = recipient?.expo_push_token;
  if (
    typeof token !== 'string' ||
    (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken['))
  ) {
    return;
  }
  if (!Array.isArray(state._pushQueue)) state._pushQueue = [];
  state._pushQueue.push({
    to: token,
    sound: 'default',
    priority: 'high',
    title,
    body,
    data: data || {},
  });
}

function pushNotification(state, notif) {
  state.notifications = [notif, ...(state.notifications || []).filter((n) => n.id !== notif.id)].slice(0, MAX_NOTIFICATIONS);
  queuePush(state, notif.user_id, {
    title: notif.title,
    body: notif.body,
    data: {
      kind: notif.kind,
      taskId: notif.related_task_id,
      teamId: notif.related_team_id,
      joinRequestId: notif.related_join_request_id,
      connectionId: notif.related_connection_id,
    },
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const state = await getCloudState();
      return res.status(200).json({ ok: true, state: toPublicState(state) });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (_e) {
          body = {};
        }
      }
      body = body || {};
      const { action, payload } = body;

      // Media Upload endpoint (voice notes, avatars, task attachments -> lightweight CDN URLs)
      if (action === 'UPLOAD_MEDIA') {
        const { base64Data, folder = 'media', extension = 'm4a', contentType = 'audio/mp4' } = payload || {};
        if (!base64Data) {
          return res.status(400).json({ ok: false, error: 'Missing media payload' });
        }
        const stripped = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
        const buf = Buffer.from(stripped, 'base64');
        const safeFolder = String(folder).replace(/[^a-zA-Z0-9_-]/g, '') || 'media';
        const safeExt = String(extension).replace(/[^a-zA-Z0-9]/g, '') || 'bin';
        const blobPath = `${safeFolder}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${safeExt}`;
        const uploaded = await put(blobPath, buf, {
          access: 'public',
          addRandomSuffix: false,
          contentType,
        });
        return res.status(200).json({ ok: true, url: uploaded.url });
      }

      const state = await getCloudState();

      if (action === 'REGISTER_USER') {
        const { profile, password } = payload || {};
        const cleanEmail = (profile?.email || '').trim().toLowerCase();
        if (!cleanEmail || !profile?.name) {
          return res.status(400).json({ ok: false, error: 'Name and email are required' });
        }
        if (!password || String(password).length < 6) {
          return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
        }
        const existingUser = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existingUser) {
          return res.status(400).json({ ok: false, error: 'Account with this email already exists. Please Sign In.' });
        }
        const canonicalProfile = {
          ...profile,
          email: cleanEmail,
          isAdmin: isStrictSuperAdminEmail(cleanEmail),
          status: 'active',
        };
        state.users.push(canonicalProfile);
        state.authCredentials[cleanEmail] = {
          userId: canonicalProfile.id,
          hash: hashPassword(password),
        };
        await saveCloudState(state);
        return res.status(200).json({ ok: true, user: canonicalProfile, state: toPublicState(state) });
      }

      if (action === 'LOGIN_USER') {
        const { email, password } = payload || {};
        const cleanEmail = (email || '').trim().toLowerCase();
        const existingUser = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
        const cred = state.authCredentials[cleanEmail];
        if (!existingUser || !cred || !verifyPassword(password, cred.hash)) {
          return res.status(401).json({ ok: false, error: 'Invalid email or password. Please check your credentials.' });
        }
        if (existingUser.status === 'suspended') {
          return res.status(403).json({ ok: false, error: 'This account has been suspended by the Workspace Admin.' });
        }
        return res.status(200).json({ ok: true, user: existingUser, state: toPublicState(state) });
      }

      if (action === 'RESET_USER_PASSWORD') {
        const { email, newPassword } = payload || {};
        const cleanEmail = (email || '').trim().toLowerCase();
        const existingUser = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (!existingUser) {
          return res.status(404).json({ ok: false, error: 'No account found with this email.' });
        }
        if (!newPassword || String(newPassword).length < 4) {
          return res.status(400).json({ ok: false, error: 'Password must be at least 4 characters.' });
        }
        state.authCredentials[cleanEmail] = {
          userId: existingUser.id,
          hash: hashPassword(newPassword),
        };
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'GOOGLE_LOGIN') {
        const { profile } = payload || {};
        const cleanEmail = (profile?.email || '').trim().toLowerCase();
        if (!cleanEmail) {
          return res.status(400).json({ ok: false, error: 'Email is required' });
        }
        const existingIdx = state.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
        let canonicalUser;
        const ownerFlag = isStrictSuperAdminEmail(cleanEmail);
        if (existingIdx !== -1) {
          const existing = state.users[existingIdx];
          if (existing.status === 'suspended') {
            return res.status(403).json({ ok: false, error: 'This account has been suspended by the Workspace Admin.' });
          }
          canonicalUser = {
            ...existing,
            google_id: profile.google_id || existing.google_id,
            name: profile.name || existing.name,
            picture: profile.picture || existing.picture,
            email_verified: true,
            isAdmin: ownerFlag || Boolean(existing.isAdmin && isStrictSuperAdminEmail(existing.email)),
          };
          state.users[existingIdx] = canonicalUser;
          state.members = state.members.map((m) => (m.user_id === canonicalUser.id ? { ...m, profile: canonicalUser } : m));
        } else {
          canonicalUser = {
            ...profile,
            email: cleanEmail,
            email_verified: true,
            isAdmin: ownerFlag,
            status: 'active',
          };
          state.users.push(canonicalUser);
        }
        await saveCloudState(state);
        return res.status(200).json({ ok: true, user: canonicalUser, state: toPublicState(state) });
      }

      if (action === 'UPDATE_PROFILE') {
        const { userId, patch } = payload || {};
        const idx = state.users.findIndex((u) => u.id === userId);
        if (idx === -1) {
          return res.status(404).json({ ok: false, error: 'User profile not found' });
        }
        const current = state.users[idx];
        let nextUsername = current.username;
        if (patch?.username !== undefined) {
          const cand = String(patch.username).trim().toLowerCase().replace(/^@/, '');
          const taken = state.users.some((u) => u.id !== userId && u.username && u.username.toLowerCase() === cand);
          if (taken) {
            return res.status(400).json({ ok: false, error: `@${cand} is already taken. Please choose another username.` });
          }
          nextUsername = cand;
        }
        const updatedUser = {
          ...current,
          ...(patch?.name ? { name: String(patch.name).trim() } : {}),
          ...(patch?.picture !== undefined ? { picture: patch.picture } : {}),
          ...(patch?.bio !== undefined ? { bio: String(patch.bio).trim() } : {}),
          ...(patch?.job_title !== undefined ? { job_title: String(patch.job_title).trim() } : {}),
          username: nextUsername,
        };
        state.users[idx] = updatedUser;
        state.members = state.members.map((m) => (m.user_id === userId ? { ...m, profile: updatedUser } : m));
        await saveCloudState(state);
        return res.status(200).json({ ok: true, user: updatedUser, state: toPublicState(state) });
      }

      if (action === 'MERGE') {
        const incoming = payload || {};
        const incomingDeleted = normalizeDeletedIds(incoming.deletedIds);
        incomingDeleted.teams.forEach((id) => { state.deletedIds.teams = addTombstone(state.deletedIds.teams, id); });
        incomingDeleted.members.forEach((id) => { state.deletedIds.members = addTombstone(state.deletedIds.members, id); });
        incomingDeleted.tasks.forEach((id) => { state.deletedIds.tasks = addTombstone(state.deletedIds.tasks, id); });
        incomingDeleted.subtasks.forEach((id) => { state.deletedIds.subtasks = addTombstone(state.deletedIds.subtasks, id); });

        const delTeams = new Set(state.deletedIds.teams);
        const delMembers = new Set(state.deletedIds.members);
        const delTasks = new Set(state.deletedIds.tasks);
        const delSubtasks = new Set(state.deletedIds.subtasks);

        const teamMap = new Map();
        state.teams.filter((t) => !isLegacyTestTeam(t) && !delTeams.has(t.id)).forEach((t) => teamMap.set(t.id, t));
        (incoming.teams || []).filter((t) => !isLegacyTestTeam(t) && !delTeams.has(t.id)).forEach((t) => {
          if (!teamMap.has(t.id)) teamMap.set(t.id, t);
        });
        state.teams = Array.from(teamMap.values());

        const memberMap = new Map();
        state.members.filter((m) => m && !LEGACY_TEST_TEAM_IDS.has(m.team_id) && !LEGACY_TEST_USER_IDS.has(m.user_id) && !delMembers.has(`${m.team_id}_${m.user_id}`) && !delTeams.has(m.team_id)).forEach((m) => memberMap.set(`${m.team_id}_${m.user_id}`, m));
        (incoming.members || []).filter((m) => m && !LEGACY_TEST_TEAM_IDS.has(m.team_id) && !LEGACY_TEST_USER_IDS.has(m.user_id) && !delMembers.has(`${m.team_id}_${m.user_id}`) && !delTeams.has(m.team_id)).forEach((m) => {
          const key = `${m.team_id}_${m.user_id}`;
          if (!memberMap.has(key)) memberMap.set(key, m);
        });
        state.members = Array.from(memberMap.values());

        const taskMap = new Map();
        state.tasks.filter((t) => t && !LEGACY_TEST_TEAM_IDS.has(t.team_id) && !delTasks.has(t.id) && (!t.team_id || !delTeams.has(t.team_id))).forEach((t) => taskMap.set(t.id, t));
        (incoming.tasks || []).filter((t) => t && !LEGACY_TEST_TEAM_IDS.has(t.team_id) && !delTasks.has(t.id) && (!t.team_id || !delTeams.has(t.team_id))).forEach((t) => {
          const prev = taskMap.get(t.id);
          if (!prev || new Date(t.updated_at || 0).getTime() > new Date(prev.updated_at || 0).getTime()) {
            taskMap.set(t.id, t);
          }
        });
        state.tasks = Array.from(taskMap.values());

        const subtaskMap = new Map();
        state.subtasks.filter((s) => s && !delSubtasks.has(s.id) && !delTasks.has(s.task_id)).forEach((s) => subtaskMap.set(s.id, s));
        (incoming.subtasks || []).filter((s) => s && !delSubtasks.has(s.id) && !delTasks.has(s.task_id)).forEach((s) => {
          if (!subtaskMap.has(s.id)) subtaskMap.set(s.id, s);
        });
        state.subtasks = Array.from(subtaskMap.values());

        const chatMap = new Map();
        state.chatMessages.filter((m) => m && !LEGACY_TEST_TEAM_IDS.has(m.team_id) && !String(m.id || '').startsWith('msg_seed_') && !delTeams.has(m.team_id)).forEach((m) => chatMap.set(m.id, m));
        (incoming.chatMessages || []).filter((m) => m && !LEGACY_TEST_TEAM_IDS.has(m.team_id) && !String(m.id || '').startsWith('msg_seed_') && !delTeams.has(m.team_id)).forEach((m) => {
          if (!chatMap.has(m.id)) chatMap.set(m.id, m);
        });
        state.chatMessages = Array.from(chatMap.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const reqMap = new Map();
        state.joinRequests.filter((r) => r && !LEGACY_TEST_TEAM_IDS.has(r.team_id) && !LEGACY_TEST_USER_IDS.has(r.user_id) && !delTeams.has(r.team_id)).forEach((r) => reqMap.set(r.id, r));
        (incoming.joinRequests || []).filter((r) => r && !LEGACY_TEST_TEAM_IDS.has(r.team_id) && !LEGACY_TEST_USER_IDS.has(r.user_id) && !delTeams.has(r.team_id)).forEach((r) => {
          if (!reqMap.has(r.id)) reqMap.set(r.id, r);
        });
        state.joinRequests = Array.from(reqMap.values());

        const connMap = new Map();
        state.connections.forEach((c) => connMap.set(c.id, c));
        (incoming.connections || []).forEach((c) => {
          if (c && !connMap.has(c.id)) connMap.set(c.id, c);
        });
        state.connections = Array.from(connMap.values());

        const notifMap = new Map();
        state.notifications.filter((n) => n && !LEGACY_TEST_USER_IDS.has(n.user_id)).forEach((n) => notifMap.set(n.id, n));
        (incoming.notifications || []).filter((n) => n && !LEGACY_TEST_USER_IDS.has(n.user_id)).forEach((n) => {
          if (n && !notifMap.has(n.id)) notifMap.set(n.id, n);
        });
        state.notifications = Array.from(notifMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Deduplicate users by email first, skipping legacy seed/test profiles
        const userByEmail = new Map();
        state.users.filter((u) => !isLegacyTestUser(u)).forEach((u) => {
          if (u?.email) userByEmail.set(u.email.trim().toLowerCase(), u);
        });
        (incoming.users || []).forEach((u) => {
          if (isLegacyTestUser(u) || !u?.email) return;
          const cleanE = u.email.trim().toLowerCase();
          if (!userByEmail.has(cleanE)) {
            userByEmail.set(cleanE, { ...u, isAdmin: isStrictSuperAdminEmail(cleanE) });
          }
        });
        state.users = Array.from(userByEmail.values());

        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'CREATE_TEAM') {
        const { team, member } = payload || {};
        if (!team || !team.name) {
          return res.status(400).json({ ok: false, error: 'Team name is required' });
        }
        const cleanName = team.name.trim().toLowerCase();
        const exists = state.teams.some((t) => t.name.trim().toLowerCase() === cleanName);
        if (exists) {
          return res.status(400).json({
            ok: false,
            error: `Team name "${team.name}" is already registered. Please choose a different team name.`,
          });
        }
        state.deletedIds.teams = removeTombstone(state.deletedIds.teams, team.id);
        state.teams = [team, ...state.teams];
        if (member) {
          state.deletedIds.members = removeTombstone(state.deletedIds.members, `${member.team_id}_${member.user_id}`);
          state.members = [member, ...state.members];
        }
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state), team });
      }

      if (action === 'RENAME_TEAM') {
        const { teamId, actorId, newName } = payload || {};
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return res.status(404).json({ ok: false, error: 'Team not found' });
        if (!canManageTeamInState(state, teamId, actorId)) {
          return res.status(403).json({ ok: false, error: 'Only team leader can rename the team' });
        }
        const clean = (newName || '').trim();
        if (!clean) return res.status(400).json({ ok: false, error: 'Team name cannot be empty' });
        const dup = state.teams.some((t) => t.id !== teamId && t.name.trim().toLowerCase() === clean.toLowerCase());
        if (dup) {
          return res.status(400).json({ ok: false, error: `Team name "${clean}" is already registered.` });
        }
        state.teams = state.teams.map((t) => (t.id === teamId ? { ...t, name: clean } : t));
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'REQUEST_JOIN') {
        const { teamName, inviteCode, joinPassword, user } = payload || {};
        if (!user || !user.id) {
          return res.status(400).json({ ok: false, error: 'Valid user session required' });
        }
        const cleanCode = (inviteCode || '').trim().toUpperCase();
        const cleanName = (teamName || '').trim().toLowerCase();
        const cleanPass = (joinPassword || '').trim();

        let targetTeam = cleanCode
          ? state.teams.find((t) => t.invite_code && t.invite_code.trim().toUpperCase() === cleanCode)
          : undefined;

        if (targetTeam && cleanName && targetTeam.name && targetTeam.name.trim().toLowerCase() !== cleanName) {
          return res.status(400).json({
            ok: false,
            error: `Invite code "${cleanCode}" belongs to a different team name. Please verify exact Team Name & Invite Code with your Team Leader.`,
          });
        }

        if (!targetTeam && cleanName) {
          const teamByName = state.teams.find((t) => t.name && t.name.trim().toLowerCase() === cleanName);
          if (teamByName && cleanCode && teamByName.invite_code.trim().toUpperCase() !== cleanCode) {
            return res.status(400).json({
              ok: false,
              error: `6-digit Invite Code "${cleanCode}" is incorrect for team "${teamByName.name}".`,
            });
          }
          targetTeam = teamByName;
        }

        if (!targetTeam) {
          return res.status(404).json({
            ok: false,
            error: `Workspace not found. Please verify the Team Name & 6-digit invite code (${cleanCode}) provided by your Team Leader.`,
          });
        }

        const storedPass = (targetTeam.join_password || '').trim();
        if (storedPass && storedPass !== cleanPass) {
          return res.status(400).json({
            ok: false,
            error: 'Team access password is incorrect. Please check exact spelling & case from your Team Leader.',
          });
        }

        const alreadyMember = state.members.some((m) => m.team_id === targetTeam.id && m.user_id === user.id);
        if (alreadyMember) {
          return res.status(200).json({ ok: true, team: targetTeam, alreadyMember: true, state: toPublicState(state) });
        }

        const existingReq = state.joinRequests.find(
          (r) => r.team_id === targetTeam.id && r.user_id === user.id && r.status === 'pending'
        );
        if (existingReq) {
          return res.status(200).json({
            ok: true,
            team: targetTeam,
            pendingApproval: true,
            message: 'Your join request is already pending Leader approval.',
            state: toPublicState(state),
          });
        }

        const newReq = {
          id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          team_id: targetTeam.id,
          user_id: user.id,
          status: 'pending',
          created_at: new Date().toISOString(),
          profile: user,
          team: targetTeam,
        };
        state.joinRequests = [newReq, ...state.joinRequests];
        if (!state.users.some((u) => u.id === user.id)) {
          state.users.push({ ...user, isAdmin: isStrictSuperAdminEmail(user.email) });
        }

        // Persist notification for Team Owner so Leader sees it in Alerts tab immediately
        pushNotification(state, {
          id: `notif_req_${newReq.id}`,
          user_id: targetTeam.owner_id,
          kind: 'join_request',
          title: 'New Member Join Request',
          body: `${user.name} (@${user.username || 'member'}) has requested to join "${targetTeam.name}"`,
          read: false,
          related_join_request_id: newReq.id,
          created_at: new Date().toISOString(),
        });

        await saveCloudState(state);
        return res.status(200).json({ ok: true, team: targetTeam, pendingApproval: true, state: toPublicState(state) });
      }

      if (action === 'APPROVE_JOIN') {
        const { requestId } = payload || {};
        const reqIndex = state.joinRequests.findIndex((r) => r.id === requestId);
        if (reqIndex === -1) {
          return res.status(404).json({ ok: false, error: 'Join request not found' });
        }
        const joinReq = state.joinRequests[reqIndex];
        if (joinReq.status !== 'pending') {
          return res.status(200).json({ ok: true, alreadyResolved: true, state: toPublicState(state) });
        }

        joinReq.status = 'approved';
        joinReq.resolved_at = new Date().toISOString();
        const team = state.teams.find((t) => t.id === joinReq.team_id) || joinReq.team;
        const memberKey = `${joinReq.team_id}_${joinReq.user_id}`;
        state.deletedIds.members = removeTombstone(state.deletedIds.members, memberKey);

        const newMember = {
          id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          team_id: joinReq.team_id,
          user_id: joinReq.user_id,
          role: 'member',
          joined_at: new Date().toISOString(),
          profile: state.users.find((u) => u.id === joinReq.user_id) || joinReq.profile,
        };

        const existingPeers = state.members.filter((m) => m.team_id === joinReq.team_id && m.user_id !== joinReq.user_id);
        if (!state.members.some((m) => m.team_id === joinReq.team_id && m.user_id === joinReq.user_id)) {
          state.members = [newMember, ...state.members];
        }

        // Single atomic group chat welcome announcement
        state.chatMessages = [
          ...state.chatMessages,
          {
            id: `msg_join_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            team_id: joinReq.team_id,
            user_id: 'system',
            user_name: 'TaskFlow Bot',
            user_username: 'taskflow_bot',
            user_avatar: '',
            text: `🎉 Welcome ${joinReq.profile?.name || 'New Member'} to "${team?.name || 'the team'}"!`,
            type: 'text',
            created_at: new Date().toISOString(),
          },
        ];

        // Notifications for requester + existing team members
        pushNotification(state, {
          id: `notif_appr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          user_id: joinReq.user_id,
          kind: 'join_result',
          title: 'Join Request Approved! 🎉',
          body: `You are now a member of "${team?.name || 'the team'}"`,
          read: false,
          created_at: new Date().toISOString(),
        });
        existingPeers.forEach((m) => {
          pushNotification(state, {
            id: `notif_peer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            user_id: m.user_id,
            kind: 'team_joined',
            title: 'New Member Joined Team',
            body: `${joinReq.profile?.name || 'A new member'} joined "${team?.name || 'your team'}"`,
            read: false,
            created_at: new Date().toISOString(),
          });
        });

        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'DECLINE_JOIN') {
        const { requestId } = payload || {};
        const reqIndex = state.joinRequests.findIndex((r) => r.id === requestId);
        if (reqIndex !== -1 && state.joinRequests[reqIndex].status === 'pending') {
          const joinReq = state.joinRequests[reqIndex];
          joinReq.status = 'declined';
          joinReq.resolved_at = new Date().toISOString();
          pushNotification(state, {
            id: `notif_dec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            user_id: joinReq.user_id,
            kind: 'join_result',
            title: 'Join Request Declined',
            body: `Your request to join "${joinReq.team?.name || 'the team'}" was declined by the Team Leader.`,
            read: false,
            created_at: new Date().toISOString(),
          });
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'PROMOTE_MEMBER') {
        const { teamId, actorId, memberUserId, newRole } = payload || {};
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return res.status(404).json({ ok: false, error: 'Team not found' });
        if (team.owner_id !== actorId && !isStrictSuperAdminEmail(state.users.find((u) => u.id === actorId)?.email)) {
          return res.status(403).json({ ok: false, error: 'Only team leader can change member roles' });
        }
        state.members = state.members.map((m) =>
          m.team_id === teamId && m.user_id === memberUserId ? { ...m, role: newRole } : m
        );
        pushNotification(state, {
          id: `notif_role_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          user_id: memberUserId,
          kind: 'general',
          title: 'Team Role Updated',
          body: `Your role in "${team.name}" is now ${String(newRole).toUpperCase()}.`,
          read: false,
          created_at: new Date().toISOString(),
        });
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'REMOVE_MEMBER') {
        const { teamId, actorId, memberUserId } = payload || {};
        const team = state.teams.find((t) => t.id === teamId);
        if (!team) return res.status(404).json({ ok: false, error: 'Team not found' });
        if (!canManageTeamInState(state, teamId, actorId)) {
          return res.status(403).json({ ok: false, error: 'Only team leader/admin can remove members' });
        }
        if (memberUserId === team.owner_id) {
          return res.status(400).json({ ok: false, error: 'Cannot remove team owner' });
        }
        const removedProfile = state.users.find((u) => u.id === memberUserId);
        state.deletedIds.members = addTombstone(state.deletedIds.members, `${teamId}_${memberUserId}`);
        state.members = state.members.filter((m) => !(m.team_id === teamId && m.user_id === memberUserId));
        state.chatMessages = [
          ...state.chatMessages,
          {
            id: `msg_rem_${Date.now()}`,
            team_id: teamId,
            user_id: 'system',
            user_name: 'TaskFlow Bot',
            user_username: 'taskflow_bot',
            text: `ℹ️ ${removedProfile?.name || 'A member'} was removed from "${team.name}".`,
            type: 'text',
            created_at: new Date().toISOString(),
          },
        ];
        pushNotification(state, {
          id: `notif_rem_${Date.now()}`,
          user_id: memberUserId,
          kind: 'member_removed',
          title: 'Removed from Team',
          body: `You were removed from "${team.name}"`,
          read: false,
          created_at: new Date().toISOString(),
        });
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'LEAVE_TEAM') {
        const { teamId, userId, userName } = payload || {};
        const team = state.teams.find((t) => t.id === teamId);
        if (team && team.owner_id === userId) {
          return res.status(400).json({ ok: false, error: 'Team Leader cannot leave. Delete team instead.' });
        }
        state.deletedIds.members = addTombstone(state.deletedIds.members, `${teamId}_${userId}`);
        state.members = state.members.filter((m) => !(m.team_id === teamId && m.user_id === userId));
        const remaining = state.members.filter((m) => m.team_id === teamId);
        state.chatMessages = [
          ...state.chatMessages,
          {
            id: `msg_leave_${Date.now()}`,
            team_id: teamId,
            user_id: 'system',
            user_name: 'TaskFlow Bot',
            user_username: 'taskflow_bot',
            text: `👋 ${userName || 'A member'} has left the team.`,
            type: 'text',
            created_at: new Date().toISOString(),
          },
        ];
        remaining.forEach((m) => {
          pushNotification(state, {
            id: `notif_leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            user_id: m.user_id,
            kind: 'team_left',
            title: 'Teammate Left',
            body: `${userName || 'A teammate'} has left "${team?.name || 'the team'}"`,
            read: false,
            created_at: new Date().toISOString(),
          });
        });
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'DELETE_TEAM') {
        const { teamId, actorId, actorName } = payload || {};
        const team = state.teams.find((t) => t.id === teamId);
        if (team && actorId && team.owner_id !== actorId && !isStrictSuperAdminEmail(state.users.find((u) => u.id === actorId)?.email)) {
          return res.status(403).json({ ok: false, error: 'Only team leader can delete the team' });
        }
        if (team) {
          const peers = state.members.filter((m) => m.team_id === teamId && m.user_id !== actorId);
          peers.forEach((m) => {
            pushNotification(state, {
              id: `notif_tdel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              user_id: m.user_id,
              kind: 'team_deleted',
              title: 'Team Deleted',
              body: `⚠️ Team "${team.name}" was deleted by ${actorName || 'Leader'}.`,
              read: false,
              created_at: new Date().toISOString(),
            });
          });
        }
        const removedTaskIds = new Set(state.tasks.filter((t) => t.team_id === teamId).map((t) => t.id));
        state.deletedIds.teams = addTombstone(state.deletedIds.teams, teamId);
        removedTaskIds.forEach((tid) => {
          state.deletedIds.tasks = addTombstone(state.deletedIds.tasks, tid);
        });
        state.teams = state.teams.filter((t) => t.id !== teamId);
        state.members = state.members.filter((m) => m.team_id !== teamId);
        state.tasks = state.tasks.filter((t) => t.team_id !== teamId);
        state.subtasks = state.subtasks.filter((s) => !removedTaskIds.has(s.task_id));
        state.joinRequests = state.joinRequests.filter((r) => r.team_id !== teamId);
        state.chatMessages = state.chatMessages.filter((m) => m.team_id !== teamId);
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'REGISTER_PUSH_TOKEN') {
        const { userId, token } = payload || {};
        if (!userId || !token) {
          return res.status(400).json({ ok: false, error: 'Missing userId or token' });
        }
        state.users = state.users.map((u) =>
          u.id === userId ? { ...u, expo_push_token: token } : u
        );
        state.members = state.members.map((m) =>
          m.user_id === userId && m.profile
            ? { ...m, profile: { ...m.profile, expo_push_token: token } }
            : m
        );
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'SEND_MESSAGE') {
        const { message } = payload || {};
        if (message && (message.text || message.type === 'voice')) {
          state.chatMessages = [...state.chatMessages.filter((m) => m.id !== message.id), message];
          const team = state.teams.find((t) => t.id === message.team_id);
          const teamMembers = state.members.filter((m) => m.team_id === message.team_id);
          const teamMemberIds = new Set(teamMembers.map((m) => m.user_id));
          const mentionedIds = new Set();

          if (Array.isArray(message.mentions) && message.mentions.length > 0) {
            message.mentions.forEach((handle) => {
              const target = state.users.find(
                (u) => u.username && u.username.toLowerCase() === String(handle).toLowerCase() && teamMemberIds.has(u.id)
              );
              if (target && target.id !== message.user_id) {
                mentionedIds.add(target.id);
                pushNotification(state, {
                  id: `notif_mtn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  user_id: target.id,
                  kind: 'chat_mention',
                  title: `${message.user_name} (@${message.user_username}) mentioned you`,
                  body: message.type === 'voice' ? 'Sent a voice note mentioning you' : (message.text || ''),
                  read: false,
                  related_team_id: message.team_id,
                  created_at: new Date().toISOString(),
                });
              }
            });
          }

          // Dispatch direct remote push for non-mentioned active teammates (without flooding Alerts tab)
          if (message.user_id !== 'system') {
            teamMembers.forEach((m) => {
              if (m.user_id !== message.user_id && !mentionedIds.has(m.user_id)) {
                queuePush(state, m.user_id, {
                  title: `💬 ${team?.name || 'Team Chat'}`,
                  body: `${message.user_name}: ${message.type === 'voice' ? '🎤 Sent a voice note' : (message.text || '')}`,
                  data: { kind: 'chat_message', teamId: message.team_id },
                });
              }
            });
          }

          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'SAVE_TASK') {
        const { task, actorId, actorName, subtasks } = payload || {};
        if (task && task.id) {
          const idx = state.tasks.findIndex((t) => t.id === task.id);
          if (idx !== -1) {
            const existing = state.tasks[idx];
            const isMgr = canManageTeamInState(state, existing.team_id, actorId) || existing.created_by_id === actorId || (!existing.team_id && existing.assignee_id === actorId);
            if (!isMgr && actorId) {
              if (existing.assignee_id !== actorId) {
                return res.status(403).json({ ok: false, error: 'Permission Denied: Only the assignee or Team Leader can update this task.' });
              }
              if (task.status === 'done' && existing.status !== 'done') {
                return res.status(403).json({ ok: false, error: 'Only Team Leader or Admin can mark team tasks Done.' });
              }
              if (
                (task.title !== undefined && task.title !== existing.title) ||
                (task.description !== undefined && task.description !== existing.description) ||
                (task.assignee_id !== undefined && task.assignee_id !== existing.assignee_id) ||
                (task.priority !== undefined && task.priority !== existing.priority) ||
                (task.due_date !== undefined && task.due_date !== existing.due_date)
              ) {
                return res.status(403).json({ ok: false, error: 'Permission Denied: Only Team Leader or Admin can modify task details.' });
              }
              // Assignee may only update workflow progress / submission metadata
              state.tasks[idx] = {
                ...existing,
                status: task.status || existing.status,
                submitted_at: task.submitted_at ?? existing.submitted_at,
                submission_note: task.submission_note ?? existing.submission_note,
                updated_at: task.updated_at || new Date().toISOString(),
              };
            } else {
              state.tasks[idx] = task;
            }
            if (existing.status !== 'submitted' && task.status === 'submitted') {
              const targetLeader = existing.created_by_id !== actorId ? existing.created_by_id : state.teams.find((t) => t.id === existing.team_id)?.owner_id;
              if (targetLeader && targetLeader !== actorId) {
                pushNotification(state, {
                  id: `notif_sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                  user_id: targetLeader,
                  kind: 'task_submitted',
                  title: 'Task Submitted for Review 🚀',
                  body: `${actorName || 'Teammate'} submitted "${existing.title}". Ready for leader approval.`,
                  read: false,
                  related_task_id: existing.id,
                  related_team_id: existing.team_id || undefined,
                  created_at: new Date().toISOString(),
                });
              }
            } else if (existing.status !== 'done' && task.status === 'done' && existing.assignee_id && existing.assignee_id !== actorId) {
              pushNotification(state, {
                id: `notif_done_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                user_id: existing.assignee_id,
                kind: 'task',
                title: 'Task Approved! ✅',
                body: `${actorName || 'Team Leader'} approved & completed "${existing.title}".`,
                read: false,
                related_task_id: existing.id,
                related_team_id: existing.team_id || undefined,
                created_at: new Date().toISOString(),
              });
            }
          } else {
            state.deletedIds.tasks = removeTombstone(state.deletedIds.tasks, task.id);
            state.tasks = [task, ...state.tasks];
            if (Array.isArray(subtasks) && subtasks.length > 0) {
              state.subtasks = [...state.subtasks, ...subtasks];
            }
            if (task.assignee_id && task.assignee_id !== task.created_by_id) {
              pushNotification(state, {
                id: `notif_asn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                user_id: task.assignee_id,
                kind: 'task_assigned',
                title: 'New Task Assigned 📋',
                body: `${actorName || 'Team Leader'} assigned: "${task.title}". Deadline: ${task.due_date}.`,
                read: false,
                related_task_id: task.id,
                related_team_id: task.team_id || undefined,
                created_at: new Date().toISOString(),
              });
            }
          }
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'DELETE_TASK') {
        const { taskId, actorId } = payload || {};
        const existing = state.tasks.find((t) => t.id === taskId);
        if (existing && actorId) {
          const isMgr = canManageTeamInState(state, existing.team_id, actorId) || existing.created_by_id === actorId || (!existing.team_id && existing.assignee_id === actorId);
          if (!isMgr) {
            return res.status(403).json({ ok: false, error: 'Permission Denied: Only Team Leader or Creator can delete tasks.' });
          }
        }
        state.deletedIds.tasks = addTombstone(state.deletedIds.tasks, taskId);
        state.tasks = state.tasks.filter((t) => t.id !== taskId);
        state.subtasks = state.subtasks.filter((s) => s.task_id !== taskId);
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'SAVE_SUBTASK') {
        const { subtask } = payload || {};
        if (subtask && subtask.id) {
          state.deletedIds.subtasks = removeTombstone(state.deletedIds.subtasks, subtask.id);
          const idx = state.subtasks.findIndex((s) => s.id === subtask.id);
          if (idx !== -1) state.subtasks[idx] = subtask;
          else state.subtasks.push(subtask);
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'DELETE_SUBTASK') {
        const { subtaskId } = payload || {};
        state.deletedIds.subtasks = addTombstone(state.deletedIds.subtasks, subtaskId);
        state.subtasks = state.subtasks.filter((s) => s.id !== subtaskId);
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'CONNECTION_REQUEST') {
        const { connection, senderName } = payload || {};
        if (connection && connection.id) {
          state.connections = [connection, ...state.connections.filter((c) => c.id !== connection.id)];
          pushNotification(state, {
            id: `notif_conn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            user_id: connection.to_user_id,
            kind: 'teammate_request',
            title: 'New Teammate Request',
            body: `${senderName || 'A teammate'} wants to add you as a connected teammate!`,
            read: false,
            related_connection_id: connection.id,
            created_at: new Date().toISOString(),
          });
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'CONNECTION_RESPOND') {
        const { connectionId, status, responderName } = payload || {};
        const idx = state.connections.findIndex((c) => c.id === connectionId);
        if (idx !== -1) {
          const conn = state.connections[idx];
          state.connections[idx] = { ...conn, status, resolved_at: new Date().toISOString() };
          if (status === 'accepted') {
            pushNotification(state, {
              id: `notif_cacc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              user_id: conn.from_user_id,
              kind: 'teammate_accepted',
              title: 'Teammate Request Accepted! ✨',
              body: `${responderName || 'Your teammate'} accepted your connection request!`,
              read: false,
              related_connection_id: connectionId,
              created_at: new Date().toISOString(),
            });
          }
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'MARK_NOTIFICATION_READ') {
        const { notificationId } = payload || {};
        state.notifications = state.notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'MARK_ALL_NOTIFICATIONS_READ') {
        const { userId } = payload || {};
        state.notifications = state.notifications.map((n) => (n.user_id === userId ? { ...n, read: true } : n));
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      if (action === 'ADMIN_ACTION') {
        const { actorEmail, subAction } = payload || {};
        if (!isStrictSuperAdminEmail(actorEmail)) {
          return res.status(403).json({ ok: false, error: 'Only Super Admin (aliraza.lead@gmail.com) may perform this action.' });
        }
        if (subAction === 'TOGGLE_ADMIN') {
          const { targetUserId } = payload;
          state.users = state.users.map((u) =>
            u.id === targetUserId && !isStrictSuperAdminEmail(u.email) ? { ...u, isAdmin: !u.isAdmin } : u
          );
        } else if (subAction === 'TOGGLE_STATUS') {
          const { targetUserId } = payload;
          state.users = state.users.map((u) =>
            u.id === targetUserId && !isStrictSuperAdminEmail(u.email)
              ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' }
              : u
          );
        } else if (subAction === 'REASSIGN_TASK') {
          const { taskId, newAssigneeId } = payload;
          const assignee = state.users.find((u) => u.id === newAssigneeId);
          state.tasks = state.tasks.map((t) =>
            t.id === taskId ? { ...t, assignee_id: newAssigneeId, assignee: assignee || t.assignee, updated_at: new Date().toISOString() } : t
          );
        } else if (subAction === 'TRANSFER_TEAM') {
          const { teamId, newOwnerId } = payload;
          state.teams = state.teams.map((t) => (t.id === teamId ? { ...t, owner_id: newOwnerId } : t));
          state.members = state.members.map((m) =>
            m.team_id === teamId
              ? { ...m, role: m.user_id === newOwnerId ? 'owner' : m.role === 'owner' ? 'admin' : m.role }
              : m
          );
        } else if (subAction === 'DELETE_USER') {
          const { targetUserId } = payload;
          const target = state.users.find((u) => u.id === targetUserId);
          if (target && !isStrictSuperAdminEmail(target.email)) {
            state.users = state.users.filter((u) => u.id !== targetUserId);
            state.members = state.members.filter((m) => m.user_id !== targetUserId);
            if (target.email && state.authCredentials[target.email.toLowerCase()]) {
              delete state.authCredentials[target.email.toLowerCase()];
            }
          }
        }
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state: toPublicState(state) });
      }

      return res.status(200).json({ ok: true, state: toPublicState(state) });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/sync error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
};
