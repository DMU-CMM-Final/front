// [파일명: useObjectManager.ts]
import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

// --- 타입 정의 ---
export interface DrawingStrokePoint {
  x: number;
  y: number;
}
export interface DrawingStroke {
  node: string;
  pId: number;
  uId: string;
  color: string;
  width: number;
  isEraser: boolean;
  points: DrawingStrokePoint[];
}
// ... (TextBox, VoteBox, ImageBox, VoteUser 타입은 동일) ...
interface TextBox {
  node: string; tId: string; pId: number; uId: string; x: number; y: number;
  width: number; height: number; text: string; color: string; font: string;
  size: number; zIndex?: number; isOptimistic?: boolean;
}
interface VoteBox {
  node: string; tId: string; pId: number; uId: string; x: number; y: number;
  width: number; height: number; title: string; list: any[]; count: number[];
  users: any[]; zIndex?: number;
}
interface ImageBox {
  node: string; tId: number; pId: number; uId: string; x: number; y: number;
  width: number; height: number; fileName: string; mimeType: string; zIndex?: number;
}
type VoteUser = { uId: string, num: number };

interface RemoteStartDrawingData {
  x: number;
  y: number;
  pId: number;
  node: string;
  color: string;
  width: number;
  isEraser: boolean;
  uId: string;
}

