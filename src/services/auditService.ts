import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function logAudit(projectId: string, action: string, details: any) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await addDoc(collection(db, 'workspaces', projectId, 'auditLogs'), {
      userId: user.uid,
      userEmail: user.email,
      action,
      details,
      timestamp: serverTimestamp(),
      projectId
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
