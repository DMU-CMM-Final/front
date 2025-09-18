import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import Calendar from 'react-calendar';
import { useAuth } from '../contexts/AuthContext';

// --- 타입 정의 ---
// 컴포넌트에서 사용하는 이벤트 타입. startDate와 endDate를 Date 객체로 정의합니다.
interface CalendarEvent {
  eventId: number;
  tId: number | null;
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
  width: 300px; margin-left: 20px; padding-left: 20px; border-left: 1px solid #e0e0e0; height: 500px; overflow-y: auto;
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
  .react-calendar__tile--active { background: #007bff; color: white; border-radius: 8px; }
  .saturday { color: #007bff; }
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


const CalendarModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userEmail } = useAuth(); 
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeDate, setActiveDate] = useState(new Date()); 
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000), isAllDay: false
  });

  const tIdColorMap = useMemo(() => new Map<number, string>(), []);
  const getColorForTId = useCallback((tId: number | null): string => {
    if (tId === null) return '#B8B6F2'; 
    if (!tIdColorMap.has(tId)) { const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'); tIdColorMap.set(tId, randomColor); }
    return tIdColorMap.get(tId)!;
  }, [tIdColorMap]);
  
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
      
      const processedEvents: CalendarEvent[] = data.map(event => ({
        ...event,
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
    }
  }, [isOpen, activeDate, fetchEvents]);
  
  const handleShowAddForm = () => {
    setSelectedDate(null); setIsAddingEvent(true);
    const now = new Date();
    setNewEvent({
        title: '', description: '', startDate: now,
        endDate: new Date(now.getTime() + 60 * 60 * 1000), isAllDay: false,
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
        endDate: finalEndDate,     // 포맷팅된 값으로 변경
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
      endDate: finalEndDate,     // 포맷팅된 값으로 변경
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
      const response = await fetch(`${API_URL}/spring/calendar/delete?eventId=${eventId}`, {
        method: 'GET'
      });
      if (!response.ok) throw new Error("일정 삭제에 실패했습니다.");
      setSelectedDate(null);
      await fetchEvents(activeDate);
    } catch (error) { console.error(error); alert(String(error)); }
  };

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => { if (activeStartDate) setActiveDate(activeStartDate); };
  const handleDateClick = (date: Date) => {
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const hasEvents = events.some(event => {
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
    if (hasEvents) { 
      setSelectedDate(date); 
      setIsAddingEvent(false); 
      setEditingEvent(null);
    }
  };
  
  const renderTileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;
    const dayEvents = events.filter(event => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      if (event.isAllDay) {
        // '하루 종일' 이벤트: 시간은 무시하고 날짜만으로 포함 여부를 확인합니다.
        const eventStartDay = new Date(event.startDate);
        eventStartDay.setHours(0, 0, 0, 0);
        const eventEndDay = new Date(event.endDate);
        eventEndDay.setHours(0, 0, 0, 0);
        // 현재 날짜(dayStart)가 이벤트 기간(eventStartDay ~ eventEndDay)에 포함되는지 확인
        return dayStart >= eventStartDay && dayStart <= eventEndDay;
      } else {
        // 시간이 지정된 이벤트: 기존 로직대로 시간이 겹치는지 확인합니다.
        return event.startDate <= dayEnd && event.endDate >= dayStart;
      }
    });
    return ( <>{dayEvents.slice(0, 2).map(event => (<EventHighlighter key={event.eventId} color={getColorForTId(event.tId)} opacity={event.isAllDay ? 1 : 0.5} title={event.title}>{event.title}</EventHighlighter>))}</> );
  };
  
  const selectedDayEvents = selectedDate ? events.filter(event => {
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

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CalendarContainer>
          <CalendarWrapper>
            {loading && <div style={{ position: 'absolute', zIndex: 1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>로딩 중...</div>}
            <Calendar
              calendarType="gregory" formatDay={(locale, date) => date.getDate().toString()}
              tileClassName={({ date, view }) => (view === 'month' && date.getDay() === 6 ? 'saturday' : null)}
              onActiveStartDateChange={handleActiveStartDateChange} tileContent={renderTileContent} onClickDay={handleDateClick}
            />
          </CalendarWrapper>
          <ButtonContainer>
            <ActionButton onClick={handleShowAddForm}>일정 추가</ActionButton>
            <CloseButton onClick={onClose}>닫기</CloseButton>
          </ButtonContainer>
        </CalendarContainer>
        
        <RightPanelContainer>
          {editingEvent ? (
            // --- 3. 수정 모드일 때 ---
            <>
              <DetailsHeader>일정 수정</DetailsHeader>
              <Form onSubmit={handleUpdateEvent}>
                <FormGroup><label htmlFor="title">제목</label><input type="text" name="title" id="title" value={editingEvent.title} onChange={handleEditEventChange} required /></FormGroup>
                <FormGroup><FormRow><label>하루 종일</label><SwitchLabel><SwitchInput type="checkbox" name="isAllDay" checked={editingEvent.isAllDay} onChange={handleEditEventChange} /><SwitchSlider /></SwitchLabel></FormRow></FormGroup>
                <FormGroup>
                  <label htmlFor="startDate">시작</label>
                  <input type={editingEvent.isAllDay ? 'date' : 'datetime-local'} name="startDate" id="startDate"
                    value={editingEvent.isAllDay ? toDateInputString(editingEvent.startDate) : toDateTimeLocalString(editingEvent.startDate)}
                    onChange={handleEditEventChange} />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="endDate">종료</label>
                  <input type={editingEvent.isAllDay ? 'date' : 'datetime-local'} name="endDate" id="endDate"
                    value={editingEvent.isAllDay ? toDateInputString(editingEvent.endDate) : toDateTimeLocalString(editingEvent.endDate)}
                    onChange={handleEditEventChange} />
                </FormGroup>
                <FormGroup><label htmlFor="description">상세 설명</label><textarea name="description" id="description" rows={4} value={editingEvent.description} onChange={handleEditEventChange}></textarea></FormGroup>
                <ButtonContainer>
                  <ActionButton type="submit">저장</ActionButton>
                  <CloseButton type="button" onClick={() => setEditingEvent(null)}>취소</CloseButton>
                </ButtonContainer>
              </Form>
            </>
          ) : isAddingEvent ? (
            // --- 2. 추가 모드일 때 ---
            <>
              <DetailsHeader>새 일정 추가</DetailsHeader>
              <Form onSubmit={handleSaveEvent}>
                <FormGroup><label htmlFor="title">제목</label><input type="text" name="title" id="title" value={newEvent.title} onChange={handleNewEventChange} required /></FormGroup>
                <FormGroup><FormRow><label>하루 종일</label><SwitchLabel><SwitchInput type="checkbox" name="isAllDay" checked={newEvent.isAllDay} onChange={handleNewEventChange} /><SwitchSlider /></SwitchLabel></FormRow></FormGroup>
                <FormGroup>
                  <label htmlFor="startDate">시작</label>
                  <input type={newEvent.isAllDay ? 'date' : 'datetime-local'} name="startDate" id="startDate"
                    value={newEvent.isAllDay ? toDateInputString(newEvent.startDate) : toDateTimeLocalString(newEvent.startDate)}
                    onChange={handleNewEventChange} />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="endDate">종료</label>
                  <input type={newEvent.isAllDay ? 'date' : 'datetime-local'} name="endDate" id="endDate"
                    value={newEvent.isAllDay ? toDateInputString(newEvent.endDate) : toDateTimeLocalString(newEvent.endDate)}
                    onChange={handleNewEventChange} />
                </FormGroup>
                <FormGroup><label htmlFor="description">상세 설명</label><textarea name="description" id="description" rows={4} value={newEvent.description} onChange={handleNewEventChange}></textarea></FormGroup>
                <ButtonContainer>
                  <ActionButton type="submit">저장</ActionButton>
                  <CloseButton type="button" onClick={() => setIsAddingEvent(false)}>취소</CloseButton>
                </ButtonContainer>
              </Form>
            </>
          ) : selectedDate && (
            // --- 1. 상세 보기 모드일 때 ---
            <>
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
              ) : <p>선택된 날짜에 일정이 없습니다.</p>}
            </>
          )}
        </RightPanelContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CalendarModal;