// 🚀 [수정 1] hook이 drawingsRef를 인자로 받음
export const useObjectManager = (
  socket: Socket | null, 
  userId: string, 
  selectedProjectId: number | null, 
  drawingsRef: React.RefObject<DrawingStroke[]> // ref 인자 추가
) => {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [voteBoxes, setVoteBoxes] = useState<VoteBox[]>([]);
  const [imageBoxes, setImageBoxes] = useState<ImageBox[]>([]);
  
  const [snapshotData, setSnapshotData] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<DrawingStroke[]>([]); // 렌더링 트리거용 state

  const projectIdRef = useRef(selectedProjectId);
  useEffect(() => {
    projectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  // 🚀 [수정 2] onInit 핸들러 (ref를 즉시 비움)
  const onInit = useCallback((data: any) => {
    console.log("Received [init] or [project-init]", data);
    setTextBoxes(data.texts || []);
    setVoteBoxes(data.votes || []);
    setImageBoxes(data.images || []);
    
    // (서버가 'init' 시 'drawings' 키, 'snapshot' 시 'drawingSnapshot' 키 사용)
    const initialSnapshot = data.drawings || data.drawingSnapshot || null;
    setSnapshotData(initialSnapshot);
    
    // ref와 state를 즉시 비움
    if (drawingsRef.current) { 
      drawingsRef.current = []; 
    }
    setDrawings([]); 
  }, [drawingsRef]); // drawingsRef 의존성 추가

  // 🚀 [수정 3] onSnapshotUpdated 핸들러 (ref를 즉시 비움)
  const onSnapshotUpdated = useCallback((data: any) => {
    console.log("Received [snapshot-updated]", data); 

    if (!data || !drawingsRef.current) {
      console.warn("[snapshot-updated] received empty or null data.");
      return;
    }

    if (data.pId !== projectIdRef.current) {
      console.log("Snapshot update received, but for a different project.");
      return;
    }

    if (data.drawingSnapshot) {
      console.log("Setting new snapshot from 'drawingSnapshot' key.");
      setSnapshotData(data.drawingSnapshot); 
      
      // ref와 state를 즉시 비움
      drawingsRef.current = []; 
      setDrawings([]); 
    } else {
      console.warn("[snapshot-updated] event payload missing 'drawingSnapshot' key.", data);
    }
  }, [projectIdRef, drawingsRef]); // drawingsRef 의존성 추가

  // ... (textBox, voteBox, imageBox 핸들러는 이전과 동일) ...
  const onAddTextBox = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    const newBoxFromServer: TextBox = {
      node: data.node, tId: data.tId, pId: data.pId, uId: data.uId,
      x: data.cLocate?.x || 10, y: data.cLocate?.y || 10,
      width: data.cScale?.width || 200, height: data.cScale?.height || 40,
      text: data.cContent || "", color: data.cColor || "#000000",
      font: data.cFont || "Arial", size: data.cSize || 16,
      zIndex: data.zIndex, 
      isOptimistic: false
    };
    setTextBoxes(prev => {
      const optimisticIndex = prev.findIndex(box => box.isOptimistic === true);
      if (optimisticIndex > -1) {
        const newState = [...prev];
        newState[optimisticIndex] = newBoxFromServer;
        return newState;
      } else {
        const exists = prev.some(box => box.node === newBoxFromServer.node);
        if (!exists) {
          return [...prev, newBoxFromServer];
        }
      }
      return prev;
    });
  }, []);
  const onUpdateTextBox = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    setTextBoxes(prev => prev.map(box => box.node === data.node ? { ...box, 
        text: data.cContent !== undefined ? data.cContent : box.text,
        font: data.cFont !== undefined ? data.cFont : box.font,
        color: data.cColor !== undefined ? data.cColor : box.color,
        size: data.cSize !== undefined ? data.cSize : box.size
      } : box));
  }, []);
  const onMoveTextBox = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    setTextBoxes(prev => prev.map(box => 
      box.node === data.node 
        ? { ...box, x: data.cLocate.x, y: data.cLocate.y, width: data.cScale.width, height: data.cScale.height }
        : box
    ));
  }, []);
  const onRemoveTextBox = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== projectIdRef.current) return;
    setTextBoxes(prev => prev.filter(box => box.node !== data.node));
  }, []);
  const onAddVote = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    const newVote: VoteBox = {
        node: data.node, tId: data.tId, pId: data.pId, uId: data.uId,
        x: data.cLocate?.x || 10, y: data.cLocate?.y || 10,
        width: data.cScale?.width || 300, height: data.cScale?.height || 200,
        title: data.cTitle || "새 투표", list: data.cList || [],
        count: data.count || [], users: data.users || [], zIndex: data.zIndex
    };
    setVoteBoxes(prev => {
        const boxExists = prev.some(box => box.node === newVote.node);
        if (!boxExists) return [...prev, newVote];
        return prev;
    });
  }, []);
  const onUpdateVote = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    setVoteBoxes(prev => prev.map(box => 
      box.node === data.node ? { ...box, title: data.cTitle, list: data.cList } : box
    ));
  }, []);
  const onMoveVote = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    setVoteBoxes(prev => prev.map(box => 
      box.node === data.node ? { ...box, x: data.cLocate.x, y: data.cLocate.y, width: data.cScale.width, height: data.cScale.height }
      : box
    ));
  }, []);
  const onRemoveVote = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== projectIdRef.current) return;
    setVoteBoxes(prev => prev.filter(box => box.node !== data.node));
  }, []);
  const onChoiceVote = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    setVoteBoxes(prev => prev.map(box => { 
      if (box.node === data.node) { 
        const newUsers = [ 
          ...box.users.filter((u: VoteUser) => u.uId !== data.user), 
          ...(data.num >= 1 && data.num <= 4 ? [{ uId: data.user, num: data.num }] : []) 
        ]; 
        return { ...box, count: data.count, users: newUsers }; 
      } 
      return box; 
    }));
  }, []);
  const onAddImage = useCallback((data: any) => {
    if (Number(data.pId) !== projectIdRef.current) return;
    const newImage: ImageBox = {
        node: data.node,
        tId: Number(data.tId),
        pId: Number(data.pId), 
        uId: data.uId,
        x: data.cLocate?.x || 10, y: data.cLocate?.y || 10,
        width: data.cScale?.width || 200, height: data.cScale?.height || 200,
        fileName: data.fileName, mimeType: data.mimeType, zIndex: data.zIndex
    };
    setImageBoxes(prev => {
        const boxExists = prev.some(box => box.node === newImage.node);
        if (!boxExists) return [...prev, newImage];
        return prev;
    });
  }, []); 
  const onMoveImage = useCallback((data: any) => {
    if (data.pId !== projectIdRef.current) return;
    setImageBoxes(prev => prev.map(box => 
      box.node === data.node ? { ...box, x: data.cLocate.x, y: data.cLocate.y, width: data.cScale.width, height: data.cScale.height }
      : box
    ));
  }, []);
  const onRemoveImage = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== projectIdRef.current) return;
    setImageBoxes(prev => prev.filter(box => box.node !== data.node));
  }, []);

  // --- 실시간 드로잉 이벤트 리스너 ---
  
  // 🚀 [수정 4] onRemoteStartDrawing (ref를 즉시 업데이트)
  const onRemoteStartDrawing = useCallback((data: RemoteStartDrawingData) => {
    if (data.pId !== projectIdRef.current || !drawingsRef.current) return;
    if (data.uId === userId) return; 

    const newStroke: DrawingStroke = {
      node: data.node, pId: data.pId, uId: data.uId,
      color: data.color, width: data.width, isEraser: data.isEraser,
      points: [{ x: data.x, y: data.y }]
    };

    // ref를 기준으로 즉시 업데이트
    const strokeExists = drawingsRef.current.some(s => s.node === newStroke.node);
    if (strokeExists) return;

    const newState = [...drawingsRef.current, newStroke];
    drawingsRef.current = newState; // 1. ref 즉시 업데이트
    setDrawings(newState);          // 2. 렌더링 요청
    
  }, [userId, projectIdRef, drawingsRef]); // drawingsRef 의존성 추가

  // 🚀 [수정 5] onRemoteDrawingEvent (ref를 즉시 업데이트)
  const onRemoteDrawingEvent = useCallback((data: { node: string, x: number, y: number, pId: number }) => {
    if (data.pId !== projectIdRef.current || !drawingsRef.current) return;
    
    const newPoint = { x: data.x, y: data.y };
    
    // ref를 기준으로 즉시 업데이트
    const newState = drawingsRef.current.map(stroke =>
      stroke.node === data.node
        ? { ...stroke, points: [...stroke.points, newPoint] }
        : stroke
    );
    drawingsRef.current = newState; // 1. ref 즉시 업데이트
    setDrawings(newState);          // 2. 렌더링 요청

  }, [projectIdRef, drawingsRef]); // drawingsRef 의존성 추가
  
  const onRemoteFinishDrawing = useCallback(() => {
    // 로컬 상태에서는 특별히 할 일 없음
  }, []);

  const onRemoteRemoveStroke = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== projectIdRef.current || !drawingsRef.current) return;
    
    // ref를 기준으로 즉시 업데이트
    const newState = drawingsRef.current.filter(stroke => stroke.node !== data.node)
    drawingsRef.current = newState; // 1. ref 즉시 업데이트
    setDrawings(newState);          // 2. 렌더링 요청

  }, [projectIdRef, drawingsRef]); // drawingsRef 의존성 추가


  useEffect(() => {
    if (!socket) return;
    socket.on("init", onInit);
    socket.on("project-init", onInit);
    socket.on("snapshot-updated", onSnapshotUpdated); 
    socket.on("addTextBox", onAddTextBox);
    socket.on("updateTextBox", onUpdateTextBox);
    socket.on("moveTextBox", onMoveTextBox);
    socket.on("removeTextBox", onRemoveTextBox);
    socket.on("addVote", onAddVote);
    socket.on("updateVote", onUpdateVote);
    socket.on("moveVote", onMoveVote);
    socket.on("removeVote", onRemoveVote);
    socket.on("choiceVote", onChoiceVote);
    socket.on("addImage", onAddImage);
    socket.on("moveImage", onMoveImage);
    socket.on("removeImage", onRemoveImage);
    
    // 🚀 [수정] 핸들러가 모두 변경됨
    socket.on("remote-start-drawing", onRemoteStartDrawing);
    socket.on("remote-drawing-event", onRemoteDrawingEvent); 
    socket.on("remote-finish-drawing", onRemoteFinishDrawing);
    socket.on("remote-drawing-stroke", onRemoteRemoveStroke);

    return () => {
      socket.off("init", onInit);
      socket.off("project-init", onInit);
      socket.off("snapshot-updated", onSnapshotUpdated);
      socket.off("addTextBox", onAddTextBox);
      socket.off("updateTextBox", onUpdateTextBox);
      socket.off("moveTextBox", onMoveTextBox);
      socket.off("removeTextBox", onRemoveTextBox);
      socket.off("addVote", onAddVote);
      socket.off("updateVote", onUpdateVote);
      socket.off("moveVote", onMoveVote);
      socket.off("removeVote", onRemoveVote);
      socket.off("choiceVote", onChoiceVote);
      socket.off("addImage", onAddImage);
      socket.off("moveImage", onMoveImage);
      socket.off("removeImage", onRemoveImage);
      
      socket.off("remote-start-drawing", onRemoteStartDrawing);
      socket.off("remote-drawing-event", onRemoteDrawingEvent);
      socket.off("remote-finish-drawing", onRemoteFinishDrawing);
      socket.off("remote-drawing-stroke", onRemoteRemoveStroke);
    };
  }, [socket, onInit, onAddTextBox, onUpdateTextBox, onMoveTextBox, onRemoveTextBox, 
      onAddVote, onUpdateVote, onMoveVote, onRemoveVote, onChoiceVote,
      onAddImage, onMoveImage, onRemoveImage,
      onRemoteStartDrawing, onRemoteDrawingEvent, onRemoteFinishDrawing, onRemoteRemoveStroke, onSnapshotUpdated]);

  return { 
    textBoxes, setTextBoxes, 
    voteBoxes, setVoteBoxes, 
    imageBoxes, setImageBoxes, 
    drawings, setDrawings,
    snapshotData 
  };
};