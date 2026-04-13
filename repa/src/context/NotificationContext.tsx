// contexts/NotificationContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 5000);
  }, [removeNotification]);

  const success = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ title, message, type: 'success', duration });
  }, [addNotification]);

  const error = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ title, message, type: 'error', duration });
  }, [addNotification]);

  const info = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ title, message, type: 'info', duration });
  }, [addNotification]);

  const warning = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ title, message, type: 'warning', duration });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    warning,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};