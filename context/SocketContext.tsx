
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotification } from './NotificationContext';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { showToast } = useNotification();

    useEffect(() => {
        // Connect to current host
        const newSocket = io(window.location.origin, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('✅ WebSocket Connected');
        });

        newSocket.on('lead_update', (data: any) => {
            showToast(`Lead actualizado: ${data.name || 'Desconocido'}`);
        });

        newSocket.on('dashboard_update', (data: any) => {
            console.log('Dashboard update received', data);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
