import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import './css/memberList.css';
import Header from '../header';
import api from '../api';

// upassword가 null일 수 있음을 타입에 명시
interface MemberInfo {
  uid: string;
  uname: string;
  upassword: string | null; 
}

interface NewUserInfo {
  uid: string;
  upassword: string;
  uname: string;
  role: string;
}

const MemberList = () => {
  const [memberList, setMemberList] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [newUser, setNewUser] = useState<NewUserInfo>({
    uid: '',
    upassword: '',
    uname: '',
    role: 'user', // 역할 기본값 설정
  });

  // 수정할 회원 정보를 담는 state
  const [editingMember, setEditingMember] = useState<MemberInfo | null>(null);
  const [editedUname, setEditedUname] = useState('');
  const [editedUpassword, setEditedUpassword] = useState(''); // 새 비밀번호 입력용

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await api.post<MemberInfo[]>('/spring/api/admin/user');
      setMemberList(response.data);
    } catch (error) {
      console.error("회원 목록을 가져오는 중 오류 발생:", error);

      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "회원 목록 로딩에 실패했습니다.");
      } else {
        alert('회원 목록을 가져오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 서버에서 데이터를 가져오는 useEffect
  useEffect(() => {
    fetchMembers();
  }, []); // 처음 마운트될 때만 호출

  // 모달 입력 값 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  // 모달 닫기 함수
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    // 모달을 닫을 때 입력 필드를 초기화합니다.
    setNewUser({ uid: '', upassword: '', uname: '', role: 'user' });
  };

  // 새 회원 추가 함수
  const handleAddUser = async () => {
    // 간단한 유효성 검사
    if (!newUser.uid || !newUser.upassword || !newUser.uname || !newUser.role) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      await api.post('/spring/api/admin/user/new', newUser);

      await fetchMembers(); 

      alert('새로운 회원이 추가되었습니다.');
      handleCloseAddModal();

    } catch (error) {
      console.error('회원 추가 중 오류 발생:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "회원 추가에 실패했습니다.");
      } else {
        alert('회원 추가 중 오류가 발생했습니다.');
      }
    }
  };

  // 수정 모달 열기
  const handleOpenEditModal = (member: MemberInfo) => {
    setEditingMember(member);
    setEditedUname(member.uname);
    // ✨ 실제 비밀번호 값으로 초기 설정 (null일 경우 빈 문자열로)
    setEditedUpassword(member.upassword ?? ''); 
    setIsEditModalOpen(true);
  };

  // 수정 모달 닫기
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMember(null);
  };

  // 수정 내용 저장
  const handleUpdateUser = async () => {
    if (!editingMember) return;

    // 서버에 보낼 데이터 구성
    const payload = {
      uid: editingMember.uid,
      uname: editedUname,
      // 비밀번호 입력창이 비어있으면 null, 아니면 입력된 값을 전송
      upassword: editedUpassword === '' ? null : editedUpassword,
    };

    try {
      await api.post('/spring/api/users/update', payload);

      await fetchMembers();

      alert('회원 정보가 수정되었습니다.');
      handleCloseEditModal();

    } catch (error) {
      console.error('회원 정보 수정 중 오류 발생:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "회원 정보 수정에 실패했습니다.");
      } else {
        alert('회원 정보 수정 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDeleteUser = async (member: MemberInfo) => {
    if (!window.confirm(`'${member.uname}'(${member.uid}) 회원을 정말로 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await api.post('/spring/api/admin/user/delete', { uid: member.uid });

      setMemberList(prevList => prevList.filter(m => m.uid !== member.uid));
      alert('회원이 삭제되었습니다.');

    } catch (error) {
      console.error('회원 삭제 중 오류 발생:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "회원 삭제에 실패했습니다.");
      } else {
        alert('회원 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 로딩 UI
  if (loading) {
    return (
      <div className="admin-container">
        <Header />
        <div className="member-page">
          <h1 className="main-title">회원 목록을 불러오는 중입니다...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <Header />
      <div className="member-page">
        <div className="list-container">
          <ListHeaderContainer>
            <h2 className="list-title">회원 리스트</h2>
            <AddButton onClick={() => setIsAddModalOpen(true)}>+ 회원 추가</AddButton>
          </ListHeaderContainer>

          <div className="member-list-header">
            <div>회원 아이디</div>
            <div>회원 이름</div>
            <div>비밀번호</div>
            <div></div>
          </div>

          <div className="list-body">
            {memberList.map((member) => {
              const passLength = member.upassword?.length;
              const passwordMask = '•'.repeat(passLength && passLength > 0 ? passLength : 8);

              return (
                <div key={member.uid} className="member-list-row">
                  <div>{member.uid}</div>
                  <div>{member.uname}</div>
                  <div>{passwordMask}</div>
                  <ActionLinksContainer>
                    {/* --- 4. 수정/삭제 링크 분리 및 핸들러 연결 --- */}
                    <ActionLink onClick={() => handleOpenEditModal(member)}>수정</ActionLink>
                    <ActionLink onClick={() => handleDeleteUser(member)}>삭제</ActionLink>
                  </ActionLinksContainer>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* --- 4. 회원 추가 모달 UI 렌더링 --- */}
      {isAddModalOpen && (
        <ModalBackdrop onClick={handleCloseAddModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>신규 회원 추가</h2>
              <CloseButton onClick={handleCloseAddModal}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
              <InputGroup>
                <label>아이디 (uid)</label>
                <input name="uid" value={newUser.uid} onChange={handleInputChange} />
              </InputGroup>
              <InputGroup>
                <label>비밀번호 (upassword)</label>
                <input name="upassword" type="password" value={newUser.upassword} onChange={handleInputChange} />
              </InputGroup>
              <InputGroup>
                <label>이름 (uname)</label>
                <input name="uname" value={newUser.uname} onChange={handleInputChange} />
              </InputGroup>
              <InputGroup>
                <label>역할 (role)</label>
                <input name="role" value={newUser.role} onChange={handleInputChange} />
              </InputGroup>
            </ModalBody>
            <ModalFooter>
              <ModalButton onClick={handleCloseAddModal}>취소</ModalButton>
              <ModalButton primary onClick={handleAddUser}>추가</ModalButton>
            </ModalFooter>
          </ModalContent>
        </ModalBackdrop>
        
      )}
      {/* --- 5. 회원 수정 모달 UI 렌더링 추가 --- */}
      {isEditModalOpen && editingMember && (
        <ModalBackdrop onClick={handleCloseEditModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>회원 정보 수정</h2>
              <CloseButton onClick={handleCloseEditModal}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
              <InputGroup>
                <label>아이디 (uid)</label>
                <input value={editingMember.uid} disabled />
              </InputGroup>
              <InputGroup>
                <label>이름 (uname)</label>
                <input value={editedUname} onChange={(e) => setEditedUname(e.target.value)} />
              </InputGroup>
              <InputGroup>
                <label>새 비밀번호 (upassword)</label>
                <input 
                  type="text" 
                  value={editedUpassword} 
                  onChange={(e) => setEditedUpassword(e.target.value)}
                  placeholder="변경할 경우에만 입력하세요"
                />
              </InputGroup>
            </ModalBody>
            <ModalFooter>
              <ModalButton onClick={handleCloseEditModal}>취소</ModalButton>
              <ModalButton primary onClick={handleUpdateUser}>저장</ModalButton>
            </ModalFooter>
          </ModalContent>
        </ModalBackdrop>
      )}
    </div>
  );
};

export default MemberList;

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

const ListHeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const AddButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background-color: ${COLOR.accent};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: ${COLOR.accentDark};
  }
`;

const ActionLinksContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 15px;
`;

const ActionLink = styled.span`
  color: var(--action-color);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;