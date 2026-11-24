const { put, list } = require('@vercel/blob');

const BLOB_FILENAME = 'taskflow_cloud_state.json';

const DEFAULT_STATE = {
  teams: [],
  members: [],
  tasks: [],
  chatMessages: [],
  joinRequests: [],
  connections: [],
  users: [],
  lastUpdated: new Date().toISOString(),
};

// Helper to fetch current cloud state from Vercel Blob
async function getCloudState() {
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    const targetBlob = blobs.find((b) => b.pathname === BLOB_FILENAME || b.pathname.endsWith(BLOB_FILENAME));
    if (!targetBlob || !targetBlob.url) {
      return DEFAULT_STATE;
    }
    // Fetch directly from blob CDN with cache busting
    const res = await fetch(`${targetBlob.url}?t=${Date.now()}`);
    if (!res.ok) return DEFAULT_STATE;
    const data = await res.json();
    return {
      teams: Array.isArray(data.teams) ? data.teams : [],
      members: Array.isArray(data.members) ? data.members : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      chatMessages: Array.isArray(data.chatMessages) ? data.chatMessages : [],
      joinRequests: Array.isArray(data.joinRequests) ? data.joinRequests : [],
      connections: Array.isArray(data.connections) ? data.connections : [],
      users: Array.isArray(data.users) ? data.users : [],
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.error('getCloudState error:', err);
    return DEFAULT_STATE;
  }
}

