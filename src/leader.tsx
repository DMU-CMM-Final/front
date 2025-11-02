import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import Header from "./header";
import { useLocation, useNavigate } from "react-router-dom";
import api from "./api";

// 📈 1. Chart.js 관련 모듈을 임포트
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// 📈 2. Chart.js에서 사용할 구성 요소들을 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// --- API 연동을 위한 타입 정의 ---
type TeamMember = {
  uid: string;
  uname: string; 
  score: number;
  attend: number;
  count: number;
};

interface InvitedMemberInModal {
  email: string;
  mid: number;
}

type Project = {
  pid: number;
  pname: string;
};

interface LeaderPageData { 
  tname: string;
  count: number;
  members: TeamMember[];
  project: Project[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- 요청하신 새 컬러 팔레트 ---
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

// --- 그래프 및 포인트 컬러 (기존 색상 유지) ---
const GRAPH_COLOR = {
    bar: "#8683E0",
    donut: "#8683E0",
    line: "#FA5252",
    danger: "#FA5252"
}

// --- 팀원별 참여도 바 차트 ---
const TeamBarChart: React.FC<{ members: TeamMember[] }> = ({ members }) => {
  // useMemo를 사용해 members 데이터가 변경될 때만 차트 데이터를 다시 계산합니다.
  const chartData = useMemo(() => {
    const labels = members.map(member => member.uname); 
    const scores = members.map(member => member.score);

    return {
      labels,
      datasets: [
        {
          label: '참여 점수',
          data: scores,
          backgroundColor: GRAPH_COLOR.bar,
          borderRadius: 4,
          maxBarThickness: 100,
        },
      ],
    };
  }, [members]);

  const options = {
    responsive: true,
    maintainAspectRatio: false, // 이 옵션을 false로 설정하여 부모 컨테이너 크기에 맞춤
    plugins: {
      legend: {
        display: false, // 범례는 숨김
      },
      title: {
        display: false, // 차트 제목도 숨김 (CardTitle 사용)
      },
    },
    scales: {
      y: {
        beginAtZero: true, // y축은 0부터 시작
        max: 100,       
        grid: {
          color: COLOR.border,
        },
        ticks: {
            color: COLOR.subText,
        }
      },
      x: {
        grid: {
          display: false, // x축 그리드 라인 숨김
        },
        ticks: {
            color: COLOR.subText,
        }
      },
    },
  };

  return <Bar options={options} data={chartData} />;
};

interface DonutProps {
  averageScore: number;
  status: string;
}

// --- 팀원 전체 참여도 도넛 차트 ---
const OverallScoreDonutChart: React.FC<DonutProps> = ({ averageScore, status }) => {

  // 도넛 차트 데이터를 설정합니다. (평균 점수, 100 - 평균 점수)
  const chartData = {
    labels: ['달성', '미달'],
    datasets: [
      {
        data: [averageScore, 100 - averageScore],
        backgroundColor: [GRAPH_COLOR.donut, COLOR.border],
        borderColor: [COLOR.card, COLOR.card], // 경계선 색을 배경과 맞춤
        borderWidth: 2,
        cutout: '80%', // 도넛 두께 조절
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }, // 툴팁 비활성화
    },
  };

  return (
    <DonutChartContainer>
      <Doughnut data={chartData} options={options} />
      <DonutText>
        <strong>{averageScore}%</strong>
        <span>{status}</span>
      </DonutText>
    </DonutChartContainer>
  );
};

// 📈 3. 회의 참석율 바 차트 컴포넌트를 새로 만듭니다.
const AttendanceBarChart: React.FC<{ members: TeamMember[] ,totalMeetings: number }> = ({ members, totalMeetings }) => {
    
  const { chartData } = useMemo(() => {
    const labels = members.map(member => member.uname);
    const attendanceData = members.map(member => member.attend);
    
    return {
      chartData: {
        labels,
        datasets: [
          {
            label: '회의 참석 횟수',
            data: attendanceData,
            backgroundColor: GRAPH_COLOR.line, // 기존 라인 색상 활용
            borderRadius: 4,
            maxBarThickness: 100,
          },
        ],
      },
    };
  }, [members]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: totalMeetings, // Y축 최댓값을 동적으로 설정
        grid: { color: COLOR.border },
        ticks: { color: COLOR.subText, stepSize: 1 } // 정수 단위로 눈금 표시
      },
      x: {
        grid: { display: false },
        ticks: { color: COLOR.subText }
      },
    },
  };

