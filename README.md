# TaskFlow 📱 (React Native / Expo Mobile App)

Professional team task management app with **Supabase backend**, **App Lock security**, **Team Leader controls**, **Kanban board**, **Calendar view**, and **Task Attachments**.

---

## 🚀 How to Run on Your Phone (Instantly)

1. **Install Expo Go** on your phone:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Scan the QR Code**:
   - On Android: Scan with the Expo Go app.
   - On iOS: Scan with the default Camera app.
   - App will instantly load on your phone!

---

## 📦 How to Generate Direct APK (For Android Users)

Agar aap bina Play Store ke seedha download link ya WhatsApp ke zariye APK dena chahte hain:
```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```
Yeh cloud pe build karke aapko seedha **`.apk` download link** de dega!

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
