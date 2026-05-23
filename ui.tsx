import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Wrench, CheckCircle2 } from 'lucide-react';

export default function App() {
  // 模拟当前时间
  const [time, setTime] = useState(new Date());
  // 触发紧急光晕的开关
  const [isUrgent, setIsUrgent] = useState(false);

  // 新增：动态任务列表与输入状态
  const [customTasks, setCustomTasks] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // 新增：处理添加任务的逻辑
  const handleAddTask = (e) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      setCustomTasks([...customTasks, {
        id: Date.now(),
        title: inputValue.trim(),
        time: formatTime(new Date()) // 记录当前添加时间作为时间节点
      }]);
      setInputValue('');
      setIsAdding(false);
    } else if (e.key === 'Escape') {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    // 模拟用户的电脑桌面壁纸 (深色抽象渐变)
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white font-sans flex items-center justify-between p-8 relative overflow-hidden">
      
      {/* 桌面背景装饰 - 模拟桌面上的光影 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* 左侧控制台：用于演示交互（非实际软件UI） */}
      <div className="flex flex-col gap-6 z-10 max-w-md">
        <div>
          <h1 className="text-3xl font-light mb-2">极简日程 UI 原型</h1>
          <p className="text-slate-400 font-light text-sm">
            Dieter Rams 视角：设计应当是不显眼的 (Unobtrusive)。
          </p>
        </div>
        
        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <p className="text-sm text-slate-300 mb-4">
            点击下方按钮，观察右侧列表中 "Robocon 紧急会议" 的<strong className="text-orange-400 font-normal">微光渗漏</strong>效果。
          </p>
          <button 
            onClick={() => setIsUrgent(!isUrgent)}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 border border-white/20 active:scale-95 flex items-center gap-2"
          >
            {isUrgent ? '关闭紧急提醒' : '触发 Robocon 紧急提醒'}
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 核心UI：占据桌面一侧的日程安排表 (毛玻璃拟态) */}
      {/* ========================================== */}
      <div className="w-80 h-[85vh] bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative z-10">
        
        {/* 顶部：极简时间显示 */}
        <div className="px-6 pt-8 pb-4 border-b border-white/5">
          <div className="text-4xl font-extralight tracking-tight">
            {formatTime(time)}
          </div>
          <div className="text-slate-400 text-sm mt-1 font-light tracking-wider">
            11月14日 · 星期四
          </div>
        </div>

        {/* 列表区域：摒弃线框，用空间排版 */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          
          {/* 已完成的刚性任务 (降低对比度，隐退) */}
          <div className="flex gap-4 p-3 rounded-xl opacity-30">
            <div className="w-12 text-right text-sm font-mono mt-0.5">08:00</div>
            <div className="flex-1">
              <div className="text-sm font-medium line-through">高等数学</div>
              <div className="text-xs mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> 教三-102
              </div>
            </div>
          </div>

          {/* 当前正在进行的刚性任务 (常规高亮) */}
          <div className="flex gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="w-12 text-right text-sm font-mono text-blue-300 mt-0.5">10:00</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">理论力学</div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <BookOpen size={12} /> 教三-204 (进行中)
              </div>
            </div>
          </div>

          {/* 弹性任务：Robocon日常 (极简标记) */}
          <div className="flex gap-4 p-3 rounded-xl opacity-70">
            <div className="w-12 text-right text-sm font-mono mt-0.5">14:00</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-200">底盘视觉联调</div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Wrench size={12} /> 工程训练中心
              </div>
            </div>
          </div>

          {/* 新增：渲染用户自定义添加的任务 */}
          {customTasks.map(task => (
            <div key={task.id} className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 transition-all animate-in fade-in slide-in-from-bottom-2">
              <div className="w-12 text-right text-sm font-mono mt-0.5 text-slate-400">{task.time}</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-200">{task.title}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} /> 新增任务
                </div>
              </div>
            </div>
          ))}

          {/* ---------------------------------------------------- */}
          {/* 重点交互：微光渗漏 (Edge Glow Leak) 的紧急任务 */}
          {/* ---------------------------------------------------- */}
          <div className={`
            flex gap-4 p-3 rounded-xl transition-all duration-1000 ease-in-out relative
            ${isUrgent 
              ? 'bg-orange-500/5 border border-orange-500/30' // 触发时的背景与边框
              : 'border border-transparent' // 平静状态
            }
          `}>
            {/* 微光特效层 (仅在触发时显现) + 呼吸感 (加入 animate-pulse) */}
            <div className={`
              absolute inset-0 rounded-xl transition-opacity duration-1000
              shadow-[inset_4px_0_0_0_rgba(249,115,22,0.8),0_0_30px_rgba(249,115,22,0.15)]
              ${isUrgent ? 'opacity-100 animate-pulse' : 'opacity-0'}
            `}></div>

            <div className={`w-12 text-right text-sm font-mono mt-0.5 transition-colors duration-500 ${isUrgent ? 'text-orange-400' : 'text-slate-400'}`}>
              随时
            </div>
            <div className="flex-1 relative z-10">
              <div className={`text-sm font-medium transition-colors duration-500 ${isUrgent ? 'text-orange-50' : 'text-slate-300'}`}>
                Robocon 紧急方案评审
              </div>
              <div className={`text-xs mt-1 flex items-center gap-1 transition-colors duration-500 ${isUrgent ? 'text-orange-300' : 'text-slate-500'}`}>
                <Clock size={12} className={isUrgent ? 'animate-pulse' : ''} /> 
                {isUrgent ? '学长发起，需立即响应' : '待定'}
              </div>
            </div>
          </div>

        </div>
        
        {/* 底部极简添加按钮与内联输入框 (原位展开) */}
        <div className="p-4 border-t border-white/5 min-h-[73px] flex items-center justify-center transition-all">
          {isAdding ? (
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleAddTask}
              onBlur={() => { if(!inputValue) setIsAdding(false); }}
              placeholder="输入任务，回车确认 (Esc取消)"
              className="w-full bg-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-white/30 focus:bg-white/10 transition-all font-light text-sm shadow-inner"
            />
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/10 flex items-center justify-center text-xl font-light text-slate-300 transition-all active:scale-90"
            >
              +
            </button>
          )}
        </div>
      </div>

    </div>
  );
}