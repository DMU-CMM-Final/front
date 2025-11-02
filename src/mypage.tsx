import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Header from "./header";
import api from "./api";

type UserData = {
  uid: string;
  uname: string;
  upassword: string;
};

const Mypage: React.FC = () => {

  // 상태 관리
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 상태

  const [isEditing, setIsEditing] = useState<boolean>(false); // 수정 모드 여부
  const [editedData, setEditedData] = useState<UserData | null>(null); // 수정 중인 데이터

  useEffect(() => {
    // 페이지가 처음 렌더링될 때 사용자 정보를 가져오는 함수
    const fetchMyPageData = async () => {
      // 1. 로컬 스토리지에서 사용자 식별자(이메일) 가져오기
      const userEmail = localStorage.getItem("userEmail");

      if (!userEmail) {
        setError("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      try {
        // 2. 백엔드 API로 POST 요청 보내기
        const response = await api.post<UserData>('/spring/api/users/mypage', { 
          uid: userEmail 
        });

        setUserData(response.data);
      } catch (err: any) {
        if (err && typeof err === 'object' && 'response' in err) {
          const responseData = (err as any).response?.data;
          setError(responseData?.message || "마이페이지 정보를 불러오는 데 실패했습니다.");
        } else {
          setError(err.message); 
        }
      } finally {
        setLoading(false); // 5. 로딩 종료
      }
    };

    fetchMyPageData();
  }, []); // 의존성 배열을 빈 배열로 설정하여 컴포넌트 마운트 시 한 번만 실행

  // '수정' 버튼 클릭 시
  const handleEditClick = () => {
    setEditedData(userData); // 현재 유저 정보를 수정용 상태에 복사
    setIsEditing(true); // 수정 모드로 전환
  };

  // '취소' 버튼 클릭 시
  const handleCancelClick = () => {
    setIsEditing(false); // 수정 모드 취소
    setEditedData(null);
  };

  // input 값 변경 시
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editedData) {
      setEditedData({ ...editedData, [name]: value });
    }
  };

  // '수정하기' 버튼 클릭 시 (API 호출)
  const handleSaveClick = async () => {
    if (!editedData) return;

    try {
      await api.post('/spring/api/users/update', editedData);

      // 성공 시
      setUserData(editedData); 
      setIsEditing(false); 
      alert("성공적으로 수정되었습니다.");

    } catch (err: any) {
      if (err && typeof err === 'object' && 'response' in err) {
        const responseData = (err as any).response?.data;
        alert(responseData?.message || "정보 업데이트에 실패했습니다.");
      } else {
        alert(err.message);
      }
    }
  };

  // UI 렌더링 함수
  const renderContent = () => {
    if (loading) {
      return <StatusText>로딩 중...</StatusText>;
    }
    if (error) {
      return <StatusText>{error}</StatusText>;
    }
    if (userData) {
      return (
        <UserInfoBox>
          <Title>내 정보</Title>
          <InfoItem>
            <Label>아이디:</Label>
            {isEditing && editedData ? (
              <StyledInput
                type="text"
                name="uid"
                value={editedData.uid}
                onChange={handleInputChange}
              />
            ) : (
              <Value>{userData.uid}</Value>
            )}
          </InfoItem>
          <InfoItem>
            <Label>이름:</Label>
            <Value>{userData.uname}</Value> 
          </InfoItem>
          <InfoItem>
            <Label>비밀번호:</Label>
            {isEditing && editedData ? (
              <StyledInput
                type="password"
                name="upassword"
                value={editedData.upassword}
                onChange={handleInputChange}
              />
            ) : (
              <Value>{"*".repeat(userData.upassword.length)}</Value>
            )}
          </InfoItem>
          
          {/* 수정 모드에 따라 다른 버튼 그룹 표시 */}
          <ButtonGroup>
            {isEditing ? (
              <>
                <Button onClick={handleSaveClick} primary>수정하기</Button>
                <Button onClick={handleCancelClick}>취소</Button>
              </>
            ) : (
              <Button onClick={handleEditClick}>수정</Button>
            )}
          </ButtonGroup>
        </UserInfoBox>
      );
    }
    return null;
  };

  return (
    <Container>
      <Header />
      <Content>{renderContent()}</Content>
    </Container>
  );
};

export default Mypage;

const Container = styled.div`
  font-family: "Pretendard", Arial, sans-serif;
  background-color: #f6f0ff;
  color: #333;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
`;

const UserInfoBox = styled.div`
  background-color: white;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 500px;
`;

const Title = styled.h2`
  font-size: 1.8rem;
  font-weight: 700;
  color: #545159;
  text-align: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e3dcf2;
  padding-bottom: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  margin-bottom: 1.2rem;
`;

const Label = styled.span`
  font-weight: 600;
  color: #888;
  width: 100px;
  flex-shrink: 0;
`;

const Value = styled.span`
  font-weight: 500;
  color: #3b3740;
`;

const StatusText = styled.p`
  font-size: 1.2rem;
  color: #a19fa6;
`;

const StyledInput = styled.input`
  font-size: 1.1rem;
  font-weight: 500;
  color: #3b3740;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  width: 100%;
  font-family: "Pretendard", Arial, sans-serif;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 2rem;
  border-top: 2px solid #e3dcf2;
  padding-top: 1.5rem;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background-color: ${props => props.primary ? '#B8B6F2' : '#f0f0f0'};
  color: ${props => props.primary ? 'white' : '#555'};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.primary ? '#545159' : '#e0e0e0'};
  }
`;
