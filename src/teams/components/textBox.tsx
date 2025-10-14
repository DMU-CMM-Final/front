import React, { useCallback, useRef, useState } from "react";
import styled from "styled-components";
import { Socket } from "socket.io-client";
import { ButtonGroup, CircleBtn, ResizeHandle } from './SharedStyles';

const MIN_WIDTH = 50;
const MIN_HEIGHT = 30;

const TextBoxInputBase = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { width: number; height: number }
>(({ width, height, style, ...rest }, ref) => (
  <textarea
    ref={ref}
    style={{
      width: width - 16,
      height: height - 16,
      padding: 8,
      border: "none",
      background: "transparent",
      resize: "none",
      outline: "none",
      minWidth: MIN_WIDTH - 16,
      minHeight: MIN_HEIGHT - 16,
      boxSizing: "border-box",
      ...style,
    }}
    {...rest}
  />
));
TextBoxInputBase.displayName = "TextBoxInputBase";

const TextBoxInput = styled(TextBoxInputBase)<{ $focused?: boolean }>`
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
  -ms-overflow-style: none;

  ${({ $focused }) =>
    $focused &&
    `
      &::-webkit-scrollbar { display: initial; }
      scrollbar-width: auto;
      -ms-overflow-style: auto;
    `}
`;

type TextBox = { 
  x: number; y: number; text: string; width: number; height: number;
  color: string; size: number; font: string; node?: string; zIndex?: number;
};

interface TextBoxesProps {
  textBoxes: TextBox[];
  setTextBoxes: React.Dispatch<React.SetStateAction<TextBox[]>>;
  focusedIdx: number | null;
  setFocusedIdx: React.Dispatch<React.SetStateAction<number | null>>;
  mainAreaRef: React.RefObject<HTMLDivElement | null>;
  socketRef: React.RefObject<Socket | null>;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  getMaxZIndex: () => number;
  selectedProjectId: number | null;
}

