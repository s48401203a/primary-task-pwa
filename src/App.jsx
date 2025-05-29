import React, { useState } from "react";

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
  const [tasks, setTasks] = useState(DEFAULT_TASKS);

  // === 新增：读取本地保存的记录 ===
  const [records, setRecords] = useState(() => {
    const local = localStorage.getItem("taskRecords");
    return local ? JSON.parse(local) : {};
  });

  const [editMode, setEditMode] = useState(false);
  const [newTaskName, setNewTaskName] = useState({});
  const [tab, setTab] = useState(Object.keys(DEFAULT_TASKS)[0]);
  const [weekStart, setWeekStart] = useState(getWeekDates(date)[0]);

  // === 修改：每次勾选都自动保存到本地 ===
  function toggleCheck(cat, idx) {
    setRecords(prev => {
      const day = { ...(prev[date] || {}) };
      day[cat] = [...(day[cat] || Array(tasks[cat].length).fill(false))];
      day[cat][idx] = !day[cat][idx];
      const newRecords = { ...prev, [date]: day };
      localStorage.setItem("taskRecords", JSON.stringify(newRecords)); // 本地保存
      return newRecords;
    });
  }
  function addTask(cat) {
    if (!newTaskName[cat] || !newTaskName[cat].trim()) return;
    setTasks(prev => ({
      ...prev,
      [cat]: [...prev[cat], newTaskName[cat].trim()]
    }));
    setNewTaskName({ ...newTaskName, [cat]: "" });
  }
  function deleteTask(cat, idx) {
    setTasks(prev => {
      const arr = [...prev[cat]];
      arr.splice(idx, 1);
      return { ...prev, [cat]: arr };
    });
  }
  function addCategory() {
    const name = prompt("请输入新学科名");
    if (name && !tasks[name]) {
      setTasks(prev => ({ ...prev, [name]: [] }));
    }
  }
  function deleteCategory(cat) {
    if (window.confirm(`确定删除学科【${cat}】吗？`)) {
      setTasks(prev => {
        const cp = { ...prev };
        delete cp[cat];
        return cp;
      });
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

  // 进度
  const today = records[date] || {};
  let total = 0, done = 0;
  Object.keys(tasks).forEach(cat => {
    total += tasks[cat].length;
    if (today[cat]) done += today[cat].filter(Boolean).length;
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
    let t = 0, d = 0;
    Object.keys(tasks).forEach(cat => {
      t += tasks[cat].length;
      if (rec[cat]) d += rec[cat].filter(Boolean).length;
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
      {/* ======= 周视图 ======= */}
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
      {/* ======= 学科Tab ======= */}
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
      {/* ======= 学科详细卡片（任务卡片美化） ======= */}
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
              const checked = today[cat] && today[cat][idx2];
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
