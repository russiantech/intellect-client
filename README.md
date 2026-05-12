# 🎓 Intellect LMS — Frontend Overview

A modern Learning Management System frontend built with **React 18 + TypeScript**, preserving the original Intellect Acorn-themed design.

## ✨ Key Features

### 👨‍🎓 Student Experience

* Browse and enroll in courses
* Interactive learning player
* Video, PDF, PPT, audio, image, and text support
* Topic progress tracking
* AI-powered learning assistant
* Assessments and certificates
* Learning paths support
* Responsive learning dashboard

### 👨‍🏫 Creator & Tutor Tools

* Multi-step course creation workflow
* Course analytics and earnings tracking
* Student progress monitoring
* Assessment grading interface
* Live session scheduling
* Attendance management
* Messaging system

### 🛠️ Admin Features

* Admin dashboard with analytics
* Course approval management
* User and role management
* Tutor assignment tools
* Broadcast messaging system
* Discount management
* Partnership management
* Platform branding configuration

---

# 🏗️ Frontend Stack

* **React 18**
* **TypeScript**
* **Vite**
* **Bootstrap 5**
* **Bootstrap Icons**
* Custom Acorn-inspired CSS system

---

# 📁 Frontend Structure

```bash
client/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   └── shared/
│   ├── context/
│   ├── pages/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── creator/
│   │   ├── learning/
│   │   ├── partnership/
│   │   ├── paths/
│   │   ├── shared/
│   │   ├── student/
│   │   └── tutor/
│   ├── services/
│   ├── styles/
│   └── types/
├── package.json
└── vite.config.ts
```

---

# 🎨 Design System

* **Fonts:** Nunito Sans + Montserrat
* **Primary Color:** `#4A90D9`
* Light/Dark mode support
* Responsive across all devices
* Bootstrap-based reusable UI components

---

# 🚀 Frontend Setup

```bash
cd client

npm install
npm run dev
```

App runs on:

```bash
http://localhost:5173
```

---

# 🔐 Frontend Role Support

* `student`
* `tutor`
* `creator`
* `partner`
* `admin`
* `super_admin`

Each role has dedicated dashboards, pages, and permissions.

---

# 📡 API Integration

Frontend communicates with the FastAPI backend through a centralized service layer for:

* Authentication
* Courses
* Enrollments
* Payments
* Assessments
* AI chat
* Notifications
* Messaging
* Admin operations

---

# 📱 Highlights

* Clean reusable component architecture
* Modern responsive UI
* Type-safe development with TypeScript
* Scalable page/module structure
* Rich learning experience with AI integration
* Professional dashboard system for all user roles
