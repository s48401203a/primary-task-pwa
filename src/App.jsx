import React, { useState, useEffect } from "react";

// 默认任务
const DEFAULT_TASKS = {
  语文: ["背诵", "练字", "读书"],
  数学: ["口算练习", "奥数卷子"],
  英语: ["一起作业", "跟读"],
  运动: ["跑步", "跳绳"]
};

function getToday() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// 获取本周日期列表（周一到周日）
function getWeekDates(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay() || 7; // 周日=7
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  const res = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    res.push(d.toISOString().split("T")[0]);
  }
  return res;
}

// 格式化日期显示
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDay = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  return `${month}月${day}日 周${weekDay}`;
}

function ProgressBar({ percent }) {
  return (
    <div style={{
      background: "#f6e5fa",
      borderRadius: 9,
      height: 13,
      margin: "14px 0 6px 0",
      boxShadow: "inset 0 1px 8px #f2e9fd"
    }}>
      <div
        style={{
          height: 13,
          borderRadius: 9,
          background: "linear-gradient(90deg,#fcb6ef,#90e8fd 90%)",
          width: `${percent}%`,
          transition: "width .3s"
        }}
      />
    </div>
  );
}

// 统计卡片组件
function StatsCard({ title, value, subtitle, color }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}20, ${color}10)`,
      borderRadius: 16,
      padding: "12px 16px",
      textAlign: "center",
      border: `1px solid ${color}30`,
      flex: 1
    }}>
      <div style={{ fontSize: 20, fontWeight: 900, color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [date, setDate] = useState(getToday());
  const [dailyTasks, setDailyTasks] = useState({});
  const [records, setRecords] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [newTaskName, setNewTaskName] = useState({});
  const [tab, setTab] = useState(Object.keys(DEFAULT_TASKS)[0]);
  const [weekStart, setWeekStart] = useState(getWeekDates(getToday())[0]);
  const [syncStatus, setSyncStatus] = useState('local');
  const [syncCode, setSyncCode] = useState('');
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // 获取当前日期的任务配置
  const tasks = dailyTasks[date] || DEFAULT_TASKS;

  // 初始化数据
  useEffect(() => {
    loadLocalData();
    generateOrLoadSyncCode();
  }, []);

  // 自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(records).length > 0 || Object.keys(dailyTasks).length > 0) {
        saveData();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [records, dailyTasks]);

  function loadLocalData() {
    try {
      const localRecords = localStorage.getItem("taskRecords");
      const localDailyTasks = localStorage.getItem("dailyTasksConfig");
      
      if (localRecords) {
        setRecords(JSON.parse(localRecords));
      }
      if (localDailyTasks) {
        setDailyTasks(JSON.parse(localDailyTasks));
      }
    } catch (error) {
      console.error('加载本地数据失败:', error);
      setSyncStatus('error');
    }
  }

  function generateOrLoadSyncCode() {
    let code = localStorage.getItem("syncCode");
    if (!code) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem("syncCode", code);
    }
    setSyncCode(code);
  }

  function saveData(newRecords = records, newDailyTasks = dailyTasks) {
    try {
      localStorage.setItem("taskRecords", JSON.stringify(newRecords));
      localStorage.setItem("dailyTasksConfig", JSON.stringify(newDailyTasks));
      syncToCloud(newRecords, newDailyTasks);
    } catch (error) {
      console.error('保存数据失败:', error);
      setSyncStatus('error');
    }
  }

  async function syncToCloud(recordsData, dailyTasksData) {
    setSyncStatus('saving');
    try {
      const data = {
        records: recordsData,
        dailyTasks: dailyTasksData,
        lastUpdate: new Date().toISOString()
      };
      
      await saveToIndexedDB(syncCode, data);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('local'), 2000);
    } catch (error) {
      console.error('同步失败:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('local'), 3000);
    }
  }

  function saveToIndexedDB(code, data) {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('TaskSync', 1);
        
        request.onerror = () => {
          console.error('IndexedDB open error:', request.error);
          reject(request.error);
        };
        
        request.onupgradeneeded = (event) => {
          try {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tasks')) {
              db.createObjectStore('tasks', { keyPath: 'code' });
            }
          } catch (error) {
            console.error('IndexedDB upgrade error:', error);
            reject(error);
          }
        };
        
        request.onsuccess = (event) => {
          try {
            const db = event.target.result;
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            
            const putRequest = store.put({ code, ...data });
            
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => {
              console.error('IndexedDB put error:', putRequest.error);
              reject(putRequest.error);
            };
            
            transaction.onerror = () => {
              console.error('IndexedDB transaction error:', transaction.error);
              reject(transaction.error);
            };
          } catch (error) {
            console.error('IndexedDB operation error:', error);
            reject(error);
          }
        };
      } catch (error) {
        console.error('IndexedDB setup error:', error);
        reject(error);
      }
    });
  }

  function loadFromIndexedDB(code) {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('TaskSync', 1);
        
        request.onerror = () => {
          console.error('IndexedDB open error:', request.error);
          reject(new Error('无法打开数据库'));
        };
        
        request.onupgradeneeded = (event) => {
          try {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tasks')) {
              db.createObjectStore('tasks', { keyPath: 'code' });
            }
          } catch (error) {
            console.error('IndexedDB upgrade error:', error);
            reject(error);
          }
        };
        
        request.onsuccess = (event) => {
          try {
            const db = event.target.result;
            
            // 检查对象存储是否存在
            if (!db.objectStoreNames.contains('tasks')) {
              reject(new Error('数据库结构异常，请重试'));
              return;
            }
            
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const getRequest = store.get(code);
            
            getRequest.onsuccess = () => {
              if (getRequest.result) {
                console.log('找到同步数据:', getRequest.result);
                resolve(getRequest.result);
              } else {
                console.log('未找到同步码对应的数据:', code);
                reject(new Error(`未找到同步码 ${code} 对应的数据`));
              }
            };
            
            getRequest.onerror = () => {
              console.error('IndexedDB get error:', getRequest.error);
              reject(new Error('读取数据失败'));
            };
            
            transaction.onerror = () => {
              console.error('IndexedDB transaction error:', transaction.error);
              reject(new Error('数据库操作失败'));
            };
          } catch (error) {
            console.error('IndexedDB operation error:', error);
            reject(new Error('数据库操作异常'));
          }
        };
      } catch (error) {
        console.error('IndexedDB setup error:', error);
        reject(new Error('数据库初始化失败'));
      }
    });
  }

  function getTaskStatus(cat, taskIndex, dateStr) {
    const dayRecord = records[dateStr];
    if (!dayRecord || !dayRecord[cat]) {
      return false;
    }
    
    const currentTaskCount = tasks[cat] ? tasks[cat].length : 0;
    const statusArray = dayRecord[cat];
    
    if (taskIndex >= currentTaskCount || taskIndex >= statusArray.length) {
      return false;
    }
    
    return statusArray[taskIndex] || false;
  }

  function toggleCheck(cat, idx) {
    setRecords(prev => {
      const day = { ...(prev[date] || {}) };
      const currentTaskCount = tasks[cat].length;
      
      day[cat] = Array(currentTaskCount).fill(false);
      
      if (prev[date] && prev[date][cat]) {
        const oldStatus = prev[date][cat];
        for (let i = 0; i < Math.min(oldStatus.length, currentTaskCount); i++) {
          day[cat][i] = oldStatus[i];
        }
      }
      
      day[cat][idx] = !day[cat][idx];
      
      const newRecords = { ...prev, [date]: day };
      return newRecords;
    });
  }

  function addTask(cat) {
    if (!newTaskName[cat] || !newTaskName[cat].trim()) return;
    
    const newDailyTasks = {
      ...dailyTasks,
      [date]: {
        ...tasks,
        [cat]: [...(tasks[cat] || []), newTaskName[cat].trim()]
      }
    };
    
    setDailyTasks(newDailyTasks);
    setNewTaskName({ ...newTaskName, [cat]: "" });
  }

  function deleteTask(cat, idx) {
    if (!window.confirm('确定删除这个任务吗？')) return;
    
    const newDailyTasks = {
      ...dailyTasks,
      [date]: {
        ...tasks,
        [cat]: tasks[cat].filter((_, index) => index !== idx)
      }
    };
    
    setDailyTasks(newDailyTasks);
    
    const newRecords = { ...records };
    if (newRecords[date] && newRecords[date][cat]) {
      newRecords[date][cat].splice(idx, 1);
      setRecords(newRecords);
    }
  }

  function addCategory() {
    const name = prompt("请输入新学科名称");
    if (name && name.trim() && !tasks[name.trim()]) {
      const newDailyTasks = {
        ...dailyTasks,
        [date]: { ...tasks, [name.trim()]: [] }
      };
      setDailyTasks(newDailyTasks);
      setTab(name.trim());
    } else if (tasks[name?.trim()]) {
      alert('该学科已存在！');
    }
  }

  function deleteCategory(cat) {
    if (window.confirm(`确定删除学科【${cat}】吗？此操作不可撤销！`)) {
      const newTasks = { ...tasks };
      delete newTasks[cat];
      
      const newDailyTasks = {
        ...dailyTasks,
        [date]: newTasks
      };
      setDailyTasks(newDailyTasks);
      
      const newRecords = { ...records };
      if (newRecords[date] && newRecords[date][cat]) {
        delete newRecords[date][cat];
        setRecords(newRecords);
      }
      
      if (tab === cat) {
        const remainingTabs = Object.keys(newTasks);
        if (remainingTabs.length > 0) {
          setTab(remainingTabs[0]);
        }
      }
    }
  }

  function shiftWeek(d) {
    const monday = new Date(weekStart);
    monday.setDate(monday.getDate() + d * 7);
    const dates = getWeekDates(monday.toISOString().split("T")[0]);
    setWeekStart(dates[0]);
    setDate(dates[0]);
  }

  async function syncWithCode() {
    const inputCode = prompt("请输入其他设备的同步码:");
    if (!inputCode) return;
    
    try {
      setSyncStatus('saving');
      const data = await loadFromIndexedDB(inputCode.toUpperCase());
      
      setRecords(data.records || {});
      setDailyTasks(data.dailyTasks || {});
      localStorage.setItem("taskRecords", JSON.stringify(data.records || {}));
      localStorage.setItem("dailyTasksConfig", JSON.stringify(data.dailyTasks || {}));
      
      setSyncStatus('synced');
      alert('数据同步成功！');
      setTimeout(() => setSyncStatus('local'), 2000);
    } catch (error) {
      console.error('同步失败:', error);
      setSyncStatus('error');
      alert('同步失败，请检查同步码是否正确');
      setTimeout(() => setSyncStatus('local'), 3000);
    }
  }

  // 统计数据计算
  function getWeekStats() {
    const weekDates = getWeekDates(weekStart);
    let totalTasks = 0;
    let completedTasks = 0;
    let completeDays = 0;
    
    weekDates.forEach(day => {
      const dayTasks = dailyTasks[day] || DEFAULT_TASKS;
      const dayRecord = records[day] || {};
      let dayTotal = 0;
      let dayCompleted = 0;
      
      Object.keys(dayTasks).forEach(cat => {
        dayTotal += dayTasks[cat].length;
        if (dayRecord[cat]) {
          const statusArray = dayRecord[cat];
          const taskCount = dayTasks[cat].length;
          for (let i = 0; i < Math.min(statusArray.length, taskCount); i++) {
            if (statusArray[i]) dayCompleted++;
          }
        }
      });
      
      totalTasks += dayTotal;
      completedTasks += dayCompleted;
      if (dayTotal > 0 && dayCompleted === dayTotal) completeDays++;
    });
    
    return { totalTasks, completedTasks, completeDays };
  }

  // 进度计算
  const today = records[date] || {};
  let total = 0, done = 0;
  Object.keys(tasks).forEach(cat => {
    total += tasks[cat].length;
    if (today[cat]) {
      const currentTaskCount = tasks[cat].length;
      const statusArray = today[cat];
      for (let i = 0; i < Math.min(statusArray.length, currentTaskCount); i++) {
        if (statusArray[i]) done++;
      }
    }
  });
  const percent = total ? Math.round((done / total) * 100) : 0;
  
  let award = null;
  if (percent === 100 && total > 0) award = "🎉 全部完成！太棒了！";
  else if (percent >= 80) award = "🌟 还差一点就全部完成啦，加油！";
  else if (percent >= 50) award = "💪 已经完成一半了，继续努力！";
  else if (done > 0) award = `已完成 ${done}/${total} 项，继续加油！`;

  const tabColors = [
    "#ff6b81", "#5f8ef7", "#22c993", "#ffb549", "#ae8afc", "#ec8ad9"
  ];
  const weekDates = getWeekDates(weekStart);
  
  function getDayProgress(day) {
    const rec = records[day] || {};
    const dayTasks = dailyTasks[day] || DEFAULT_TASKS;
    let t = 0, d = 0;
    Object.keys(dayTasks).forEach(cat => {
      t += dayTasks[cat].length;
      if (rec[cat]) {
        const currentTaskCount = dayTasks[cat].length;
        const statusArray = rec[cat];
        for (let i = 0; i < Math.min(statusArray.length, currentTaskCount); i++) {
          if (statusArray[i]) d++;
        }
      }
    });
    return t ? Math.round((d / t) * 100) : 0;
  }

  const weekStats = getWeekStats();

  return (
    <div style={{
      maxWidth: 540, margin: "20px auto", minHeight: "100vh",
      background: "linear-gradient(135deg,#fdf6fb 60%,#e5eafc 120%)",
      borderRadius: 24, boxShadow: "0 3px 24px #f1eaf3",
      padding: 20, position: "relative"
    }}>
      {/* 顶部工具栏 */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16
      }}>
        <button 
          onClick={() => setShowStats(!showStats)}
          style={{
            background: "rgba(255,255,255,0.8)", border: "1px solid #ddd",
            borderRadius: 12, padding: "6px 12px", cursor: "pointer",
            fontSize: 12, color: "#666"
          }}
        >
          📊 统计
        </button>
        
        {/* 同步状态 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: syncStatus === 'synced' ? '#22c993' : 
                       syncStatus === 'saving' ? '#ffb549' :
                       syncStatus === 'error' ? '#ff6b81' : '#ccc'
          }} />
          <button 
            onClick={() => setShowSyncPanel(!showSyncPanel)}
            style={{
              background: "none", border: "none", color: "#888",
              cursor: "pointer", fontSize: 12
            }}
          >
            {syncStatus === 'synced' ? '已同步' : 
             syncStatus === 'saving' ? '同步中...' :
             syncStatus === 'error' ? '同步失败' : '本地'}
          </button>
        </div>
      </div>

      {/* 统计面板 */}
      {showStats && (
        <div style={{
          background: "rgba(255,255,255,0.9)", borderRadius: 16,
          padding: 16, marginBottom: 16, border: "1px solid #eee"
        }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#333", textAlign: "center" }}>
            本周统计 ({weekDates[0]} ~ {weekDates[6]})
          </h4>
          <div style={{ display: "flex", gap: 8 }}>
            <StatsCard 
              title="完成天数" 
              value={weekStats.completeDays} 
              subtitle="/ 7天"
              color="#22c993" 
            />
            <StatsCard 
              title="完成任务" 
              value={weekStats.completedTasks} 
              subtitle={`/ ${weekStats.totalTasks}项`}
              color="#5f8ef7" 
            />
            <StatsCard 
              title="完成率" 
              value={`${weekStats.totalTasks ? Math.round((weekStats.completedTasks / weekStats.totalTasks) * 100) : 0}%`}
              color="#ff6b81" 
            />
          </div>
        </div>
      )}

      {/* 同步面板 */}
      {showSyncPanel && (
        <div style={{
          position: "absolute", top: 60, right: 15, zIndex: 10,
          background: "white", borderRadius: 12, padding: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 220
        }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#333" }}>数据同步</h4>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>本设备同步码:</div>
            <div style={{ 
              background: "#f5f5f5", padding: 8, borderRadius: 6,
              fontFamily: "monospace", fontSize: 14, fontWeight: "bold",
              cursor: "pointer"
            }}
            onClick={() => navigator.clipboard?.writeText(syncCode)}
            title="点击复制"
            >{syncCode}</div>
          </div>
          <button 
            onClick={syncWithCode}
            style={{
              width: "100%", padding: 8, background: "#5f8ef7",
              color: "white", border: "none", borderRadius: 6,
              cursor: "pointer", marginBottom: 8,
              opacity: syncStatus === 'saving' ? 0.6 : 1
            }}
            disabled={syncStatus === 'saving'}
          >
            {syncStatus === 'saving' ? '同步中...' : '从其他设备同步'}
          </button>
          <button 
            onClick={clearAllData}
            style={{
              width: "100%", padding: 6, background: "#ff6b81",
              color: "white", border: "none", borderRadius: 6,
              cursor: "pointer", marginBottom: 8, fontSize: 12
            }}
          >
            清空所有数据
          </button>
          <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4 }}>
            点击同步码可复制。在其他设备输入此码即可同步数据。
          </div>
        </div>
      )}

      <h2 style={{
        textAlign: "center",
        color: "#ff9090",
        fontWeight: 900,
        fontSize: 28,
        marginBottom: 8,
        letterSpacing: 2,
        textShadow: "0 2px 12px #ffbcdb55"
      }}>
        🦁 每日任务打卡 🦁
      </h2>
      
      {/* 当前日期显示 */}
      <div style={{
        textAlign: "center", fontSize: 16, color: "#666",
        marginBottom: 12, fontWeight: 700
      }}>
        {formatDate(date)}
      </div>
      
      <ProgressBar percent={percent} />
      
      <div style={{
        textAlign: "center",
        fontWeight: 800,
        color: percent === 100 ? "#24bb5f" : "#fc8591",
        fontSize: 18,
        marginBottom: 16,
        textShadow: percent === 100 ? "0 1px 8px #baffce99" : "none"
      }}>
        完成进度：<span style={{
          color: percent === 100 ? "#24bb5f" : "#ff6b81"
        }}>{done}/{total} ({percent}%)</span>
      </div>

      {/* 周视图 */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 10, margin: "12px 0", justifyContent: "center"
      }}>
        <button onClick={() => shiftWeek(-1)}
          style={{ border: "none", background: "none", color: "#e18e9d", fontSize: 20, fontWeight: 900, cursor: "pointer" }}>«</button>
        <span style={{ color: "#888", fontWeight: 800, fontSize: 14 }}>
          {weekDates[0].slice(5)} ~ {weekDates[6].slice(5)}
        </span>
        <button onClick={() => shiftWeek(1)}
          style={{ border: "none", background: "none", color: "#e18e9d", fontSize: 20, fontWeight: 900, cursor: "pointer" }}>»</button>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", marginBottom: 16,
        gap: 3
      }}>
        {weekDates.map(day => {
          const progress = getDayProgress(day);
          const isToday = day === getToday();
          const isSelected = day === date;
          
          return (
            <div key={day}
              style={{
                flex: 1,
                background: isSelected ? "linear-gradient(120deg,#fda2c6 60%,#a5dfff 120%)" : "#f8fafd",
                borderRadius: 16,
                margin: "0 1px", cursor: "pointer",
                textAlign: "center", 
                boxShadow: isSelected ? "0 2px 12px #f0c6f4aa" : undefined,
                border: isSelected ? "2px solid #ff9eae" : isToday ? "2px solid #ffb549" : "1px solid #eee",
                fontWeight: 900, 
                color: isSelected ? "#fff" : isToday ? "#ff9549" : "#ae8afc",
                padding: "8px 2px", 
                transition: "all .2s",
                position: "relative"
              }}
              onClick={() => setDate(day)}
            >
              {["一","二","三","四","五","六","日"][new Date(day).getDay()===0?6:new Date(day).getDay()-1]}
              <br/>
              <span style={{ fontSize: 13 }}>{day.slice(8)}</span>
              {isToday && (
                <div style={{
                  position: "absolute", top: 2, right: 2,
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#ffb549"
                }} />
              )}
              <div style={{
                height: 6, width: "80%", margin: "3px auto 0 auto",
                background: "#e2e7fd", borderRadius: 3, overflow: "hidden"
              }}>
                <div style={{
                  height: 6, width: `${progress}%`,
                  background: progress === 100 ? "#14d897" : "#ff80a9",
                  transition: "width .2s"
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 学科Tab */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, justifyContent: "center"
      }}>
        {Object.keys(tasks).map((cat, idx) => (
          <button
            key={cat}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              background: tab === cat ? tabColors[idx % tabColors.length] : "#f6f7fb",
              fontWeight: tab === cat ? 900 : 700,
              color: tab === cat ? "#fff" : "#8a8a8a",
              cursor: "pointer",
              fontSize: 15,
              boxShadow: tab === cat ? "0 2px 9px #ffb9e055" : undefined,
              letterSpacing: 0.5
            }}
            onClick={() => setTab(cat)}
          >
            {cat}
          </button>
        ))}
        <button
          style={{
            border: "2px dashed #fc8591",
            borderRadius: 16,
            padding: "6px 12px",
            background: "transparent",
            color: "#fc8591",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer"
          }}
          onClick={addCategory}
        >+ 新增</button>
      </div>

      {/* 学科详细卡片 */}
      {Object.keys(tasks).map((cat, idx) => (
        tab === cat && (
          <div key={cat} style={{
            background: "linear-gradient(135deg,#fffafd 60%,#f6f9ff)",
            borderRadius: 20,
            boxShadow: "0 4px 16px #efe0fc44",
            padding: 20,
            margin: "20px 0"
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 16
            }}>
              <span style={{
                fontWeight: 900, fontSize: 20,
                color: tabColors[idx % tabColors.length],
                letterSpacing: 1
              }}>{cat}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ 
                    color: "#fc8591", background: "transparent", border: "none", 
                    cursor: "pointer", fontSize: 16, padding: 4
                  }}
                  onClick={() => deleteCategory(cat)}
                  title="删除学科"
                >🗑</button>
                <button
                  style={{ 
                    color: "#888", background: "transparent", border: "1px solid #ddd",
                    borderRadius: 8, padding: "4px 8px", cursor: "pointer", 
                    fontWeight: 700, fontSize: 12
                  }}
                  onClick={() => setEditMode(!editMode)}
                >{editMode ? "完成" : "编辑"}</button>
              </div>
            </div>
            
            {tasks[cat].length === 0 ? (
              <div style={{
                textAlign: "center", color: "#999", padding: "20px 0",
                fontStyle: "italic"
              }}>
                暂无任务，点击下方添加任务
              </div>
            ) : (
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {tasks[cat].map((task, idx2) => {
                  const checked = getTaskStatus(cat, idx2, date);
                  return (
                    <li key={`${task}-${idx2}`}
                      style={{
                        display: "flex", alignItems: "center",
                        borderRadius: 16,
                        background: checked
                          ? "linear-gradient(90deg, #d1ffe6 65%, #b6f3fa 120%)"
                          : "linear-gradient(90deg, #fff 65%, #f4f5fd 110%)",
                        boxShadow: checked
                          ? "0 2px 12px #a0fdd4b2"
                          : "0 2px 8px #e9e2fd80",
                        padding: "12px 16px",
                        margin: "12px 0",
                        fontSize: 16,
                        fontWeight: 700,
                        color: checked ? "#149b74" : "#4d476a",
                        transition: "background .18s, box-shadow .18s"
                      }}>
                      <label style={{
                        display: "flex", alignItems: "center", width: "100%", cursor: "pointer", fontWeight: 800
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheck(cat, idx2)}
                          style={{
                            width: 24, height: 24, marginRight: 12, accentColor: checked ? "#21bfa0" : "#eeaed2",
                            transition: "accent-color .3s"
                          }}
                        />
                        <span style={{
                          flex: 1, fontSize: 16,
                          color: checked ? "#16a072" : "#695a82",
                          textDecoration: checked ? "line-through" : "none",
                          fontWeight: checked ? 800 : 700,
                          letterSpacing: 1,
                          transition: "color .22s"
                        }}>
                          {task}
                        </span>
                      </label>
                      {checked && (
                        <span style={{
                          marginLeft: 12,
                          color: "#21bf8f", fontWeight: 900, fontSize: 20
                        }}>✓</span>
                      )}
                      {editMode && (
                        <button
                          style={{
                            color: "#f8638e", background: "transparent",
                            border: "none", marginLeft: 12, cursor: "pointer", fontSize: 14,
                            padding: 4
                          }}
                          onClick={() => deleteTask(cat, idx2)}
                        >删除</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            
            {editMode && (
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <input
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    border: "1.5px solid #fc8591",
                    padding: "8px 12px",
                    fontSize: 14,
                    outline: "none"
                  }}
                  value={newTaskName[cat] || ""}
                  placeholder="输入新任务名称"
                  onChange={e => setNewTaskName({ ...newTaskName, [cat]: e.target.value })}
                  onKeyPress={e => e.key === 'Enter' && addTask(cat)}
                />
                <button
                  onClick={() => addTask(cat)}
                  style={{
                    background: "#fc8591",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: "pointer"
                  }}
                >+</button>
              </div>
            )}
          </div>
        )
      ))}

      <div style={{
        margin: "24px 0 0 0", color: "#ffac77", fontWeight: 800,
        fontSize: award ? 18 : 14, textAlign: "center", minHeight: 24
      }}>
        {award}
      </div>

      <div style={{
        marginTop: 32, color: "#888", textAlign: "center", fontSize: 13, lineHeight: 1.6
      }}>
        💡 建议完成时间：18:15-20:00<br />
        包含30分钟吃饭时间 + 5分钟休息<br />
        <span style={{ fontSize: 11, color: "#aaa" }}>
          （部分作业可在校完成，此处仅需打卡确认）
        </span>
      </div>
    </div>
  );
}
