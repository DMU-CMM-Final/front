import React, { useCallback, useRef, useState } from "react";
import styled from "styled-components";
import { Socket } from "socket.io-client";
import { ButtonGroup, CircleBtn, ResizeHandle } from './SharedStyles';

type ImageBox = {
  node: string; x: number; y: number; width: number; height: number;
  fileName: string; mimeType: string; tId: string; pId: string;
  uId: string; zIndex?: number;
};

interface ImageBoxesProps {
  imageBoxes: ImageBox[];
  setImageBoxes: React.Dispatch<React.SetStateAction<ImageBox[]>>;
  focusedImageIdx: number | null;
  setFocusedImageIdx: React.Dispatch<React.SetStateAction<number | null>>;
  mainAreaRef: React.RefObject<HTMLDivElement | null>;
  socketRef: React.RefObject<Socket | null>;
  getMaxZIndex: () => number;
  selectedProjectId: number | null;
}

const MIN_WIDTH = 50;
const MIN_HEIGHT = 50;

const ImageBoxes: React.FC<ImageBoxesProps> = ({
  imageBoxes, setImageBoxes, focusedImageIdx, setFocusedImageIdx,
  mainAreaRef, socketRef, getMaxZIndex, selectedProjectId
}) => {
  const dragOffset = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStart = React.useRef<{ startX: number; startY: number; startW: number; startH: number }>({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const imageBoxesRef = React.useRef(imageBoxes);
  imageBoxesRef.current = imageBoxes;
  const draggingIdxRef = React.useRef<number | null>(null);
  const resizingIdxRef = React.useRef<number | null>(null);

  const bringToFront = (idx: number) => {
    setImageBoxes(prev => {
      const maxZ = getMaxZIndex();
      return prev.map((box, i) => i === idx ? { ...box, zIndex: maxZ + 1 } : box);
    });
  };

  const handleDelete = (idx: number) => {
    if (!selectedProjectId) return;
    const node = imageBoxes[idx].node;
    socketRef.current?.emit("imageEvent", { 
      fnc: "delete", node, type: "image",
      pId: selectedProjectId
    });
    setImageBoxes(prev => prev.filter((_, i) => i !== idx));
    if (focusedImageIdx === idx) setFocusedImageIdx(null);
  };

  const handleDragStart = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    draggingIdxRef.current = idx;
    dragOffset.current = { x: e.clientX - imageBoxesRef.current[idx].x, y: e.clientY - imageBoxesRef.current[idx].y };
    window.addEventListener("mousemove", handleDragging);
    window.addEventListener("mouseup", handleDragOrResizeEnd);
  };

  const handleDragging = (e: MouseEvent) => {
    const idx = draggingIdxRef.current;
    if (idx === null || !mainAreaRef.current) return;
    const box = imageBoxesRef.current[idx];
    const rect = mainAreaRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, rect.width - box.width));
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, rect.height - box.height));
    setImageBoxes(prev => prev.map((img, i) => i === idx ? { ...img, x: newX, y: newY } : img));
  };
  
  const handleResizeStart = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    resizingIdxRef.current = idx;
    resizeStart.current = { startX: e.clientX, startY: e.clientY, startW: imageBoxesRef.current[idx].width, startH: imageBoxesRef.current[idx].height };
    window.addEventListener("mousemove", handleResizing);
    window.addEventListener("mouseup", handleDragOrResizeEnd);
  };

  const handleResizing = (e: MouseEvent) => {
    const idx = resizingIdxRef.current;
    if (idx === null || !mainAreaRef.current) return;
    const rect = mainAreaRef.current.getBoundingClientRect();
    const { startX, startY, startW, startH } = resizeStart.current;
    const newWidth = Math.max(MIN_WIDTH, Math.min(startW + e.clientX - startX, rect.width - imageBoxesRef.current[idx].x));
    const newHeight = Math.max(MIN_HEIGHT, Math.min(startH + e.clientY - startY, rect.height - imageBoxesRef.current[idx].y));
    setImageBoxes(prev => prev.map((img, i) => i === idx ? { ...img, width: newWidth, height: newHeight } : img));
  };
  
  const handleDragOrResizeEnd = useCallback(() => {
    const idx = draggingIdxRef.current ?? resizingIdxRef.current;
    if (idx !== null && selectedProjectId !== null) {
      const img = imageBoxesRef.current[idx];
      socketRef.current?.emit("imageEvent", {
        fnc: "move", node: img.node, type: "image",
        pId: selectedProjectId,
        cLocate: { x: img.x, y: img.y }, 
        cScale: { width: img.width, height: img.height }
      });
    }
    draggingIdxRef.current = null;
    resizingIdxRef.current = null;
    window.removeEventListener("mousemove", handleDragging);
    window.removeEventListener("mousemove", handleResizing);
    window.removeEventListener("mouseup", handleDragOrResizeEnd);
  }, [selectedProjectId, socketRef]);

  return (
    <>
      {imageBoxes.map((img, idx) => (
        <ImageBoxWrap
          key={img.node}
          $focused={focusedImageIdx === idx}
          style={{ left: img.x, top: img.y, width: img.width, height: img.height, zIndex: img.zIndex ?? 1 }}
          tabIndex={0}
          onFocus={() => { setFocusedImageIdx(idx); bringToFront(idx); }}
          onMouseDown={() => bringToFront(idx)}
          onBlur={() => setFocusedImageIdx(cur => (cur === idx ? null : cur))}
        >
          <img src={`https://blanksync.o-r.kr/node/api/image/${img.node}/${img.pId}/${img.tId}`} alt="" style={{ width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }} draggable={false} />
          {focusedImageIdx === idx && (
            <>
              <ButtonGroup>
                <CircleBtn color="#00d26a" title="이동" onMouseDown={e => handleDragStart(idx, e)} />
                <CircleBtn color="#ff4a4a" title="삭제" onMouseDown={e => { e.stopPropagation(); handleDelete(idx); }} />
              </ButtonGroup>
              <ResizeHandle onMouseDown={e => handleResizeStart(idx, e)} />
            </>
          )}
        </ImageBoxWrap>
      ))}
    </>
  );
};

// ImageBox.tsx

const ImageBoxWrap = styled.div<{ $focused: boolean }>` // ✅ 타입 정의 수정
  position: absolute;
  min-width: ${MIN_WIDTH}px;
  min-height: ${MIN_HEIGHT}px;
  background: transparent;
  border: 2px solid ${({ $focused }) => ($focused ? 'rgba(107, 91, 149, 0.5)' : 'transparent')}; // ✅ 사용 부분 수정
  border-radius: 8px;
  box-sizing: border-box;
  padding: 0;
  &:hover {
    border-color: ${({ $focused }) => ($focused ? '#6b5b95' : 'transparent')}; // ✅ 사용 부분 수정
  }
`;
export default ImageBoxes;