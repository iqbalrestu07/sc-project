# Frontend Structure — `shasi`

> **Stack:** React 18 + TypeScript + Vite + shadcn/ui + TanStack Query v5  
> **Port Dev:** `5173`  
> **Routing:** React Router v6

---

## Struktur Direktori Lengkap

```
shasi/
├── src/
│   ├── App.tsx                      # Root: route definitions + providers
│   ├── main.tsx                     # Entry point: createRoot + mount App
│   ├── index.css                    # Tailwind directives + CSS variables (design tokens)
│   ├── App.css                      # Global app styles
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth state global + org switching + permissions
│   │
│   ├── integrations/
│   │   └── api/
│   │       ├── client.ts            # ApiClient class (axios wrapper, token mgmt, auto-refresh)
│   │       ├── endpoints.ts         # Semua API_ENDPOINTS constants
│   │       ├── types.ts             # ApiError class, JwtPayload interface
│   │       └── index.ts             # Re-export: apiClient + API_ENDPOINTS
│   │
│   ├── hooks/                       # Custom React hooks per domain
│   │   ├── usePatients.ts           # usePatients, usePatient, useCreatePatient, useUpdatePatient, useDeletePatient
│   │   ├── useAppointments.ts       # CRUD appointments
│   │   ├── useServices.ts           # CRUD services + categories
│   │   ├── useProducts.ts           # CRUD products + categories
│   │   ├── useStaff.ts              # CRUD staff
│   │   ├── useTransactions.ts       # CRUD transactions + items
│   │   ├── useTransactionStats.ts   # Transaction statistics
│   │   ├── useCommissions.ts        # Commissions read/update-status
│   │   ├── useDashboard.ts          # Stats, revenue, appointments-today
│   │   ├── useCmsData.ts            # CMS pages read/write
│   │   ├── useClinicSettings.ts     # Clinic settings read/update
│   │   ├── useStockMovements.ts     # Stock movements list/create
│   │   ├── useConsumableGroups.ts   # CRUD consumable group + alternatif produk service
│   │   ├── useConsumableItems.ts    # Consumable items + usage logs
│   │   ├── useWhatsApp.ts           # WhatsApp send/templates
│   │   ├── useOmniChat.ts           # Omnichannel chat (WebSocket)
│   │   ├── usePublicClinicInfo.ts   # Public clinic info (no auth)
│   │   ├── useDebounce.ts           # Generic debounce hook
│   │   ├── use-mobile.tsx           # Detect mobile viewport
│   │   └── use-toast.ts             # Toast notifications
│   │
│   ├── pages/                       # Halaman utama (1 file = 1 route)
│   │   ├── Auth.tsx                 # Login + Register page
│   │   ├── Onboarding.tsx           # Buat/join org pertama kali
│   │   ├── LandingPage.tsx          # Landing page publik
│   │   ├── Dashboard.tsx            # Dashboard utama + stats
│   │   ├── Reports.tsx              # Laporan top service dan top product terpaginated
│   │   ├── Patients.tsx             # Daftar pasien
│   │   ├── PatientDetail.tsx        # Detail pasien + riwayat kunjungan
│   │   ├── Appointments.tsx         # Jadwal appointment
│   │   ├── Services.tsx             # Daftar layanan
│   │   ├── Products.tsx             # Daftar produk
│   │   ├── Categories.tsx           # Kategori service & product
│   │   ├── POS.tsx                  # Point of Sale / kasir
│   │   ├── Transactions.tsx         # Riwayat transaksi
│   │   ├── Commissions.tsx          # Komisi staff
│   │   ├── Staff.tsx                # Daftar staff
│   │   ├── Members.tsx              # Member organisasi
│   │   ├── Settings.tsx             # Pengaturan klinik
│   │   ├── CmsManagement.tsx        # Manajemen konten CMS
│   │   ├── RBACManagement.tsx       # Manajemen roles & permissions
│   │   ├── StockOpname.tsx          # Stock opname + movements
│   │   ├── ImportExcel.tsx          # Import data dari Excel
│   │   ├── ConsumableItems/         # (sub-dir) Produk habis pakai
│   │   │   └── index.tsx
│   │   ├── Messaging/               # (sub-dir) Omnichannel messaging
│   │   │   └── index.tsx
│   │   └── NotFound.tsx             # 404 page
│   │
│   ├── components/                  # Reusable components
│   │   ├── NavLink.tsx              # Styled nav link
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx   # Wrapper route dengan permission check
│   │   ├── layout/
│   │   │   ├── index.ts             # Re-export MainLayout
│   │   │   ├── MainLayout.tsx       # Layout utama: sidebar + header + content
│   │   │   └── Sidebar.tsx          # Sidebar navigasi
│   │   ├── appointments/            # Komponen khusus appointment
│   │   ├── patients/                # Komponen khusus patient (form, tabel)
│   │   ├── products/                # Komponen khusus product
│   │   ├── services/                # Form/detail service + ServiceConsumableGroupsEditor
│   │   ├── staff/                   # Komponen khusus staff
│   │   ├── transactions/            # Komponen khusus transaksi
│   │   ├── pos/                     # POS + ConsumableSelectionDialog
│   │   ├── cms/                     # Komponen CMS editor
│   │   ├── landing/                 # Komponen landing page
│   │   ├── whatsapp/                # Komponen WhatsApp
│   │   ├── filters/                 # Filter & search components
│   │   └── ui/                      # shadcn/ui components (button, card, dialog, etc.)
│   │
│   ├── types/                       # TypeScript interfaces (aligned dengan Go models)
│   │   ├── patient.ts               # Patient, PatientFormData
│   │   ├── appointment.ts           # Appointment
│   │   ├── service.ts               # Service, ServiceCategory
│   │   ├── consumable_group.ts      # ConsumableGroup + alternatif produk
│   │   ├── product.ts               # Product, ProductCategory
│   │   ├── transaction.ts           # Transaction, TransactionItem
│   │   ├── consumable.ts            # ConsumableItem
│   │   ├── cms.ts                   # CmsPage
│   │   ├── whatsapp.ts              # WhatsAppDevice, WhatsAppMessage
│   │   └── omni.ts                  # OmniConversation, OmniMessage
│   │
│   ├── lib/
│   │   └── utils.ts                 # cn() helper (clsx + tailwind-merge)
│   │
│   └── test/                        # Test files (vitest)
│
├── public/                          # Static assets
├── components.json                  # shadcn/ui config
├── tailwind.config.ts               # Tailwind config + design tokens
├── vite.config.ts                   # Vite config
├── tsconfig.json                    # TypeScript config
├── package.json                     # Dependencies + npm scripts
├── Dockerfile                       # Multi-stage build (Nginx)
├── nginx.conf                       # Nginx config untuk production
└── .env                             # Environment variables
```

