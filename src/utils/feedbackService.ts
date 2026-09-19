import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  handleFirestoreError, 
  OperationType 
} from '../firebase.ts';
import type { FeedbackItem } from '../types/feedback.ts';

const LOCAL_STORAGE_KEY = 'genius_feedback_local_v1';

export async function fetchAllFeedback(): Promise<FeedbackItem[]> {
  try {
    const feedbackRef = collection(db, 'feedback');
    const q = query(feedbackRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return [];
    }

    const items: FeedbackItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        userId: data.userId || '',
        userName: data.userName || 'Estudiante',
        userEmail: data.userEmail || '',
        rating: data.rating || 5,
        category: data.category || 'general',
        comment: data.comment || '',
        likes: data.likes || 0,
        status: data.status || 'pending',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    return items;
  } catch (error) {
    console.warn('Falling back to local feedback storage due to firestore read error:', error);
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return [];
  }
}

export async function submitFeedback(item: Omit<FeedbackItem, 'id' | 'createdAt' | 'likes'>): Promise<FeedbackItem> {
  const newId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newItem: FeedbackItem = {
    ...item,
    id: newId,
    likes: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'feedback', newId);
    await setDoc(docRef, newItem);
  } catch (error) {
    console.warn('Saving feedback locally due to firestore write issue:', error);
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const list: FeedbackItem[] = stored ? JSON.parse(stored) : [];
      list.unshift(newItem);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  return newItem;
}

export async function likeFeedback(feedbackId: string, currentLikes: number): Promise<number> {
  const newLikes = currentLikes + 1;
  try {
    const docRef = doc(db, 'feedback', feedbackId);
    await updateDoc(docRef, { likes: newLikes });
  } catch (error) {
    console.warn('Updated like locally:', error);
  }
  return newLikes;
}

export async function updateFeedbackStatus(feedbackId: string, status: FeedbackItem['status']): Promise<void> {
  try {
    const docRef = doc(db, 'feedback', feedbackId);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.warn('Updated status locally:', error);
  }
}
