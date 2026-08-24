<template>
  <div>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import type { ChartOptions } from 'chart.js';

// Register required Chart.js components
Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

type BarChartValue = number | null;

type BarChartProps = {
  labels: string[];
  data: BarChartValue[];
  datasetLabel: string;
  xAxisLabel: string;
  yAxisLabel: string;
  tooltipLabels?: string[];
  options?: ChartOptions<'bar'>;
};

const props = withDefaults(defineProps<BarChartProps>(), {
  tooltipLabels: () => [],
  options: () => ({}),
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<'bar'> | null = null;

const pricedBarBackground = 'rgba(54, 162, 235, 0.6)';
const pricedBarBorder = 'rgba(54, 162, 235, 1)';
const omittedBarBackground = 'rgba(148, 163, 184, 0.35)';
const omittedBarBorder = 'rgba(148, 163, 184, 0.7)';

const barBackgroundColors = () => props.data.map(value =>
  value === null ? omittedBarBackground : pricedBarBackground
);

const barBorderColors = () => props.data.map(value =>
  value === null ? omittedBarBorder : pricedBarBorder
);

const renderChart = () => {
  if (!chartCanvas.value) return;

  if (chartInstance) {
    chartInstance.destroy(); // Destroy the old instance before rendering a new one
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: [...props.labels],
      datasets: [
        {
          label: props.datasetLabel,
          data: [...props.data],
          backgroundColor: barBackgroundColors(),
          borderColor: barBorderColors(),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: (context) => props.tooltipLabels[context.dataIndex] ?? String(context.raw ?? ''),
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: props.xAxisLabel,
          },
        },
        y: {
          title: {
            display: true,
            text: props.yAxisLabel,
          },
          beginAtZero: true,
        },
      },
      ...props.options,
    },
  });
};

onMounted(() => {
  renderChart();
});

watch(
  () => [
    props.labels,
    props.data,
    props.datasetLabel,
    props.xAxisLabel,
    props.yAxisLabel,
    props.tooltipLabels,
    props.options,
  ],
  () => {
    renderChart();
  },
  { deep: true }
);
</script>

<style scoped>
canvas {
  width: 100%;
  height: 400px;
}
</style>
