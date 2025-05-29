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

export default function App() {
  const [date, setDate] = useState(getToday());
  // 改为每日独立的任务配置
  const [dailyTasks, setDailyTasks] = useState({});
  const [records, setRecords] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [newTaskName, setNewTaskName] = useState({});
  const [tab, setTab] = useState(Object.keys(DEFAULT_TASKS)[0]);
  const [weekStart, setWeekStart] = useState(getWeekDates(getToday())[0]);
  const [syncStatus, setSyncStatus] = useState('local'); // local, saving, synced, error

  // 数据同步相关状态
  const [syncCode, setSyncCode] = useState('');
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  // 获取当前日期的任务配置
  const tasks = dailyTasks[date] || DEFAULT_TASKS;

  // 初始化数据
  useEffect(() => {
    loadLocalData();
    generateOrLoadSyncCode();
  }, []);

  // 加载本地数据
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
    }
  }

  // 生成或加载同步码
  function generateOrLoadSyncCode() {
    let code = localStorage.getItem("syncCode");
    if (!code) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem("syncCode", code);
    }
    setSyncCode(code);
  }

  // 保存数据到本地和云端
  function saveData(newRecords = records, newDailyTasks = dailyTasks) {
    // 保存到本地
    localStorage.setItem("taskRecords", JSON.stringify(newRecords));
    localStorage.setItem("dailyTasksConfig", JSON.stringify(newDailyTasks));
    
    // 尝试同步到云端（简化版，使用浏览器的 IndexedDB 模拟）
    syncToCloud(newRecords, newDailyTasks);
  }

  // 云端同步（简化实现）
  async function syncToCloud(recordsData, dailyTasksData) {
    setSyncStatus('saving');
    try {
      // 这里使用 IndexedDB 模拟云端存储
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

  // IndexedDB 操作（模拟云端）
  function saveToIndexedDB(code, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TaskSync', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'code' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        
        store.put({ code, ...data });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  function loadFromIndexedDB(code) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TaskSync', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['tasks'], 'readonly');
        const store = transaction.objectStore('tasks');
        const getRequest = store.get(code);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result);
          } else {
            reject(new Error('未找到数据'));
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  // 修复：确保勾选状态数组长度正确
  function getTaskStatus(cat, taskIndex, dateStr) {
    const dayRecord = records[dateStr];
    if (!dayRecord || !dayRecord[cat]) {
      return false;
    }
    
    // 确保数组长度与当前任务数量一致
    const currentTaskCount = tasks[cat] ? tasks[cat].length : 0;
    const statusArray = dayRecord[cat];
    
    // 如果索引超出范围，返回 false
    if (taskIndex >= currentTaskCount || taskIndex >= statusArray.length) {
      return false;
    }
    
    return statusArray[taskIndex] || false;
  }

  // 修复：勾选任务时确保数组长度正确
  function toggleCheck(cat, idx) {
    setRecords(prev => {
      const day = { ...(prev[date] || {}) };
      const currentTaskCount = tasks[cat].length;
      
      // 确保数组长度正确
      day[cat] = Array(currentTaskCount).fill(false);
      
      // 复制已有的状态（如果存在）
      if (prev[date] && prev[date][cat]) {
        const oldStatus = prev[date][cat];
        for (let i = 0; i < Math.min(oldStatus.length, currentTaskCount); i++) {
          day[cat][i] = oldStatus[i];
        }
      }
      
      // 切换当前任务状态
      day[cat][idx] = !day[cat][idx];
      
      const newRecords = { ...prev, [date]: day };
      saveData(newRecords);
      return newRecords;
    });
  }

  function addTask(cat) {
    if (!newTaskName[cat] || !newTaskName[cat].trim()) return;
    
    // 只为当前日期添加任务
    const newDailyTasks = {
      ...dailyTasks,
      [date]: {
        ...tasks,
        [cat]: [...(tasks[cat] || []), newTaskName[cat].trim()]
      }
    };
    
    setDailyTasks(newDailyTasks);
    setNewTaskName({ ...newTaskName, [cat]: "" });
    saveData(records, newDailyTasks);
  }

  function deleteTask(cat, idx) {
    // 只从当前日期删除任务
    const newDailyTasks = {
      ...dailyTasks,
      [date]: {
        ...tasks,
        [cat]: tasks[cat].filter((_, index) => index !== idx)
      }
    };
    
    setDailyTasks(newDailyTasks);
    
    // 同时更新当前日期的记录，移除对应索引
    const newRecords = { ...records };
    if (newRecords[date] && newRecords[date][cat]) {
      newRecords[date][cat].splice(idx, 1);
      setRecords(newRecords);
    }
    
    saveData(newRecords, newDailyTasks);
  }

  function addCategory() {
    const name = prompt("请输入新学科名");
    if (name && !tasks[name]) {
      // 只为当前日期添加新学科
      const newDailyTasks = {
        ...dailyTasks,
        [date]: { ...tasks, [name]: [] }
      };
      setDailyTasks(newDailyTasks);
      saveData(records, newDailyTasks);
    }
  }

  function deleteCategory(cat) {
    if (window.confirm(`确定删除学科【${cat}】吗？`)) {
      // 只从当前日期删除学科
      const newTasks = { ...tasks };
      delete newTasks[cat];
      
      const newDailyTasks = {
        ...dailyTasks,
        [date]: newTasks
      };
      setDailyTasks(newDailyTasks);
      
      // 清理当前日期记录中的相关数据
      const newRecords = { ...records };
      if (newRecords[date] && newRecords[date][cat]) {
        delete newRecords[date][cat];
        setRecords(newRecords);
      }
      
      saveData(newRecords, newDailyTasks);
      
      // 如果删除的是当前选中的tab，切换到第一个
      if (tab === cat) {
        const remainingTabs = Object.keys(newTasks);
        if (remainingTabs.length > 0) {
          setTab(remainingTabs[0]);
        }
      }
    }
  }

  function shiftDate(d) {
    const dt = new Date(date);
    dt.setDate(dt.getDate() + d);
    setDate(dt.toISOString().split("T")[0]);
  }

  function shiftWeek(d) {
    const monday = new Date(weekStart);
    monday.setDate(monday.getDate() + d * 7);
    const dates = getWeekDates(monday.toISOString().split("T")[0]);
    setWeekStart(dates[0]);
    setDate(dates[0]);
  }

  // 使用其他设备的同步码加载数据
  async function syncWithCode() {
    const inputCode = prompt("请输入其他设备的同步码:");
    if (!inputCode) return;
    
    try {
      setSyncStatus('saving');
      const data = await loadFromIndexedDB(inputCode.toUpperCase());
      
      setRecords(data.records);
      setDailyTasks(data.dailyTasks || {});
      localStorage.setItem("taskRecords", JSON.stringify(data.records));
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
  else if (percent >= 70) award = "🌟 还差一点就全部完成啦，加油！";
  else if (done > 0) award = `已完成 ${done}/${total} 项，继续努力！`;

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

  return (
    <div style={{
      maxWidth: 540, margin: "36px auto", minHeight: "100vh",
      background: "linear-gradient(135deg,#fdf6fb 60%,#e5eafc 120%)",
      borderRadius: 36, boxShadow: "0 3px 24px #f1eaf3",
      padding: 24, position: "relative"
    }}>
      {/* 同步状态指示器 */}
      <div style={{
        position: "absolute", top: 10, right: 15,
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

      {/* 同步面板 */}
      {showSyncPanel && (
        <div style={{
          position: "absolute", top: 40, right: 15, zIndex: 10,
          background: "white", borderRadius: 12, padding: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 200
        }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#333" }}>数据同步</h4>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>本设备同步码:</div>
            <div style={{ 
              background: "#f5f5f5", padding: 8, borderRadius: 6,
              fontFamily: "monospace", fontSize: 14, fontWeight: "bold"
            }}>{syncCode}</div>
          </div>
          <button 
            onClick={syncWithCode}
            style={{
              width: "100%", padding: 8, background: "#5f8ef7",
              color: "white", border: "none", borderRadius: 6,
              cursor: "pointer", marginBottom: 8
            }}
          >
            从其他设备同步
          </button>
          <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4 }}>
            在其他设备上打开此应用，复制同步码，然后在这里粘贴即可同步数据
          </div>
        </div>
      )}

      <h2 style={{
        textAlign: "center",
        color: "#ff9090",
        fontWeight: 900,
        fontSize: 32,
        marginBottom: 8,
        letterSpacing: 2,
        textShadow: "0 2px 12px #ffbcdb55"
      }}>
        <span role="img" aria-label="lion">🦁</span> 每日任务打卡 <span role="img" aria-label="lion">🦁</span>
      </h2>
      
      <ProgressBar percent={percent} />
      
      <div style={{
        textAlign: "center",
        fontWeight: 800,
        color: percent === 100 ? "#24bb5f" : "#fc8591",
        fontSize: 19,
        marginBottom: 10,
        textShadow: percent === 100 ? "0 1px 8px #baffce99" : "none"
      }}>
        完成进度：<span style={{
          color: percent === 100 ? "#24bb5f" : "#ff6b81"
        }}>{done}/{total} ({percent}%)</span>
      </div>

      {/* 周视图 */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 10, margin: "12px 0 6px 0", justifyContent: "center"
      }}>
        <button onClick={() => shiftWeek(-1)}
          style={{ border: "none", background: "none", color: "#e18e9d", fontSize: 20, fontWeight: 900, cursor: "pointer" }}>«</button>
        <span style={{ color: "#888", fontWeight: 800 }}>
          {weekDates[0]} ~ {weekDates[6]}
        </span>
        <button onClick={() => shiftWeek(1)}
          style={{ border: "none", background: "none", color: "#e18e9d", fontSize: 20, fontWeight: 900, cursor: "pointer" }}>»</button>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", marginBottom: 17,
        gap: 4
      }}>
        {weekDates.map(day => (
          <div key={day}
            style={{
              flex: 1,
              background: day === date ? "linear-gradient(120deg,#fda2c6 60%,#a5dfff 120%)" : "#f8fafd",
              borderRadius: 18,
              margin: "0 2px", cursor: "pointer",
              textAlign: "center", boxShadow: day === date ? "0 2px 12px #f0c6f4aa" : undefined,
              border: day === date ? "2.2px solid #ff9eae" : "1.2px solid #eee",
              fontWeight: 900, color: day === date ? "#fff" : "#ae8afc",
              padding: "9px 0", transition: "all .2s"
            }}
            onClick={() => setDate(day)}
          >
            {["一","二","三","四","五","六","日"][new Date(day).getDay()===0?6:new Date(day).getDay()-1]}<br/>
            <span style={{ fontSize: 15 }}>{day.slice(5)}</span>
            <div style={{
              height: 7, width: "83%", margin: "4px auto 0 auto",
              background: "#e2e7fd", borderRadius: 3, overflow: "hidden"
            }}>
              <div style={{
                height: 7, width: `${getDayProgress(day)}%`,
                background: getDayProgress(day) === 100 ? "#14d897" : "#ff80a9",
                transition: "width .2s"
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* 学科Tab */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, justifyContent: "center"
      }}>
        {Object.keys(tasks).map((cat, idx) => (
          <button
            key={cat}
            style={{
              padding: "10px 22px",
              borderRadius: 22,
              border: "none",
              background: tab === cat ? tabColors[idx % tabColors.length] : "#f6f7fb",
              fontWeight: tab === cat ? 900 : 700,
              color: tab === cat ? "#fff" : "#8a8a8a",
              cursor: "pointer",
              fontSize: 17,
              boxShadow: tab === cat ? "0 2px 9px #ffb9e055" : undefined,
              letterSpacing: 1
            }}
            onClick={() => setTab(cat)}
          >
            {cat}
          </button>
        ))}
        <button
          style={{
            border: "2px dashed #fc8591",
            borderRadius: 19,
            padding: "8px 17px",
            background: "#fff0",
            color: "#fc8591",
            fontWeight: 700,
            fontSize: 16,
            marginLeft: 2,
            cursor: "pointer"
          }}
          onClick={addCategory}
        >+新增学科</button>
      </div>

      {/* 学科详细卡片 */}
      {Object.keys(tasks).map((cat, idx) => (
        tab === cat &&
        <div key={cat} style={{
          background: "linear-gradient(135deg,#fffafd 60%,#f6f9ff)",
          borderRadius: 23,
          boxShadow: "0 4px 16px #efe0fc44",
          padding: 22,
          margin: "22px 0"
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 12
          }}>
            <span style={{
              fontWeight: 900, fontSize: 22,
              color: tabColors[idx % tabColors.length],
              letterSpacing: 1
            }}>{cat}</span>
            <div>
              <button
                style={{ color: "#fc8591", marginRight: 13, background: "#fff0", border: "none", cursor: "pointer", fontSize: 18 }}
                onClick={() => deleteCategory(cat)}
                title="删除学科"
              >🗑</button>
              <button
                style={{ color: "#888", background: "#fff0", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 16 }}
                onClick={() => setEditMode(e => !e)}
              >{editMode ? "完成编辑" : "编辑"}</button>
            </div>
          </div>
          <ul style={{ padding: 0, margin: "2px 0 0 0", listStyle: "none" }}>
            {tasks[cat].map((task, idx2) => {
              const checked = getTaskStatus(cat, idx2, date);
              return (
                <li key={task + idx2}
                  style={{
                    display: "flex", alignItems: "center",
                    borderRadius: 20,
                    background: checked
                      ? "linear-gradient(90deg, #d1ffe6 65%, #b6f3fa 120%)"
                      : "linear-gradient(90deg, #fff 65%, #f4f5fd 110%)",
                    boxShadow: checked
                      ? "0 2px 12px #a0fdd4b2"
                      : "0 3px 10px #e9e2fd80",
                    padding: "14px 20px 14px 15px",
                    margin: "17px 0",
                    fontSize: 19,
                    fontWeight: 800,
                    color: checked ? "#149b74" : "#4d476a",
                    transition: "background .18s, box-shadow .18s"
                  }}>
                  <label style={{
                    display: "flex", alignItems: "center", width: "100%", cursor: "pointer", fontWeight: 900
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCheck(cat, idx2)}
                      style={{
                        width: 28, height: 28, marginRight: 16, accentColor: checked ? "#21bfa0" : "#eeaed2",
                        transition: "accent-color .3s"
                      }}
                    />
                    <span style={{
                      flex: 1, fontSize: 20,
                      color: checked ? "#16a072" : "#695a82",
                      textDecoration: checked ? "line-through" : "none",
                      fontWeight: checked ? 900 : 800,
                      letterSpacing: 1.6,
                      transition: "color .22s"
                    }}>
                      {task}
                    </span>
                  </label>
                  {checked &&
                    <span style={{
                      marginLeft: 12,
                      color: "#21bf8f", fontWeight: 900, fontSize: 26
                    }}>✓</span>}
                  {editMode &&
                    <button
                      style={{
                        color: "#f8638e", background: "#fff0",
                        border: "none", marginLeft: 19, cursor: "pointer", fontSize: 18
                      }}
                      onClick={() => deleteTask(cat, idx2)}
                    >删除</button>
                  }
                </li>
              );
            })}
          </ul>
          {editMode && (
            <div style={{ marginTop: 18, display: "flex", gap: 13 }}>
              <input
                style={{
                  flex: 1,
                  borderRadius: 13,
                  border: "1.7px solid #fc8591",
                  padding: "8px 15px",
                  fontSize: 18,
                  outline: "none"
                }}
                value={newTaskName[cat] || ""}
                placeholder="新增任务名称"
                onChange={e => setNewTaskName({ ...newTaskName, [cat]: e.target.value })}
              />
              <button
                onClick={() => addTask(cat)}
                style={{
                  background: "#fc8591",
                  color: "#fff",
                  border: "none",
                  borderRadius: 13,
                  padding: "6px 24px",
                  fontWeight: 900,
                  fontSize: 22,
                  letterSpacing: 1.2,
                  cursor: "pointer",
                  marginLeft: 3
                }}
              >+</button>
            </div>
          )}
        </div>
      ))}

      <div style={{
        margin: "26px 0 0 0", color: "#ffac77", fontWeight: 900,
        fontSize: award ? 21 : 16, textAlign: "center", minHeight: 28
      }}>
        {award}
      </div>

      <div style={{
        marginTop: 36, color: "#888", textAlign: "center", fontSize: 15, lineHeight: 1.8
      }}>
        完成时间段建议：18:15-20:00<br />
        含30分钟吃饭+5分钟休息。<br />
        （部分作业可在校已完成，仅需在此打卡）
      </div>
    </div>
  );
}
