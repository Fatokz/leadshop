import "server-only";
import { DEFAULT_CAMPUS_ID, LCU_CAMPUS, SEED_VERSION } from "../campus";
import { seedProducts, seedStores } from "../seed";
import type { Campus, Order, Product, Store } from "../types";
import { adminDb, firebaseAdminEnabled } from "./firebase-admin";

/**
 * Data access for Lead Shop. All reads and writes go through the server, so
 * Firestore security rules can deny direct client access entirely.
 *
 * - With a Firebase service account configured: Firestore.
 * - Without one: an in-memory store seeded with demo data (good for local dev
 *   and offline demos; resets when the server restarts).
 */
export interface Repo {
  mode: "firebase" | "demo";
  getCampus(id: string): Promise<Campus>;
  listStores(campusId: string): Promise<Store[]>;
  getStore(id: string): Promise<Store | null>;
  getStoreBySlug(slug: string): Promise<Store | null>;
  getStoreByOwner(uid: string): Promise<Store | null>;
  findStoreByGatePass(code: string): Promise<Store | null>;
  saveStore(store: Store): Promise<void>;
  listProducts(campusId: string, storeId?: string): Promise<Product[]>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  saveOrder(order: Order): Promise<void>;
  listOrders(filter: { campusId?: string; storeId?: string; ids?: string[] }): Promise<Order[]>;
  findOrderByGatePass(code: string): Promise<Order | null>;
  seed(): Promise<{ stores: number; products: number }>;
}

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

// ---------------------------------------------------------------- demo (memory)

interface MemoryState {
  campuses: Map<string, Campus>;
  stores: Map<string, Store>;
  products: Map<string, Product>;
  orders: Map<string, Order>;
}

const globalForMemory = globalThis as unknown as { __leadshopMemory?: MemoryState };

function memory(): MemoryState {
  if (!globalForMemory.__leadshopMemory) {
    globalForMemory.__leadshopMemory = {
      campuses: new Map([[LCU_CAMPUS.id, LCU_CAMPUS]]),
      stores: new Map(seedStores().map((s) => [s.id, s])),
      products: new Map(seedProducts().map((p) => [p.id, p])),
      orders: new Map(),
    };
  }
  return globalForMemory.__leadshopMemory;
}

const clone = <T>(v: T): T => structuredClone(v);

const memoryRepo: Repo = {
  mode: "demo",
  async getCampus(id) {
    return clone(memory().campuses.get(id) ?? LCU_CAMPUS);
  },
  async listStores(campusId) {
    return [...memory().stores.values()].filter((s) => s.campusId === campusId).map(clone);
  },
  async getStore(id) {
    const s = memory().stores.get(id);
    return s ? clone(s) : null;
  },
  async getStoreBySlug(slug) {
    const s = [...memory().stores.values()].find((x) => x.slug === slug);
    return s ? clone(s) : null;
  },
  async getStoreByOwner(uid) {
    const s = [...memory().stores.values()].find((x) => x.ownerUid === uid);
    return s ? clone(s) : null;
  },
  async findStoreByGatePass(code) {
    const s = [...memory().stores.values()].find((x) => x.verification.gatePassCode === code);
    return s ? clone(s) : null;
  },
  async saveStore(store) {
    memory().stores.set(store.id, clone(store));
  },
  async listProducts(campusId, storeId) {
    return [...memory().products.values()]
      .filter((p) => p.campusId === campusId && (!storeId || p.storeId === storeId))
      .map(clone);
  },
  async saveProduct(product) {
    memory().products.set(product.id, clone(product));
  },
  async deleteProduct(id) {
    memory().products.delete(id);
  },
  async getOrder(id) {
    const o = memory().orders.get(id);
    return o ? clone(o) : null;
  },
  async saveOrder(order) {
    memory().orders.set(order.id, clone(order));
  },
  async listOrders({ campusId, storeId, ids }) {
    return [...memory().orders.values()]
      .filter(
        (o) =>
          (!campusId || o.campusId === campusId) &&
          (!storeId || o.storeId === storeId) &&
          (!ids || ids.includes(o.id)),
      )
      .sort(byNewest)
      .map(clone);
  },
  async findOrderByGatePass(code) {
    const o = [...memory().orders.values()].find((x) => x.gatePass?.code === code);
    return o ? clone(o) : null;
  },
  async seed() {
    globalForMemory.__leadshopMemory = undefined;
    memory();
    return { stores: seedStores().length, products: seedProducts().length };
  },
};

