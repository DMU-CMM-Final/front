import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = "https://blanksync.o-r.kr";

export const useSocketManager = (teamId: string, userId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!teamId || !userId) {
      console.log('%c[SOCKET] Missing teamId or userId', 'color: red;', { teamId, userId });
      return;
    }

    console.log('%c[SOCKET] Creating new socket connection...', 'color: blue;');

    const newSocket = io(SOCKET_URL, {
      path: '/node/socket.io',
      transports: ["websocket"],
      forceNew: true, // ✅ 강제로 새 연결 생성
      timeout: 10000, // ✅ 연결 타임아웃 설정
    });

    // ✅ 즉시 소켓 상태 설정
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log('%c[SOCKET] Socket connected!', 'color: green; font-weight: bold;', {
        socketId: newSocket.id,
        connected: newSocket.connected,
        transport: newSocket.io.engine.transport.name
      });
      setIsConnected(true);
      
      // ✅ 서버가 기대하는 형식으로 이벤트 전송
      const joinData = { 
        uId: userId, 
        tId: teamId, 
        pId: "1" // PROJECT_ID
      };
      console.log('%c[SOCKET] Sending join-room event:', 'color: blue;', joinData);
      newSocket.emit("join-room", joinData);
    });

    newSocket.on("disconnect", (reason) => {
      console.log('%c[SOCKET] Socket disconnected:', 'color: red;', reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error('%c[SOCKET] Connection error:', 'color: red; font-weight: bold;', error);
      setIsConnected(false);
    });

    // ✅ 소켓 이벤트 디버깅을 위한 리스너
    newSocket.onAny((eventName, ...args) => {
      if (!eventName.startsWith('webrtc-') && !eventName.startsWith('existing-') && !eventName.startsWith('user-')) {
        console.log('%c[SOCKET EVENT]', 'color: purple; font-weight: bold;', eventName, args);
      }
    });

    return () => {
      console.log('%c[SOCKET] Disconnecting socket...', 'color: orange;');
      newSocket.disconnect();
      setSocket(null);
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [teamId, userId]);

  // ✅ 소켓 상태 변화를 추가 로깅
  useEffect(() => {
    console.log('%c[SOCKET STATE]', 'color: cyan;', {
      socket: !!socket,
      connected: isConnected,
      socketId: socket?.id
    });
  }, [socket, isConnected]);

  return { socket, isConnected };
};