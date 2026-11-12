# TaskFlow 📱 (React Native / Expo Mobile & Web App)

> 🌐 **Live Web App / PWA**: [https://taskflow-app-indol-rho.vercel.app](https://taskflow-app-indol-rho.vercel.app)  
> 📦 **GitHub Repository**: [https://github.com/raoraza12/Taskflow-App](https://github.com/raoraza12/Taskflow-App)

Professional team task management app with **Supabase backend**, **Google Verified OAuth**, **App Lock security**, **Team Leader governance**, **Kanban board**, **Calendar view**, and **Task Attachments**.

---

## 📱 How to Run & Install on Mobile (iOS & Android)

### Option 1: Instant App Installation on iPhone (No App Store / No Expo Go needed!)
1. Open **Safari** on your iPhone and visit:  
   👉 **`https://taskflow-app-indol-rho.vercel.app`**
2. Tap the **Share icon** (square with upward arrow `⬆️`) at the bottom of Safari.
3. Tap **"Add to Home Screen"** and tap **Add**.
4. The **TaskFlow app icon** appears on your home screen!
5. Tap it to launch: it runs **full screen, standalone with 0 browser controls**, 120Hz smooth ProMotion, and zero SDK mismatch issues.

### Option 2: Direct Installable APK for Android Users
Generate a standalone `.apk` file that anyone can download and install:
```bash
npx eas login
npx eas build -p android --profile preview
```
Yeh cloud pe build complete karke direct **`.apk` download link** generate karega jise WhatsApp ya drive ke zariye kisi bhi Android device par install kiya ja sakta hai.

---

## 🚀 How to Run in Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npx expo start --clear
   ```

3. **Open on Devices**:
   - Web: Press `w` in terminal or open `http://localhost:8081`
   - Android: Scan QR code using Expo Go app
   - iOS: Open live PWA link in Safari

---

## 🗄️ Supabase Setup (When moving to cloud)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to SQL Editor and run:
   - `supabase/schema.sql` (Tables)
   - `supabase/policies.sql` (RLS Security)
   - `supabase/storage.sql` (Storage Bucket)
3. Add your credentials in `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## ✨ Implemented Features

1. **App Lock Gate**: 4+ digit secure PIN gate on app startup via `expo-secure-store`.
2. **Google Verified Auth**: Sign in with Google or instant demo Gmail test mode.
3. **Team Leader (Owner) Full Controls**:
   - Rename team
   - Delete team
   - Promote / Demote member roles
   - Remove members
   - Approve / Decline join requests
4. **Member Controls**:
   - Request to join via Name + 6-digit Invite Code + Team Password
   - Leave team
5. **Full Task CRUD**:
   - Edit title, description, assignee, priority, status, due date, start & end times
   - 1-tap quick status toggle
6. **Subtasks / Checklists**:
   - Add checklist items to tasks, toggle done/undone, progress indicators (e.g. 2/4 done).
7. **File Attachments (Optional)**:
   - Attach documents / images to tasks with preview.
8. **Interactive Calendar View**:
   - Dot indicators on task dates, tap any day to view and schedule tasks.
9. **Kanban Board**:
   - Todo, In Progress, Done columns with quick-move controls.
10. **Instant Global Search**:
    - Search tasks by title, description, assignee, priority, or status.
11. **Notifications**:
    - Unread badge, in-app alerts, 1-tap join request approval from notification.
12. **My Portal**:
    - Private profile, Google verification badge, change App Password, audit history log.