  return <Bar options={options} data={chartData} />;
};

const Leader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teamId } = location.state || {}; // ProjectList에서 넘겨받은 teamId
  const currentUserEmail = localStorage.getItem("userEmail");

  // --- 상태 관리 ---
  const [teamName, setTeamName] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [totalMeetings, setTotalMeetings] = useState<number>(10);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- 모달 관련 상태 ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState(""); // 모달 내 이메일 입력
  const [newlyInvitedMembers, setNewlyInvitedMembers] = useState<InvitedMemberInModal[]>([]); // 모달 내에서 추가된 이메일 목록
  const [isAddingMember, setIsAddingMember] = useState(false); // 팀원 추가 API 호출 로딩 상태

  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);

  // --- 데이터 연동 함수 (useCallback으로 감싸 재사용) ---
  const fetchLeaderData = useCallback(async () => {
        if (!teamId) {
            setError("잘못된 접근입니다. 팀 ID가 없습니다.");
            setLoading(false);
            return;
        }
        setLoading(true); // 데이터 요청 시작 시 로딩 상태 활성화
        try {
          const response = await api.post<LeaderPageData>('/spring/api/teams/page', { 
            tid: teamId 
          });

          const data = response.data;

          console.log('API에서 받은 전체 데이터:', data);
          setTeamName(data.tname || "팀 이름 없음");
          setTotalMeetings(data.count || 10); 
          setTeamMembers(data.members || []); 
          setProjects(data.project || []);
        } catch (err: any) {
          if (err && typeof err === 'object' && 'response' in err) {
          const responseData = (err as any).response?.data;
          setError(responseData?.message || "팀 정보를 불러오는데 실패했습니다.");
        } else {
          setError(err.message);
        }
        } finally {
            setLoading(false);
        }    
    }, [teamId]);

  useEffect(() => {
    fetchLeaderData();
  }, [fetchLeaderData]);

  const handleDeleteMember = async (memberUid: string) => {
        if (window.confirm(`정말로 팀원 '${memberUid}'님을 삭제하시겠습니까?`)) {
        try {
          await api.post('/spring/api/teams/mem/delete', {
          tid: teamId,     
          uid: memberUid,  
          });

          // API 요청 성공 시, 화면(state)에서도 해당 팀원 제거
          setTeamMembers(prevMembers =>
          prevMembers.filter(member => member.uid !== memberUid)
          );
          alert("팀원이 성공적으로 삭제되었습니다.");

        } catch (err: any) {
          if (err && typeof err === 'object' && 'response' in err) {
          const responseData = (err as any).response?.data;
          alert(responseData?.message || "팀원 삭제에 실패했습니다.");
        } else {
          alert(err.message);
        }
        }
        }
    };

  // --- 모달 열기/닫기 함수 ---
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setMemberEmail("");
    setNewlyInvitedMembers([]);
  };

  // --- 모달 내에서 팀원 추가하는 함수 ---
  const handleAddMember = async () => {
    const currentUserEmail = localStorage.getItem("userEmail");
    if (memberEmail === currentUserEmail) {
      alert("본인은 팀원으로 초대할 수 없습니다!");
      return;
    }
    if (!EMAIL_REGEX.test(memberEmail)) {
      alert("이메일 형식을 지켜주세요!");
      return;
    }
    if (newlyInvitedMembers.some(m => m.email === memberEmail) || teamMembers.some(m => m.uid === memberEmail)) {
        alert("이미 추가되었거나 초대 요청된 이메일입니다.");
        return;
    }

    setIsAddingMember(true);
    try {
      const response = await api.post<string>('/spring/api/teams/message', {
        tid: teamId,
        uid: memberEmail,
        senduid: localStorage.getItem("userEmail"),
      });

      const mid = parseInt(response.data, 10);

      if (!isNaN(mid) && mid !== 0) {
        alert("팀원 요청 성공!");
        setNewlyInvitedMembers([...newlyInvitedMembers, { email: memberEmail, mid: mid }]);
        setMemberEmail("");
        await fetchLeaderData(); // 실시간 업데이트를 위해 팀 정보 다시 로드
      } else {
        alert("팀원 요청에 실패했습니다.");
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "팀원 요청에 실패했습니다.");
      } else {
        alert("서버와의 통신에 실패했습니다.");
      }
    } finally {
      setIsAddingMember(false);
    }
  };

  // --- 모달 내에서 초대 목록을 삭제하는 함수 ---
  const handleDeleteInvitation = async (midToDelete: number) => {
    setIsAddingMember(true); // 버튼 비활성화를 위해 로딩 상태 사용
    try {
      await api.post('/spring/api/teams/message/delete', {
        mid: midToDelete,
      });

      alert("팀원 초대가 취소되었습니다.");
      setNewlyInvitedMembers(prev => prev.filter(member => member.mid !== midToDelete));
      await fetchLeaderData();
    } catch (error: any) {
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "초대 취소에 실패했습니다.");
      } else {
        alert(error.message);
      }
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (window.confirm(`정말로 '${teamName}' 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      try {
        await api.post('/spring/api/teams/delete', { tid: teamId });

        alert("팀이 성공적으로 삭제되었습니다.");
        navigate("/projectList");

      } catch (err: any) {
        if (err && typeof err === 'object' && 'response' in err) {
          const responseData = (err as any).response?.data;
          alert(responseData?.message || "팀 삭제에 실패했습니다.");
        } else {
          alert(err.message);
        }
      }
    }
  };

  const openProjectModal = () => setProjectModalOpen(true);
  const closeProjectModal = () => {
    setProjectModalOpen(false);
    setNewProjectName("");
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      alert("프로젝트 이름을 입력해주세요.");
      return;
    }
    setIsAddingProject(true);
    try {
      await api.post('/spring/api/teams/projnew', {
        tid: teamId,
        pname: newProjectName,
      });

      alert("프로젝트가 성공적으로 추가되었습니다.");
      await fetchLeaderData(); // 데이터를 새로고침하여 추가된 프로젝트를 반영
      closeProjectModal();     // 모달 닫기

    } catch (error: any) {
      console.error("프로젝트 추가 오류:", error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "프로젝트 추가에 실패했습니다.");
      } else {
        alert(error.message);
      }
    } finally {
      setIsAddingProject(false);
    }
  };

  const handleDeleteProject = async (pidToDelete: number) => {
    const projectName = projects.find(p => p.pid === pidToDelete)?.pname || "해당 프로젝트";
    
    if (window.confirm(`정말로 '${projectName}' 프로젝트를 삭제하시겠습니까?`)) {
      try {
        await api.post('/spring/api/teams/projdel', {
          tid: teamId,
          pid: pidToDelete,
        });

        alert("프로젝트가 성공적으로 삭제되었습니다.");
        await fetchLeaderData();
      } catch (err: any) {
        console.error("프로젝트 삭제 오류:", err);
        if (err && typeof err === 'object' && 'response' in err) {
          const responseData = (err as any).response?.data;
          alert(responseData?.message || "프로젝트 삭제에 실패했습니다.");
        } else {
          alert(err.message);
        }
      }
    }
  };

  // KPI 계산 로직
  const { averageScore, teamStatus } = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) {
      return { averageScore: 0, teamStatus: "데이터 없음" };
    }

    const totalScore = teamMembers.reduce((sum, member) => sum + member.score, 0);
    const average = totalScore / teamMembers.length;

    let currentStatus = '위험';
    if (average >= 75) {
      currentStatus = '최상';
    } else if (average >= 50) {
      currentStatus = '양호';
    } else if (average >= 25) {
      currentStatus = '경고';
    }

    return { averageScore: Math.round(average), teamStatus: currentStatus };
  }, [teamMembers]);

  // 평균 참석율 KPI 계산
  const averageAttendanceRate = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0 || totalMeetings === 0) {
      return 0;
    }
    const totalAttendance = teamMembers.reduce((sum, member) => sum + member.attend, 0);
    // (총 참석 횟수 / (팀원 수 * 총 회의 수)) * 100
    const rate = (totalAttendance / (teamMembers.length * totalMeetings)) * 100;
    return Math.round(rate);
  }, [teamMembers, totalMeetings]);

  return (
    <Container>
      <Header />
      <MainContent>
        <PageHeader>
          <PageTitle>{teamName}팀의 팀장페이지</PageTitle>
          <DeleteTeamLink as="button" onClick={handleDeleteTeam}>
            팀 삭제하기
          </DeleteTeamLink>
        </PageHeader>

        <KpiGrid>
          <KpiCard>
            <KpiTitle>총 팀원</KpiTitle>
            <KpiValue>{teamMembers.length}명</KpiValue>
          </KpiCard>
          <KpiCard>
            <KpiTitle>진행중 프로젝트</KpiTitle>
            <KpiValue>{projects.length}건</KpiValue>
          </KpiCard>
          <KpiCard>
            <KpiTitle>팀 평균 참여도</KpiTitle>
            <KpiValue>{averageScore}%</KpiValue>
          </KpiCard>
          <KpiCard>
            <KpiTitle>팀 평균 참석율</KpiTitle>
            <KpiValue>{averageAttendanceRate}%</KpiValue>
          </KpiCard>
        </KpiGrid>

        <TopSection>
          <Card>
            <CardTitle>프로젝트 리스트</CardTitle>
            <List>
              {projects.map((project) => (
                <ListItem key={project.pid}>
                  <ItemText>{project.pname}</ItemText>
                  <SmallButton onClick={() => handleDeleteProject(project.pid)}>삭제</SmallButton>
                </ListItem>
              ))}
            </List>
            <AddButton onClick={openProjectModal}>프로젝트 추가하기</AddButton>
          </Card>
          <Card>
            <CardTitle>팀원 리스트</CardTitle>
            {teamMembers.length > 0 ? (
              <List>
                {/* teamMembers 배열을 순회하며 각 멤버의 상세 정보를 표시합니다. */}
                {teamMembers.map((member) => {
                  const attendanceRate = totalMeetings > 0 
                    ? Math.round((member.attend / totalMeetings) * 100) 
                    : 0;
                  const isAtRisk = member.score < 25; // "위험" 기준

                  return (
                    <ListItem key={member.uid} $isAtRisk={isAtRisk}>
                    <MemberInfoContainer>
                      <MemberUID>{member.uname}({member.uid})</MemberUID>
                      <MemberStats>
                        참여점수: {member.score} | 회의참석: {member.attend}회 ({attendanceRate}%) 
                      </MemberStats>
                    </MemberInfoContainer>
                    <SmallButton 
                      onClick={() => handleDeleteMember(member.uid)}
                      disabled={member.uid === currentUserEmail} 
                    >
                      삭제
                    </SmallButton>
                  </ListItem>
                  );
                })}
              </List>
            ) : (
              <EmptyListMessage>현재 팀에 팀원이 없습니다.</EmptyListMessage>
            )}
            <AddButton onClick={openModal}>팀원 추가하기</AddButton>
          </Card>
        </TopSection>

        <BottomSection>
          <SectionTitle>팀원 참여도</SectionTitle>
          <ChartsGrid>
            <ChartCard style={{ gridArea: 'score' }}> {/* 1. 팀원별 참여도 */}
              <CardTitle>팀원별 참여도</CardTitle>
              {/* 📈 4. 기존의 정적 바 그래프 UI를 동적 Chart.js 컴포넌트로 교체합니다. */}
              <BarChartContainer>
                {/* 로딩이 끝나고 팀원이 있을 때만 차트를 보여줍니다. */}
                {!loading && teamMembers.length > 0 ? (
                  <TeamBarChart members={teamMembers} />
                ) : (
                  <EmptyListMessage>{loading ? "데이터 로딩 중..." : "표시할 팀원이 없습니다."}</EmptyListMessage>
                )}
              </BarChartContainer>
            </ChartCard>

            <ChartCard style={{ gridArea: 'overall' }}> {/* 2. 팀원 전체 참여도 */}
              <CardTitle>팀원 전체 참여도</CardTitle>
              {/* 📈 4. 기존의 정적 도넛 UI를 동적 Chart.js 컴포넌트로 교체합니다. */}
              {!loading ? (
                <OverallScoreDonutChart averageScore={averageScore} status={teamStatus} />
              ) : (
                 <EmptyListMessage>데이터 로딩 중...</EmptyListMessage>
              )}
            </ChartCard>

            <ChartCard style={{ gridArea: 'attendance' }}> {/* 3. 회의 참석율 */}
              <CardTitle>회의 참석율 (횟수)</CardTitle>
              {/* 📈 4. 기존 SVG를 새로운 Bar Chart 컴포넌트로 교체 */}
              <BarChartContainer>
                 {!loading && teamMembers.length > 0 ? (
                  <AttendanceBarChart members={teamMembers} totalMeetings={totalMeetings} />
                ) : (
                  <EmptyListMessage>{loading ? "데이터 로딩 중..." : "표시할 팀원이 없습니다."}</EmptyListMessage>
                )}
              </BarChartContainer>
            </ChartCard>
          </ChartsGrid>
        </BottomSection>
      </MainContent>

      {/* --- 모달 UI 렌더링 --- */}
      {isModalOpen && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>팀원 초대</ModalTitle>
            <InputRow>
              <ModalInput
                type="email"
                placeholder="초대할 팀원의 이메일 입력"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                disabled={isAddingMember}
              />
              <ModalAddButton onClick={handleAddMember} disabled={!memberEmail.trim() || isAddingMember}>
                {isAddingMember ? "추가 중..." : "추가"}
              </ModalAddButton>
            </InputRow>
            <List>
              {newlyInvitedMembers.map((member) => (
                <ListItem key={member.mid}>
                  <span>{member.email}</span>
                  <ModalDeleteButton onClick={() => handleDeleteInvitation(member.mid)} disabled={isAddingMember}>
                    ×
                  </ModalDeleteButton>
                </ListItem>
              ))}
            </List>
            <ModalButtonRow>
                <ModalMainButton onClick={closeModal}>완료</ModalMainButton>
            </ModalButtonRow>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* --- 프로젝트 추가 모달 UI --- */}
      {isProjectModalOpen && (
        <ModalOverlay onClick={closeProjectModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>새 프로젝트 추가</ModalTitle>
            <InputRow>
              <ModalInput
                type="text"
                placeholder="새 프로젝트 이름 입력"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                disabled={isAddingProject}
              />
            </InputRow>
            <ModalButtonRow>
                <ModalMainButton onClick={handleAddProject} disabled={!newProjectName.trim() || isAddingProject}>
                  {isAddingProject ? "추가 중..." : "추가하기"}
                </ModalMainButton>
                <ModalCancelButton onClick={closeProjectModal}>취소</ModalCancelButton>
            </ModalButtonRow>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};
export default Leader;

// 팀원 정보를 담기 위한 컨테이너 추가
const MemberInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

// 팀원 이메일(uid) 스타일
const MemberUID = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: ${COLOR.text};
`;

// 팀원의 추가 정보(점수, 참석률 등) 스타일
const MemberStats = styled.span`
  font-size: 0.85rem;
  font-weight: 400;
  color: ${COLOR.subText};
`;

const Container = styled.div`
  font-family: "Pretendard", Arial, sans-serif;
  background-color: ${COLOR.bg};
  color: ${COLOR.text};
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin-bottom: 2.5rem;
  padding: 1rem 0;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${COLOR.text};
`;

const DeleteTeamLink = styled.a`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${GRAPH_COLOR.danger};
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  
  &:hover {
    text-decoration: underline;
  }
`;

const TopSection = styled.section`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${COLOR.card};
  border-radius: 16px;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 12px ${COLOR.imgShadow};
  border: 1px solid ${COLOR.border};
  display: flex;
  flex-direction: column;
`;

const KpiGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const KpiCard = styled(Card)`
  padding: 1.5rem;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.5rem;
`;

const KpiTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${COLOR.subText};
  margin: 0;
`;

const KpiValue = styled.p`
  font-size: 2.25rem;
  font-weight: 700;
  color: ${COLOR.text};
  margin: 0;
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${COLOR.text};
  margin-bottom: 1.5rem;
  text-align: center;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  flex-grow: 1;
`;

const ListItem = styled.li<{ $isAtRisk?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  padding: 0.8rem 1rem;
  margin-bottom: 0.8rem;
  transition: all 0.2s ease;

  border: 2px solid ${props => props.$isAtRisk ? GRAPH_COLOR.danger : 'transparent'};
  background-color: ${props => props.$isAtRisk ? '#fceeee' : COLOR.imgBg};
`;

const ItemText = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: ${COLOR.text};
`;

const SmallButton = styled.button`
  background: ${COLOR.card};
  color: ${COLOR.subText};
  border: 1px solid ${COLOR.border};
  border-radius: 6px;
  padding: 0.3rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${GRAPH_COLOR.danger};
    color: white;
    border-color: ${GRAPH_COLOR.danger};
  }

  &:disabled {
    background: ${COLOR.imgBg};
    color: ${COLOR.subText};
    border-color: ${COLOR.border};
    cursor: not-allowed;
    
    /* 비활성화 시 호버 효과 제거 */
    &:hover {
      background: ${COLOR.imgBg};
      color: ${COLOR.subText};
      border-color: ${COLOR.border};
    }
`;

const AddButton = styled.button`
  background: ${COLOR.card};
  color: ${COLOR.accentDark};
  border: 2px solid ${COLOR.border};
  border-radius: 8px;
  padding: 0.8rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s;

  &:hover {
    background: ${COLOR.accent};
    color: ${COLOR.card};
    border-color: ${COLOR.accent};
  }
`;

const BottomSection = styled.section`
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: ${COLOR.text};
  margin-bottom: 2rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  gap: 2rem;

  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto;
  grid-template-areas:
    "score overall"
    "attendance attendance";

  @media (max-width: 900px) { /* 👈 모바일에서는 1열로 스택 */
    grid-template-columns: 1fr;
    grid-template-areas:
      "score"
      "overall"
      "attendance";
  }
`;

const ChartCard = styled(Card)`
  align-items: center;
  min-height: 300px;
`;

const BarChartContainer = styled.div`
  /* 📈 BarChartContainer는 차트의 크기를 조절하는 래퍼 역할을 합니다. */
  position: relative;
  width: 100%;
  height: 280px; /* 차트의 높이를 지정 */
`;

const DonutChartContainer = styled.div`
    position: relative;
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2rem;
`;

const DonutText = styled.div`
    position: absolute;
    text-align: center;
    display: flex;
    flex-direction: column;

    strong {
        font-size: 2rem;
        font-weight: 700;
        color: ${COLOR.text};
    }
    span {
        font-size: 1rem;
        font-weight: 500;
        color: ${COLOR.subText};
    }
`;

const EmptyListMessage = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COLOR.subText};
  font-size: 1rem;
  padding: 2rem 0;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${COLOR.card};
  border-radius: 18px;
  padding: 2rem;
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;

const ModalTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${COLOR.text};
  margin-bottom: 1.5rem;
  text-align: center;
`;

const InputRow = styled.div`
  width: 100%;
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
  align-items: center;
`;

const ModalInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1.5px solid ${COLOR.border};
  background: #fff;
  font-size: 16px;
  color: ${COLOR.text};
  outline: none;
  transition: border 0.18s;
  &:focus {
    border: 1.5px solid ${COLOR.accent};
  }
`;

const ModalAddButton = styled.button`
  background: ${COLOR.accent};
  color: ${COLOR.card};
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  height: 51px;
  padding: 0 24px;
  white-space: nowrap;
  transition: background 0.18s;

  &:hover {
    background: ${COLOR.accentDark};
  }
  &:disabled {
    background: ${COLOR.imgBg};
    color: ${COLOR.subText};
    cursor: not-allowed;
  }
`;

const ModalButtonRow = styled.div`
  display: flex;
  justify-content: center; 
  margin-top: 1.5rem;
`;

const ModalMainButton = styled.button`
  background: ${COLOR.accent};
  color: ${COLOR.card};
  border: none;
  border-radius: 8px;
  padding: 12px 28px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: ${COLOR.accentDark};
  }
`;

const ModalCancelButton = styled(ModalMainButton)`
  background: ${COLOR.imgBg};
  color: ${COLOR.accentDark};
  &:hover {
    background: ${COLOR.border};
    color: ${COLOR.text};
  }
`;

const ModalDeleteButton = styled.button`
  background: none;
  border: none;
  color: ${GRAPH_COLOR.danger};
  font-size: 1.3rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  &:hover {
    background: #fbe9e9;
  }
  &:disabled {
    color: #ccc;
    cursor: not-allowed;
    background: none;
  }
`;