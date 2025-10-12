import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// 타입 정의
interface TextBox {
  node: string;
  tId: string;
  pId: number;
  uId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  font: string;
  size: number;
  zIndex?: number;
  isOptimistic?: boolean;
}

interface VoteBox {
  node: string; tId: string; pId: number; uId: string; x: number; y: number;
  width: number; height: number; title: string; list: any[]; count: number[];
  users: any[]; zIndex?: number;
}

interface ImageBox {
  node: string; tId: string; pId: number; uId: string; x: number; y: number;
  width: number; height: number; fileName: string; mimeType: string; zIndex?: number;
}

type VoteUser = { uId: string, num: number };

// ✅ [수정됨] selectedProjectId를 인자로 받습니다.
export const useObjectManager = (socket: Socket | null, userId: string, selectedProjectId: number | null) => {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [voteBoxes, setVoteBoxes] = useState<VoteBox[]>([]);
  const [imageBoxes, setImageBoxes] = useState<ImageBox[]>([]);

  const onInit = useCallback((data: any) => {
    setTextBoxes(data.texts || []);
    setVoteBoxes(data.votes || []);
    setImageBoxes(data.images || []);
  }, []);

  const onAddTextBox = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
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
  }, [selectedProjectId]);
    
  const onUpdateTextBox = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setTextBoxes(prev => prev.map(box => box.node === data.node ? { ...box, 
        text: data.cContent !== undefined ? data.cContent : box.text,
        font: data.cFont !== undefined ? data.cFont : box.font,
        color: data.cColor !== undefined ? data.cColor : box.color,
        size: data.cSize !== undefined ? data.cSize : box.size
      } : box));
  }, [selectedProjectId]);

  const onMoveTextBox = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setTextBoxes(prev => prev.map(box => 
      box.node === data.node 
        ? { ...box, x: data.cLocate.x, y: data.cLocate.y, width: data.cScale.width, height: data.cScale.height }
        : box
    ));
  }, [selectedProjectId]);

  const onRemoveTextBox = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setTextBoxes(prev => prev.filter(box => box.node !== data.node));
  }, [selectedProjectId]);
    
  const onAddVote = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
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
  }, [selectedProjectId]);

  const onUpdateVote = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setVoteBoxes(prev => prev.map(box => 
      box.node === data.node ? { ...box, title: data.cTitle, list: data.cList } : box
    ));
  }, [selectedProjectId]);

  const onMoveVote = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setVoteBoxes(prev => prev.map(box => 
      box.node === data.node ? { ...box, x: data.cLocate.x, y: data.cLocate.y, width: data.cScale.width, height: data.cScale.height }
      : box
    ));
  }, [selectedProjectId]);

  const onRemoveVote = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setVoteBoxes(prev => prev.filter(box => box.node !== data.node));
  }, [selectedProjectId]);

  const onChoiceVote = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
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
  }, [selectedProjectId]);
    
  const onAddImage = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    const newImage: ImageBox = {
        node: data.node, tId: data.tId, pId: data.pId, uId: data.uId,
        x: data.cLocate?.x || 10, y: data.cLocate?.y || 10,
        width: data.cScale?.width || 200, height: data.cScale?.height || 200,
        fileName: data.fileName, mimeType: data.mimeType, zIndex: data.zIndex
    };
    setImageBoxes(prev => {
        const boxExists = prev.some(box => box.node === newImage.node);
        if (!boxExists) return [...prev, newImage];
        return prev;
    });
  }, [selectedProjectId]);

  const onMoveImage = useCallback((data: any) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setImageBoxes(prev => prev.map(box => 
      box.node === data.node ? { ...box, x: data.cLocate.x, y: data.cLocate.y, width: data.cScale.width, height: data.cScale.height }
      : box
    ));
  }, [selectedProjectId]);
  
  const onRemoveImage = useCallback((data: { node: string, pId: number }) => {
    if (data.pId !== selectedProjectId) return; // 필터링
    setImageBoxes(prev => prev.filter(box => box.node !== data.node));
  }, [selectedProjectId]);

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
    };
  }, [socket, onInit, onAddTextBox, onUpdateTextBox, onMoveTextBox, onRemoveTextBox, 
      onAddVote, onUpdateVote, onMoveVote, onRemoveVote, onChoiceVote,
      onAddImage, onMoveImage, onRemoveImage]);

  return { textBoxes, setTextBoxes, voteBoxes, setVoteBoxes, imageBoxes, setImageBoxes };
};