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

// (서버 -> 클라이언트) remote-start-drawing 명세 타입
interface RemoteStartDrawingData {
  x: number;
  y: number;
  pId: number;
  node: string;
  color: string;
  width: number;
  isEraser: boolean;
  uId: string; // 🚀 명세에 따라 서버가 uId를 줌
}

export const useObjectManager = (socket: Socket | null, userId: string, selectedProjectId: number | null) => {
  const [textBoxes, setTextBoxes] = (useState<TextBox[]>([]));
  const [voteBoxes, setVoteBoxes] = (useState<VoteBox[]>([]));
  const [imageBoxes, setImageBoxes] = (useState<ImageBox[]>([]));
  
  const [snapshotData, setSnapshotData] = (useState<string | null>(null));
  const [drawings, setDrawings] = (useState<DrawingStroke[]>([])); 

  const projectIdRef = useRef(selectedProjectId);
  useEffect(() => {
    projectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  const onInit = useCallback((data: any) => {
    setTextBoxes(data.texts || []);
    setVoteBoxes(data.votes || []);
    setImageBoxes(data.images || []);
    
    // 🚀 이 로직이 'snapshot-updated' 이벤트에서도 실행됩니다.
    setSnapshotData(data.snapshotData || null);
    setDrawings([]); // 🚀 캔버스 획(수정사항)을 비웁니다.
  }, []);

  const onSnapshotUpdated = useCallback((data: any) => {
    // 1. 서버가 snapshotData를 보냈는지 확인
    if (data.snapshotData !== undefined) {
      setSnapshotData(data.snapshotData);
    }
    // 2. 획(수정사항)은 항상 비웁니다.
    // (이래야 '나가기' 로직이 제대로 동작합니다)
    setDrawings([]);
  }, []); // 의존성 배열은 비워 둡니다.

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
  
  // 획 시작 (서버가 uId를 포함해서 보내줌)
  const onRemoteStartDrawing = useCallback((data: RemoteStartDrawingData) => {
    if (data.pId !== projectIdRef.current) return;
    
    // 🚀 [수정] 
    // 명세에 따라 서버가 uId를 주므로, 이 uId로 내가 보낸 획인지 판별합니다.
    // (이 로직은 "유지"하는 것이 맞습니다.)
    if (data.uId === userId) return; 

    // 수신한 '펼쳐진' 데이터를 'DrawingStroke' 객체로 재구성
    const newStroke: DrawingStroke = {
      node: data.node,
      pId: data.pId,
      uId: data.uId,
      color: data.color,
      width: data.width,
      isEraser: data.isEraser,
      points: [{ x: data.x, y: data.y }]
    };

    setDrawings(prev => {
      const strokeExists = prev.some(s => s.node === newStroke.node);
      if (strokeExists) return prev; 
      return [...prev, newStroke];
    });
  }, [userId, projectIdRef]);

  // 획 이동 (서버가 uId를 안줌)
  const onRemoteDrawingEvent = useCallback((data: { node: string, x: number, y: number, pId: number }) => {
    // 🚀 [수정] 
    // 명세에 uId가 없으므로 uId 필터링 로직을 "제거"합니다.
    // (서버가 보낸 사람을 제외하고 broadcast 한다고 가정합니다.)
    // if (data.uId && data.uId === userId) return; // 🚀 이 로직 제거
    
    if (data.pId !== projectIdRef.current) return;
    
    const newPoint = { x: data.x, y: data.y };
    setDrawings(prev => 
      prev.map(stroke =>
        stroke.node === data.node
          ? { ...stroke, points: [...stroke.points, newPoint] }
          : stroke
      )
    );
  }, [projectIdRef]); // 🚀 의존성 배열에서 userId 제거
  
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

    // 🚀 [추가] 서버가 스냅샷 저장을 완료하고 브로드캐스트하는 이벤트
    // (서버가 init과 동일한 데이터 구조(snapshotData 필드 포함)를 보내야 함)
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
    
    // 드로잉 리스너 등록
    socket.on("remote-start-drawing", onRemoteStartDrawing);
    socket.on("remote-drawing-event", onRemoteDrawingEvent); // 🚀 핸들러 수정됨
    socket.on("remote-finish-drawing", onRemoteFinishDrawing);
    socket.on("remote-drawing-stroke", onRemoteRemoveStroke);

    return () => {
      socket.off("init", onInit);
      socket.off("project-init", onInit);
      socket.off("snapshot-updated", onSnapshotUpdated); // 🚀 [추가] 리스너 해제
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
      onRemoteStartDrawing, onRemoteDrawingEvent, onRemoteFinishDrawing, onRemoteRemoveStroke, onSnapshotUpdated]);

  return { 
    textBoxes, setTextBoxes, 
    voteBoxes, setVoteBoxes, 
    imageBoxes, setImageBoxes, 
    drawings, setDrawings,
    snapshotData 
  };
};