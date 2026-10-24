# PROFIL DOMAIN: BOOKING / RENTAL / RESERVASI

Modul opsional. Aktifkan dengan mengisi `Profil Domain: booking` di `LANDING_PROMPT.md`.

---

## 1. ENTITAS CONTOH

### `inventory_items`
| Kolom | Tipe | Constraint |
| :--- | :--- | :--- |
| `id` | INT/UUID | PK |
| `code` | VARCHAR(50) | UNIQUE, indexed |
| `title` | VARCHAR(255) | NOT NULL |
| `price_per_unit` | DECIMAL(12,2) | NOT NULL |

### `bookings`
| Kolom | Tipe | Constraint |
| :--- | :--- | :--- |
| `id` | INT/UUID | PK |
| `order_number` | VARCHAR(50) | UNIQUE, format `ORD-YYYYMMDD-XXXX` |
| `customer_id` | INT | FK -> users.id |
| `item_id` | INT | FK -> inventory_items.id |
| `start_date`, `end_date` | DATETIME | NOT NULL, `end_date` > `start_date` |
| `booking_status` | ENUM | `pending`, `confirmed`, `active`, `completed`, `cancelled` |

---

## 2. ADR CONTOH: Atomic Availability Lock
* **Konteks:** Cegah double-booking pada transaksi konkuren.
* **Keputusan:** Transaksi DB dengan row lock (`SELECT ... FOR UPDATE`) dalam satu transaksi.
