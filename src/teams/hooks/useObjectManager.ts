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

export const useObjectManager = (socket: Socket | null, userId: string, selectedProjectId: number | null) => {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [voteBoxes, setVoteBoxes] = useState<VoteBox[]>([]);
  const [imageBoxes, setImageBoxes] = useState<ImageBox[]>([]);
  const [drawings, setDrawings] = useState<DrawingStroke[]>([]);

  const projectIdRef = useRef(selectedProjectId);
  useEffect(() => {
    projectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  const onInit = useCallback((data: any) => {
    setTextBoxes(data.texts || []);
    setVoteBoxes(data.votes || []);
    setImageBoxes(data.images || []);
    setDrawings(data.drawings || []); 
  }, []);

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
  
  // [수정] 획 시작 (중복 확인 로직)
  const onRemoteStartDrawing = useCallback((data: { stroke: DrawingStroke }) => {
    if (data.stroke.pId !== projectIdRef.current) return;
    
    // [핵심] 
    // 서버가 나에게도 획을 다시 보내주므로,
    // 내가 낙관적 업데이트로 이미 추가한 획인지(node가 같은지) 확인합니다.
    setDrawings(prev => {
      const strokeExists = prev.some(s => s.node === data.stroke.node);
      if (strokeExists) {
        return prev; // 이미 있으면 추가하지 않음 (중복 방지)
      }
      return [...prev, data.stroke];
    });
  }, [projectIdRef]); // drawings 의존성 제거

  // 획 이동 (다른 사람)
  const onRemoteDrawingEvent = useCallback((data: { node: string, x: number, y: number, uId: string, pId: number }) => {
    // [핵심] 내가 그린 획(uId === userId)에 대한 이벤트는 무시.
    if (data.uId === userId || data.pId !== projectIdRef.current) return;
    
    const newPoint = { x: data.x, y: data.y };
    setDrawings(prev => 
      prev.map(stroke =>
        stroke.node === data.node
          ? { ...stroke, points: [...stroke.points, newPoint] }
          : stroke
      )
    );
  }, [userId]);
  
  // 획 종료
  const onRemoteFinishDrawing = useCallback(() => {
    // 로컬 상태에서는 특별히 할 일 없음
  }, []);

  // 획 삭제
  const onRemoteRemoveStroke = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== projectIdRef.current) return;
    setDrawings(prev => prev.filter(stroke => stroke.node !== data.node));
  }, []);


  useEffect(() => {
    if (!socket) return;
    socket.on("init", onInit);
    socket.on("project-init", onInit);
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
    
    // 드로잉 리스너 등록
    socket.on("remote-start-drawing", onRemoteStartDrawing);
    socket.on("remote-drawing-event", onRemoteDrawingEvent);
    socket.on("remote-finish-drawing", onRemoteFinishDrawing);
    socket.on("remote-drawing-stroke", onRemoteRemoveStroke);

    return () => {
      socket.off("init", onInit);
      socket.off("project-init", onInit);
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
      
      // 드로잉 리스너 해제
      socket.off("remote-start-drawing", onRemoteStartDrawing);
      socket.off("remote-drawing-event", onRemoteDrawingEvent);
      socket.off("remote-finish-drawing", onRemoteFinishDrawing);
      socket.off("remote-drawing-stroke", onRemoteRemoveStroke);
    };
  }, [socket, onInit, onAddTextBox, onUpdateTextBox, onMoveTextBox, onRemoveTextBox, 
      onAddVote, onUpdateVote, onMoveVote, onRemoveVote, onChoiceVote,
      onAddImage, onMoveImage, onRemoveImage,
      onRemoteStartDrawing, onRemoteDrawingEvent, onRemoteFinishDrawing, onRemoteRemoveStroke]);

  return { textBoxes, setTextBoxes, voteBoxes, setVoteBoxes, imageBoxes, setImageBoxes, drawings, setDrawings };
};