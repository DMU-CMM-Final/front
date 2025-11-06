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
  drawings: DrawingStroke[],
  selectedProjectId: number | null
) => {
  const scale = window.devicePixelRatio;

  // 1. 캔버스 크기를 항상 현재 DOM 크기에 맞게 설정 (컨텍스트 리셋)
  const domWidth = canvas.offsetWidth;
  const domHeight = canvas.offsetHeight;
  canvas.width = domWidth * scale;
  canvas.height = domHeight * scale;
  
  // 2. 리셋된 컨텍스트에 항상 스케일과 스타일을 다시 적용
  context.scale(scale, scale);
  context.lineCap = 'round';
  
  // 3. 캔버스 초기화 (스케일된 좌표계 기준)
  context.clearRect(0, 0, domWidth, domHeight);

  // 4. 스냅샷(배경) 그리기
  if (snapshotImage && snapshotImage.complete) {
    context.drawImage(snapshotImage, 0, 0, domWidth, domHeight);
  }

  // 5. 최신 획(수정 사항) 덧그리기
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
  drawings,
  setDrawings,
  snapshotData
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const localActiveStrokeNode = useRef<string | null>(null);
  const snapshotImageRef = useRef<HTMLImageElement | null>(null);
  
  const [isSnapshotLoaded, setIsSnapshotLoaded] = useState(false);

  // 1. 캔버스 초기 설정 (최초 1회만 실행)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.lineCap = 'round';
    contextRef.current = context;
  }, []); 

  // 2. 스냅샷 데이터(URL)가 변경될 때만 실행
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

  // 3. 캔버스를 '다시 그리는' 시점을 명확히 분리
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!context || !canvas) return;

    if (snapshotData && !isSnapshotLoaded) {
      console.log("DrawingCanvas: Waiting for snapshot to load before drawing...");
      return;
    }
    
    console.log("DrawingCanvas: Redrawing canvas...");
    
    // 캔버스 전체를 다시 그림
    redrawCanvas(canvas, context, snapshotImageRef.current, drawings, selectedProjectId);

    // 툴 설정(스타일)은 항상 최신 값으로 복원
    context.strokeStyle = drawingColor;
    context.lineWidth = penWidth;
    context.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
    
  }, [drawings, selectedProjectId, isSnapshotLoaded]); 

  // 4. '툴' 설정이 변경될 때는 캔버스를 리셋하지 않고 '컨텍스트'만 업데이트
  useEffect(() => {
    const context = contextRef.current;
    if (context) {
      context.strokeStyle = drawingColor;
      context.lineWidth = penWidth;
      context.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
    }
  }, [drawingColor, penWidth, isEraserMode]); 

  // 🚀 [수정] 5. 캔버스 이미지 저장 (부모가 호출)
  useImperativeHandle(ref, () => ({
    getCanvasAsDataURL: () => {
      const canvas = canvasRef.current; // 화면에 보이는 실제 캔버스
      if (!canvas) {
        console.warn("Canvas or context not available for snapshot.");
        return undefined;
      }
      
      console.log("DrawingCanvas: Generating snapshot (getCanvasAsDataURL)...");

      const scale = window.devicePixelRatio;
      
      // 🚀 [수정] 임시 캔버스의 크기를 0이 아닌, '실제 캔버스'의 DOM 크기 기준으로 설정
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
      
      // --- 1. 임시 캔버스 크기 설정 ---
      tempCanvas.width = pixelWidth;
      tempCanvas.height = pixelHeight;
      
      // --- 2. 임시 캔버스 컨텍스트 설정 ---
      tempContext.scale(scale, scale);
      tempContext.lineCap = 'round';
      
      // --- 3. 임시 캔버스 초기화 (DOM 크기 기준) ---
      tempContext.clearRect(0, 0, domWidth, domHeight);

      // --- 4. 스냅샷(배경) 그리기 ---
      if (snapshotImageRef.current && snapshotImageRef.current.complete) {
        tempContext.drawImage(snapshotImageRef.current, 0, 0, domWidth, domHeight);
      }

      // --- 5. 최신 획(수정 사항) 덧그리기 ---
      drawings.forEach(stroke => {
        if (stroke.pId === selectedProjectId && stroke.points && stroke.points.length > 0) {
          drawStroke(tempContext, stroke); // 유틸리티 함수 사용
        }
      });
      
      // --- 6. 최종 이미지 데이터 URL 반환 ---
      return tempCanvas.toDataURL("image/png");
    }
  }), [drawings, selectedProjectId, isSnapshotLoaded]); // 의존성은 그대로 유지

  // 6. 로컬 드로잉 이벤트 핸들러
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !contextRef.current || !selectedProjectId) return;
    const { offsetX, offsetY } = event.nativeEvent;
    const node = uuidv4();
    const newPoint = { x: offsetX, y: offsetY };
    
    const newStroke: DrawingStroke = {
      node, pId: selectedProjectId, uId: userId,
      color: drawingColor, width: penWidth, isEraser: isEraserMode,
      points: [newPoint]
    };

    localActiveStrokeNode.current = node;
    setDrawings(prev => [...prev, newStroke]); 
    
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

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const activeNode = localActiveStrokeNode.current;
    if (!isDrawingMode || !contextRef.current || !activeNode || !selectedProjectId) {
      return; 
    }
    const { offsetX, offsetY } = event.nativeEvent;
    const newPoint: DrawingStrokePoint = { x: offsetX, y: offsetY };

    setDrawings(prev =>
      prev.map(stroke =>
        stroke.node === activeNode
          ? { ...stroke, points: [...stroke.points, newPoint] }
          : stroke
      )
    );
    
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