const TextBoxes: React.FC<TextBoxesProps> = ({
  getMaxZIndex, textBoxes, setTextBoxes, focusedIdx, setFocusedIdx,
  mainAreaRef, socketRef, toolbarRef, selectedProjectId
}) => {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [resizingIdx, setResizingIdx] = useState<number | null>(null);
  
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStart = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0, startY: 0, startW: 0, startH: 0
  });
  const textBoxesRef = useRef(textBoxes);
  textBoxesRef.current = textBoxes;
  const draggingIdxRef = useRef(draggingIdx);
  draggingIdxRef.current = draggingIdx;
  const resizingIdxRef = useRef(resizingIdx);
  resizingIdxRef.current = resizingIdx;

  const bringToFront = (idx: number) => {
    setTextBoxes(prev => {
      const maxZ = getMaxZIndex();
      return prev.map((box, i) =>
        i === idx ? { ...box, zIndex: maxZ + 1 } : box
      );
    });
  };
  
  React.useEffect(() => {
    if (focusedIdx !== null && inputRefs.current[focusedIdx]) {
      inputRefs.current[focusedIdx]!.focus();
      const len = inputRefs.current[focusedIdx]!.value.length;
      inputRefs.current[focusedIdx]!.setSelectionRange(len, len);
    }
  }, [focusedIdx, textBoxes.length]);

  // ✅ [수정됨] 타이밍 이슈를 해결하는 안정적인 로직으로 변경
  const handleTextBoxChange = (idx: number, value: string) => {
    setTextBoxes(prev => {
      // 1. 먼저 다음 상태를 만듭니다.
      const newState = prev.map((box, i) => (i === idx ? { ...box, text: value } : box));
      
      // 2. 다음 상태에서 수정된 박스 정보를 가져옵니다.
      const updatedBox = newState[idx];

      // 3. 해당 박스에 영구 ID가 있고, 프로젝트가 선택된 상태인지 확인 후 서버로 이벤트를 보냅니다.
      // 'optimistic-'으로 시작하는 임시 ID는 보내지 않습니다.
      if (updatedBox?.node && !updatedBox.node.startsWith('optimistic-') && selectedProjectId) {
        socketRef.current?.emit("textEvent", { 
          fnc: "update", 
          node: updatedBox.node, 
          cContent: value, 
          type: "text", 
          pId: selectedProjectId 
        });
      }
      
      // 4. 마지막으로 새로운 상태를 반환합니다.
      return newState;
    });
  };

  // ✅ [수정됨] 타이밍 이슈를 해결하는 안정적인 로직으로 변경
  const handleDelete = (idx: number) => {
    setTextBoxes(prev => {
      // 1. 삭제할 박스 정보를 최신 상태에서 가져옵니다.
      const boxToDelete = prev[idx];

      // 2. 해당 박스에 영구 ID가 있는지 확인 후 서버로 이벤트를 보냅니다.
      if (boxToDelete?.node && !boxToDelete.node.startsWith('optimistic-') && selectedProjectId) {
        socketRef.current?.emit("textEvent", { 
          fnc: "delete", 
          node: boxToDelete.node, 
          type: "text", 
          pId: selectedProjectId 
        });
      }

      // 3. 로컬 상태에서 박스를 제거한 새로운 배열을 반환합니다.
      return prev.filter((_, i) => i !== idx);
    });

    if (focusedIdx === idx) {
      setFocusedIdx(null);
    }
  };

  const handleDragStart = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingIdx(idx);
    dragOffset.current = { x: e.clientX - textBoxesRef.current[idx].x, y: e.clientY - textBoxesRef.current[idx].y };
    window.addEventListener("mousemove", handleDragging);
    window.addEventListener("mouseup", handleDragOrResizeEnd);
  };

  const handleDragging = useCallback((e: MouseEvent) => {
    const idx = draggingIdxRef.current;
    if (idx === null || !mainAreaRef.current) return;
    const rect = mainAreaRef.current.getBoundingClientRect();
    const box = textBoxesRef.current[idx];
    const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, rect.width - box.width));
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, rect.height - box.height));
    setTextBoxes(prev => prev.map((b, i) => i === idx ? { ...b, x: newX, y: newY } : b));
  }, [mainAreaRef, setTextBoxes]);

  const handleResizeStart = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingIdx(idx);
    resizeStart.current = { startX: e.clientX, startY: e.clientY, startW: textBoxesRef.current[idx].width, startH: textBoxesRef.current[idx].height };
    window.addEventListener("mousemove", handleResizing);
    window.addEventListener("mouseup", handleDragOrResizeEnd);
  };

  const handleResizing = useCallback((e: MouseEvent) => {
    const idx = resizingIdxRef.current;
    if (idx === null || !mainAreaRef.current) return;
    const rect = mainAreaRef.current.getBoundingClientRect();
    const { startX, startY, startW, startH } = resizeStart.current;
    const newWidth = Math.max(MIN_WIDTH, Math.min(startW + (e.clientX - startX), rect.width - textBoxesRef.current[idx].x));
    const newHeight = Math.max(MIN_HEIGHT, Math.min(startH + (e.clientY - startY), rect.height - textBoxesRef.current[idx].y));
    setTextBoxes(prev => prev.map((b, i) => i === idx ? { ...b, width: newWidth, height: newHeight } : b));
  }, [mainAreaRef, setTextBoxes]);

  const handleDragOrResizeEnd = useCallback(() => {
    const idx = draggingIdxRef.current ?? resizingIdxRef.current;
    if (idx !== null && selectedProjectId !== null) {
      const box = textBoxesRef.current[idx];
      if (box.node && !box.node.startsWith('optimistic-')) {
        socketRef.current?.emit("textEvent", {
          fnc: "move", 
          node: box.node, 
          type: "text",
          pId: selectedProjectId,
          cLocate: { x: box.x, y: box.y }, 
          cScale: { width: box.width, height: box.height }
        });
      }
    }
    setDraggingIdx(null);
    setResizingIdx(null);
    window.removeEventListener("mousemove", handleDragging);
    window.removeEventListener("mousemove", handleResizing);
    window.removeEventListener("mouseup", handleDragOrResizeEnd);
  }, [handleDragging, handleResizing, socketRef, selectedProjectId]);

  return (
    <>
      {textBoxes.map((box, idx) => (
        <TextBoxWrap
          key={box.node || idx}
          $focused={focusedIdx === idx}
          style={{ left: box.x, top: box.y, width: box.width, height: box.height, zIndex: box.zIndex ?? 1 }}
          tabIndex={0}
          onFocus={() => { setFocusedIdx(idx); bringToFront(idx); }}
          onMouseDown={() => bringToFront(idx)}
          onBlur={e => {
            if (toolbarRef.current?.contains(e.relatedTarget as Node)) return;
            setFocusedIdx(cur => (cur === idx ? null : cur));
          }}
        >
          <TextBoxInput
            ref={el => { inputRefs.current[idx] = el; }}
            width={box.width}
            height={box.height}
            value={box.text}
            onChange={(e) => handleTextBoxChange(idx, e.target.value)}
            style={{ color: box.color, fontSize: `${box.size}px`, fontFamily: box.font }}
            $focused={focusedIdx === idx}
          />
          {focusedIdx === idx && (
            <>
              <ButtonGroup>
                <CircleBtn color="#00d26a" title="이동" onMouseDown={(e) => handleDragStart(idx, e)} />
                <CircleBtn color="#ff4a4a" title="삭제" onMouseDown={(e) => { e.stopPropagation(); handleDelete(idx); }} />
              </ButtonGroup>
              <ResizeHandle onMouseDown={(e) => handleResizeStart(idx, e)} />
            </>
          )}
        </TextBoxWrap>
      ))}
    </>
  );
};

const TextBoxWrap = styled.div<{ $focused: boolean }>` // ✅ 타입 정의 수정
  position: absolute;
  min-width: ${MIN_WIDTH}px;
  min-height: ${MIN_HEIGHT}px;
  background: transparent;
  border: 2px solid ${({ $focused }) => ($focused ? 'rgba(107, 91, 149, 0.5)' : 'transparent')}; // ✅ 사용 부분 수정
  border-radius: 4px;
  box-sizing: border-box;
  padding: 0;
  &:hover {
    border-color: ${({ $focused }) => ($focused ? '#6b5b95' : 'transparent')}; // ✅ 사용 부분 수정
  }
`;

export default TextBoxes;