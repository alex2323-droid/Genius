export type FeedbackCategory = 'general' | 'feature' | 'design' | 'bug' | 'ai';

export interface FeedbackItem {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  rating: number; // 1 to 5
  category: FeedbackCategory;
  comment: string;
  likes: number;
  status?: 'pending' | 'reviewing' | 'planned' | 'implemented';
  createdAt: string;
}
