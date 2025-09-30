import React, { useState } from "react";
import styled from "styled-components";
import Header from "./header";
import { useNavigate } from "react-router-dom";

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

const API_URL = process.env.REACT_APP_API_URL;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InvitedMember {
  email: string;
  mid: number;
}

const Create: React.FC = () => {
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [teamName, setTeamName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [tid, setTid] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTeamName(e.target.value);

  const handleMemberEmailChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setMemberEmail(e.target.value);

  // 팀 생성(POST /create)
  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      alert("팀 이름을 입력해 주세요.");
      return;
    }

    const creatorEmail = localStorage.getItem("userEmail");

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/spring/api/teams/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tname: teamName,
          uid: creatorEmail
        })
      });

      const text = await response.text();      // 응답을 문자열로 받음
      const tid = parseInt(text, 10);         // 문자열을 int로 변환

      if (!isNaN(tid) && tid > 0) {
        alert(`팀 "${teamName}" 생성 성공! (팀 ID: ${tid})`);
        setTid(tid); // tid 저장
        setModalStep(2); // 팀원 추가 모달로 이동
      } else {
        alert("팀 생성에 실패했습니다.");
      }
    } catch (error) {
      alert("서버와의 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 팀원 추가(POST /message)
  const handleEmailConfirm = async () => {
    const currentUserEmail = localStorage.getItem("userEmail");
    if (memberEmail === currentUserEmail) {
      alert("본인은 팀원으로 초대할 수 없습니다!");
      return;
    }

    if (!EMAIL_REGEX.test(memberEmail)) {
      alert("이메일 형식을 지켜주세요!");
      return;
    }
    if (invitedMembers.length >= 3) {
      alert("팀원은 최대 3명까지 추가할 수 있습니다.");
      return;
    }
    if (tid === null) {
      alert("팀 ID가 없습니다. 먼저 팀을 생성해 주세요.");
      return;
    }
    
    const senderEmail = localStorage.getItem("userEmail");
    if (!senderEmail) {
      alert("로그인 정보가 없습니다. 다시 로그인해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/spring/api/teams/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tid: tid,
          uid: memberEmail,
          senduid: senderEmail
        })
      });

      const text = await response.text();
      const mid = parseInt(text, 10);

      if (!isNaN(mid) && mid !== 0) {
        alert("팀원 요청 성공!");
        // invitedMembers 상태에 새 팀원 정보(email과 mid)를 추가합니다.
        setInvitedMembers([...invitedMembers, { email: memberEmail, mid: mid }]);
        setMemberEmail("");
      } else {
        alert("팀원 요청에 실패했습니다.");
      }
    } catch (error) {
      alert("서버와의 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 팀원 삭제(POST /message/delete)
  const handleDeleteEmail = async (emailToDelete: string) => {
    if (tid === null) {
      alert("팀 ID가 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/spring/api/teams/message/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tid: tid,
          uid: emailToDelete
        })
      });
      setInvitedMembers(invitedMembers.filter((member) => member.email !== emailToDelete));
      alert("팀원 요청이 취소되었습니다!");
    } catch (error) {
      alert("서버와의 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    navigate("/");
  };

  return (
    <Container>
      <Header />
      <Main>
        <Card>
          <Title>새 프로젝트(팀) 만들기</Title>
          <SubTitle>
            팀 이름을 정하고, 함께할 팀원을 초대하세요.<br />
            BlankSync에서 실시간 협업을 시작해보세요!
          </SubTitle>
          {modalStep === 1 ? (
            <>
              <Label>팀 이름</Label>
              <InputWrapper>
                <Input
                  type="text"
                  placeholder="예) 마케팅팀"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  maxLength={20}
                />
              </InputWrapper>
              <MainButton
                onClick={handleCreateTeam}
                disabled={!teamName.trim() || loading}
              >
                {loading ? "생성 중..." : "팀 생성"}
              </MainButton>
            </>
          ) : (
            <>
              <Label>팀원 초대 (최대 3명)</Label>
              <InputRow>
                <Input
                  type="email"
                  placeholder="이메일 입력"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  disabled={invitedMembers.length >= 3 || loading}
                />
                <AddButton
                  onClick={handleEmailConfirm}
                  disabled={
                    !memberEmail.trim() ||
                    invitedMembers.length >= 3 ||
                    loading
                  }
                >
                  {loading ? "추가 중..." : "추가"}
                </AddButton>
              </InputRow>
              <EmailList>
                {invitedMembers.map((member) => (
                  <EmailItem key={member.mid}>
                    <span>{member.email}</span>
                    <DeleteButton
                      onClick={() => handleDeleteEmail(member.email)}
                      disabled={loading}
                      title="팀원 삭제"
                    >
                      ×
                    </DeleteButton>
                  </EmailItem>
                ))}
              </EmailList>
              {invitedMembers.length >= 3 && (
                <MaxNotice>팀원은 최대 3명까지 추가할 수 있습니다.</MaxNotice>
              )}
              <ButtonRow>
                <MainButton
                  onClick={() => navigate("/team")}
                  disabled={invitedMembers.length === 0}
                >
                  완료
                </MainButton>
                <CancelButton onClick={handleCloseModal}>취소</CancelButton>
              </ButtonRow>
            </>
          )}
        </Card>
      </Main>
    </Container>
  );
};

