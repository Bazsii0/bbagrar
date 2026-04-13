// components/NotificationToast.tsx
import { useNotification } from '../context/NotificationContext';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const NotificationToast = () => {
  const { notifications, removeNotification } = useNotification();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/90 dark:border-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/90 dark:border-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/90 dark:border-yellow-700';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/90 dark:border-blue-700';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-100';
      case 'error':
        return 'text-red-800 dark:text-red-100';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-100';
      default:
        return 'text-blue-800 dark:text-blue-100';
    }
  };

  const getTitleColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-400';
      case 'error':
        return 'text-red-800 dark:text-red-400';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-400';
      default:
        return 'text-blue-800 dark:text-blue-400';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm min-w-[320px] max-w-md ${getBgColor(notification.type)}`}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex-shrink-0">{getIcon(notification.type)}</div>
          <div className="flex-1">
            <h4 className={`font-semibold ${getTitleColor(notification.type)}`}>
              {notification.title}
            </h4>
            <p className={`text-sm mt-1 ${getTextColor(notification.type)}`}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className={`flex-shrink-0 ${getTextColor(notification.type)} hover:opacity-70 transition-opacity`}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;