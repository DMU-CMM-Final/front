import styled from 'styled-components';
import React from 'react';

export const COLOR = {
  bg: "#EDE9F2", card: "#F2F2F2", accent: "#B8B6F2", accentDark: "#545159",
  text: "#3B3740", subText: "#A19FA6", logo: "#C6C4F2", imgBg: "#D1D0F2",
  imgShadow: "#CEDEF2", border: "#E3DCF2",
};

export const Cursor = styled.div.attrs<{ x: number; y: number; color: string }>(({ x, y, color }) => ({
  style: {
    transform: `translate(${x}px, ${y}px)`,
    backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="${encodeURIComponent(color)}" stroke="white" stroke-width="2"><path d="M0 0l18 12L7 14 0 24V0z" transform="translate(1, -1)"/></svg>')`
  },
}))<{ x: number; y: number; color: string }>`
  position: absolute; top: 0; left: 0; width: 24px; height: 24px;
  background-size: contain; z-index: 9999; pointer-events: none;
  transition: transform 0.05s linear;
`;

export const Container = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: ${COLOR.bg};
  overflow: hidden;
  font-family: 'Pretendard', sans-serif;
  color: ${COLOR.text};
`;

export const SidebarContainer = styled.aside<{ $isCollapsed: boolean }>`
  width: 280px;
  background-color: ${COLOR.card};
  border-right: 1px solid ${COLOR.border};
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease-in-out;
  flex-shrink: 0;
  box-shadow: 2px 0 8px ${COLOR.imgShadow};

  ${({ $isCollapsed }) => $isCollapsed && `
    width: 0;
    padding: 24px 0;
    overflow: hidden;
  `}
`;

export const SidebarToggle = styled.button<{ $isCollapsed: boolean }>`
  width: 24px;
  height: 48px;
  background-color: ${COLOR.card};
  border: 1px solid ${COLOR.border};
  border-left: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  position: relative;
  left: -1px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${COLOR.bg};
  }
`;

export const ProjectHeader = styled.div`
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  min-height: 32px;
  h2 {
    font-size: 1.2rem;
    color: ${COLOR.text};
    white-space: nowrap;
  }
`;

export const Spacer = styled.div`
  flex-grow: 1;
`;

export const ParticipantContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 32px;
  min-width: 32px;
  cursor: pointer;
`;

export const OverlapAvatarWrapper = styled.div<{ index: number; }>`
  position: absolute;
  top: 0;
  right: ${({ index }) => index * 14}px;
  transition: right 0.3s ease-in-out;
  z-index: ${({ index }) => 10 - index};
`;

export const UserAvatar = styled.div<{ color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: white;
  border: 2px solid ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: ${({ color }) => color};
  box-sizing: border-box;
  flex-shrink: 0;
  box-shadow: 0 0 5px rgba(0,0,0,0.1);
`;

export const ExpandedUserList = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  transform: translateX(105%);
  
  display: flex;
  flex-direction: column;
  gap: 10px;

  background: ${COLOR.card};
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1px solid ${COLOR.border};
  z-index: 100;
  white-space: nowrap;
`;

export const UserListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const UserName = styled.span`
  font-weight: 500;
  color: ${COLOR.text};
`;

export const ProjectList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex-grow: 1;
`;

export const ProjectItem = styled.li<{ $isSelected: boolean }>`
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
  background-color: ${({ $isSelected }) => $isSelected ? COLOR.imgBg : 'transparent'};
  color: ${({ $isSelected }) => $isSelected ? COLOR.accentDark : COLOR.text};

  &:hover {
    background-color: ${COLOR.bg};
  }
`;

export const ProjectNameInput = styled.input`
  flex-grow: 1;
  font-size: 1rem;
  font-weight: 500;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid ${COLOR.accent};
  background-color: white;
  color: ${COLOR.text};
  margin-right: 10px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${COLOR.accentDark};
    box-shadow: 0 0 0 2px ${COLOR.imgBg};
  }
`;

export const ProjectActions = styled.div<{ $isEditing?: boolean }>`
  display: flex;
  gap: 8px;
  opacity: ${({ $isEditing }) => $isEditing ? 1 : 0};
  transition: opacity 0.2s;
  flex-shrink: 0;

  ${ProjectItem}:hover & {
    opacity: 1;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: ${COLOR.subText};
    padding: 0;
    &:hover {
        color: ${COLOR.text};
    }
  }
