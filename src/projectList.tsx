import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import CalendarModal from "./components/CalendarModal";

const API_URL = process.env.REACT_APP_API_URL;

type TeamsResponse = {
  uname: string;
  team: TeamData[];
};

type TeamData = {
  tid: number;
  tname: string;
  uid: string;
};

type MessageData = {
  mid: number;
  tid: number;
  uid: string;
  uname: string;       // 받는 사람 이름 (추가)
  senduid: string;
  senduname: string;   // 보낸 사람 이름 (추가)
  tname: string;
  content: number;
};

type EditingTeamInfo = {
  tid: number;
  top: number;
  left: number;
};

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [showMessage, setShowMessage] = useState(false);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [userName, setUserName] = useState<string>("")
  const userEmail = localStorage.getItem("userEmail");
  const mailIconRef = useRef<HTMLSpanElement>(null);
  const [editingTeam, setEditingTeam] = useState<EditingTeamInfo | null>(null);
  const modificationMenuRef = useRef<HTMLDivElement>(null);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const openCalendar = () => setCalendarOpen(true);
  const closeCalendar = () => setCalendarOpen(false);

  // 팀 목록 가져오기
  const fetchTeams = useCallback(async () => {
    if (!userEmail) return; // userEmail이 없으면 실행하지 않음
    try {
      const response = await fetch(`${API_URL}/spring/api/teams/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userEmail }),
      });

      if (!response.ok) {
        throw new Error("팀 목록을 불러오는데 실패했습니다.");
      }
      
      // Spring에서 보내주는 새로운 데이터 구조({ uname, teamList })에 맞게 타입을 지정합니다.
      const data: TeamsResponse = await response.json();

      console.log("서버로부터 받은 데이터:", data);

      // API 응답에서 받은 데이터로 상태를 업데이트합니다.
      setUserName(data.uname);    // 사용자 이름 상태 업데이트
      setTeams(data.team || []);    // 팀 목록 상태 업데이트

    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  }, [userEmail]); // userEmail이 변경될 때만 함수가 재생성됨

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);


  // 메뉴 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modificationMenuRef.current && !modificationMenuRef.current.contains(event.target as Node)) {
        setEditingTeam(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 메시지 모달 열기
  const handleMailClick = async () => {
    try {
      const response = await fetch(`${API_URL}/spring/api/users/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userEmail }),
      });
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }
      // 새로운 MessageData 타입으로 데이터를 받습니다.
      const data: MessageData[] = await response.json();
      
      // 데이터가 없을 경우를 대비해 항상 배열을 보장합니다.
      setMessages(data || []);
      setShowMessage(true);

    } catch (e) {
      alert("메시지 불러오기에 실패했습니다.");
      setMessages([]); // 에러 발생 시 빈 배열로 초기화
    }
  };

  // 메시지 모달 닫기
  const handleCloseMessage = () => setShowMessage(false);

  const handleChoice = async (choice: boolean, message: MessageData) => {
    const userEmail = localStorage.getItem("userEmail"); // 현재 로그인한 유저

    if (!userEmail) {
      alert("로그인이 필요합니다.");
      return;
    }
    // 값 체크 (기존 코드와 동일)
    if (typeof message.tid !== "number" || !message.uid) {
      alert("잘못된 요청입니다.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/spring/api/users/message/choice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mid: message.mid,
          tid: message.tid,        // 팀 ID
          uid: message.senduid,    // 초대를 보낸 사람의 ID
          senduid: userEmail,      // 응답하는 사람(현재 로그인한 유저)의 ID
          bool: choice,            // 수락/거절 여부
        }),
      });
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      if (choice) {
        await fetchTeams();
      }

      alert(choice ? "팀 초대를 수락하였습니다." : "팀 초대를 거절하였습니다.");
      setMessages((msgs) => msgs.filter((msg) => msg !== message));
    } catch (e) {
      alert("서버와의 통신에 실패했습니다.");
    }
  };

  // 거절 메시지 x 버튼 클릭 시 해당 메시지 삭제
  const handleDismiss = async (message: MessageData) => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      alert("로그인 정보가 없습니다.");
      return;
    }

    try {
      // API 서버에 메시지 삭제 요청
      const response = await fetch(`${API_URL}/spring/api/users/message/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mid: message.mid,
        }),
      });

      if (!response.ok) {
        throw new Error("메시지 삭제에 실패했습니다.");
      }

      // API 요청 성공 시에만 화면에서 메시지 제거
      setMessages((msgs) => msgs.filter((msg) => msg !== message));
      alert("메시지를 삭제했습니다.");

    } catch (e: any) {
      alert(e.message || "서버와의 통신에 실패했습니다.");
    }
  };

  // 수정 버튼 클릭 핸들러
  const handleModifyClick = (event: React.MouseEvent, team: TeamData) => {
    event.stopPropagation(); // 카드 클릭(페이지 이동) 이벤트 전파 방지
    const rect = event.currentTarget.getBoundingClientRect();
    setEditingTeam({
      tid: team.tid,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX - 150, // 메뉴가 버튼 왼쪽에 오도록 조정
    });
  };

  // 팀장 페이지로 이동하는 핸들러
  const handleEditMembers = (tid: number) => {
    // navigate를 사용하여 state와 함께 페이지 이동
    navigate("/leader", {
      state: {
        teamId: tid,
        userId: userEmail,
      },
    });
    setEditingTeam(null); // 메뉴 닫기
  };

  // 프로젝트 삭제 핸들러
  const handleDeleteProject = async (tid: number) => {
    if (window.confirm("정말로 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      try {
        // --- 추가된 API 호출 로직 ---
        const response = await fetch(`${API_URL}/spring/api/teams/delete`, {
          method: "POST", // 또는 서버에서 요구하는 HTTP 메소드 (예: DELETE)
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tid: tid }), // 팀 ID를 JSON으로 전송
        });

        if (!response.ok) {
          // 서버에서 에러 응답이 온 경우
          throw new Error("프로젝트 삭제에 실패했습니다.");
        }
        
        // --- API 호출 성공 시 ---
        alert("프로젝트가 성공적으로 삭제되었습니다.");
        
        // UI에서 해당 프로젝트 즉시 제거
        setTeams(teams.filter(team => team.tid !== tid)); 
        
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("프로젝트 삭제 중 오류가 발생했습니다.");
      } finally {
        // 성공하든 실패하든 메뉴는 닫기
        setEditingTeam(null);
      }
    }
  };

  const handleLeaveTeam = async (tid: number) => {
    if (window.confirm("정말로 이 팀을 나가시겠습니까?")) {
      try {
        // 팀 나가기 API 호출
        const response = await fetch(`${API_URL}/spring/api/teams/exit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tid: tid, uid: userEmail }),
        });

        if (!response.ok) {
          throw new Error("팀 나가기에 실패했습니다.");
        }
        
        alert("팀에서 성공적으로 나갔습니다.");
        
        // UI에서 해당 팀 즉시 제거
        setTeams(teams.filter(team => team.tid !== tid)); 

      } catch (error) {
        console.error("Error leaving team:", error);
        alert("팀 나가기 처리 중 오류가 발생했습니다.");
      } finally {
        setEditingTeam(null); // 메뉴 닫기
      }
    }
  };

  return (
    <Container>
      <CalendarModal isOpen={isCalendarOpen} onClose={closeCalendar} />
      <HeaderBar>
        <Logo onClick={() => navigate("/")}>BlankSync</Logo>
        <RecentTitle>최근 프로젝트</RecentTitle>
        <CreateButton onClick={() => navigate("/create")}>생성하기 +</CreateButton>
      </HeaderBar>
      <Body>
        <Sidebar>
          <SidebarTitle>
            {userName ? `${userName}님의 프로젝트` : "○○○님의 프로젝트"}
          </SidebarTitle>
          <SidebarList>
            {teams.length === 0 ? (
              <SidebarEmpty>팀이 없습니다.</SidebarEmpty>
            ) : (
              teams.map((team, i) => (
                <SidebarItem
                  key={i}
                  onClick={() =>
                    navigate("/team", {
                      state: {
                        userId: userEmail,
                        teamId: team.tid,
                      },
                    })
                  }
                >
                  {team.tname}
                </SidebarItem>
              ))
            )}
          </SidebarList>
          <SidebarFooter>
            <span>설정 / 프로젝트 삭제</span>
            <MailIconWrapper ref={mailIconRef}>
              <MailIcon onClick={handleMailClick} />
            </MailIconWrapper>
          </SidebarFooter>

          {showMessage && (
            <MessagePanel>
              <MessagePanelHeader>
                <MessagePanelTitle>수신함</MessagePanelTitle>
                <CloseButton onClick={handleCloseMessage}>×</CloseButton>
              </MessagePanelHeader>
              <MessagePanelBody>
                {messages.length === 0 ? (
                  <NoMessage>받은 메시지가 없습니다.</NoMessage>
                ) : (
                  messages.map((message) => (
                    <MessageItem key={message.mid}>
                      <div>
                        {/* content 값에 따라 다른 메시지 표시 */}
                        {message.content === 1 ? (
                          // 팀원 초대 요청 (content: 1)
                          <>
                            <b>{message.senduname}({message.senduid})</b>님이 <b>{message.tname}</b>에 회원님을 팀원으로 요청하였습니다.
                          </>
                        ) : message.content === 3 ? (
                          // 일정 생성 알림 (content: 3)
                          <>
                            <b>{message.senduname}({message.senduid})</b>님이 <b>{message.tname}</b>에 팀일정을 생성하였습니다.
                            <DismissButton onClick={() => handleDismiss(message)}>×</DismissButton>
                          </>
                        ) : message.content === 4 ? (
                          // 일정 수정 알림 (content: 4)
                          <>
                            <b>{message.senduname}({message.senduid})</b>님이 <b>{message.tname}</b>에 팀일정을 수정하였습니다.
                            <DismissButton onClick={() => handleDismiss(message)}>×</DismissButton>
                          </>
                        ) : message.content === 5 ? (
                          // 일정 삭제 알림 (content: 5)
                          <>
                            <b>{message.senduname}({message.senduid})</b>님이 <b>{message.tname}</b>에 팀일정을 삭제하였습니다.
                            <DismissButton onClick={() => handleDismiss(message)}>×</DismissButton>
                          </>
                        ) : message.content === 6 ? (
                          // 팀 탈퇴 알림 (content: 6)
                          <>
                            <b>{message.senduname}({message.senduid})</b>님이 <b>{message.tname}</b>에서 나갔습니다.
                            <DismissButton onClick={() => handleDismiss(message)}>
                              ×
                            </DismissButton>
                          </>
                        ) : (
                          // 그 외 (팀원 거절 등)
                          <>
                            <b>{message.senduname}({message.senduid})</b>님이 <b>{message.tname}</b> 팀 초대를 거절하였습니다.
                            <DismissButton onClick={() => handleDismiss(message)}>
                              ×
                            </DismissButton>
                          </>
                        )}
                      </div>
                      <MessageMeta>
                        {/* 날짜, 시간 등 추가 가능 */}
                      </MessageMeta>
                      {/* 수락/거절 버튼은 content가 1일 때만 표시 */}
                      {message.content === 1 && (
                        <ModalButtonRow>
                          <ModalButton $accept onClick={() => handleChoice(true, message)}>
                            수락하기
                          </ModalButton>
                          <ModalButton onClick={() => handleChoice(false, message)}>
                            거절하기
                          </ModalButton>
                        </ModalButtonRow>
                      )}
                      {[3, 4, 5].includes(message.content) && (
                        <ModalButtonRow>
                          <ModalButton onClick={openCalendar}>
                            캘린더 보러가기
                          </ModalButton>
                        </ModalButtonRow>
                      )}
                    </MessageItem>
                  ))
                )}
              </MessagePanelBody>
            </MessagePanel>
          )}
        </Sidebar>
        <MainArea>
          {teams.length === 0 ? (
            <NoTeamsText>생성된 팀이 없습니다.</NoTeamsText>
          ) : (
            <ProjectGrid>
              {teams.map((team) => (
                <ProjectCard
                  key={team.tid}
                  onClick={() =>
                    navigate("/team", {
                      state: { userId: userEmail, teamId: team.tid },
                    })
                  }
                >
                  <ProjectCardImage src="image/listImage.jpg" alt={team.tname} />
                  <ProjectCardLabel>{team.tname}</ProjectCardLabel>
                  
                  {/* --- 수정된 부분: 조건 없이 항상 버튼을 표시 --- */}
                  <ModifyButton onClick={(e) => handleModifyClick(e, team)}>
                    수정
                  </ModifyButton>
                </ProjectCard>
              ))}
            </ProjectGrid>
          )}

          {/* --- 수정된 부분: 메뉴 내부의 버튼을 역할에 따라 분기 --- */}
          {editingTeam && createPortal(
            (() => {
              // 현재 메뉴가 열린 팀 정보를 찾음
              const activeTeamForMenu = teams.find(t => t.tid === editingTeam.tid);
              if (!activeTeamForMenu) return null;

              // 팀장 여부 확인
              const isLeader = activeTeamForMenu.uid === userEmail;

              return (
                <ModificationMenu
                  ref={modificationMenuRef}
                  style={{ top: `${editingTeam.top}px`, left: `${editingTeam.left}px` }}
                >
                  {isLeader ? (
                    // 팀장일 경우 보여줄 메뉴
                    <>
                      <MenuButton onClick={() => handleEditMembers(editingTeam.tid)}>
                        팀장 페이지
                      </MenuButton>
                      <MenuButton onClick={() => handleDeleteProject(editingTeam.tid)} $delete>
                        팀 삭제
                      </MenuButton>
                    </>
                  ) : (
                    // 팀원일 경우 보여줄 메뉴
                    <MenuButton onClick={() => handleLeaveTeam(editingTeam.tid)} $delete>
                      팀 나가기
                    </MenuButton>
                  )}
                </ModificationMenu>
              );
            })(),
            document.body
          )}
        </MainArea>
      </Body>
    </Container>
  );
};