---

## Arsitektur Data Flow

```
User Interaction (click/submit)
         │
         ▼
    Page Component
         │  calls
         ▼
   Custom Hook (useXxx)
         │  uses
         ▼
  TanStack Query (useQuery / useMutation)
         │  calls queryFn
         ▼
   apiClient.get/post/put/delete()
         │  axios + interceptors
         ▼
      Backend API (http://localhost:8080/api)
```

---

## Kontrak Hook List dan Pagination

Hook list inti (`usePatients`, `useServices`, `useProducts`, `useStaff`, `useTransactions`) tidak mengembalikan array langsung. Nilai `query.data` adalah wrapper hasil query dengan bentuk berikut:

```typescript
type PaginatedQueryData<T> = {
  data: T[];
  has_next: boolean;
  total?: number;
};
```

```typescript
const patientsQuery = usePatients(search, page, limit);
const patients = patientsQuery.data?.data ?? [];
const hasNext = patientsQuery.data?.has_next ?? false;
const total = patientsQuery.data?.total; // tersedia untuk usePatients(..., true)
```

> Jangan gunakan `const patients = usePatients().data ?? []` lalu memanggil `patients.map(...)`. Nilai tersebut adalah object wrapper, bukan array; pola salah ini menyebabkan error seperti `patients.map is not a function` dan `services.filter is not a function`.

`useProducts` mengembalikan object yang juga mengekspos `products` dan mutation helpers untuk kompatibilitas consumer lama. Namun untuk implementasi baru, baca bentuk return hook secara eksplisit sebelum mengasumsikan data adalah array.

### Konvensi Query Key

- List entity: `['patients', search, page, limit]`, `['services', search, page, limit]`, dan seterusnya.
- Consumable group service: `['consumable-groups', serviceId]`.
- Mutation yang mengubah data harus menjalankan `invalidateQueries` pada prefix query key domain terkait.

---

## Flow POS: Service Consumable Groups

1. Admin menandai product sebagai `is_consumable` dan membuat service.
2. Di `ServiceConsumableGroupsEditor`, admin membuat kebutuhan konsumabel dan menambah produk alternatif per group.
3. Ketika kasir menambah service di `POSInterface`, `useConsumableGroups(serviceId)` dimuat terlebih dahulu.
4. Jika tidak ada group berisi item, service langsung masuk cart. Jika ada, `ConsumableSelectionDialog` meminta kasir memilih produk per group.
5. Checkout mengirim `selected_consumable_product_id` pada item service; backend melakukan validasi lalu pengurangan stok saat transaksi dibayar.

**Batasan saat ini:** tipe `CartItem` dan `TransactionItem` hanya mendukung satu `selectedConsumableProductId`/`selected_consumable_product_id`. Karena itu dialog dapat menampilkan banyak group, tetapi POS hanya mengirim pilihan pertama ke backend. Jangan mengonfigurasi lebih dari satu group per service sampai model payload dan tabel selection per group diperluas.

