<template>
  <div>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

// Register required Chart.js components
Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps({
  labels: {
    type: Array as () => string[],
    required: true,
  },
  data: {
    type: Array as () => number[],
    required: true,
  },
  options: {
    type: Object,
    default: () => ({}),
  },
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const renderChart = () => {
  if (chartInstance) {
    chartInstance.destroy(); // Destroy the old instance before rendering a new one
  }

  chartInstance = new Chart(chartCanvas.value!, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [
        {
          label: 'Total Cost',
          data: props.data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
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
            label: (context) => `€${context.raw}`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'LLM Models',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Cost (€)',
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
  () => [props.labels, props.data],
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
