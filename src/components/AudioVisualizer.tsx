import { useEffect, useRef } from 'react';
import { synthEngine } from '../audio/synthEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  primaryColor: string;
  accentColor: string;
}

export const AudioVisualizer = ({ isPlaying, primaryColor, accentColor }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = synthEngine.getFrequencyData();
      const numBars = 32;
      const barWidth = (width / numBars) * 0.75;
      const spacing = (width / numBars) * 0.25;

      // Draw bars
      for (let i = 0; i < numBars; i++) {
        // Fallback gentle idle wave if paused
        let value = isPlaying ? (freqData[i] || 0) : Math.sin(Date.now() * 0.003 + i * 0.3) * 15 + 20;
        value = Math.max(4, value);
        const barHeight = (value / 255) * (height - 6);

        const x = i * (barWidth + spacing) + spacing / 2;
        const y = height - barHeight;

        // Gradient for neon bar
        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, accentColor);

        ctx.fillStyle = gradient;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = isPlaying ? 8 : 2;

        // Rounded top bar
        const radius = Math.min(3, barWidth / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height);
        ctx.lineTo(x, height);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Little floating peak neon dot
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffffff';
        ctx.fillRect(x, Math.max(1, y - 4), barWidth, 2);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, primaryColor, accentColor]);

  return (
    <div id="audio-visualizer-container" className="relative w-full h-16 bg-[#0a0a0a] border border-[#222] rounded-xl p-1.5 flex flex-col justify-end overflow-hidden">
      <div className="absolute top-1.5 left-2.5 flex items-center gap-1.5 z-10">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[#39FF14] animate-pulse' : 'bg-[#444]'}`} />
        <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#666] font-mono">
          {isPlaying ? 'AUDIO SPECTRUM • LIVE' : 'SPECTRUM STANDBY'}
        </span>
      </div>
      <canvas
        id="audio-visualizer-canvas"
        ref={canvasRef}
        width={380}
        height={45}
        className="w-full h-10 block"
      />
    </div>
  );
};