export default Create;

const Container = styled.div`
  min-height: 100vh;
  background: ${COLOR.bg};
  color: ${COLOR.text};
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0 0 0;
`;

const Card = styled.div`
  background: ${COLOR.card};
  border-radius: 18px;
  box-shadow: 0 6px 32px ${COLOR.imgShadow};
  padding: 44px 36px 36px 36px;
  min-width: 340px;
  max-width: 420px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1.5px solid ${COLOR.border};
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: 800;
  color: ${COLOR.text};
  margin-bottom: 7px;
  text-align: center;
`;

const SubTitle = styled.p`
  font-size: 15px;
  color: ${COLOR.subText};
  margin-bottom: 22px;
  text-align: center;
`;

const Label = styled.label`
  font-size: 15px;
  color: ${COLOR.text};
  font-weight: 600;
  margin-bottom: 7px;
  align-self: flex-start;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1.5px solid ${COLOR.border};
  background: #fff;
  font-size: 16px;
  color: ${COLOR.text};
  outline: none;
  margin-bottom: 0;  // 기본값 0으로!
  transition: border 0.18s;
  &:focus {
    border: 1.5px solid ${COLOR.accent};
  }
`;

const InputRow = styled.div`
  width: 100%;
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  align-items: center;
`;

const InputWrapper = styled.div`
  width: 100%;
  margin-bottom: 18px;  // 팀 이름 입력란과 버튼 사이에만 적용
`;

const AddButton = styled.button`
  background: ${COLOR.accent};
  color: ${COLOR.text};
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  height: 48px;
  padding: 0 24px; /* 세로 padding은 0, 좌우만 넉넉하게 */
  min-width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  white-space: nowrap; /* 줄바꿈 방지 */

  &:hover {
    background: ${COLOR.accentDark};
    color: ${COLOR.card};
  }
  &:disabled {
    background: ${COLOR.imgBg};
    color: ${COLOR.subText};
    cursor: not-allowed;
  }
`;

const EmailList = styled.ul`
  list-style-type: none;
  width: 100%;
  padding: 0;
  margin: 0 0 12px 0;
`;

const EmailItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${COLOR.imgBg};
  border-radius: 8px;
  padding: 8px 14px;
  margin-bottom: 8px;
  font-size: 15px;
  color: ${COLOR.text};
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #e53e3e;
  font-size: 1.3rem;
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

const MaxNotice = styled.div`
  color: #ef4444;
  margin-top: 8px;
  font-size: 0.95rem;
  text-align: center;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
`;

const MainButton = styled.button`
  background: ${COLOR.accent};
  color: ${COLOR.text};
  border: none;
  border-radius: 8px;
  padding: 13px 32px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 12px ${COLOR.imgShadow};
  transition: background 0.2s, color 0.2s;
  &:hover {
    background: ${COLOR.accentDark};
    color: ${COLOR.card};
  }
  &:disabled {
    background: ${COLOR.imgBg};
    color: ${COLOR.subText};
    cursor: not-allowed;
  }
`;

const CancelButton = styled(MainButton)`
  background: ${COLOR.imgBg};
  color: ${COLOR.accentDark};
  box-shadow: none;
  &:hover {
    background: ${COLOR.border};
    color: ${COLOR.text};
  }
`;
