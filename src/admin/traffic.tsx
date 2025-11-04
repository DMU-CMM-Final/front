import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData
} from 'chart.js'; // ChartData 타입을 import 합니다.
import { Line, Bar } from 'react-chartjs-2';
import './css/traffic.css';
import Header from '../header';
import api from '../api';

// --- 1. 서버 데이터의 타입을 정의하는 인터페이스 추가 ---
interface ServerInfo {
  time: string;
  traffic: number;
}

interface TeamInfo {
  tid: number;
  tname: string;
  score: number;
}

interface AdminPageData {
  cpu: number;
  ram: number;
  server: ServerInfo[];
  team: TeamInfo[];
}

// Chart.js에 필요한 스케일 및 요소 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// 2. 팀별 현황 (Bar Chart) 설정
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#A19FA6',
      },
       border: {
        display: false,
      },
    },
    y: {
      display: false,
      min: 0,
      max: 100,
    },
  },
};

const Traffic = () => {
  const [cpu, setCpu] = useState(0);
  const [ram, setRam] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- 1. Y축 최댓값을 저장할 state 추가 ---
  const [maxTraffic, setMaxTraffic] = useState(100); // 기본값 100

  // --- 2. useState에 타입 명시 ---
  // Chart.js에서 제공하는 ChartData 타입을 사용해 state의 형식을 명확히 알려줍니다.
  const [lineData, setLineData] = useState<ChartData<'line', number[], string>>({
    labels: [],
    datasets: [],
  });
  const [barData, setBarData] = useState<ChartData<'bar', number[], string>>({
    labels: [],
    datasets: [],
  });

  // --- 2. lineChartOptions를 컴포넌트 안으로 이동 ---
  // 이제 maxTraffic state 값에 접근할 수 있습니다.
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#A19FA6' },
        border: { display: false },
      },
      y: {
        display: false,
        max: maxTraffic, 
        grace: '5%',
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.post<AdminPageData>('/spring/api/admin/page');

        const data: AdminPageData = response.data;

        setCpu(Math.round(data.cpu));
        setRam(Math.round(data.ram));

        const serverLabels = data.server.map(s => {
          try {
            // s.time이 "2025-11-02T09:00:00" 형식이라고 가정합니다.
            // 1. 'T'를 기준으로 문자열을 자릅니다. -> ["2025-11-02", "09:00:00"]
            // 2. 두 번째 요소("09:00:00")를 선택합니다.
            const timePart = s.time.split('T')[1]; 
            
            // 3. 앞에서부터 5글자("09:00")만 잘라냅니다.
            return timePart.substring(0, 5); 
          } catch (e) {
            // 혹시 s.time 형식이 예상과 다를 경우 (null, undefined, T가 없는 경우)
            // 오류가 나지 않도록 예외처리를 합니다.
            console.error("시간 문자열 변환 오류:", s.time);
            return "??:??";
          }
        });
        
        const serverTrafficData = data.server.map(s => s.traffic);

        // --- 4. 받아온 데이터로 Y축 최댓값 계산 및 설정 ---
        if (serverTrafficData.length > 0) {
          // 가장 큰 트래픽 값을 찾습니다.
          const maxVal = Math.max(...serverTrafficData);
          // 차트의 맨 위 선과 겹치지 않도록 약간의 여유 공간(padding)을 줍니다.
          // ✨ 핵심 수정: Math.ceil() 제거!
          // maxVal이 0일 경우 최댓값을 1로 설정하고, 아닐 경우 20% 여유를 준 소수점 값을 그대로 사용합니다.
          const paddedMax = maxVal === 0 ? 1 : maxVal * 1.2;

          setMaxTraffic(paddedMax);
        }

        console.log("API에서 받은 원본 data.server:", data.server);
        console.log("차트 X축 레이블로 변환된 serverLabels:", serverLabels);
        
        setLineData({
          labels: serverLabels,
          datasets: [{
            label: '네트워크 트래픽',
            data: serverTrafficData,
            borderColor: '#FF6B6B',
            backgroundColor: '#FF6B6B',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
          }],
        });

        // 'acc'와 'team'의 타입이 자동으로 추론되어 오류가 사라집니다.
        const teamNameCounts = data.team.reduce((acc: Record<string, number>, team) => {
          acc[team.tname] = (acc[team.tname] || 0) + 1;
          return acc;
        }, {});

        const teamLabels = data.team.map(t => {
          if (teamNameCounts[t.tname] > 1) {
            return `${t.tname}(${t.tid})`;
          }
          return t.tname;
        });
        const teamScoreData = data.team.map(t => t.score);

        console.log("API에서 받은 원본 data.team:", data.team);
        console.log("Bar 차트 X축 레이블 (teamLabels):", teamLabels);
        console.log("Bar 차트 데이터 (teamScoreData):", teamScoreData);
        
        setBarData({
          labels: teamLabels,
          datasets: [{
            label: '팀별 현황',
            data: teamScoreData,
            backgroundColor: [
              '#5A96E3','#5A96E3','#5A96E3','#A9C7F0','#A9C7F0',
              '#A9C7F0','#A9C7F0','#A9C7F0','#A9C7F0','#A9C7F0'
            ],
            borderRadius: 4,
            barPercentage: 0.6,
          }],
        });

      } catch (error) {
        console.error("데이터를 가져오는 중 오류 발생:", error);

        if (error && typeof error === 'object' && 'response' in error) {
          const responseData = (error as any).response?.data;
          alert(responseData?.message || "데이터 로딩에 실패했습니다.");
        } else {
          alert('데이터를 가져오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // 빈 배열을 전달하여 컴포넌트가 처음 마운트될 때 한 번만 실행

  // 로딩 중일 때 표시할 UI
  if (loading) {
    return (
      <div className="admin-container">
        <Header />
        <div className="traffic-page">
          <h1 className="main-title">데이터를 불러오는 중입니다...</h1>
        </div>
      </div>
    );
  }

  // 3. state의 동적 데이터로 UI 렌더링
  return (
    <div className="admin-container">
      <Header />
      
      <div className="traffic-page">
        <h1 className="main-title">서버 관리 페이지</h1>

        <div className="card">
          <h2 className="card-title">전체 서버 부하 상태</h2>
          <div className="status-container">
            <div className="status-item">
              <span className="status-label">CPU 사용량</span>
              <span className="status-value">{cpu}%</span>
            </div>
            <div className="status-item">
              <span className="status-label">메모리 사용량</span>
              <span className="status-value">{ram}%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">네트워크 트래픽</h2>
          <div className="chart-container">
            <Line options={lineChartOptions} data={lineData} />
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">팀별 현황</h2>
          <div className="chart-container">
            <Bar options={barChartOptions} data={barData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Traffic;
