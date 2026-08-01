# SC-Project — Dokumentasi Index

> **SC-Project** adalah sistem manajemen klinik kecantikan (aesthetic clinic) berbasis **multi-tenant SaaS** dengan **RBAC granular**.  
> Monorepo terdiri dari backend Go (`sc-pos-be`) dan frontend React (`shasi`).

> **⚠️ Aturan untuk AI Agent:**
>
> - Update dokumentasi setelah perubahan **vital** (endpoint, tabel/kolom DB, module, page/hook, workflow, auth/RBAC). Tidak perlu untuk bug fix kecil/refactor/styling. Detail di [`AGENTS.md`](../AGENTS.md).
> - **Hemat token:** Baca hanya doc yang relevan dengan task. `AGENTS.md` adalah quick reference — untuk detail baca doc spesifik di `docs/`.

---

## 📁 Daftar Dokumen

| Dokumen                                                         | Deskripsi                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`AGENTS.md`](../AGENTS.md)                                     | Context lengkap project untuk AI agent (entry point utama)               |
| [`docs/BACKEND_STRUCTURE.md`](./BACKEND_STRUCTURE.md)           | Struktur direktori backend, pola module, middleware, conventions         |
| [`docs/FRONTEND_STRUCTURE.md`](./FRONTEND_STRUCTURE.md)         | Struktur direktori frontend, routing, auth context, API client           |
| [`docs/INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md)           | Cara integrasi frontend-backend: auth flow, org context, RBAC            |
| [`docs/CREATING_NEW_FEATURE.md`](./CREATING_NEW_FEATURE.md)     | Step-by-step membuat fitur baru di backend dan frontend                  |
| [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)               | Schema semua tabel PostgreSQL + konvensi data                            |
| [`docs/API_REFERENCE.md`](./API_REFERENCE.md)                   | Referensi semua endpoint API dengan request/response format              |
| [`docs/FEATURES_AND_PROCESSES.md`](./FEATURES_AND_PROCESSES.md) | Business workflow: walk-in, queue, POS, cancel, visit notes, commissions |

---

## 🏗️ Gambaran Arsitektur

```
┌─────────────────────────────────────────────┐
│               sc-project (monorepo)          │
│                                             │
│  ┌──────────────────┐  ┌───────────────────┐│
│  │   sc-pos-be/     │  │    shasi/         ││
│  │   Go + Gin       │  │   React + Vite    ││
│  │   Port: 8080     │  │   Port: 5173      ││
│  │   PostgreSQL     │  │   TanStack Query  ││
│  └──────────────────┘  └───────────────────┘│
└─────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Terminal 1 — Backend
cd sc-pos-be
cp .env.example .env   # edit DB credentials
go run main.go

# Terminal 2 — Frontend
cd shasi
npm install
npm run dev
```

---

## 🗺️ Navigasi Cepat untuk AI Agent

**Untuk memahami business workflow:** → Baca [`FEATURES_AND_PROCESSES.md`](./FEATURES_AND_PROCESSES.md)

**Untuk membuat fitur baru:** → Baca [`CREATING_NEW_FEATURE.md`](./CREATING_NEW_FEATURE.md)

**Untuk memahami API endpoint:** → Baca [`API_REFERENCE.md`](./API_REFERENCE.md)

**Untuk memahami database:** → Baca [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)

**Untuk debug integrasi:** → Baca [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md)

**Untuk eksplorasi codebase backend:** → Baca [`BACKEND_STRUCTURE.md`](./BACKEND_STRUCTURE.md)

**Untuk eksplorasi codebase frontend:** → Baca [`FRONTEND_STRUCTURE.md`](./FRONTEND_STRUCTURE.md)

---

_Last updated: 2026-08-01_
