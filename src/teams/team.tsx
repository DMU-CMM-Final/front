// [파일명: team.tsx]
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import Draggable from 'react-draggable';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container, SidebarContainer, SidebarToggle, ProjectHeader, Spacer,
  ParticipantContainer, OverlapAvatarWrapper, UserAvatar, UserName, ProjectList,
  ProjectItem, ProjectNameInput, ProjectActions, CreateProjectButton, MainArea, ProjectSelectPrompt,
  PromptText, FloatingToolbar, ToolIcon, FloatingButtonWrap,
  CreateMenu, CreateMenuButton, FloatingButton, ImageIcon, PenIcon, Cursor,
  ExpandedUserList, UserListItem,
  ToolbarLabel, ToolbarInput, ToolbarColorInput, ToolbarSelect,
  COLOR
} from './Team.styles';
import { useSocketManager } from './hooks/useSocketManager';
import { useWebRTC } from './hooks/useWebRTC';
import { useObjectManager, DrawingStroke } from './hooks/useObjectManager'; 
import TextBoxes from "./components/textBox";
import VoteBoxes from "./components/voteBox";
import ImageBoxes from "./components/ImageBox";
import { VideoGrid } from './components/VideoGrid';
import SummaryModal from './components/SummaryModal';
import Calendar from './components/Calendar';
import CalendarModal from './components/CalendarModal';
import DrawingCanvas, { CanvasControlHandle } from './components/DrawingCanvas';

// ... (
//   CalendarEvent, Project, Participant, TextBox 타입, 
//   parseUTCStringAsLocal, generateColor 함수는 동일
// ) ...
interface CalendarEvent {
  eventId: number;
  tId: number | null;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}
interface Project { pId: number; pName: string; createDate: string; }
interface Participant { id: string; color: string; }
interface TextBox {
  node: string;
  tId: string;
  pId: number; uId: string; x: number; y: number;
  width: number; height: number; text: string; color: string; font: string;
  size: number; zIndex?: number; isOptimistic?: boolean;
}
const parseUTCStringAsLocal = (dateString: string): Date => {
  if (!dateString) return new Date();
  const parts = dateString.split(/[^0-9]/).map(s => parseInt(s, 10));
  return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
};
const generateColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};


