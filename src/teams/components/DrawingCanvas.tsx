// [파일명: DrawingCanvas.tsx]
import React, { useRef, useEffect, useState, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { Socket } from 'socket.io-client';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import { DrawingStroke, DrawingStrokePoint } from '../hooks/useObjectManager';

interface DrawingCanvasProps {
  socketRef: React.RefObject<Socket | null>;
  selectedProjectId: number | null;
  userId: string;
  isDrawingMode: boolean;
  drawingColor: string;
  penWidth: number;
  isEraserMode: boolean;
  drawings: DrawingStroke[]; 
  setDrawings: React.Dispatch<React.SetStateAction<DrawingStroke[]>>;
  snapshotData: string | null;
  drawingsRef: React.RefObject<DrawingStroke[]>; 
}

export interface CanvasControlHandle {
  getCanvasAsDataURL: () => string | undefined;
}

const CanvasOverlay = styled.canvas<{ $isDrawingMode: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10; 
  pointer-events: ${({ $isDrawingMode }) => ($isDrawingMode ? 'auto' : 'none')};
  cursor: crosshair;
`;

// 캔버스에 획을 그리는 유틸리티 함수
const drawStroke = (context: CanvasRenderingContext2D, stroke: DrawingStroke) => {
  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';
  
  context.beginPath();
  if (stroke.points && stroke.points.length > 0) {
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      context.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    context.stroke();
    context.closePath();
  }
};

// 캔버스에 모든 내용을 그리는(초기화 포함) 함수
const redrawCanvas = (
  canvas: HTMLCanvasElement, 
  context: CanvasRenderingContext2D,
  snapshotImage: HTMLImageElement | null,
  drawings: DrawingStroke[], // 🚀 렌더링을 유발한 'state' prop
  selectedProjectId: number | null
) => {
  const scale = window.devicePixelRatio;

  const domWidth = canvas.offsetWidth;
  const domHeight = canvas.offsetHeight;
  canvas.width = domWidth * scale;
  canvas.height = domHeight * scale;
  
  context.scale(scale, scale);
  context.lineCap = 'round';
  context.clearRect(0, 0, domWidth, domHeight);

  if (snapshotImage && snapshotImage.complete) {
    context.drawImage(snapshotImage, 0, 0, domWidth, domHeight);
  }

  // 🚀 'drawings' state(prop)를 사용해 캔버스를 그림
  drawings.forEach(stroke => {
    if (stroke.pId === selectedProjectId && stroke.points && stroke.points.length > 0) {
      drawStroke(context, stroke);
    }
  });
};


const DrawingCanvas = forwardRef<CanvasControlHandle, DrawingCanvasProps>(({
  socketRef,
  selectedProjectId,
  userId,
  isDrawingMode,
  drawingColor,
  penWidth,
  isEraserMode,
  drawings, // 렌더링 트리거용 state(prop)
  setDrawings,
  snapshotData,
  drawingsRef // '진실의 원천' ref
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const localActiveStrokeNode = useRef<string | null>(null);
  const snapshotImageRef = useRef<HTMLImageElement | null>(null);
  
  const [isSnapshotLoaded, setIsSnapshotLoaded] = useState(false);

  // 1. 캔버스 초기 설정
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.lineCap = 'round';
    contextRef.current = context;
  }, []); 

  // 2. 스냅샷 데이터(URL) 변경 시
  useEffect(() => {
    if (snapshotData) {
      console.log("DrawingCanvas: New snapshot detected, loading image...");
      setIsSnapshotLoaded(false); 
      const img = new Image();
      
      img.onload = () => {
        console.log("DrawingCanvas: New snapshot loaded successfully.");
        snapshotImageRef.current = img;
        setIsSnapshotLoaded(true); 
      };
      img.onerror = () => {
        console.error("DrawingCanvas: New snapshot FAILED to load.");
        snapshotImageRef.current = null;
        setIsSnapshotLoaded(true); 
      };
      
      img.src = snapshotData;
      
    } else {
      console.log("DrawingCanvas: No snapshot data.");
      snapshotImageRef.current = null;
      setIsSnapshotLoaded(true); 
    }
  }, [snapshotData]); 

  // 3. 캔버스 '다시 그리기' (state가 변경될 때마다 실행)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!context || !canvas) return;

    if (snapshotData && !isSnapshotLoaded) {
      console.log("DrawingCanvas: Waiting for snapshot to load before drawing...");
      return;
    }
    
    console.log("DrawingCanvas: Redrawing canvas...");
    
    // 'drawings' state(prop)를 사용해 캔버스를 다시 그립니다.
    redrawCanvas(canvas, context, snapshotImageRef.current, drawings, selectedProjectId);

    // 툴 설정 복원
    context.strokeStyle = drawingColor;
    context.lineWidth = penWidth;
    context.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
    
  }, [drawings, selectedProjectId, isSnapshotLoaded, snapshotData, drawingColor, penWidth, isEraserMode]);

  // 4. '툴' 설정 변경 시
  useEffect(() => {
    const context = contextRef.current;
    if (context) {
      context.strokeStyle = drawingColor;
      context.lineWidth = penWidth;
      context.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
    }
  }, [drawingColor, penWidth, isEraserMode]); 

  // 5. 캔버스 이미지 저장 (부모가 호출)
  useImperativeHandle(ref, () => ({
    getCanvasAsDataURL: () => {
      const canvas = canvasRef.current; 
      if (!canvas || !drawingsRef.current) {
        console.warn("Canvas or context not available for snapshot.");
        return undefined;
      }
      
      console.log("DrawingCanvas: Generating snapshot (getCanvasAsDataURL)...");

      const scale = window.devicePixelRatio;
      
      const domWidth = canvas.offsetWidth;
      const domHeight = canvas.offsetHeight;
      const pixelWidth = domWidth * scale;
      const pixelHeight = domHeight * scale;

      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      
      if (!tempContext) {
         console.error("Failed to create temp canvas context for saving.");
         return undefined;
      }
      
      tempCanvas.width = pixelWidth;
      tempCanvas.height = pixelHeight;
      tempContext.scale(scale, scale);
      tempContext.lineCap = 'round';
      tempContext.clearRect(0, 0, domWidth, domHeight);

      if (snapshotImageRef.current && snapshotImageRef.current.complete) {
        tempContext.drawImage(snapshotImageRef.current, 0, 0, domWidth, domHeight);
      }

      // '진실의 원천'인 ref(drawingsRef.current)를 읽음
      drawingsRef.current.forEach(stroke => {
        if (stroke.pId === selectedProjectId && stroke.points && stroke.points.length > 0) {
          drawStroke(tempContext, stroke);
        }
      });
      
      return tempCanvas.toDataURL("image/png");
    }
  }), [selectedProjectId, isSnapshotLoaded, drawingsRef]); 

  // 6. 로컬 드로잉 이벤트 핸들러
  
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !contextRef.current || !selectedProjectId || !drawingsRef.current) return;
    const { offsetX, offsetY } = event.nativeEvent;
    const node = uuidv4();
    const newPoint = { x: offsetX, y: offsetY };
    
    const newStroke: DrawingStroke = {
      node, pId: selectedProjectId, uId: userId,
      color: drawingColor, width: penWidth, isEraser: isEraserMode,
      points: [newPoint]
    };

    localActiveStrokeNode.current = node;

    // (중요) ref를 즉시 업데이트
    const newState = [...drawingsRef.current, newStroke];
    drawingsRef.current = newState;
    setDrawings(newState); // 렌더링 트리거
    
    socketRef.current?.emit('start-drawing', {
      x: offsetX, y: offsetY, pId: selectedProjectId,
      node: node, color: drawingColor, width: penWidth, isEraser: isEraserMode
    });
  };

  const finishDrawing = () => {
    if (!localActiveStrokeNode.current) return; 
    socketRef.current?.emit('finish-drawing', { pId: selectedProjectId });
    localActiveStrokeNode.current = null;
  };

  // 🚀 [수정] draw 함수 오타 수정
  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const activeNode = localActiveStrokeNode.current;
    if (!isDrawingMode || !contextRef.current || !activeNode || !selectedProjectId || !drawingsRef.current) {
      return; 
    }
    const { offsetX, offsetY } = event.nativeEvent;
    const newPoint: DrawingStrokePoint = { x: offsetX, y: offsetY };

    // (중요) ref를 즉시 업데이트
    const newState = drawingsRef.current.map(stroke => 
      stroke.node === activeNode
        ? { ...stroke, points: [...stroke.points, newPoint] }
        : stroke // 🚀 오타 수정 (id: stroke -> : stroke)
    );
    drawingsRef.current = newState;
    setDrawings(newState); // 렌더링 트리거
    
    socketRef.current?.emit('drawing-event', {
      x: offsetX, y: offsetY, pId: selectedProjectId,
      node: activeNode
    });
  };

  return (
    <CanvasOverlay
      ref={canvasRef}
      $isDrawingMode={isDrawingMode}
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseLeave={finishDrawing}
      onMouseMove={draw}
    />
  );
});

export default DrawingCanvas;