export default ProjectList;

const COLOR = {
  bg: "#EDE9F2",
  card: "#F2F2F2",
  accent: "#B8B6F2",
  accentDark: "#545159",
  text: "#3B3740",
  subText: "#A19FA6",
  logo: "#C6C4F2",
  imgBg: "#D1D0F2",
  imgShadow: "#CEDEF2",
  border: "#E3DCF2",
};

const Container = styled.div`
  font-family: "Pretendard", sans-serif;
  background-color: ${COLOR.bg};
  color: ${COLOR.text};
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const HeaderBar = styled.header`
  width: 100%;
  background: ${COLOR.card};
  border-bottom: 1.5px solid ${COLOR.border};
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Logo = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: ${COLOR.logo};
  letter-spacing: 1.5px;
  cursor: pointer;
  margin: 0;
  transition: color 0.18s;
  &:hover {
    color: ${COLOR.accent};
  }
`;

const RecentTitle = styled.div`
  font-size: 1.18rem;
  font-weight: 600;
  color: ${COLOR.text};
  text-align: center;
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CreateButton = styled.button`
  background: ${COLOR.accent};
  color: ${COLOR.card};
  border: none;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 26px;
  margin-left: 16px;
  box-shadow: 0 1px 4px ${COLOR.imgShadow};
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  &:hover {
    background: ${COLOR.accentDark};
    color: ${COLOR.card};
  }
`;

