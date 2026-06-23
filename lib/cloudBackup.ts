import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { firebaseAuth, firestore } from "./firebase";

// ── Configuration ────────────────────────────────────────────────────────────

GoogleSignin.configure({
  webClientId:
    "702480678464-ajrk7057ogcgvfgo8baebipdb6t2gnrn.apps.googleusercontent.com",
  offlineAccess: false,
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<User> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error("لم يتم الحصول على رمز المصادقة من Google");

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(firebaseAuth, credential);
  return result.user;
}

export async function signOutGoogle(): Promise<void> {
  await GoogleSignin.signOut();
  await firebaseSignOut(firebaseAuth);
}

export function getCurrentUser(): User | null {
  return firebaseAuth.currentUser;
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, cb);
}

export function getGoogleSignInError(error: unknown): string {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return "تم إلغاء تسجيل الدخول";
      case statusCodes.IN_PROGRESS:
        return "تسجيل الدخول جاري بالفعل";
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return "خدمات Google Play غير متوفرة";
      default:
        return "حدث خطأ أثناء تسجيل الدخول";
    }
  }
  return error instanceof Error ? error.message : "خطأ غير معروف";
}

// ── Backup types ──────────────────────────────────────────────────────────────

export interface CloudBackupDoc {
  version: number;
  exportedAt: string;
  uploadedAt: string;
  settings: Record<string, string>;
  cycles: Array<{
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_locked: number;
  }>;
  expenses: Array<{
    id: number;
    cycle_id: number;
    date: string;
    amount: number;
    is_entered: number;
  }>;
}

// ── Firestore operations ──────────────────────────────────────────────────────

export async function uploadBackupToCloud(
  backup: Omit<CloudBackupDoc, "uploadedAt">
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const docRef = doc(firestore, "users", user.uid, "backups", "latest");
  await setDoc(docRef, {
    ...backup,
    uploadedAt: new Date().toISOString(),
  });
}

export async function downloadBackupFromCloud(): Promise<CloudBackupDoc> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");

  const docRef = doc(firestore, "users", user.uid, "backups", "latest");
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("لا توجد نسخة احتياطية محفوظة في السحابة");

  return snap.data() as CloudBackupDoc;
}

export async function getLastCloudBackupDate(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  try {
    const docRef = doc(firestore, "users", user.uid, "backups", "latest");
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return (snap.data() as CloudBackupDoc).uploadedAt ?? null;
  } catch {
    return null;
  }
}
