"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-slate-50">
      {/* 噪點材質層 (讓畫面更有紙張質感) */}
      <div className="absolute inset-0 z-10 opacity-[0.03] pointer-events-none mix-blend-multiply"
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}>
      </div>

      {/* 動態光暈層 */}
      <div className="absolute top-0 left-0 w-full h-full filter blur-[80px] sm:blur-[120px] opacity-60">
        
        {/* 光球 1：紫色 (左上移動) */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-300/40 mix-blend-multiply animate-blob"></div>
        
        {/* 光球 2：靛藍色 (右上移動 - 延遲) */}
        <div className="absolute top-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-indigo-300/40 mix-blend-multiply animate-blob animation-delay-2000"></div>
        
        {/* 光球 3：粉色 (下方移動 - 延遲更久) */}
        <div className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-pink-300/40 mix-blend-multiply animate-blob animation-delay-4000"></div>
        
        {/* 光球 4：琥珀色 (增加一點溫暖感) */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-amber-200/40 mix-blend-multiply animate-blob animation-delay-6000"></div>
      </div>
    </div>
  );
}