const Body = styled.div`
  display: flex;
  flex: 1 1 0;
  height: 100%;
  gap: 0;
  align-items: stretch;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: 280px;
  min-width: 180px;
  background: ${COLOR.card};
  border-right: 1.5px solid ${COLOR.border};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 32px 0 0 0;
  overflow: hidden;
`;

const SidebarTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${COLOR.accentDark};
  margin-left: 36px;
  margin-bottom: 18px;
`;

const SidebarList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
`;

const SidebarItem = styled.li`
  font-size: 1rem;
  margin-bottom: 13px;
  font-weight: 400;
  color: ${COLOR.text};
  padding: 8px 24px;
  border-radius: 8px;
  margin-left: 12px;
  margin-right: 12px;
  transition: background 0.18s;
  box-sizing: border-box;
  &:hover {
    background: ${COLOR.imgBg};
  }
`;

const SidebarFooter = styled.div`
  font-size: 0.95rem;
  color: ${COLOR.subText};
  background: ${COLOR.card};
  padding: 20px 24px 18px 36px;
  border-top: 1.5px solid ${COLOR.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const MailIconWrapper = styled.span`
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.18s;
  &:hover {
    background: ${COLOR.imgBg};
  }
`;

const MailIcon = (props: React.HTMLProps<HTMLSpanElement>) => (
  <span {...props}>
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2.5" y="5" width="17" height="12" rx="2.5" stroke={COLOR.accentDark} strokeWidth="1.5" />
      <path d="M4 7l7 5 7-5" stroke={COLOR.accentDark} strokeWidth="1.5" fill="none" />
    </svg>
  </span>
);

const MessagePanel = styled.div`
  position: fixed;
  top: 0;
  left: 280px;
  height: 100vh;
  width: 360px;
  background: ${COLOR.card};
  border-left: 2.5px solid ${COLOR.border};
  box-shadow: 4px 0 24px 0 ${COLOR.imgShadow};
  z-index: 3000;
  display: flex;
  flex-direction: column;