const Teams: React.FC = () => {
  const { userEmail } = useAuth();
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  
  const canvasControlRef = useRef<CanvasControlHandle>(null);
  const drawingsRef = useRef<DrawingStroke[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  
  const { userId, teamId } = location.state || {};

  // --- 상태 관리 ---
  // ... (다른 상태들) ...
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isUserListExpanded, setIsUserListExpanded] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [isVoteCreateMode, setIsVoteCreateMode] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false); 
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(3);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [focusedVoteIdx, setFocusedVoteIdx] = useState<number | null>(null);
  const [focusedImageIdx, setFocusedImageIdx] = useState<number | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [isWaitingToLeave, setIsWaitingToLeave] = useState(false);

  // --- 훅 초기화 ---
  const { socket } = useSocketManager(String(teamId), userId);
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const { inCall, localStream, remoteStreams, cursors, handleStartCall, handleEndCall, broadcastCursorPosition } = useWebRTC(socket, String(teamId), userId, participants);
  
  const { 
    textBoxes, setTextBoxes, 
    voteBoxes, setVoteBoxes, 
    imageBoxes, setImageBoxes, 
    drawings, setDrawings,
    snapshotData 
  } = useObjectManager(socket, userId, selectedProjectId, drawingsRef); 

  const otherParticipants = participants.filter(p => p.id !== userId);
  const currentBox = focusedIdx !== null ? textBoxes[focusedIdx] : null;

  // --- 이벤트 핸들러 ---
  const handleToggleDrawingMode = () => {
    setIsDrawingMode(prev => !prev);
    setIsTextMode(false);
    setIsVoteCreateMode(false);
    setIsEraserMode(false);
  };

  // ESC 키 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTextMode(false);
        setIsVoteCreateMode(false);
        setIsDrawingMode(false);
        setIsEraserMode(false); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 🚀 [수정 1] 캘린더 실시간 이벤트 리스너
  useEffect(() => {
    if (!socket || !teamId || !userEmail) return;

    // 'calendar-event-added' 이벤트 핸들러 (이름 변경)
    const handleCalendarEventAdded = (newEventData: any) => {
      console.log('새 일정 수신 (added):', newEventData);
      const processedNewEvent: CalendarEvent = {
        ...newEventData,
        tId: newEventData.tId !== undefined ? newEventData.tId : null,
        startDate: parseUTCStringAsLocal(newEventData.startDate),
        endDate: parseUTCStringAsLocal(newEventData.endDate)
      };
      // 🚀 [수정] 이미 로컬에 가짜 ID로 있는지 확인하는 로직 (선택적)
      // 만약 모달에서 즉시 추가(onEventAdded)를 다시 쓴다면,
      // 이 로직은 서버 응답이 왔을 때 가짜 ID를 실제 ID로 교체해줍니다.
      setCalendarEvents(prev => {
        // 혹시 모르니, title과 시작시간이 같은 가짜 이벤트가 있는지 확인
        const potentialFakeEventIndex = prev.findIndex(e => 
            e.title === processedNewEvent.title && 
            e.startDate.getTime() === processedNewEvent.startDate.getTime() &&
            e.eventId > 1000000000 // (Date.now()로 만든 가짜 ID라고 가정)
        );
        
        if (potentialFakeEventIndex > -1) {
          const newState = [...prev];
          newState[potentialFakeEventIndex] = processedNewEvent; // 진짜 ID로 교체
          return newState;
        } else {
          // 중복이 아니면 그냥 추가
          return [...prev, processedNewEvent];
        }
      });
    };
    const handleCalendarEventUpdated = (updatedEventData: any) => {
       console.log('수정된 일정 수신:', updatedEventData);
       const processedUpdatedEvent: CalendarEvent = {
         ...updatedEventData,
         tId: updatedEventData.tId !== undefined ? updatedEventData.tId : null,
         startDate: parseUTCStringAsLocal(updatedEventData.startDate),
         endDate: parseUTCStringAsLocal(updatedEventData.endDate)
       };
       setCalendarEvents(prev => prev.map(event =>
         event.eventId === processedUpdatedEvent.eventId ? processedUpdatedEvent : event
       ));
    };
    const handleCalendarEventDeleted = (deletedEventData: { eventId: number }) => {
      console.log('삭제된 일정 수신:', deletedEventData);
      setCalendarEvents(prev => prev.filter(event => event.eventId !== deletedEventData.eventId));
    };

    // 🚀 [수정] 'calendar-event-new' -> 'calendar-event-added'로 변경
    socket.on('calendar-event-added', handleCalendarEventAdded);
    socket.on('calendar-event-updated', handleCalendarEventUpdated);
    socket.on('calendar-event-deleted', handleCalendarEventDeleted);

    return () => {
      // 🚀 [수정] 'calendar-event-new' -> 'calendar-event-added'로 변경
      socket.off('calendar-event-added', handleCalendarEventAdded);
      socket.off('calendar-event-updated', handleCalendarEventUpdated);
      socket.off('calendar-event-deleted', handleCalendarEventDeleted);
    };
  }, [socket, teamId, userEmail]);

  // ... (
  //   캘린더 초기 로드 useEffect, handleAttributeChange, 
  //   잘못된 접근 방지 useEffect, 커서 위치 useEffect,
  //   room-info, user-joined, user-left, summarize-result 리스너 useEffect,
  //   project-added, project-renamed, project-deleted 리스너 useEffect,
  //   handleSummaryRequest, saveCanvasSnapshot, handleLeaveProject,
  //   프로젝트 이름 수정 관련 핸들러 5개,
  //   handleSelectProject, handleCreateProject, handleDeleteProject,
  //   getMaxZIndex, handleMainAreaClick, handleFileChange,
  //   request-drawing-data 리스너 useEffect,
  //   beforeunload 리스너 useEffect,
  //   isWaitingToLeave 리스너 useEffect,
  //   return (렌더링) 부분
  //   ... 은 모두 동일합니다 ...
  // ) ...
  useEffect(() => {
    if (!socket || !teamId || !userEmail) {
       setCalendarEvents([]);
       return;
    }
    const fetchCalendarEvents = (date: Date) => {
      const dateParam = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (showAllEvents) {
        socket.emit('calendar-all', { uId: userEmail, date: dateParam });
      } else {
        socket.emit('calendar-init', { tId: teamId, date: dateParam });
      }
    };
    fetchCalendarEvents(calendarDate);
    const handleGenericCalendarData = (data: any) => {
      let eventList: any[] = [];
      let responseTid: number | null = null;
      if (data && !Array.isArray(data) && data.events) {
        eventList = data.events;
        responseTid = data.tId || null;
      } else if (Array.isArray(data) && data.length > 0 && data[0]?.events) {
        const payload = data[0];
        eventList = Array.isArray(payload.events) ? payload.events : [];
        responseTid = payload.tId || null;
      } else if (Array.isArray(data)) {
        eventList = data;
      }
      const processedEvents: CalendarEvent[] = eventList.map((event: any) => ({
        ...event,
        tId: event.tId !== undefined ? event.tId : responseTid,
        startDate: parseUTCStringAsLocal(event.startDate),
        endDate: parseUTCStringAsLocal(event.endDate)
      }));
      setCalendarEvents(processedEvents);
    };
    socket.on('calendar-data', handleGenericCalendarData);
    socket.on('calendar-all-data', handleGenericCalendarData);
    return () => {
      socket.off('calendar-data', handleGenericCalendarData);
      socket.off('calendar-all-data', handleGenericCalendarData);
    };
  }, [calendarDate, showAllEvents, socket, teamId, userEmail]);
  const handleAttributeChange = (attribute: 'size' | 'color' | 'font', value: any) => {
    setTextBoxes(prev => {
      const boxToUpdate = prev[focusedIdx!];
      if (boxToUpdate && boxToUpdate.node && !boxToUpdate.node.startsWith('optimistic-') && selectedProjectId) {
        socketRef.current?.emit("textEvent", {
          fnc: "update",
          node: boxToUpdate.node,
          type: "text",
          pId: selectedProjectId,
          ...(attribute === 'size' && { cSize: Number(value) }),
          ...(attribute === 'color' && { cColor: value }),
          ...(attribute === 'font' && { cFont: value }),
        });
      }
      return prev.map((box, index) =>
        index === focusedIdx ? { ...box, [attribute]: value } : box
      );
    });
  };
  useEffect(() => {
    if (!userId || !teamId) {
      alert("잘못된 접근입니다. 프로젝트 목록으로 돌아갑니다.");
      navigate('/projectList');
    }
  }, [userId, teamId, navigate]);
  useEffect(() => {
    const area = mainAreaRef.current;
    if (!area) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = area.getBoundingClientRect();
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        broadcastCursorPosition(x, y);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [broadcastCursorPosition]);
  useEffect(() => {
    if (!socket) return;
    const handleRoomInfo = (data: { users?: string[], projects?: Project[] }) => {
        if (data.users) {
            const allUsers = [...new Set([...data.users, userId])];
            setParticipants(allUsers.map(id => ({ id, color: generateColor(id) })));
        }
        if (data.projects) {
            setProjects(data.projects);
        }
    };
    const handleUserJoined = ({ userId: joinedUserId }: { userId: string }) => {
        setParticipants(prev => {
            if (prev.find(p => p.id === joinedUserId)) return prev;
            return [...prev, { id: joinedUserId, color: generateColor(joinedUserId) }];
        });
    };
    const handleUserLeft = ({ userId: leftUserId }: { userId: string }) => {
      setParticipants(prev => prev.filter(p => p.id !== leftUserId));
    };
    const handleSummaryResult = ({ summary }: { summary: string }) => {
      setSummaryContent(summary);
      setIsSummaryLoading(false);
    };
    socket.on('room-info', handleRoomInfo);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('summarize-result', handleSummaryResult);
    return () => {
      socket.off('room-info', handleRoomInfo);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('summarize-result', handleSummaryResult);
    };
  }, [socket, userId, teamId]);
  useEffect(() => {
    if (!socket) return;
    socket.on('project-added', (newProject: Project) => setProjects(prev => [...prev, newProject]));
    socket.on('project-renamed', ({ pId, newName }) => {
        setProjects(prev => prev.map(p => p.pId === pId ? { ...p, pName: newName } : p))
        if(pId === editingProjectId) {
            handleCancelEditing();
        }
    });
    socket.on('project-deleted', ({ pId }) => {
        setProjects(prev => prev.filter(p => p.pId !== pId));
        if (selectedProjectId === pId) setSelectedProjectId(null);
    });
    return () => {
      socket.off('project-added');
      socket.off('project-renamed');
      socket.off('project-deleted');
    };
  }, [socket, selectedProjectId, editingProjectId]);
  const handleSummaryRequest = () => {
    if (!socket || !selectedProjectId) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }
    setIsSummaryLoading(true);
    setSummaryContent('');
    setIsSummaryModalOpen(true);
    setShowCreateMenu(false);
    socket.emit('summarize-request', { pId: selectedProjectId });
  };
  const saveCanvasSnapshot = useCallback((reason: string) => {
    if (!socketRef.current || !selectedProjectId) return;
    const canvasData = canvasControlRef.current?.getCanvasAsDataURL();
    if (canvasData) {
      console.log(`Saving canvas snapshot (reason: ${reason})`);
      socketRef.current.emit('save-drawing-data', {
        pId: selectedProjectId,
        canvasData: canvasData,
        reason: reason
      });
    }
  }, [selectedProjectId]); 
  const handleLeaveProject = useCallback(() => {
    setShowCreateMenu(false); 
    if (socketRef.current && selectedProjectId !== null && drawingsRef.current.length > 0) {
      setIsWaitingToLeave(true); 
      saveCanvasSnapshot('button');  
    } else {
      navigate('/projectList');
    }
  }, [socketRef, selectedProjectId, saveCanvasSnapshot, navigate, setIsWaitingToLeave]); 
  const handleStartEditing = (project: Project) => {
    setEditingProjectId(project.pId);
    setEditingProjectName(project.pName);
  };
  const handleSubmitRename = () => {
    if (!editingProjectId) return;
    const originalProject = projects.find(p => p.pId === editingProjectId);
    const newName = editingProjectName.trim();
    if (newName && originalProject && originalProject.pName !== newName) {
      socket?.emit('project-rename', { pId: editingProjectId, newName: newName });
    } else {
        handleCancelEditing();
    }
  };
  const handleCancelEditing = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
  };
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const isButtonRelated = e.relatedTarget === confirmBtnRef.current || e.relatedTarget === cancelBtnRef.current;
    if (!isButtonRelated) {
      handleCancelEditing();
    }
  };
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmitRename();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };
  const handleSelectProject = useCallback((pId: number) => {
    if (selectedProjectId === pId) return;
    setEditingProjectId(null); 
    setSelectedProjectId(pId);
    socket?.emit('join-project', { pId });
  }, [socket, selectedProjectId]);
  const handleCreateProject = useCallback(() => {
    const name = prompt("새 프로젝트의 이름을 입력하세요:");
    if (name && name.trim()) {
      socket?.emit('project-create', { name: name.trim() });
    }
  }, [socket]);
  const handleDeleteProject = useCallback((pId: number) => {
    const currentProject = projects.find(p => p.pId === pId);
    if (window.confirm(`'${currentProject?.pName}' 프로젝트를 정말로 삭제하시겠습니까?`)) {
      socket?.emit('project-delete', { pId });
    }
  }, [socket, projects]);
  const getMaxZIndex = () => {
    const textMax = textBoxes.length > 0 ? Math.max(0, ...textBoxes.map((b: any) => b.zIndex ?? 0)) : 0;
    const voteMax = voteBoxes.length > 0 ? Math.max(0, ...voteBoxes.map((b: any) => b.zIndex ?? 0)) : 0;
    const imageMax = imageBoxes.length > 0 ? Math.max(0, ...imageBoxes.map((b: any) => b.zIndex ?? 0)) : 0;
    return Math.max(textMax, voteMax, imageMax);
  };
  const handleMainAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === mainAreaRef.current) {
      setFocusedIdx(null);
      setFocusedImageIdx(null);
      setFocusedVoteIdx(null);
    }
    if (!mainAreaRef.current || !socket || !selectedProjectId) return;
    if (isDrawingMode) return;
    if (!isTextMode && !isVoteCreateMode) return;
    if (e.target !== mainAreaRef.current) return;
    const rect = mainAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (isTextMode) {
      setIsTextMode(false);
      const tempNodeId = `optimistic-${Date.now()}`;
      const optimisticBox: TextBox = {
          node: tempNodeId,
          tId: String(teamId),
          pId: selectedProjectId, uId: userId,
          x, y, width: 200, height: 40, text: "", color: "#000000", font: "Arial", size: 16,
          isOptimistic: true
      };
      setTextBoxes(prev => [...prev, optimisticBox]);
      setFocusedIdx(textBoxes.length);
      socket.emit("textEvent", { 
          fnc: "new", type: "text", pId: selectedProjectId, 
          cLocate: { x, y }, cScale: { width: 200, height: 40 }, 
          cContent: "", cFont: "Arial", cColor: "#000000", cSize: 16,
          tempNodeId: tempNodeId
      });
    } else if (isVoteCreateMode) {
      setIsVoteCreateMode(false);
      socket.emit("voteEvent", { 
        fnc: "new", type: "vote", pId: selectedProjectId, 
        cLocate: { x, y }, cScale: { width: 300, height: 200 }, 
        cTitle: "새 투표", cList: [{ content: "" }, { content: "" }] 
      });
    }
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    const formData = new FormData();
    formData.append("image", file);
    formData.append("tId", String(teamId));
    formData.append("pId", String(selectedProjectId));
    formData.append("uId", userId);
    formData.append("cLocate", JSON.stringify({ x: 100, y: 100 }));
    formData.append("cScale", JSON.stringify({ width: 200, height: 200 }));
    try {
      await fetch(`https://blanksync.o-r.kr/node/api/image/upload`, { method: "POST", body: formData });
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (!socket || !selectedProjectId) return;
    const handleRequestDrawingData = (data: { reason: string }) => {
      if (data.reason === 'new-user-join') {
         saveCanvasSnapshot(data.reason);
      }
    };
    socket.on('request-drawing-data', handleRequestDrawingData);
    return () => {
      socket.off('request-drawing-data', handleRequestDrawingData);
    };
  }, [socket, selectedProjectId, saveCanvasSnapshot]); 
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (socketRef.current && selectedProjectId !== null) {
        if (drawingsRef.current.length > 0) { 
          saveCanvasSnapshot('button');
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socketRef, selectedProjectId, saveCanvasSnapshot]); 
  useEffect(() => {
    if (isWaitingToLeave && drawingsRef.current.length === 0) {
      navigate('/projectList');
    }
  }, [isWaitingToLeave, drawings, navigate]); 
  if (!userId || !teamId) {
    return <div>프로젝트 정보를 불러오는 중...</div>;
  }
  
  return (
    <Container>
      <SidebarContainer $isCollapsed={isSidebarCollapsed}>
        <ProjectHeader>
          <h2>프로젝트 목록</h2>
          <Spacer />
          <ParticipantContainer 
            onMouseEnter={() => setIsUserListExpanded(true)}
            onMouseLeave={() => setIsUserListExpanded(false)}
          >
            {otherParticipants.slice(0, 4).map((user, index) => (
              <OverlapAvatarWrapper key={user.id} index={index}>
                  <UserAvatar color={user.color}>
                      {user.id.charAt(0).toUpperCase()}
                  </UserAvatar>
              </OverlapAvatarWrapper>
            ))}
            {isUserListExpanded && (
              <ExpandedUserList>
                {participants.map(user => (
                  <UserListItem key={user.id}>
                    <UserAvatar color={user.color}>
                      {user.id.charAt(0).toUpperCase()}
                    </UserAvatar>
                    <UserName>{user.id}</UserName>
                  </UserListItem>
                ))}
              </ExpandedUserList>
            )}
          </ParticipantContainer>
        </ProjectHeader>
        <ProjectList>
          {projects.map(p => (
            <ProjectItem key={p.pId} $isSelected={selectedProjectId === p.pId} onClick={() => handleSelectProject(p.pId)}>
              {editingProjectId === p.pId ? (
                <>
                  <ProjectNameInput
                    type="text" value={editingProjectName}
                    onChange={(e) => setEditingProjectName(e.target.value)}
                    onKeyDown={handleEditKeyDown} onBlur={handleInputBlur}
                    autoFocus onClick={(e) => e.stopPropagation()}
                  />
                  <ProjectActions $isEditing={true}>
                    <button ref={confirmBtnRef} title="확인" onMouseUp={(e) => { e.stopPropagation(); handleSubmitRename(); }}>✅</button>
                    <button ref={cancelBtnRef} title="취소" onMouseUp={(e) => { e.stopPropagation(); handleCancelEditing(); }}>❌</button>
                  </ProjectActions>
                </>
              ) : (
                <>
                  <span>{p.pName}</span>
                  <ProjectActions>
                    <button title="이름 변경" onMouseUp={(e) => { e.stopPropagation(); handleStartEditing(p); }}>✏️</button>
                    <button title="삭제" onMouseUp={(e) => { e.stopPropagation(); handleDeleteProject(p.pId); }}>🗑️</button>
                  </ProjectActions>
                </>
              )}
            </ProjectItem>
          ))}
        </ProjectList>
        <Calendar 
          onClick={() => setIsCalendarModalOpen(true)}
          events={calendarEvents}
          onMonthChange={setCalendarDate}
        />
        <CreateProjectButton onClick={handleCreateProject}>+ 새 프로젝트 생성</CreateProjectButton>
      </SidebarContainer>

      <SidebarToggle $isCollapsed={isSidebarCollapsed} onClick={() => setIsSidebarCollapsed(v => !v)}>
        {isSidebarCollapsed ? '▶' : '◀'}
      </SidebarToggle>
      
      <MainArea 
        ref={mainAreaRef} 
        $isTextMode={isTextMode} 
        $isVoteCreateMode={isVoteCreateMode} 
        $isDrawingMode={isDrawingMode} 
        onClick={handleMainAreaClick}
      >
        {selectedProjectId === null ? (
          <ProjectSelectPrompt><PromptText>👈 사이드바에서 참여할 프로젝트를 선택해주세요.</PromptText></ProjectSelectPrompt>
        ) : (
          <>
            <Draggable nodeRef={toolbarRef as React.RefObject<HTMLElement>} bounds="parent">
              <FloatingToolbar ref={toolbarRef}>
                
                {isDrawingMode ? (
                  <>
                    <ToolIcon title="펜" onClick={() => setIsEraserMode(false)} style={{ background: !isEraserMode ? COLOR.imgBg : 'transparent' }}>✏️</ToolIcon>
                    <ToolIcon title="지우개" onClick={() => setIsEraserMode(true)} style={{ background: isEraserMode ? COLOR.imgBg : 'transparent' }}>🧼</ToolIcon>
                    <ToolbarLabel>색상:</ToolbarLabel>
                    <ToolbarColorInput type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} disabled={isEraserMode} />
                    <ToolbarLabel>굵기:</ToolbarLabel>
                    <ToolbarInput type="number" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} min="1" max="50" />
                  </>
                ) : focusedIdx === null ? (
                  <>
                    <ToolIcon onClick={() => { setIsTextMode(prev => !prev); setIsVoteCreateMode(false); setIsDrawingMode(false); setIsEraserMode(false); }} title="텍스트 상자 생성">T</ToolIcon>
                    <ToolIcon onClick={() => fileInputRef.current?.click()} title="이미지 추가"><ImageIcon /><input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} /></ToolIcon>
                    <ToolIcon onClick={handleToggleDrawingMode} title="그리기"><PenIcon /></ToolIcon>
                  </>
                ) : (
                  currentBox && (
                    <>
                      <ToolbarLabel>크기:</ToolbarLabel><ToolbarInput type="number" value={currentBox.size} onChange={(e) => handleAttributeChange('size', e.target.value)} min="1" />
                      <ToolbarLabel>색상:</ToolbarLabel><ToolbarColorInput type="color" value={currentBox.color} onChange={(e) => handleAttributeChange('color', e.target.value)} />
                      <ToolbarLabel>폰트:</ToolbarLabel><ToolbarSelect value={currentBox.font} onChange={(e) => handleAttributeChange('font', e.target.value)}>
                        <option value="Arial">Arial</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Georgia">Georgia</option>
                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                        <option value="'Courier New', Courier, monospace">Courier New</option>
                      </ToolbarSelect>
                    </>
                  )
                )}
              </FloatingToolbar>
            </Draggable>

            <TextBoxes 
              textBoxes={textBoxes} setTextBoxes={setTextBoxes} focusedIdx={focusedIdx} setFocusedIdx={setFocusedIdx} 
              mainAreaRef={mainAreaRef} socketRef={socketRef} toolbarRef={toolbarRef} 
              getMaxZIndex={getMaxZIndex} selectedProjectId={selectedProjectId} 
            />
            <VoteBoxes 
              voteBoxes={voteBoxes} setVoteBoxes={setVoteBoxes} focusedVoteIdx={focusedVoteIdx} setFocusedVoteIdx={setFocusedVoteIdx} 
              mainAreaRef={mainAreaRef} socketRef={socketRef} getMaxZIndex={getMaxZIndex} 
              userId={userId} selectedProjectId={selectedProjectId}
            />
            <ImageBoxes 
              imageBoxes={imageBoxes} setImageBoxes={setImageBoxes} focusedImageIdx={focusedImageIdx} setFocusedImageIdx={setFocusedImageIdx} 
              mainAreaRef={mainAreaRef} socketRef={socketRef} getMaxZIndex={getMaxZIndex}
              selectedProjectId={selectedProjectId}
            />
            
            <DrawingCanvas
              ref={canvasControlRef}
              socketRef={socketRef}
              selectedProjectId={selectedProjectId}
              userId={userId} 
              isDrawingMode={isDrawingMode}
              drawingColor={drawingColor}
              penWidth={penWidth}
              isEraserMode={isEraserMode}
              drawings={drawings}
              setDrawings={setDrawings}
              snapshotData={snapshotData} 
              drawingsRef={drawingsRef} 
            />
            
            <VideoGrid localStream={localStream} remoteStreams={remoteStreams} />
            {Object.entries(cursors).map(([id, { x, y, color }]) => (
                <Cursor key={id} x={x} y={y} color={color} />
            ))}

            <FloatingButtonWrap>
              {showCreateMenu && (
              <CreateMenu>
                  <CreateMenuButton onClick={() => { setIsVoteCreateMode(true); setIsTextMode(false); setShowCreateMenu(false); }}>투표</CreateMenuButton>
                  <CreateMenuButton onClick={inCall ? handleEndCall : handleStartCall}>{inCall ? '통화 종료' : '화상통화'}</CreateMenuButton>
                  <CreateMenuButton onClick={handleSummaryRequest}>AI 요약</CreateMenuButton>
                  
                  <CreateMenuButton onClick={handleLeaveProject}>나가기</CreateMenuButton>

              </CreateMenu>
              )}
              <FloatingButton onClick={() => setShowCreateMenu((v) => !v)}>+</FloatingButton>
            </FloatingButtonWrap>

            {isSummaryModalOpen && (
              <SummaryModal onClose={() => setIsSummaryModalOpen(false)}>
                {isSummaryLoading ? (
                  <p>요약 내용을 생성 중입니다... 🤖</p>
                ) : (
                  <p>{summaryContent}</p>
                )}
              </SummaryModal>
            )}
          </>
        )}
      </MainArea>

      <CalendarModal 
        isOpen={isCalendarModalOpen} 
        onClose={() => setIsCalendarModalOpen(false)} 
        socket={socket}
        teamId={teamId}
        events={calendarEvents}
        activeDate={calendarDate}
        onMonthChange={setCalendarDate}
        showAllEvents={showAllEvents}
        onToggleShowAll={setShowAllEvents}
        // 🚀 [수정 2] onEventAdded prop을 다시 전달
        onEventAdded={(newEvent) => setCalendarEvents(prev => [...prev, newEvent])}
      />
    </Container>
  );
};

export default Teams;