**Ketidaksesuaian yang harus diperbaiki:** backend mendefinisikan `group.name` sebagai label kebutuhan, tetapi editor saat ini menyimpan `product.id` di field tersebut dan tidak otomatis menambahkan product utama sebagai `group.items` prioritas `0`. Group yang baru dibuat bisa tidak memiliki item; pada kondisi itu POS menganggap tidak ada konsumabel dan tidak melakukan pengurangan stok. Kontrak yang benar adalah: `name` harus menjadi label manusia, lalu setiap produk yang dapat dipilih—including produk utama—harus dibuat sebagai `service_consumable_group_items`.

---

## AuthContext — Pusat Auth State

`AuthContext` menyediakan state auth global. Akses via `useAuth()` hook:

```typescript
const {
  user, // AuthUser | null — data user yang login
  role, // AppRole | null — role di org aktif
  activeOrg, // OrgInfo | null — org yang sedang aktif
  organizations, // OrgInfo[] — semua org yang diikuti
  permissions, // string[] — effective permissions di org aktif
  isLoading, // boolean
  signIn, // (user, orgs) => void — dipanggil setelah login
  switchOrg, // (org) => Promise<void>
  signOut, // () => Promise<void>
  hasPermission, // (perm: string) => boolean
  hasRole, // (...roles: AppRole[]) => boolean
  needsOnboarding, // boolean — user belum punya org
} = useAuth();
```

---

## API Client — `apiClient`

Singleton instance dari `ApiClient` class. Sudah handle:

- Auto-attach `Authorization: Bearer <token>` di setiap request
- Auto-attach `X-Organization-ID: <orgId>` dari localStorage
- Auto-refresh token jika 401 (dengan queue untuk concurrent requests)
- Redirect ke `/admin/login` jika refresh gagal

```typescript
import { apiClient, API_ENDPOINTS } from "@/integrations/api";

// GET
const data = await apiClient.get<{ data: Patient[] }>(
  API_ENDPOINTS.PATIENTS.LIST,
);

// POST
const result = await apiClient.post<{ data: Patient }>(
  API_ENDPOINTS.PATIENTS.CREATE,
  formData,
);

// PUT
await apiClient.put(API_ENDPOINTS.PATIENTS.UPDATE(id), data);

// DELETE
await apiClient.delete(API_ENDPOINTS.PATIENTS.DELETE(id));

// Upload (multipart)
await apiClient.postForm(API_ENDPOINTS.CMS.UPLOAD_IMAGE, formData);
```

---

## Route Definitions & Permission Guards

Semua protected route dibungkus `ProtectedRoute`:

```typescript
// Requires specific permission
<Route path="/patients" element={
  <ProtectedRoute requirePermission="patients:read">
    <MainLayout onSignOut={signOut}><Patients /></MainLayout>
  </ProtectedRoute>
} />

// Requires auth but no specific permission
<Route path="/messaging" element={
  <ProtectedRoute>
    <MainLayout onSignOut={signOut}><Messaging /></MainLayout>
  </ProtectedRoute>
} />
```

### Daftar Route & Permission

| Path                | Permission Required  |
| ------------------- | -------------------- |
| `/`                 | Public               |
| `/admin/login`      | Public               |
| `/onboarding`       | Auth (no permission) |
| `/dashboard`        | `reports:read`       |
| `/patients`         | `patients:read`      |
| `/patients/:id`     | `patients:read`      |
| `/appointments`     | `appointments:read`  |
| `/services`         | `services:read`      |
| `/products`         | `products:read`      |
| `/categories`       | `categories:read`    |
| `/stock-opname`     | `products:write`     |
| `/consumable-items` | `consumables:read`   |
| `/pos`              | `transactions:write` |
| `/transactions`     | `transactions:read`  |
| `/commissions`      | `commissions:read`   |
| `/staff`            | `staff:read`         |
| `/members`          | `organization:write` |
| `/messaging`        | Auth only            |
| `/rbac`             | `rbac:read`          |
| `/cms`              | `cms:read`           |
| `/settings`         | `settings:read`      |
| `/import-excel`     | `products:write`     |

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8080/api   # URL backend API
VITE_API_TIMEOUT=30000                         # Timeout request (ms)
```

---

## Cara Menjalankan Frontend

```bash
cd shasi

# Install dependencies
npm install
# atau
bun install

# Dev server
npm run dev
# → http://localhost:5173

# Build production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

---

## Key Libraries

| Library                         | Kegunaan                              |
| ------------------------------- | ------------------------------------- |
| `react@18`                      | UI framework                          |
| `react-router-dom@6`            | Client-side routing                   |
| `@tanstack/react-query@5`       | Server state management + caching     |
| `axios`                         | HTTP client (wrapped dalam ApiClient) |
| `shadcn/ui` + Radix UI          | Accessible UI components              |
| `tailwindcss`                   | Utility-first CSS                     |
| `react-hook-form`               | Form state management                 |
| `zod`                           | Schema validation                     |
| `recharts`                      | Charts (dashboard)                    |
| `sonner`                        | Toast notifications                   |
| `date-fns`                      | Date manipulation                     |
| `lucide-react`                  | Icons                                 |
| `@microsoft/fetch-event-source` | SSE untuk real-time features          |
| `vitest`                        | Unit testing framework                |

---

_Last updated: 2026-07-09_