`;

const MessagePanelHeader = styled.div`
  width: 100%;
  background: ${COLOR.card};
  border-bottom: 1.5px solid ${COLOR.border};
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  height: 64px;
`;

const MessagePanelTitle = styled.div`
  font-size: 1.18rem;
  font-weight: 700;
  color: ${COLOR.text};
  letter-spacing: 0.5px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${COLOR.subText};
  cursor: pointer;
  &:hover {
    color: ${COLOR.accentDark};
  }
`;

const MessagePanelBody = styled.div`
  flex: 1 1 0;
  overflow-y: auto;
  padding: 18px 28px 18px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const MessageItem = styled.div`
  background: ${COLOR.bg};
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 1px 6px ${COLOR.imgShadow};
  font-size: 1rem;
  color: ${COLOR.text};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MessageMeta = styled.div`
  font-size: 0.92rem;
  color: ${COLOR.subText};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ModalButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ $accept?: boolean }>`
  padding: 7px 18px;
  border-radius: 16px;
  border: none;
  font-size: 0.98rem;
  font-weight: 500;
  background: ${(props) => (props.$accept ? COLOR.accent : COLOR.imgBg)};
  color: ${(props) => (props.$accept ? COLOR.card : COLOR.text)};
  cursor: pointer;
  transition: background 0.18s;
  &:hover {
    background: ${(props) => (props.$accept ? COLOR.accentDark : COLOR.border)};
  }
`;

