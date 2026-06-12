import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Scene } from "../types";
import { Layers, Activity, Sparkles, TrendingUp } from "lucide-react";

interface TimelineIntensityChartProps {
  scenes: Scene[];
  onSceneClick: (idx: number) => void;
  onReorderScenes?: (scenes: Scene[]) => void;
}

export default function TimelineIntensityChart({ scenes, onSceneClick, onReorderScenes }: TimelineIntensityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredScene, setHoveredScene] = useState<{ scene: Scene; idx: number; x: number; y: number } | null>(null);

  // Helper to map section or emotional tag to an intensity score [10 - 100]
  const getIntensityScore = (scene: Scene): number => {
    const sec = (scene.section || "").toUpperCase();
    const emo = (scene.emotion || "").toLowerCase();

    if (sec.includes("HOOK")) return 80;
    if (sec.includes("MIRROR")) return 65;
    if (sec.includes("EXPANSION") || sec.includes("PROBLEM") || emo.includes("friction") || emo.includes("crisis") || emo.includes("dread")) return 92;
    if (sec.includes("ANALYSIS") || sec.includes("COGNITIVE")) return 55;
    if (sec.includes("PHILOSOPHICAL") || sec.includes("LAYER") || emo.includes("calm") || emo.includes("peace") || emo.includes("comfort")) return 40;
    if (sec.includes("ENDING") || sec.includes("RESOLUTION") || sec.includes("RELEASE")) return 85;

    // Fallback based on keywords or string length hash
    let hash = 0;
    for (let i = 0; i < emo.length; i++) {
      hash = emo.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 45 + Math.abs(hash % 45); // deterministic between [45 - 90]
  };

  useEffect(() => {
    if (!scenes || scenes.length === 0 || !svgRef.current || !containerRef.current) return;

    // Clean any prior SVG nodes
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove();

    // Responsive measurements
    const margin = { top: 30, right: 40, bottom: 40, left: 50 };
    const containerWidth = containerRef.current.clientWidth || 600;
    const height = 180;
    const width = containerWidth;

    svgElement
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Set up data
    const data = scenes.map((scene, index) => ({
      index,
      scene,
      intensity: getIntensityScore(scene),
      label: `Scene ${scene.number}`,
    }));

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, scenes.length - 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    // Create Gradient definition for Area
    const defs = svgElement.append("defs");
    
    const areaGradient = defs.append("linearGradient")
      .attr("id", "emotionalGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    areaGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#ffffff")
      .attr("stop-opacity", 0.18);

    areaGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#ffffff")
      .attr("stop-opacity", 0.0);

    // Gridlines or guideline layers
    const makeYLines = () => d3.axisLeft(yScale);

    // Horizontal Guideline grids
    svgElement.append("g")
      .attr("class", "grid text-white/5 opacity-40")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(
        makeYLines()
          .ticks(4)
          .tickSize(-width + margin.left + margin.right)
          .tickFormat(() => "")
      );

    // Axis Rendering
    const xAxis = d3.axisBottom(xScale)
      .ticks(scenes.length)
      .tickFormat((d) => `S-${(d as number) + 1}`);

    const yAxis = d3.axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `${d}%`);

    // Render X Axis
    svgElement.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .attr("class", "text-[9px] font-mono text-white/30")
      .call(xAxis)
      .selectAll("path, line")
      .attr("stroke", "rgba(255, 255, 255, 0.1)");

    // Render Y Axis
    svgElement.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .attr("class", "text-[9px] font-mono text-white/30")
      .call(yAxis)
      .selectAll("path, line")
      .attr("stroke", "rgba(255, 255, 255, 0.1)");

    // Area builder
    const areaGenerator = d3.area<any>()
      .x((d) => xScale(d.index))
      .y0(height - margin.bottom)
      .y1((d) => yScale(d.intensity))
      .curve(d3.curveMonotoneX);

    // Line builder
    const lineGenerator = d3.line<any>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.intensity))
      .curve(d3.curveMonotoneX);

    // Draw the glowing area underneath
    svgElement.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", areaGenerator)
      .attr("fill", "url(#emotionalGradient)");

    // Draw the main line curve
    svgElement.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", lineGenerator)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.5)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "none");

    // Add interactive glow dots
    const dragBehavior = d3.drag<SVGCircleElement, any>()
      .on("start", function (event, d) {
        d3.select(this)
          .raise()
          .transition()
          .duration(100)
          .attr("r", 9)
          .attr("fill", "#e0d8d0")
          .attr("stroke", "#ffffff");
      })
      .on("drag", function (event, d) {
        // Constrain horizontally between margins
        const xVal = Math.max(margin.left, Math.min(width - margin.right, event.x));
        d3.select(this).attr("cx", xVal);

        // Highlight the hovered target slot index
        const targetIndex = Math.min(scenes.length - 1, Math.max(0, Math.round(xScale.invert(xVal))));
        svgElement.selectAll(".dot")
          .style("opacity", (dotData: any) => dotData.index === targetIndex ? 1.0 : 0.4)
          .attr("fill", (dotData: any) => dotData.index === targetIndex ? "#10b981" : "#ffffff");
      })
      .on("end", function (event, d) {
        const xVal = Math.max(margin.left, Math.min(width - margin.right, event.x));
        const targetIndex = Math.min(scenes.length - 1, Math.max(0, Math.round(xScale.invert(xVal))));

        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", 4.5)
          .attr("fill", "#ffffff")
          .attr("stroke", "#050505");

        svgElement.selectAll(".dot")
          .style("opacity", null)
          .attr("fill", "#ffffff");

        if (targetIndex !== d.index && onReorderScenes) {
          const reordered = [...scenes];
          const [removed] = reordered.splice(d.index, 1);
          reordered.splice(targetIndex, 0, removed);

          // Update scene numbering to remain consecutive
          const finalized = reordered.map((scene, i) => ({
            ...scene,
            number: i + 1,
          }));

          onReorderScenes(finalized);
        } else {
          // Snap back to exact position
          d3.select(this)
            .transition()
            .duration(200)
            .attr("cx", xScale(d.index));
        }
      });

    svgElement.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot cursor-grab transition-all duration-200 active:cursor-grabbing")
      .attr("cx", (d) => xScale(d.index))
      .attr("cy", (d) => yScale(d.intensity))
      .attr("r", 4.5)
      .attr("fill", "#ffffff")
      .attr("stroke", "#050505")
      .attr("stroke-width", 1.5)
      .call(dragBehavior as any)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 7)
          .attr("fill", "#e0d8d0");

        setHoveredScene({
          scene: d.scene,
          idx: d.index,
          x: xScale(d.index),
          y: yScale(d.intensity),
        });
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 4.5)
          .attr("fill", "#ffffff");

        setHoveredScene(null);
      })
      .on("click", (event, d) => {
        onSceneClick(d.index);
      });

    // Add tick guides labels
    svgElement.append("text")
      .attr("x", width - margin.right)
      .attr("y", height - 6)
      .attr("text-anchor", "end")
      .attr("class", "text-[8px] font-mono fill-white/30 uppercase tracking-widest")
      .text("Timeline Profile ↗");

  }, [scenes]);

  // Handle ResizeObserver to repanel D3 on parent width mutations
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      // Force repaint
      if (scenes && scenes.length > 0) {
        // Simple trick to bypass stale layout
        setHoveredScene(null);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [scenes]);

  return (
    <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-none flex flex-col gap-4 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-white/50" />
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">Narrative Flow Visualizer</span>
            <h4 className="text-xs font-serif text-white tracking-wider uppercase font-semibold">Narrative Emotional Intensity Curve (D3)</h4>
          </div>
        </div>
        <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1">
          Click nodes to jump to screenplay frames
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[180px] relative select-none">
        <svg ref={svgRef} className="w-full h-full overflow-visible" />

        {/* Dynamic Absolute Position Tooltip on Hover */}
        {hoveredScene && (
          <div
            className="absolute z-20 bg-black border border-white/20 p-3 select-text w-[220px] pointer-events-none"
            style={{
              left: `${Math.min(hoveredScene.x - 110, (containerRef.current?.clientWidth || 600) - 240)}px`,
              top: `${Math.max(hoveredScene.y - 120, 5)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
              <span className="text-[9px] font-mono bg-white/10 text-white px-1.5 py-0.5">
                SCENE {hoveredScene.scene.number.toString().padStart(2, "0")}
              </span>
              <span className="text-[9px] font-mono text-white/50">{hoveredScene.scene.duration}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9.5px] font-mono text-white/40 uppercase tracking-wider">
                Section: <span className="text-white font-semibold">{hoveredScene.scene.section}</span>
              </span>
              <span className="text-[9.5px] font-mono text-white/40 uppercase tracking-wider">
                Emotion: <span className="text-white font-semibold italic">"{hoveredScene.scene.emotion}"</span>
              </span>
              <div className="mt-1.5 flex items-center gap-1">
                <div 
                  className="h-1 bg-white" 
                  style={{ width: `${getIntensityScore(hoveredScene.scene)}%` }} 
                />
                <span className="text-[9px] font-mono text-white/60">
                  {getIntensityScore(hoveredScene.scene)}% Emotion Intensity
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
