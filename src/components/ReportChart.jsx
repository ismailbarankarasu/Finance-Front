import { useEffect, useImperativeHandle, useRef } from "react";
import { init, use as registerCharts } from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

registerCharts([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer,
]);

export function ReportChart({ option, label, ref }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      getImage: () =>
        chartRef.current?.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#fff",
        }),
    }),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    const chart = init(container);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current.setOption(
      {
        ...option,
        animation: false,
        aria: { enabled: true, label: { description: label } },
      },
      { notMerge: true },
    );
  }, [option, label]);

  return (
    <div
      ref={containerRef}
      className='report-chart'
      role='img'
      aria-label={label}
    />
  );
}
