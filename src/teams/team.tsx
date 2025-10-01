import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import Draggable from 'react-draggable';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// --- 스타일 컴포넌트 import ---
import {
  Container, SidebarContainer, SidebarToggle, ProjectHeader, Spacer,
  ParticipantContainer, OverlapAvatarWrapper, UserAvatar, UserName, ProjectList,
  ProjectItem, ProjectNameInput, ProjectActions, CreateProjectButton, MainArea, ProjectSelectPrompt,
  PromptText, FloatingToolbar, ToolIcon, FloatingButtonWrap,
  CreateMenu, CreateMenuButton, FloatingButton, ImageIcon, PenIcon, Cursor,
  ExpandedUserList, UserListItem,
  ToolbarLabel, ToolbarInput, ToolbarColorInput, ToolbarSelect
} from './Team.styles';

// --- 커스텀 훅 및 컴포넌트 import ---
import { useSocketManager } from './hooks/useSocketManager';
import { useWebRTC } from './hooks/useWebRTC';
import { useObjectManager } from './hooks/useObjectManager';
import TextBoxes from "./components/textBox";
import VoteBoxes from "./components/voteBox";
import ImageBoxes from "./components/ImageBox";
import { VideoGrid } from './components/VideoGrid';
import SummaryModal from './components/SummaryModal';
import Calendar from './components/Calendar';
import CalendarModal from './components/CalendarModal';

// 캘린더 이벤트 타입
interface CalendarEvent {
  eventId: number;
  tId: number | null;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}