// Helper to save state back to Vercel Blob
async function saveCloudState(state) {
  state.lastUpdated = new Date().toISOString();
  const jsonStr = JSON.stringify(state);
  await put(BLOB_FILENAME, jsonStr, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  return state;
}

module.exports = async function handler(req, res) {
  // Global CORS Headers so mobile APK & web can seamlessly sync
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const state = await getCloudState();
      return res.status(200).json({ ok: true, state });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action, payload } = body;
      const state = await getCloudState();

      if (action === 'MERGE') {
        // Two-way smart merge
        const incoming = payload || {};

        // Merge Teams (dedup by ID & name)
        const teamMap = new Map();
        (state.teams || []).forEach((t) => teamMap.set(t.id, t));
        (incoming.teams || []).forEach((t) => teamMap.set(t.id, t));
        state.teams = Array.from(teamMap.values());

        // Merge Members (dedup by team_id + user_id)
        const memberMap = new Map();
        (state.members || []).forEach((m) => memberMap.set(`${m.team_id}_${m.user_id}`, m));
        (incoming.members || []).forEach((m) => memberMap.set(`${m.team_id}_${m.user_id}`, m));
        state.members = Array.from(memberMap.values());

        // Merge Tasks (dedup by task ID)
        const taskMap = new Map();
        (state.tasks || []).forEach((t) => taskMap.set(t.id, t));
        (incoming.tasks || []).forEach((t) => taskMap.set(t.id, t));
        state.tasks = Array.from(taskMap.values());

        // Merge Chat Messages (dedup by message ID)
        const chatMap = new Map();
        (state.chatMessages || []).forEach((m) => chatMap.set(m.id, m));
        (incoming.chatMessages || []).forEach((m) => chatMap.set(m.id, m));
        state.chatMessages = Array.from(chatMap.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Merge Join Requests (dedup by request ID)
        const reqMap = new Map();
        (state.joinRequests || []).forEach((r) => reqMap.set(r.id, r));
        (incoming.joinRequests || []).forEach((r) => reqMap.set(r.id, r));
        state.joinRequests = Array.from(reqMap.values());

        // Merge Connections (dedup by ID)
        const connMap = new Map();
        (state.connections || []).forEach((c) => connMap.set(c.id, c));
        (incoming.connections || []).forEach((c) => connMap.set(c.id, c));
        state.connections = Array.from(connMap.values());

        // Merge Users (dedup by user ID)
        const userMap = new Map();
        (state.users || []).forEach((u) => userMap.set(u.id, u));
        (incoming.users || []).forEach((u) => userMap.set(u.id, u));
        state.users = Array.from(userMap.values());

        await saveCloudState(state);
        return res.status(200).json({ ok: true, state });
      }

      if (action === 'CREATE_TEAM') {
        const { team, member } = payload || {};
        if (!team || !team.name) {
          return res.status(400).json({ ok: false, error: 'Team name is required' });
        }

        // Check duplicate name
        const cleanName = team.name.trim().toLowerCase();
        const exists = state.teams.some((t) => t.name.trim().toLowerCase() === cleanName);
        if (exists) {
          return res.status(400).json({
            ok: false,
            error: `Team name "${team.name}" is already registered. Please choose a different team name.`,
          });
        }

        state.teams = [team, ...state.teams];
        if (member) {
          state.members = [member, ...state.members];
        }
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state, team });
      }

      if (action === 'REQUEST_JOIN') {
        const { teamName, inviteCode, joinPassword, user } = payload || {};
        const cleanCode = (inviteCode || '').trim().toUpperCase();
        const cleanName = (teamName || '').trim().toLowerCase();
        const cleanPass = (joinPassword || '').trim();

        // 1. Primary lookup by 6-digit code
        let targetTeam = state.teams.find(
          (t) => t.invite_code && t.invite_code.trim().toUpperCase() === cleanCode
        );
        if (!targetTeam) {
          targetTeam = state.teams.find((t) => t.name && t.name.trim().toLowerCase() === cleanName);
        }

        if (!targetTeam) {
          return res.status(404).json({
            ok: false,
            error: `Workspace not found. Please verify the 6-digit invite code (${cleanCode}) provided by your Team Leader.`,
          });
        }

        const storedPass = (targetTeam.join_password || '').trim();
        if (storedPass && storedPass !== cleanPass && storedPass.toLowerCase() !== cleanPass.toLowerCase()) {
          return res.status(400).json({
            ok: false,
            error: 'Team access password is incorrect. Please check the password provided by your Team Leader.',
          });
        }

        // Check if already a member
        const alreadyMember = state.members.some(
          (m) => m.team_id === targetTeam.id && m.user_id === user.id
        );
        if (alreadyMember) {
          return res.status(200).json({ ok: true, team: targetTeam, alreadyMember: true, state });
        }

        // Check pending request
        const existingReq = state.joinRequests.find(
          (r) => r.team_id === targetTeam.id && r.user_id === user.id && r.status === 'pending'
        );
        if (existingReq) {
          return res.status(200).json({
            ok: true,
            team: targetTeam,
            pendingApproval: true,
            message: 'Your join request is already pending Leader approval.',
            state,
          });
        }

        // Create new pending join request
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
          state.users.push(user);
        }

        await saveCloudState(state);
        return res.status(200).json({ ok: true, team: targetTeam, pendingApproval: true, state });
      }

      if (action === 'APPROVE_JOIN') {
        const { requestId } = payload || {};
        const reqIndex = state.joinRequests.findIndex((r) => r.id === requestId);
        if (reqIndex === -1) {
          return res.status(404).json({ ok: false, error: 'Join request not found' });
        }

        const joinReq = state.joinRequests[reqIndex];
        joinReq.status = 'approved';

        const newMember = {
          id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          team_id: joinReq.team_id,
          user_id: joinReq.user_id,
          role: 'member',
          joined_at: new Date().toISOString(),
          profile: joinReq.profile,
        };

        // Add member
        if (!state.members.some((m) => m.team_id === joinReq.team_id && m.user_id === joinReq.user_id)) {
          state.members = [newMember, ...state.members];
        }

        // Group chat join announcement
        const announcement = {
          id: `msg_join_${Date.now()}`,
          team_id: joinReq.team_id,
          user_id: 'system',
          user_name: 'TaskFlow Bot',
          user_avatar: '',
          text: `🎉 Welcome ${joinReq.profile?.name || 'New Member'} to the team!`,
          created_at: new Date().toISOString(),
        };
        state.chatMessages = [...state.chatMessages, announcement];

        await saveCloudState(state);
        return res.status(200).json({ ok: true, state });
      }

      if (action === 'DECLINE_JOIN') {
        const { requestId } = payload || {};
        const reqIndex = state.joinRequests.findIndex((r) => r.id === requestId);
        if (reqIndex !== -1) {
          state.joinRequests[reqIndex].status = 'declined';
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state });
      }

      if (action === 'SEND_MESSAGE') {
        const { message } = payload || {};
        if (message && message.text) {
          state.chatMessages = [...state.chatMessages, message];
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state });
      }

      if (action === 'SAVE_TASK') {
        const { task } = payload || {};
        if (task && task.id) {
          const idx = state.tasks.findIndex((t) => t.id === task.id);
          if (idx !== -1) {
            state.tasks[idx] = task;
          } else {
            state.tasks = [task, ...state.tasks];
          }
          await saveCloudState(state);
        }
        return res.status(200).json({ ok: true, state });
      }

      if (action === 'DELETE_TASK') {
        const { taskId } = payload || {};
        state.tasks = state.tasks.filter((t) => t.id !== taskId);
        await saveCloudState(state);
        return res.status(200).json({ ok: true, state });
      }

      // Default fallback: return current state
      return res.status(200).json({ ok: true, state });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/sync error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
};
