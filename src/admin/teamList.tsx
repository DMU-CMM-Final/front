import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import './css/teamList.css';
import Header from '../header';
import api from '../api';

// 서버 응답 데이터의 타입
interface FetchedMemberInfo {
  uid: string;
}

interface FetchedTeamInfo {
  tid: number;
  tname: string;
  uid: string; // 팀장 ID
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface TeamData {
  id: number;
  name: string;
  leader: string;
  members: TeamMember[];
  membersLoaded: boolean;
}

const TeamList = () => {
  const [teamList, setTeamList] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // --- 1. 모달 상태 관리를 위한 state 추가 ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamData | null>(null);
  
  // 모달 내부 input 값을 위한 state
  const [editedTname, setEditedTname] = useState('');
  const [editedLeader, setEditedLeader] = useState('');

  // 전체 팀 목록을 불러오는 useEffect
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const response = await api.post<FetchedTeamInfo[]>('/spring/api/admin/team');
        const data: FetchedTeamInfo[] = response.data;
        const formattedData: TeamData[] = data.map(team => ({
          id: team.tid,
          name: team.tname,
          leader: team.uid,
          members: [],
          membersLoaded: false,
        }));
        setTeamList(formattedData);
      } catch (error) {
        console.error("팀 데이터를 가져오는 중 오류 발생:", error);
        if (error && typeof error === 'object' && 'response' in error) {
          const responseData = (error as any).response?.data;
          alert(responseData?.message || "팀 데이터 로딩에 실패했습니다.");
        } else {
          alert('팀 데이터를 가져오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const handleToggle = async (teamId: number) => {
    const targetTeam = teamList.find(t => t.id === teamId);
    if (!targetTeam) return;

    if (targetTeam.membersLoaded) {
      setExpandedId(expandedId === teamId ? null : teamId);
      return;
    }

    try {
      const response = await api.post<FetchedMemberInfo[]>('/spring/api/admin/team/list', { tid: teamId });
      const memberData: FetchedMemberInfo[] = response.data;

      // --- 3. 팀장을 제외하고, 필요한 데이터만 추출하여 가공 ---
      const members: TeamMember[] = memberData
        .filter(member => member.uid !== targetTeam.leader) // 팀장(leader)과 uid가 다른 팀원만 필터링
        .map(member => ({
          id: member.uid,
          name: member.uid, // 실제 표시될 이름
          role: '팀원',
        }));

      // --- 4. 상태 업데이트 ---
      const updatedTeamList = teamList.map(team =>
        team.id === teamId
          ? { ...team, members: members, membersLoaded: true }
          : team
      );
      setTeamList(updatedTeamList);
      setExpandedId(teamId);

    } catch (error) {
      console.error("팀원 목록을 가져오는 중 오류 발생:", error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "팀원 목록 로딩에 실패했습니다.");
      } else {
        alert('팀원 목록을 가져오는 중 오류가 발생했습니다.');
      }
    }
  };

  // --- 2. 모달을 열고 닫는 함수들 추가 ---
  const handleOpenEditModal = (team: TeamData) => {
    setEditingTeam(team);
    setEditedTname(team.name);
    setEditedLeader(team.leader);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
  };

  // --- 3. 수정 사항 저장 함수 수정 ---
  const handleSaveChanges = async () => {
    // 수정할 팀 정보가 없으면 함수 종료
    if (!editingTeam) return;

    // 1. 기존 팀장 ID와 수정된 팀장 ID를 비교
    // 변경되지 않았으면 null, 변경되었으면 새 ID를 전송
    const uidToSend = editedLeader === editingTeam.leader ? null : editedLeader;

    // 2. 서버에 보낼 데이터 (payload) 구성
    const payload = {
      tid: editingTeam.id,
      tname: editedTname,
      uid: uidToSend,
    };

    try {
      // 3. 서버로 수정 요청 API 호출
      await api.post('/spring/api/admin/team/update', payload);

      // 4. API 호출 성공 시, 프론트엔드의 목록 상태도 업데이트
      const updatedList = teamList.map(team =>
        team.id === editingTeam.id
          ? { ...team, name: editedTname, leader: editedLeader }
          : team
      );
      setTeamList(updatedList);

      alert('팀 정보가 수정되었습니다.');
      handleCloseModal(); // 모달 닫기

    } catch (error) {
      console.error("팀 정보 수정 중 오류 발생:", error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "팀 정보 수정에 실패했습니다.");
      } else {
        alert('오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleDelete = async (teamId: number, teamName: string) => {
    // 사용자에게 정말 삭제할 것인지 최종 확인을 받습니다.
    if (!window.confirm(`'${teamName}' 팀을 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return; // 사용자가 '취소'를 누르면 함수 종료
    }

    try {
      // 서버로 삭제 요청 API 호출
      await api.post('/spring/api/teams/delete', { tid: teamId });

      // API 호출 성공 시, 프론트엔드의 목록(state)에서도 해당 팀을 제거
      setTeamList(currentList => currentList.filter(team => team.id !== teamId));
      alert(`'${teamName}' 팀이 성공적으로 삭제되었습니다.`);

    } catch (error) {
      console.error("팀 삭제 중 오류 발생:", error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "팀 삭제에 실패했습니다.");
      } else {
        alert('팀 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <Header />
        <div className="page-container">
          <h1 className="main-title">팀 목록을 불러오는 중입니다...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <Header />
      <div className="page-container">
        <h1 className="main-title">팀 관리 페이지</h1>
        <div className="list-container">
          <h2 className="list-title">팀 리스트</h2>
          <div className="list-header">
            <div>팀 아이디</div>
            <div>팀 이름</div>
            <div>팀장</div>
            <div></div>
          </div>
          <div className="list-body">
            {teamList.map((team) => (
              <div key={team.id} className="team-item-container">
                <div className="team-row">
                  <div>{team.id}</div>
                  <div>{team.name}</div>
                  <div>{team.leader}</div>
                  <div className="actions">
                    {/* --- 4. 수정/삭제 링크 분리 및 모달 열기 함수 연결 --- */}
                    <ActionLink onClick={() => handleOpenEditModal(team)}>수정</ActionLink>
                    <ActionLink onClick={() => handleDelete(team.id, team.name)}>삭제</ActionLink>
                    <button onClick={() => handleToggle(team.id)} className={`toggle-button ${expandedId === team.id ? 'expanded' : ''}`}>
                      ▼
                    </button>
                  </div>
                </div>
                {expandedId === team.id && (
                  <div className="details-section">
                    {team.members.length > 0 ? (
                    <>
                      <div className="details-header">
                      <div>팀원명</div>
                      <div>역할</div>
                  </div>
                  {team.members.map((member) => (
                    <div key={member.id} className="details-row">
                      <div>{member.name}</div>
                      <div>{member.role}</div>
                    </div>
                  ))}
                    </>
                  ) : (
                  <div className="no-members">소속된 팀원이 없습니다.</div>
                )}
                </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* --- 5. 모달 UI 렌더링 --- */}
      {isModalOpen && editingTeam && (
        <ModalBackdrop onClick={handleCloseModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>팀 정보 수정</h2>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
              <InputGroup>
                <label>팀 아이디</label>
                <input type="text" value={editingTeam.id} disabled />
              </InputGroup>
              <InputGroup>
                <label>팀 이름</label>
                <input 
                  type="text" 
                  value={editedTname}
                  onChange={(e) => setEditedTname(e.target.value)}
                />
              </InputGroup>
              <InputGroup>
                <label>팀장</label>
                <input 
                  type="text"
                  value={editedLeader}
                  onChange={(e) => setEditedLeader(e.target.value)}
                />
              </InputGroup>
            </ModalBody>
            <ModalFooter>
              <ModalButton onClick={handleCloseModal}>취소</ModalButton>
              <ModalButton primary onClick={handleSaveChanges}>수정</ModalButton>
            </ModalFooter>
          </ModalContent>
        </ModalBackdrop>
      )}
    </div>
  );
};

export default TeamList;

const COLOR = {
  bg: "#EDE9F2",        // 전체 배경
  card: "#F2F2F2",      // 카드/박스 배경
  accent: "#B8B6F2",    // 주요 버튼/포인트
  accentDark: "#545159",// 버튼 hover 등
  text: "#3B3740",      // 기본 텍스트
  subText: "#A19FA6",   // 서브 텍스트
  logo: "#C6C4F2",      // 로고/포인트
  imgBg: "#D1D0F2",     // 이미지 영역 배경
  imgShadow: "#CEDEF2", // 이미지 그림자
  border: "#E3DCF2",    // 경계선/구분선
};

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  h2 {
    margin: 0;
    font-size: 18px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #aaa;
  &:hover {
    color: #000;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  label {
    font-size: 14px;
    font-weight: 600;
    color: #555;
  }
  input {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 15px;
    &:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
  }
`;

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 10px 20px;
  border-radius: 6px;
  border: 1px solid ${props => props.primary ? COLOR.accent : '#ccc'};
  background-color: ${props => props.primary ? COLOR.accent : '#fff'};
  color: ${props => props.primary ? '#fff' : '#333'};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    opacity: 0.8;
  }
`;

// 기존 action-link 스타일 수정
const ActionLink = styled.a`
  color: var(--action-color);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;