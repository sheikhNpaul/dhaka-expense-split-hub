import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'expense' | 'payment' | 'system';
}

/**
 * Create a notification for a single user
 */
export const createNotification = async (notificationData: NotificationData): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('notifications')
      .insert({
        ...notificationData,
        read: false,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

/**
 * Create notifications for multiple users
 */
export const createNotificationsForUsers = async (
  userIds: string[],
  title: string,
  message: string,
  type: 'expense' | 'payment' | 'system'
): Promise<boolean> => {
  try {
    if (userIds.length === 0) return true;

    const notificationPromises = userIds.map(userId =>
      createNotification({
        user_id: userId,
        title,
        message,
        type,
      })
    );

    const results = await Promise.all(notificationPromises);
    return results.every(result => result);
  } catch (error) {
    console.error('Error creating notifications for users:', error);
    return false;
  }
};

/**
 * Create expense notification
 */
export const createExpenseNotification = async (
  participantIds: string[],
  payerName: string,
  expenseTitle: string,
  amount: number
): Promise<boolean> => {
  const participantsToNotify = participantIds.filter(id => id !== payerName);
  
  if (participantsToNotify.length === 0) return true;

  return createNotificationsForUsers(
    participantsToNotify,
    'New Expense Added',
    `${payerName} added a new expense: "${expenseTitle}" for ৳${amount.toFixed(2)}`,
    'expense'
  );
};

/**
 * Create payment request notification
 */
export const createPaymentRequestNotification = async (
  toUserId: string,
  fromUserName: string,
  amount: number,
  reason?: string
): Promise<boolean> => {
  const message = reason 
    ? `${fromUserName} requested ৳${amount.toFixed(2)} from you for ${reason}`
    : `${fromUserName} requested ৳${amount.toFixed(2)} from you`;

  return createNotification({
    user_id: toUserId,
    title: 'Payment Request',
    message,
    type: 'payment',
  });
};

/**
 * Create payment status update notification
 */
export const createPaymentStatusNotification = async (
  fromUserId: string,
  responderName: string,
  amount: number,
  status: 'approved' | 'rejected'
): Promise<boolean> => {
  const statusText = status === 'approved' ? 'approved' : 'rejected';
  
  return createNotification({
    user_id: fromUserId,
    title: 'Payment Request Update',
    message: `${responderName} ${statusText} your payment request of ৳${amount.toFixed(2)}`,
    type: 'payment',
  });
};

/**
 * Create home member notification
 */
export const createHomeMemberNotification = async (
  memberIds: string[],
  newMemberName: string,
  homeName: string
): Promise<boolean> => {
  return createNotificationsForUsers(
    memberIds,
    'New Home Member',
    `${newMemberName} joined your home: "${homeName}"`,
    'system'
  );
};

/**
 * Create profile update notification
 */
export const createProfileUpdateNotification = async (userId: string): Promise<boolean> => {
  return createNotification({
    user_id: userId,
    title: 'Profile Updated',
    message: 'Your profile information has been successfully updated.',
    type: 'system',
  });
};

/**
 * Create system notification
 */
export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string
): Promise<boolean> => {
  return createNotification({
    user_id: userId,
    title,
    message,
    type: 'system',
  });
}; 