const DismissButton = styled.button`
  background: transparent;
  border: none;
  color: ${COLOR.subText};
  font-size: 1.2rem;
  cursor: pointer;
  margin-left: 8px;
  padding: 0;
  line-height: 1;
  &:hover {
    color: ${COLOR.accentDark};
  }
`;

const NoMessage = styled.div`
  color: ${COLOR.subText};
  font-size: 1.05rem;
  text-align: center;
  margin-top: 40px;
`;

const MainArea = styled.main`
  flex: 1 1 0;
  background: ${COLOR.bg};
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 32px;
  min-width: 0;
  min-height: 0;
  overflow: auto;
`;

const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
  width: 100%;
`;

const ProjectCardImage = styled.img`
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: contain;
  background: ${COLOR.imgBg};
  border-radius: 12px 12px 0 0;
  display: block;
`;

const ProjectCardLabel = styled.div`
  width: 100%;
  font-size: 1.1rem;
  font-weight: 500;
  color: ${COLOR.text};
  margin-top: 12px;
  text-align: center;
  padding: 0 8px 16px 8px;
`;

const ProjectCard = styled.div`
  background: ${COLOR.card};
  border-radius: 12px;
  border: 1.5px solid ${COLOR.border};
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: 0;
  min-height: 200px;
  box-shadow: 0 2px 8px ${COLOR.imgShadow};
  transition: box-shadow 0.18s, transform 0.18s;
  cursor: pointer;
  position: relative; // 수정 버튼 및 메뉴의 기준점

  &:hover {
    box-shadow: 0 4px 12px ${COLOR.imgShadow};
    transform: translateY(-2px);
  }
`;

const ModifyButton = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background-color: ${COLOR.subText};
  color: white;
  border: none;
  border-radius: 15px;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  z-index: 5; // 카드 컨텐츠 위에 오도록 설정

  &:hover {
    background-color: ${COLOR.accentDark};
  }
`;

const ModificationMenu = styled.div`
  position: absolute; // body를 기준으로 위치
  width: 150px;
  background-color: ${COLOR.card};
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid ${COLOR.border};
  z-index: 4000; // 최상단에 보이도록 z-index 설정
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MenuButton = styled.button<{ $delete?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: left;
  border: none;
  background-color: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: ${({ $delete }) => ($delete ? "#D9534F" : COLOR.text)};

  &:hover {
    background-color: ${COLOR.bg};
    color: ${({ $delete }) => ($delete ? "#a93e3b" : COLOR.accentDark)};
  }
`;

const NoTeamsText = styled.div`
  color: ${COLOR.subText};
  font-size: 1.15rem;
  padding: 60px 0 0 0;
  text-align: center;
  width: 100%;
`;

const SidebarEmpty = styled.div`
  color: ${COLOR.subText};
  font-size: 1.05rem;
  margin-top: 12px;
  margin-bottom: 12px;
`;