// 기타 타입 정의
interface Project { pId: number; pName: string; createDate: string; }
interface Participant { id: string; color: string; }
interface TextBox {
  node: string;
  tId: string;
  pId: number; uId: string; x: number; y: number;
  width: number; height: number; text: string; color: string; font: string;
  size: number; zIndex?: number; isOptimistic?: boolean;
}

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

  const navigate = useNavigate();
  const location = useLocation();
  
  const { userId, teamId } = location.state || {};

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
  
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [focusedVoteIdx, setFocusedVoteIdx] = useState<number | null>(null);
  const [focusedImageIdx, setFocusedImageIdx] = useState<number | null>(null);

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [miniCalDate, setMiniCalDate] = useState(new Date());

  const { socket } = useSocketManager(String(teamId), userId);
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const { inCall, localStream, remoteStreams, cursors, handleStartCall, handleEndCall, broadcastCursorPosition } = useWebRTC(socket, String(teamId), userId, participants);
  
  const { textBoxes, setTextBoxes, voteBoxes, setVoteBoxes, imageBoxes, setImageBoxes } = useObjectManager(socket, userId, selectedProjectId);
  
  const otherParticipants = participants.filter(p => p.id !== userId);

  const currentBox = focusedIdx !== null ? textBoxes[focusedIdx] : null;

  useEffect(() => {
    if (!socket || !teamId) {
      setCalendarEvents([]);
      return;
    }

    const fetchCalendarEvents = (date: Date) => {
      const dateParam = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      socket.emit('calendar-init', { tId: teamId, date: dateParam });
    };

    fetchCalendarEvents(miniCalDate);

    const handleCalendarData = (data: any) => {
      const eventList = (data && Array.isArray(data.events)) ? data.events : [];
      const processedEvents: CalendarEvent[] = eventList.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
      setCalendarEvents(processedEvents);
    };

    const handleRealtimeUpdate = () => fetchCalendarEvents(miniCalDate);

    socket.on('calendar-data', handleCalendarData);
    socket.on('calendar-event-new', handleRealtimeUpdate);
    socket.on('calendar-event-updated', handleRealtimeUpdate);
    socket.on('calendar-event-deleted', handleRealtimeUpdate);

    return () => {
      socket.off('calendar-data', handleCalendarData);
      socket.off('calendar-event-new', handleRealtimeUpdate);
      socket.off('calendar-event-updated', handleRealtimeUpdate);
      socket.off('calendar-event-deleted', handleRealtimeUpdate);
    };
  }, [socket, teamId, miniCalDate]);

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
      navigate('/projects');
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
  
  // ✅ [수정] 메인 로직 전체 수정
  const handleMainAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 다른 객체가 아닌 MainArea 자신을 클릭했을 때만 포커스를 해제합니다.
    if (e.target === mainAreaRef.current) {
      setFocusedIdx(null);
      setFocusedImageIdx(null);
      setFocusedVoteIdx(null);
    }
      
    // 기본적인 실행 조건 확인
    if (!mainAreaRef.current || !socket || !selectedProjectId) return;

    const rect = mainAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // if-else if 구조로 하나의 동작만 실행되도록 보장
    if (isTextMode) {
      // 빈 공간(배경)을 클릭했을 때만 생성
      if (e.target === mainAreaRef.current) {
        setIsTextMode(false); // 생성 후 텍스트 모드 비활성화
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
      }
    } else if (isVoteCreateMode) {
      // 빈 공간(배경)을 클릭했을 때만 생성
      if (e.target === mainAreaRef.current) {
        setIsVoteCreateMode(false); // 생성 후 투표 모드 비활성화
        socket.emit("voteEvent", { 
          fnc: "new", type: "vote", pId: selectedProjectId, 
          cLocate: { x, y }, cScale: { width: 300, height: 200 }, 
          cTitle: "새 투표", cList: [{ content: "" }, { content: "" }] 
        });
      }
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
          onMonthChange={setMiniCalDate}
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
        onClick={handleMainAreaClick}
      >
        {selectedProjectId === null ? (
          <ProjectSelectPrompt><PromptText>👈 사이드바에서 참여할 프로젝트를 선택해주세요.</PromptText></ProjectSelectPrompt>
        ) : (
          <>
            <Draggable nodeRef={toolbarRef as React.RefObject<HTMLElement>} bounds="parent">
              <FloatingToolbar ref={toolbarRef}>
                {focusedIdx === null ? (
                  <>
                    {/* ✅ [수정] 텍스트 버튼 클릭 시 다른 모드 비활성화 */}
                    <ToolIcon onClick={() => { setIsTextMode(prev => !prev); setIsVoteCreateMode(false); }} title="텍스트 상자 생성">T</ToolIcon>
                    <ToolIcon onClick={() => fileInputRef.current?.click()} title="이미지 추가"><ImageIcon /><input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} /></ToolIcon>
                    <ToolIcon title="그리기"><PenIcon /></ToolIcon>
                  </>
                ) : (
                  currentBox && (
                    <>
                      <ToolbarLabel>크기:</ToolbarLabel>
                      <ToolbarInput
                        type="number"
                        value={currentBox.size}
                        onChange={(e) => handleAttributeChange('size', e.target.value)}
                        min="1"
                      />
                      <ToolbarLabel>색상:</ToolbarLabel>
                      <ToolbarColorInput
                        type="color"
                        value={currentBox.color}
                        onChange={(e) => handleAttributeChange('color', e.target.value)}
                      />
                      <ToolbarLabel>폰트:</ToolbarLabel>
                      <ToolbarSelect
                        value={currentBox.font}
                        onChange={(e) => handleAttributeChange('font', e.target.value)}
                      >
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
            
            <VideoGrid localStream={localStream} remoteStreams={remoteStreams} />
            {Object.entries(cursors).map(([id, { x, y, color }]) => (
                <Cursor key={id} x={x} y={y} color={color} />
            ))}

            <FloatingButtonWrap>
              {showCreateMenu && (
              <CreateMenu>
                  {/* ✅ [수정] 투표 버튼 클릭 시 다른 모드 비활성화 */}
                  <CreateMenuButton onClick={() => { setIsVoteCreateMode(true); setIsTextMode(false); setShowCreateMenu(false); }}>투표</CreateMenuButton>
                  <CreateMenuButton onClick={inCall ? handleEndCall : handleStartCall}>{inCall ? '통화 종료' : '화상통화'}</CreateMenuButton>
                  <CreateMenuButton onClick={handleSummaryRequest}>AI 요약</CreateMenuButton>
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
        initialEvents={calendarEvents}
        initialDate={miniCalDate}
      />
    </Container>
  );
};

export default Teams;