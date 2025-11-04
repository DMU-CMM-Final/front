import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Socket } from 'socket.io-client';
import styled from 'styled-components';
import { DrawingStroke, DrawingStrokePoint } from './hooks/useObjectManager';

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
  const [isDrawing, setIsDrawing] = useState(false);

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

  // 3. 서버로부터 내 획(node) ID 수신 감지
  useEffect(() => {
    // 마우스를 누르고 있고(isDrawing), 아직 서버로부터 획 ID(node)를 배정받지 못했을 때
    if (isDrawing && localActiveStrokeNode.current === null) {
      
      // drawings 배열에서 방금 'remote-start-drawing'을 통해 추가된,
      // '내(userId)'가 만든 '가장 최신 획'을 찾습니다.
      const myNewStroke = drawings
        .filter(s => s.uId === userId && s.pId === selectedProjectId)
        .pop(); // pop()으로 가장 마지막에 추가된 획을 가져옴

      if (myNewStroke) {
        // 찾았다면, 이 획의 node ID를 '지금 내가 그리고 있는 획'으로 설정
        localActiveStrokeNode.current = myNewStroke.node;
        console.log("My new stroke node ID is set:", myNewStroke.node); // 👈 로그 추가
      }
    }
  }, [drawings, isDrawing, userId, selectedProjectId]); // drawings 배열이 바뀔 때마다 체크

  // 4. 로컬 드로잉 이벤트 핸들러
  
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !contextRef.current || !selectedProjectId) return;
    
    const { offsetX, offsetY } = event.nativeEvent;
    
    setIsDrawing(true); // 마우스를 눌렀다고 표시
    localActiveStrokeNode.current = null; // 서버로부터 node ID를 받을 준비

    // 'start-drawing': node 없이 툴 정보와 시작 좌표만 서버로 전송
    socketRef.current?.emit('start-drawing', {
      pId: selectedProjectId,
      uId: userId,
      color: drawingColor,
      width: penWidth,
      isEraser: isEraserMode,
      points: [{ x: offsetX, y: offsetY }] // 시작점
    });
  };

  const finishDrawing = () => {
    if (!isDrawing) return; 
    
    socketRef.current?.emit('finish-drawing', {
      pId: selectedProjectId,
    });
    
    setIsDrawing(false); // 마우스를 뗐다고 표시
    localActiveStrokeNode.current = null; // 획 ID 초기화
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const activeNode = localActiveStrokeNode.current;
    
    // 마우스를 누르고 있고(isDrawing), 서버로부터 획 ID(activeNode)를 배정받은 상태여야 함
    if (!isDrawing || !isDrawingMode || !contextRef.current || !activeNode || !selectedProjectId) {
      if(isDrawing && activeNode === null) {
         console.log("Waiting for node ID from server..."); // 👈 로그 추가
      }
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
    
    // 'drawing-event': 서버가 알려준 node ID를 포함하여 좌표 전송
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