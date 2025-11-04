import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Socket } from 'socket.io-client';
import styled from 'styled-components';
import { v4 as uuidv4 } from 'uuid'; // 🚀 [추가] uuid 임포트
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

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  socketRef,
  selectedProjectId,
  userId,
  isDrawingMode,
  drawingColor,
  penWidth,
  isEraserMode,
  drawings,
  setDrawings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const localActiveStrokeNode = useRef<string | null>(null);
  // 🚀 [삭제] isDrawing state (localActiveStrokeNode로 대체 가능)

  // 1. 캔버스 초기 설정
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    const scale = window.devicePixelRatio;
    canvas.width = canvas.offsetWidth * scale;
    canvas.height = canvas.offsetHeight * scale;
    context.scale(scale, scale);
    context.lineCap = 'round';
    contextRef.current = context;
  }, []);

  // 2. 캔버스 다시 그리기 (drawings 상태가 변경될 때마다)
  useLayoutEffect(() => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    const scale = window.devicePixelRatio;
    context.clearRect(0, 0, canvas.width / scale, canvas.height / scale);

    drawings.forEach(stroke => {
      if (stroke.pId === selectedProjectId && stroke.points && stroke.points.length > 0) {
        drawStroke(context, stroke);
      }
    });
    
    context.strokeStyle = drawingColor;
    context.lineWidth = penWidth;
    context.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
    
  }, [drawings, selectedProjectId, drawingColor, penWidth, isEraserMode]);

  // 🚀 [삭제] 3. '내 획 ID 수신 감지' useEffect (더 이상 필요 없음)

  // 4. 로컬 드로잉 이벤트 핸들러
  
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !contextRef.current || !selectedProjectId) return;
    
    const { offsetX, offsetY } = event.nativeEvent;
    
    // 🚀 [수정] 클라이언트에서 node ID 즉시 생성
    const node = uuidv4();

    const newStroke: DrawingStroke = {
      node,
      pId: selectedProjectId,
      uId: userId,
      color: drawingColor,
      width: penWidth,
      isEraser: isEraserMode,
      points: [{ x: offsetX, y: offsetY }]
    };

    localActiveStrokeNode.current = node; // 🚀 획 ID 즉시 설정
    setDrawings(prev => [...prev, newStroke]); // 🚀 로컬 상태 즉시 업데이트
    
    // 'start-drawing': node가 포함된 획 객체 전송
    socketRef.current?.emit('start-drawing', {
      stroke: newStroke,
    });
  };

  const finishDrawing = () => {
    // 🚀 [수정] 마우스를 떼면 획 ID 초기화
    if (!localActiveStrokeNode.current) return; 
    
    socketRef.current?.emit('finish-drawing', {
      pId: selectedProjectId,
    });
    
    localActiveStrokeNode.current = null; // 획 ID 초기화
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const activeNode = localActiveStrokeNode.current;
    
    // 🚀 [수정] activeNode (획 ID)가 있어야만 그리기 실행
    if (!isDrawingMode || !contextRef.current || !activeNode || !selectedProjectId) {
      return; 
    }

    const { offsetX, offsetY } = event.nativeEvent;
    const newPoint: DrawingStrokePoint = { x: offsetX, y: offsetY };

    // '내'가 그리는 것도 낙관적 업데이트로 배열에 바로 반영
    setDrawings(prev =>
      prev.map(stroke =>
        stroke.node === activeNode
          ? { ...stroke, points: [...stroke.points, newPoint] }
          : stroke
      )
    );
    
    // 'drawing-event': 획 ID를 포함하여 좌표 전송
    socketRef.current?.emit('drawing-event', {
      x: offsetX,
      y: offsetY,
      pId: selectedProjectId,
      node: activeNode,
      uId: userId,
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
};

export default DrawingCanvas;