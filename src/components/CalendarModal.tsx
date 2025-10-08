import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import Calendar from 'react-calendar';
import Holidays from 'date-holidays';
import { useAuth } from '../contexts/AuthContext';

// --- 타입 정의 ---
// 컴포넌트에서 사용하는 이벤트 타입. startDate와 endDate를 Date 객체로 정의합니다.
interface CalendarEvent {
  eventId: number;
  tId: number | null;
  tname?: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}

const API_URL = process.env.REACT_APP_API_URL;


// --- 스타일 정의 ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1100;
`;
const ModalContent = styled.div`
  background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex; flex-direction: row; align-items: flex-start;
`;
const CalendarContainer = styled.div`
  display: flex; flex-direction: column; align-items: center;
`;
const RightPanelContainer = styled.div`
  width: 320px;
  margin-left: 24px;
  padding-left: 24px;
  border-left: 1px solid #e0e0e0;
  min-height: 520px; /* 캘린더 높이와 유사하게 최소 높이 설정 */
  display: flex;
  flex-direction: column;
  position: relative;
`;
const EventDetailCard = styled.div`
  margin-bottom: 15px; padding: 10px; border-radius: 8px; background-color: #f9f9f9; border: 1px solid #eee;
  h4 { margin-top: 0; margin-bottom: 8px; font-size: 1.1rem; }
  p { margin: 4px 0; font-size: 0.9rem; color: #555; white-space: pre-wrap; }
`;
const DetailsHeader = styled.h3`
  font-size: 1.3rem; margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid #eee;
`;
const CalendarWrapper = styled.div`
  .react-calendar { width: 600px; border: none; font-size: 1.3rem; }
  .react-calendar__navigation__label { font-size: 1.8rem; font-weight: bold; }
  .react-calendar__month-view__weekdays__weekday abbr { font-size: 1.2rem; text-decoration: none; font-weight: 600; }
  .react-calendar__tile { height: 70px; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; padding: 4px; overflow-y: hidden; }
  .react-calendar__tile--now { background: #f0f0f0; font-weight: bold; border-radius: 8px; }
  .react-calendar__tile--now:enabled:hover,
  .react-calendar__tile--now:enabled:focus {
    background: #f0f0f0;
  }
  button.react-calendar__tile--active,
  button.react-calendar__tile--active:enabled:hover,
  button.react-calendar__tile--active:enabled:focus {
    background: none; /* 배경색 제거 */
    color: #000;
    border: 2px solid #B8B6F2; /* 테두리로 선택되었음을 표시 */
    border-radius: 8px;
  }
  .saturday { color: #007bff; }
  .holiday abbr { color: #d93b3b; }
`;
const ButtonContainer = styled.div`
  display: flex; justify-content: center; gap: 10px; width: 100%; margin-top: 20px;
`;
const ActionButton = styled.button`
  padding: 8px 16px; border-radius: 5px; border: 1px solid #B8B6F2; background-color: #B8B6F2;
  color: white; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;
  &:hover { background-color: #a09ee0; }
`;
const CloseButton = styled.button`
  padding: 8px 16px; border-radius: 5px; border: 1px solid #ccc; background-color: #f0f0f0;
  cursor: pointer; transition: background-color 0.2s ease;
  &:hover { background-color: #e0e0e0; }
`;
const EventHighlighter = styled.div<{ color: string; opacity: number }>`
  background-color: ${(props) => `rgba(${parseInt(props.color.slice(1, 3), 16)}, ${parseInt(props.color.slice(3, 5), 16)}, ${parseInt(props.color.slice(5, 7), 16)}, ${props.opacity})`};
  color: #111; padding: 0 4px; margin-bottom: 2px; border-radius: 3px; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;
`;

const HolidayName = styled.div`
  color: #d93b3b;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const Form = styled.form` display: flex; flex-direction: column; gap: 15px; `;
const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 5px;
  label { font-size: 0.9rem; font-weight: bold; }
  input, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
`;
const FormRow = styled.div` display: flex; align-items: center; justify-content: space-between; `;
const SwitchLabel = styled.label`
  position: relative; display: inline-block; width: 44px; height: 24px;
  input { opacity: 0; width: 0; height: 0; }
`;
const SwitchSlider = styled.span`
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;
  &:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
`;
const SwitchInput = styled.input`
  &:checked + ${SwitchSlider} { background-color: #B8B6F2; }
  &:checked + ${SwitchSlider}:before { transform: translateX(20px); }
`;
const DetailButtonContainer = styled.div`
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;
`;
const DetailButton = styled.button`
  padding: 4px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid #ccc;
  background-color: #fff; cursor: pointer; &:hover { background-color: #f0f0f0; }
`;
const EmptyPanel = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; color: #888; text-align: center;
`;
const AddEventButton = styled(ActionButton)`
  margin-top: 16px;
`;

const SearchIcon = styled.div`
  position: absolute; 
  top: 0px; /* 수정된 부분: 패널의 최상단에 맞춤 */
  right: 0px; /* 수정된 부분: 패널의 우측 끝에 맞춤 */
  font-size: 1.5rem; 
  cursor: pointer;
  padding: 5px; 
  line-height: 1; 
  &:hover { opacity: 0.7; }
  z-index: 10; /* 다른 요소 위에 표시되도록 z-index 추가 */
`;
const SearchContainer = styled.div`
  padding: 10px; border-bottom: 1px solid #eee;
`;
const SearchInput = styled.input`
  width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc;
  box-sizing: border-box;
`;
const TeamListContainer = styled.div`
  max-height: 150px; overflow-y: auto; padding: 5px 0;
`;
const TeamButton = styled.button`
  width: 100%; text-align: left; padding: 8px 12px;
  border: none; background-color: transparent; cursor: pointer;
  border-radius: 4px;
  &:hover { background-color: #f0f0f0; }
`;
const FilterInfoContainer = styled.div`
  padding: 10px; background-color: #f0f8ff; border-radius: 5px;
  margin-bottom: 15px; font-size: 0.9rem;
  display: flex; justify-content: space-between; align-items: center;
`;
const ClearFilterButton = styled.button`
  background: none; border: none; color: #007bff; cursor: pointer;
  text-decoration: underline; font-size: 0.9rem;
`;

// --- 헬퍼 함수 ---
interface Props { isOpen: boolean; onClose: () => void; }

const toDateTimeLocalString = (date: Date) => {
  const ten = (i: number) => (i < 10 ? '0' : '') + i;
  return `${date.getFullYear()}-${ten(date.getMonth() + 1)}-${ten(date.getDate())}T${ten(date.getHours())}:${ten(date.getMinutes())}`;
};
const toDateInputString = (date: Date) => toDateTimeLocalString(date).slice(0, 10);

// 서버 전송용 날짜 포맷 함수
const formatDateTimeForServer = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// HSL 색상 값을 HEX 값으로 변환하는 헬퍼 함수
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

// tId를 기반으로 시각적으로 구분되는 고유 색상을 생성하는 함수 (개선된 버전)
const generateDeterministicColor = (id: number): string => {
  // 소수(prime number)를 곱하여 hue 값을 더 넓게 분포시켜 색상 중복 가능성을 줄입니다.
  const hue = (id * 37) % 360;
  // 채도와 명도를 적절한 값으로 고정하여 보기 좋은 색상을 유지합니다.
  const saturation = 70;
  const lightness = 65;
  return hslToHex(hue, saturation, lightness);
};

const hd = new Holidays('KR');

const CalendarModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userEmail } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeDate, setActiveDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [isSearching, setIsSearching] = useState(false); // 검색창 표시 여부
  const [searchTerm, setSearchTerm] = useState(''); // 검색어
  const [activeFilterTName, setActiveFilterTName] = useState<string | null>(null); // 현재 적용된 팀 필터 이름

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000), isAllDay: false
  });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        // 컴포넌트가 언마운트되거나 모달이 닫힐 때 원래 상태로 복원
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]); // isOpen 상태가 바뀔 때마다 실행

  const getColorForTId = useCallback((tId: number | null): string => {
    if (!tId) {
      return '#B8B6F2';
    }
    return generateDeterministicColor(tId);
  }, []);

  const fetchEvents = useCallback(async (date: Date) => {
    if (!userEmail) return;
    setLoading(true);

    const dateParam = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const url = `${API_URL}/spring/calendar?uId=${encodeURIComponent(userEmail)}&date=${encodeURIComponent(dateParam)}`;
    try {
      const response = await fetch(url);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: any[] = await response.json();

      console.log("Fetched raw calendar data from API:", data);

      const processedEvents: CalendarEvent[] = data.map((event: any) => ({
        ...event,
        tId: event.tid, // 소문자 tid를 카멜케이스 tId에 할당
        tname: event.tname,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
      setEvents(processedEvents);

    } catch (error) { console.error("캘린더 데이터를 가져오는 데 실패했습니다:", error); }
    finally { setLoading(false); }

  }, [userEmail]);

  useEffect(() => {
    if (isOpen) { fetchEvents(activeDate); }
    else {
      setSelectedDate(null);
      setIsAddingEvent(false);
      setEditingEvent(null);
      setIsSearching(false);
      setSearchTerm('');
      setActiveFilterTName(null);
    }
  }, [isOpen, activeDate, fetchEvents]);

  const handleShowAddForm = () => {
    setIsAddingEvent(true);
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    const currentTime = new Date();
    baseDate.setHours(currentTime.getHours(), currentTime.getMinutes());

    setNewEvent({
        title: '',
        description: '',
        startDate: baseDate,
        endDate: new Date(baseDate.getTime() + 60 * 60 * 1000), // 시작 시간으로부터 1시간 뒤
        isAllDay: false,
    });
  };

  const handleNewEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';

    setNewEvent(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (name === 'startDate' || name === 'endDate' ? new Date(value) : value)
    }));
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) { alert("제목을 입력해주세요."); return; }

    let finalStartDate: string;
    let finalEndDate: string;

    if (newEvent.isAllDay) {
        // '하루 종일'이 true이면 시간은 00:00:00 ~ 23:59:59로 설정
        const startOfDay = new Date(newEvent.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        finalStartDate = formatDateTimeForServer(startOfDay);

        const endOfDay = new Date(newEvent.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        finalEndDate = formatDateTimeForServer(endOfDay);
    } else {
        // '하루 종일'이 false이면 입력된 시간을 그대로 사용
        finalStartDate = formatDateTimeForServer(newEvent.startDate);
        finalEndDate = formatDateTimeForServer(newEvent.endDate);
    }

    const payload = {
        uId: userEmail,
        title: newEvent.title,
        description: newEvent.description,
        isAllDay: newEvent.isAllDay,
        startDate: finalStartDate, // 포맷팅된 값으로 변경
        endDate: finalEndDate,       // 포맷팅된 값으로 변경
    };

    console.log('Sending this payload to Spring:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${API_URL}/spring/calendar/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("일정 저장에 실패했습니다.");
        setIsAddingEvent(false);
        await fetchEvents(activeDate);
    } catch (error) { console.error(error); alert(String(error)); }
  };

  const handleEditEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingEvent) return;
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';

    setEditingEvent({
      ...editingEvent,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (name === 'startDate' || name === 'endDate' ? new Date(value) : value)
    });
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) { alert("수정할 일정이 없습니다."); return; }

    // 'isAllDay' 값에 따라 startDate와 endDate를 서버 형식에 맞게 포맷팅합니다.
    let finalStartDate: string;
    let finalEndDate: string;

    if (editingEvent.isAllDay) {
        // '하루 종일'이 true이면 시간은 00:00:00 ~ 23:59:59로 설정합니다.
        const startOfDay = new Date(editingEvent.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        finalStartDate = formatDateTimeForServer(startOfDay);

        const endOfDay = new Date(editingEvent.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        finalEndDate = formatDateTimeForServer(endOfDay);
    } else {
        // '하루 종일'이 false이면 입력된 시간을 그대로 사용합니다.
        finalStartDate = formatDateTimeForServer(editingEvent.startDate);
        finalEndDate = formatDateTimeForServer(editingEvent.endDate);
    }

    const payload = {
      eventId: editingEvent.eventId,
      uId: userEmail,
      title: editingEvent.title,
      description: editingEvent.description,
      isAllDay: editingEvent.isAllDay,
      startDate: finalStartDate, // 포맷팅된 값으로 변경
      endDate: finalEndDate,       // 포맷팅된 값으로 변경
    };

    try {
      const response = await fetch(`${API_URL}/spring/calendar/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("일정 수정에 실패했습니다.");
      setEditingEvent(null);
      await fetchEvents(activeDate);
    } catch (error) { console.error(error); alert(String(error)); }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm("정말로 이 일정을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`${API_URL}/spring/calendar/delete?id=${eventId}`, {
        method: 'GET'
      });
      if (!response.ok) throw new Error("일정 삭제에 실패했습니다.");
      setSelectedDate(null);
      await fetchEvents(activeDate);
    } catch (error) { console.error(error); alert(String(error)); }
  };

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => { if (activeStartDate) setActiveDate(activeStartDate); };
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsAddingEvent(false);
    setEditingEvent(null);
    setIsSearching(false);
  };

  const filteredEvents = useMemo(() => {
    if (!activeFilterTName) {
      return events; // 적용된 필터가 없으면 모든 일정을 반환
    }
    // activeFilterTName과 일치하는 팀 이름을 가진 일정만 필터링하여 반환
    return events.filter(event => event.tname === activeFilterTName);
  }, [events, activeFilterTName]);

  const allTeamNames = useMemo(() => {
    const teamNames = new Set<string>();
    events.forEach(event => {
      if (event.tname) {
        teamNames.add(event.tname);
      }
    });
    return Array.from(teamNames).sort(); // 알파벳 순으로 정렬
  }, [events]);

  const renderTileContent = ({ date, view }: { date: Date, view: string }) => {
      if (view !== 'month') return null;

      // 공휴일 정보를 가져옵니다.
      const holidayInfo = hd.isHoliday(date);
      const isPublicHoliday = holidayInfo && holidayInfo.length > 0 && holidayInfo[0].type === 'public';

      const dayEvents = filteredEvents.filter(event => {
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          if (event.isAllDay) {
              const eventStartDay = new Date(event.startDate);
              eventStartDay.setHours(0, 0, 0, 0);
              const eventEndDay = new Date(event.endDate);
              eventEndDay.setHours(0, 0, 0, 0);
              return dayStart >= eventStartDay && dayStart <= eventEndDay;
          } else {
              return event.startDate <= dayEnd && event.endDate >= dayStart;
          }
      });

      // 공휴일이 있으면 이벤트는 하나만 표시하여 공간을 확보합니다.
      const maxEventsToShow = isPublicHoliday ? 1 : 2;

      return (
          <>
              {/* 공휴일 이름을 렌더링합니다. */}
              {isPublicHoliday && (
                  <HolidayName title={holidayInfo[0].name}>{holidayInfo[0].name}</HolidayName>
              )}
              {dayEvents.slice(0, maxEventsToShow).map(event => (
                  <EventHighlighter
                      key={event.eventId}
                      color={getColorForTId(event.tId)}
                      opacity={event.isAllDay ? 1 : 0.5}
                      title={event.title}
                  >
                      {event.title}
                  </EventHighlighter>
              ))}
          </>
      );
  };

  const selectedDayEvents = selectedDate ? filteredEvents.filter(event => {
      // '하루 종일' 이벤트가 우측 패널에 정상적으로 표시되도록 필터링 로직을 수정합니다.
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      if (event.isAllDay) {
        // '하루 종일' 이벤트: 시간은 무시하고 날짜만으로 포함 여부를 확인합니다.
        const eventStartDay = new Date(event.startDate);
        eventStartDay.setHours(0, 0, 0, 0);
        const eventEndDay = new Date(event.endDate);
        eventEndDay.setHours(0, 0, 0, 0);
        // 선택된 날짜(dayStart)가 이벤트 기간(eventStartDay ~ eventEndDay)에 포함되는지 확인
        return dayStart >= eventStartDay && dayStart <= eventEndDay;
      } else {
        // 시간이 지정된 이벤트: 기존 로직대로 시간이 겹치는지 확인합니다.
        return event.startDate <= dayEnd && event.endDate >= dayStart;
      }
  }) : [];

  const renderRightPanelContent = () => {
    if (isAddingEvent || editingEvent) {
      const isEditMode = !!editingEvent;
      const currentEventData = isEditMode ? editingEvent : newEvent;
      const handleChange = isEditMode ? handleEditEventChange : handleNewEventChange;
      const handleSubmit = isEditMode ? handleUpdateEvent : handleSaveEvent;
      const handleCancel = () => {
        setIsAddingEvent(false);
        setEditingEvent(null);
      };

  return (
    <>
        <DetailsHeader>{isEditMode ? '일정 수정' : '새 일정 추가'}</DetailsHeader>
        <Form onSubmit={handleSubmit}>
            <FormGroup><label htmlFor="title">제목</label><input type="text" name="title" id="title" value={currentEventData.title} onChange={handleChange} required /></FormGroup>
            <FormGroup><FormRow><label>하루 종일</label><SwitchLabel><SwitchInput type="checkbox" name="isAllDay" checked={currentEventData.isAllDay} onChange={handleChange} /><SwitchSlider /></SwitchLabel></FormRow></FormGroup>
            <FormGroup>
                <label htmlFor="startDate">시작</label>
                <input type={currentEventData.isAllDay ? 'date' : 'datetime-local'} name="startDate" id="startDate"
                    value={currentEventData.isAllDay ? toDateInputString(currentEventData.startDate) : toDateTimeLocalString(currentEventData.startDate)}
                    onChange={handleChange} />
            </FormGroup>
            <FormGroup>
                <label htmlFor="endDate">종료</label>
                <input type={currentEventData.isAllDay ? 'date' : 'datetime-local'} name="endDate" id="endDate"
                    value={currentEventData.isAllDay ? toDateInputString(currentEventData.endDate) : toDateTimeLocalString(currentEventData.endDate)}
                    onChange={handleChange} />
            </FormGroup>
            <FormGroup><label htmlFor="description">상세 설명</label><textarea name="description" id="description" rows={4} value={currentEventData.description} onChange={handleChange}></textarea></FormGroup>
            <ButtonContainer style={{ marginTop: 'auto' }}>
                <ActionButton type="submit">저장</ActionButton>
                <CloseButton type="button" onClick={handleCancel}>취소</CloseButton>
            </ButtonContainer>
        </Form>
        </>
      );
    }

    if (isSearching) {
        return (
            <>
                <SearchContainer>
                    <SearchInput
                        type="text"
                        placeholder="보고싶은 팀 일정을 입력해주세요."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </SearchContainer>
                <TeamListContainer>
                    {allTeamNames
                        .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(name => (
                            <TeamButton key={name} onClick={() => {
                                setActiveFilterTName(name); // 팀 이름 클릭 시 필터 적용
                                setIsSearching(false); // 검색창 닫기
                                setSearchTerm(''); // 검색어 초기화
                            }}>
                                {name}
                            </TeamButton>
                        ))}
                </TeamListContainer>
            </>
        );
    }

    if (selectedDate) {
      return (
        <>
          {activeFilterTName && (
              <FilterInfoContainer>
                  <span><strong>{activeFilterTName}</strong> 일정만 보는 중</span>
                  <ClearFilterButton onClick={() => setActiveFilterTName(null)}>필터링 끄기</ClearFilterButton>
              </FilterInfoContainer>
          )}
          <DetailsHeader>{selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</DetailsHeader>
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map(event => (
              <EventDetailCard key={event.eventId}>
                <h4>{event.title}</h4>
                <p><strong>시간:</strong> {event.isAllDay ? '하루종일' : `${event.startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ ${event.endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}</p>
                <p><strong>상세:</strong><br />{event.description}</p>
                <DetailButtonContainer>
                    <DetailButton onClick={() => setEditingEvent(event)}>일정 수정</DetailButton>
                    <DetailButton onClick={() => handleDeleteEvent(event.eventId)}>일정 삭제</DetailButton>
                </DetailButtonContainer>
              </EventDetailCard>
            ))
          ) : (
            <EmptyPanel>
                <p>등록된 일정이 없습니다.</p>
                <AddEventButton onClick={handleShowAddForm}>새 일정 추가</AddEventButton>
            </EmptyPanel>
          )}
        </>
      );
    }
    
    return (
      <>
        {activeFilterTName && (
            <FilterInfoContainer>
              <span><strong>{activeFilterTName}</strong> 일정만 보는 중</span>
              <ClearFilterButton onClick={() => setActiveFilterTName(null)}>필터링 끄기</ClearFilterButton>
            </FilterInfoContainer>
        )}
        <EmptyPanel>
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>🗓️</p>
          <p>날짜를 선택하여<br/>일정을 확인하거나<br/>새 일정을 추가하세요.</p>
        </EmptyPanel>
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CalendarContainer>
          <CalendarWrapper>
            {loading && <div style={{ position: 'absolute', zIndex: 1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>로딩 중...</div>}
            <Calendar
              calendarType="gregory" formatDay={(locale, date) => date.getDate().toString()}
              tileClassName={({ date, view }) => {
                if (view === 'month') {
                  const isHoliday = hd.isHoliday(date);
                  const classNames = [];
                  // isHoliday()는 공휴일이 아니면 false, 공휴일이면 객체/배열을 반환
                  if ((isHoliday && isHoliday.length > 0 && isHoliday[0].type === 'public') || date.getDay() === 0) {
                    classNames.push('holiday');
                  }
                  if (date.getDay() === 6) {
                    classNames.push('saturday');
                  }
                  return classNames.join(' ');
                }
                return null;
              }}
              onActiveStartDateChange={handleActiveStartDateChange} tileContent={renderTileContent} onClickDay={handleDateClick}
            />
          </CalendarWrapper>
          <ButtonContainer>
            <ActionButton onClick={handleShowAddForm}>일정 추가</ActionButton>
            <CloseButton onClick={onClose}>닫기</CloseButton>
          </ButtonContainer>
        </CalendarContainer>

        <RightPanelContainer>
          {!activeFilterTName && (
            <SearchIcon onClick={() => setIsSearching(prev => !prev)}>🔍</SearchIcon>
          )}
          {renderRightPanelContent()}
        </RightPanelContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CalendarModal;