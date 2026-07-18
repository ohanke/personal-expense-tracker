import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useWebSocket() {
  const { user } = useAuth();
  const wsRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('ws://localhost:3000');

        ws.onopen = () => {
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'budget_alert') {
              const { threshold, percentageUsed, budgetAmount, month } = data;

              const thresholdLabel = `${threshold}%`;
              const message = `⚠️ Budget Alert: You've reached ${thresholdLabel} of your budget (${percentageUsed}% used - $${budgetAmount} limit)`;

              toast.error(message, {
                duration: 6000,
                position: 'top-right',
                icon: '💸',
              });

              sendAcknowledge();
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          wsRef.current = null;
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
      }
    };

    const sendAcknowledge = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'acknowledge_alert' }));
        } catch (err) {
          console.error('Failed to send acknowledge:', err);
        }
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);
}