// ---------------------------------------------------------------- Firestore

// Firestore rejects `undefined` values, so strip them before writing.
const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const firestoreRepo: Repo = {
  mode: "firebase",
  async getCampus(id) {
    const snap = await adminDb().collection("campuses").doc(id).get();
    return snap.exists ? (snap.data() as Campus) : LCU_CAMPUS;
  },
  async listStores(campusId) {
    // Local/hackathon convenience: load (or refresh) the LCU demo stores when the seed version changes.
    if (process.env.AUTO_SEED_DEMO === "true" && campusId === DEFAULT_CAMPUS_ID) {
      const campus = await adminDb().collection("campuses").doc(campusId).get();
      if ((campus.data()?.seedVersion ?? 0) < SEED_VERSION) await firestoreRepo.seed();
    }
    const q = await adminDb().collection("stores").where("campusId", "==", campusId).get();
    return q.docs.map((d) => d.data() as Store);
  },
  async getStore(id) {
    const snap = await adminDb().collection("stores").doc(id).get();
    return snap.exists ? (snap.data() as Store) : null;
  },
  async getStoreBySlug(slug) {
    const q = await adminDb().collection("stores").where("slug", "==", slug).limit(1).get();
    return q.empty ? null : (q.docs[0].data() as Store);
  },
  async getStoreByOwner(uid) {
    const q = await adminDb().collection("stores").where("ownerUid", "==", uid).limit(1).get();
    return q.empty ? null : (q.docs[0].data() as Store);
  },
  async findStoreByGatePass(code) {
    const q = await adminDb().collection("stores").where("verification.gatePassCode", "==", code).limit(1).get();
    return q.empty ? null : (q.docs[0].data() as Store);
  },
  async saveStore(store) {
    await adminDb().collection("stores").doc(store.id).set(clean(store));
  },
  async listProducts(campusId, storeId) {
    let q = adminDb().collection("products").where("campusId", "==", campusId);
    if (storeId) q = q.where("storeId", "==", storeId);
    const res = await q.get();
    return res.docs.map((d) => d.data() as Product);
  },
  async saveProduct(product) {
    await adminDb().collection("products").doc(product.id).set(clean(product));
  },
  async deleteProduct(id) {
    await adminDb().collection("products").doc(id).delete();
  },
  async getOrder(id) {
    const snap = await adminDb().collection("orders").doc(id).get();
    return snap.exists ? (snap.data() as Order) : null;
  },
  async saveOrder(order) {
    await adminDb().collection("orders").doc(order.id).set(clean(order));
  },
  async listOrders({ campusId, storeId, ids }) {
    const db = adminDb();
    if (ids) {
      if (ids.length === 0) return [];
      const snaps = await db.getAll(...ids.slice(0, 30).map((id) => db.collection("orders").doc(id)));
      return snaps.filter((s) => s.exists).map((s) => s.data() as Order).sort(byNewest);
    }
    let q: FirebaseFirestore.Query = db.collection("orders");
    if (campusId) q = q.where("campusId", "==", campusId);
    if (storeId) q = q.where("storeId", "==", storeId);
    const res = await q.limit(200).get();
    return res.docs.map((d) => d.data() as Order).sort(byNewest);
  },
  async findOrderByGatePass(code) {
    const q = await adminDb().collection("orders").where("gatePass.code", "==", code).limit(1).get();
    return q.empty ? null : (q.docs[0].data() as Order);
  },
  async seed() {
    const db = adminDb();
    const batch = db.batch();
    batch.set(db.collection("campuses").doc(LCU_CAMPUS.id), clean({ ...LCU_CAMPUS, seedVersion: SEED_VERSION }));
    const stores = seedStores();
    const products = seedProducts();
    stores.forEach((s) => batch.set(db.collection("stores").doc(s.id), clean(s)));
    products.forEach((p) => batch.set(db.collection("products").doc(p.id), clean(p)));
    await batch.commit();
    return { stores: stores.length, products: products.length };
  },
};

export const repo: Repo = firebaseAdminEnabled ? firestoreRepo : memoryRepo;

export { DEFAULT_CAMPUS_ID };

/** Strips identity documents and private details before sending a store to the public. */
export function toPublicStore(store: Store): Store {
  const { status, gatePassCode, reviewedAt } = store.verification;
  return { ...store, ownerUid: undefined, verification: { status, gatePassCode, reviewedAt } };
}