`;

export const CreateProjectButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: ${COLOR.accent};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  margin-top: auto;

  &:hover {
    background-color: ${COLOR.accentDark};
  }
`;

// 🚀 [수정] $isDrawingMode 타입 추가 및 cursor 로직 수정
export const MainArea = styled.main<{ 
  $isTextMode?: boolean; 
  $isVoteCreateMode?: boolean; 
  $isDrawingMode?: boolean; 
}>`
  flex-grow: 1;
  position: relative;
  overflow: hidden;
  background-color: ${COLOR.bg};
  padding: 40px 64px;
  
  cursor: ${({ $isDrawingMode, $isVoteCreateMode, $isTextMode }) => 
    $isDrawingMode ? 'crosshair' : 
    $isVoteCreateMode ? 'crosshair' : 
    $isTextMode ? 'text' : 
    "default"};
`;

export const ProjectSelectPrompt = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

export const PromptText = styled.h1`
  font-size: 2rem;
  color: ${COLOR.subText};
  font-weight: 500;
`;

export const FloatingToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${COLOR.card};
  backdrop-filter: blur(8px);
  border-radius: 30px;
  padding: 6px 14px;
  box-shadow: 0 2px 12px ${COLOR.imgShadow};
  width: max-content;
  position: absolute;
  z-index: 100;
  cursor: move;
  border: 1px solid ${COLOR.border};
  height: 44px;
  box-sizing: border-box;
`;

export const ToolIcon = styled.button`
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  color: ${COLOR.text};
  padding: 0;
  &:hover {
    color: ${COLOR.accentDark};
    background: ${COLOR.imgBg};
    border-radius: 50%;
  }
`;

export const FloatingButtonWrap = styled.div`
  position: fixed;
  bottom: 36px;
  right: 48px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 20;
`;

export const CreateMenu = styled.div`
  margin-bottom: 12px;
  background: ${COLOR.card};
  border-radius: 10px;
  box-shadow: 0 2px 12px ${COLOR.imgShadow};
  padding: 6px 0;
  border: 1px solid ${COLOR.border};
`;

export const CreateMenuButton = styled.button`
  display: block;
  width: 96px;
  padding: 10px 0;
  background: none;
  border: none;
  color: ${COLOR.text};
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.13s;
  &:hover {
    background: ${COLOR.imgBg};
  }
`;

export const FloatingButton = styled.button`
  width: 48px;
  height: 48px;
  background: ${COLOR.accent};
  border: none;
  border-radius: 50%;
  font-size: 2rem;
  color: ${COLOR.card};
  box-shadow: 0 2px 12px ${COLOR.imgShadow};
  cursor: pointer;
  z-index: 10;
  transition: background 0.18s;
  &:hover {
    background: ${COLOR.accentDark};
  }
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

export const ModalContainer = styled.div`
  background-color: ${COLOR.card};
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const ModalHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${COLOR.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: 1.2rem;
    color: ${COLOR.text};
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${COLOR.subText};
  padding: 4px;
  line-height: 1;
  &:hover {
    color: ${COLOR.text};
  }
`;

export const ModalContent = styled.div`
  padding: 24px;
  overflow-y: auto;
  color: ${COLOR.text};
  font-size: 1rem;
  line-height: 1.6;

  p {
    margin: 0;
  }
`;

export const ToolbarLabel = styled.span`
  font-size: 0.9rem;
  color: ${COLOR.subText};
`;

export const ToolbarInput = styled.input`
  width: 50px;
  border: 1px solid ${COLOR.border};
  border-radius: 4px;
  padding: 4px;
  background: white;
  color: ${COLOR.text};
  font-size: 0.9rem;
  &:focus {
    outline: none;
    border-color: ${COLOR.accent};
  }
`;

export const ToolbarColorInput = styled(ToolbarInput)`
  width: 30px;
  padding: 2px;
  cursor: pointer;
`;

export const ToolbarSelect = styled.select`
  border: 1px solid ${COLOR.border};
  border-radius: 4px;
  padding: 4px 6px;
  background: white;
  color: ${COLOR.text};
  font-size: 0.9rem;
  &:focus {
    outline: none;
    border-color: ${COLOR.accent};
  }
`;

export const ImageIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /> <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /> <path d="M21 15L16 10L9 18" stroke="currentColor" strokeWidth="2" /> </svg> );
export const PenIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M3 21L12 12M18 6L12 12M12 12L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> <path d="M18 6L21 3L18 6ZM18 6L15 3L18 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> </svg> );