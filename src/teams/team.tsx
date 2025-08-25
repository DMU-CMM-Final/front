import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import Draggable from 'react-draggable';

// --- 스타일 컴포넌트 import ---
import {
  Container, SidebarContainer, SidebarToggle, ProjectHeader, Spacer,
  ParticipantContainer, UserAvatarWrapper, UserAvatar, UserName, ProjectList,
  ProjectItem, ProjectNameInput, ProjectActions, CreateProjectButton, MainArea, ProjectSelectPrompt,
  PromptText, FloatingToolbar, ToolIcon, FloatingButtonWrap,
  CreateMenu, CreateMenuButton, FloatingButton, ImageIcon, PenIcon, Cursor
} from './Team.styles';

// --- 커스텀 훅 및 컴포넌트 import ---
import { useSocketManager } from './hooks/useSocketManager';
import { useWebRTC } from './hooks/useWebRTC';
import { useObjectManager } from './hooks/useObjectManager';
import TextBoxes from "./components/textBox";
import VoteBoxes from "./components/voteBox";
import ImageBoxes from "./components/ImageBox";
import { VideoGrid } from './components/VideoGrid';

const SOCKET_URL = "https://blanksync.kro.kr";

// 타입 정의
interface Project { pId: number; pName: string; createDate: string; }
interface Participant { id: string; color: string; }
interface TextBox {
  node: string; tId: string; pId: number; uId: string; x: number; y: number;
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
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

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

  const [userId] = useState('user' + Math.floor(Math.random() * 1000));
  const [teamId] = useState(1);
  
  const { socket } = useSocketManager(String(teamId), userId);
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const { inCall, localStream, remoteStreams, cursors, handleStartCall, handleEndCall, broadcastCursorPosition } = useWebRTC(socket, String(teamId), userId, participants);
  
  const { textBoxes, setTextBoxes, voteBoxes, setVoteBoxes, imageBoxes, setImageBoxes } = useObjectManager(socket, userId);

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

    socket.on('room-info', handleRoomInfo);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    
    return () => {
      socket.off('room-info', handleRoomInfo);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, userId]);

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
      if (!mainAreaRef.current || !socket || e.target !== mainAreaRef.current || !selectedProjectId) return;
      const rect = mainAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (isTextMode) {
        setIsTextMode(false);
        const tempNodeId = `optimistic-${Date.now()}`;
        const optimisticBox: TextBox = {
            node: tempNodeId, tId: String(teamId), pId: selectedProjectId, uId: userId,
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
      if (isVoteCreateMode) {
        socket.emit("voteEvent", { fnc: "new", type: "vote", pId: selectedProjectId, cLocate: { x, y }, cScale: { width: 300, height: 200 }, cTitle: "새 투표", cList: [{ content: "" }, { content: "" }] });
        setIsVoteCreateMode(false);
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
      await fetch(`${SOCKET_URL}/node/api/image/upload`, { method: "POST", body: formData });
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <Container>
      <SidebarContainer $isCollapsed={isSidebarCollapsed}>
        <ProjectHeader>
          <h2>프로젝트 목록</h2>
          <Spacer />
          <ParticipantContainer 
            $userCount={participants.length} 
            $isExpanded={isUserListExpanded}
            onClick={() => setIsUserListExpanded(prev => !prev)}
          >
            {participants.map((user, index) => (
              <UserAvatarWrapper key={user.id} $isExpanded={isUserListExpanded} $index={index}>
                  <UserAvatar color={user.color}>
                      {user.id.charAt(0).toUpperCase()}
                  </UserAvatar>
                  <UserName $isExpanded={isUserListExpanded}>{user.id}</UserName>
              </UserAvatarWrapper>
            ))}
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
        <CreateProjectButton onClick={handleCreateProject}>+ 새 프로젝트 생성</CreateProjectButton>
      </SidebarContainer>

      <SidebarToggle $isCollapsed={isSidebarCollapsed} onClick={() => setIsSidebarCollapsed(v => !v)}>
        {isSidebarCollapsed ? '▶' : '◀'}
      </SidebarToggle>
      
      <MainArea ref={mainAreaRef} $isTextMode={isTextMode} $isVoteCreateMode={isVoteCreateMode} onClick={handleMainAreaClick}>
        {selectedProjectId === null ? (
          <ProjectSelectPrompt><PromptText>👈 사이드바에서 참여할 프로젝트를 선택해주세요.</PromptText></ProjectSelectPrompt>
        ) : (
          <>
            <Draggable nodeRef={toolbarRef as React.RefObject<HTMLElement>} bounds="parent">
              <FloatingToolbar ref={toolbarRef}>
                <ToolIcon onClick={() => setIsTextMode(prev => !prev)} title="텍스트 상자 생성"><p style={{fontWeight: isTextMode ? 'bold' : 'normal'}}>T</p></ToolIcon>
                <ToolIcon onClick={() => fileInputRef.current?.click()}><ImageIcon /><input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} /></ToolIcon>
                <ToolIcon><PenIcon /></ToolIcon>
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
                  <CreateMenuButton onClick={() => { setIsVoteCreateMode(true); setShowCreateMenu(false); }}>투표</CreateMenuButton>
                  <CreateMenuButton onClick={inCall ? handleEndCall : handleStartCall}>{inCall ? '통화 종료' : '화상통화'}</CreateMenuButton>
              </CreateMenu>
              )}
              <FloatingButton onClick={() => setShowCreateMenu((v) => !v)}>+</FloatingButton>
            </FloatingButtonWrap>
          </>
        )}
      </MainArea>
    </Container>
  );
};

export default Teams;